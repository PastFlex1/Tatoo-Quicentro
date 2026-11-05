/**
 * Facturación electrónica real con el SRI a través de la API Java del estudio
 * (proyecto API-SRI, Spring Boot, puerto 8081 por defecto).
 *
 *   POST {api}/api/sri/firmar            { xml, certificadoBase64, password }  → XML firmado XAdES-BES
 *   POST {api}/api/sri/recepcion         { xmlFirmado }                        → SOAP RespuestaRecepcionComprobante
 *   GET  {api}/api/sri/autorizacion/{ca}                                       → SOAP RespuestaAutorizacionComprobante
 *
 * La API decide el endpoint del SRI (pruebas celcer / producción cel) según el <ambiente> del XML.
 */
import { CompanyConfig, CreditNoteRecord, SaleRecord, StudioSettings } from '../types';
import { generateSriClaveAcceso } from '../utils/sriCalculations';

export const DEFAULT_SRI_API_URL = 'http://localhost:8081';

export type SriEmissionStatus = 'AUTORIZADO' | 'RECHAZADO' | 'EN_PROCESO' | 'ERROR';

export interface SriEmissionResult {
  status: SriEmissionStatus;
  authorizationNumber?: string;
  authorizationDate?: string;
  /** XML autorizado devuelto por el SRI (o el firmado si aún no se autoriza) */
  xml?: string;
  messages: string[];
}

// ------------------------------------------------------------------ utilidades

export const escapeXml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Caracteres de control no permitidos en XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const money = (n: number) => (Math.round((n || 0) * 100) / 100).toFixed(2);
const qty = (n: number) => (Math.round((n || 0) * 1e6) / 1e6).toFixed(6);

const pad = (v: string | undefined, len: number, fallback: string) =>
  (v || fallback).replace(/\D/g, '').padStart(len, '0').slice(-len);

const sriDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** 'YYYY-MM-DD' o ISO → 'DD/MM/YYYY' */
const sriDateFromString = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : sriDate(d);
};

const ambienteOf = (s: StudioSettings): '1' | '2' =>
  s.ambiente === '2' || s.ambiente === 'PRODUCCION' ? '2' : '1';

/** Código SRI de porcentaje de IVA (tabla 17 de la ficha técnica) */
export const ivaCodigoPorcentaje = (rate: number): string => {
  const map: Record<number, string> = { 0: '0', 12: '2', 14: '3', 15: '4', 5: '5', 13: '10', 8: '8' };
  return map[Math.round(rate || 0)] ?? '4';
};

const buyerOf = (dni: string | undefined, name: string) => {
  const id = (dni || '').trim().toUpperCase();
  if (!id || /^9{10,13}$/.test(id)) {
    return { tipo: '07', id: '9999999999999', name: 'CONSUMIDOR FINAL' };
  }
  const digits = id.replace(/\D/g, '');
  if (digits.length === 13 && digits === id) return { tipo: '04', id, name: name || 'CLIENTE' };
  if (digits.length === 10 && digits === id) return { tipo: '05', id, name: name || 'CLIENTE' };
  return { tipo: '06', id, name: name || 'CLIENTE' };
};

const rimpeLegend = (s: StudioSettings): string | null => {
  const reg = String(s.regimenTributario || '').toUpperCase();
  if (reg.includes('POPULAR')) return 'CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE';
  if (reg.includes('RIMPE')) return 'CONTRIBUYENTE RÉGIMEN RIMPE';
  return null;
};

const issuerRuc = (s: StudioSettings) => (s.ruc || s.taxId || '').replace(/\D/g, '');

