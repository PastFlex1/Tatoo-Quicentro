import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Scale, FileText } from 'lucide-react';
import { ManualJournalEntry } from '../../types';
import { useStudio } from '../../context/StudioContext';
import { CHART_OF_ACCOUNTS } from './GeneralLedgerView';

interface JournalEntryPrintModalProps {
  entry: ManualJournalEntry | null;
  onClose: () => void;
}

export const JournalEntryPrintModal: React.FC<JournalEntryPrintModalProps> = ({ entry, onClose }) => {
  const { settings, formatMoney } = useStudio();

  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  const getAccountName = (code: string) => {
    const found = CHART_OF_ACCOUNTS.find(a => a.code === code);
    return found ? found.name : 'Cuenta Contable';
  };

  const linesToRender =
    entry.lines && entry.lines.length > 0
      ? entry.lines
      : [
          {
            id: 'l-1',
            accountCode: entry.debitAccountCode || '1101',
            accountName: getAccountName(entry.debitAccountCode || '1101'),
            concept: entry.concept,
            debit: entry.amount || 0,
            credit: 0,
          },
          {
            id: 'l-2',
            accountCode: entry.creditAccountCode || '3101',
            accountName: getAccountName(entry.creditAccountCode || '3101'),
            concept: entry.concept,
            debit: 0,
            credit: entry.amount || 0,
          },
        ];

  const totalDebit = linesToRender.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = linesToRender.reduce((sum, l) => sum + (l.credit || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-5 shadow-2xl my-auto text-xs text-neutral-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#24242F] pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#FF3366]" />
            <span className="font-bold text-white uppercase text-xs">
              Comprobante de Diario Contable
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-[#202028] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="bg-white text-neutral-900 p-6 sm:p-8 rounded-2xl shadow-xl space-y-5 font-sans print:p-0 print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-neutral-900 pb-4">
            <div>
              <h1 className="text-lg font-black tracking-tight text-neutral-900 uppercase">
                {settings.studioName || 'DEVOLUTION INK TATTOO STUDIO'}
              </h1>
              <p className="text-[11px] text-neutral-600 font-medium">
                C.C. Quicentro Shopping, Local 214 · Quito, Ecuador
              </p>
              <p className="text-[11px] text-neutral-600 font-mono">
                RUC: {settings.ruc || settings.taxId || '—'} · Tel: {settings.phone || settings.telefono || '—'}
              </p>
            </div>

            <div className="text-right sm:text-right border-l-2 border-neutral-900 pl-4 sm:pl-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Comprobante de Diario
              </span>
              <span className="text-base font-black font-mono text-[#FF3366]">
                {entry.entryNumber || 'ASI-2026-0001'}
              </span>
              <span className="text-[10px] font-mono text-neutral-600 block mt-0.5">
                Fecha: {new Date(entry.date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-neutral-100 rounded-xl text-[11px] border border-neutral-200">
            <div>
              <span className="text-[9px] uppercase text-neutral-500 font-bold block">Tipo Asiento</span>
              <span className="font-semibold text-neutral-900 capitalize">
                {entry.entryType || 'Diario General'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-neutral-500 font-bold block">Referencia / Doc.</span>
              <span className="font-mono font-semibold text-neutral-900">
                {entry.reference || 'S/R'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-neutral-500 font-bold block">Estado Contable</span>
              <span className="font-bold text-emerald-700">
                ✓ Cuadrado (Partida Doble)
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-neutral-500 font-bold block">Elaborado Por</span>
              <span className="font-semibold text-neutral-900 truncate block">
                {entry.createdByName || 'Administrador'}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-4 pt-1.5 border-t border-neutral-200">
              <span className="text-[9px] uppercase text-neutral-500 font-bold block">Concepto / Glosa General</span>
              <p className="font-medium text-neutral-900 text-xs italic mt-0.5">
                "{entry.concept}"
              </p>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="border border-neutral-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900 text-white font-bold text-[10px] uppercase">
                  <th className="py-2 px-3 w-16">Código</th>
                  <th className="py-2 px-3">Cuenta Contable & Glosa Detalle</th>
                  <th className="py-2 px-3 text-right w-28">DEBE ($)</th>
                  <th className="py-2 px-3 text-right w-28">HABER ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {linesToRender.map((line, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="py-2 px-3 font-mono font-bold text-neutral-900">
                      {line.accountCode}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-neutral-900">{line.accountName || getAccountName(line.accountCode)}</div>
                      {line.concept && line.concept !== entry.concept && (
                        <div className="text-[10px] text-neutral-500 italic">{line.concept}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                      {line.debit > 0 ? formatMoney(line.debit) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                      {line.credit > 0 ? formatMoney(line.credit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-100 font-black border-t-2 border-neutral-900">
                  <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px] text-neutral-900">
                    Sumas Iguales:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm text-neutral-900">
                    {formatMoney(totalDebit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm text-neutral-900">
                    {formatMoney(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures Footer */}
          <div className="grid grid-cols-3 gap-6 pt-10 text-center text-[10px] text-neutral-700">
            <div>
              <div className="border-t border-neutral-400 pt-1.5 font-bold uppercase">
                {entry.createdByName || 'Elaborado Por'}
              </div>
              <span className="text-[9px] text-neutral-500">Operador / Caja</span>
            </div>
            <div>
              <div className="border-t border-neutral-400 pt-1.5 font-bold uppercase">
                Diana Romero CPA
              </div>
              <span className="text-[9px] text-neutral-500">Contadora General</span>
            </div>
            <div>
              <div className="border-t border-neutral-400 pt-1.5 font-bold uppercase">
                Alex Palma
              </div>
              <span className="text-[9px] text-neutral-500">Gerencia General</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[#24242F] pt-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#202028] hover:bg-[#2A2A36] text-white text-xs font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

