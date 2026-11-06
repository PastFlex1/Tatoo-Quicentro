/** Factura (01) y liquidación de compra (03): misma estructura, distinto bloque de información. */
import { TIPOS_COMPROBANTE } from '../sri.types.ts';
import type { ComprobanteParseado } from '../sri.types.ts';
import { detalles, fecha, formasPago, impuestosDe, infoAdicional, infoTributaria, num, persona, r2, totalesDesde, txt } from './comun.ts';
import type { Nodo } from './comun.ts';

type Base = Omit<ComprobanteParseado, 'autorizacion' | 'advertencias'>;

export function parseFactura(raiz: Nodo): Base {
  const it = infoTributaria(raiz.infoTributaria || {});
  const inf: Nodo = raiz.infoFactura || {};
  const impuestos = impuestosDe(inf.totalConImpuestos, 'totalImpuesto');
  return {
    ...it,
    tipo: '01',
    tipoNombre: TIPOS_COMPROBANTE['01'].nombre,
    version: txt(raiz['@_version']) || undefined,
    emisor: { ...it.emisor, obligadoContabilidad: txt(inf.obligadoContabilidad) || undefined, contribuyenteEspecial: txt(inf.contribuyenteEspecial) || undefined },
    receptor: persona(inf.tipoIdentificacionComprador, inf.identificacionComprador, inf.razonSocialComprador, inf.direccionComprador),
    fechaEmision: fecha(inf.fechaEmision),
    moneda: txt(inf.moneda) || 'DOLAR',
    impuestos,
    totales: totalesDesde(impuestos, {
      subtotalSinImpuestos: num(inf.totalSinImpuestos),
      descuento: num(inf.totalDescuento),
      propina: num(inf.propina),
      total: r2(num(inf.importeTotal)),
    }),
    formasPago: formasPago(inf.pagos),
    detalles: detalles(raiz.detalles),
    infoAdicional: infoAdicional(raiz.infoAdicional),
  };
}

export function parseLiquidacionCompra(raiz: Nodo): Base {
  const it = infoTributaria(raiz.infoTributaria || {});
  const inf: Nodo = raiz.infoLiquidacionCompra || {};
  const impuestos = impuestosDe(inf.totalConImpuestos, 'totalImpuesto');
  return {
    ...it,
    tipo: '03',
    tipoNombre: TIPOS_COMPROBANTE['03'].nombre,
    version: txt(raiz['@_version']) || undefined,
    emisor: { ...it.emisor, obligadoContabilidad: txt(inf.obligadoContabilidad) || undefined },
    // En la liquidación de compra la "contraparte" es el proveedor (persona natural no obligada a facturar)
    receptor: persona(inf.tipoIdentificacionProveedor, inf.identificacionProveedor, inf.razonSocialProveedor, inf.direccionProveedor),
    fechaEmision: fecha(inf.fechaEmision),
    moneda: txt(inf.moneda) || 'DOLAR',
    impuestos,
    totales: totalesDesde(impuestos, {
      subtotalSinImpuestos: num(inf.totalSinImpuestos),
      descuento: num(inf.totalDescuento),
      total: r2(num(inf.importeTotal)),
    }),
    formasPago: formasPago(inf.pagos),
    detalles: detalles(raiz.detalles),
    infoAdicional: infoAdicional(raiz.infoAdicional),
  };
}
