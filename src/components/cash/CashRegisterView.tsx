import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Coins,
  Minus,
  Plus,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const CashRegisterView: React.FC = () => {
  const { currentShift, pastShifts, openCashShift, closeCashShift, formatMoney } = useStudio();

  const [openFund, setOpenFund] = useState<number>(150);
  const [openedByName, setOpenedByName] = useState('Encargado de Caja');
  const [openNotes] = useState('');

  const [countedCash, setCountedCash] = useState<number>(currentShift.expectedCash || 0);
  const [closedByName, setClosedByName] = useState('Encargado de Turno');
  const [closeNotes, setCloseNotes] = useState('');

  const [showDenomCalculator, setShowDenomCalculator] = useState(false);
  const [denominations, setDenominations] = useState<{ [key: string]: number }>({
    '100': 0,
    '50': 2,
    '20': 2,
    '10': 1,
    '5': 0,
    '2': 0,
    '1': 0,
  });

  const handleDenomChange = (valStr: string, delta: number) => {
    const updated = { ...denominations, [valStr]: Math.max(0, (denominations[valStr] || 0) + delta) };
    setDenominations(updated);
    let total = 0;
    Object.entries(updated).forEach(([val, qty]) => {
      total += parseFloat(val) * qty;
    });
    setCountedCash(Math.round(total * 100) / 100);
  };

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    openCashShift(openFund, openedByName, openNotes);
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashShift(countedCash, closedByName, closeNotes);
  };

  const calculatedDiscrepancy = Math.round((countedCash - currentShift.expectedCash) * 100) / 100;

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="border-b border-[#24242A] pb-4">
        <h2 className="text-sm font-bold text-white tracking-wide uppercase">Arqueo y Cierre Diario de Caja</h2>
        <p className="text-[11px] text-neutral-400">
          Conciliación de cobros en efectivo, datafono/tarjeta y gastos pagados en metálico en el estudio.
        </p>
      </div>

      {/* Current Shift Status Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                currentShift.status === 'open'
                  ? 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/40 shadow-[0_0_12px_rgba(255,51,102,0.2)]'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {currentShift.status === 'open' ? (
                <Unlock className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white">
                  Turno de Caja: {currentShift.date}
                </h3>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    currentShift.status === 'open'
                      ? 'bg-[#FF3366] text-white shadow-[0_0_8px_#FF3366]'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {currentShift.status === 'open' ? 'ABIERTO' : 'CERRADO'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Apertura por {currentShift.openedBy} a las{' '}
                {new Date(currentShift.openedAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] text-neutral-400 block">Efectivo Teórico en Cajón:</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#FF3366]">
              {formatMoney(currentShift.expectedCash)}
            </span>
          </div>
        </div>

        {/* Breakdown Formulas */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
            <span className="text-[10px] text-neutral-400 block mb-1">(+) Fondo Inicial</span>
            <span className="font-mono font-bold text-white text-sm">
              {formatMoney(currentShift.openingCash)}
            </span>
            <span className="text-[9px] text-neutral-500 block mt-1">Monedas para cambio</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
            <span className="text-[10px] text-neutral-400 block mb-1">(+) Cobros en Efectivo</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              +{formatMoney(currentShift.cashSalesTotal)}
            </span>
            <span className="text-[9px] text-neutral-500 block mt-1">Servicios & señas</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
            <span className="text-[10px] text-neutral-400 block mb-1">(-) Gastos en Metálico</span>
            <span className="font-mono font-bold text-[#FF3366] text-sm">
              -{formatMoney(currentShift.cashExpensesTotal)}
            </span>
            <span className="text-[9px] text-neutral-500 block mt-1">Pagos de caja</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
            <span className="text-[10px] text-neutral-400 block mb-1">Cobros Datáfono / TPV</span>
            <span className="font-mono font-bold text-white text-sm">
              {formatMoney(currentShift.cardTotal)}
            </span>
            <span className="text-[9px] text-neutral-500 block mt-1">Directo al banco</span>
          </div>
        </div>

        {/* Action Panel */}
        {currentShift.status === 'open' ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#272730] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Cuadre y Cierre de Turno
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Conteo físico de billetes y monedas en el cajón
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDenomCalculator(!showDenomCalculator)}
                className="text-xs text-[#FF3366] font-semibold flex items-center gap-1.5 hover:underline self-start sm:self-auto"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{showDenomCalculator ? 'Ocultar Desglose' : 'Calculadora de Billetes'}</span>
              </button>
            </div>

            {showDenomCalculator && (
              <div className="p-4 bg-[#17171C] rounded-xl border border-[#272730] text-xs space-y-3">
                <span className="text-[11px] text-neutral-400 font-semibold block">
                  Conteo por denominación (Stepper control):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {Object.entries(denominations).map(([denom, qty]) => (
                    <div key={denom} className="flex items-center justify-between p-2 bg-[#121215] rounded-xl border border-[#272730]">
                      <span className="font-mono font-bold text-white text-xs">${denom}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDenomChange(denom, -1)}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#25252E]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-white text-xs">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDenomChange(denom, 1)}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[#FF3366] hover:bg-[#25252E]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleClose} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Efectivo Físico Contado *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={countedCash}
                    onChange={e => setCountedCash(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-[#18181D] border border-[#272730] rounded-xl text-white font-mono font-bold text-sm focus:border-[#FF3366]/60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Responsable</label>
                  <input
                    type="text"
                    required
                    value={closedByName}
                    onChange={e => setClosedByName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#18181D] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Diferencia de Cuadre</label>
                  <div className="p-2.5 rounded-xl bg-[#18181D] border border-[#272730] flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">Resultado:</span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        calculatedDiscrepancy === 0
                          ? 'text-emerald-400'
                          : calculatedDiscrepancy > 0
                          ? 'text-sky-400'
                          : 'text-[#FF3366]'
                      }`}
                    >
                      {calculatedDiscrepancy === 0
                        ? '0.00 (Exacto)'
                        : `${calculatedDiscrepancy > 0 ? '+' : ''}${formatMoney(calculatedDiscrepancy)}`}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">Notas del Cierre</label>
                <input
                  type="text"
                  placeholder="Justificación o incidencias del turno"
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#18181D] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.35)] transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Efectuar Cierre Oficial de Turno</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#272730] space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Abrir Nuevo Turno de Caja
              </h4>
              <p className="text-[11px] text-neutral-400">
                Introduce el fondo inicial de monedas y billetes para la jornada
              </p>
            </div>

            <form onSubmit={handleOpen} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Fondo Inicial *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openFund}
                    onChange={e => setOpenFund(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-[#18181D] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Encargado de Apertura</label>
                  <input
                    type="text"
                    required
                    value={openedByName}
                    onChange={e => setOpenedByName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#18181D] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.35)] transition-all"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Abrir Turno de Caja</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Historical Shift Closings */}
      {pastShifts.length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
          <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Histórico de Cierres Anteriores
            </h3>
            <span className="text-[11px] text-neutral-400">{pastShifts.length} cierres archivados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#24242B] text-neutral-400 font-medium">
                  <th className="py-2.5 px-3 whitespace-nowrap">Fecha</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Apertura</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Cierre</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Fondo Inicial</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Ventas Efectivo</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Saldo Esperado</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Físico Contado</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Diferencia</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {pastShifts.map(s => (
                  <tr key={s.id} className="hover:bg-[#1E1E25]">
                    <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">{s.date}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap">
                      {new Date(s.openedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap">
                      {s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">{formatMoney(s.openingCash)}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 whitespace-nowrap">+{formatMoney(s.cashSalesTotal)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">{formatMoney(s.expectedCash)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-200 whitespace-nowrap">
                      {formatMoney(s.actualCashCounted ?? s.expectedCash)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                      {(s.discrepancy ?? 0) === 0 ? (
                        <span className="text-emerald-400">0.00</span>
                      ) : (
                        <span className="text-[#FF3366]">{formatMoney(s.discrepancy)}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300 whitespace-nowrap">{s.closedBy || s.openedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
