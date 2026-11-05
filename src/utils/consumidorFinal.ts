/**
 * Reglas del SRI sobre el CONSUMIDOR FINAL (identificación 9999999999999).
 *
 *  1. Los comprobantes de venta (facturas y notas de venta) solo se pueden emitir a consumidor final
 *     hasta USD 50,00. Si el valor supera ese monto, el emisor debe identificar al comprador.
 *  2. No se pueden emitir notas de crédito a consumidor final: al no estar identificado el comprador,
 *     el comprobante no se puede modificar con una nota de crédito.
 *
 * Estas reglas se aplican en un solo lugar para que ningún camino de facturación (POS, agenda,
 * proformas, venta manual) pueda saltárselas.
 */

export const CONSUMIDOR_FINAL_ID = '9999999999999';
export const CONSUMIDOR_FINAL_LIMIT = 50;

const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** ¿La identificación corresponde a consumidor final? (vacía o solo nueves) */
export const isConsumidorFinal = (dni?: string | null): boolean => {
  const d = String(dni ?? '').trim();
  return d === '' || /^9{10,13}$/.test(d);
};

/**
 * ¿La venta supera el límite permitido a consumidor final?
 * Se compara el importe total del comprobante (con IVA y propina), que es lo que revisa el SRI.
 */
export const exceedsConsumidorFinalLimit = (dni: string | null | undefined, importeTotal: number): boolean =>
  isConsumidorFinal(dni) && round2(importeTotal) > CONSUMIDOR_FINAL_LIMIT;

export const consumidorFinalLimitMessage = (importeTotal: number) =>
  `Por ley, a consumidor final solo se puede facturar hasta $${CONSUMIDOR_FINAL_LIMIT.toFixed(2)} (este comprobante suma $${round2(importeTotal).toFixed(2)}). ` +
  'Ingrese la cédula, RUC o pasaporte del comprador para continuar.';

export const CONSUMIDOR_FINAL_CREDIT_NOTE_MESSAGE =
  'No se puede emitir una nota de crédito sobre una factura a CONSUMIDOR FINAL: por ley el comprador debe estar identificado. ' +
  'Una factura a consumidor final no se modifica con nota de crédito.';
