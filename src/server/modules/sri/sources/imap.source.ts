/**
 * Fuente IMAP: lee el buzón donde los proveedores envían sus comprobantes electrónicos.
 *
 * Por normativa, el emisor debe entregar el XML autorizado al comprador (normalmente por correo).
 * Esta fuente lee los mensajes NUEVOS (por UID), extrae:
 *   - la clave de acceso de cada XML adjunto
 *   - claves de 49 dígitos escritas en el asunto o el cuerpo
 * y las pone en la cola. La sincronización luego descarga el XML OFICIAL del SRI por cada clave,
 * así que un adjunto alterado nunca llega a la base de datos.
 *
 * El buzón se abre en SOLO LECTURA: no se marcan, mueven ni borran correos.
 */
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { Db } from 'mongodb';
import { extraerClavesAcceso } from '../../../../utils/claveAcceso.ts';
import { descifrar } from '../../../security/cifrado.ts';
import { parsearComprobante } from '../sri.parser.ts';
import { COL } from '../sri.model.ts';
import type { ConfigCorreo, ConfiguracionDoc } from '../sri.model.ts';
import { encolarClaves } from '../sri.sync.ts';

const MAX_MENSAJES_POR_LECTURA = 500;
const MAX_ADJUNTO = 5 * 1024 * 1024;

export interface ResultadoMensaje {
  claves: string[];
  xmls: number;
  /** Adjuntos que no son XML de comprobante (PDF del RIDE, imágenes, ZIP…) */
  ignorados: number;
}

const esXml = (nombre = '', tipo = '') => /\.xml$/i.test(nombre) || /(^|\/)(xml|.+\+xml)$/i.test(tipo);

/** Procesa un mensaje en formato RFC 822 (función pura: no toca la red ni la base) */
export async function procesarMensaje(fuente: Buffer | string): Promise<ResultadoMensaje> {
  const mail = await simpleParser(fuente, { skipImageLinks: true, skipTextToHtml: true });
  const claves = new Set<string>();
  let xmls = 0;
  let ignorados = 0;

  for (const a of mail.attachments || []) {
    if (!esXml(a.filename, a.contentType) || a.size > MAX_ADJUNTO) {
      ignorados++;
      continue;
    }
    const contenido = a.content.toString('utf8');
    const r = parsearComprobante(contenido);
    if (r.ok) {
      claves.add(r.comprobante.claveAcceso);
      xmls++;
    } else {
      // XML que no se pudo interpretar: se intenta al menos rescatar la clave
      const m = /<claveAcceso>\s*(\d{49})\s*<\/claveAcceso>/.exec(contenido);
      if (m) {
        claves.add(m[1]);
        xmls++;
      } else ignorados++;
    }
  }

  // Claves escritas en el asunto o el cuerpo (muchos sistemas las incluyen en el texto del correo)
  const html = typeof mail.html === 'string' ? mail.html.replace(/<[^>]+>/g, ' ') : '';
  for (const c of extraerClavesAcceso(`${mail.subject || ''}\n${mail.text || ''}\n${html}`).validas) claves.add(c);

  return { claves: [...claves], xmls, ignorados };
}

export interface DatosConexion {
  host: string;
  puerto: number;
  seguro: boolean;
  usuario: string;
  contrasena: string;
}

const cliente = (c: DatosConexion) =>
  new ImapFlow({
    host: c.host,
    port: c.puerto,
    secure: c.seguro,
    auth: { user: c.usuario, pass: c.contrasena },
    logger: false, // los logs de imapflow podrían incluir datos de la sesión
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 60000,
  });

