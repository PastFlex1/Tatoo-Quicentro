/**
 * Cliente del servicio web OFICIAL del SRI: AutorizacionComprobantesOffline (SOAP).
 *
 *   Producción: https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
 *   Pruebas:    https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
 *
 * Operación `autorizacionComprobante(claveAccesoComprobante)`: es pública (sin usuario, clave ni captcha)
 * y devuelve el estado, número y fecha de autorización y el XML del comprobante.
 *
 * Errores clasificados para decidir si se reintenta:
 *   CLAVE_INVALIDA · NO_EXISTE · NO_AUTORIZADO   → definitivos (no se reintenta)
 *   TIMEOUT · RED · SRI_ERROR                    → transitorios (se reintenta con espera creciente)
 *
 * Solo Node (usa fetch nativo de Node 18+). Sin dependencias.
 */
import { describirClaveAcceso, validarClaveAcceso } from '../../../utils/claveAcceso.ts';

const WS_PATH = '/comprobantes-electronicos-ws/AutorizacionComprobantesOffline';
const HOSTS = { '1': 'https://celcer.sri.gob.ec', '2': 'https://cel.sri.gob.ec' } as const;

export type ErrorAutorizacion = 'CLAVE_INVALIDA' | 'NO_EXISTE' | 'NO_AUTORIZADO' | 'TIMEOUT' | 'RED' | 'SRI_ERROR';

const TRANSITORIOS: ErrorAutorizacion[] = ['TIMEOUT', 'RED', 'SRI_ERROR'];
export const esTransitorio = (e?: ErrorAutorizacion) => !!e && TRANSITORIOS.includes(e);

export interface MensajeSri {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo?: string;
}

export interface AutorizacionOk {
  ok: true;
  claveAcceso: string;
  estado: 'AUTORIZADO';
  numeroAutorizacion: string;
  fechaAutorizacion: string;
  ambiente: 'PRUEBAS' | 'PRODUCCION';
  /** XML del comprobante tal como lo autorizó el SRI (<factura>, <notaCredito>, …) */
  comprobanteXml: string;
  /** <autorizacion> completo, el formato estándar que se entrega al comprador */
  autorizacionXml: string;
  intentos: number;
}

export interface AutorizacionError {
  ok: false;
  claveAcceso: string;
  error: ErrorAutorizacion;
  mensaje: string;
  estado?: string;
  mensajesSri?: MensajeSri[];
  intentos: number;
}

export type ResultadoAutorizacion = AutorizacionOk | AutorizacionError;

export interface OpcionesAutorizacion {
  /** Tiempo máximo por intento (ms). Predeterminado: 20 000 */
  timeoutMs?: number;
  /** Reintentos adicionales ante errores transitorios. Predeterminado: 3 */
  reintentos?: number;
  /** Espera base entre reintentos (ms); se duplica en cada intento. Predeterminado: 2 000 */
  esperaBaseMs?: number;
  signal?: AbortSignal;
  /** Para pruebas: reemplaza fetch */
  fetchImpl?: typeof fetch;
}

// ------------------------------------------------------------------ lectura del sobre SOAP
const tag = (xml: string, name: string) =>
  new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`).exec(xml)?.[1]?.trim() ?? '';

const allTags = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`, 'g'))].map(m => m[1]);

/** El SRI devuelve el comprobante como CDATA o con entidades escapadas */
const desenvolver = (s: string) => {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/.exec(s);
  if (cdata) return cdata[1].trim();
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#13;/g, '')
    .replace(/&amp;/g, '&')
    .trim();
};

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * El SRI anida <mensaje> dentro de <mensaje>:
 *   <mensajes><mensaje><identificador>43</identificador><mensaje>CLAVE ACCESO REGISTRADA</mensaje>
 *   <informacionAdicional>…</informacionAdicional><tipo>ERROR</tipo></mensaje></mensajes>
 * por eso se lee cada mensaje a partir de su <identificador>.
 */
const leerMensajes = (bloque: string): MensajeSri[] =>
  [
    ...bloque.matchAll(
      /<(?:[\w-]+:)?identificador>([\s\S]*?)<\/(?:[\w-]+:)?identificador>\s*<(?:[\w-]+:)?mensaje>([\s\S]*?)<\/(?:[\w-]+:)?mensaje>(?:\s*<(?:[\w-]+:)?informacionAdicional>([\s\S]*?)<\/(?:[\w-]+:)?informacionAdicional>)?(?:\s*<(?:[\w-]+:)?tipo>([\s\S]*?)<\/(?:[\w-]+:)?tipo>)?/g
    ),
  ].map(m => ({
    identificador: m[1].trim(),
    mensaje: desenvolver(m[2]),
    informacionAdicional: m[3] ? desenvolver(m[3]) : undefined,
    tipo: m[4]?.trim() || undefined,
  }));

