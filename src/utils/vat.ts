/**
 * IVA: una sola regla para todo el sistema.
 *
 *  - Catálogo de servicios e inventario guardan el precio SIN IVA + su tarifa de IVA.
 *  - El "precio estimado" de una cita (y el total de una proforma) es lo que paga el cliente: YA INCLUYE IVA.
 *
 * Al facturar, un precio que ya incluye IVA se DESGLOSA (base + IVA); nunca se le vuelve a sumar el IVA.
 */

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** Tarifa general vigente (las tarifas antiguas 12 % / 8 % pasan a 15 %). */
export const standardVatRate = (configured?: number) =>
  !configured || configured === 8 || configured === 12 ? 15 : configured;

/** Separa un total que ya incluye IVA en base imponible + IVA (la suma da exactamente el total). */
export function splitVatIncluded(totalWithVat: number, rate: number) {
  const total = r2(totalWithVat);
  const base = rate > 0 ? r2(total / (1 + rate / 100)) : total;
  return { base, tax: r2(total - base), total };
}