/** Mensaje de error sin datos sensibles */
const mensajeError = (err: any): string => {
  const txt = String(err?.responseText || err?.message || err);
  if (err?.authenticationFailed || /AUTHENTICATIONFAILED|Invalid credentials|auth/i.test(txt)) {
    return 'Usuario o contraseña del correo incorrectos. En Gmail/Outlook use una "contraseña de aplicación" e IMAP habilitado.';
  }
  if (/ENOTFOUND|EAI_AGAIN/.test(txt)) return 'No se encontró el servidor de correo (revise el host o la conexión a internet).';
  if (/ECONNREFUSED|ETIMEDOUT|timeout/i.test(txt)) return 'El servidor de correo no respondió (revise host, puerto y seguridad TLS).';
  if (/Mailbox doesn't exist|NONEXISTENT/i.test(txt)) return 'La carpeta indicada no existe en el buzón.';
  return `Error de correo: ${txt.slice(0, 200)}`;
};

/** Prueba de conexión (botón "Probar") */
export async function probarConexion(c: DatosConexion & { carpeta: string }): Promise<{ ok: true; mensajes: number } | { ok: false; error: string }> {
  const client = cliente(c);
  client.on('error', () => {});
  try {
    await client.connect();
    const box = await client.mailboxOpen(c.carpeta || 'INBOX', { readOnly: true });
    return { ok: true, mensajes: box.exists };
  } catch (err) {
    return { ok: false, error: mensajeError(err) };
  } finally {
    await client.logout().catch(() => {});
  }
}

export interface ResultadoLectura {
  omitido?: string;
  mensajes: number;
  xmls: number;
  claves: number;
  encoladas: number;
  yaRegistradas: number;
  error?: string;
}

/** Lee los correos nuevos y encola sus claves. Nunca lanza: devuelve el error en el resultado. */
export async function leerCorreo(db: Db, opciones: { signal?: AbortSignal } = {}): Promise<ResultadoLectura> {
  const configCol = db.collection<ConfiguracionDoc>(COL.configuracion);
  const cfg = (await configCol.findOne({ _id: 'principal' }))?.correo as ConfigCorreo | null | undefined;
  const vacio: ResultadoLectura = { mensajes: 0, xmls: 0, claves: 0, encoladas: 0, yaRegistradas: 0 };
  if (!cfg?.activo) return { ...vacio, omitido: 'El buzón de correo no está configurado o está desactivado.' };

  let contrasena: string;
  try {
    contrasena = descifrar(cfg.contrasenaCifrada);
  } catch (err) {
    const error = (err as Error).message;
    await configCol.updateOne({ _id: 'principal' }, { $set: { 'correo.ultimoError': error, actualizadoEn: new Date() } });
    return { ...vacio, error };
  }

  const client = cliente({ ...cfg, contrasena });
  client.on('error', () => {});
  const res: ResultadoLectura = { ...vacio };
  let ultimoUid = cfg.ultimoUid || 0;
  try {
    await client.connect();
    const box = await client.mailboxOpen(cfg.carpeta || 'INBOX', { readOnly: true });
    // Si el servidor reinició la numeración de la carpeta, se vuelve a empezar por fecha
    const validity = String(box.uidValidity);
    if (cfg.uidValidity && cfg.uidValidity !== validity) ultimoUid = 0;

    const criterio = ultimoUid > 0 ? { uid: `${ultimoUid + 1}:*` } : { since: new Date(Date.now() - (cfg.diasAtras || 30) * 86400000) };
    const uids = ((await client.search(criterio, { uid: true })) || []).filter(u => u > ultimoUid).sort((a, b) => a - b).slice(-MAX_MENSAJES_POR_LECTURA);

    const claves = new Set<string>();
    if (uids.length) {
      for await (const msg of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
        if (opciones.signal?.aborted) break;
        res.mensajes++;
        if (msg.source) {
          try {
            const r = await procesarMensaje(msg.source);
            r.claves.forEach(c => claves.add(c));
            res.xmls += r.xmls;
          } catch {
            /* un mensaje dañado no detiene la lectura */
          }
        }
        ultimoUid = Math.max(ultimoUid, msg.uid);
      }
    }
    res.claves = claves.size;
    if (claves.size) {
      const e = await encolarClaves(db, [...claves], 'IMAP');
      res.encoladas = e.encoladas + e.reactivadas;
      res.yaRegistradas = e.yaRegistradas;
    }
    await configCol.updateOne(
      { _id: 'principal' },
      {
        $set: {
          'correo.ultimoUid': ultimoUid,
          'correo.uidValidity': validity,
          'correo.ultimaLectura': new Date(),
          'correo.ultimoResultado': { mensajes: res.mensajes, xmls: res.xmls, claves: res.claves, encoladas: res.encoladas, yaRegistradas: res.yaRegistradas },
          'correo.ultimoError': null,
          actualizadoEn: new Date(),
        },
      }
    );
    console.log(`[SRI] Correo leído: ${res.mensajes} mensajes nuevos, ${res.xmls} XML, ${res.claves} claves (${res.encoladas} a la cola)`);
  } catch (err) {
    res.error = mensajeError(err);
    await configCol.updateOne({ _id: 'principal' }, { $set: { 'correo.ultimoError': res.error, 'correo.ultimaLectura': new Date(), actualizadoEn: new Date() } });
    console.warn(`[SRI] No se pudo leer el correo: ${res.error}`);
  } finally {
    await client.logout().catch(() => {});
  }
  return res;
}
