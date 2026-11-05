import React, { useMemo, useState } from 'react';
import { usePermission } from '../../hooks/usePermission';
import {
  Lock,
  Unlock,
  Coins,
  Minus,
  Plus,
  Printer,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { useAlertModal } from '../../context/AlertModalContext';
import { CashMovementType, CashShift, CashShiftSummary } from '../../types';
import {
  CASH_BILLS,
  CASH_COINS,
  computeShiftSummary,
  denomKey,
  ShiftTransaction,
  totalFromDenominations,
} from '../../utils/cashShift';
import { CashClosingTicketModal } from './CashClosingTicketModal';

const emptyDenoms = (): Record<string, number> => {
  const d: Record<string, number> = {};
  CASH_BILLS.forEach(v => (d[denomKey(v, 'bill')] = 0));
  CASH_COINS.forEach(v => (d[denomKey(v, 'coin')] = 0));
  return d;
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });

const KIND_LABEL: Record<ShiftTransaction['kind'], string> = {
  venta: 'Venta',
  gasto: 'Gasto',
  pago_artista: 'Pago artista',
  devolucion: 'Devolución NC',
  ingreso: 'Ingreso',
  retiro: 'Retiro',
  deposito_banco: 'Depósito banco',
};

export const CashRegisterView: React.FC = () => {
  const {
    currentShift,
    pastShifts,
    currentUser,
    sales,
    expenses,
    creditNotes,
    currentShiftSummary: sm,
    currentShiftTransactions,
    openCashShift,
    closeCashShift,
    addCashMovement,
    removeCashMovement,
    formatMoney,
  } = useStudio();
  const { guard: guardPermission, can } = usePermission();
  const { showAlert, showConfirm } = useAlertModal();
  const userName = `${currentUser.nombres} ${currentUser.apellidos}`.trim();
  const isOpen = currentShift.status === 'open';

  // ---- Apertura
  const [openFund, setOpenFund] = useState<string>('');
  const [openedByName, setOpenedByName] = useState(userName);
  const [openNotes, setOpenNotes] = useState('');

  // ---- Movimientos
  const [movType, setMovType] = useState<CashMovementType>('retiro');
  const [movAmount, setMovAmount] = useState<string>('');
  const [movConcept, setMovConcept] = useState('');

  // ---- Cierre
  const [denoms, setDenoms] = useState<Record<string, number>>(emptyDenoms);
  const [manualCount, setManualCount] = useState(false);
  const [manualCounted, setManualCounted] = useState<string>('');
  const [closedByName, setClosedByName] = useState(userName);
  const [closeNotes, setCloseNotes] = useState('');
  const [txFilter, setTxFilter] = useState<'cash' | 'all'>('cash');

  // ---- Ticket
  const [ticket, setTicket] = useState<{
    shift: CashShift;
    summary: CashShiftSummary;
    transactions: ShiftTransaction[];
    partial: boolean;
    justClosed: boolean;
  } | null>(null);

  const countedCash = manualCount ? Math.round((parseFloat(manualCounted) || 0) * 100) / 100 : totalFromDenominations(denoms);
  const difference = Math.round((countedCash - sm.expectedCash) * 100) / 100;
  const isSquare = Math.abs(difference) < 0.01;

  const closedShifts = useMemo(
    () =>
      [...pastShifts]
        .filter(s => s.status === 'closed')
        .sort((a, b) => new Date(b.closedAt || b.openedAt).getTime() - new Date(a.closedAt || a.openedAt).getTime()),
    [pastShifts]
  );

  const visibleTx = txFilter === 'cash' ? currentShiftTransactions.filter(t => Math.abs(t.cashEffect) > 0.004) : currentShiftTransactions;

  const setDenom = (key: string, qty: number) => setDenoms(prev => ({ ...prev, [key]: Math.max(0, Math.floor(qty) || 0) }));

  // ---------------------------------------------------------------- handlers
  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('cash.open')) return;
    const fund = parseFloat(openFund);
    if (isNaN(fund) || fund < 0) {
      showAlert({ title: 'Fondo inválido', message: 'Ingrese el fondo inicial de caja (puede ser 0).', type: 'warning' });
      return;
    }
    openCashShift(fund, openedByName.trim() || userName, openNotes.trim() || undefined);
    setOpenFund('');
    setOpenNotes('');
    setDenoms(emptyDenoms());
    setManualCounted('');
    setCloseNotes('');
    setClosedByName(userName);
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('cash.movement')) return;
    const amount = parseFloat(movAmount);
    if (!(amount > 0)) {
      showAlert({ title: 'Monto inválido', message: 'Ingrese un monto mayor a 0.', type: 'warning' });
      return;
    }
    if (movType !== 'ingreso' && amount > sm.expectedCash + 0.005) {
      showAlert({
        title: 'Efectivo insuficiente',
        message: `En caja hay ${formatMoney(sm.expectedCash)}; no se puede retirar ${formatMoney(amount)}.`,
        type: 'warning',
      });
      return;
    }
    addCashMovement(movType, amount, movConcept);
    setMovAmount('');
    setMovConcept('');
  };

  const handlePartial = () => {
    if (!guardPermission('cash.partial')) return;
    setTicket({ shift: currentShift, summary: sm, transactions: currentShiftTransactions, partial: true, justClosed: false });
  };

  const doClose = () => {
    const closed = closeCashShift(countedCash, closedByName.trim() || userName, closeNotes.trim() || undefined, manualCount ? undefined : denoms);
    if (!closed || !closed.closingSummary) return;
    const { transactions } = computeShiftSummary(closed, sales, expenses, creditNotes);
    setTicket({ shift: closed, summary: closed.closingSummary, transactions, partial: false, justClosed: true });
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('cash.close')) return;
    if (!isSquare && !closeNotes.trim()) {
      showAlert({
        title: 'Justifique la diferencia',
        message: `Hay un ${difference > 0 ? 'sobrante' : 'faltante'} de ${formatMoney(Math.abs(difference))}. Escriba una observación antes de cerrar.`,
        type: 'warning',
      });
      return;
    }
    showConfirm({
      title: 'Cerrar caja',
      message: `Efectivo esperado ${formatMoney(sm.expectedCash)} · contado ${formatMoney(countedCash)} · ${
        isSquare ? 'cuadrado' : `${difference > 0 ? 'sobrante' : 'faltante'} ${formatMoney(Math.abs(difference))}`
      }. El turno quedará cerrado y se imprimirá el detalle del cierre.`,
      type: isSquare ? 'info' : 'warning',
      confirmLabel: 'Cerrar e imprimir',
      onConfirm: doClose,
    });
  };

  const openTicketFor = (shift: CashShift) => {
    if (!guardPermission('cash.history')) return;
    const computed = computeShiftSummary(shift, sales, expenses, creditNotes);
    setTicket({
      shift,
      summary: shift.closingSummary || computed.summary,
      transactions: computed.transactions,
      partial: false,
      justClosed: false,
    });
  };

  // ---------------------------------------------------------------- UI helpers
  const FlowRow: React.FC<{ label: string; value: number; sign?: '+' | '−'; muted?: boolean; strong?: boolean }> = ({
    label,
    value,
    sign,
    muted,
    strong,
  }) => (
    <div
      className={`flex items-center justify-between py-2 px-3 ${strong ? 'bg-[#FF3366]/10 rounded-xl' : ''} ${
        muted && value === 0 ? 'opacity-50' : ''
      }`}
    >
      <span className={`text-xs ${strong ? 'font-bold text-white' : 'text-neutral-300'}`}>{label}</span>
      <span
        className={`font-mono tabular-nums ${strong ? 'text-lg font-bold text-[#FF3366]' : 'text-sm'} ${
          sign === '+' ? 'text-emerald-400' : sign === '−' ? 'text-red-300' : 'text-white'
        }`}
      >
        {sign && value > 0 ? `${sign} ` : ''}
        {formatMoney(value)}
      </span>
    </div>
  );

  const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }> = ({
    icon,
    label,
    value,
    sub,
    accent,
  }) => (
    <div className={`p-4 rounded-2xl border ${accent ? 'bg-[#FF3366]/10 border-[#FF3366]/40' : 'bg-[#18181D] border-[#272730]'}`}>
      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
        <span className="uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`font-mono tabular-nums font-bold ${accent ? 'text-2xl text-[#FF3366]' : 'text-xl text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 mt-1">{sub}</div>}
    </div>
  );

  const inputCls =
    'w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white text-xs focus:border-[#FF3366]/60 focus:outline-none';

  // ================================================================ RENDER
  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#24242A] pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isOpen ? 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/40' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            {isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Arqueo de Caja</h2>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  isOpen ? 'bg-[#FF3366] text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {isOpen ? `TURNO ABIERTO ${currentShift.shiftNumber || ''}` : 'CAJA CERRADA'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {isOpen ? (
                <>
                  Abierto por <strong className="text-neutral-200">{currentShift.openedBy}</strong> el{' '}
                  {new Date(currentShift.openedAt).toLocaleDateString('es-EC')} a las {timeOf(currentShift.openedAt)}
                </>
              ) : (
                'Abra un turno con su fondo inicial para empezar a registrar cobros en efectivo.'
              )}
            </p>
          </div>
        </div>
        {isOpen && (
          <button
            onClick={handlePartial}
            className="self-start lg:self-auto px-4 py-2 rounded-full border border-[#272730] bg-[#121215] hover:border-[#FF3366]/60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Imprimir un corte parcial sin cerrar el turno"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
            Corte parcial (X)
          </button>
        )}
      </div>

      {/* ============================================================ CAJA CERRADA → APERTURA */}
      {!isOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <form onSubmit={handleOpen} className="p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Abrir turno de caja</h3>
              <p className="text-[11px] text-neutral-400">Cuente el dinero para cambio con el que inicia la jornada.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Fondo inicial ($) *</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openFund}
                  onChange={e => setOpenFund(e.target.value)}
                  placeholder="0.00"
                  className={`${inputCls} font-mono text-sm`}
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Responsable *</span>
                <input required value={openedByName} onChange={e => setOpenedByName(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Observaciones</span>
              <input value={openNotes} onChange={e => setOpenNotes(e.target.value)} placeholder="Opcional" className={inputCls} />
            </label>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              Abrir turno
            </button>
          </form>

          <div className="p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Último cierre</h3>
            {closedShifts[0] ? (
              (() => {
                const last = closedShifts[0];
                const d = last.discrepancy || 0;
                return (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Turno</span>
                      <span className="font-mono text-white">{last.shiftNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Cerrado</span>
                      <span className="text-white">
                        {last.closedAt ? new Date(last.closedAt).toLocaleString('es-EC') : '—'} · {last.closedBy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Esperado / Contado</span>
                      <span className="font-mono text-white">
                        {formatMoney(last.expectedCash)} / {formatMoney(last.actualCashCounted ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Diferencia</span>
                      <span className={`font-mono font-bold ${Math.abs(d) < 0.01 ? 'text-emerald-400' : d > 0 ? 'text-sky-400' : 'text-red-400'}`}>
                        {Math.abs(d) < 0.01 ? 'Cuadrado' : `${d > 0 ? '+' : ''}${formatMoney(d)}`}
                      </span>
                    </div>
                    <button
                      onClick={() => openTicketFor(last)}
                      className="mt-2 px-4 py-2 rounded-full border border-[#272730] bg-[#121215] hover:border-[#FF3366]/60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
                      Reimprimir cierre
                    </button>
                  </div>
                );
              })()
            ) : (
              <p className="text-[11px] text-neutral-500">Todavía no hay cierres registrados.</p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ TURNO ABIERTO */}
      {isOpen && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Kpi accent icon={<Wallet className="w-4 h-4 text-[#FF3366]" />} label="Efectivo esperado" value={formatMoney(sm.expectedCash)} sub="Debe haber en el cajón" />
            <Kpi
              icon={<Receipt className="w-4 h-4 text-neutral-400" />}
              label="Ventas del turno"
              value={formatMoney(sm.grossSales)}
              sub={`${sm.invoicesCount} factura(s) · ${sm.salesNotesCount} nota(s) de venta`}
            />
            <Kpi icon={<CreditCard className="w-4 h-4 text-neutral-400" />} label="Tarjeta" value={formatMoney(sm.cardSales)} sub="Datáfono / POS → banco" />
            <Kpi icon={<ArrowLeftRight className="w-4 h-4 text-neutral-400" />} label="Transferencia" value={formatMoney(sm.transferSales)} sub="Directo al banco" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Flujo de efectivo */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Flujo de efectivo</h3>
              <FlowRow label="Fondo inicial" value={sm.openingCash} />
              <FlowRow label="Ventas en efectivo" value={sm.cashSales} sign="+" />
              <FlowRow label="Propinas en efectivo" value={sm.cashTips} sign="+" muted />
              <FlowRow label="Ingresos de caja" value={sm.manualIn} sign="+" muted />
              <FlowRow label="Gastos pagados en efectivo" value={sm.cashExpenses} sign="−" muted />
              <FlowRow label="Pagos a artistas" value={sm.cashArtistPayouts} sign="−" muted />
              <FlowRow label="Devoluciones (notas de crédito)" value={sm.cashRefunds} sign="−" muted />
              <FlowRow label="Retiros" value={sm.manualOut} sign="−" muted />
              <FlowRow label="Depósitos al banco" value={sm.bankDeposits} sign="−" muted />
              <div className="border-t border-[#272730] my-1" />
              <FlowRow label="Efectivo esperado" value={sm.expectedCash} strong />
            </div>

            {/* Movimientos del turno */}
            <div className="xl:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Movimientos del turno</h3>
                <div className="bg-[#121215] p-1 rounded-xl border border-[#272730] flex text-[11px]">
                  {[
                    { id: 'cash', label: 'Solo efectivo' },
                    { id: 'all', label: 'Todos' },
                  ].map(o => (
                    <button
                      key={o.id}
                      onClick={() => setTxFilter(o.id as 'cash' | 'all')}
                      className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${txFilter === o.id ? 'bg-[#FF3366] text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-[#24242B]">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-[#121215]">
                    <tr className="text-[10px] uppercase tracking-wider text-neutral-400">
                      <th className="py-2 px-3">Hora</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Detalle</th>
                      <th className="py-2 px-3">Método</th>
                      <th className="py-2 px-3 text-right">Efecto en caja</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222228]">
                    {visibleTx.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-500">
                          Sin movimientos en este turno.
                        </td>
                      </tr>
                    ) : (
                      visibleTx.map(t => {
                        const isManual = t.kind === 'ingreso' || t.kind === 'retiro' || t.kind === 'deposito_banco';
                        return (
                          <tr key={t.id} className="hover:bg-[#1E1E25]">
                            <td className="py-2 px-3 font-mono text-neutral-400 whitespace-nowrap">{timeOf(t.date)}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-neutral-200">{KIND_LABEL[t.kind]}</td>
                            <td className="py-2 px-3 text-neutral-300 max-w-[280px] truncate" title={t.label}>
                              {t.label}
                            </td>
                            <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">{t.method}</td>
                            <td
                              className={`py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                                t.cashEffect > 0 ? 'text-emerald-400' : t.cashEffect < 0 ? 'text-red-300' : 'text-neutral-500'
                              }`}
                            >
                              {t.cashEffect === 0 ? `(${formatMoney(t.amount)})` : `${t.cashEffect > 0 ? '+' : '−'}${formatMoney(Math.abs(t.cashEffect))}`}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {isManual && (
                                <button
                                  onClick={() => removeCashMovement(t.id)}
                                  className="p-1 rounded text-neutral-500 hover:text-red-400 cursor-pointer"
                                  title="Eliminar movimiento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Registrar movimiento manual */}
              <form onSubmit={handleAddMovement} className="grid grid-cols-1 sm:grid-cols-[auto_120px_1fr_auto] gap-2 items-end">
                <div className="flex bg-[#121215] p-1 rounded-xl border border-[#272730] text-[11px]">
                  {[
                    { id: 'ingreso', label: 'Ingreso', Icon: ArrowDownCircle },
                    { id: 'retiro', label: 'Retiro', Icon: ArrowUpCircle },
                    { id: 'deposito_banco', label: 'Depósito', Icon: Landmark },
                  ].map(o => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => setMovType(o.id as CashMovementType)}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                        movType === o.id ? 'bg-[#FF3366] text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <o.Icon className="w-3.5 h-3.5" />
                      {o.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={movAmount}
                  onChange={e => setMovAmount(e.target.value)}
                  placeholder="Monto"
                  className={`${inputCls} font-mono`}
                />
                <input
                  value={movConcept}
                  onChange={e => setMovConcept(e.target.value)}
                  placeholder={movType === 'deposito_banco' ? 'Ej. Depósito Banco Pichincha' : movType === 'retiro' ? 'Ej. Retiro del propietario' : 'Ej. Aporte de cambio'}
                  className={inputCls}
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#25252E] hover:bg-[#30303B] text-white text-xs font-bold cursor-pointer whitespace-nowrap">
                  Registrar
                </button>
              </form>
            </div>
          </div>

          {/* Conteo y cierre */}
          <form onSubmit={handleClose} className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#FF3366]" />
                  Conteo físico y cierre de turno
                </h3>
                <p className="text-[11px] text-neutral-400">Cuente billetes y monedas del cajón; el sistema calcula la diferencia.</p>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={manualCount} onChange={e => setManualCount(e.target.checked)} />
                Ingresar total sin desglose
              </label>
            </div>

            {!manualCount ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                  { title: 'Billetes', values: CASH_BILLS, kind: 'bill' as const },
                  { title: 'Monedas', values: CASH_COINS, kind: 'coin' as const },
                ].map(group => (
                  <div key={group.title} className="rounded-xl border border-[#24242B] overflow-hidden">
                    <div className="px-3 py-2 bg-[#121215] text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{group.title}</div>
                    <div className="divide-y divide-[#222228]">
                      {group.values.map(v => {
                        const key = denomKey(v, group.kind);
                        const qty = denoms[key] || 0;
                        return (
                          <div key={key} className="grid grid-cols-[70px_1fr_90px] items-center gap-2 px-3 py-1.5">
                            <span className="font-mono font-bold text-white text-xs">${v}</span>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => setDenom(key, qty - 1)} className="w-7 h-7 rounded-lg bg-[#121215] border border-[#272730] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer" aria-label={`Restar $${v}`}>
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={qty || ''}
                                onChange={e => setDenom(key, parseInt(e.target.value, 10))}
                                placeholder="0"
                                className="w-16 text-center px-2 py-1 bg-[#121215] border border-[#272730] rounded-lg text-white font-mono text-xs focus:border-[#FF3366]/60 focus:outline-none"
                                aria-label={`Cantidad de $${v}`}
                              />
                              <button type="button" onClick={() => setDenom(key, qty + 1)} className="w-7 h-7 rounded-lg bg-[#121215] border border-[#272730] flex items-center justify-center text-[#FF3366] hover:bg-[#25252E] cursor-pointer" aria-label={`Sumar $${v}`}>
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-right font-mono tabular-nums text-neutral-300 text-xs">{formatMoney(parseFloat(v) * qty)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <label className="block max-w-xs">
                <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Efectivo contado ($) *</span>
                <input type="number" step="0.01" min="0" required value={manualCounted} onChange={e => setManualCounted(e.target.value)} className={`${inputCls} font-mono text-sm`} />
              </label>
            )}

            {/* Resultado del cuadre */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
                <div className="text-[10px] text-neutral-400 uppercase">Esperado</div>
                <div className="font-mono text-lg font-bold text-white">{formatMoney(sm.expectedCash)}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
                <div className="text-[10px] text-neutral-400 uppercase">Contado</div>
                <div className="font-mono text-lg font-bold text-white">{formatMoney(countedCash)}</div>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  isSquare ? 'bg-emerald-500/10 border-emerald-500/40' : difference > 0 ? 'bg-sky-500/10 border-sky-500/40' : 'bg-red-500/10 border-red-500/40'
                }`}
              >
                <div className="text-[10px] uppercase text-neutral-300 flex items-center gap-1">
                  {isSquare ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3" />}
                  {isSquare ? 'Cuadrado' : difference > 0 ? 'Sobrante' : 'Faltante'}
                </div>
                <div className={`font-mono text-lg font-bold ${isSquare ? 'text-emerald-400' : difference > 0 ? 'text-sky-300' : 'text-red-300'}`}>
                  {difference > 0 ? '+' : ''}
                  {formatMoney(difference)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Responsable del cierre *</span>
                <input required value={closedByName} onChange={e => setClosedByName(e.target.value)} className={inputCls} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Observaciones {isSquare ? '' : '* (obligatorio si hay diferencia)'}
                </span>
                <input value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Incidencias del turno" className={inputCls} />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Cerrar caja e imprimir detalle
              </button>
            </div>
          </form>
        </>
      )}

      {/* ============================================================ HISTÓRICO */}
      {can('cash.history') && (
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#24242B]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF3366]" />
            Historial de cierres
          </h3>
          <span className="text-[11px] text-neutral-400">{closedShifts.length} cierre(s)</span>
        </div>
        {closedShifts.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">Aún no hay cierres de caja.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[900px]">
              <thead className="bg-[#121215]">
                <tr className="text-[10px] uppercase tracking-wider text-neutral-400">
                  <th className="py-2.5 px-4">N°</th>
                  <th className="py-2.5 px-3">Apertura</th>
                  <th className="py-2.5 px-3">Cierre</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-right">Ventas</th>
                  <th className="py-2.5 px-3 text-right">Fondo</th>
                  <th className="py-2.5 px-3 text-right">Esperado</th>
                  <th className="py-2.5 px-3 text-right">Contado</th>
                  <th className="py-2.5 px-3 text-right">Diferencia</th>
                  <th className="py-2.5 px-4 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {closedShifts.map(s => {
                  const d = s.discrepancy || 0;
                  return (
                    <tr key={s.id} className="hover:bg-[#1E1E25]">
                      <td className="py-2.5 px-4 font-mono font-bold text-white whitespace-nowrap">{s.shiftNumber || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap">{new Date(s.openedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap">
                        {s.closedAt ? new Date(s.closedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300 whitespace-nowrap">{s.closedBy || s.openedBy}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-200 whitespace-nowrap">
                        {formatMoney(s.closingSummary?.grossSales ?? s.cashSalesTotal + s.cardTotal + s.transferTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-400 whitespace-nowrap">{formatMoney(s.openingCash)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white whitespace-nowrap">{formatMoney(s.expectedCash)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white whitespace-nowrap">{formatMoney(s.actualCashCounted ?? 0)}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${Math.abs(d) < 0.01 ? 'text-emerald-400' : d > 0 ? 'text-sky-400' : 'text-red-400'}`}>
                        {Math.abs(d) < 0.01 ? '0.00' : `${d > 0 ? '+' : ''}${formatMoney(d)}`}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => openTicketFor(s)}
                          className="p-1.5 rounded-lg border border-[#272730] text-neutral-300 hover:text-white hover:border-[#FF3366]/50 cursor-pointer"
                          title="Ver / reimprimir detalle del cierre"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <CashClosingTicketModal
        shift={ticket?.shift || null}
        summary={ticket?.summary || null}
        transactions={ticket?.transactions || []}
        isPartial={ticket?.partial}
        justClosed={ticket?.justClosed}
        onClose={() => setTicket(null)}
      />
    </div>
  );
};
