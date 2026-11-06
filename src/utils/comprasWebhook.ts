/**
 * Webhook de compras: valida el JSON que envía un proveedor de API (o un script propio que consulta
 * al SRI) y lo convierte en un ComprobanteRecibido. Sin dependencias del navegador ni de Node.
 *
 * Payload esperado (POST /api/v1/compras/sri-webhook):
 * {
 *   "clave_acceso": "49 dígitos", "numero_autorizacion": "...", "fecha_autorizacion": "ISO", "ambiente": "PRODUCCION",
 *   "comprobante": {
 *     "tipo_comprobante": "01", "establecimiento": "001", "punto_emision": "001", "secuencial": "000012345",
 *     "fecha_emision": "2026-11-05",
 *     "proveedor": { "ruc": "...", "razon_social": "...", "nombre_comercial": "..." },
 *     "receptor":  { "ruc": "..." },                                   (opcional; si falta se lee del XML)
 *     "totales": { "subtotal_15", "subtotal_0", "subtotal_no_objeto", "subtotal_exento",
 *                  "total_descuento", "ice", "iva_valor", "propina", "total" },
 *     "forma_pago": "20",                                              (opcional)
 *     "detalles": [{ "codigo_principal", "descripcion", "cantidad", "precio_unitario", "descuento",
 *                    "precio_total_sin_impuesto", "impuestos": [{ "codigo", "codigo_porcentaje", "tarifa", "base_imponible", "valor" }] }]
 *   },
 *   "xml_raw_base64": "..."                                            (recomendado: obligación de conservar el XML)
 * }
 */
import type { ComprobanteRecibido, ItemComprobanteRecibido } from '../types/index.ts';
import { TIPO_COMPROBANTE, validarClaveAcceso } from './claveAcceso.ts';

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;
const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

const decodeBase64 = (b64: string): string => {
  const clean = b64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  const g = globalThis as any;
  if (g.Buffer) return g.Buffer.from(clean, 'base64').toString('utf8');
  const bin = atob(clean);
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
};

/** Acepta 'YYYY-MM-DD', 'DD/MM/YYYY' o ISO → 'YYYY-MM-DD' */
const normalizeDate = (v: string): string | null => {
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

export type NormalizeResult =
  | { ok: true; comprobante: ComprobanteRecibido }
  | { ok: false; error: string };

export function normalizarCompraWebhook(body: unknown): NormalizeResult {
  if (!isObj(body)) return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };

  const clave = str(body.clave_acceso);
  if (!clave) return { ok: false, error: 'Falta "clave_acceso".' };
  const claveError = validarClaveAcceso(clave);
  if (claveError) return { ok: false, error: claveError };

  const c = body.comprobante;
  if (!isObj(c)) return { ok: false, error: 'Falta el objeto "comprobante".' };
  const prov = isObj(c.proveedor) ? c.proveedor : {};
  const rucEmisor = str(prov.ruc) || clave.slice(10, 23);
  if (!/^\d{13}$/.test(rucEmisor)) return { ok: false, error: '"comprobante.proveedor.ruc" debe tener 13 dígitos.' };
  if (rucEmisor !== clave.slice(10, 23)) return { ok: false, error: 'El RUC del proveedor no coincide con el de la clave de acceso.' };

  const fechaEmision = normalizeDate(str(c.fecha_emision)) || `${clave.slice(4, 8)}-${clave.slice(2, 4)}-${clave.slice(0, 2)}`;
  const tipo = str(c.tipo_comprobante) || clave.slice(8, 10);
  const estab = str(c.establecimiento) || clave.slice(24, 27);
  const pto = str(c.punto_emision) || clave.slice(27, 30);
  const sec = (str(c.secuencial) || clave.slice(30, 39)).padStart(9, '0');

  const t = isObj(c.totales) ? c.totales : {};
  // Base gravada: cualquier tarifa distinta de 0 (15 %, 12 % o 5 % según la época)
  const gravado = r2(num(t.subtotal_15) + num(t.subtotal_12) + num(t.subtotal_5) + num(t.subtotal_gravado));
  const total = r2(num(t.total));
  if (total <= 0) return { ok: false, error: '"comprobante.totales.total" debe ser mayor a 0.' };

  let xml = '';
  if (str(body.xml_raw_base64)) {
    try {
      xml = decodeBase64(str(body.xml_raw_base64));
    } catch {
      return { ok: false, error: '"xml_raw_base64" no es Base64 válido.' };
    }
    if (!xml.includes('<')) return { ok: false, error: '"xml_raw_base64" no contiene un XML.' };
    if (!xml.includes(clave)) return { ok: false, error: 'El XML no corresponde a la clave de acceso enviada.' };
  }

  const receptor = isObj(c.receptor) ? c.receptor : isObj(c.comprador) ? c.comprador : {};
  const receptorRuc =
    str(receptor.ruc) || str(receptor.identificacion) || (/<identificacionComprador>\s*([^<\s]+)\s*</.exec(xml)?.[1] ?? '');

  const items: ItemComprobanteRecibido[] = (Array.isArray(c.detalles) ? c.detalles : []).filter(isObj).map(d => {
    const iva = (Array.isArray(d.impuestos) ? d.impuestos : []).filter(isObj).find(i => str(i.codigo) === '2' || !str(i.codigo));
    const base = r2(num(d.precio_total_sin_impuesto) || num(d.cantidad) * num(d.precio_unitario) - num(d.descuento));
    const valorIva = r2(num(iva?.valor));
    return {
      codigoPrincipal: str(d.codigo_principal),
      codigoAuxiliar: str(d.codigo_auxiliar),
      descripcion: str(d.descripcion) || 'Sin descripción',
      cantidad: num(d.cantidad) || 1,
      precioUnitario: num(d.precio_unitario),
      descuento: num(d.descuento),
      baseImponible: base,
      porcentajeIva: num(iva?.tarifa),
      valorIva,
      totalItem: r2(base + valorIva),
    };
  });

  const comprobante: ComprobanteRecibido = {
    id: `rec-${clave}`,
    claveAcceso: clave,
    tipoComprobante: TIPO_COMPROBANTE[tipo] || `Tipo ${tipo}`,
    rucEmisor,
    razonSocialProveedor: str(prov.razon_social) || str(prov.nombre_comercial) || `Proveedor ${rucEmisor}`,
    nombreComercialProveedor: str(prov.nombre_comercial) || undefined,
    fechaEmision,
    establecimiento: estab,
    puntoEmision: pto,
    secuencial: sec,
    numeroCompleto: `${estab}-${pto}-${sec}`,
    subtotalTarifa0: r2(num(t.subtotal_0)),
    subtotalGravado: gravado,
    subtotalNoObjeto: r2(num(t.subtotal_no_objeto)),
    subtotalExento: r2(num(t.subtotal_exento)),
    descuento: r2(num(t.total_descuento)),
    iva: r2(num(t.iva_valor)),
    ice: r2(num(t.ice)),
    propina: r2(num(t.propina)),
    total,
    formaPago: str(c.forma_pago),
    xmlOriginal: xml,
    estado: 'PENDIENTE_REVISION',
    items,
    fechaImportacion: new Date().toISOString(),
    numeroAutorizacion: str(body.numero_autorizacion) || clave,
    fechaAutorizacion: str(body.fecha_autorizacion) || undefined,
    origen: 'WEBHOOK',
    receptorRuc: receptorRuc || undefined,
    observacion: xml ? undefined : 'Llegó sin XML: solicite el XML al proveedor (obligación de conservarlo).',
  };
  return { ok: true, comprobante };
}
