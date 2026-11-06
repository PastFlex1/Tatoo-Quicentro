/**
 * Conexión única a MongoDB (solo Node).
 *
 *   MONGODB_URI=mongodb://127.0.0.1:27017/tatoo_quicentro   (predeterminado si no está en .env)
 *
 * - Una sola instancia de MongoClient compartida (el driver mantiene su propio pool).
 * - Si MongoDB no está disponible, getDb() falla rápido (3 s) con un mensaje claro y el
 *   siguiente intento vuelve a conectar.
 * - La contraseña de la URI nunca se escribe en los logs.
 */
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';

const URI_PREDETERMINADA = 'mongodb://127.0.0.1:27017/tatoo_quicentro';

let client: MongoClient | null = null;
let conectando: Promise<Db> | null = null;

export const mongoUri = () => process.env.MONGODB_URI || URI_PREDETERMINADA;

/** URI sin credenciales, para mostrar en logs */
export const uriSegura = (uri = mongoUri()) => uri.replace(/\/\/([^@/]+)@/, '//***@');

const nombreBase = (uri: string) => {
  const m = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(uri);
  return m?.[1] || 'tatoo_quicentro';
};

export async function getDb(): Promise<Db> {
  if (client) return client.db(nombreBase(mongoUri()));
  if (conectando) return conectando;

  conectando = (async () => {
    const uri = mongoUri();
    const c = new MongoClient(uri, {
      appName: 'tatoo-quicentro-sri',
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    try {
      await c.connect();
      await c.db('admin').command({ ping: 1 });
      client = c;
      console.log(`[MongoDB] Conectado a ${uriSegura(uri)}`);
      return c.db(nombreBase(uri));
    } catch (err: any) {
      await c.close().catch(() => {});
      throw new Error(`No se pudo conectar a MongoDB (${uriSegura(uri)}): ${err?.message || err}. ¿Está iniciado el servicio "MongoDB" de Windows?`);
    } finally {
      conectando = null;
    }
  })();
  return conectando;
}

export async function cerrarMongo() {
  const c = client;
  client = null;
  if (c) await c.close();
}

/** true si MongoDB responde (para /estado y diagnósticos) */
export async function mongoDisponible(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
