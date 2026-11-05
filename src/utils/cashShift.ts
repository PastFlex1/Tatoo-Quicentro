import { CashShift, CashShiftSummary, CreditNoteRecord, ExpenseRecord, SaleRecord } from '../types';

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** Denominaciones de dólar en circulación en Ecuador (billetes y monedas). */
export const CASH_BILLS = ['100', '50', '20', '10', '5', '1'];
export const CASH_COINS = ['1', '0.50', '0.25', '0.10', '0.05', '0.01'];
/** Claves únicas: el dólar en moneda se guarda como 'c1' para no chocar con el billete de $1 */
export const denomKey = (value: string, kind: 'bill' | 'coin') => (kind === 'coin' && value === '1' ? 'c1' : value);
export const denomValue = (key: string) => (key === 'c1' ? 1 : parseFloat(key));

export const totalFromDenominations = (d: Record<string, number>) =>
  r2(Object.entries(d).reduce((acc, [k, q]) => acc + denomValue(k) * (q || 0), 0));

/** ¿La fecha cae dentro del turno (desde la apertura hasta el cierre o ahora)? */
export const isWithinShift = (dateStr: string, shift: CashShift) => {
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  const start = new Date(shift.openedAt).getTime();
  const end = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now() + 60_000;
  return t >= start && t <= end;
};

/** Cómo se cobró una venta: efectivo / tarjeta / transferencia y si la propina entró en efectivo. */
export function saleCashParts(s: SaleRecord) {
  const paid = s.amountPaidNow ?? s.total;
  const tip = s.tipAmount || 0;
  let cash = 0,
    card = 0,
    transfer = 0;
  if (s.paymentMethod === 'cash') cash = paid;
  else if (s.paymentMethod === 'card') card = paid;
  else if (s.paymentMethod === 'transfer') transfer = paid;
  else {
    cash = s.cashPaid || 0;
    card = s.cardPaid || 0;
    transfer = s.transferPaid || 0;
  }
  const tipInCash = s.paymentMethod === 'cash' || s.paymentMethod === 'split';
  return { paid, tip, cash, card, transfer, tipInCash };
}

export interface ShiftTransaction {
  id: string;
  date: string;
  kind: 'venta' | 'gasto' | 'pago_artista' | 'devolucion' | 'ingreso' | 'retiro' | 'deposito_banco';
  label: string;
  method: string;
  /** Efecto en el cajón de efectivo (+ entra, − sale, 0 no afecta) */
  cashEffect: number;
  amount: number;
}

/**
 * Calcula el resumen de un turno: todo lo cobrado y pagado entre la apertura y el cierre.
 * Efectivo esperado = fondo + ventas en efectivo + propinas en efectivo + ingresos
 *                     − gastos en efectivo − pagos a artistas − devoluciones − retiros − depósitos.
 */
