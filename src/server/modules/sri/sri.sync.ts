/**
 * Sincronización de comprobantes recibidos: clave → SRI (oficial) → parser → MongoDB.
 *
 *   encolarClaves()          las fuentes (TXT, clave suelta, IMAP, …) dejan claves en la cola
 *   registrarComprobante()   guarda un XML autorizado; la clave única de MongoDB impide duplicados
 *   ejecutarSincronizacion() procesa la cola por lotes con candado (una sola ejecución a la vez),
 *                            reintentos espaciados para errores transitorios y bitácora con contadores
 */
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import { extraerClavesAcceso } from '../../../utils/claveAcceso.ts';
import { esTransitorio } from './sri.authorization.ts';
import type { ResultadoAutorizacion } from './sri.authorization.ts';
import { procesarLote } from './sri.batch.ts';
import { parsearComprobante } from './sri.parser.ts';
import { COL, aDocumento, esDuplicado, fechaDeClave } from './sri.model.ts';
import type { ClavePendienteDoc, ComprobanteDoc, ConfiguracionDoc, Fuente, SincronizacionDoc } from './sri.model.ts';

export const rucEmpresa = () => (process.env.EMPRESA_RUC || '').replace(/\D/g, '');

/** Una ejecución con candado de más de este tiempo se considera colgada (p. ej. se cortó la luz) */
const CANDADO_VENCE_MS = 30 * 60 * 1000;
/** Máximo de intentos para errores transitorios antes de marcar la clave como fallida */
const MAX_INTENTOS = 6;
const MAX_DETALLE_ERRORES = 200;

// ------------------------------------------------------------------ cola
export interface ResultadoEncolar {
  recibidas: number;
  encoladas: number;
  yaEnCola: number;
  yaRegistradas: number;
  invalidas: string[];
  /** Claves FALLIDAS que se vuelven a intentar porque se cargaron de nuevo */
  reactivadas: number;
}

