/**
 * Motor contable único del estudio.
 *
 * Todas las secciones (ventas, notas de crédito, gastos, compras/órdenes de compra,
 * kardex de insumos, liquidaciones y anticipos a artistas, caja y asientos manuales)
 * generan sus asientos de partida doble AQUÍ. El Libro Diario, el Libro Mayor,
 * el Balance de Comprobación y los reportes leen siempre de este motor, de modo que
 * los saldos coinciden en todas las pantallas.
 */
import {
  ArtistSettlement,
  CashShift,
  CreditNoteRecord,
  ExpenseRecord,
  JournalEntryLine,
  KardexMovement,
  ManualJournalEntry,
  PurchaseOrder,
  SaleRecord,
} from '../types';

export interface AccountDefinition {
  code: string;
  name: string;
  group: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Costos' | 'Gastos';
  nature: 'debit' | 'credit';
}

export const CHART_OF_ACCOUNTS: AccountDefinition[] = [
  { code: '1101', name: 'Caja General (Efectivo en Estudio)', group: 'Activo', nature: 'debit' },
  { code: '1102', name: 'Bancos, Datáfono POS & Transferencias', group: 'Activo', nature: 'debit' },
  { code: '1105', name: 'Inventario de Insumos, Tintas & Joyería', group: 'Activo', nature: 'debit' },
  { code: '1106', name: 'IVA Pagado en Compras (Crédito Tributario)', group: 'Activo', nature: 'debit' },
  { code: '1201', name: 'Mobiliario, Camillas & Autoclaves (Activo Fijo)', group: 'Activo', nature: 'debit' },
  { code: '2101', name: 'Comisiones y Propinas por Pagar a Artistas', group: 'Pasivo', nature: 'credit' },
  { code: '2102', name: 'IVA en Ventas por Pagar', group: 'Pasivo', nature: 'credit' },
  { code: '2103', name: 'Cuentas y Proveedores por Pagar', group: 'Pasivo', nature: 'credit' },
  { code: '3101', name: 'Capital & Fondo Operativo del Estudio', group: 'Patrimonio', nature: 'credit' },
  { code: '4101', name: 'Ingresos por Servicios de Tatuaje', group: 'Ingresos', nature: 'credit' },
  { code: '4102', name: 'Ingresos por Servicios de Body Piercing', group: 'Ingresos', nature: 'credit' },
  { code: '4103', name: 'Ingresos por Venta de Joyería & Aftercare', group: 'Ingresos', nature: 'credit' },
  { code: '4104', name: 'Otros Ingresos (Recuperaciones y Sobrantes)', group: 'Ingresos', nature: 'credit' },
  { code: '5101', name: 'Costo Directo: Comisiones de Artistas', group: 'Costos', nature: 'debit' },
  { code: '5102', name: 'Costo Directo: Insumos, Agujas & Joyería', group: 'Costos', nature: 'debit' },
  { code: '5201', name: 'Gastos Operativos (Alquiler, Luz, Sanidad)', group: 'Gastos', nature: 'debit' },
  { code: '5202', name: 'Gastos Financieros, Software & Datáfono/TPV', group: 'Gastos', nature: 'debit' },
];

export const getAccountName = (code: string): string =>
  CHART_OF_ACCOUNTS.find(a => a.code === code)?.name || 'Cuenta Contable';

export type JournalSource =
  | 'manual'
  | 'sale'
  | 'credit_note'
  | 'expense'
  | 'purchase'
  | 'kardex'
  | 'settlement'
  | 'shift';

export const JOURNAL_SOURCE_LABELS: Record<JournalSource, string> = {
  manual: 'Manual',
  sale: 'Ventas',
  credit_note: 'Notas de Crédito',
  expense: 'Gastos',
  purchase: 'Compras / Inventario',
  kardex: 'Kardex (Consumo)',
  settlement: 'Pagos a Artistas',
  shift: 'Caja',
};

export interface UnifiedJournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  reference: string;
  concept: string;
  source: JournalSource;
  entryType: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  manualRecord?: ManualJournalEntry;
}

export interface LedgerPosting {
  id: string;
  date: string;
  reference: string;
  accountCode: string;
  concept: string;
  debit: number;
  credit: number;
  source: JournalSource;
  manualId?: string;
}

export interface AccountingInput {
  sales: SaleRecord[];
  creditNotes: CreditNoteRecord[];
  expenses: ExpenseRecord[];
  settlements: ArtistSettlement[];
  kardexMovements: KardexMovement[];
  manualJournalEntries: ManualJournalEntry[];
  purchaseOrders: PurchaseOrder[];
  shifts: CashShift[];
}

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