const infoTributaria = (s: StudioSettings, claveAcceso: string, codDoc: string, estab: string, pto: string, sec: string) => {
  const rimpe = rimpeLegend(s);
  const agente = String(s.agenteRetencion || '').trim();
  const agenteNum = agente && !['NO', 'SI', 'N/A'].includes(agente.toUpperCase()) ? agente.replace(/\D/g, '') : '';
  return `  <infoTributaria>
    <ambiente>${ambienteOf(s)}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escapeXml(s.razonSocial || s.studioName)}</razonSocial>
    ${s.nombreComercial ? `<nombreComercial>${escapeXml(s.nombreComercial)}</nombreComercial>` : ''}
    <ruc>${issuerRuc(s)}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>${codDoc}</codDoc>
    <estab>${estab}</estab>
    <ptoEmi>${pto}</ptoEmi>
    <secuencial>${sec}</secuencial>
    <dirMatriz>${escapeXml(s.dirMatriz || s.address)}</dirMatriz>
    ${agenteNum ? `<agenteRetencion>${agenteNum}</agenteRetencion>` : ''}
    ${rimpe ? `<contribuyenteRimpe>${rimpe}</contribuyenteRimpe>` : ''}
  </infoTributaria>`;
};

const infoAdicional = (fields: Array<[string, string | undefined]>) => {
  const valid = fields.filter(([, v]) => v && String(v).trim());
  if (valid.length === 0) return '';
  return `  <infoAdicional>
${valid.map(([k, v]) => `    <campoAdicional nombre="${escapeXml(k)}">${escapeXml(String(v).trim().slice(0, 300))}</campoAdicional>`).join('\n')}
  </infoAdicional>`;
};

const serieOf = (docNumber: string, s: StudioSettings) => {
  const parts = (docNumber || '').split('-').map(p => p.replace(/\D/g, '')).filter(Boolean);
  const estab = parts.length >= 3 ? pad(parts[parts.length - 3], 3, '001') : pad(s.codigoEstablecimiento, 3, '001');
  const pto = parts.length >= 3 ? pad(parts[parts.length - 2], 3, '001') : pad(s.puntoEmision, 3, '001');
  const sec = pad(parts[parts.length - 1], 9, '1');
  return { estab, pto, sec };
};

/** Validaciones previas para no enviar al SRI algo que será rechazado. */
export function validateIssuer(s: StudioSettings): string[] {
  const errors: string[] = [];
  if (issuerRuc(s).length !== 13) errors.push('Configure el RUC de 13 dígitos del emisor en Configuración.');
  if (!(s.razonSocial || s.studioName)) errors.push('Configure la razón social del emisor.');
  if (!(s.dirMatriz || s.address)) errors.push('Configure la dirección matriz del emisor.');
  if (!s.firmaElectronicaBase64) errors.push('Cargue la firma electrónica (.p12) en Configuración.');
  if (!(s.firmaElectronicaClave || '').trim())
    errors.push('Ingrese la contraseña de la firma electrónica en Configuración (no se guarda entre sesiones).');
  return errors;
}

// ------------------------------------------------------------------ claves de acceso

const randomCode8 = () => String(Math.floor(Math.random() * 1e8)).padStart(8, '0');

export function buildAccessKey(
  s: StudioSettings,
  codDoc: '01' | '04',
  docNumber: string,
  date: Date
): string {
  const { estab, pto, sec } = serieOf(docNumber, s);
  return generateSriClaveAcceso({
    fechaEmision: date,
    tipoComprobante: codDoc,
    ruc: issuerRuc(s),
    ambiente: ambienteOf(s),
    serie: `${estab}${pto}`,
    secuencial: sec,
    codigoNumerico: randomCode8(),
    tipoEmision: '1',
  });
}

// ------------------------------------------------------------------ XML FACTURA (01) v2.1.0

