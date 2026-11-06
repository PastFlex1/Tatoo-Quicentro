/**
 * Procesamiento por lotes de claves de acceso contra el servicio oficial de autorización.
 *
 *  - Concurrencia limitada (predeterminado 3) para no saturar al SRI.
 *  - Pausa corta entre peticiones de cada trabajador.
 *  - Cada clave usa los reintentos/timeouts de sri.authorization.
 *  - Cancelable con AbortSignal (p. ej. al apagar el servidor).
 *  - No sabe nada de la base de datos: entrega cada resultado por `onResultado`
 *    (la Etapa 5 lo conecta con la cola y la colección de MongoDB).
 */
import { consultarAutorizacion } from './sri.authorization.ts';
import type { OpcionesAutorizacion, ResultadoAutorizacion } from './sri.authorization.ts';

export interface OpcionesLote extends OpcionesAutorizacion {
  /** Consultas simultáneas. Predeterminado: 3 (máximo 6) */
  concurrencia?: number;
  /** Pausa entre consultas de un mismo trabajador (ms). Predeterminado: 150 */
  pausaMs?: number;
  /** Se llama con cada resultado apenas llega (puede ser async: se espera antes de seguir) */
  onResultado?: (r: ResultadoAutorizacion, progreso: { hechas: number; total: number }) => void | Promise<void>;
}

export interface ResumenLote {
  total: number;
  autorizados: number;
  errores: number;
  /** Errores por tipo: NO_EXISTE, NO_AUTORIZADO, TIMEOUT, … */
  porError: Record<string, number>;
  cancelado: boolean;
  duracionMs: number;
  resultados: ResultadoAutorizacion[];
}

const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function procesarLote(clavesEntrada: string[], opciones: OpcionesLote = {}): Promise<ResumenLote> {
  const inicio = Date.now();
  // Sin repetir dentro del mismo lote
  const claves = [...new Set(clavesEntrada.map(c => String(c).replace(/\s+/g, '')).filter(Boolean))];
  const concurrencia = Math.min(6, Math.max(1, opciones.concurrencia ?? 3));
  const pausaMs = opciones.pausaMs ?? 150;
  const resultados: ResultadoAutorizacion[] = new Array(claves.length);
  let siguiente = 0;
  let hechas = 0;
  let cancelado = false;

  const trabajador = async () => {
    while (siguiente < claves.length) {
      if (opciones.signal?.aborted) {
        cancelado = true;
        return;
      }
      const i = siguiente++;
      try {
        resultados[i] = await consultarAutorizacion(claves[i], opciones);
      } catch (err) {
        // Solo llega aquí si se canceló durante la espera de un reintento
        cancelado = true;
        resultados[i] = { ok: false, claveAcceso: claves[i], error: 'RED', mensaje: (err as Error).message, intentos: 0 };
        return;
      }
      hechas++;
      await opciones.onResultado?.(resultados[i], { hechas, total: claves.length });
      if (pausaMs && siguiente < claves.length) await pausa(pausaMs);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrencia, claves.length) }, trabajador));

  const listos = resultados.filter(Boolean);
  const porError: Record<string, number> = {};
  for (const r of listos) if (!r.ok) porError[r.error] = (porError[r.error] || 0) + 1;
  return {
    total: claves.length,
    autorizados: listos.filter(r => r.ok).length,
    errores: listos.filter(r => !r.ok).length,
    porError,
    cancelado,
    duracionMs: Date.now() - inicio,
    resultados: listos,
  };
}
