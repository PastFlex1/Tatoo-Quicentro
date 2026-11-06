/**
 * Webhook de compras SRI (solo Node: server.ts y Vite).
 *
 *   POST /api/v1/compras/sri-webhook     ← proveedor de API / script externo (requiere token)
 *     Cabecera: Authorization: Bearer <token>   o   X-API-Key: <token>
 *     201 creado · 200 ya existía · 400 JSON inválido · 401 token inválido · 422 no es para este RUC
 *
 *   GET  /api/v1/compras/recibidas?desde=ISO   ← la bandeja del sistema trae lo recibido
 *
 * Configuración (.env):
 *   SRI_WEBHOOK_TOKEN=<cadena larga y secreta>   (sin token el webhook rechaza todo)
 *   EMPRESA_RUC=1792847102001                    (opcional: rechaza comprobantes de otro comprador)
 *
 * Los comprobantes se guardan en data_compras_recibidas.json (escritura atómica), con el XML original.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ComprobanteRecibido } from '../types';
import { normalizarCompraWebhook } from './comprasWebhook.ts';
import { migrar } from '../server/modules/sri/sri.service.ts';

interface StoredItem {
  receivedAt: string;
  comprobante: ComprobanteRecibido;
}
interface StoreFile {
  version: 1;
  items: Record<string, StoredItem>;
}

const dataDir = () => process.env.SEQUENCE_DATA_DIR || process.cwd();
const storeFile = () => process.env.COMPRAS_RECIBIDAS_PATH || path.join(dataDir(), 'data_compras_recibidas.json');
const MAX_BODY = 5 * 1024 * 1024;

let cache: StoreFile | null = null;

const load = (): StoreFile => {
  if (cache) return cache;
  try {
    if (fs.existsSync(storeFile())) {
      const raw = JSON.parse(fs.readFileSync(storeFile(), 'utf-8'));
      if (raw?.version === 1 && raw.items) return (cache = raw);
    }
  } catch (err) {
    console.warn('[Compras SRI] No se pudo leer el almacén de comprobantes recibidos:', err);
  }
  return (cache = { version: 1, items: {} });
};

const save = (store: StoreFile) => {
  const tmp = `${storeFile()}.tmp`;
  fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmp, storeFile());
};

/** Comparación en tiempo constante (no revela el token por diferencias de tiempo) */
const tokenOk = (given: string, expected: string) => {
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

const tokenFrom = (req: IncomingMessage) => {
  const auth = String(req.headers.authorization || '');
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)?.[1];
  return (bearer || String(req.headers['x-api-key'] || '')).trim();
};

type BodyResult = { ok: true; body: unknown } | { ok: false; status: number; error: string };

const readJson = (req: IncomingMessage & { body?: unknown }): Promise<BodyResult> =>
  new Promise(resolve => {
    // Express ya pudo haber leído el cuerpo (express.json)
    if (req.body !== undefined && typeof req.body === 'object' && Object.keys(req.body as object).length) {
      return resolve({ ok: true, body: req.body });
    }
    let data = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        resolve({ ok: false, status: 413, error: 'El cuerpo supera 5 MB.' });
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve({ ok: true, body: JSON.parse(data) });
      } catch {
        resolve({ ok: false, status: 400, error: 'El cuerpo no es JSON válido.' });
      }
    });
    req.on('error', () => resolve({ ok: false, status: 400, error: 'No se pudo leer la petición.' }));
  });

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

export async function comprasWebhookMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url || '', 'http://localhost');

  // ---------------------------------------------------------------- recepción (webhook)
  if (url.pathname === '/api/v1/compras/sri-webhook') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });

    const expected = (process.env.SRI_WEBHOOK_TOKEN || '').trim();
    const given = tokenFrom(req);
    if (!expected) return send(res, 401, { error: 'Webhook deshabilitado: configure SRI_WEBHOOK_TOKEN en el servidor.' });
    if (!given || !tokenOk(given, expected)) return send(res, 401, { error: 'Token inválido o ausente (Authorization: Bearer … o X-API-Key).' });

    const parsed = await readJson(req as IncomingMessage & { body?: unknown });
    if (!parsed.ok) return send(res, parsed.status, { error: parsed.error });

    const result = normalizarCompraWebhook(parsed.body);
    if (!result.ok) return send(res, 400, { error: result.error });
    const comp = result.comprobante;

    // Duplicados: la clave de acceso es la llave universal
    const store = load();
    if (store.items[comp.claveAcceso]) {
      return send(res, 200, { status: 'duplicate', clave_acceso: comp.claveAcceso, message: 'El comprobante ya estaba registrado.' });
    }

    // Identidad: el comprobante debe estar emitido a nombre de esta empresa
    const empresaRuc = (process.env.EMPRESA_RUC || '').replace(/\D/g, '');
    if (empresaRuc) {
      if (!comp.receptorRuc) {
        return send(res, 422, { error: 'No se pudo verificar el comprador: envíe "comprobante.receptor.ruc" o el XML.' });
      }
      if (comp.receptorRuc.replace(/\D/g, '') !== empresaRuc) {
        return send(res, 422, { error: `El comprobante fue emitido a ${comp.receptorRuc}, no al RUC de la empresa.` });
      }
    }

    store.items[comp.claveAcceso] = { receivedAt: new Date().toISOString(), comprobante: comp };
    try {
      save(store);
    } catch (err) {
      delete store.items[comp.claveAcceso];
      console.error('[Compras SRI] No se pudo guardar el comprobante:', err);
      return send(res, 500, { error: 'No se pudo guardar el comprobante. Reintente.' });
    }
    console.log(`[Compras SRI] Recibida ${comp.tipoComprobante} ${comp.numeroCompleto} de ${comp.rucEmisor}`);
    // También a MongoDB (bandeja "Comprobantes recibidos SRI"): con XML se registra; sin XML la clave
    // entra a la cola y la próxima sincronización trae el XML oficial del SRI.
    migrar([{ claveAcceso: comp.claveAcceso, xml: comp.xmlOriginal || undefined }], 'WEBHOOK')
      .then(r => r.errores.length && console.warn(`[Compras SRI] ${comp.claveAcceso}: ${r.errores[0].error}`))
      .catch(err => console.warn('[Compras SRI] No se pudo pasar a MongoDB (queda en el archivo):', err?.message || err));
    return send(res, 201, { status: 'created', clave_acceso: comp.claveAcceso, numero: comp.numeroCompleto });
  }

  // ---------------------------------------------------------------- consulta interna de la bandeja
  if (url.pathname === '/api/v1/compras/recibidas' && req.method === 'GET') {
    const desde = url.searchParams.get('desde') || '';
    const items = Object.values(load().items)
      .filter(i => !desde || i.receivedAt > desde)
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
    return send(res, 200, {
      configured: Boolean((process.env.SRI_WEBHOOK_TOKEN || '').trim()),
      serverTime: new Date().toISOString(),
      items,
    });
  }

  return next();
}

/** Solo para pruebas */
export const __resetComprasCache = () => {
  cache = null;
};
