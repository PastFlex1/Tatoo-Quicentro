/**
 * Parser de comprobantes electrónicos del SRI (solo Node).
 *
 *   parsearComprobante(xml, { claveEsperada?, rucEmpresa? })
 *
 * Acepta el XML del comprobante solo (<factura>, <notaCredito>, …) o envuelto en <autorizacion>
 * (como lo devuelve sri.authorization o lo envían los proveedores). Identifica el tipo, extrae los datos
 * y valida que sea coherente:
 *   ERRORES (el documento no se acepta): XML mal formado, tipo desconocido, clave inválida, el tipo o el
 *     RUC del emisor no coinciden con la clave, la clave no es la esperada, no está AUTORIZADO.
 *   ADVERTENCIAS (se acepta pero se informa): totales que no cuadran, comprador distinto de la empresa.
 *
 * fast-xml-parser no resuelve entidades externas (sin riesgo de XXE). Límite de tamaño: 5 MB.
 */
import { XMLParser } from 'fast-xml-parser';
import { validarClaveAcceso } from '../../../utils/claveAcceso.ts';
import { TIPOS_COMPROBANTE } from './sri.types.ts';
import type { CodigoComprobante, ComprobanteParseado } from './sri.types.ts';
import { r2, txt } from './parsers/comun.ts';
import type { Nodo } from './parsers/comun.ts';
import { parseFactura, parseLiquidacionCompra } from './parsers/factura.ts';
import { parseNotaCredito, parseNotaDebito } from './parsers/notas.ts';
import { parseRetencion } from './parsers/retencion.ts';
import { parseGuiaRemision } from './parsers/guiaRemision.ts';

const MAX_XML = 5 * 1024 * 1024;

const PARSERS: Record<CodigoComprobante, (raiz: Nodo) => Omit<ComprobanteParseado, 'autorizacion' | 'advertencias'>> = {
  '01': parseFactura,
  '03': parseLiquidacionCompra,
  '04': parseNotaCredito,
  '05': parseNotaDebito,
  '06': parseGuiaRemision,
  '07': parseRetencion,
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  // Todo como texto: secuenciales "000012345" y claves de 49 dígitos no deben convertirse a número
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
});

export interface OpcionesParser {
  /** Si se indica, el XML debe ser de esta clave de acceso */
  claveEsperada?: string;
  /** RUC de la empresa: si el comprador no coincide se agrega una advertencia y esParaEmpresa = false */
  rucEmpresa?: string;
}

export type ResultadoParser =
  | { ok: true; comprobante: ComprobanteParseado; esParaEmpresa: boolean | null }
  | { ok: false; error: string };

const leer = (xml: string): Nodo | null => {
  try {
    const o = xmlParser.parse(xml, true);
    return o && typeof o === 'object' ? o : null;
  } catch {
    // con validación activada lanza si el XML está mal formado
    return null;
  }
};

