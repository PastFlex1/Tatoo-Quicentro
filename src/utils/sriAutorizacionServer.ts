/**
 * Endpoint de compatibilidad para la bandeja actual (hasta la Etapa 7):
 *
 *   GET /api/sri/comprobante/:claveAcceso
 *     200 { found: true, estado, numeroAutorizacion, fechaAutorizacion, ambiente, xml }
 *     400 clave inválida · 404 no existe / no autorizado · 502/504 SRI sin respuesta
 *
 * La consulta real vive en src/server/modules/sri/sri.authorization.ts (reintentos y timeouts).
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { consultarAutorizacion } from '../server/modules/sri/sri.authorization.ts';

export interface AutorizacionResult {
  found: boolean;
  estado?: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  ambiente?: string;
  xml?: string;
  error?: string;
  tipoError?: string;
}

const STATUS: Record<string, number> = { CLAVE_INVALIDA: 400, NO_EXISTE: 404, NO_AUTORIZADO: 404, TIMEOUT: 504, RED: 502, SRI_ERROR: 502 };

export async function sriAutorizacionMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url || '', 'http://localhost');
  const m = /^\/api\/sri\/comprobante\/(\d+)\/?$/.exec(url.pathname);
  if (!m || req.method !== 'GET') return next();

  // Una consulta interactiva no debe hacer esperar demasiado: 1 reintento
  const r = await consultarAutorizacion(m[1], { reintentos: 1 });
  const body: AutorizacionResult = r.ok
    ? { found: true, estado: r.estado, numeroAutorizacion: r.numeroAutorizacion, fechaAutorizacion: r.fechaAutorizacion, ambiente: r.ambiente, xml: r.autorizacionXml }
    : { found: false, estado: r.estado, error: r.mensaje, tipoError: r.error };

  res.statusCode = r.ok ? 200 : STATUS[r.error] || 502;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
