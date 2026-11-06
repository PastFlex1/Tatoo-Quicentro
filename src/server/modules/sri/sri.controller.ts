/**
 * Controladores HTTP del módulo: validan la entrada, llaman al servicio y dan formato a la respuesta.
 * Express 5 propaga solos los errores de funciones async al manejador de errores de sri.routes.
 */
import type { NextFunction, Request, Response } from 'express';
import { ESTADOS_PROCESAMIENTO } from './sri.model.ts';
import type { EstadoPendiente, EstadoProcesamiento } from './sri.model.ts';
import * as servicio from './sri.service.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const mal = (msg: string) => new HttpError(400, msg);

// ------------------------------------------------------------------ validadores
const TIPOS = ['01', '03', '04', '05', '06', '07'];
const ORDENES = ['fecha_desc', 'fecha_asc', 'total_desc', 'total_asc'] as const;
const qs = (v: unknown) => (typeof v === 'string' ? v.trim() : Array.isArray(v) ? String(v[0] ?? '').trim() : '');

/** 'YYYY-MM-DD' → inicio o fin del día en hora de Ecuador */
function fecha(v: unknown, nombre: string, finDelDia = false): Date | undefined {
  const s = qs(v);
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw mal(`"${nombre}" debe tener el formato AAAA-MM-DD.`);
  const d = new Date(`${s}T${finDelDia ? '23:59:59.999' : '00:00:00'}-05:00`);
  if (isNaN(d.getTime())) throw mal(`"${nombre}" no es una fecha válida.`);
  return d;
}

function rango(desdeRaw: unknown, hastaRaw: unknown) {
  const desde = fecha(desdeRaw, 'desde');
  const hasta = fecha(hastaRaw, 'hasta', true);
  if (desde && hasta && desde > hasta) throw mal('"desde" no puede ser posterior a "hasta".');
  return { desde, hasta };
}

function entero(v: unknown, nombre: string, def: number, min: number, max: number) {
  const s = qs(v);
  if (!s) return def;
  const n = Number(s);
  if (!Number.isInteger(n) || n < min || n > max) throw mal(`"${nombre}" debe ser un entero entre ${min} y ${max}.`);
  return n;
}

function listaDe<T extends string>(v: unknown, nombre: string, permitidos: readonly T[]): T[] | undefined {
  const s = qs(v);
  if (!s) return undefined;
  const items = s.split(',').map(x => x.trim()).filter(Boolean);
  const malos = items.filter(x => !permitidos.includes(x as T));
  if (malos.length) throw mal(`"${nombre}" no admite: ${malos.join(', ')}. Valores: ${permitidos.join(', ')}.`);
  return items as T[];
}

function clave(req: Request) {
  const c = String(req.params.clave || '');
  if (!/^\d{49}$/.test(c)) throw mal('La clave de acceso debe tener 49 dígitos.');
  return c;
}

const cuerpo = (req: Request): Record<string, any> => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {});

// ------------------------------------------------------------------ comprobantes
export async function listar(req: Request, res: Response) {
  const { desde, hasta } = rango(req.query.desde, req.query.hasta);
  const orden = qs(req.query.orden) || 'fecha_desc';
  if (!ORDENES.includes(orden as (typeof ORDENES)[number])) throw mal(`"orden" debe ser: ${ORDENES.join(', ')}.`);
  const q = qs(req.query.q);
  if (q.length > 100) throw mal('"q" admite como máximo 100 caracteres.');
  res.json(
    await servicio.listar({
      desde,
      hasta,
      tipo: listaDe(req.query.tipo, 'tipo', TIPOS),
      estado: listaDe(req.query.estado, 'estado', ESTADOS_PROCESAMIENTO),
      q,
      pagina: entero(req.query.pagina, 'pagina', 1, 1, 100000),
      porPagina: entero(req.query.porPagina, 'porPagina', 50, 1, 200),
      orden: orden as (typeof ORDENES)[number],
    })
  );
}

