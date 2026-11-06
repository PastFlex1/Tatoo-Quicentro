/** Guía de remisión (06): no tiene valores; se registra para trazabilidad del traslado de mercadería. */
import { TIPOS_COMPROBANTE } from '../sri.types.ts';
import type { ComprobanteParseado, Destinatario } from '../sri.types.ts';
import { docSustento, fecha, infoAdicional, infoTributaria, lista, num, persona, totalesDesde, txt } from './comun.ts';
import type { Nodo } from './comun.ts';

type Base = Omit<ComprobanteParseado, 'autorizacion' | 'advertencias'>;

export function parseGuiaRemision(raiz: Nodo): Base {
  const it = infoTributaria(raiz.infoTributaria || {});
  const inf: Nodo = raiz.infoGuiaRemision || {};
  const destinatarios: Destinatario[] = lista<Nodo>(raiz.destinatarios?.destinatario).map(d => ({
    identificacion: txt(d.identificacionDestinatario),
    razonSocial: txt(d.razonSocialDestinatario),
    direccion: txt(d.dirDestinatario) || undefined,
    motivoTraslado: txt(d.motivoTraslado) || undefined,
    docSustento: docSustento(d.codDocSustento, d.numDocSustento, d.fechaEmisionDocSustento),
    detalles: lista<Nodo>(d.detalles?.detalle).map(x => ({
      codigo: txt(x.codigoInterno) || undefined,
      descripcion: txt(x.descripcion),
      cantidad: num(x.cantidad),
    })),
  }));
  const principal = destinatarios[0];

  return {
    ...it,
    tipo: '06',
    tipoNombre: TIPOS_COMPROBANTE['06'].nombre,
    version: txt(raiz['@_version']) || undefined,
    emisor: { ...it.emisor, obligadoContabilidad: txt(inf.obligadoContabilidad) || undefined, contribuyenteEspecial: txt(inf.contribuyenteEspecial) || undefined },
    receptor: principal
      ? { identificacion: principal.identificacion, razonSocial: principal.razonSocial, direccion: principal.direccion }
      : persona('', '', ''),
    // La guía no tiene fecha de emisión: se usa la de inicio del transporte
    fechaEmision: fecha(inf.fechaIniTransporte),
    moneda: 'DOLAR',
    impuestos: [],
    totales: totalesDesde([], {}),
    formasPago: [],
    detalles: destinatarios.flatMap(d =>
      d.detalles.map(x => ({ codigoPrincipal: x.codigo, descripcion: x.descripcion, cantidad: x.cantidad, precioUnitario: 0, descuento: 0, precioTotalSinImpuesto: 0, impuestos: [] }))
    ),
    transporte: {
      transportista: persona(inf.tipoIdentificacionTransportista, inf.rucTransportista, inf.razonSocialTransportista),
      placa: txt(inf.placa) || undefined,
      dirPartida: txt(inf.dirPartida) || undefined,
      fechaInicio: fecha(inf.fechaIniTransporte) || undefined,
      fechaFin: fecha(inf.fechaFinTransporte) || undefined,
    },
    destinatarios,
    infoAdicional: infoAdicional(raiz.infoAdicional),
  };
}
