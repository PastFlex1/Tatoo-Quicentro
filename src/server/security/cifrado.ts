/**
 * Cifrado de credenciales guardadas en MongoDB (p. ej. la contraseña del buzón de correo).
 *
 *   SRI_SECRET_KEY=<frase larga y aleatoria>   (en el .env; si se pierde, hay que volver a ingresar la contraseña)
 *
 * AES-256-GCM: confidencialidad + integridad (si alguien altera el texto cifrado, descifrar falla).
 * La llave de 32 bytes se deriva de SRI_SECRET_KEY con scrypt y una sal aleatoria por valor.
 * Formato guardado: "v1:<sal>:<iv>:<tag>:<cifrado>" (base64). Nunca se escribe el texto plano en logs.
 */
import crypto from 'crypto';

const VERSION = 'v1';

export const cifradoDisponible = () => (process.env.SRI_SECRET_KEY || '').length >= 16;

function llave(sal: Buffer): Buffer {
  const secreto = process.env.SRI_SECRET_KEY || '';
  if (secreto.length < 16) {
    throw new Error('Defina SRI_SECRET_KEY en el archivo .env (mínimo 16 caracteres) para guardar credenciales de forma segura.');
  }
  return crypto.scryptSync(secreto, sal, 32, { N: 16384, r: 8, p: 1 });
}

export function cifrar(texto: string): string {
  const sal = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', llave(sal), iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, sal, iv, tag, cifrado].map(x => (typeof x === 'string' ? x : x.toString('base64'))).join(':');
}

export function descifrar(valor: string): string {
  const partes = valor.split(':');
  if (partes.length !== 5 || partes[0] !== VERSION) throw new Error('Credencial guardada con un formato desconocido.');
  const [, sal, iv, tag, cifrado] = partes.map((p, i) => (i === 0 ? Buffer.alloc(0) : Buffer.from(p, 'base64')));
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', llave(sal), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8');
  } catch (err) {
    if (err instanceof Error && err.message.includes('SRI_SECRET_KEY')) throw err;
    throw new Error('No se pudo descifrar la credencial: SRI_SECRET_KEY cambió o el dato fue alterado. Vuelva a ingresar la contraseña.');
  }
}
