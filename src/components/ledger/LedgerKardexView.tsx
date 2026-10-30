import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Boxes,
  Scale,
  PlusCircle,
  Download,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  X,
  Trash2,
  Filter,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { KardexMovementType } from '../../types';

interface AccountDefinition {
  code: string;
  name: string;
  group: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Costos' | 'Gastos';
  nature: 'debit' | 'credit'; // Deudora o Acreedora
}

export const CHART_OF_ACCOUNTS: AccountDefinition[] = [
  { code: '1101', name: 'Caja General (Efectivo en Estudio)', group: 'Activo', nature: 'debit' },
  { code: '1102', name: 'Bancos, Datáfono POS & Transferencias', group: 'Activo', nature: 'debit' },
  { code: '1105', name: 'Inventario de Insumos, Tintas & Joyería', group: 'Activo', nature: 'debit' },
  { code: '2101', name: 'Comisiones por Pagar a Artistas', group: 'Pasivo', nature: 'credit' },
  { code: '2102', name: 'IVA / Impuestos Fiscales por Liquidar', group: 'Pasivo', nature: 'credit' },
  { code: '3101', name: 'Capital & Fondo Operativo del Estudio', group: 'Patrimonio', nature: 'credit' },
  { code: '4101', name: 'Ingresos por Servicios de Tatuaje', group: 'Ingresos', nature: 'credit' },
  { code: '4102', name: 'Ingresos por Servicios de Body Piercing', group: 'Ingresos', nature: 'credit' },
  { code: '4103', name: 'Ingresos por Venta de Joyería & Aftercare', group: 'Ingresos', nature: 'credit' },
  { code: '5101', name: 'Costo Directo: Comisiones de Artistas', group: 'Costos', nature: 'debit' },
  { code: '5102', name: 'Costo Directo: Insumos, Agujas & Joyería', group: 'Costos', nature: 'debit' },
  { code: '5201', name: 'Gastos Operativos (Alquiler, Luz, Sanidad)', group: 'Gastos', nature: 'debit' },
];

interface LedgerPosting {
  id: string;
  date: string;
  reference: string;
  accountCode: string;
  concept: string;
  debit: number;
  credit: number;
  source: 'sale' | 'expense' | 'kardex' | 'shift' | 'manual';
  manualId?: string;
}

interface LedgerKardexViewProps {
  initialSection?: 'kardex' | 'mayor' | 'trial_balance';
}

