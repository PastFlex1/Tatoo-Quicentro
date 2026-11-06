/**
 * Modelo de datos en MongoDB del módulo de comprobantes recibidos.
 *
 *   comprobantes_recibidos   un documento por comprobante · índice ÚNICO por claveAcceso
 *   sri_claves_pendientes    cola de claves por consultar (sobrevive a reinicios)
 *   sri_sincronizaciones     bitácora de cada ejecución (contadores y errores)
 *   sri_configuracion        documento único: candado de ejecución y sincronización automática
 *
 * prepararBase() crea colecciones, validación $jsonSchema e índices. Es idempotente.
 */
import type { Db, ObjectId } from 'mongodb';
import type { ComprobanteParseado, CodigoComprobante } from './sri.types.ts';

export const COL = {
  comprobantes: 'comprobantes_recibidos',
  pendientes: 'sri_claves_pendientes',
  sincronizaciones: 'sri_sincronizaciones',
  configuracion: 'sri_configuracion',
} as const;

export type Fuente = 'TXT' | 'CLAVE' | 'XML' | 'IMAP' | 'WEBHOOK' | 'MIGRACION';
export const FUENTES: Fuente[] = ['TXT', 'CLAVE', 'XML', 'IMAP', 'WEBHOOK', 'MIGRACION'];
export type EstadoProcesamiento = 'PENDIENTE_REVISION' | 'REVISADO' | 'CONTABILIZADO' | 'ERROR';
export const ESTADOS_PROCESAMIENTO: EstadoProcesamiento[] = ['PENDIENTE_REVISION', 'REVISADO', 'CONTABILIZADO', 'ERROR'];

// ------------------------------------------------------------------ documentos
export interface ComprobanteDoc extends Omit<ComprobanteParseado, 'fechaEmision' | 'autorizacion' | 'advertencias'> {
  _id?: ObjectId;
  fechaEmision: Date;
  fechaAutorizacion: Date | null;
  numeroAutorizacion: string;
  estadoSri: 'AUTORIZADO' | 'ANULADO';
  estadoProcesamiento: EstadoProcesamiento;
  fuente: Fuente;
  /** <autorizacion> completo devuelto por el SRI (obligación de conservar el XML) */
  xmlOriginal: string;
  advertencias: string[];
  esParaEmpresa: boolean | null;
  sincronizadoEn: Date;
  actualizadoEn: Date;
  expenseId?: string;
  observacion?: string;
}

export type EstadoPendiente = 'PENDIENTE' | 'PROCESADA' | 'FALLIDA';

export interface ClavePendienteDoc {
  _id?: ObjectId;
  claveAcceso: string;
  tipo: string;
  /** Derivada de la clave (ddmmaaaa): permite sincronizar por rango sin consultar al SRI */
  fechaEmision: Date;
  fuente: Fuente;
  estado: EstadoPendiente;
  intentos: number;
  ultimoError?: { tipo: string; mensaje: string; en: Date };
  /** Próximo reintento (errores transitorios); null = no se reintenta */
  proximoIntento: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface SincronizacionDoc {
  _id?: ObjectId;
  inicio: Date;
  fin: Date | null;
  estado: 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA' | 'FALLIDA';
  disparador: 'MANUAL' | 'AUTOMATICA';
  rango: { desde: Date | null; hasta: Date | null };
  encontrados: number;
  procesados: number;
  nuevos: number;
  duplicados: number;
  errores: number;
  /** Se guardan como máximo 200 para no crecer sin límite */
  detalleErrores: { claveAcceso: string; tipo: string; mensaje: string }[];
  mensaje?: string;
}

/** Buzón de correo donde los proveedores envían sus comprobantes (fuente IMAP) */
export interface ConfigCorreo {
  activo: boolean;
  host: string;
  puerto: number;
  /** TLS directo (puerto 993) */
  seguro: boolean;
  usuario: string;
  /** Cifrada con AES-256-GCM (security/cifrado.ts); nunca se devuelve por la API */
  contrasenaCifrada: string;
  carpeta: string;
  /** Primera lectura: cuántos días hacia atrás revisar */
  diasAtras: number;
  ultimoUid: number;
  uidValidity: string | null;
  ultimaLectura: Date | null;
  ultimoResultado?: { mensajes: number; xmls: number; claves: number; encoladas: number; yaRegistradas: number };
  ultimoError?: string | null;
}

export interface ConfiguracionDoc {
  _id: 'principal';
  candado: { idEjecucion: ObjectId; desde: Date } | null;
  automatica: { activa: boolean; cadaMinutos: number; horaInicio: string; horaFin: string };
  correo?: ConfigCorreo | null;
  actualizadoEn: Date;
}

export const CONFIG_PREDETERMINADA: Omit<ConfiguracionDoc, 'actualizadoEn'> = {
  _id: 'principal',
  candado: null,
  automatica: { activa: false, cadaMinutos: 60, horaInicio: '08:00', horaFin: '20:00' },
  correo: null,
};

// ------------------------------------------------------------------ conversión
/** 'YYYY-MM-DD' → Date a mediodía de Ecuador (UTC-5), para que nunca cambie de día */
export const fechaEcuador = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T12:00:00-05:00`);

/** Fecha de emisión contenida en la clave de acceso (posiciones 1-8: ddmmaaaa) */
export const fechaDeClave = (clave: string) => fechaEcuador(`${clave.slice(4, 8)}-${clave.slice(2, 4)}-${clave.slice(0, 2)}`);

const fechaSri = (s?: string): Date | null => {
  if (!s) return null;
  // El SRI usa ISO (2026-11-05T14:30:00-05:00) o dd/mm/aaaa hh:mm:ss
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/.exec(s);
  const d = m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] || '12'}:${m[5] || '00'}:${m[6] || '00'}-05:00`) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export function aDocumento(
  c: ComprobanteParseado,
  extra: { xmlOriginal: string; fuente: Fuente; numeroAutorizacion?: string; fechaAutorizacion?: string; esParaEmpresa: boolean | null }
): ComprobanteDoc {
  const ahora = new Date();
  const { autorizacion, fechaEmision, ...resto } = c;
  return {
    ...resto,
    fechaEmision: fechaEcuador(fechaEmision),
    fechaAutorizacion: fechaSri(extra.fechaAutorizacion || autorizacion?.fecha),
    numeroAutorizacion: extra.numeroAutorizacion || autorizacion?.numero || c.claveAcceso,
    estadoSri: 'AUTORIZADO',
    estadoProcesamiento: 'PENDIENTE_REVISION',
    fuente: extra.fuente,
    xmlOriginal: extra.xmlOriginal,
    esParaEmpresa: extra.esParaEmpresa,
    sincronizadoEn: ahora,
    actualizadoEn: ahora,
  };
}