const revenueAccountFor = (category: string) =>
  category === 'tattoo' ? '4101' : category === 'piercing' ? '4102' : '4103';

const INVENTORY_EXPENSE_CATEGORIES = ['jewelry_restock', 'supplies_tattoo', 'supplies_piercing'];

const expenseAccountFor = (category: string): string => {
  if (INVENTORY_EXPENSE_CATEGORIES.includes(category)) return '5102';
  if (category === 'software_terminals') return '5202';
  if (category === 'maintenance') return '5201';
  return '5201';
};

class EntryBuilder {
  lines: JournalEntryLine[] = [];
  constructor(private prefix: string) {}
  debit(accountCode: string, amount: number, concept: string) {
    const v = r2(amount);
    if (v > 0) {
      this.lines.push({
        id: `${this.prefix}-${this.lines.length}`,
        accountCode,
        accountName: getAccountName(accountCode),
        concept,
        debit: v,
        credit: 0,
      });
    }
    return this;
  }
  credit(accountCode: string, amount: number, concept: string) {
    const v = r2(amount);
    if (v > 0) {
      this.lines.push({
        id: `${this.prefix}-${this.lines.length}`,
        accountCode,
        accountName: getAccountName(accountCode),
        concept,
        debit: 0,
        credit: v,
      });
    }
    return this;
  }
}