export function buildFacturaXml(sale: SaleRecord, s: StudioSettings, claveAcceso: string): string {
  const { estab, pto, sec } = serieOf(sale.invoiceNumber, s);
  const buyer = buyerOf(sale.clientDni, sale.clientName);
  const rate = sale.taxRate || 0;
  const codPct = ivaCodigoPorcentaje(rate);
  const pieces = sale.pieces && sale.pieces > 0 ? sale.pieces : 1;
  const discount = sale.discount || 0;
  const base = Math.max(0, (sale.subtotal || 0) - discount);
  const tax = sale.taxAmount || 0;
  const tip = sale.tipAmount || 0;
  const importeTotal = base + tax + tip;
  const unitPrice = (sale.subtotal || 0) / pieces;

  // Formas de pago (tabla 24): 01 sin sistema financiero, 19 tarjeta de crédito, 20 otros con sistema financiero
  const pagos: Array<[string, number]> = [];
  if (sale.paymentMethod === 'split') {
    if ((sale.cashPaid || 0) > 0) pagos.push(['01', sale.cashPaid || 0]);
    if ((sale.cardPaid || 0) > 0) pagos.push(['19', sale.cardPaid || 0]);
    if ((sale.transferPaid || 0) > 0) pagos.push(['20', sale.transferPaid || 0]);
  }
  if (pagos.length === 0) {
    pagos.push([sale.paymentMethod === 'cash' ? '01' : sale.paymentMethod === 'card' ? '19' : '20', importeTotal]);
  }
  const pagosSum = pagos.reduce((a, [, v]) => a + v, 0);
  if (Math.abs(pagosSum - importeTotal) >= 0.01) pagos[0][1] += importeTotal - pagosSum;

  const fecha = sriDate(new Date(sale.date));
  const contribEspecial = String(s.contribuyenteEspecial || '').trim();

  return `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">
${infoTributaria(s, claveAcceso, '01', estab, pto, sec)}
  <infoFactura>
    <fechaEmision>${fecha}</fechaEmision>
    <dirEstablecimiento>${escapeXml(s.dirEstablecimiento || s.address)}</dirEstablecimiento>
    ${contribEspecial && contribEspecial.toUpperCase() !== 'NO' ? `<contribuyenteEspecial>${escapeXml(contribEspecial)}</contribuyenteEspecial>` : ''}
    <obligadoContabilidad>${s.obligadoContabilidad === 'SI' ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionComprador>${buyer.tipo}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(buyer.name)}</razonSocialComprador>
    <identificacionComprador>${escapeXml(buyer.id)}</identificacionComprador>
    <totalSinImpuestos>${money(base)}</totalSinImpuestos>
    <totalDescuento>${money(discount)}</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${codPct}</codigoPorcentaje>
        <baseImponible>${money(base)}</baseImponible>
        <valor>${money(tax)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <propina>${money(tip)}</propina>
    <importeTotal>${money(importeTotal)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
${pagos.map(([code, v]) => `      <pago>
        <formaPago>${code}</formaPago>
        <total>${money(v)}</total>
      </pago>`).join('\n')}
    </pagos>
  </infoFactura>
  <detalles>
    <detalle>
      <codigoPrincipal>${escapeXml((sale.serviceCategory || 'SERV').toUpperCase().slice(0, 25))}</codigoPrincipal>
      <descripcion>${escapeXml((sale.serviceName || 'Servicio').slice(0, 300))}</descripcion>
      <cantidad>${qty(pieces)}</cantidad>
      <precioUnitario>${qty(unitPrice)}</precioUnitario>
      <descuento>${money(discount)}</descuento>
      <precioTotalSinImpuesto>${money(base)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${codPct}</codigoPorcentaje>
          <tarifa>${money(rate)}</tarifa>
          <baseImponible>${money(base)}</baseImponible>
          <valor>${money(tax)}</valor>
        </impuesto>
      </impuestos>
    </detalle>
  </detalles>
${infoAdicional([
  ['Email', sale.clientEmail],
  ['Telefono', sale.clientPhone],
  ['Artista', sale.artistName],
])}
</factura>`.replace(/^\s*\n/gm, '');
}

// ------------------------------------------------------------------ XML NOTA DE CRÉDITO (04) v1.1.0