/** Acepta texto libre (reporte TXT, claves pegadas, lector de códigos de barras) o una lista de claves */
export async function encolarClaves(db: Db, entrada: string | string[], fuente: Fuente): Promise<ResultadoEncolar> {
  const { validas, invalidas } = extraerClavesAcceso(Array.isArray(entrada) ? entrada.join('\n') : entrada);
  const res: ResultadoEncolar = { recibidas: validas.length, encoladas: 0, yaEnCola: 0, yaRegistradas: 0, invalidas, reactivadas: 0 };
  if (!validas.length) return res;

  const registradas = new Set(
    (await db.collection<ComprobanteDoc>(COL.comprobantes).find({ claveAcceso: { $in: validas } }, { projection: { claveAcceso: 1 } }).toArray()).map(d => d.claveAcceso)
  );
  res.yaRegistradas = registradas.size;
  const nuevas = validas.filter(c => !registradas.has(c));
  if (!nuevas.length) return res;

  const ahora = new Date();
  const pendientes = db.collection<ClavePendienteDoc>(COL.pendientes);
  const bulk = await pendientes.bulkWrite(
    nuevas.map(claveAcceso => ({
      updateOne: {
        filter: { claveAcceso },
        update: {
          $setOnInsert: {
            claveAcceso,
            tipo: claveAcceso.slice(8, 10),
            fechaEmision: fechaDeClave(claveAcceso),
            fuente,
            estado: 'PENDIENTE' as const,
            intentos: 0,
            proximoIntento: null,
            creadoEn: ahora,
            actualizadoEn: ahora,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  res.encoladas = bulk.upsertedCount;
  res.yaEnCola = nuevas.length - bulk.upsertedCount;

  // Si el usuario vuelve a cargar una clave que había fallado, se le da otra oportunidad
  const re = await pendientes.updateMany(
    { claveAcceso: { $in: nuevas }, estado: 'FALLIDA' },
    { $set: { estado: 'PENDIENTE', intentos: 0, proximoIntento: null, actualizadoEn: ahora } }
  );
  res.reactivadas = re.modifiedCount;
  return res;
}

// ------------------------------------------------------------------ registro
export type ResultadoRegistro =
  | { estado: 'NUEVO'; claveAcceso: string; id: ObjectId; advertencias: string[] }
  | { estado: 'DUPLICADO'; claveAcceso: string }
  | { estado: 'OTRO_RECEPTOR' | 'ERROR'; claveAcceso: string; error: string };

/** Guarda un XML autorizado. La inserción es atómica: si la clave ya existe (E11000) es DUPLICADO. */
export async function registrarComprobante(
  db: Db,
  datos: { xml: string; fuente: Fuente; claveEsperada?: string; numeroAutorizacion?: string; fechaAutorizacion?: string }
): Promise<ResultadoRegistro> {
  const ruc = rucEmpresa();
  const parsed = parsearComprobante(datos.xml, { claveEsperada: datos.claveEsperada, rucEmpresa: ruc || undefined });
  const clave = datos.claveEsperada || (parsed.ok ? parsed.comprobante.claveAcceso : '');
  if (!parsed.ok) return { estado: 'ERROR', claveAcceso: clave, error: parsed.error };
  if (parsed.esParaEmpresa === false) {
    return { estado: 'OTRO_RECEPTOR', claveAcceso: clave, error: `Emitido a ${parsed.comprobante.receptor.identificacion || 'otro receptor'}, no al RUC ${ruc}.` };
  }

  const doc = aDocumento(parsed.comprobante, {
    xmlOriginal: datos.xml,
    fuente: datos.fuente,
    numeroAutorizacion: datos.numeroAutorizacion,
    fechaAutorizacion: datos.fechaAutorizacion,
    esParaEmpresa: parsed.esParaEmpresa,
  });
  try {
    const r = await db.collection<ComprobanteDoc>(COL.comprobantes).insertOne(doc);
    await db.collection<ClavePendienteDoc>(COL.pendientes).updateOne(
      { claveAcceso: clave },
      { $set: { estado: 'PROCESADA', proximoIntento: null, actualizadoEn: new Date() } }
    );
    return { estado: 'NUEVO', claveAcceso: clave, id: r.insertedId, advertencias: doc.advertencias };
  } catch (err: any) {
    if (esDuplicado(err)) {
      await db.collection<ClavePendienteDoc>(COL.pendientes).updateOne({ claveAcceso: clave }, { $set: { estado: 'PROCESADA', actualizadoEn: new Date() } });
      return { estado: 'DUPLICADO', claveAcceso: clave };
    }
    // 121 = no cumple la validación de esquema
    const msg = err?.code === 121 ? 'El documento no cumple la estructura requerida por la base de datos.' : `Error al guardar: ${err?.message || err}`;
    return { estado: 'ERROR', claveAcceso: clave, error: msg };
  }
}

// ------------------------------------------------------------------ ejecución
export interface OpcionesSincronizacion {
  desde?: Date | null;
  hasta?: Date | null;
  disparador?: 'MANUAL' | 'AUTOMATICA';
  signal?: AbortSignal;
  concurrencia?: number;
  /** Máximo de claves por ejecución */
  limite?: number;
  /** Para pruebas: reemplaza fetch del cliente SOAP */
  fetchImpl?: typeof fetch;
  esperaBaseMs?: number;
  /** Se llama apenas se toma el candado y se crea la bitácora (permite responder 202 sin esperar el final) */
  alIniciar?: (idEjecucion: ObjectId) => void;
}

export type ResultadoSincronizacion =
  | { ok: true; ejecucion: SincronizacionDoc & { _id: ObjectId } }
  | { ok: false; ocupado: true; idEjecucion: string; desde: Date };

const backoffMinutos = (intentos: number) => Math.min(60, 5 * 2 ** Math.max(0, intentos - 1));

export async function ejecutarSincronizacion(db: Db, opciones: OpcionesSincronizacion = {}): Promise<ResultadoSincronizacion> {
  const config = db.collection<ConfiguracionDoc>(COL.configuracion);
  const runs = db.collection<SincronizacionDoc>(COL.sincronizaciones);
  const pendientes = db.collection<ClavePendienteDoc>(COL.pendientes);
  const idEjecucion = new ObjectId();
  const ahora = new Date();

  // ---- candado: una sola sincronización a la vez (aunque se pulse el botón dos veces o coincida con la automática)
  const tomado = await config.findOneAndUpdate(
    { _id: 'principal', $or: [{ candado: null }, { 'candado.desde': { $lt: new Date(ahora.getTime() - CANDADO_VENCE_MS) } }] },
    { $set: { candado: { idEjecucion, desde: ahora }, actualizadoEn: ahora } },
    { returnDocument: 'after' }
  );
  if (!tomado) {
    const actual = await config.findOne({ _id: 'principal' });
    return { ok: false, ocupado: true, idEjecucion: String(actual?.candado?.idEjecucion ?? ''), desde: actual?.candado?.desde ?? ahora };
  }

  const run: SincronizacionDoc & { _id: ObjectId } = {
    _id: idEjecucion,
    inicio: ahora,
    fin: null,
    estado: 'EN_CURSO',
    disparador: opciones.disparador || 'MANUAL',
    rango: { desde: opciones.desde ?? null, hasta: opciones.hasta ?? null },
    encontrados: 0,
    procesados: 0,
    nuevos: 0,
    duplicados: 0,
    errores: 0,
    detalleErrores: [],
  };
  await runs.insertOne(run);
  opciones.alIniciar?.(idEjecucion);

  const anotarError = async (claveAcceso: string, tipo: string, mensaje: string) =>
    runs.updateOne(
      { _id: idEjecucion },
      { $inc: { errores: 1, procesados: 1 }, $push: { detalleErrores: { $each: [{ claveAcceso, tipo, mensaje }], $slice: -MAX_DETALLE_ERRORES } } }
    );

  try {
    const filtro: Record<string, unknown> = {
      estado: 'PENDIENTE',
      $or: [{ proximoIntento: null }, { proximoIntento: { $lte: ahora } }],
    };
    if (opciones.desde || opciones.hasta) {
      filtro.fechaEmision = { ...(opciones.desde ? { $gte: opciones.desde } : {}), ...(opciones.hasta ? { $lte: opciones.hasta } : {}) };
    }
    const claves = (await pendientes.find(filtro, { projection: { claveAcceso: 1 } }).sort({ fechaEmision: 1 }).limit(opciones.limite ?? 5000).toArray()).map(p => p.claveAcceso);
    await runs.updateOne({ _id: idEjecucion }, { $set: { encontrados: claves.length } });

    const previos = new Map(
      (await pendientes.find({ claveAcceso: { $in: claves } }, { projection: { claveAcceso: 1, intentos: 1, fuente: 1 } }).toArray()).map(p => [
        p.claveAcceso,
        { intentos: p.intentos, fuente: p.fuente },
      ])
    );

    const alResultado = async (r: ResultadoAutorizacion) => {
      if (r.ok) {
        const reg = await registrarComprobante(db, {
          xml: r.autorizacionXml,
          fuente: previos.get(r.claveAcceso)?.fuente ?? 'CLAVE',
          claveEsperada: r.claveAcceso,
          numeroAutorizacion: r.numeroAutorizacion,
          fechaAutorizacion: r.fechaAutorizacion,
        });
        if (reg.estado === 'NUEVO') await runs.updateOne({ _id: idEjecucion }, { $inc: { nuevos: 1, procesados: 1 } });
        else if (reg.estado === 'DUPLICADO') await runs.updateOne({ _id: idEjecucion }, { $inc: { duplicados: 1, procesados: 1 } });
        else {
          await pendientes.updateOne(
            { claveAcceso: r.claveAcceso },
            { $set: { estado: 'FALLIDA', proximoIntento: null, ultimoError: { tipo: reg.estado, mensaje: reg.error, en: new Date() }, actualizadoEn: new Date() } }
          );
          await anotarError(r.claveAcceso, reg.estado, reg.error);
        }
        return;
      }

      const intentos = (previos.get(r.claveAcceso)?.intentos ?? 0) + 1;
      const reintentar = esTransitorio(r.error) && intentos < MAX_INTENTOS;
      await pendientes.updateOne(
        { claveAcceso: r.claveAcceso },
        {
          $set: {
            estado: reintentar ? 'PENDIENTE' : 'FALLIDA',
            intentos,
            proximoIntento: reintentar ? new Date(Date.now() + backoffMinutos(intentos) * 60000) : null,
            ultimoError: { tipo: r.error, mensaje: r.mensaje, en: new Date() },
            actualizadoEn: new Date(),
          },
        }
      );
      await anotarError(r.claveAcceso, r.error, reintentar ? `${r.mensaje} Se reintentará automáticamente.` : r.mensaje);
    };

    const lote = await procesarLote(claves, {
      concurrencia: opciones.concurrencia,
      signal: opciones.signal,
      fetchImpl: opciones.fetchImpl,
      esperaBaseMs: opciones.esperaBaseMs,
      onResultado: alResultado,
    });

    await runs.updateOne(
      { _id: idEjecucion },
      { $set: { fin: new Date(), estado: lote.cancelado ? 'CANCELADA' : 'COMPLETADA', mensaje: lote.cancelado ? 'Sincronización cancelada; las claves restantes siguen en la cola.' : undefined } }
    );
  } catch (err: any) {
    await runs.updateOne({ _id: idEjecucion }, { $set: { fin: new Date(), estado: 'FALLIDA', mensaje: err?.message || String(err) } });
  } finally {
    // Se libera solo si el candado sigue siendo de esta ejecución
    await config.updateOne({ _id: 'principal', 'candado.idEjecucion': idEjecucion }, { $set: { candado: null, actualizadoEn: new Date() } });
  }

  return { ok: true, ejecucion: (await runs.findOne({ _id: idEjecucion }))! as SincronizacionDoc & { _id: ObjectId } };
}

// ------------------------------------------------------------------ consultas de estado
export async function estadoSincronizacion(db: Db) {
  const [config, ultima, enCola, fallidas] = await Promise.all([
    db.collection<ConfiguracionDoc>(COL.configuracion).findOne({ _id: 'principal' }),
    db.collection<SincronizacionDoc>(COL.sincronizaciones).find().sort({ inicio: -1 }).limit(1).next(),
    db.collection<ClavePendienteDoc>(COL.pendientes).countDocuments({ estado: 'PENDIENTE' }),
    db.collection<ClavePendienteDoc>(COL.pendientes).countDocuments({ estado: 'FALLIDA' }),
  ]);
  return {
    enCurso: Boolean(config?.candado),
    ultima,
    cola: { pendientes: enCola, fallidas },
    automatica: config?.automatica ?? null,
  };
}
