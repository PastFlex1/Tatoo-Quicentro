/**
 * Comprobantes electrónicos RECIBIDOS (compras).
 *
 * Fuente: el servicio público de autorización del SRI, a través de /api/sri/comprobante/:clave
 * (ver src/utils/sriAutorizacionServer.ts). Las claves de acceso salen del reporte TXT de
 * "Comprobantes electrónicos recibidos" de SRI en Línea, de un lector de códigos de barras o se pegan.
 */
import { ComprobanteRecibido, ItemComprobanteRecibido } from '../types';
import { parseSriXml, ParsedSriInvoice } from '../utils/sriXmlParser';
import { describirClaveAcceso, validarClaveAcceso } from '../utils/claveAcceso';

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

export interface ConsultaClaveResult {
  clave: string;
  ok: boolean;
  comprobante?: ComprobanteRecibido;
  error?: string;
}

/** Convierte el XML (autorizado o el comprobante solo) en un registro de la bandeja */
export function comprobanteDesdeXml(
  xml: string,
  extra: Partial<ComprobanteRecibido> = {}
): { comprobante: ComprobanteRecibido; parsed: ParsedSriInvoice } {
  const p = parseSriXml(xml);
  const [establecimiento, puntoEmision, secuencial] = p.invoiceNumber.split('-');
  // Base gravada a partir del IVA; el resto del subtotal es tarifa 0 %
  const gravado = p.taxAmount > 0 && p.taxRate > 0 ? Math.min(p.subtotal, r2(p.taxAmount / (p.taxRate / 100))) : 0;
  const items: ItemComprobanteRecibido[] = p.items.map(it => ({
    codigoPrincipal: it.code || '',
    codigoAuxiliar: '',
    descripcion: it.description,
    cantidad: it.quantity,
    precioUnitario: it.unitPrice,
    descuento: 0,
    baseImponible: it.total,
    porcentajeIva: gravado > 0 ? p.taxRate : 0,
    valorIva: gravado > 0 ? r2((it.total * p.taxRate) / 100) : 0,
    totalItem: gravado > 0 ? r2(it.total * (1 + p.taxRate / 100)) : it.total,
  }));
  const comprobante: ComprobanteRecibido = {
    id: `rec-${p.accessKey || Date.now()}`,
    claveAcceso: p.accessKey,
    tipoComprobante: 'Factura',
    rucEmisor: p.supplierRuc,
    razonSocialProveedor: p.supplierTradeName ? `${p.supplierTradeName} (${p.supplierName})` : p.supplierName,
    fechaEmision: p.formattedDate,
    establecimiento,
    puntoEmision,
    secuencial,
    numeroCompleto: p.invoiceNumber,
    subtotalTarifa0: r2(p.subtotal - gravado),
    subtotalGravado: gravado,
    descuento: 0,
    iva: r2(p.taxAmount),
    ice: 0,
    propina: 0,
    total: r2(p.totalAmount),
    formaPago: p.paymentMethodCode || '',
    xmlOriginal: xml,
    estado: 'PENDIENTE_REVISION',
    items,
    fechaImportacion: new Date().toISOString(),
    numeroAutorizacion: p.authorizationNumber,
    ...extra,
  };
  return { comprobante, parsed: p };
}

/** Consulta una clave de acceso al SRI y devuelve el comprobante listo para la bandeja */
export async function consultarClave(clave: string): Promise<ConsultaClaveResult> {
  const invalid = validarClaveAcceso(clave);
  if (invalid) return { clave, ok: false, error: invalid };
  const info = describirClaveAcceso(clave);
  if (info.tipo !== '01') {
    return { clave, ok: false, error: `${info.tipoNombre}: por ahora solo se importan facturas de compra.` };
  }
  try {
    const res = await fetch(`/api/sri/comprobante/${clave}`);
    const data = await res.json().catch(() => ({}));
    if (!data.found || !data.xml) return { clave, ok: false, error: data.error || `El SRI respondió con el código ${res.status}.` };
    if (String(data.estado).toUpperCase() !== 'AUTORIZADO') {
      return { clave, ok: false, error: `El comprobante está ${String(data.estado || 'sin autorizar').toLowerCase()} en el SRI.` };
    }
    const { comprobante } = comprobanteDesdeXml(data.xml, {
      origen: 'SRI',
      numeroAutorizacion: data.numeroAutorizacion,
      fechaAutorizacion: data.fechaAutorizacion,
    });
    return { clave, ok: true, comprobante };
  } catch (err) {
    return { clave, ok: false, error: err instanceof Error ? err.message : 'No se pudo consultar el SRI.' };
  }
}

/** Consulta varias claves con pocas peticiones simultáneas (para no saturar al SRI) */
export async function consultarClaves(
  claves: string[],
  onProgress?: (done: number, total: number, last: ConsultaClaveResult) => void,
  concurrency = 3
): Promise<ConsultaClaveResult[]> {
  const results: ConsultaClaveResult[] = new Array(claves.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < claves.length) {
      const i = next++;
      results[i] = await consultarClave(claves[i]);
      done++;
      onProgress?.(done, claves.length, results[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, claves.length) }, worker));
  return results;
}

// ------------------------------------------------------------------ ZIP (sin dependencias, sin compresión)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (data: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** Empaqueta archivos de texto en un .zip (método "stored", compatible con cualquier descompresor) */
export function buildZip(files: { name: string; content: string }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' });
}

/** Descarga un Blob como archivo (libera la URL después, para no cancelar la descarga) */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
