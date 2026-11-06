/**
 * Servicio CENTRAL de numeración de documentos (solo Node: lo usan server.ts y el servidor de Vite).
 *
 * Por qué es seguro con varios trabajadores a la vez:
 *  - Hay UN solo contador por serie, guardado en el servidor (data_counters.json).
 *  - Cada pedido de número se atiende de forma SÍNCRONA dentro del proceso de Node (que es de un solo
 *    hilo): leer → sumar 1 → guardar ocurre sin que otro pedido pueda intercalarse. Dos trabajadores que
 *    facturen en el mismo milisegundo reciben números distintos y consecutivos.
 *  - El archivo se escribe de forma atómica (archivo temporal + renombrado), así un corte de luz no lo corrompe.
 *  - Cada pedido lleva un `requestId`: si la red falla y el navegador reintenta, recibe el MISMO número
 *    (no se pierde ni se duplica un secuencial).
 *  - Todo número entregado queda en un registro de auditoría (data_sequence_log.jsonl).
 */
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  SEQUENCE_TYPES,
  SequenceType,
  formatDocumentNumber,
  isSeriesDocument,
  padCode,
  sequenceKey,
} from './documentNumber.ts';

interface StoreFile {
  version: 1;
  /** Último número entregado por serie */
  counters: Record<string, number>;
  /** Pedidos recientes (idempotencia) */
  requests: Record<string, { key: string; number: number; at: number }>;
}

const DAY = 24 * 60 * 60 * 1000;

const dataDir = () => process.env.SEQUENCE_DATA_DIR || process.cwd();
const counterFile = () => process.env.COUNTERS_PATH || path.join(dataDir(), 'data_counters.json');
const logFile = () => path.join(path.dirname(counterFile()), 'data_sequence_log.jsonl');

let cache: StoreFile | null = null;

const load = (): StoreFile => {
  if (cache) return cache;
  try {
    if (fs.existsSync(counterFile())) {
      const raw = JSON.parse(fs.readFileSync(counterFile(), 'utf-8'));
      // Compatibilidad: archivos antiguos eran { nota_venta: 1, factura: 1, ... } sin estructura
      if (raw && raw.version === 1 && raw.counters) {
        cache = { version: 1, counters: raw.counters, requests: raw.requests || {} };
        return cache;
      }
    }
  } catch (err) {
    console.warn('[Secuenciales] No se pudo leer el archivo de contadores, se inicia vacío:', err);
  }
  cache = { version: 1, counters: {}, requests: {} };
  return cache;
};

const save = (store: StoreFile) => {
  // Se conservan solo los pedidos de las últimas 24 h
  const limit = Date.now() - DAY;
  for (const [id, r] of Object.entries(store.requests)) if (r.at < limit) delete store.requests[id];
  const tmp = `${counterFile()}.tmp`;
  fs.mkdirSync(path.dirname(counterFile()), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmp, counterFile());
};