export function buildNotaCreditoXml(
  cn: CreditNoteRecord,
  s: StudioSettings,
  claveAcceso: string,
  sale?: SaleRecord
): string {
  const { estab, pto, sec } = serieOf(cn.creditNoteNumber, s);
  const buyer = buyerOf(cn.clientDni, cn.clientName);
  const rate = cn.taxRate || 0;
  const codPct = ivaCodigoPorcentaje(rate);
  const fecha = sriDate(new Date(cn.date));
  const descripcion = sale?.serviceName || cn.reasonDescription || 'Devolución';
  const contribEspecial = String(s.contribuyenteEspecial || '').trim();

  return `<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
${infoTributaria(s, claveAcceso, '04', estab, pto, sec)}
  <infoNotaCredito>
    <fechaEmision>${fecha}</fechaEmision>
    <dirEstablecimiento>${escapeXml(s.dirEstablecimiento || s.address)}</dirEstablecimiento>
    <tipoIdentificacionComprador>${buyer.tipo}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(buyer.name)}</razonSocialComprador>
    <identificacionComprador>${escapeXml(buyer.id)}</identificacionComprador>
    ${contribEspecial && contribEspecial.toUpperCase() !== 'NO' ? `<contribuyenteEspecial>${escapeXml(contribEspecial)}</contribuyenteEspecial>` : ''}
    <obligadoContabilidad>${s.obligadoContabilidad === 'SI' ? 'SI' : 'NO'}</obligadoContabilidad>
    <codDocModificado>01</codDocModificado>
    <numDocModificado>${escapeXml(cn.affectedInvoiceNumber)}</numDocModificado>
    <fechaEmisionDocSustento>${sriDateFromString(cn.affectedInvoiceDate)}</fechaEmisionDocSustento>
    <totalSinImpuestos>${money(cn.subtotal)}</totalSinImpuestos>
    <valorModificacion>${money(cn.total)}</valorModificacion>
    <moneda>DOLAR</moneda>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${codPct}</codigoPorcentaje>
        <baseImponible>${money(cn.subtotal)}</baseImponible>
        <valor>${money(cn.taxAmount)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <motivo>${escapeXml((cn.reasonDescription || 'Devolución').slice(0, 300))}</motivo>
  </infoNotaCredito>
  <detalles>
    <detalle>
      <codigoInterno>${escapeXml((sale?.serviceCategory || 'SERV').toUpperCase().slice(0, 25))}</codigoInterno>
      <descripcion>${escapeXml(descripcion.slice(0, 300))}</descripcion>
      <cantidad>1.00</cantidad>
      <precioUnitario>${money(cn.subtotal)}</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>${money(cn.subtotal)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${codPct}</codigoPorcentaje>
          <tarifa>${money(rate)}</tarifa>
          <baseImponible>${money(cn.subtotal)}</baseImponible>
          <valor>${money(cn.taxAmount)}</valor>
        </impuesto>
      </impuestos>
    </detalle>
  </detalles>
${infoAdicional([
  ['Email', cn.clientEmail],
  ['Telefono', cn.clientPhone],
])}
</notaCredito>`.replace(/^\s*\n/gm, '');
}

// ------------------------------------------------------------------ cliente HTTP de la API Java

const apiBase = (s: CompanyConfig) => (s.sriApiUrl || DEFAULT_SRI_API_URL).replace(/\/+$/, '');

async function callApi(url: string, init?: RequestInit, timeoutMs = 45000): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err: any) {
    throw new Error(
      `No se pudo conectar con la API SRI (${url.split('/api/')[0]}). Verifique que esté encendida. ${err?.message || ''}`.trim()
    );
  }
  const text = await res.text();
  if (!res.ok) throw new Error((text || `Error HTTP ${res.status}`).replace(/^❌\s*/, ''));
  return text;
}

