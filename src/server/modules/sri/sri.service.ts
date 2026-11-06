/**
 * Lógica de negocio del módulo de comprobantes recibidos (sin HTTP).
 * El controlador valida la entrada y llama a estas funciones.
 */
import type { Db, Filter, ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.ts';
import { parsearComprobante } from './sri.parser.ts';
import { COL, prepararBase } from './sri.model.ts';
import type { ClavePendienteDoc, ComprobanteDoc, ConfiguracionDoc, EstadoProcesamiento, EstadoPendiente, Fuente, SincronizacionDoc } from './sri.model.ts';
import { encolarClaves, ejecutarSincronizacion, estadoSincronizacion, registrarComprobante } from './sri.sync.ts';
import type { ResultadoEncolar } from './sri.sync.ts';
import { leerCorreo, probarConexion } from './sources/imap.source.ts';
import { cifradoDisponible, cifrar, descifrar } from '../../security/cifrado.ts';
import type { ConfigCorreo } from './sri.model.ts';

// ------------------------------------------------------------------ base de datos (preparada una sola vez)
let preparada: Promise<Db> | null = null;
export function db(): Promise<Db> {
  if (!preparada) {
    preparada = getDb()
      .then(async d => {
        await prepararBase(d);
        return d;
      })
      .catch(err => {
        preparada = null; // el siguiente pedido vuelve a intentar
        throw err;
      });
  }
  return preparada;
}

// ------------------------------------------------------------------ listado
export interface FiltrosListado {
  desde?: Date;
  hasta?: Date;
  tipo?: string[];
  estado?: EstadoProcesamiento[];
  q?: string;
  pagina: number;
  porPagina: number;
  orden: 'fecha_desc' | 'fecha_asc' | 'total_desc' | 'total_asc';
}

const ORDENES = {
  fecha_desc: { fechaEmision: -1, numero: -1 },
  fecha_asc: { fechaEmision: 1, numero: 1 },
  total_desc: { 'totales.total': -1 },
  total_asc: { 'totales.total': 1 },
} as const;

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function construirFiltro(f: Omit<FiltrosListado, 'pagina' | 'porPagina' | 'orden'>): Filter<ComprobanteDoc> {
  const filtro: Filter<ComprobanteDoc> = {};
  if (f.desde || f.hasta) filtro.fechaEmision = { ...(f.desde ? { $gte: f.desde } : {}), ...(f.hasta ? { $lte: f.hasta } : {}) };
  if (f.tipo?.length) filtro.tipo = { $in: f.tipo as ComprobanteDoc['tipo'][] };
  if (f.estado?.length) filtro.estadoProcesamiento = { $in: f.estado };
  const q = f.q?.trim();
  if (q) {
    const digitos = q.replace(/\D/g, '');
    if (/^\d{49}$/.test(digitos)) filtro.claveAcceso = digitos;
    else if (/^\d{10,13}$/.test(q)) filtro['emisor.identificacion'] = { $regex: `^${q}` };
    else {
      const rx = { $regex: escaparRegex(q), $options: 'i' };
      filtro.$or = [{ 'emisor.razonSocial': rx }, { 'emisor.nombreComercial': rx }, { numero: rx }];
    }
  }
  return filtro;
}

/** Campos pesados que no viajan en el listado */
const SIN_XML = { xmlOriginal: 0, detalles: 0, infoAdicional: 0, destinatarios: 0 } as const;

export async function listar(f: FiltrosListado) {
  const d = await db();
  const col = d.collection<ComprobanteDoc>(COL.comprobantes);
  const filtro = construirFiltro(f);
  const [items, total, resumen] = await Promise.all([
    col
      .find(filtro, { projection: SIN_XML })
      .sort(ORDENES[f.orden] as any)
      .skip((f.pagina - 1) * f.porPagina)
      .limit(f.porPagina)
      .toArray(),
    col.countDocuments(filtro),
    col
      .aggregate([
        { $match: filtro },
        {
          $group: {
            _id: null,
            comprobantes: { $sum: 1 },
            // Las notas de crédito restan y las retenciones/guías no suman compras
            total: { $sum: { $switch: { branches: [{ case: { $eq: ['$tipo', '04'] }, then: { $multiply: ['$totales.total', -1] } }, { case: { $in: ['$tipo', ['06', '07']] }, then: 0 }], default: '$totales.total' } } },
            iva: { $sum: { $cond: [{ $eq: ['$tipo', '04'] }, { $multiply: ['$totales.iva', -1] }, { $cond: [{ $in: ['$tipo', ['06', '07']] }, 0, '$totales.iva'] }] } },
            base15: { $sum: { $cond: [{ $eq: ['$tipo', '04'] }, { $multiply: ['$totales.base15', -1] }, '$totales.base15'] } },
            base0: { $sum: { $cond: [{ $eq: ['$tipo', '04'] }, { $multiply: ['$totales.base0', -1] }, '$totales.base0'] } },
            retenido: { $sum: { $ifNull: ['$totalRetenido', 0] } },
            // Solo lo que se registra como gasto: facturas, liquidaciones y notas de débito
            porContabilizar: {
              $sum: { $cond: [{ $and: [{ $in: ['$estadoProcesamiento', ['PENDIENTE_REVISION', 'REVISADO']] }, { $in: ['$tipo', ['01', '03', '05']] }] }, 1, 0] },
            },
          },
        },
      ])
      .next(),
  ]);
  const r2 = (n: number) => Math.round((n || 0) * 100) / 100;
  return {
    items,
    paginacion: { pagina: f.pagina, porPagina: f.porPagina, total, paginas: Math.max(1, Math.ceil(total / f.porPagina)) },
    resumen: {
      comprobantes: resumen?.comprobantes ?? 0,
      total: r2(resumen?.total),
      iva: r2(resumen?.iva),
      base15: r2(resumen?.base15),
      base0: r2(resumen?.base0),
      retenido: r2(resumen?.retenido),
      porContabilizar: resumen?.porContabilizar ?? 0,
    },
  };
}

export async function obtener(clave: string, conXml = false) {
  const d = await db();
  return d.collection<ComprobanteDoc>(COL.comprobantes).findOne({ claveAcceso: clave }, conXml ? {} : { projection: { xmlOriginal: 0 } });
}

export async function obtenerXml(clave: string) {
  const d = await db();
  const doc = await d.collection<ComprobanteDoc>(COL.comprobantes).findOne({ claveAcceso: clave }, { projection: { xmlOriginal: 1, numero: 1, tipo: 1, 'emisor.identificacion': 1 } });
  return doc ? { xml: doc.xmlOriginal, nombre: `${doc.emisor.identificacion}_${doc.tipo}_${doc.numero}.xml` } : null;
}

export async function actualizar(clave: string, cambios: { estadoProcesamiento?: EstadoProcesamiento; expenseId?: string | null; observacion?: string | null }) {
  const d = await db();
  const $set: Record<string, unknown> = { actualizadoEn: new Date() };
  const $unset: Record<string, ''> = {};
  if (cambios.estadoProcesamiento) $set.estadoProcesamiento = cambios.estadoProcesamiento;
  for (const k of ['expenseId', 'observacion'] as const) {
    if (cambios[k] === null) $unset[k] = '';
    else if (cambios[k] !== undefined) $set[k] = cambios[k];
  }
  return d
    .collection<ComprobanteDoc>(COL.comprobantes)
    .findOneAndUpdate({ claveAcceso: clave }, { $set, ...(Object.keys($unset).length ? { $unset } : {}) }, { returnDocument: 'after', projection: { xmlOriginal: 0 } });
}

// ------------------------------------------------------------------ entrada de claves
export async function agregarClaves(entrada: string | string[], fuente: Fuente): Promise<ResultadoEncolar> {
  return encolarClaves(await db(), entrada, fuente);
}

/**
 * XML subidos por el usuario: se extrae la clave y se encola. El XML guardado será siempre el que
 * devuelva el SRI (fuente oficial), no el archivo subido.
 */
export async function agregarXmls(archivos: { nombre: string; contenido: string }[]) {
  const claves: string[] = [];
  const errores: { nombre: string; error: string }[] = [];
  for (const a of archivos) {
    const r = parsearComprobante(a.contenido);
    if (r.ok) claves.push(r.comprobante.claveAcceso);
    else {
      // Último recurso: buscar una clave de 49 dígitos en el texto
      const m = /<claveAcceso>\s*(\d{49})\s*<\/claveAcceso>/.exec(a.contenido);
      if (m) claves.push(m[1]);
      else errores.push({ nombre: a.nombre, error: r.error });
    }
  }
  const encolado = claves.length ? await encolarClaves(await db(), claves, 'XML') : null;
  return { encolado, errores };
}

/**
 * Migración de la bandeja que antes vivía en el navegador (localStorage) y entrada del webhook.
 * Con XML: se registra conservando estado y gasto vinculado. Sin XML o con XML ilegible: la clave
 * entra a la cola para traer el XML oficial del SRI en la próxima sincronización.
 */
export async function migrar(items: { claveAcceso?: string; xml?: string; estadoProcesamiento?: EstadoProcesamiento; expenseId?: string }[], fuente: Fuente = 'MIGRACION') {
  const d = await db();
  const res = { nuevos: 0, duplicados: 0, encolados: 0, errores: [] as { claveAcceso: string; error: string }[] };
  const sinXml: string[] = [];
  for (const it of items) {
    if (it.xml) {
      const r = await registrarComprobante(d, { xml: it.xml, fuente, claveEsperada: it.claveAcceso || undefined });
      if (r.estado === 'NUEVO') {
        res.nuevos++;
        if (it.estadoProcesamiento || it.expenseId) await actualizar(r.claveAcceso, { estadoProcesamiento: it.estadoProcesamiento, expenseId: it.expenseId });
        continue;
      }
      if (r.estado === 'DUPLICADO') {
        res.duplicados++;
        continue;
      }
      if (r.estado === 'OTRO_RECEPTOR') {
        res.errores.push({ claveAcceso: r.claveAcceso, error: r.error });
        continue;
      }
    }
    if (it.claveAcceso) sinXml.push(it.claveAcceso);
    else res.errores.push({ claveAcceso: '', error: 'Registro sin XML ni clave de acceso.' });
  }
  if (sinXml.length) {
    const e = await encolarClaves(d, sinXml, fuente);
    res.encolados = e.encoladas + e.reactivadas;
    res.duplicados += e.yaRegistradas;
  }
  return res;
}

export async function listarClaves(estado: EstadoPendiente | undefined, pagina: number, porPagina: number) {
  const d = await db();
  const col = d.collection<ClavePendienteDoc>(COL.pendientes);
  const filtro = estado ? { estado } : {};
  const [items, total] = await Promise.all([
    col.find(filtro).sort({ actualizadoEn: -1 }).skip((pagina - 1) * porPagina).limit(porPagina).toArray(),
    col.countDocuments(filtro),
  ]);
  return { items, paginacion: { pagina, porPagina, total, paginas: Math.max(1, Math.ceil(total / porPagina)) } };
}

// ------------------------------------------------------------------ sincronización
let controlador: AbortController | null = null;

export type InicioSincronizacion = { iniciada: true; idEjecucion: string } | { iniciada: false; ocupado: true; idEjecucion: string; desde: Date };

/** Inicia en segundo plano y responde apenas toma el candado */
export async function iniciarSincronizacion(opts: { desde?: Date; hasta?: Date; disparador: 'MANUAL' | 'AUTOMATICA' }): Promise<InicioSincronizacion> {
  const d = await db();
  const ctrl = new AbortController();
  return new Promise<InicioSincronizacion>((resolve, reject) => {
    let respondido = false;
    ejecutarSincronizacion(d, {
      ...opts,
      signal: ctrl.signal,
      alIniciar: (id: ObjectId) => {
        controlador = ctrl;
        respondido = true;
        console.log(`[SRI] Sincronización ${opts.disparador.toLowerCase()} iniciada (${id})`);
        resolve({ iniciada: true, idEjecucion: String(id) });
      },
    })
      .then(r => {
        if (!r.ok) {
          respondido = true;
          resolve({ iniciada: false, ocupado: true, idEjecucion: r.idEjecucion, desde: r.desde });
          return;
        }
        const e = r.ejecucion;
        console.log(`[SRI] Sincronización ${e.estado.toLowerCase()}: ${e.encontrados} encontrados, ${e.nuevos} nuevos, ${e.duplicados} duplicados, ${e.errores} errores`);
      })
      .catch(err => {
        console.error('[SRI] La sincronización falló:', err?.message || err);
        if (!respondido) reject(err);
      })
      .finally(() => {
        if (controlador === ctrl) controlador = null;
      });
  });
}

/**
 * SINCRONIZAR SRI completo: primero lee el buzón de correo (si está configurado) para sumar sus claves
 * a la cola y luego procesa la cola contra el servicio oficial del SRI.
 */
export async function sincronizarTodo(opts: { desde?: Date; hasta?: Date; disparador: 'MANUAL' | 'AUTOMATICA' }) {
  const d = await db();
  const correo = await leerCorreo(d);
  const inicio = await iniciarSincronizacion(opts);
  return { inicio, correo };
}

export function cancelarSincronizacion(): boolean {
  if (!controlador) return false;
  controlador.abort();
  return true;
}

export async function estado() {
  const d = await db();
  const base = await estadoSincronizacion(d);
  const actual = base.enCurso
    ? await d.collection<SincronizacionDoc>(COL.sincronizaciones).find({ estado: 'EN_CURSO' }).sort({ inicio: -1 }).limit(1).next()
    : null;
  return { ...base, actual };
}

export async function historial(limite: number) {
  const d = await db();
  return d.collection<SincronizacionDoc>(COL.sincronizaciones).find({}, { projection: { detalleErrores: 0 } }).sort({ inicio: -1 }).limit(limite).toArray();
}

// ------------------------------------------------------------------ buzón de correo (fuente IMAP)
export interface CorreoPublico {
  activo: boolean;
  host: string;
  puerto: number;
  seguro: boolean;
  usuario: string;
  carpeta: string;
  diasAtras: number;
  tieneContrasena: boolean;
  ultimaLectura: Date | null;
  ultimoResultado?: ConfigCorreo['ultimoResultado'];
  ultimoError?: string | null;
}

/** Configuración del correo SIN la contraseña */
export async function obtenerCorreo(): Promise<{ correo: CorreoPublico | null; cifradoDisponible: boolean }> {
  const d = await db();
  const c = (await d.collection<ConfiguracionDoc>(COL.configuracion).findOne({ _id: 'principal' }))?.correo;
  return {
    cifradoDisponible: cifradoDisponible(),
    correo: c
      ? {
          activo: c.activo,
          host: c.host,
          puerto: c.puerto,
          seguro: c.seguro,
          usuario: c.usuario,
          carpeta: c.carpeta,
          diasAtras: c.diasAtras,
          tieneContrasena: Boolean(c.contrasenaCifrada),
          ultimaLectura: c.ultimaLectura,
          ultimoResultado: c.ultimoResultado,
          ultimoError: c.ultimoError,
        }
      : null,
  };
}

export async function guardarCorreo(datos: { activo: boolean; host: string; puerto: number; seguro: boolean; usuario: string; contrasena?: string; carpeta: string; diasAtras: number }) {
  const d = await db();
  const col = d.collection<ConfiguracionDoc>(COL.configuracion);
  const actual = (await col.findOne({ _id: 'principal' }))?.correo;
  const contrasenaCifrada = datos.contrasena ? cifrar(datos.contrasena) : actual?.contrasenaCifrada || '';
  if (!contrasenaCifrada && datos.activo) throw new Error('Ingrese la contraseña del correo.');
  // Si cambia de buzón o carpeta se vuelve a empezar la lectura
  const mismoBuzon = actual && actual.host === datos.host && actual.usuario === datos.usuario && actual.carpeta === datos.carpeta;
  const correo: ConfigCorreo = {
    activo: datos.activo,
    host: datos.host,
    puerto: datos.puerto,
    seguro: datos.seguro,
    usuario: datos.usuario,
    contrasenaCifrada,
    carpeta: datos.carpeta,
    diasAtras: datos.diasAtras,
    ultimoUid: mismoBuzon ? actual!.ultimoUid : 0,
    uidValidity: mismoBuzon ? actual!.uidValidity : null,
    ultimaLectura: mismoBuzon ? actual!.ultimaLectura : null,
    ultimoResultado: mismoBuzon ? actual!.ultimoResultado : undefined,
    ultimoError: null,
  };
  await col.updateOne({ _id: 'principal' }, { $set: { correo, actualizadoEn: new Date() } }, { upsert: true });
  return obtenerCorreo();
}

export async function probarCorreo(datos: { host: string; puerto: number; seguro: boolean; usuario: string; contrasena?: string; carpeta: string }) {
  let contrasena = datos.contrasena;
  if (!contrasena) {
    const d = await db();
    const c = (await d.collection<ConfiguracionDoc>(COL.configuracion).findOne({ _id: 'principal' }))?.correo;
    if (!c?.contrasenaCifrada) return { ok: false as const, error: 'Ingrese la contraseña del correo.' };
    contrasena = descifrar(c.contrasenaCifrada);
  }
  return probarConexion({ ...datos, contrasena });
}

export async function leerCorreoAhora() {
  return leerCorreo(await db());
}

export async function configurarAutomatica(cfg: ConfiguracionDoc['automatica']) {
  const d = await db();
  const r = await d
    .collection<ConfiguracionDoc>(COL.configuracion)
    .findOneAndUpdate({ _id: 'principal' }, { $set: { automatica: cfg, actualizadoEn: new Date() } }, { returnDocument: 'after', upsert: true });
  return r?.automatica ?? cfg;
}