export const LedgerKardexView: React.FC<LedgerKardexViewProps> = ({ initialSection = 'kardex' }) => {
  const {
    filteredSales,
    filteredExpenses,
    inventory,
    kardexMovements,
    manualJournalEntries,
    artists,
    currentShift,
    settings,
    formatMoney,
    addKardexMovement,
    addManualJournalEntry,
    deleteManualJournalEntry,
  } = useStudio();

  const [activeSection, setActiveSection] = useState<'kardex' | 'mayor' | 'trial_balance'>(initialSection);

  // --- KARDEX STATE ---
  const [selectedItemFilter, setSelectedItemFilter] = useState<string>('all');
  const [kardexTypeFilter, setKardexTypeFilter] = useState<string>('all');
  const [kardexSearch, setKardexSearch] = useState<string>('');
  const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);

  // Kardex Form
  const [kdxItemId, setKdxItemId] = useState<string>(inventory[0]?.id || '');
  const [kdxType, setKdxType] = useState<KardexMovementType>('cabin_out');
  const [kdxQty, setKdxQty] = useState<number>(1);
  const [kdxUnitCost, setKdxUnitCost] = useState<string>('');
  const [kdxRef, setKdxRef] = useState<string>('');
  const [kdxConcept, setKdxConcept] = useState<string>('');
  const [kdxResponsible, setKdxResponsible] = useState<string>(artists[0]?.name || 'Administración');

  // --- LIBRO MAYOR STATE ---
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('all');
  const [mayorSearch, setMayorSearch] = useState<string>('');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  // Manual Journal Form
  const [jrnlRef, setJrnlRef] = useState<string>('');
  const [jrnlConcept, setJrnlConcept] = useState<string>('');
  const [jrnlDebitAcc, setJrnlDebitAcc] = useState<string>('1101');
  const [jrnlCreditAcc, setJrnlCreditAcc] = useState<string>('3101');
  const [jrnlAmount, setJrnlAmount] = useState<string>('');

  // --- FILTERED KARDEX MOVEMENTS ---
  const sortedKardex = useMemo(() => {
    return [...kardexMovements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(m => {
        const matchesItem = selectedItemFilter === 'all' || m.itemId === selectedItemFilter;
        const matchesType = kardexTypeFilter === 'all' || m.type === kardexTypeFilter;
        const q = kardexSearch.toLowerCase();
        const matchesSearch =
          !q ||
          m.itemName.toLowerCase().includes(q) ||
          (m.itemSku && m.itemSku.toLowerCase().includes(q)) ||
          m.reference.toLowerCase().includes(q) ||
          m.concept.toLowerCase().includes(q) ||
          (m.responsible && m.responsible.toLowerCase().includes(q));
        return matchesItem && matchesType && matchesSearch;
      });
  }, [kardexMovements, selectedItemFilter, kardexTypeFilter, kardexSearch]);

  const kardexTotals = useMemo(() => {
    const totalQtyIn = sortedKardex.reduce((acc, m) => acc + m.quantityIn, 0);
    const totalValIn = sortedKardex.reduce((acc, m) => acc + m.totalIn, 0);
    const totalQtyOut = sortedKardex.reduce((acc, m) => acc + m.quantityOut, 0);
    const totalValOut = sortedKardex.reduce((acc, m) => acc + m.totalOut, 0);
    const currentValuation = inventory.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
    const currentUnits = inventory.reduce((acc, i) => acc + i.currentStock, 0);
    return { totalQtyIn, totalValIn, totalQtyOut, totalValOut, currentValuation, currentUnits };
  }, [sortedKardex, inventory]);

  // --- BUILD DOUBLE-ENTRY GENERAL LEDGER POSTINGS ---
  const allPostings = useMemo<LedgerPosting[]>(() => {
    const list: LedgerPosting[] = [];

    // 1. Opening Cash Fund (if > 0)
    if (currentShift.openingCash > 0) {
      list.push(
        {
          id: 'post-shift-open-d',
          date: currentShift.openedAt,
          reference: 'APE-CAJA',
          accountCode: '1101',
          concept: `Fondo inicial de apertura de caja (${currentShift.openedBy})`,
          debit: currentShift.openingCash,
          credit: 0,
          source: 'shift',
        },
        {
          id: 'post-shift-open-c',
          date: currentShift.openedAt,
          reference: 'APE-CAJA',
          accountCode: '3101',
          concept: `Aporte fondo operativo de apertura de caja`,
          debit: 0,
          credit: currentShift.openingCash,
          source: 'shift',
        }
      );
    }

    // 2. Sales double-entry postings
    filteredSales
      .filter(s => s.status !== 'cancelled')
      .forEach(s => {
        const netRevenue = Math.max(0, s.total - s.taxAmount);
        const revAccount =
          s.serviceCategory === 'tattoo'
            ? '4101'
            : s.serviceCategory === 'piercing'
            ? '4102'
            : '4103';

        // Asset entry (Cash vs Bank/Card/Transfer)
        if (s.paymentMethod === 'cash') {
          list.push({
            id: `post-sale-cash-${s.id}`,
            date: s.date,
            reference: s.invoiceNumber,
            accountCode: '1101',
            concept: `Cobro en efectivo: ${s.serviceName} (${s.clientName})`,
            debit: s.total,
            credit: 0,
            source: 'sale',
          });
        } else if (s.paymentMethod === 'split') {
          const cashPart = s.cashPaid || 0;
          const bankPart = Math.max(0, s.total - cashPart);
          if (cashPart > 0) {
            list.push({
              id: `post-sale-splitc-${s.id}`,
              date: s.date,
              reference: s.invoiceNumber,
              accountCode: '1101',
              concept: `Cobro mixto (Efectivo): ${s.serviceName} (${s.clientName})`,
              debit: cashPart,
              credit: 0,
              source: 'sale',
            });
          }
          if (bankPart > 0) {
            list.push({
              id: `post-sale-splitb-${s.id}`,
              date: s.date,
              reference: s.invoiceNumber,
              accountCode: '1102',
              concept: `Cobro mixto (POS/Transf.): ${s.serviceName} (${s.clientName})`,
              debit: bankPart,
              credit: 0,
              source: 'sale',
            });
          }
        } else {
          list.push({
            id: `post-sale-bank-${s.id}`,
            date: s.date,
            reference: s.invoiceNumber,
            accountCode: '1102',
            concept: `Cobro ${s.paymentMethod === 'card' ? 'Tarjeta POS' : 'Transferencia'}: ${s.serviceName} (${s.clientName})`,
            debit: s.total,
            credit: 0,
            source: 'sale',
          });
        }

        // Revenue credit
        list.push({
          id: `post-sale-rev-${s.id}`,
          date: s.date,
          reference: s.invoiceNumber,
          accountCode: revAccount,
          concept: `Venta devengada: ${s.serviceName} - Artista: ${s.artistName}`,
          debit: 0,
          credit: netRevenue,
          source: 'sale',
        });

        // Tax credit
        if (s.taxAmount > 0) {
          list.push({
            id: `post-sale-tax-${s.id}`,
            date: s.date,
            reference: s.invoiceNumber,
            accountCode: '2102',
            concept: `IVA / Impuesto repercutido (${s.taxRate}%) en ${s.invoiceNumber}`,
            debit: 0,
            credit: s.taxAmount,
            source: 'sale',
          });
        }

        // Artist Commission Accrual (Debit 5101 Expense / Credit 2101 Payable)
        if (s.artistShare > 0) {
          list.push(
            {
              id: `post-sale-comm-d-${s.id}`,
              date: s.date,
              reference: s.invoiceNumber,
              accountCode: '5101',
              concept: `Comisión devengada (${s.artistCommissionPercent}%) - ${s.artistName}`,
              debit: s.artistShare,
              credit: 0,
              source: 'sale',
            },
            {
              id: `post-sale-comm-c-${s.id}`,
              date: s.date,
              reference: s.invoiceNumber,
              accountCode: '2101',
              concept: `Comisión por liquidar a ${s.artistName} (${s.invoiceNumber})`,
              debit: 0,
              credit: s.artistShare,
              source: 'sale',
            }
          );
        }
      });

    // 3. Expenses double-entry postings
    filteredExpenses.forEach(e => {
      const ref = e.invoiceReference || `GAS-${e.id.slice(-4)}`;
      const deductibleTax = e.taxDeductible ? e.taxAmount : 0;
      const netExpense = Math.max(0, e.amount - deductibleTax);

      const isSupplyOrInventory = [
        'supplies_tattoo',
        'supplies_piercing',
        'jewelry_restock',
      ].includes(e.category);

      const targetDebitAccount =
        e.category === 'artist_payout'
          ? '2101' // Liquidación de pasivo de comisiones a artistas
          : isSupplyOrInventory
          ? '1105' // Compra de stock/insumos entra al activo de inventario
          : '5201'; // Gasto fijo / operativo

      list.push({
        id: `post-exp-d-${e.id}`,
        date: e.date,
        reference: ref,
        accountCode: targetDebitAccount,
        concept: `${e.description} (${e.supplier})`,
        debit: netExpense,
        credit: 0,
        source: 'expense',
      });

      if (deductibleTax > 0) {
        list.push({
          id: `post-exp-tax-${e.id}`,
          date: e.date,
          reference: ref,
          accountCode: '2102',
          concept: `IVA soportado deducible en compra (${e.supplier})`,
          debit: deductibleTax,
          credit: 0,
          source: 'expense',
        });
      }

      const creditAssetAccount = e.paymentMethod === 'cash' ? '1101' : '1102';
      list.push({
        id: `post-exp-c-${e.id}`,
        date: e.date,
        reference: ref,
        accountCode: creditAssetAccount,
        concept: `Pago a proveedor ${e.supplier} (${e.paymentMethod === 'cash' ? 'Efectivo' : 'Banco/Tarjeta'})`,
        debit: 0,
        credit: e.amount,
        source: 'expense',
      });
    });

    // 4. Kardex Consumption / Initial Inventory Postings
    kardexMovements.forEach(m => {
      if (m.type === 'initial' && m.totalIn > 0) {
        list.push(
          {
            id: `post-kdx-ini-d-${m.id}`,
            date: m.date,
            reference: m.reference,
            accountCode: '1105',
            concept: `Inventario inicial: ${m.itemName} (${m.quantityIn} ${m.unit})`,
            debit: m.totalIn,
            credit: 0,
            source: 'kardex',
          },
          {
            id: `post-kdx-ini-c-${m.id}`,
            date: m.date,
            reference: m.reference,
            accountCode: '3101',
            concept: `Contrapartida capital inventario inicial (${m.itemName})`,
            debit: 0,
            credit: m.totalIn,
            source: 'kardex',
          }
        );
      } else if ((m.type === 'cabin_out' || m.type === 'retail_sale' || m.type === 'adjustment') && m.totalOut > 0) {
        list.push(
          {
            id: `post-kdx-out-d-${m.id}`,
            date: m.date,
            reference: m.reference,
            accountCode: '5102',
            concept: `Costo consumo Kardex: ${m.itemName} (${m.quantityOut} ${m.unit}) - ${m.concept}`,
            debit: m.totalOut,
            credit: 0,
            source: 'kardex',
          },
          {
            id: `post-kdx-out-c-${m.id}`,
            date: m.date,
            reference: m.reference,
            accountCode: '1105',
            concept: `Descargo de stock Kardex: ${m.itemName} (${m.quantityOut} ${m.unit})`,
            debit: 0,
            credit: m.totalOut,
            source: 'kardex',
          }
        );
      }
    });

    // 5. Manual Journal Entries
    manualJournalEntries.forEach(j => {
      list.push(
        {
          id: `post-jrnl-d-${j.id}`,
          date: j.date,
          reference: j.reference,
          accountCode: j.debitAccountCode,
          concept: j.concept,
          debit: j.amount,
          credit: 0,
          source: 'manual',
          manualId: j.id,
        },
        {
          id: `post-jrnl-c-${j.id}`,
          date: j.date,
          reference: j.reference,
          accountCode: j.creditAccountCode,
          concept: j.concept,
          debit: 0,
          credit: j.amount,
          source: 'manual',
          manualId: j.id,
        }
      );
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredSales, filteredExpenses, kardexMovements, manualJournalEntries, currentShift]);

  // --- GROUP BY ACCOUNT FOR LIBRO MAYOR & TRIAL BALANCE ---
  const ledgerByAccount = useMemo(() => {
    return CHART_OF_ACCOUNTS.map(account => {
      const accountPostings = allPostings.filter(p => {
        if (p.accountCode !== account.code) return false;
        if (!mayorSearch.trim()) return true;
        const q = mayorSearch.toLowerCase();
        return (
          p.concept.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          account.name.toLowerCase().includes(q) ||
          account.code.includes(q)
        );
      });

      let runningBalance = 0;
      const rowsWithBalance = accountPostings.map(p => {
        if (account.nature === 'debit') {
          runningBalance += p.debit - p.credit;
        } else {
          runningBalance += p.credit - p.debit;
        }
        return {
          ...p,
          balance: Math.round(runningBalance * 100) / 100,
        };
      });

      const sumDebit = Math.round(accountPostings.reduce((acc, p) => acc + p.debit, 0) * 100) / 100;
      const sumCredit = Math.round(accountPostings.reduce((acc, p) => acc + p.credit, 0) * 100) / 100;
      const debitBalance = sumDebit > sumCredit ? Math.round((sumDebit - sumCredit) * 100) / 100 : 0;
      const creditBalance = sumCredit > sumDebit ? Math.round((sumCredit - sumDebit) * 100) / 100 : 0;

      return {
        account,
        rows: rowsWithBalance,
        sumDebit,
        sumCredit,
        debitBalance,
        creditBalance,
        finalBalance: Math.round(runningBalance * 100) / 100,
      };
    });
  }, [allPostings, mayorSearch]);

  const visibleLedgerAccounts = useMemo(() => {
    return ledgerByAccount.filter(group => {
      if (selectedAccountCode !== 'all') return group.account.code === selectedAccountCode;
      return group.rows.length > 0 || !mayorSearch.trim();
    });
  }, [ledgerByAccount, selectedAccountCode, mayorSearch]);

  const trialBalanceTotals = useMemo(() => {
    const totalDebitSum = Math.round(ledgerByAccount.reduce((acc, g) => acc + g.sumDebit, 0) * 100) / 100;
    const totalCreditSum = Math.round(ledgerByAccount.reduce((acc, g) => acc + g.sumCredit, 0) * 100) / 100;
    const totalDebitBal = Math.round(ledgerByAccount.reduce((acc, g) => acc + g.debitBalance, 0) * 100) / 100;
    const totalCreditBal = Math.round(ledgerByAccount.reduce((acc, g) => acc + g.creditBalance, 0) * 100) / 100;
    return {
      totalDebitSum,
      totalCreditSum,
      totalDebitBal,
      totalCreditBal,
      isBalanced: Math.abs(totalDebitSum - totalCreditSum) < 0.05,
    };
  }, [ledgerByAccount]);

  // --- HANDLERS ---
  const handleCreateKardexMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kdxItemId || kdxQty <= 0) return;

    const selectedItem = inventory.find(i => i.id === kdxItemId);
    const parsedCost = kdxUnitCost ? parseFloat(kdxUnitCost) : selectedItem?.unitCost;

    addKardexMovement({
      itemId: kdxItemId,
      type: kdxType,
      quantity: kdxQty,
      unitCost: parsedCost,
      reference: kdxRef.trim() || undefined,
      concept:
        kdxConcept.trim() ||
        (kdxType === 'purchase_in'
          ? 'Compra / Reposición de inventario'
          : kdxType === 'cabin_out'
          ? 'Consumo de insumo en sesión de cabina'
          : kdxType === 'retail_sale'
          ? 'Salida por venta en mostrador'
          : 'Ajuste de inventario físico'),
      responsible: kdxResponsible.trim() || 'Administración',
    });

    setIsKardexModalOpen(false);
    setKdxQty(1);
    setKdxRef('');
    setKdxConcept('');
  };

  const handleCreateJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(jrnlAmount);
    if (!jrnlConcept.trim() || isNaN(amountNum) || amountNum <= 0) return;
    if (jrnlDebitAcc === jrnlCreditAcc) {
      alert('La cuenta al Debe y la cuenta al Haber deben ser distintas para cumplir la Partida Doble.');
      return;
    }

    addManualJournalEntry({
      date: new Date().toISOString(),
      reference: jrnlRef.trim() || `ASI-${Date.now().toString().slice(-4)}`,
      concept: jrnlConcept.trim(),
      debitAccountCode: jrnlDebitAcc,
      creditAccountCode: jrnlCreditAcc,
      amount: amountNum,
    });

    setIsJournalModalOpen(false);
    setJrnlRef('');
    setJrnlConcept('');
    setJrnlAmount('');
  };

  const handleExportCSV = () => {
    if (activeSection === 'kardex') {
      const headers = [
        'Fecha',
        'Referencia',
        'SKU',
        'Insumo / Producto',
        'Tipo',
        'Concepto',
        'Responsable',
        'Entrada Cant.',
        'Entrada Costo U.',
        'Entrada Total',
        'Salida Cant.',
        'Salida Costo U.',
        'Salida Total',
        'Saldo Existencia',
        'Costo Promedio',
        'Saldo Valorizado',
      ];
      const rows = sortedKardex.map(m => [
        new Date(m.date).toLocaleString('es-ES'),
        `"${m.reference}"`,
        `"${m.itemSku || ''}"`,
        `"${m.itemName.replace(/"/g, '""')}"`,
        `"${m.type}"`,
        `"${m.concept.replace(/"/g, '""')}"`,
        `"${m.responsible || ''}"`,
        m.quantityIn,
        m.unitCostIn.toFixed(2),
        m.totalIn.toFixed(2),
        m.quantityOut,
        m.unitCostOut.toFixed(2),
        m.totalOut.toFixed(2),
        m.balanceQty,
        m.balanceUnitCost.toFixed(2),
        m.balanceTotal.toFixed(2),
      ]);
      const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `kardex_valorizado_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'Codigo Cuenta',
        'Nombre Cuenta',
        'Grupo',
        'Fecha',
        'Referencia',
        'Concepto Contable',
        'Debe (Debito)',
        'Haber (Credito)',
        'Saldo Acumulado',
      ];
      const rows: string[] = [];
      visibleLedgerAccounts.forEach(g => {
        g.rows.forEach(r => {
          rows.push(
            [
              `"${g.account.code}"`,
              `"${g.account.name}"`,
              `"${g.account.group}"`,
              `"${new Date(r.date).toLocaleDateString('es-ES')}"`,
              `"${r.reference}"`,
              `"${r.concept.replace(/"/g, '""')}"`,
              r.debit.toFixed(2),
              r.credit.toFixed(2),
              r.balance.toFixed(2),
            ].join(',')
          );
        });
      });
      const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `libro_mayor_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getKardexBadge = (type: KardexMovementType) => {
    switch (type) {
      case 'initial':
        return { label: 'Saldo Inicial', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'purchase_in':
        return { label: 'Entrada Compra', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'cabin_out':
        return { label: 'Consumo Cabina', cls: 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/30' };
      case 'retail_sale':
        return { label: 'Venta Mostrador', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'adjustment':
        return { label: 'Ajuste Stock', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Header & Module Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Kardex Valorizado & Libro Mayor Contable
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400">
            Control físico-valorizado de existencias (Promedio Ponderado), Mayorización por Cuentas T y Balance de Sumas y Saldos.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Primary Navigation Pills */}
          <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730] overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveSection('kardex')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                activeSection === 'kardex'
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Kardex de Inventario</span>
            </button>

            <button
              onClick={() => setActiveSection('mayor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                activeSection === 'mayor'
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Libro Mayor (Cuentas T)</span>
            </button>

            <button
              onClick={() => setActiveSection('trial_balance')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                activeSection === 'trial_balance'
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Balance de Sumas y Saldos</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-white text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-white text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: KARDEX VALORIZADO DE INVENTARIO
      ===================================================================== */}
      {activeSection === 'kardex' && (
        <div className="space-y-4 sm:space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
              <span className="text-[11px] text-neutral-400 block mb-1">Entradas Acumuladas (Compras/Inicial)</span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                +{formatMoney(kardexTotals.totalValIn)}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-1">
                {kardexTotals.totalQtyIn} unidades ingresadas
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
              <span className="text-[11px] text-neutral-400 block mb-1">Salidas Acumuladas (Cabina/Ventas)</span>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#FF3366]">
                -{formatMoney(kardexTotals.totalValOut)}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-1">
                {kardexTotals.totalQtyOut} unidades descargadas
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
              <span className="text-[11px] text-neutral-400 block mb-1">Saldo Valorizado en Almacén</span>
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                {formatMoney(kardexTotals.currentValuation)}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-1">
                {kardexTotals.currentUnits} uds en {inventory.length} referencias
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex items-center justify-center">
              <button
                onClick={() => {
                  if (inventory.length > 0 && !kdxItemId) setKdxItemId(inventory[0].id);
                  setIsKardexModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(255,51,102,0.35)]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Entrada / Salida Kardex</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Buscar por SKU, insumo, documento o responsable..."
                  value={kardexSearch}
                  onChange={e => setKardexSearch(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                />
                <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#FF3366] shrink-0 hidden sm:inline" />
                <select
                  value={selectedItemFilter}
                  onChange={e => setSelectedItemFilter(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:border-[#FF3366]/60"
                >
                  <option value="all">Todos los Insumos / Joyería (Kardex General)</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.sku ? `[${item.sku}] ` : ''}{item.name} (Stock: {item.currentStock})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'purchase_in', label: 'Entradas Compra' },
                { id: 'cabin_out', label: 'Consumo Cabina' },
                { id: 'retail_sale', label: 'Venta Mostrador' },
                { id: 'initial', label: 'Saldo Inicial' },
                { id: 'adjustment', label: 'Ajustes' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setKardexTypeFilter(t.id)}
                  className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0 ${
                    kardexTypeFilter === t.id
                      ? 'bg-[#FF3366] text-white font-bold'
                      : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kardex Valuation Table */}
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
            <div className="p-4 border-b border-[#24242B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Tarjeta Kardex de Control Físico y Valorizado (Método Promedio Ponderado)
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Cada ajuste de stock en Inventario o registro aquí actualiza automáticamente el saldo y costo unitario.
                </p>
              </div>
              <span className="text-xs font-mono text-[#FF3366] font-bold">
                {sortedKardex.length} movimiento(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#101013] border-b border-[#24242B] text-[10px] uppercase tracking-wider text-neutral-400">
                    <th colSpan={5} className="py-2.5 px-3 border-r border-[#24242B]">
                      Datos del Movimiento
                    </th>
                    <th colSpan={3} className="py-2.5 px-3 text-center bg-emerald-950/20 text-emerald-400 border-r border-[#24242B]">
                      Entradas (Compras / Ingresos)
                    </th>
                    <th colSpan={3} className="py-2.5 px-3 text-center bg-rose-950/20 text-[#FF3366] border-r border-[#24242B]">
                      Salidas (Cabina / Ventas)
                    </th>
                    <th colSpan={3} className="py-2.5 px-3 text-center bg-[#16161D] text-white">
                      Saldo Final (Existencias)
                    </th>
                  </tr>
                  <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                    <th className="py-3 px-3 whitespace-nowrap">Fecha</th>
                    <th className="py-3 px-3 whitespace-nowrap">Doc / Ref</th>
                    <th className="py-3 px-3 whitespace-nowrap">Insumo / SKU</th>
                    <th className="py-3 px-3 whitespace-nowrap">Tipo</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-[#24242B]">Concepto / Responsable</th>

                    {/* Entradas */}
                    <th className="py-3 px-2.5 text-center whitespace-nowrap bg-emerald-950/10">Cant.</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap bg-emerald-950/10">Costo U.</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap bg-emerald-950/10 border-r border-[#24242B]">Total</th>

                    {/* Salidas */}
                    <th className="py-3 px-2.5 text-center whitespace-nowrap bg-rose-950/10">Cant.</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap bg-rose-950/10">Costo U.</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap bg-rose-950/10 border-r border-[#24242B]">Total</th>

                    {/* Saldos */}
                    <th className="py-3 px-2.5 text-center whitespace-nowrap bg-[#16161D]">Existencia</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap bg-[#16161D]">Costo Prom.</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap bg-[#16161D]">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {sortedKardex.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-neutral-500">
                        No se encontraron movimientos en el Kardex para este filtro.
                      </td>
                    </tr>
                  ) : (
                    sortedKardex.map(m => {
                      const badge = getKardexBadge(m.type);
                      return (
                        <tr key={m.id} className="hover:bg-[#1E1E25] transition-colors">
                          <td className="py-3 px-3 font-mono text-[11px] text-neutral-300 whitespace-nowrap">
                            {new Date(m.date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#FF3366] font-semibold whitespace-nowrap">
                            {m.reference}
                          </td>
                          <td className="py-3 px-3 min-w-[180px]">
                            <div className="font-semibold text-white">{m.itemName}</div>
                            <span className="font-mono text-[10px] text-neutral-500">
                              {m.itemSku || m.unit}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 border-r border-[#24242B] min-w-[200px]">
                            <div className="text-neutral-200">{m.concept}</div>
                            {m.responsible && (
                              <span className="text-[10px] text-neutral-500">Resp: {m.responsible}</span>
                            )}
                          </td>

                          {/* Entradas */}
                          <td className="py-3 px-2.5 text-center font-mono bg-emerald-950/5 whitespace-nowrap">
                            {m.quantityIn > 0 ? (
                              <span className="text-emerald-400 font-bold">+{m.quantityIn}</span>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2.5 text-right font-mono bg-emerald-950/5 whitespace-nowrap">
                            {m.quantityIn > 0 ? formatMoney(m.unitCostIn) : '—'}
                          </td>
                          <td className="py-3 px-2.5 text-right font-mono font-semibold text-emerald-400 bg-emerald-950/5 border-r border-[#24242B] whitespace-nowrap">
                            {m.totalIn > 0 ? formatMoney(m.totalIn) : '—'}
                          </td>

                          {/* Salidas */}
                          <td className="py-3 px-2.5 text-center font-mono bg-rose-950/5 whitespace-nowrap">
                            {m.quantityOut > 0 ? (
                              <span className="text-[#FF3366] font-bold">-{m.quantityOut}</span>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2.5 text-right font-mono bg-rose-950/5 whitespace-nowrap">
                            {m.quantityOut > 0 ? formatMoney(m.unitCostOut) : '—'}
                          </td>
                          <td className="py-3 px-2.5 text-right font-mono font-semibold text-[#FF3366] bg-rose-950/5 border-r border-[#24242B] whitespace-nowrap">
                            {m.totalOut > 0 ? formatMoney(m.totalOut) : '—'}
                          </td>

                          {/* Saldo */}
                          <td className="py-3 px-2.5 text-center font-mono font-bold text-white bg-[#16161D]/60 whitespace-nowrap">
                            {m.balanceQty} <span className="text-[10px] font-normal text-neutral-400">{m.unit}</span>
                          </td>
                          <td className="py-3 px-2.5 text-right font-mono text-neutral-300 bg-[#16161D]/60 whitespace-nowrap">
                            {formatMoney(m.balanceUnitCost)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-white bg-[#16161D]/60 whitespace-nowrap">
                            {formatMoney(m.balanceTotal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 2: LIBRO MAYOR (GENERAL LEDGER POR CUENTAS T)
      ===================================================================== */}
      {activeSection === 'mayor' && (
        <div className="space-y-4 sm:space-y-6">
          {/* KPI Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
              <span className="text-[11px] text-neutral-400 block mb-1">Total Movimientos al DEBE (Débitos)</span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                {formatMoney(trialBalanceTotals.totalDebitSum)}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-1">Cargos acumulados en cuentas</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
              <span className="text-[11px] text-neutral-400 block mb-1">Total Movimientos al HABER (Créditos)</span>
              <div className="text-lg sm:text-xl font-bold font-mono text-sky-400">
                {formatMoney(trialBalanceTotals.totalCreditSum)}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-1">Abonos acumulados en cuentas</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
              <span className="text-[11px] text-neutral-400 block mb-1">Estado de Partida Doble</span>
              <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Cuadrado Exacto</span>
              </div>
              <span className="text-[10px] text-neutral-500 block mt-1">
                {CHART_OF_ACCOUNTS.length} cuentas mayores activas
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex items-center justify-center">
              <button
                onClick={() => setIsJournalModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(255,51,102,0.35)]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nuevo Asiento Contable</span>
              </button>
            </div>
          </div>

          {/* Filter Bar for Libro Mayor */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar asiento por concepto, factura, proveedor o cuenta..."
                value={mayorSearch}
                onChange={e => setMayorSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
              />
              <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 whitespace-nowrap hidden sm:inline">Cuenta Mayor:</span>
              <select
                value={selectedAccountCode}
                onChange={e => setSelectedAccountCode(e.target.value)}
                className="w-full md:w-80 px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:border-[#FF3366]/60"
              >
                <option value="all">Todas las Cuentas del Plan Contable ({CHART_OF_ACCOUNTS.length})</option>
                {CHART_OF_ACCOUNTS.map(acc => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name} ({acc.group})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ledger Account Cards (Fichas de Mayor) */}
          <div className="space-y-4">
            {visibleLedgerAccounts.map(({ account, rows, sumDebit, sumCredit, finalBalance }) => (
              <div
                key={account.code}
                className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden"
              >
                {/* Account Header */}
                <div className="p-4 bg-[#131317] border-b border-[#24242B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/40 font-mono font-bold text-xs text-[#FF3366]">
                      CTA {account.code}
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white">{account.name}</h3>
                      <span className="text-[10px] text-neutral-400">
                        Grupo: <strong className="text-neutral-200">{account.group}</strong> · Naturaleza:{' '}
                        <strong className="text-neutral-200">
                          {account.nature === 'debit' ? 'Deudora (Cargo +)' : 'Acreedora (Abono +)'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-3 text-xs font-mono">
                    <div className="px-3 py-1.5 rounded-xl bg-[#18181D] border border-[#272730]">
                      <span className="text-neutral-400 text-[10px] mr-1.5">DEBE:</span>
                      <span className="text-emerald-400 font-bold">{formatMoney(sumDebit)}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-[#18181D] border border-[#272730]">
                      <span className="text-neutral-400 text-[10px] mr-1.5">HABER:</span>
                      <span className="text-sky-400 font-bold">{formatMoney(sumCredit)}</span>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/40">
                      <span className="text-neutral-300 text-[10px] mr-1.5">SALDO:</span>
                      <span className="text-white font-bold">{formatMoney(finalBalance)}</span>
                    </div>
                  </div>
                </div>

                {/* Account Postings Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                        <th className="py-2.5 px-4 whitespace-nowrap">Fecha</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Asiento / Ref</th>
                        <th className="py-2.5 px-4">Concepto / Detalle del Movimiento</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">Debe (Débito)</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">Haber (Crédito)</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">Saldo Mayor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222228]">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-neutral-500">
                            Sin movimientos registrados en esta cuenta para el período actual.
                          </td>
                        </tr>
                      ) : (
                        rows.map(r => (
                          <tr key={r.id} className="hover:bg-[#1E1E25] transition-colors">
                            <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                              {new Date(r.date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-[#FF3366] font-semibold whitespace-nowrap">
                              {r.reference}
                            </td>
                            <td className="py-2.5 px-4 text-neutral-200 min-w-[240px] flex items-center justify-between gap-2">
                              <span>{r.concept}</span>
                              {r.source === 'manual' && r.manualId && (
                                <button
                                  onClick={() => deleteManualJournalEntry(r.manualId!)}
                                  className="p-1 text-neutral-500 hover:text-[#FF3366] transition-colors"
                                  title="Eliminar asiento manual"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">
                              {r.debit > 0 ? (
                                <span className="text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                                  <ArrowUpRight className="w-3 h-3" />
                                  {formatMoney(r.debit)}
                                </span>
                              ) : (
                                <span className="text-neutral-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">
                              {r.credit > 0 ? (
                                <span className="text-sky-400 font-semibold inline-flex items-center gap-0.5">
                                  <ArrowDownRight className="w-3 h-3" />
                                  {formatMoney(r.credit)}
                                </span>
                              ) : (
                                <span className="text-neutral-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                              {formatMoney(r.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: BALANCE DE COMPROBACIÓN DE SUMAS Y SALDOS
      ===================================================================== */}
      {activeSection === 'trial_balance' && (
        <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#24242B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Balance de Comprobación de Sumas y Saldos
              </h3>
              <p className="text-[11px] text-neutral-400">
                Verificación contable de Partida Doble ({settings.studioName})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sumas Iguales: {formatMoney(trialBalanceTotals.totalDebitSum)}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                  <th className="py-3.5 px-4 whitespace-nowrap">Código</th>
                  <th className="py-3.5 px-4">Cuenta Contable Mayor</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Grupo</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Suma Debe</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Suma Haber</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Saldo Deudor</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Saldo Acreedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {ledgerByAccount.map(({ account, sumDebit, sumCredit, debitBalance, creditBalance }) => (
                  <tr
                    key={account.code}
                    onClick={() => {
                      setSelectedAccountCode(account.code);
                      setActiveSection('mayor');
                    }}
                    className="hover:bg-[#1E1E25] transition-colors cursor-pointer"
                    title="Clic para abrir el detalle de esta cuenta en el Libro Mayor"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#FF3366] whitespace-nowrap">
                      {account.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{account.name}</td>
                    <td className="py-3 px-4 text-neutral-400 whitespace-nowrap">{account.group}</td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-200 whitespace-nowrap">
                      {formatMoney(sumDebit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-200 whitespace-nowrap">
                      {formatMoney(sumCredit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {debitBalance > 0 ? formatMoney(debitBalance) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sky-400 whitespace-nowrap">
                      {creditBalance > 0 ? formatMoney(creditBalance) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#121215] border-t-2 border-[#FF3366]/50 font-bold text-white">
                  <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wider">
                    TOTALES DE COMPROBACIÓN (PARTIDA DOBLE)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                    {formatMoney(trialBalanceTotals.totalDebitSum)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sky-400">
                    {formatMoney(trialBalanceTotals.totalCreditSum)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                    {formatMoney(trialBalanceTotals.totalDebitBal)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sky-400">
                    {formatMoney(trialBalanceTotals.totalCreditBal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REGISTRAR MOVIMIENTO KARDEX
      ===================================================================== */}
      {isKardexModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Registrar Movimiento en Kardex Valorizado
              </h3>
              <button
                onClick={() => setIsKardexModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKardexMovement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Insumo / Joya del Catálogo *
                </label>
                <select
                  required
                  value={kdxItemId}
                  onChange={e => {
                    setKdxItemId(e.target.value);
                    const found = inventory.find(i => i.id === e.target.value);
                    if (found) setKdxUnitCost(String(found.unitCost));
                  }}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                >
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.sku ? `[${item.sku}] ` : ''}{item.name} (Actual: {item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Tipo de Operación *
                  </label>
                  <select
                    value={kdxType}
                    onChange={e => setKdxType(e.target.value as KardexMovementType)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  >
                    <option value="cabin_out">Salida: Consumo en Cabina</option>
                    <option value="purchase_in">Entrada: Compra / Reposición</option>
                    <option value="retail_sale">Salida: Venta en Mostrador</option>
                    <option value="adjustment">Salida: Merma / Ajuste Sanitario</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={kdxQty}
                    onChange={e => setKdxQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Costo Unitario ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Por defecto costo promedio actual"
                    value={kdxUnitCost}
                    onChange={e => setKdxUnitCost(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Documento / Referencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-0190, CABINA-1"
                    value={kdxRef}
                    onChange={e => setKdxRef(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Concepto / Detalle *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Consumo agujas sesión Realismo o Compra proveedor"
                  value={kdxConcept}
                  onChange={e => setKdxConcept(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Artista / Responsable
                </label>
                <input
                  type="text"
                  value={kdxResponsible}
                  onChange={e => setKdxResponsible(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                />
              </div>

              <div className="pt-4 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsKardexModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)]"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: NUEVO ASIENTO CONTABLE MANUAL (LIBRO MAYOR)
      ===================================================================== */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Nuevo Asiento Contable (Partida Doble)
              </h3>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    N° Asiento / Referencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. ASI-2026-01"
                    value={jrnlRef}
                    onChange={e => setJrnlRef(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Importe ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={jrnlAmount}
                    onChange={e => setJrnlAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-400 mb-1.5">
                  Cuenta al DEBE (Cargo / Débito) *
                </label>
                <select
                  value={jrnlDebitAcc}
                  onChange={e => setJrnlDebitAcc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                >
                  {CHART_OF_ACCOUNTS.map(acc => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name} ({acc.group})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-sky-400 mb-1.5">
                  Cuenta al HABER (Abono / Crédito) *
                </label>
                <select
                  value={jrnlCreditAcc}
                  onChange={e => setJrnlCreditAcc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                >
                  {CHART_OF_ACCOUNTS.map(acc => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name} ({acc.group})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Glosa / Concepto del Asiento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Aporte de capital o traspaso de efectivo a cuenta bancaria"
                  value={jrnlConcept}
                  onChange={e => setJrnlConcept(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                />
              </div>

              <div className="pt-4 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)]"
                >
                  Contabilizar Asiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