export function parsearComprobante(xmlEntrada: string, opciones: OpcionesParser = {}): ResultadoParser {
  if (!xmlEntrada || typeof xmlEntrada !== 'string') return { ok: false, error: 'El XML está vacío.' };
  if (xmlEntrada.length > MAX_XML) return { ok: false, error: 'El XML supera 5 MB.' };

  // Quita BOM y espacios iniciales
  let xml = xmlEntrada.replace(/^﻿/, '').trim();
  let doc = leer(xml);
  if (!doc) return { ok: false, error: 'El XML está mal formado.' };

  // ---------------------------------------------------------------- envoltorio <autorizacion>
  let autorizacion: ComprobanteParseado['autorizacion'];
  const aut: Nodo | undefined = doc.autorizacion;
  if (aut && !Object.values(TIPOS_COMPROBANTE).some(t => doc![t.raiz])) {
    autorizacion = { estado: txt(aut.estado), numero: txt(aut.numeroAutorizacion), fecha: txt(aut.fechaAutorizacion) };
    if (autorizacion.estado.toUpperCase() !== 'AUTORIZADO') {
      return { ok: false, error: `El comprobante no está autorizado (estado: ${autorizacion.estado || 'desconocido'}).` };
    }
    xml = txt(aut.comprobante);
    if (!xml) return { ok: false, error: 'El <autorizacion> no contiene el <comprobante>.' };
    doc = leer(xml);
    if (!doc) return { ok: false, error: 'El comprobante dentro de <autorizacion> está mal formado.' };
  }

  // ---------------------------------------------------------------- tipo
  const entrada = (Object.entries(TIPOS_COMPROBANTE) as [CodigoComprobante, { raiz: string }][]).find(([, t]) => doc![t.raiz]);
  if (!entrada) {
    const raiz = Object.keys(doc)[0] || 'desconocida';
    return { ok: false, error: `Tipo de comprobante no reconocido (raíz <${raiz}>).` };
  }
  const [tipo, { raiz }] = entrada;
  const base = PARSERS[tipo](doc[raiz] as Nodo);

  // ---------------------------------------------------------------- validaciones bloqueantes
  const clave = base.claveAcceso;
  const errClave = validarClaveAcceso(clave);
  if (errClave) return { ok: false, error: `Clave de acceso del XML: ${errClave}` };
  if (clave.slice(8, 10) !== tipo) return { ok: false, error: `La clave de acceso indica tipo ${clave.slice(8, 10)} pero el XML es ${TIPOS_COMPROBANTE[tipo].nombre}.` };
  if (base.emisor.identificacion !== clave.slice(10, 23)) return { ok: false, error: 'El RUC del emisor no coincide con el de la clave de acceso.' };
  if (opciones.claveEsperada && opciones.claveEsperada !== clave) return { ok: false, error: 'El XML no corresponde a la clave de acceso consultada.' };
  if (!base.fechaEmision || !/^\d{4}-\d{2}-\d{2}$/.test(base.fechaEmision)) return { ok: false, error: 'El XML no tiene una fecha de emisión válida.' };

  // ---------------------------------------------------------------- advertencias
  const advertencias: string[] = [];
  const t = base.totales;
  const tolerancia = 0.05;
  if (tipo === '01' || tipo === '03' || tipo === '04' || tipo === '05') {
    const calculado = r2(t.subtotalSinImpuestos + t.iva + t.ice + t.irbpnr + t.propina);
    if (Math.abs(calculado - t.total) > tolerancia) {
      advertencias.push(`Los totales no cuadran: subtotal + impuestos = ${calculado.toFixed(2)}, total del XML = ${t.total.toFixed(2)}.`);
    }
    const bases = r2(t.base15 + t.base12 + t.base5 + t.baseOtrasTarifas + t.base0 + t.noObjeto + t.exento);
    if (base.impuestos.length && Math.abs(bases - t.subtotalSinImpuestos) > tolerancia) {
      advertencias.push(`La suma de bases imponibles (${bases.toFixed(2)}) difiere del subtotal sin impuestos (${t.subtotalSinImpuestos.toFixed(2)}).`);
    }
  }
  if (tipo === '07' && !base.retenciones?.length) advertencias.push('El comprobante de retención no tiene retenciones.');
  if ((tipo === '01' || tipo === '03' || tipo === '04') && base.detalles.length === 0) advertencias.push('El comprobante no tiene detalle de productos o servicios.');

  let esParaEmpresa: boolean | null = null;
  const rucEmpresa = (opciones.rucEmpresa || '').replace(/\D/g, '');
  if (rucEmpresa) {
    const receptor = base.receptor.identificacion.replace(/\D/g, '');
    // La guía puede tener varios destinatarios
    const ids = tipo === '06' ? (base.destinatarios || []).map(d => d.identificacion.replace(/\D/g, '')) : [receptor];
    esParaEmpresa = ids.includes(rucEmpresa);
    if (!esParaEmpresa) advertencias.push(`El comprobante fue emitido a ${base.receptor.identificacion || 'otro receptor'}, no al RUC de la empresa (${rucEmpresa}).`);
  }

  return { ok: true, comprobante: { ...base, autorizacion, advertencias }, esParaEmpresa };
}
