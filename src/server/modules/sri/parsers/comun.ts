/** Utilidades comunes a todos los tipos de comprobante (XML ya convertido a objeto por fast-xml-parser). */
import { FORMAS_PAGO, IMPUESTOS, TARIFAS_IVA } from '../sri.types.ts';
import type { Detalle, DocumentoSustento, FormaPago, ImpuestoValor, Persona, Totales } from '../sri.types.ts';

export type Nodo = Record<string, any>;

export const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** Texto de un nodo (fast-xml-parser devuelve objeto si el nodo tiene atributos) */
export const txt = (v: unknown): string => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return txt((v as Nodo)['#text']);
  return String(v).trim();
};

export const num = (v: unknown): number => {
  const n = parseFloat(txt(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Siempre un arreglo (un nodo repetido puede venir como objeto único) */
export const lista = <T = Nodo>(v: unknown): T[] => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v : [v]) as T[];

/** 'DD/MM/YYYY' → 'YYYY-MM-DD' (acepta también 'YYYY-MM-DD') */
export const fecha = (v: unknown): string => {
  const s = txt(v);
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
};

export function infoTributaria(it: Nodo) {
  const estab = txt(it.estab).padStart(3, '0');
  const pto = txt(it.ptoEmi).padStart(3, '0');
  const sec = txt(it.secuencial).padStart(9, '0');
  return {
    ambiente: txt(it.ambiente) === '2' ? ('PRODUCCION' as const) : ('PRUEBAS' as const),
    claveAcceso: txt(it.claveAcceso),
    codDoc: txt(it.codDoc),
    establecimiento: estab,
    puntoEmision: pto,
    secuencial: sec,
    numero: `${estab}-${pto}-${sec}`,
    emisor: {
      identificacion: txt(it.ruc),
      tipoIdentificacion: '04',
      razonSocial: txt(it.razonSocial),
      nombreComercial: txt(it.nombreComercial) || undefined,
      dirMatriz: txt(it.dirMatriz) || undefined,
      regimen: txt(it.contribuyenteRimpe) || (txt(it.agenteRetencion) ? `Agente de retención ${txt(it.agenteRetencion)}` : undefined),
    },
  };
}

export const persona = (tipo: unknown, id: unknown, razon: unknown, dir?: unknown): Persona => ({
  tipoIdentificacion: txt(tipo) || undefined,
  identificacion: txt(id),
  razonSocial: txt(razon),
  direccion: txt(dir) || undefined,
});

export function impuesto(n: Nodo): ImpuestoValor {
  const codigo = txt(n.codigo);
  const codigoPorcentaje = txt(n.codigoPorcentaje);
  const tarifaTabla = codigo === '2' ? TARIFAS_IVA[codigoPorcentaje]?.tarifa : undefined;
  return {
    codigo,
    codigoNombre: IMPUESTOS[codigo],
    codigoPorcentaje,
    tarifa: txt(n.tarifa) ? num(n.tarifa) : tarifaTabla ?? 0,
    baseImponible: r2(num(n.baseImponible)),
    valor: r2(num(n.valor)),
    descuentoAdicional: txt(n.descuentoAdicional) ? r2(num(n.descuentoAdicional)) : undefined,
  };
}

/** <totalConImpuestos><totalImpuesto>… o <impuestos><impuesto>… */
export const impuestosDe = (contenedor: Nodo | undefined, hijo: 'totalImpuesto' | 'impuesto'): ImpuestoValor[] =>
  lista<Nodo>(contenedor?.[hijo]).map(impuesto);

/** Bases imponibles desagregadas por tarifa de IVA y valores de impuestos */
export function totalesDesde(impuestos: ImpuestoValor[], extra: Partial<Totales>): Totales {
  const t: Totales = {
    subtotalSinImpuestos: 0, descuento: 0, base15: 0, base12: 0, base5: 0, baseOtrasTarifas: 0,
    base0: 0, noObjeto: 0, exento: 0, iva: 0, ice: 0, irbpnr: 0, propina: 0, total: 0,
    ...extra,
  };
  for (const i of impuestos) {
    if (i.codigo === '2') {
      switch (i.codigoPorcentaje) {
        case '4': t.base15 += i.baseImponible; break;
        case '2': t.base12 += i.baseImponible; break;
        case '5': t.base5 += i.baseImponible; break;
        case '0': t.base0 += i.baseImponible; break;
        case '6': t.noObjeto += i.baseImponible; break;
        case '7': t.exento += i.baseImponible; break;
        default: t.baseOtrasTarifas += i.baseImponible;
      }
      t.iva += i.valor;
    } else if (i.codigo === '3') t.ice += i.valor;
    else if (i.codigo === '5') t.irbpnr += i.valor;
  }
  for (const k of Object.keys(t) as (keyof Totales)[]) t[k] = r2(t[k]);
  return t;
}

export const formasPago = (pagos: Nodo | undefined): FormaPago[] =>
  lista<Nodo>(pagos?.pago).map(p => ({
    codigo: txt(p.formaPago),
    nombre: FORMAS_PAGO[txt(p.formaPago)] || `Forma de pago ${txt(p.formaPago)}`,
    total: r2(num(p.total)),
    plazo: txt(p.plazo) ? num(p.plazo) : undefined,
    unidadTiempo: txt(p.unidadTiempo) || undefined,
  }));

/** Detalles de factura / liquidación (codigoPrincipal) o nota de crédito (codigoInterno) */
export const detalles = (cont: Nodo | undefined): Detalle[] =>
  lista<Nodo>(cont?.detalle).map(d => ({
    codigoPrincipal: txt(d.codigoPrincipal) || txt(d.codigoInterno) || undefined,
    codigoAuxiliar: txt(d.codigoAuxiliar) || txt(d.codigoAdicional) || undefined,
    descripcion: txt(d.descripcion),
    cantidad: num(d.cantidad),
    precioUnitario: num(d.precioUnitario),
    descuento: r2(num(d.descuento)),
    precioTotalSinImpuesto: r2(num(d.precioTotalSinImpuesto)),
    impuestos: impuestosDe(d.impuestos, 'impuesto'),
  }));

export function infoAdicional(n: Nodo | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of lista<Nodo>(n?.campoAdicional)) {
    const nombre = txt(c['@_nombre']);
    if (nombre) out[nombre] = txt(c);
  }
  return out;
}

export const docSustento = (cod: unknown, numDoc: unknown, fechaDoc: unknown): DocumentoSustento | undefined =>
  txt(numDoc) ? { codDoc: txt(cod), numero: txt(numDoc), fechaEmision: fecha(fechaDoc) || undefined } : undefined;
