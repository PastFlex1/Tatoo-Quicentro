import { SaleLineItem, SaleRecord, ServiceCategory } from '../types';

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** Línea normalizada de una venta (para XML SRI, comprobantes y contabilidad). */
export interface SaleLine {
  description: string;
  category: ServiceCategory;
  code: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  /** Base imponible = cantidad × precio − descuento */
  base: number;
  taxRate: number;
  taxAmount: number;
  hours?: number;
}

export const lineBase = (l: Pick<SaleLineItem, 'quantity' | 'unitPrice' | 'discount'>) =>
  r2(Math.max(0, l.quantity * l.unitPrice - (l.discount || 0)));

export const lineTax = (l: Pick<SaleLineItem, 'quantity' | 'unitPrice' | 'discount' | 'taxRate'>) =>
  r2((lineBase(l) * (l.taxRate || 0)) / 100);

/**
 * Devuelve las líneas de una venta. Las ventas antiguas (una sola línea) se convierten
 * a partir de sus campos agregados, de modo que todo el sistema trate ambas igual.
 */
export function saleLines(sale: SaleRecord): SaleLine[] {
  if (sale.items && sale.items.length > 0) {
    const lines = sale.items.map(it => ({
      description: it.description,
      category: it.category,
      code: (it.sku || it.category || 'SERV').toUpperCase().slice(0, 25),
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount || 0,
      base: lineBase(it),
      taxRate: it.taxRate || 0,
      taxAmount: lineTax(it),
      hours: it.hours,
    }));
    // Ajuste de redondeo: el IVA de las líneas debe sumar exactamente el IVA de la venta
    const diff = r2((sale.taxAmount || 0) - lines.reduce((a, l) => a + l.taxAmount, 0));
    if (Math.abs(diff) >= 0.01) {
      const target = lines.find(l => l.taxRate > 0) || lines[0];
      target.taxAmount = r2(target.taxAmount + diff);
    }
    return lines;
  }
  const qty = sale.pieces && sale.pieces > 0 ? sale.pieces : 1;
  return [
    {
      description: sale.serviceName,
      category: sale.serviceCategory,
      code: (sale.serviceCategory || 'SERV').toUpperCase(),
      quantity: qty,
      unitPrice: r2((sale.subtotal || 0) / qty),
      discount: sale.discount || 0,
      base: r2(Math.max(0, (sale.subtotal || 0) - (sale.discount || 0))),
      taxRate: sale.taxRate || 0,
      taxAmount: r2(sale.taxAmount || 0),
      hours: sale.hours,
    },
  ];
}
