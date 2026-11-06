/**
 * Tipos y catálogos del módulo de comprobantes recibidos (según la Ficha Técnica de
 * Comprobantes Electrónicos – Esquema Offline del SRI).
 */

export type CodigoComprobante = '01' | '03' | '04' | '05' | '06' | '07';

export const TIPOS_COMPROBANTE: Record<CodigoComprobante, { nombre: string; raiz: string }> = {
  '01': { nombre: 'Factura', raiz: 'factura' },
  '03': { nombre: 'Liquidación de compra', raiz: 'liquidacionCompra' },
  '04': { nombre: 'Nota de crédito', raiz: 'notaCredito' },
  '05': { nombre: 'Nota de débito', raiz: 'notaDebito' },
  '06': { nombre: 'Guía de remisión', raiz: 'guiaRemision' },
  '07': { nombre: 'Comprobante de retención', raiz: 'comprobanteRetencion' },
};

/** Tabla 17: código de porcentaje de IVA → tarifa */
export const TARIFAS_IVA: Record<string, { tarifa: number; nombre: string }> = {
  '0': { tarifa: 0, nombre: '0%' },
  '2': { tarifa: 12, nombre: '12%' },
  '3': { tarifa: 14, nombre: '14%' },
  '4': { tarifa: 15, nombre: '15%' },
  '5': { tarifa: 5, nombre: '5%' },
  '6': { tarifa: 0, nombre: 'No objeto de IVA' },
  '7': { tarifa: 0, nombre: 'Exento de IVA' },
  '8': { tarifa: 8, nombre: 'IVA diferenciado' },
  '10': { tarifa: 13, nombre: '13%' },
};

/** Tabla 16: código de impuesto */
export const IMPUESTOS: Record<string, string> = { '2': 'IVA', '3': 'ICE', '5': 'IRBPNR' };

/** Códigos de impuesto en retenciones */
export const IMPUESTOS_RETENCION: Record<string, string> = { '1': 'Renta', '2': 'IVA', '6': 'ISD' };

/** Tabla 24: formas de pago */
export const FORMAS_PAGO: Record<string, string> = {
  '01': 'Sin utilización del sistema financiero',
  '15': 'Compensación de deudas',
  '16': 'Tarjeta de débito',
  '17': 'Dinero electrónico',
  '18': 'Tarjeta prepago',
  '19': 'Tarjeta de crédito',
  '20': 'Otros con utilización del sistema financiero',
  '21': 'Endoso de títulos',
};

export interface Persona {
  tipoIdentificacion?: string;
  identificacion: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
}

export interface ImpuestoValor {
  codigo: string;
  codigoNombre?: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
  descuentoAdicional?: number;
}

export interface FormaPago {
  codigo: string;
  nombre: string;
  total: number;
  plazo?: number;
  unidadTiempo?: string;
}

export interface Detalle {
  codigoPrincipal?: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  impuestos: ImpuestoValor[];
}

/** Bases imponibles desagregadas (necesarias para el ATS) */
export interface Totales {
  subtotalSinImpuestos: number;
  descuento: number;
  base15: number;
  base12: number;
  base5: number;
  /** Otras tarifas gravadas (13 %, 14 %, diferenciado) */
  baseOtrasTarifas: number;
  base0: number;
  noObjeto: number;
  exento: number;
  iva: number;
  ice: number;
  irbpnr: number;
  propina: number;
  total: number;
}

export interface DocumentoSustento {
  codDoc: string;
  numero: string;
  fechaEmision?: string;
}

export interface Retencion {
  /** 1 Renta · 2 IVA · 6 ISD */
  codigo: string;
  impuesto: string;
  codigoRetencion: string;
  baseImponible: number;
  porcentaje: number;
  valorRetenido: number;
  docSustento?: DocumentoSustento;
}

export interface Destinatario {
  identificacion: string;
  razonSocial: string;
  direccion?: string;
  motivoTraslado?: string;
  docSustento?: DocumentoSustento;
  detalles: { codigo?: string; descripcion: string; cantidad: number }[];
}

export interface ComprobanteParseado {
  claveAcceso: string;
  tipo: CodigoComprobante;
  tipoNombre: string;
  version?: string;
  ambiente: 'PRUEBAS' | 'PRODUCCION';
  emisor: Persona & { dirMatriz?: string; obligadoContabilidad?: string; contribuyenteEspecial?: string; regimen?: string };
  /** Comprador / sujeto retenido / destinatario según el tipo */
  receptor: Persona;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  numero: string;
  /** 'YYYY-MM-DD' */
  fechaEmision: string;
  moneda: string;
  totales: Totales;
  impuestos: ImpuestoValor[];
  formasPago: FormaPago[];
  detalles: Detalle[];
  /** Notas de crédito y débito: documento que modifican */
  documentoModificado?: DocumentoSustento;
  motivo?: string;
  /** Notas de débito */
  motivos?: { razon: string; valor: number }[];
  /** Comprobantes de retención */
  periodoFiscal?: string;
  retenciones?: Retencion[];
  totalRetenido?: number;
  /** Guías de remisión */
  transporte?: { transportista: Persona; placa?: string; dirPartida?: string; fechaInicio?: string; fechaFin?: string };
  destinatarios?: Destinatario[];
  infoAdicional: Record<string, string>;
  /** Datos de la autorización (si el XML venía envuelto en <autorizacion>) */
  autorizacion?: { estado: string; numero: string; fecha: string };
  /** Observaciones no bloqueantes (p. ej. totales que no cuadran) */
  advertencias: string[];
}