// ------------------------------------------------------------------ validación de esquema
const TIPOS: CodigoComprobante[] = ['01', '03', '04', '05', '06', '07'];

const ESQUEMA_COMPROBANTE = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['claveAcceso', 'tipo', 'emisor', 'numero', 'fechaEmision', 'totales', 'xmlOriginal', 'estadoProcesamiento', 'fuente', 'sincronizadoEn'],
    properties: {
      claveAcceso: { bsonType: 'string', pattern: '^[0-9]{49}$' },
      tipo: { enum: TIPOS },
      emisor: {
        bsonType: 'object',
        required: ['identificacion', 'razonSocial'],
        properties: { identificacion: { bsonType: 'string', pattern: '^[0-9]{13}$' }, razonSocial: { bsonType: 'string' } },
      },
      numero: { bsonType: 'string', pattern: '^[0-9]{3}-[0-9]{3}-[0-9]{9}$' },
      fechaEmision: { bsonType: 'date' },
      fechaAutorizacion: { bsonType: ['date', 'null'] },
      totales: { bsonType: 'object', required: ['total'], properties: { total: { bsonType: ['double', 'int', 'long', 'decimal'] } } },
      xmlOriginal: { bsonType: 'string', minLength: 50 },
      estadoSri: { enum: ['AUTORIZADO', 'ANULADO'] },
      estadoProcesamiento: { enum: ESTADOS_PROCESAMIENTO },
      fuente: { enum: FUENTES },
      sincronizadoEn: { bsonType: 'date' },
    },
  },
};

const ESQUEMA_PENDIENTE = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['claveAcceso', 'estado', 'intentos', 'fuente', 'fechaEmision'],
    properties: {
      claveAcceso: { bsonType: 'string', pattern: '^[0-9]{49}$' },
      estado: { enum: ['PENDIENTE', 'PROCESADA', 'FALLIDA'] },
      intentos: { bsonType: ['int', 'long', 'double'], minimum: 0 },
      fuente: { enum: FUENTES },
      fechaEmision: { bsonType: 'date' },
    },
  },
};

async function asegurarColeccion(db: Db, nombre: string, validator?: object) {
  const existe = (await db.listCollections({ name: nombre }, { nameOnly: true }).toArray()).length > 0;
  if (!existe) {
    await db.createCollection(nombre, validator ? { validator, validationLevel: 'strict', validationAction: 'error' } : {});
  } else if (validator) {
    await db.command({ collMod: nombre, validator, validationLevel: 'strict', validationAction: 'error' });
  }
}

/** Crea colecciones, validaciones e índices (idempotente: se llama al iniciar el servidor) */
export async function prepararBase(db: Db) {
  await asegurarColeccion(db, COL.comprobantes, ESQUEMA_COMPROBANTE);
  await asegurarColeccion(db, COL.pendientes, ESQUEMA_PENDIENTE);
  await asegurarColeccion(db, COL.sincronizaciones);
  await asegurarColeccion(db, COL.configuracion);

  await db.collection(COL.comprobantes).createIndexes([
    { key: { claveAcceso: 1 }, name: 'claveAcceso_unica', unique: true },
    { key: { fechaEmision: -1 }, name: 'fechaEmision' },
    { key: { tipo: 1, fechaEmision: -1 }, name: 'tipo_fecha' },
    { key: { 'emisor.identificacion': 1, fechaEmision: -1 }, name: 'emisor_fecha' },
    { key: { estadoProcesamiento: 1, fechaEmision: -1 }, name: 'estado_fecha' },
    { key: { 'emisor.razonSocial': 'text', 'emisor.nombreComercial': 'text', numero: 'text' }, name: 'busqueda_texto', default_language: 'spanish' },
  ]);
  await db.collection(COL.pendientes).createIndexes([
    { key: { claveAcceso: 1 }, name: 'claveAcceso_unica', unique: true },
    { key: { estado: 1, proximoIntento: 1, fechaEmision: 1 }, name: 'cola' },
  ]);
  await db.collection(COL.sincronizaciones).createIndexes([{ key: { inicio: -1 }, name: 'inicio' }]);
  await db
    .collection<ConfiguracionDoc>(COL.configuracion)
    .updateOne({ _id: 'principal' }, { $setOnInsert: { ...CONFIG_PREDETERMINADA, actualizadoEn: new Date() } }, { upsert: true });
}

export const esDuplicado = (err: unknown) => (err as { code?: number })?.code === 11000;
