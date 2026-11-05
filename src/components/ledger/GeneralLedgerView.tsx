import React, { useState, useMemo } from 'react';
import { UiSelect } from '../common/UiSelect';
import { usePermission } from '../../hooks/usePermission';
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
  FileText,
  Eye,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  Filter,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ManualJournalEntry } from '../../types';
import {
  AccountDefinition,
  CHART_OF_ACCOUNTS,
  JOURNAL_SOURCE_LABELS,
  JournalSource,
  LedgerPosting,
  UnifiedJournalEntry,
} from '../../utils/accountingEngine';
import { NewJournalEntryModal } from './NewJournalEntryModal';
import { JournalEntryPrintModal } from './JournalEntryPrintModal';

export { CHART_OF_ACCOUNTS } from '../../utils/accountingEngine';
export type { AccountDefinition, LedgerPosting, UnifiedJournalEntry } from '../../utils/accountingEngine';

export const GeneralLedgerView: React.FC = () => {
  const {
    accountingEntries,
    accountingPostings,
    formatMoney,
    deleteManualJournalEntry,
  } = useStudio();

  const { guard: guardPermission } = usePermission();
  // Active top tab: default to 'journal' (Libro Diario / Asientos Contables)
  const [activeTab, setActiveTab] = useState<'journal' | 'mayor' | 'trial_balance' | 'chart_of_accounts'>('journal');
  const [journalFilter, setJournalFilter] = useState<'all' | JournalSource>('all');
  const [journalSearch, setJournalSearch] = useState<string>('');

  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('all');
  const [mayorSearch, setMayorSearch] = useState<string>('');

  // Modals state
  const [isNewJournalOpen, setIsNewJournalOpen] = useState(false);
  const [selectedEntryToPrint, setSelectedEntryToPrint] = useState<ManualJournalEntry | null>(null);

  const getAccountName = (code: string) => {
    const found = CHART_OF_ACCOUNTS.find(a => a.code === code);
    return found ? found.name : 'Cuenta Contable';
  };

  // 1. Asientos del Libro Diario: vienen del motor contable único (todas las secciones)
  const unifiedJournalEntries: UnifiedJournalEntry[] = accountingEntries;

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    return unifiedJournalEntries.filter(entry => {
      const q = journalSearch.toLowerCase();
      const matchSearch =
        !q ||
        entry.entryNumber.toLowerCase().includes(q) ||
        entry.concept.toLowerCase().includes(q) ||
        entry.reference.toLowerCase().includes(q) ||
        entry.lines.some(
          l =>
            l.accountCode.toLowerCase().includes(q) ||
            (l.accountName && l.accountName.toLowerCase().includes(q)) ||
            (l.concept && l.concept.toLowerCase().includes(q))
        );

      const matchSource = journalFilter === 'all' || entry.source === journalFilter;

      return matchSearch && matchSource;
    });
  }, [unifiedJournalEntries, journalSearch, journalFilter]);

  // 2. Pases al Mayor y Balance de Comprobación (mismo motor contable)
  const allPostings: LedgerPosting[] = accountingPostings;

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

  // Accounts visible based on filter and search in Mayor
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

  const handleExportJournalCSV = () => {
    if (!guardPermission('ledger.export')) return;
    const headers = [
      'N° Asiento',
      'Fecha',
      'Tipo Asiento',
      'Referencia',
      'Concepto / Glosa',
      'Código Cuenta',
      'Nombre Cuenta',
      'Debe ($)',
      'Haber ($)',
    ];

    const rows: string[] = [];
    filteredJournalEntries.forEach(entry => {
      entry.lines.forEach(line => {
        rows.push(
          [
            `"${entry.entryNumber}"`,
            `"${entry.date.split('T')[0]}"`,
            `"${entry.entryType}"`,
            `"${entry.reference}"`,
            `"${(line.concept || entry.concept).replace(/"/g, '""')}"`,
            `"${line.accountCode}"`,
            `"${line.accountName || getAccountName(line.accountCode)}"`,
            line.debit.toFixed(2),
            line.credit.toFixed(2),
          ].join(',')
        );
      });
    });

    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `libro_diario_asientos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPrintManualEntry = (entry: UnifiedJournalEntry) => {
    if (!guardPermission('ledger.export')) return;
    if (entry.manualRecord) {
      setSelectedEntryToPrint(entry.manualRecord);
    } else {
      // Synthesize printable voucher for automatic entries as well!
      setSelectedEntryToPrint({
        id: entry.id,
        entryNumber: entry.entryNumber,
        date: entry.date,
        reference: entry.reference,
        concept: entry.concept,
        entryType: entry.source === 'sale' ? 'diario' : entry.source === 'expense' ? 'diario' : 'apertura',
        lines: entry.lines,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        status: 'cuadrado',
        createdByName: 'Sistema Contable Automático',
      });
    }
  };

  const handleDeleteManual = (id: string, entryNum: string) => {
    if (!guardPermission('ledger.delete_entry')) return;
    if (confirm(`¿Estás seguro de anular el asiento contable ${entryNum}? Se revertirán sus movimientos en el Libro Mayor.`)) {
      deleteManualJournalEntry(id);
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              Contabilidad General & Asientos Contables
            </h1>
          </div>
          <p className="text-[11px] text-neutral-400">
            Libro Diario oficial, Mayorización por Cuentas T (Partida Doble) y Balance de Comprobación NIIF / SRI.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Sub-tabs Selector */}
          <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730] overflow-x-auto">
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Libro Diario (Asientos)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/25 font-mono">
                {unifiedJournalEntries.length}
              </span>
            </button>

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

            <button
              onClick={() => setActiveTab('chart_of_accounts')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'chart_of_accounts'
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Plan de Cuentas</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewJournalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_14px_rgba(255,51,102,0.35)] cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Registrar Asiento Contable</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Total Débitos al DEBE</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
            {formatMoney(trialBalanceTotals.totalDebitSum)}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">Cargos acumulados en cuentas</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Total Créditos al HABER</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-300">
            {formatMoney(trialBalanceTotals.totalCreditSum)}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">Abonos acumulados en cuentas</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Ecuación Contable / Partida Doble</span>
          {(() => {
            const totalDebit = allPostings.reduce((acc, p) => acc + p.debit, 0);
            const totalCredit = allPostings.reduce((acc, p) => acc + p.credit, 0);
            const unbalanced = unifiedJournalEntries.filter(e => !e.isBalanced).length;
            const ok = Math.abs(totalDebit - totalCredit) < 0.01 && unbalanced === 0;
            return (
              <>
                <div className={`flex items-center gap-2 text-base sm:text-lg font-bold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <X className="w-5 h-5 shrink-0" />}
                  <span>{ok ? 'Cuadrado' : 'Descuadrado'}</span>
                </div>
                <span className="text-[10px] text-neutral-500 block mt-1">
                  Debe {formatMoney(totalDebit)} · Haber {formatMoney(totalCredit)}
                  {unbalanced > 0 ? ` · ${unbalanced} asiento(s) descuadrado(s)` : ''}
                </span>
              </>
            );
          })()}
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Asientos en Libro Diario</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-white flex items-center justify-between">
            <span>{unifiedJournalEntries.length} asientos</span>
            <span className="text-xs text-[#FF3366] font-normal">
              ({unifiedJournalEntries.filter(e => e.source === 'manual').length} manuales)
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">Sincronizados en tiempo real</span>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: LIBRO DIARIO (REGISTRO CRONOLÓGICO DE ASIENTOS CONTABLES)
      ===================================================================== */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar por N° asiento, glosa, cuenta o referencia..."
                value={journalSearch}
                onChange={e => setJournalSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
              />
              <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'Todos los Asientos' },
                ...(Object.keys(JOURNAL_SOURCE_LABELS) as JournalSource[]).map(id => ({
                  id,
                  label: JOURNAL_SOURCE_LABELS[id],
                })),
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setJournalFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    journalFilter === tab.id
                      ? 'bg-[#FF3366] text-white shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                      : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                onClick={handleExportJournalCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366]/10 text-xs font-semibold transition-all whitespace-nowrap ml-auto cursor-pointer"
                title="Exportar Libro Diario en CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-4">
            {filteredJournalEntries.length === 0 ? (
              <div className="p-12 text-center bg-[#18181D] rounded-3xl border border-[#272730] text-neutral-400 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-neutral-600 opacity-50" />
                <h3 className="font-bold text-white text-sm">No se encontraron asientos contables</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  No hay asientos que coincidan con los filtros aplicados. Puedes registrar un nuevo asiento contable con el botón superior.
                </p>
                <button
                  onClick={() => setIsNewJournalOpen(true)}
                  className="px-4 py-2 rounded-full bg-[#FF3366] text-white font-bold text-xs shadow-md cursor-pointer hover:bg-[#E62557] transition-all"
                >
                  + Registrar Primer Asiento Manual
                </button>
              </div>
            ) : (
              filteredJournalEntries.map(entry => (
                <div
                  key={entry.id}
                  className="bg-[#18181D] border border-[#272730] rounded-2xl overflow-hidden shadow-lg transition-all hover:border-[#383844]"
                >
                  {/* Entry Header */}
                  <div className="p-3.5 sm:p-4 bg-[#141419] border-b border-[#24242B] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span className="font-mono font-black text-[#FF3366] text-xs sm:text-sm">
                        {entry.entryNumber}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {new Date(entry.date).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1A1A24] border border-[#2A2A38] text-neutral-300 uppercase">
                        {entry.entryType}
                      </span>
                      {entry.reference && entry.reference !== entry.entryNumber && (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Ref: {entry.reference}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Partida Doble OK</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenPrintManualEntry(entry)}
                          className="p-1.5 rounded-lg bg-[#202028] hover:bg-[#2B2B36] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          title="Ver / Imprimir Comprobante Oficial de Diario"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {entry.source === 'manual' && entry.manualRecord && (
                          <button
                            onClick={() => handleDeleteManual(entry.manualRecord!.id, entry.entryNumber)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[#FF3366] border border-rose-500/20 transition-colors cursor-pointer"
                            title="Anular asiento manual"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Concept / Glosa */}
                  <div className="px-4 py-2.5 bg-[#121216] border-b border-[#202026] text-xs text-neutral-300 italic">
                    <span className="font-semibold not-italic text-neutral-500 mr-1.5 uppercase text-[10px]">
                      Glosa:
                    </span>
                    "{entry.concept}"
                  </div>

                  {/* Multi-line Double Entry Breakdown */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#101014] text-neutral-500 uppercase text-[9.5px] border-b border-[#202026]">
                        <tr>
                          <th className="py-2 px-4 w-20">Código</th>
                          <th className="py-2 px-4">Cuenta Contable (Plan NIIF)</th>
                          <th className="py-2 px-4">Detalle / Referencia</th>
                          <th className="py-2 px-4 text-right w-32 text-emerald-400">DEBE ($)</th>
                          <th className="py-2 px-4 text-right w-32 text-amber-300">HABER ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D1D24]">
                        {entry.lines.map((l, lIdx) => (
                          <tr key={lIdx} className="hover:bg-[#16161D]">
                            <td className="py-2 px-4 font-mono font-bold text-white text-[11px]">
                              {l.accountCode}
                            </td>
                            <td className="py-2 px-4">
                              <span className="font-medium text-white">
                                {l.accountName || getAccountName(l.accountCode)}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-neutral-400 text-[11px] truncate max-w-xs">
                              {l.concept || entry.concept}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-bold text-emerald-400">
                              {l.debit > 0 ? formatMoney(l.debit) : '—'}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-bold text-amber-300">
                              {l.credit > 0 ? formatMoney(l.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#121216] border-t border-[#202026] font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="py-2 px-4 text-right text-neutral-400 uppercase text-[10px]">
                            Sumas del Asiento:
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-emerald-400">
                            {formatMoney(entry.totalDebit)}
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-amber-300">
                            {formatMoney(entry.totalCredit)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: LIBRO MAYOR (CUENTAS T)
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
              <UiSelect
                value={selectedAccountCode}
                onChange={e => setSelectedAccountCode(e.target.value)}
                className="w-full md:w-80 px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:border-[#FF3366]/60 cursor-pointer"
              >
                <option value="all">Todas las Cuentas del Plan Contable ({CHART_OF_ACCOUNTS.length})</option>
                {CHART_OF_ACCOUNTS.map(acc => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name} ({acc.group})
                  </option>
                ))}
              </UiSelect>
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
                        <th className="py-2.5 px-3 text-right text-amber-300">Haber (Crédito)</th>
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
                              {new Date(r.date).toLocaleDateString('es-EC', {
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
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-300 whitespace-nowrap">
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
                        <td className="py-2 px-3 text-right text-amber-300">
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
          TAB 3: BALANCE DE SUMAS Y SALDOS (TRIAL BALANCE)
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
                    <th className="py-3 px-3 text-right whitespace-nowrap text-amber-300 border-r border-[#24242B]">Total HABER</th>

                    {/* Saldos */}
                    <th className="py-3 px-3 text-right whitespace-nowrap text-emerald-400">Saldo Deudor</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap text-amber-300">Saldo Acreedor</th>
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
                      <td className="py-2.5 px-3 text-right font-bold text-amber-300 whitespace-nowrap">
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
                    <td className="py-3 px-3 text-right text-amber-300 border-r border-[#24242B]">
                      {formatMoney(trialBalanceTotals.totalCreditSum)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-black">
                      {formatMoney(trialBalanceTotals.totalDebtorBalance)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-300 font-black">
                      {formatMoney(trialBalanceTotals.totalCreditorBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: PLAN GENERAL DE CUENTAS (NIIF / SRI ECUADOR)
      ===================================================================== */}
      {activeTab === 'chart_of_accounts' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#18181D] border border-[#272730] rounded-2xl flex items-center justify-between text-xs text-neutral-300">
            <div>
              <span className="font-bold text-white uppercase tracking-wider block">
                Catálogo General de Cuentas Contables (Plan NIIF Pymes Ecuador)
              </span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Codificación estructurada para el registro automático de operaciones de tatuaje, piercing, inventarios e impuestos del SRI.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#121215] border border-[#272730] text-neutral-400 font-mono text-[11px]">
              {CHART_OF_ACCOUNTS.length} Cuentas Oficiales
            </span>
          </div>

          <div className="rounded-3xl bg-[#18181D] border border-[#272730] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium uppercase text-[10px]">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nombre de la Cuenta</th>
                    <th className="py-3 px-4">Grupo Contable</th>
                    <th className="py-3 px-4 text-center">Naturaleza</th>
                    <th className="py-3 px-4 text-right">Saldo Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {CHART_OF_ACCOUNTS.map(acc => {
                    const data = ledgerAccountsMap.get(acc.code);
                    const bal = data ? data.finalBalance : 0;
                    return (
                      <tr key={acc.code} className="hover:bg-[#1E1E25] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#FF3366]">
                          {acc.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {acc.name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              acc.group === 'Activo'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : acc.group === 'Pasivo'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : acc.group === 'Patrimonio'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : acc.group === 'Ingresos'
                                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {acc.group}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono text-[11px] text-neutral-400">
                            {acc.nature === 'debit' ? 'Deudora (Debe)' : 'Acreedora (Haber)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatMoney(bal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Registrar Asiento Contable (Comprobante de Diario) */}
      <NewJournalEntryModal
        isOpen={isNewJournalOpen}
        onClose={() => setIsNewJournalOpen(false)}
        onEntrySaved={entry => {
          setSelectedEntryToPrint(entry);
        }}
      />

      {/* Modal 2: Imprimir / Visualizar Comprobante de Diario A4 */}
      <JournalEntryPrintModal
        entry={selectedEntryToPrint}
        onClose={() => setSelectedEntryToPrint(null)}
      />
    </div>
  );
};