/** Interpreta la respuesta SOAP (exportado para pruebas sin red) */
export function interpretarRespuesta(clave: string, soap: string, intentos = 1): ResultadoAutorizacion {
  if (/<(?:\w+:)?Fault>/.test(soap)) {
    return { ok: false, claveAcceso: clave, error: 'SRI_ERROR', mensaje: `El SRI devolvió un error: ${tag(soap, 'faultstring') || 'SOAP Fault'}`, intentos };
  }
  const numero = Number(tag(soap, 'numeroComprobantes') || '0');
  const autorizaciones = allTags(soap, 'autorizacion');
  if (!numero || autorizaciones.length === 0) {
    return { ok: false, claveAcceso: clave, error: 'NO_EXISTE', mensaje: 'El SRI no tiene registrado un comprobante con esa clave de acceso.', intentos };
  }

  // Puede haber varios intentos de autorización; vale el AUTORIZADO
  const aut = autorizaciones.find(a => tag(a, 'estado').toUpperCase() === 'AUTORIZADO');
  if (!aut) {
    const ultima = autorizaciones[autorizaciones.length - 1];
    const estado = tag(ultima, 'estado') || 'DESCONOCIDO';
    const mensajesSri = leerMensajes(ultima);
    return {
      ok: false,
      claveAcceso: clave,
      error: 'NO_AUTORIZADO',
      estado,
      mensajesSri,
      mensaje: `El comprobante está ${estado} en el SRI${mensajesSri[0] ? `: ${mensajesSri[0].mensaje}` : '.'}`,
      intentos,
    };
  }

  const comprobanteXml = desenvolver(tag(aut, 'comprobante'));
  if (!comprobanteXml.includes('<')) {
    return { ok: false, claveAcceso: clave, error: 'SRI_ERROR', mensaje: 'El SRI respondió AUTORIZADO pero sin el XML del comprobante.', intentos };
  }
  if (!comprobanteXml.includes(clave)) {
    return { ok: false, claveAcceso: clave, error: 'SRI_ERROR', mensaje: 'El XML devuelto no corresponde a la clave consultada.', intentos };
  }

  const numeroAutorizacion = tag(aut, 'numeroAutorizacion') || clave;
  const fechaAutorizacion = tag(aut, 'fechaAutorizacion');
  const ambiente = (tag(aut, 'ambiente') || '').toUpperCase().startsWith('PRUEBA') || clave[23] === '1' ? 'PRUEBAS' : 'PRODUCCION';
  const autorizacionXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<autorizacion>' +
    `<estado>AUTORIZADO</estado>` +
    `<numeroAutorizacion>${escapar(numeroAutorizacion)}</numeroAutorizacion>` +
    `<fechaAutorizacion>${escapar(fechaAutorizacion)}</fechaAutorizacion>` +
    `<ambiente>${ambiente === 'PRODUCCION' ? 'PRODUCCIÓN' : 'PRUEBAS'}</ambiente>` +
    `<comprobante><![CDATA[${comprobanteXml.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]></comprobante>` +
    '</autorizacion>';

  return { ok: true, claveAcceso: clave, estado: 'AUTORIZADO', numeroAutorizacion, fechaAutorizacion, ambiente, comprobanteXml, autorizacionXml, intentos };
}

const esperar = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Cancelado'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), reject(new Error('Cancelado'))), { once: true });
  });

async function unIntento(clave: string, opts: Required<Pick<OpcionesAutorizacion, 'timeoutMs'>> & OpcionesAutorizacion, intento: number): Promise<ResultadoAutorizacion> {
  const ambiente = clave[23] === '2' ? '2' : '1';
  const body =
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">' +
    '<soapenv:Header/><soapenv:Body><ec:autorizacionComprobante>' +
    `<claveAccesoComprobante>${clave}</claveAccesoComprobante>` +
    '</ec:autorizacionComprobante></soapenv:Body></soapenv:Envelope>';

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const res = await (opts.fetchImpl || fetch)(`${HOSTS[ambiente]}${WS_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body,
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (res.status >= 500 && !/<(?:\w+:)?autorizacion/.test(text)) {
      return { ok: false, claveAcceso: clave, error: 'SRI_ERROR', mensaje: `El SRI respondió con el código ${res.status}.`, intentos: intento };
    }
    return interpretarRespuesta(clave, text, intento);
  } catch (err: any) {
    if (opts.signal?.aborted) throw new Error('Cancelado');
    const timeout = ctrl.signal.aborted;
    return {
      ok: false,
      claveAcceso: clave,
      error: timeout ? 'TIMEOUT' : 'RED',
      mensaje: timeout ? `El SRI no respondió en ${Math.round(opts.timeoutMs / 1000)} s.` : `No se pudo conectar con el SRI (${err?.cause?.code || err?.code || 'error de red'}).`,
      intentos: intento,
    };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/** Consulta una clave de acceso con validación previa, timeout y reintentos controlados */
export async function consultarAutorizacion(claveRaw: string, opciones: OpcionesAutorizacion = {}): Promise<ResultadoAutorizacion> {
  const clave = String(claveRaw || '').replace(/\s+/g, '');
  const invalida = validarClaveAcceso(clave);
  if (invalida) return { ok: false, claveAcceso: clave, error: 'CLAVE_INVALIDA', mensaje: invalida, intentos: 0 };

  const opts = { timeoutMs: 20000, reintentos: 3, esperaBaseMs: 2000, ...opciones };
  let resultado: ResultadoAutorizacion | null = null;
  for (let intento = 1; intento <= opts.reintentos + 1; intento++) {
    resultado = await unIntento(clave, opts, intento);
    if (resultado.ok || !esTransitorio(resultado.error)) return resultado;
    if (intento <= opts.reintentos) await esperar(opts.esperaBaseMs * 2 ** (intento - 1), opts.signal);
  }
  return resultado!;
}

export { describirClaveAcceso };
