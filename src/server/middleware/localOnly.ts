/**
 * Permite solo peticiones desde este equipo o la red local del estudio
 * (127.0.0.0/8, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10, fc00::/7).
 *
 * El sistema funciona en Windows en el local, sin exponerse a internet; si algún día se publica,
 * este filtro evita que alguien de afuera consulte o sincronice los comprobantes.
 * Para desactivarlo (no recomendado): SRI_API_PERMITIR_REMOTO=1
 */
import type { NextFunction, Request, Response } from 'express';

export function esIpLocal(ipRaw: string | undefined): boolean {
  if (!ipRaw) return false;
  const ip = ipRaw.replace(/^::ffff:/, '').toLowerCase();
  if (ip === '::1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (ip.startsWith('fe80:') || /^f[cd][0-9a-f]{2}:/.test(ip)) return true;
  return false;
}

export function soloRedLocal(req: Request, res: Response, next: NextFunction) {
  if (process.env.SRI_API_PERMITIR_REMOTO === '1' || esIpLocal(req.socket.remoteAddress)) return next();
  res.status(403).json({ error: 'Acceso permitido solo desde la red local del estudio.' });
}
