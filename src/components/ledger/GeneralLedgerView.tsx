import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Scale,
  PlusCircle,
  Download,
  Printer,
  Search,
  CheckCircle2,
  X,
  Trash2,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

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

export const GeneralLedgerView: React.FC = () => {
  const {
    filteredSales,
    filteredExpenses,
    manualJournalEntries,
    currentShift,
    formatMoney,
    addManualJournalEntry,
    deleteManualJournalEntry,
  } = useStudio();

  const [activeTab, setActiveTab] = useState<'mayor' | 'trial_balance'>('mayor');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('all');
  const [mayorSearch, setMayorSearch] = useState<string>('');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  // Manual Journal Form
  const [jrnlRef, setJrnlRef] = useState<string>('');
  const [jrnlConcept, setJrnlConcept] = useState<string>('');
  const [jrnlDebitAcc, setJrnlDebitAcc] = useState<string>('1101');
  const [jrnlCreditAcc, setJrnlCreditAcc] = useState<string>('3101');
  const [jrnlAmount, setJrnlAmount] = useState<string>('');

  // Build double-entry general ledger postings
  const allPostings = useMemo<LedgerPosting[]>(() => {
    const list: LedgerPosting[] = [];

    // 1. Opening Cash Fund
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

        // Artist Commission
        if (s.artistShare > 0) {
          list.push({
            id: `post-sale-comm-d-${s.id}`,
            date: s.date,
            reference: s.invoiceNumber,
            accountCode: '5101',
            concept: `Devengo comisión ${s.artistName} (${s.artistCommissionPercent}%)`,
            debit: s.artistShare,
            credit: 0,
            source: 'sale',
          });
          list.push({
            id: `post-sale-comm-c-${s.id}`,
            date: s.date,
            reference: s.invoiceNumber,
            accountCode: '2101',
            concept: `Comisión por pagar a ${s.artistName} (${s.invoiceNumber})`,
            debit: 0,
            credit: s.artistShare,
            source: 'sale',
          });
        }
      });

    // 3. Operating Expenses postings
    filteredExpenses.forEach(exp => {
      const isArtistPayout = exp.category === 'artist_payout';
      const debitAccount = isArtistPayout ? '2101' : exp.category === 'inventory_purchase' ? '1105' : '5201';
      const creditAccount = exp.paymentMethod === 'cash' ? '1101' : '1102';

      list.push({
        id: `post-exp-d-${exp.id}`,
        date: exp.date,
        reference: exp.invoiceNumber || `GAS-${exp.id.slice(-4)}`,
        accountCode: debitAccount,
        concept: `${exp.description} (${exp.supplier})`,
        debit: exp.amount,
        credit: 0,
        source: 'expense',
      });

      list.push({
        id: `post-exp-c-${exp.id}`,
        date: exp.date,
        reference: exp.invoiceNumber || `GAS-${exp.id.slice(-4)}`,
        accountCode: creditAccount,
        concept: `Pago ${exp.paymentMethod === 'cash' ? 'en efectivo' : 'bancario'}: ${exp.description}`,
        debit: 0,
        credit: exp.amount,
        source: 'expense',
      });
    });

    // 4. Manual Journal Entries
    manualJournalEntries.forEach(mj => {
      list.push({
        id: `post-man-d-${mj.id}`,
        date: mj.date,
        reference: mj.reference,
        accountCode: mj.debitAccountCode,
        concept: mj.concept,
        debit: mj.amount,
        credit: 0,
        source: 'manual',
        manualId: mj.id,
      });

      list.push({
        id: `post-man-c-${mj.id}`,
        date: mj.date,
        reference: mj.reference,
        accountCode: mj.creditAccountCode,
        concept: mj.concept,
        debit: 0,
        credit: mj.amount,
        source: 'manual',
        manualId: mj.id,
      });
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredSales, filteredExpenses, manualJournalEntries, currentShift]);

  // Group postings by account for Cuentas T
  const ledgerAccountsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        account: AccountDefinition;
        rows: {
          id: string;
          date: string;
          reference: string;
          concept: string;
          debit: number;
          credit: number;
          balance: number;
          source: string;
          manualId?: string;
        }[];
        sumDebit: number;
        sumCredit: number;
        finalBalance: number;
      }
    >();

    CHART_OF_ACCOUNTS.forEach(acc => {
      map.set(acc.code, {
        account: acc,
        rows: [],
        sumDebit: 0,
        sumCredit: 0,
        finalBalance: 0,
      });
    });

    allPostings.forEach(post => {
      const entry = map.get(post.accountCode);
      if (entry) {
        entry.sumDebit += post.debit;
        entry.sumCredit += post.credit;
        const net =
          entry.account.nature === 'debit'
            ? entry.sumDebit - entry.sumCredit
            : entry.sumCredit - entry.sumDebit;

        entry.rows.push({
          id: post.id,
          date: post.date,
          reference: post.reference,
          concept: post.concept,
          debit: post.debit,
          credit: post.credit,
          balance: net,
          source: post.source,
          manualId: post.manualId,
        });
        entry.finalBalance = net;
      }
    });

    return map;
  }, [allPostings]);

  // Accounts visible based on filter and search
  const visibleLedgerAccounts = useMemo(() => {
    const q = mayorSearch.toLowerCase();
    return Array.from(ledgerAccountsMap.values())
      .filter(({ account, rows }) => {
        if (selectedAccountCode !== 'all' && account.code !== selectedAccountCode) return false;
        if (!q) return true;
        const matchAcc = account.name.toLowerCase().includes(q) || account.code.includes(q);
        const matchRows = rows.some(
          r => r.concept.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q)
        );
        return matchAcc || matchRows;
      })
      .map(entry => {
        if (!q) return entry;
        const filteredRows = entry.rows.filter(
          r =>
            r.concept.toLowerCase().includes(q) ||
            r.reference.toLowerCase().includes(q) ||
            entry.account.name.toLowerCase().includes(q)
        );
        return {
          ...entry,
          rows: filteredRows.length > 0 ? filteredRows : entry.rows,
        };
      });
  }, [ledgerAccountsMap, selectedAccountCode, mayorSearch]);

  // Trial Balance (Balance de Comprobación)
  const trialBalanceRows = useMemo(() => {
    return CHART_OF_ACCOUNTS.map(acc => {
      const data = ledgerAccountsMap.get(acc.code);
      const sumD = data ? data.sumDebit : 0;
      const sumC = data ? data.sumCredit : 0;
      const isDebitNature = acc.nature === 'debit';
      const balanceNet = sumD - sumC;

      const debtorBalance = isDebitNature ? Math.max(0, balanceNet) : 0;
      const creditorBalance = !isDebitNature ? Math.max(0, -balanceNet) : 0;

      return {
        ...acc,
        sumDebit: sumD,
        sumCredit: sumC,
        debtorBalance,
        creditorBalance,
      };
    });
  }, [ledgerAccountsMap]);

  const trialBalanceTotals = useMemo(() => {
    const totalDebitSum = trialBalanceRows.reduce((acc, r) => acc + r.sumDebit, 0);
    const totalCreditSum = trialBalanceRows.reduce((acc, r) => acc + r.sumCredit, 0);
    const totalDebtorBalance = trialBalanceRows.reduce((acc, r) => acc + r.debtorBalance, 0);
    const totalCreditorBalance = trialBalanceRows.reduce((acc, r) => acc + r.creditorBalance, 0);
    const isBalanced =
      Math.abs(totalDebitSum - totalCreditSum) < 0.05 &&
      Math.abs(totalDebtorBalance - totalCreditorBalance) < 0.05;

    return {
      totalDebitSum,
      totalCreditSum,
      totalDebtorBalance,
      totalCreditorBalance,
      isBalanced,
    };
  }, [trialBalanceRows]);

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
            new Date(r.date).toLocaleDateString('es-ES'),
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
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              Libro Mayor & Plan Contable
            </h1>
          </div>
          <p className="text-[11px] text-neutral-400">
            Mayorización por Cuentas T (Debe / Haber), Asientos Contables de Partida Doble y Balance de Sumas y Saldos.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Sub-tabs: Mayor vs Trial Balance */}
          <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730] overflow-x-auto">
            <button
              onClick={() => setActiveTab('mayor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'mayor'
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Libro Mayor (Cuentas T)</span>
            </button>

            <button
              onClick={() => setActiveTab('trial_balance')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'trial_balance'
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Balance de Sumas y Saldos</span>
            </button>
          </div>

          <button
            onClick={() => setIsJournalModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.35)] cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nuevo Asiento</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

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
            {CHART_OF_ACCOUNTS.length} cuentas del plan oficial
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Asientos Manuales Registrados</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-white">
            {manualJournalEntries.length}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">Ajustes y traspasos contables</span>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: LIBRO MAYOR (CUENTAS T)
      ===================================================================== */}
      {activeTab === 'mayor' && (
        <div className="space-y-4">
          {/* Filter Bar */}
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

          {/* Account Cards */}
          <div className="space-y-4">
            {visibleLedgerAccounts.map(({ account, rows, sumDebit, sumCredit, finalBalance }) => (
              <div
                key={account.code}
                className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden"
              >
                {/* Account Header */}
                <div className="p-4 bg-[#131317] border-b border-[#24242B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30 font-mono font-bold text-xs">
                      {account.code}
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-xs sm:text-sm">{account.name}</h3>
                      <span className="text-[10px] text-neutral-400">
                        Grupo: <strong className="text-neutral-200">{account.group}</strong> · Naturaleza:{' '}
                        <strong className="text-neutral-200">{account.nature === 'debit' ? 'Deudora' : 'Acreedora'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block">Saldo Actual</span>
                      <span className={`font-bold ${finalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                        {formatMoney(finalBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Rows Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#101013] text-neutral-400 text-[10px] uppercase font-semibold border-b border-[#24242B]">
                      <tr>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Doc / Asiento</th>
                        <th className="py-2.5 px-3">Concepto Contable</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">Debe (Débito)</th>
                        <th className="py-2.5 px-3 text-right text-sky-400">Haber (Crédito)</th>
                        <th className="py-2.5 px-3 text-right">Saldo</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222228]">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-neutral-500 text-xs">
                            Sin movimientos contables registrados en esta cuenta.
                          </td>
                        </tr>
                      ) : (
                        rows.map(r => (
                          <tr key={r.id} className="hover:bg-[#1E1E25] transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-300 whitespace-nowrap">
                              {new Date(r.date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#FF3366] whitespace-nowrap">
                              {r.reference}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-200 min-w-[200px]">
                              {r.concept}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400 whitespace-nowrap">
                              {r.debit > 0 ? formatMoney(r.debit) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-sky-400 whitespace-nowrap">
                              {r.credit > 0 ? formatMoney(r.credit) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                              {formatMoney(r.balance)}
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              {r.source === 'manual' && r.manualId && (
                                <button
                                  onClick={() => {
                                    if (confirm('¿Eliminar este asiento contable manual?')) {
                                      deleteManualJournalEntry(r.manualId!);
                                    }
                                  }}
                                  className="p-1 rounded text-neutral-500 hover:text-red-400"
                                  title="Eliminar asiento manual"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-[#121215] border-t border-[#272730] text-xs font-mono font-bold">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right text-neutral-400 uppercase text-[10px]">
                          Sumas de Cuenta {account.code}:
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          {formatMoney(sumDebit)}
                        </td>
                        <td className="py-2 px-3 text-right text-sky-400">
                          {formatMoney(sumCredit)}
                        </td>
                        <td className="py-2 px-3 text-right text-white">
                          {formatMoney(finalBalance)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: BALANCE DE SUMAS Y SALDOS (TRIAL BALANCE)
      ===================================================================== */}
      {activeTab === 'trial_balance' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#18181D] border border-[#272730] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#101013] border-b border-[#24242B] text-[10px] uppercase tracking-wider font-bold">
                    <th colSpan={3} className="py-3 px-3 text-neutral-400 border-r border-[#24242B]">
                      Cuentas del Mayor
                    </th>
                    <th colSpan={2} className="py-3 px-3 text-center text-white bg-[#14141A] border-r border-[#24242B]">
                      Sumas de Movimientos
                    </th>
                    <th colSpan={2} className="py-3 px-3 text-center text-white bg-[#121217]">
                      Saldos Contables
                    </th>
                  </tr>
                  <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                    <th className="py-3 px-3 whitespace-nowrap">Código</th>
                    <th className="py-3 px-3 whitespace-nowrap">Nombre de la Cuenta</th>
                    <th className="py-3 px-3 whitespace-nowrap border-r border-[#24242B]">Grupo</th>

                    {/* Sumas */}
                    <th className="py-3 px-3 text-right whitespace-nowrap text-emerald-400">Total DEBE</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap text-sky-400 border-r border-[#24242B]">Total HABER</th>

                    {/* Saldos */}
                    <th className="py-3 px-3 text-right whitespace-nowrap text-emerald-400">Saldo Deudor</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap text-sky-400">Saldo Acreedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {trialBalanceRows.map(row => (
                    <tr key={row.code} className="hover:bg-[#1E1E25] transition-colors font-mono">
                      <td className="py-2.5 px-3 text-[#FF3366] font-bold whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-white whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-neutral-400 border-r border-[#24242B] whitespace-nowrap">
                        {row.group}
                      </td>

                      {/* Sumas */}
                      <td className="py-2.5 px-3 text-right text-neutral-200 whitespace-nowrap">
                        {row.sumDebit > 0 ? formatMoney(row.sumDebit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-neutral-200 border-r border-[#24242B] whitespace-nowrap">
                        {row.sumCredit > 0 ? formatMoney(row.sumCredit) : '—'}
                      </td>

                      {/* Saldos */}
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {row.debtorBalance > 0 ? formatMoney(row.debtorBalance) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-sky-400 whitespace-nowrap">
                        {row.creditorBalance > 0 ? formatMoney(row.creditorBalance) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#101013] border-t-2 border-[#FF3366]/40 text-xs font-mono font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-right text-white uppercase text-[11px] font-sans border-r border-[#24242B]">
                      TOTALES DEL BALANCE DE COMPROBACIÓN:
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400">
                      {formatMoney(trialBalanceTotals.totalDebitSum)}
                    </td>
                    <td className="py-3 px-3 text-right text-sky-400 border-r border-[#24242B]">
                      {formatMoney(trialBalanceTotals.totalCreditSum)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-black">
                      {formatMoney(trialBalanceTotals.totalDebtorBalance)}
                    </td>
                    <td className="py-3 px-3 text-right text-sky-400 font-black">
                      {formatMoney(trialBalanceTotals.totalCreditorBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Asiento Contable Manual */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141417] border border-[#272730] rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242A] bg-[#16161B]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Registrar Asiento Contable Manual
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Ajuste contable con validación estricta de Partida Doble
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="w-7 h-7 rounded-full border border-[#2A2A34] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">N° Asiento / Referencia</label>
                  <input
                    type="text"
                    placeholder="Ej: ASI-0012, AJUSTE-01"
                    value={jrnlRef}
                    onChange={e => setJrnlRef(e.target.value)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Importe ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={jrnlAmount}
                    onChange={e => setJrnlAmount(e.target.value)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Glosa / Concepto Contable *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Traspaso a cuenta de ahorro, Ajuste por merma, Aporte socios..."
                  value={jrnlConcept}
                  onChange={e => setJrnlConcept(e.target.value)}
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#111114] border border-[#24242C] space-y-3">
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Partida Doble (Cuentas Involucradas)
                </div>

                <div>
                  <label className="text-[11px] text-emerald-400 font-semibold block mb-1">
                    Cuenta al DEBE (Cargo / Débito)
                  </label>
                  <select
                    value={jrnlDebitAcc}
                    onChange={e => setJrnlDebitAcc(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#2E2E38] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  >
                    {CHART_OF_ACCOUNTS.map(a => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.group})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-sky-400 font-semibold block mb-1">
                    Cuenta al HABER (Abono / Crédito)
                  </label>
                  <select
                    value={jrnlCreditAcc}
                    onChange={e => setJrnlCreditAcc(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#2E2E38] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  >
                    {CHART_OF_ACCOUNTS.map(a => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.group})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#24242A]">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#272730] text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.4)] cursor-pointer"
                >
                  Guardar Asiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