export async function detalle(req: Request, res: Response) {
  const doc = await servicio.obtener(clave(req));
  if (!doc) throw new HttpError(404, 'No existe un comprobante con esa clave de acceso.');
  res.json(doc);
}

export async function xml(req: Request, res: Response) {
  const r = await servicio.obtenerXml(clave(req));
  if (!r) throw new HttpError(404, 'No existe un comprobante con esa clave de acceso.');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  const modo = qs(req.query.descargar) === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${modo}; filename="${r.nombre.replace(/[^\w.-]/g, '_')}"`);
  res.send(r.xml);
}

export async function actualizar(req: Request, res: Response) {
  const c = clave(req);
  const b = cuerpo(req);
  const cambios: { estadoProcesamiento?: EstadoProcesamiento; expenseId?: string | null; observacion?: string | null } = {};
  if (b.estadoProcesamiento !== undefined) {
    if (!ESTADOS_PROCESAMIENTO.includes(b.estadoProcesamiento)) throw mal(`"estadoProcesamiento" debe ser: ${ESTADOS_PROCESAMIENTO.join(', ')}.`);
    cambios.estadoProcesamiento = b.estadoProcesamiento;
  }
  for (const [k, max] of [['expenseId', 100], ['observacion', 500]] as const) {
    if (b[k] === null) cambios[k] = null;
    else if (b[k] !== undefined) {
      if (typeof b[k] !== 'string' || b[k].length > max) throw mal(`"${k}" debe ser texto de máximo ${max} caracteres o null.`);
      cambios[k] = b[k].trim();
    }
  }
  if (!Object.keys(cambios).length) throw mal('No hay cambios: envíe estadoProcesamiento, expenseId u observacion.');
  const doc = await servicio.actualizar(c, cambios);
  if (!doc) throw new HttpError(404, 'No existe un comprobante con esa clave de acceso.');
  console.log(`[SRI] Comprobante ${doc.numero} actualizado: ${JSON.stringify(cambios)}`);
  res.json(doc);
}

// ------------------------------------------------------------------ entrada de claves y XML
export async function agregarClaves(req: Request, res: Response) {
  const b = cuerpo(req);
  const texto = typeof req.body === 'string' ? req.body : typeof b.texto === 'string' ? b.texto : undefined;
  const claves = Array.isArray(b.claves) ? b.claves : undefined;
  if (texto === undefined && !claves) throw mal('Envíe "texto" (reporte TXT o claves pegadas) o "claves" (lista).');
  if (claves && (claves.length > 20000 || claves.some((c: unknown) => typeof c !== 'string'))) throw mal('"claves" debe ser una lista de texto (máximo 20 000).');
  const fuente = b.fuente === 'TXT' || (texto !== undefined && b.fuente !== 'CLAVE') ? 'TXT' : 'CLAVE';
  const resultado = await servicio.agregarClaves(texto ?? claves!, claves && !texto ? 'CLAVE' : fuente);
  console.log(`[SRI] Claves recibidas (${fuente}): ${resultado.recibidas} válidas, ${resultado.encoladas} nuevas en cola, ${resultado.yaRegistradas} ya registradas`);
  const sincronizacion = b.sincronizar === true && resultado.encoladas + resultado.reactivadas > 0 ? await servicio.iniciarSincronizacion({ disparador: 'MANUAL' }) : null;
  res.status(201).json({ ...resultado, sincronizacion });
}

export async function agregarXml(req: Request, res: Response) {
  const b = cuerpo(req);
  const archivos = b.archivos;
  if (!Array.isArray(archivos) || !archivos.length) throw mal('Envíe "archivos": [{ nombre, contenido }].');
  if (archivos.length > 200) throw mal('Máximo 200 XML por envío.');
  if (archivos.some((a: any) => !a || typeof a.contenido !== 'string' || typeof (a.nombre ?? '') !== 'string')) throw mal('Cada archivo necesita "nombre" y "contenido" (texto del XML).');
  const r = await servicio.agregarXmls(archivos.map((a: any) => ({ nombre: String(a.nombre || 'archivo.xml').slice(0, 200), contenido: a.contenido })));
  const sincronizacion = b.sincronizar === true && (r.encolado?.encoladas ?? 0) + (r.encolado?.reactivadas ?? 0) > 0 ? await servicio.iniciarSincronizacion({ disparador: 'MANUAL' }) : null;
  res.status(201).json({ ...r, sincronizacion });
}

export async function migrar(req: Request, res: Response) {
  const items = cuerpo(req).comprobantes;
  if (!Array.isArray(items) || items.length > 5000) throw mal('Envíe "comprobantes": [{ claveAcceso, xml?, estadoProcesamiento?, expenseId? }] (máximo 5000).');
  const limpios = items
    .filter((i: any) => i && typeof i === 'object')
    .map((i: any) => ({
      claveAcceso: typeof i.claveAcceso === 'string' && /^\d{49}$/.test(i.claveAcceso) ? i.claveAcceso : undefined,
      xml: typeof i.xml === 'string' && i.xml.length > 50 ? i.xml : undefined,
      estadoProcesamiento: ESTADOS_PROCESAMIENTO.includes(i.estadoProcesamiento) ? (i.estadoProcesamiento as EstadoProcesamiento) : undefined,
      expenseId: typeof i.expenseId === 'string' ? i.expenseId.slice(0, 100) : undefined,
    }));
  const r = await servicio.migrar(limpios);
  console.log(`[SRI] Migración desde el navegador: ${r.nuevos} nuevos, ${r.duplicados} ya existían, ${r.encolados} a la cola, ${r.errores.length} con error`);
  res.json(r);
}

export async function listarClaves(req: Request, res: Response) {
  const estado = qs(req.query.estado);
  if (estado && !['PENDIENTE', 'PROCESADA', 'FALLIDA'].includes(estado)) throw mal('"estado" debe ser PENDIENTE, PROCESADA o FALLIDA.');
  res.json(await servicio.listarClaves((estado || undefined) as EstadoPendiente | undefined, entero(req.query.pagina, 'pagina', 1, 1, 100000), entero(req.query.porPagina, 'porPagina', 50, 1, 200)));
}

// ------------------------------------------------------------------ sincronización
export async function sincronizar(req: Request, res: Response) {
  const b = cuerpo(req);
  const { desde, hasta } = rango(b.desde, b.hasta);
  // Primero el buzón de correo (si está configurado), luego la cola contra el SRI
  const { inicio: r, correo } = await servicio.sincronizarTodo({ desde, hasta, disparador: 'MANUAL' });
  if (!r.iniciada) {
    res.status(409).json({ error: 'Ya hay una sincronización en curso.', idEjecucion: r.idEjecucion, desde: r.desde, correo });
    return;
  }
  res.status(202).json({ ...r, correo, estado: '/api/sri/estado-sincronizacion' });
}

// ------------------------------------------------------------------ buzón de correo
function datosCorreo(b: Record<string, any>, exigirContrasena: boolean) {
  const host = typeof b.host === 'string' ? b.host.trim() : '';
  if (!/^[a-z0-9.-]{3,253}$/i.test(host)) throw mal('"host" debe ser el servidor IMAP, por ejemplo imap.gmail.com.');
  const puerto = b.puerto ?? 993;
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw mal('"puerto" no es válido (normalmente 993).');
  const usuario = typeof b.usuario === 'string' ? b.usuario.trim() : '';
  if (!usuario || usuario.length > 200) throw mal('Ingrese el usuario (correo) del buzón.');
  const contrasena = typeof b.contrasena === 'string' && b.contrasena ? b.contrasena : undefined;
  if (exigirContrasena && !contrasena) throw mal('Ingrese la contraseña del correo.');
  if (contrasena && contrasena.length > 500) throw mal('La contraseña es demasiado larga.');
  const carpeta = typeof b.carpeta === 'string' && b.carpeta.trim() ? b.carpeta.trim().slice(0, 200) : 'INBOX';
  const diasAtras = b.diasAtras ?? 30;
  if (!Number.isInteger(diasAtras) || diasAtras < 1 || diasAtras > 365) throw mal('"diasAtras" debe estar entre 1 y 365.');
  return { host, puerto, seguro: b.seguro !== false, usuario, contrasena, carpeta, diasAtras };
}

export async function obtenerCorreo(_req: Request, res: Response) {
  res.json(await servicio.obtenerCorreo());
}

export async function guardarCorreo(req: Request, res: Response) {
  const b = cuerpo(req);
  const datos = datosCorreo(b, false);
  try {
    const r = await servicio.guardarCorreo({ ...datos, activo: b.activo !== false });
    console.log(`[SRI] Buzón de correo ${r.correo?.activo ? 'configurado' : 'desactivado'}: ${datos.usuario} en ${datos.host}`);
    res.json(r);
  } catch (err) {
    throw mal((err as Error).message);
  }
}

export async function probarCorreo(req: Request, res: Response) {
  const r = await servicio.probarCorreo(datosCorreo(cuerpo(req), false));
  res.status(r.ok ? 200 : 422).json(r);
}

export async function leerCorreo(_req: Request, res: Response) {
  const r = await servicio.leerCorreoAhora();
  res.status(r.error ? 502 : 200).json(r);
}

export async function cancelar(_req: Request, res: Response) {
  const ok = servicio.cancelarSincronizacion();
  res.status(ok ? 202 : 409).json(ok ? { mensaje: 'Cancelando: las claves restantes quedan en la cola.' } : { error: 'No hay una sincronización en curso en este servidor.' });
}

export async function estado(_req: Request, res: Response) {
  res.json(await servicio.estado());
}

export async function historial(req: Request, res: Response) {
  res.json(await servicio.historial(entero(req.query.limite, 'limite', 20, 1, 100)));
}

export async function automatica(req: Request, res: Response) {
  const b = cuerpo(req);
  const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (typeof b.activa !== 'boolean') throw mal('"activa" debe ser true o false.');
  const cadaMinutos = b.cadaMinutos ?? 60;
  if (!Number.isInteger(cadaMinutos) || cadaMinutos < 15 || cadaMinutos > 1440) throw mal('"cadaMinutos" debe ser un entero entre 15 y 1440.');
  const horaInicio = b.horaInicio ?? '08:00';
  const horaFin = b.horaFin ?? '20:00';
  if (!hora.test(horaInicio) || !hora.test(horaFin)) throw mal('"horaInicio" y "horaFin" deben tener el formato HH:MM.');
  const cfg = await servicio.configurarAutomatica({ activa: b.activa, cadaMinutos, horaInicio, horaFin });
  console.log(`[SRI] Sincronización automática ${cfg.activa ? `activada cada ${cfg.cadaMinutos} min (${cfg.horaInicio}-${cfg.horaFin})` : 'desactivada'}`);
  res.json(cfg);
}

// ------------------------------------------------------------------ errores
export function manejarErrores(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Cuerpo JSON mal formado o demasiado grande (body-parser)
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo no es JSON válido.' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'El contenido enviado es demasiado grande.' });
    return;
  }
  const msg = String(err?.message || err);
  if (/MongoDB|ECONNREFUSED|Server selection timed out|MongoServerSelectionError|MongoNetworkError/i.test(msg) || /^Mongo/.test(err?.name || '')) {
    console.error('[SRI] Base de datos no disponible:', msg);
    res.status(503).json({ error: 'La base de datos MongoDB no está disponible. Verifique que el servicio "MongoDB" de Windows esté iniciado.' });
    return;
  }
  console.error('[SRI] Error inesperado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}