const finalize = (
  base: Omit<UnifiedJournalEntry, 'totalDebit' | 'totalCredit' | 'isBalanced' | 'lines'>,
  lines: JournalEntryLine[]
): UnifiedJournalEntry | null => {
  if (lines.length === 0) return null;
  const totalDebit = r2(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = r2(lines.reduce((s, l) => s + (l.credit || 0), 0));
  return { ...base, lines, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
};

/** Parte del cobro que entró por caja (efectivo); el resto se registra en bancos. */
const cashPortionOfSale = (s: SaleRecord, collected: number): number => {
  if (s.paymentMethod === 'cash') return collected;
  if (s.paymentMethod === 'split') return Math.min(collected, Math.max(0, s.cashPaid || 0));
  return 0;
};

export function buildJournalEntries(input: AccountingInput): UnifiedJournalEntry[] {
  const list: UnifiedJournalEntry[] = [];
  const push = (e: UnifiedJournalEntry | null) => {
    if (e) list.push(e);
  };
  const salesById = new Map(input.sales.map(s => [s.id, s]));

  // ---------------------------------------------------------------- 1. ASIENTOS MANUALES
  input.manualJournalEntries.forEach(mj => {
    if (mj.status === 'anulado') return;
    const lines: JournalEntryLine[] =
      mj.lines && mj.lines.length > 0
        ? mj.lines.map(l => ({
            ...l,
            debit: l.debit || l.debe || 0,
            credit: l.credit || l.haber || 0,
            accountName: l.accountName || getAccountName(l.accountCode),
          }))
        : new EntryBuilder(`mj-${mj.id}`)
            .debit(mj.debitAccountCode || '1101', mj.amount || 0, mj.concept)
            .credit(mj.creditAccountCode || '3101', mj.amount || 0, mj.concept).lines;
    push(
      finalize(
        {
          id: mj.id,
          entryNumber: mj.entryNumber || mj.reference || `ASI-${mj.id.slice(-4)}`,
          date: mj.date,
          reference: mj.reference || 'S/R',
          concept: mj.concept,
          source: 'manual',
          entryType: mj.entryType ? mj.entryType.toUpperCase() : 'MANUAL',
          manualRecord: mj,
        },
        lines
      )
    );
  });

  // ---------------------------------------------------------------- 2. VENTAS (FACTURAS / NOTAS DE VENTA)
  // Las ventas anuladas por nota de crédito se mantienen: la reversa la hace la nota de crédito.
  input.sales
    .filter(s => s.status !== 'cancelled' || Boolean(s.creditNoteNumber))
    .forEach(s => {
      const tip = r2(s.tipAmount || 0);
      const tax = r2(s.taxAmount || 0);
      const collected = r2((s.total || 0) + tip);
      const revenue = r2(collected - tax - tip);
      const cash = r2(cashPortionOfSale(s, collected));
      const bank = r2(collected - cash);
      const b = new EntryBuilder(`sale-${s.id}`)
        .debit('1101', cash, `Cobro en efectivo: ${s.serviceName}`)
        .debit('1102', bank, `Cobro ${s.paymentMethod === 'card' ? 'con tarjeta' : s.paymentMethod === 'split' ? 'mixto (POS/banco)' : 'por transferencia'}`)
        .credit(revenueAccountFor(s.serviceCategory), revenue, `Venta: ${s.serviceName}`)
        .credit('2102', tax, `IVA en ventas (${s.taxRate || 0}%)`)
        .credit('2101', tip, `Propina para ${s.artistName}`)
        .debit('5101', s.artistShare || 0, `Comisión ${s.artistName} (${s.artistCommissionPercent || 0}%)`)
        .credit('2101', s.artistShare || 0, `Comisión por pagar a ${s.artistName}`);
      push(
        finalize(
          {
            id: `sale-entry-${s.id}`,
            entryNumber: s.invoiceNumber,
            date: s.date,
            reference: s.invoiceNumber,
            concept: `Venta ${s.serviceName} - Cliente: ${s.clientName}`,
            source: 'sale',
            entryType: s.documentType === 'nota_venta' ? 'NOTA DE VENTA' : 'FACTURA',
          },
          b.lines
        )
      );
    });

  // ---------------------------------------------------------------- 3. NOTAS DE CRÉDITO (reverso de ventas)
  input.creditNotes.forEach(cn => {
    if (cn.sriStatus === 'ANULADO') return;
    const sale = salesById.get(cn.affectedInvoiceId);
    const isTotal = cn.reason === 'ANULACION_TOTAL';
    const refundCash = sale ? sale.paymentMethod === 'cash' : false;
    const b = new EntryBuilder(`cn-${cn.id}`)
      .debit(revenueAccountFor(sale?.serviceCategory || 'tattoo'), cn.subtotal, `Devolución/descuento sobre ${cn.affectedInvoiceNumber}`)
      .debit('2102', cn.taxAmount, 'Reverso de IVA en ventas')
      .credit(refundCash ? '1101' : '1102', cn.total, `Reembolso al cliente ${cn.clientName}`);
    if (isTotal && sale) {
      // La anulación total quita la comisión y la propina del artista (igual que su saldo de liquidación)
      b.debit('2101', sale.artistShare || 0, `Reverso de comisión de ${sale.artistName}`)
        .credit('5101', sale.artistShare || 0, 'Reverso de costo de comisión')
        .debit('2101', sale.tipAmount || 0, `Reverso de propina de ${sale.artistName}`)
        .credit(refundCash ? '1101' : '1102', sale.tipAmount || 0, 'Devolución de propina');
    }
    push(
      finalize(
        {
          id: `cn-entry-${cn.id}`,
          entryNumber: cn.creditNoteNumber,
          date: cn.date,
          reference: cn.creditNoteNumber,
          concept: `Nota de crédito sobre factura ${cn.affectedInvoiceNumber}: ${cn.reasonDescription}`,
          source: 'credit_note',
          entryType: 'NOTA DE CRÉDITO',
        },
        b.lines
      )
    );
  });

  // ---------------------------------------------------------------- 4. PAGOS A ARTISTAS (liquidaciones y anticipos)
  const settlementKeys = new Set<string>();
  input.settlements.forEach(st => {
    settlementKeys.add(`${st.date}|${st.artistName}`);
    if (st.receiptNumber) settlementKeys.add(`ref|${st.receiptNumber}`);
    const applied = r2((st.commissionEarned || 0) + (st.tipsEarned || 0));
    const isAdvance = st.type === 'anticipo';
    const payAccount = st.paymentMethod === 'cash' ? '1101' : '1102';
    const b = new EntryBuilder(`st-${st.id}`)
      .debit('2101', applied, isAdvance ? `Anticipo a ${st.artistName}` : `Liquidación a ${st.artistName}`)
      .credit(payAccount, st.amountPaid, `Pago ${st.paymentMethod === 'cash' ? 'en efectivo' : 'por transferencia'}`)
      .credit('4104', st.deductions || 0, 'Deducciones (insumos / préstamos recuperados)');
    push(
      finalize(
        {
          id: `st-entry-${st.id}`,
          entryNumber: st.receiptNumber || `LIQ-${st.id.slice(-6)}`,
          date: st.date,
          reference: st.receiptNumber || st.id,
          concept: st.notes || `Pago a artista ${st.artistName}`,
          source: 'settlement',
          entryType: isAdvance ? 'ANTICIPO ARTISTA' : 'LIQUIDACIÓN ARTISTA',
        },
        b.lines
      )
    );
  });

  // ---------------------------------------------------------------- 5. KARDEX (inventario)
  const purchaseInRefs = new Set<string>();
  input.kardexMovements.forEach(m => {
    const b = new EntryBuilder(`kdx-${m.id}`);
    let entryType = '';
    let source: JournalSource = 'kardex';
    if (m.type === 'initial' && m.totalIn > 0) {
      b.debit('1105', m.totalIn, `Inventario inicial: ${m.itemName}`).credit('3101', m.totalIn, 'Aporte de inventario inicial');
      entryType = 'INVENTARIO INICIAL';
    } else if (m.type === 'purchase_in' && m.totalIn > 0) {
      purchaseInRefs.add(m.reference);
      b.debit('1105', m.totalIn, `Ingreso a bodega: ${m.itemName} (${m.quantityIn} ${m.unit})`).credit(
        '2103',
        m.totalIn,
        `Compra por pagar (${m.reference})`
      );
      entryType = 'COMPRA INVENTARIO';
      source = 'purchase';
    } else if (m.totalOut > 0) {
      b.debit('5102', m.totalOut, `Consumo: ${m.itemName} (${m.quantityOut} ${m.unit})`).credit(
        '1105',
        m.totalOut,
        'Descargo de inventario'
      );
      entryType = m.type === 'retail_sale' ? 'COSTO DE VENTA' : m.type === 'adjustment' ? 'AJUSTE INVENTARIO' : 'CONSUMO CABINA';
    } else if (m.type === 'adjustment' && m.totalIn > 0) {
      b.debit('1105', m.totalIn, `Reingreso a bodega: ${m.itemName}`).credit('5102', m.totalIn, 'Reverso de costo de insumos');
      entryType = 'AJUSTE INVENTARIO';
    }
    push(
      finalize(
        {
          id: `kdx-entry-${m.id}`,
          entryNumber: m.reference || `KDX-${m.id.slice(-5)}`,
          date: m.date,
          reference: m.reference,
          concept: m.concept,
          source,
          entryType,
        },
        b.lines
      )
    );
  });

  // ---------------------------------------------------------------- 6. GASTOS Y PAGOS A PROVEEDORES
  input.expenses.forEach(exp => {
    const payAccount = exp.paymentMethod === 'cash' ? '1101' : '1102';
    const tax = r2(exp.taxAmount || 0);
    const base = r2((exp.amount || 0) - tax);
    const refCode = exp.invoiceReference || `GAS-${exp.id.slice(-4)}`;

    // Pagos a artistas ya registrados por la liquidación/anticipo → no duplicar
    if (exp.category === 'artist_payout') {
      if (
        settlementKeys.has(`${exp.date}|${exp.supplier}`) ||
        (exp.invoiceReference && settlementKeys.has(`ref|${exp.invoiceReference}`))
      ) {
        return;
      }
      const b = new EntryBuilder(`exp-${exp.id}`)
        .debit('2101', exp.amount, exp.description)
        .credit(payAccount, exp.amount, `Pago a ${exp.supplier}`);
      push(
        finalize(
          { id: `exp-entry-${exp.id}`, entryNumber: refCode, date: exp.date, reference: refCode, concept: exp.description, source: 'settlement', entryType: 'PAGO ARTISTA' },
          b.lines
        )
      );
      return;
    }

    // Pago de una orden de compra cuya mercadería ya ingresó por kardex → cancela la cuenta por pagar
    const po = input.purchaseOrders.find(
      p =>
        p.orderNumber &&
        (exp.invoiceReference === p.orderNumber || (exp.notes || '').includes(p.orderNumber)) &&
        purchaseInRefs.has(p.orderNumber)
    );
    if (po) {
      const b = new EntryBuilder(`exp-${exp.id}`)
        .debit('2103', base, `Pago a proveedor ${exp.supplier} (OC ${po.orderNumber})`)
        .debit('1106', tax, 'IVA pagado en compras')
        .credit(payAccount, exp.amount, `Pago a ${exp.supplier}`);
      push(
        finalize(
          {
            id: `exp-entry-${exp.id}`,
            entryNumber: refCode,
            date: exp.date,
            reference: refCode,
            concept: `Pago de compra ${po.orderNumber} - ${exp.supplier}`,
            source: 'purchase',
            entryType: 'PAGO PROVEEDOR',
          },
          b.lines
        )
      );
      return;
    }

    const account = expenseAccountFor(exp.category);
    const b = new EntryBuilder(`exp-${exp.id}`)
      .debit(account, base, exp.description)
      .debit('1106', tax, 'IVA pagado en compras')
      .credit(payAccount, exp.amount, `Pago a ${exp.supplier}`);
    push(
      finalize(
        {
          id: `exp-entry-${exp.id}`,
          entryNumber: refCode,
          date: exp.date,
          reference: refCode,
          concept: `Gasto: ${exp.description} (${exp.supplier})`,
          source: 'expense',
          entryType: INVENTORY_EXPENSE_CATEGORIES.includes(exp.category) ? 'COMPRA DE INSUMOS' : 'GASTO OPERATIVO',
        },
        b.lines
      )
    );
  });

  // ---------------------------------------------------------------- 7. CAJA (fondo inicial y diferencias de arqueo)
  const shifts = [...input.shifts].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
  const firstShift = shifts[0];
  if (firstShift && firstShift.openingCash > 0) {
    const b = new EntryBuilder(`shift-open-${firstShift.id}`)
      .debit('1101', firstShift.openingCash, 'Fondo inicial de caja')
      .credit('3101', firstShift.openingCash, 'Aporte de fondo operativo');
    push(
      finalize(
        {
          id: `shift-open-entry-${firstShift.id}`,
          entryNumber: 'APE-CAJA',
          date: firstShift.openedAt,
          reference: 'APE-CAJA',
          concept: `Fondo inicial de caja (${firstShift.openedBy})`,
          source: 'shift',
          entryType: 'APERTURA CAJA',
        },
        b.lines
      )
    );
  }
  shifts.forEach(sh => {
    (sh.movements || []).forEach(m => {
      const b = new EntryBuilder(`mov-${m.id}`);
      if (m.type === 'ingreso') b.debit('1101', m.amount, m.concept).credit('3101', m.amount, 'Ingreso de efectivo a caja');
      else if (m.type === 'deposito_banco') b.debit('1102', m.amount, 'Depósito de efectivo en banco').credit('1101', m.amount, m.concept);
      else b.debit('3101', m.amount, 'Retiro de efectivo (propietario)').credit('1101', m.amount, m.concept);
      push(
        finalize(
          {
            id: `mov-entry-${m.id}`,
            entryNumber: sh.shiftNumber || `MOV-${m.id.slice(-5)}`,
            date: m.date,
            reference: sh.shiftNumber || 'CAJA',
            concept: `${m.type === 'ingreso' ? 'Ingreso' : m.type === 'retiro' ? 'Retiro' : 'Depósito bancario'}: ${m.concept}`,
            source: 'shift',
            entryType: 'MOVIMIENTO CAJA',
          },
          b.lines
        )
      );
    });
    const diff = r2(sh.discrepancy || 0);
    if (sh.status !== 'closed' || Math.abs(diff) < 0.01) return;
    const b = new EntryBuilder(`shift-diff-${sh.id}`);
    if (diff < 0) b.debit('5201', -diff, 'Faltante de caja').credit('1101', -diff, 'Faltante en arqueo');
    else b.debit('1101', diff, 'Sobrante en arqueo').credit('4104', diff, 'Sobrante de caja');
    push(
      finalize(
        {
          id: `shift-diff-entry-${sh.id}`,
          entryNumber: sh.shiftNumber || `ARQ-${sh.id.slice(-5)}`,
          date: sh.closedAt || sh.openedAt,
          reference: sh.shiftNumber || `ARQ-${sh.id.slice(-5)}`,
          concept: `${diff < 0 ? 'Faltante' : 'Sobrante'} en cierre de caja (${sh.closedBy || sh.openedBy})`,
          source: 'shift',
          entryType: 'ARQUEO CAJA',
        },
        b.lines
      )
    );
  });

  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function buildPostings(entries: UnifiedJournalEntry[]): LedgerPosting[] {
  const list: LedgerPosting[] = [];
  entries.forEach(entry => {
    entry.lines.forEach((l, idx) => {
      if ((l.debit || 0) > 0 || (l.credit || 0) > 0) {
        list.push({
          id: `post-${entry.id}-${idx}`,
          date: entry.date,
          reference: entry.entryNumber,
          accountCode: l.accountCode,
          concept: l.concept || entry.concept,
          debit: l.debit || 0,
          credit: l.credit || 0,
          source: entry.source,
          manualId: entry.manualRecord?.id,
        });
      }
    });
  });
  return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Saldo por cuenta (según su naturaleza) a partir de los asientos. */
export function accountBalances(entries: UnifiedJournalEntry[]): Record<string, number> {
  const totals: Record<string, { d: number; c: number }> = {};
  entries.forEach(e =>
    e.lines.forEach(l => {
      totals[l.accountCode] = totals[l.accountCode] || { d: 0, c: 0 };
      totals[l.accountCode].d += l.debit || 0;
      totals[l.accountCode].c += l.credit || 0;
    })
  );
  const out: Record<string, number> = {};
  Object.entries(totals).forEach(([code, t]) => {
    const acc = CHART_OF_ACCOUNTS.find(a => a.code === code);
    out[code] = r2(acc?.nature === 'credit' ? t.c - t.d : t.d - t.c);
  });
  return out;
}
