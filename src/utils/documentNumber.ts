/**
 * Formato de la numeración de documentos (compartido entre el navegador y el servidor).
 *
 *   Proforma         #000001            (6 dígitos)
 *   Nota de venta    #0000001           (7 dígitos)
 *   Factura          001-001-000000001  (establecimiento-punto de emisión-secuencial de 9 dígitos)
 *   Nota de crédito  001-001-000000001  (misma forma, serie PROPIA e independiente de las facturas)
 */

export type SequenceType = 'factura' | 'nota_credito' | 'nota_venta' | 'proforma';

export const SEQUENCE_LABELS: Record<SequenceType, string> = {
  factura: 'Facturas',
  nota_credito: 'Notas de crédito',
  nota_venta: 'Notas de venta',
  proforma: 'Proformas',
};

export const SEQUENCE_TYPES: SequenceType[] = ['proforma', 'nota_venta', 'factura', 'nota_credito'];

/** Las facturas y notas de crédito llevan una serie por establecimiento y punto de emisión. */
export const isSeriesDocument = (t: SequenceType) => t === 'factura' || t === 'nota_credito';

export const padCode = (value: string | undefined, len: number, fallback: string) =>
  String(value || fallback).replace(/\D/g, '').padStart(len, '0').slice(-len);

/** Clave del contador: 'factura:001-001', 'nota_venta', 'proforma'… */
export const sequenceKey = (type: SequenceType, estab?: string, pto?: string) =>
  isSeriesDocument(type) ? `${type}:${padCode(estab, 3, '001')}-${padCode(pto, 3, '001')}` : type;

export const formatDocumentNumber = (type: SequenceType, n: number, estab?: string, pto?: string): string => {
  const num = Math.max(0, Math.floor(n));
  switch (type) {
    case 'proforma':
      return `#${String(num).padStart(6, '0')}`;
    case 'nota_venta':
      return `#${String(num).padStart(7, '0')}`;
    default:
      return `${padCode(estab, 3, '001')}-${padCode(pto, 3, '001')}-${String(num).padStart(9, '0')}`;
  }
};

/**
 * Extrae el secuencial de un número ya emitido SOLO si respeta el formato vigente de esa serie
 * (los números con formato antiguo no cuentan). Devuelve 0 si no corresponde.
 */
export const parseDocumentSequential = (type: SequenceType, docNumber: string, estab?: string, pto?: string): number => {
  const text = String(docNumber || '').trim();
  if (isSeriesDocument(type)) {
    const m = /^(\d{3})-(\d{3})-(\d{9})$/.exec(text);
    if (!m) return 0;
    if (m[1] !== padCode(estab, 3, '001') || m[2] !== padCode(pto, 3, '001')) return 0;
    return parseInt(m[3], 10) || 0;
  }
  const m = /^#(\d+)$/.exec(text);
  return m ? parseInt(m[1], 10) || 0 : 0;
};
