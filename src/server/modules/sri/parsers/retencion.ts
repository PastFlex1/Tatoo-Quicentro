/**
 * Comprobante de retención (07): versión 1.0.0 (lista de <impuestos>) y versión 2.0.0
 * (<docsSustento> con sus <retenciones>, obligatoria desde 2022).
 *
 * Al recibir una retención, el estudio es el SUJETO RETENIDO: le retuvieron parte del pago de una venta.
 */
import { IMPUESTOS_RETENCION, TIPOS_COMPROBANTE } from '../sri.types.ts';
import type { ComprobanteParseado, Retencion } from '../sri.types.ts';
import { docSustento, fecha, infoAdicional, infoTributaria, lista, num, persona, r2, totalesDesde, txt } from './comun.ts';
import type { Nodo } from './comun.ts';

type Base = Omit<ComprobanteParseado, 'autorizacion' | 'advertencias'>;

const retencion = (n: Nodo, sustento?: Retencion['docSustento']): Retencion => ({
  codigo: txt(n.codigo),
  impuesto: IMPUESTOS_RETENCION[txt(n.codigo)] || `Impuesto ${txt(n.codigo)}`,
  codigoRetencion: txt(n.codigoRetencion),
  baseImponible: r2(num(n.baseImponible)),
  porcentaje: num(n.porcentajeRetener),
  valorRetenido: r2(num(n.valorRetenido)),
  docSustento: sustento,
});

export function parseRetencion(raiz: Nodo): Base {
  const it = infoTributaria(raiz.infoTributaria || {});
  const inf: Nodo = raiz.infoCompRetencion || {};
  const version = txt(raiz['@_version']) || undefined;

  let retenciones: Retencion[];
  if (raiz.docsSustento) {
    // v2.0.0
    retenciones = lista<Nodo>(raiz.docsSustento.docSustento).flatMap(ds => {
      const sustento = docSustento(ds.codDocSustento, ds.numDocSustento, ds.fechaEmisionDocSustento);
      return lista<Nodo>(ds.retenciones?.retencion).map(r => retencion(r, sustento));
    });
  } else {
    // v1.0.0
    retenciones = lista<Nodo>(raiz.impuestos?.impuesto).map(r =>
      retencion(r, docSustento(r.codDocSustento, r.numDocSustento, r.fechaEmisionDocSustento))
    );
  }
  const totalRetenido = r2(retenciones.reduce((a, r) => a + r.valorRetenido, 0));

  return {
    ...it,
    tipo: '07',
    tipoNombre: TIPOS_COMPROBANTE['07'].nombre,
    version,
    emisor: { ...it.emisor, obligadoContabilidad: txt(inf.obligadoContabilidad) || undefined, contribuyenteEspecial: txt(inf.contribuyenteEspecial) || undefined },
    receptor: persona(inf.tipoIdentificacionSujetoRetenido, inf.identificacionSujetoRetenido, inf.razonSocialSujetoRetenido),
    fechaEmision: fecha(inf.fechaEmision),
    moneda: 'DOLAR',
    impuestos: [],
    totales: totalesDesde([], { total: totalRetenido }),
    formasPago: [],
    detalles: retenciones.map(r => ({
      codigoPrincipal: r.codigoRetencion,
      descripcion: `Retención ${r.impuesto} ${r.porcentaje}%${r.docSustento ? ` · doc. ${r.docSustento.numero}` : ''}`,
      cantidad: 1,
      precioUnitario: r.valorRetenido,
      descuento: 0,
      precioTotalSinImpuesto: r.valorRetenido,
      impuestos: [],
    })),
    periodoFiscal: txt(inf.periodoFiscal) || undefined,
    retenciones,
    totalRetenido,
    infoAdicional: infoAdicional(raiz.infoAdicional),
  };
}