const audit = (entry: Record<string, unknown>) => {
  try {
    fs.appendFileSync(logFile(), JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n', 'utf-8');
  } catch {
    /* el registro de auditoría nunca debe impedir emitir */
  }
};

export interface ReserveInput {
  type: SequenceType;
  estab?: string;
  pto?: string;
  /** Identificador único del intento de emisión (permite reintentos sin duplicar) */
  requestId?: string;
  /** Piso: si el navegador ya conoce números mayores (datos previos), el contador sube hasta ahí */
  atLeast?: number;
  user?: string;
}

export interface ReserveResult {
  type: SequenceType;
  key: string;
  number: number;
  formatted: string;
  reused: boolean;
}

/** Entrega el siguiente número de la serie. Operación atómica. */
export function reserveNumber(input: ReserveInput): ReserveResult {
  if (!SEQUENCE_TYPES.includes(input.type)) throw new Error(`Tipo de documento inválido: ${input.type}`);
  const store = load();
  const key = sequenceKey(input.type, input.estab, input.pto);

  if (input.requestId && store.requests[input.requestId]) {
    const prev = store.requests[input.requestId];
    return {
      type: input.type,
      key: prev.key,
      number: prev.number,
      formatted: formatDocumentNumber(input.type, prev.number, input.estab, input.pto),
      reused: true,
    };
  }

  const floor = Math.max(0, Math.floor(Number(input.atLeast) || 0));
  const last = Math.max(store.counters[key] || 0, floor);
  const number = last + 1;
  store.counters[key] = number;
  if (input.requestId) store.requests[input.requestId] = { key, number, at: Date.now() };
  save(store);

  const formatted = formatDocumentNumber(input.type, number, input.estab, input.pto);
  audit({ event: 'reserve', type: input.type, key, number, formatted, user: input.user, requestId: input.requestId });
  return { type: input.type, key, number, formatted, reused: false };
}

/** Fija el PRÓXIMO número de una serie. No se permite retroceder (el SRI no admite repetir secuenciales). */
export function setNextNumber(type: SequenceType, next: number, estab?: string, pto?: string, user?: string) {
  const store = load();
  const key = sequenceKey(type, estab, pto);
  const target = Math.floor(Number(next));
  if (!Number.isFinite(target) || target < 1) throw new Error('El número debe ser mayor o igual a 1.');
  const last = store.counters[key] || 0;
  if (target - 1 < last) {
    throw new Error(`No se puede retroceder: ya se emitió el número ${formatDocumentNumber(type, last, estab, pto)}. El próximo mínimo es ${formatDocumentNumber(type, last + 1, estab, pto)}.`);
  }
  store.counters[key] = target - 1;
  save(store);
  audit({ event: 'set', type, key, next: target, user });
  return { key, next: target, formatted: formatDocumentNumber(type, target, estab, pto) };
}

export function sequenceState(estab?: string, pto?: string) {
  const store = load();
  return SEQUENCE_TYPES.map(type => {
    const key = sequenceKey(type, estab, pto);
    const last = store.counters[key] || 0;
    return {
      type,
      key,
      last,
      lastFormatted: last > 0 ? formatDocumentNumber(type, last, estab, pto) : null,
      next: last + 1,
      nextFormatted: formatDocumentNumber(type, last + 1, estab, pto),
      series: isSeriesDocument(type) ? `${padCode(estab, 3, '001')}-${padCode(pto, 3, '001')}` : null,
    };
  });
}

export function sequenceLog(limit = 50) {
  try {
    if (!fs.existsSync(logFile())) return [];
    const lines = fs.readFileSync(logFile(), 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).reverse().map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ API HTTP (Node puro: sirve para Vite y Express)
const readBody = (req: IncomingMessage & { body?: unknown }): Promise<any> =>
  new Promise(resolve => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

/**
 * Middleware: /api/sequence/state (GET) · /next (POST) · /set (POST) · /log (GET)
 */
export async function sequenceMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url || '', 'http://localhost');
  if (!url.pathname.startsWith('/api/sequence')) return next();
  try {
    if (url.pathname === '/api/sequence/state' && req.method === 'GET') {
      return send(res, 200, { series: sequenceState(url.searchParams.get('estab') || undefined, url.searchParams.get('pto') || undefined) });
    }
    if (url.pathname === '/api/sequence/log' && req.method === 'GET') {
      return send(res, 200, { log: sequenceLog(Number(url.searchParams.get('limit')) || 50) });
    }
    if (url.pathname === '/api/sequence/next' && req.method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, reserveNumber(b));
    }
    if (url.pathname === '/api/sequence/set' && req.method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, setNextNumber(b.type, b.next, b.estab, b.pto, b.user));
    }
    return send(res, 404, { error: 'Endpoint de numeración no encontrado' });
  } catch (err: any) {
    return send(res, 409, { error: err?.message || 'Error en el servicio de numeración' });
  }
}

/** Solo para pruebas */
export const __resetSequenceCache = () => {
  cache = null;
};
