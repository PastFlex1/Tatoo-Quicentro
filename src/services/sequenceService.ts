/**
 * Cliente del servicio central de numeración (ver src/utils/sequenceServer.ts).
 * Todo número de proforma, nota de venta, factura o nota de crédito sale de aquí, de modo que
 * varios trabajadores / equipos nunca obtienen el mismo número.
 */
import { SequenceType } from '../utils/documentNumber';

export interface ReservedNumber {
  number: number;
  formatted: string;
  reused: boolean;
}

export interface SequenceStateRow {
  type: SequenceType;
  key: string;
  last: number;
  lastFormatted: string | null;
  next: number;
  nextFormatted: string;
  series: string | null;
}

export interface SequenceLogEntry {
  at: string;
  event: 'reserve' | 'set';
  type: SequenceType;
  key: string;
  number?: number;
  formatted?: string;
  next?: number;
  user?: string;
}

/** El servidor respondió con un error de negocio (no se reintenta) */
class SequenceRejected extends Error {}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const newRequestId = () => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  // randomUUID solo existe en contextos seguros (https / localhost); se usa un respaldo para acceso por IP en la red local
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

const OFFLINE_MESSAGE =
  'No hay conexión con el servidor de numeración. No se puede emitir el documento para no repetir números. Verifique que el servidor esté encendido y que este equipo esté en la misma red.';

async function request<T>(url: string, init?: RequestInit, retries = 0): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new SequenceRejected(data?.error || `Error del servidor de numeración (${res.status}).`);
      return data as T;
    } catch (err) {
      if (err instanceof SequenceRejected) throw err;
      lastError = err;
      if (attempt < retries) await sleep(400 * (attempt + 1));
    }
  }
  console.warn('[Numeración] Sin conexión:', lastError);
  throw new Error(OFFLINE_MESSAGE);
}

/**
 * Pide el siguiente número de la serie. Los reintentos usan el MISMO requestId: si la respuesta se
 * perdió por la red, el servidor devuelve el número ya asignado en lugar de consumir otro.
 */
export function reserveDocumentNumber(input: {
  type: SequenceType;
  estab: string;
  pto: string;
  atLeast?: number;
  user?: string;
}): Promise<ReservedNumber> {
  const requestId = newRequestId();
  return request<ReservedNumber>(
    '/api/sequence/next',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, requestId }) },
    2
  );
}

export async function fetchSequenceState(estab: string, pto: string): Promise<SequenceStateRow[]> {
  const q = new URLSearchParams({ estab, pto });
  const data = await request<{ series: SequenceStateRow[] }>(`/api/sequence/state?${q}`);
  return data.series;
}

export function setNextSequence(input: { type: SequenceType; next: number; estab: string; pto: string; user?: string }) {
  return request<{ key: string; next: number; formatted: string }>('/api/sequence/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function fetchSequenceLog(limit = 30): Promise<SequenceLogEntry[]> {
  const data = await request<{ log: SequenceLogEntry[] }>(`/api/sequence/log?limit=${limit}`);
  return data.log;
}