export function computeShiftSummary(
  shift: CashShift,
  sales: SaleRecord[],
  expenses: ExpenseRecord[],
  creditNotes: CreditNoteRecord[]
): { summary: CashShiftSummary; transactions: ShiftTransaction[] } {
  const tx: ShiftTransaction[] = [];
  let cashSales = 0,
    cardSales = 0,
    transferSales = 0,
    cashTips = 0,
    otherTips = 0,
    invoicesCount = 0,
    salesNotesCount = 0,
    grossSales = 0;

  sales
    .filter(s => isWithinShift(s.date, shift))
    // Las ventas anuladas (por nota de crédito o por anulación) sí ingresaron dinero: la devolución se resta aparte
    .filter(s => s.status !== 'cancelled' || Boolean(s.creditNoteNumber) || Boolean(s.voidedAt))
    .forEach(s => {
      const { paid, tip, cash, card, transfer, tipInCash } = saleCashParts(s);
      cashSales += cash;
      cardSales += card;
      transferSales += transfer;
      if (tipInCash) cashTips += tip;
      else otherTips += tip;
      grossSales += s.total || 0;
      if (s.documentType === 'nota_venta') salesNotesCount++;
      else invoicesCount++;
      tx.push({
        id: s.id,
        date: s.date,
        kind: 'venta',
        label: `${s.invoiceNumber} · ${s.serviceName} (${s.clientName})`,
        method:
          s.paymentMethod === 'cash'
            ? 'Efectivo'
            : s.paymentMethod === 'card'
            ? 'Tarjeta'
            : s.paymentMethod === 'transfer'
            ? 'Transferencia'
            : 'Mixto',
        cashEffect: cash + (tipInCash ? tip : 0),
        amount: paid + tip,
      });
    });

  let cashExpenses = 0,
    cashArtistPayouts = 0;
  expenses
    .filter(e => isWithinShift(e.date, shift))
    .forEach(e => {
      const isCash = e.paymentMethod === 'cash';
      const isPayout = e.category === 'artist_payout';
      if (isCash) {
        if (isPayout) cashArtistPayouts += e.amount;
        else cashExpenses += e.amount;
      }
      tx.push({
        id: e.id,
        date: e.date,
        kind: isPayout ? 'pago_artista' : 'gasto',
        label: e.description,
        method: isCash ? 'Efectivo' : e.paymentMethod === 'credit_card' ? 'Tarjeta' : 'Transferencia',
        cashEffect: isCash ? -e.amount : 0,
        amount: e.amount,
      });
    });

  let cashRefunds = 0;
  const salesById = new Map(sales.map(s => [s.id, s]));
  creditNotes
    .filter(cn => isWithinShift(cn.date, shift) && cn.sriStatus !== 'ANULADO')
    .forEach(cn => {
      const sale = salesById.get(cn.affectedInvoiceId);
      const isCash = sale?.paymentMethod === 'cash';
      const refund = cn.total + (cn.reason === 'ANULACION_TOTAL' && isCash ? sale?.tipAmount || 0 : 0);
      if (isCash) cashRefunds += refund;
      tx.push({
        id: cn.id,
        date: cn.date,
        kind: 'devolucion',
        label: `NC ${cn.creditNoteNumber} sobre ${cn.affectedInvoiceNumber}`,
        method: isCash ? 'Efectivo' : 'Banco',
        cashEffect: isCash ? -refund : 0,
        amount: refund,
      });
    });

  // Anulaciones de comprobantes: se devuelve al cliente lo cobrado; el efectivo sale del cajón del turno en que se anula
  sales
    .filter(s => s.voidedAt && isWithinShift(s.voidedAt, shift))
    .forEach(s => {
      const { paid, tip, cash, tipInCash } = saleCashParts(s);
      const refundCash = cash + (tipInCash ? tip : 0);
      cashRefunds += refundCash;
      tx.push({
        id: `void-${s.id}`,
        date: s.voidedAt as string,
        kind: 'devolucion',
        label: `Anulación ${s.invoiceNumber} (${s.clientName})`,
        method: refundCash > 0 ? 'Efectivo' : 'Banco / tarjeta',
        cashEffect: -refundCash,
        amount: paid + tip,
      });
    });

  let manualIn = 0,
    manualOut = 0,
    bankDeposits = 0;
  (shift.movements || []).forEach(m => {
    if (m.type === 'ingreso') manualIn += m.amount;
    else if (m.type === 'retiro') manualOut += m.amount;
    else bankDeposits += m.amount;
    tx.push({
      id: m.id,
      date: m.date,
      kind: m.type,
      label: m.concept,
      method: 'Efectivo',
      cashEffect: m.type === 'ingreso' ? m.amount : -m.amount,
      amount: m.amount,
    });
  });

  const expectedCash =
    shift.openingCash + cashSales + cashTips + manualIn - cashExpenses - cashArtistPayouts - cashRefunds - manualOut - bankDeposits;

  tx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    summary: {
      openingCash: r2(shift.openingCash),
      salesCount: invoicesCount + salesNotesCount,
      invoicesCount,
      salesNotesCount,
      grossSales: r2(grossSales),
      cashSales: r2(cashSales),
      cardSales: r2(cardSales),
      transferSales: r2(transferSales),
      cashTips: r2(cashTips),
      otherTips: r2(otherTips),
      cashExpenses: r2(cashExpenses),
      cashArtistPayouts: r2(cashArtistPayouts),
      cashRefunds: r2(cashRefunds),
      manualIn: r2(manualIn),
      manualOut: r2(manualOut),
      bankDeposits: r2(bankDeposits),
      expectedCash: r2(expectedCash),
    },
    transactions: tx,
  };
}
