/** Nota de crédito (04) y nota de débito (05). */
import { TIPOS_COMPROBANTE } from '../sri.types.ts';
import type { ComprobanteParseado } from '../sri.types.ts';
import { detalles, docSustento, fecha, formasPago, impuestosDe, infoAdicional, infoTributaria, lista, num, persona, r2, totalesDesde, txt } from './comun.ts';
import type { Nodo } from './comun.ts';

type Base = Omit<ComprobanteParseado, 'autorizacion' | 'advertencias'>;

export function parseNotaCredito(raiz: Nodo): Base {
  const it = infoTributaria(raiz.infoTributaria || {});
  const inf: Nodo = raiz.infoNotaCredito || {};
  const impuestos = impuestosDe(inf.totalConImpuestos, 'totalImpuesto');
  return {
    ...it,
    tipo: '04',
    tipoNombre: TIPOS_COMPROBANTE['04'].nombre,
    version: txt(raiz['@_version']) || undefined,
    emisor: { ...it.emisor, obligadoContabilidad: txt(inf.obligadoContabilidad) || undefined, contribuyenteEspecial: txt(inf.contribuyenteEspecial) || undefined },
    receptor: persona(inf.tipoIdentificacionComprador, inf.identificacionComprador, inf.razonSocialComprador),
    fechaEmision: fecha(inf.fechaEmision),
    moneda: txt(inf.moneda) || 'DOLAR',
    impuestos,
    totales: totalesDesde(impuestos, {
      subtotalSinImpuestos: num(inf.totalSinImpuestos),
      // La nota de crédito informa "valorModificacion" como total
      total: r2(num(inf.valorModificacion)),
    }),
    formasPago: [],
    detalles: detalles(raiz.detalles),
    documentoModificado: docSustento(inf.codDocModificado, inf.numDocModificado, inf.fechaEmisionDocSustento),
    motivo: txt(inf.motivo) || undefined,
    infoAdicional: infoAdicional(raiz.infoAdicional),
  };
}

export function parseNotaDebito(raiz: Nodo): Base {
  const it = infoTributaria(raiz.infoTributaria || {});
  const inf: Nodo = raiz.infoNotaDebito || {};
  const impuestos = impuestosDe(inf.impuestos, 'impuesto');
  const motivos = lista<Nodo>(raiz.motivos?.motivo).map(m => ({ razon: txt(m.razon), valor: r2(num(m.valor)) }));
  return {
    ...it,
    tipo: '05',
    tipoNombre: TIPOS_COMPROBANTE['05'].nombre,
    version: txt(raiz['@_version']) || undefined,
    emisor: { ...it.emisor, obligadoContabilidad: txt(inf.obligadoContabilidad) || undefined, contribuyenteEspecial: txt(inf.contribuyenteEspecial) || undefined },
    receptor: persona(inf.tipoIdentificacionComprador, inf.identificacionComprador, inf.razonSocialComprador),
    fechaEmision: fecha(inf.fechaEmision),
    moneda: 'DOLAR',
    impuestos,
    totales: totalesDesde(impuestos, {
      subtotalSinImpuestos: num(inf.totalSinImpuestos),
      total: r2(num(inf.valorTotal)),
    }),
    formasPago: formasPago(inf.pagos),
    // La nota de débito no tiene detalle de productos: se muestran los motivos como líneas
    detalles: motivos.map(m => ({ descripcion: m.razon, cantidad: 1, precioUnitario: m.valor, descuento: 0, precioTotalSinImpuesto: m.valor, impuestos: [] })),
    motivos,
    documentoModificado: docSustento(inf.codDocModificado, inf.numDocModificado, inf.fechaEmisionDocSustento),
    infoAdicional: infoAdicional(raiz.infoAdicional),
  };
}