export async function signXml(xml: string, s: CompanyConfig): Promise<string> {
  const signed = await callApi(`${apiBase(s)}/api/sri/firmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml, certificadoBase64: s.firmaElectronicaBase64, password: s.firmaElectronicaClave }),
  });
  if (!signed.includes('Signature')) throw new Error('La API no devolvió un XML firmado.');
  return signed;
}

// ------------------------------------------------------------------ parseo de respuestas SOAP

const byLocalName = (root: Document | Element, name: string): Element[] =>
  Array.from(root.getElementsByTagName('*')).filter(el => el.localName === name);

const childText = (el: Element, name: string) =>
  Array.from(el.children).find(c => c.localName === name)?.textContent?.trim() || '';

const parseMessages = (root: Document | Element): { id: string; text: string }[] =>
  byLocalName(root, 'mensaje')
    .filter(el => Array.from(el.children).some(c => c.localName === 'identificador'))
    .map(el => {
      const id = childText(el, 'identificador');
      const info = childText(el, 'informacionAdicional');
      const tipo = childText(el, 'tipo');
      return { id, text: `[${id}] ${childText(el, 'mensaje')}${info ? ` — ${info}` : ''}${tipo ? ` (${tipo})` : ''}` };
    });

const parseXml = (text: string) => new DOMParser().parseFromString(text, 'text/xml');

export async function sendToReception(signedXml: string, s: StudioSettings) {
  const raw = await callApi(`${apiBase(s)}/api/sri/recepcion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xmlFirmado: signedXml }),
  });
  const doc = parseXml(raw);
  const estadoEl = byLocalName(doc, 'estado')[0];
  const estado = estadoEl?.textContent?.trim().toUpperCase() || '';
  return { estado, messages: parseMessages(doc), raw };
}

export async function queryAuthorization(claveAcceso: string, s: StudioSettings) {
  const raw = await callApi(`${apiBase(s)}/api/sri/autorizacion/${encodeURIComponent(claveAcceso)}`);
  const doc = parseXml(raw);
  const auths = byLocalName(doc, 'autorizacion');
  // Si hay varias respuestas, prioriza la autorizada
  const chosen =
    auths.find(a => childText(a, 'estado').toUpperCase() === 'AUTORIZADO') || auths[auths.length - 1];
  if (!chosen) return { estado: 'EN PROCESO', messages: [] as { id: string; text: string }[], raw };
  return {
    estado: childText(chosen, 'estado').toUpperCase(),
    numeroAutorizacion: childText(chosen, 'numeroAutorizacion'),
    fechaAutorizacion: childText(chosen, 'fechaAutorizacion'),
    comprobante: childText(chosen, 'comprobante'),
    messages: parseMessages(chosen),
    raw,
  };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Proceso completo: firma → recepción → autorización (con reintentos).
 */
export async function emitElectronicDocument(
  unsignedXml: string,
  claveAcceso: string,
  s: StudioSettings,
  options: { alreadyReceived?: boolean } = {}
): Promise<SriEmissionResult> {
  const pre = validateIssuer(s);
  if (pre.length > 0) return { status: 'ERROR', messages: pre };

  try {
    let signed: string | undefined;
    if (!options.alreadyReceived) {
      signed = await signXml(unsignedXml, s);
      const rec = await sendToReception(signed, s);
      // 43 = CLAVE ACCESO REGISTRADA (ya fue recibido antes): se continúa con la autorización
      const alreadyRegistered = rec.messages.some(m => m.id === '43');
      if (rec.estado !== 'RECIBIDA' && !alreadyRegistered) {
        return {
          status: 'RECHAZADO',
          xml: signed,
          messages: rec.messages.length ? rec.messages.map(m => m.text) : [`Recepción SRI: ${rec.estado || 'sin respuesta'}`],
        };
      }
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      await sleep(attempt === 0 ? 1500 : 2500);
      const auth = await queryAuthorization(claveAcceso, s);
      if (auth.estado === 'AUTORIZADO') {
        return {
          status: 'AUTORIZADO',
          authorizationNumber: auth.numeroAutorizacion || claveAcceso,
          authorizationDate: auth.fechaAutorizacion || new Date().toISOString(),
          xml: auth.comprobante || signed,
          messages: auth.messages.map(m => m.text),
        };
      }
      if (auth.estado === 'NO AUTORIZADO' || auth.estado === 'RECHAZADO') {
        return { status: 'RECHAZADO', xml: signed, messages: auth.messages.map(m => m.text) };
      }
    }
    return {
      status: 'EN_PROCESO',
      xml: signed,
      messages: ['El SRI aún no responde la autorización. Use "Consultar SRI" en unos minutos.'],
    };
  } catch (err: any) {
    return { status: 'ERROR', messages: [err?.message || 'Error desconocido al emitir el comprobante.'] };
  }
}
