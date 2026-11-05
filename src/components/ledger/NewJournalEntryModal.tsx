import React, { useState, useMemo } from 'react';
import { UiSelect } from '../common/UiSelect';
import { usePermission } from '../../hooks/usePermission';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Scale,
  Calendar,
  Layers,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { JournalEntryLine, JournalEntryType, ManualJournalEntry } from '../../types';
import { CHART_OF_ACCOUNTS } from './GeneralLedgerView';

interface NewJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntrySaved?: (entry: ManualJournalEntry) => void;
}

interface FormLine {
  id: string;
  accountCode: string;
  concept: string;
  debitStr: string;
  creditStr: string;
}

export const NewJournalEntryModal: React.FC<NewJournalEntryModalProps> = ({
  isOpen,
  onClose,
  onEntrySaved,
}) => {
  const { manualJournalEntries, addManualJournalEntry, currentUser, formatMoney } = useStudio();

  const { guard: guardPermission } = usePermission();
  // Top header fields
  const currentYear = new Date().getFullYear();
  const defaultEntryNumber = useMemo(() => {
    const nextSeq = manualJournalEntries.length + 1;
    return `ASI-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  }, [manualJournalEntries.length, currentYear]);

  const [entryNumber, setEntryNumber] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState<JournalEntryType>('diario');
  const [reference, setReference] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Dynamic lines state
  const [lines, setLines] = useState<FormLine[]>([
    {
      id: 'line-1',
      accountCode: '1101',
      concept: '',
      debitStr: '',
      creditStr: '',
    },
    {
      id: 'line-2',
      accountCode: '3101',
      concept: '',
      debitStr: '',
      creditStr: '',
    },
  ]);

  // Reset or preset whenever opening
  React.useEffect(() => {
    if (isOpen) {
      setEntryNumber(defaultEntryNumber);
      setDate(new Date().toISOString().split('T')[0]);
      setEntryType('diario');
      setReference('');
      setConcept('');
      setNotes('');
      setLines([
        { id: `line-${Date.now()}-1`, accountCode: '1101', concept: '', debitStr: '', creditStr: '' },
        { id: `line-${Date.now()}-2`, accountCode: '3101', concept: '', debitStr: '', creditStr: '' },
      ]);
    }
  }, [isOpen, defaultEntryNumber]);

  // Quick Template Applicator
  const applyTemplate = (type: 'capital' | 'deposit' | 'equipment' | 'supplies' | 'rent') => {
    const ts = Date.now();
    switch (type) {
      case 'capital':
        setEntryType('apertura');
        setReference('ACTA-APORTE-01');
        setConcept('Aporte de capital / fondo operativo para el estudio');
        setLines([
          { id: `line-${ts}-1`, accountCode: '1102', concept: 'Depósito en Banco Pichincha', debitStr: '5000', creditStr: '' },
          { id: `line-${ts}-2`, accountCode: '3101', concept: 'Capital social aportado', debitStr: '', creditStr: '5000' },
        ]);
        break;
      case 'deposit':
        setEntryType('diario');
        setReference('DEP-BANCO');
        setConcept('Depósito bancario de efectivo recaudado en caja del estudio');
        setLines([
          { id: `line-${ts}-1`, accountCode: '1102', concept: 'Ingreso en cuenta bancaria', debitStr: '800', creditStr: '' },
          { id: `line-${ts}-2`, accountCode: '1101', concept: 'Salida de efectivo de caja general', debitStr: '', creditStr: '800' },
        ]);
        break;
      case 'equipment':
        setEntryType('diario');
        setReference('FAC-ACTIVO');
        setConcept('Adquisición de camilla hidráulica / autoclave para cabinas sanitarias');
        setLines([
          { id: `line-${ts}-1`, accountCode: '1201', concept: 'Activo fijo: Camilla / Autoclave', debitStr: '1200', creditStr: '' },
          { id: `line-${ts}-2`, accountCode: '1102', concept: 'Pago transferencia bancaria', debitStr: '', creditStr: '1200' },
        ]);
        break;
      case 'supplies':
        setEntryType('ajuste');
        setReference('AJU-CONSUMO');
        setConcept('Ajuste contable por consumo interno de insumos y bioseguridad en cabinas');
        setLines([
          { id: `line-${ts}-1`, accountCode: '5102', concept: 'Costo directo insumos consumidos', debitStr: '95', creditStr: '' },
          { id: `line-${ts}-2`, accountCode: '1105', concept: 'Descarga de stock de inventario', debitStr: '', creditStr: '95' },
        ]);
        break;
      case 'rent':
        setEntryType('diario');
        setReference('ALQ-QUICENTRO');
        setConcept('Pago de alquiler mensual y alícuota comercial Quicentro Shopping');
        setLines([
          { id: `line-${ts}-1`, accountCode: '5201', concept: 'Gasto de arriendo local', debitStr: '1250', creditStr: '' },
          { id: `line-${ts}-2`, accountCode: '1102', concept: 'Transferencia bancaria Banco Pichincha', debitStr: '', creditStr: '1250' },
        ]);
        break;
    }
  };

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length + 1}`,
        accountCode: '1101',
        concept: '',
        debitStr: '',
        creditStr: '',
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) {
      alert('Un asiento contable de Partida Doble requiere un mínimo de 2 cuentas.');
      return;
    }
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof FormLine, value: string) => {
    setLines(prev =>
      prev.map(line => {
        if (line.id !== id) return line;
        // If typing in debit, clear credit to prevent same-line conflict
        if (field === 'debitStr' && value.trim() !== '') {
          return { ...line, debitStr: value, creditStr: '' };
        }
        if (field === 'creditStr' && value.trim() !== '') {
          return { ...line, creditStr: value, debitStr: '' };
        }
        return { ...line, [field]: value };
      })
    );
  };

  // Math totals calculation
  const { totalDebit, totalCredit, difference, isBalanced, hasValidLines } = useMemo(() => {
    let d = 0;
    let c = 0;
    let validCount = 0;

    lines.forEach(line => {
      const deb = parseFloat(line.debitStr) || 0;
      const cred = parseFloat(line.creditStr) || 0;
      d += deb;
      c += cred;
      if (deb > 0 || cred > 0) {
        validCount++;
      }
    });

    const diff = Math.round(Math.abs(d - c) * 100) / 100;
    const balanced = diff === 0 && d > 0;
    const valid = validCount >= 2;

    return {
      totalDebit: d,
      totalCredit: c,
      difference: diff,
      isBalanced: balanced,
      hasValidLines: valid,
    };
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('ledger.create_entry')) return;

    if (!concept.trim()) {
      alert('Por favor ingrese el concepto o glosa general del asiento contable.');
      return;
    }

    if (!isBalanced) {
      alert(`El asiento contable está descuadrado por ${formatMoney(difference)}. Por la Ley de Partida Doble, la suma del DEBE y del HABER deben coincidir exactamente.`);
      return;
    }

    if (!hasValidLines) {
      alert('Debe ingresar importes al menos en 2 cuentas contables distintas.');
      return;
    }

    // Prepare formal journal entry lines
    const parsedLines: JournalEntryLine[] = lines
      .filter(l => (parseFloat(l.debitStr) || 0) > 0 || (parseFloat(l.creditStr) || 0) > 0)
      .map((l, index) => {
        const accDef = CHART_OF_ACCOUNTS.find(a => a.code === l.accountCode);
        return {
          id: `line-${Date.now()}-${index + 1}`,
          accountCode: l.accountCode,
          accountName: accDef?.name || 'Cuenta Contable',
          concept: l.concept.trim() || concept.trim(),
          debit: parseFloat(l.debitStr) || 0,
          credit: parseFloat(l.creditStr) || 0,
        };
      });

    const finalEntryNumber = entryNumber.trim() || defaultEntryNumber;

    const newJournalEntry: Omit<ManualJournalEntry, 'id'> = {
      entryNumber: finalEntryNumber,
      date: new Date(date).toISOString(),
      reference: reference.trim() || finalEntryNumber,
      concept: concept.trim(),
      entryType,
      lines: parsedLines,
      totalDebit,
      totalCredit,
      status: 'cuadrado',
      notes: notes.trim(),
      createdByName: currentUser?.nombres ? `${currentUser.nombres} ${currentUser.apellidos}` : 'Administrador',
      // Legacy backward-compatibility fields:
      debitAccountCode: parsedLines.find(l => l.debit > 0)?.accountCode || '1101',
      creditAccountCode: parsedLines.find(l => l.credit > 0)?.accountCode || '3101',
      amount: totalDebit,
    };

    addManualJournalEntry(newJournalEntry);

    if (onEntrySaved) {
      onEntrySaved({
        ...newJournalEntry,
        id: `jrnl-${Date.now()}`,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-[#17171C] border border-[#272732] rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-5 shadow-2xl my-auto text-xs text-neutral-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#24242F] pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366]"></span>
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Registrar Asiento Contable (Comprobante de Diario)</span>
              </h2>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Registro formal con balance automático de Partida Doble conforme a NIIF y normativa del SRI Ecuador.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#1F1F26] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container (Scrollable) */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {/* Quick Templates Strip */}
          <div className="bg-[#121215] p-3 rounded-2xl border border-[#24242F] space-y-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF3366]" />
              <span>Plantillas Rápidas de Asientos Comunes:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyTemplate('capital')}
                className="px-2.5 py-1 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A36] text-neutral-300 hover:text-white border border-[#2B2B36] text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Aporte de Capital
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('deposit')}
                className="px-2.5 py-1 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A36] text-neutral-300 hover:text-white border border-[#2B2B36] text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Depósito Caja a Banco
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('equipment')}
                className="px-2.5 py-1 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A36] text-neutral-300 hover:text-white border border-[#2B2B36] text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Compra de Equipos / Camilla
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('rent')}
                className="px-2.5 py-1 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A36] text-neutral-300 hover:text-white border border-[#2B2B36] text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Arriendo Quicentro
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('supplies')}
                className="px-2.5 py-1 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A36] text-neutral-300 hover:text-white border border-[#2B2B36] text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Ajuste Insumos Cabina
              </button>
            </div>
          </div>

          {/* General Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#121215] p-3.5 rounded-2xl border border-[#24242F]">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                N° de Asiento
              </label>
              <input
                type="text"
                value={entryNumber}
                onChange={e => setEntryNumber(e.target.value)}
                placeholder={defaultEntryNumber}
                className="w-full bg-[#18181D] border border-[#2B2B36] rounded-xl px-3 py-1.5 font-mono text-white text-xs font-bold focus:border-[#FF3366] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                Fecha de Emisión
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#18181D] border border-[#2B2B36] rounded-xl px-3 py-1.5 font-mono text-white text-xs focus:border-[#FF3366] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                Tipo de Asiento
              </label>
              <UiSelect
                value={entryType}
                onChange={e => setEntryType(e.target.value as JournalEntryType)}
                className="w-full bg-[#18181D] border border-[#2B2B36] rounded-xl px-3 py-1.5 text-white text-xs focus:border-[#FF3366] focus:outline-none cursor-pointer"
              >
                <option value="diario">Asiento de Diario / Operativo</option>
                <option value="ajuste">Asiento de Ajuste / Regularización</option>
                <option value="apertura">Asiento de Apertura / Capital</option>
                <option value="cierre">Asiento de Cierre Contable</option>
              </UiSelect>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                Documento Referencia
              </label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="ej. FAC-001-098, CHQ-204"
                className="w-full bg-[#18181D] border border-[#2B2B36] rounded-xl px-3 py-1.5 text-white text-xs focus:border-[#FF3366] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4">
              <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                Glosa / Concepto General del Asiento Contable *
              </label>
              <input
                type="text"
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder="ej. Registro de transferencia bancaria por aporte de capital y provisión operativa..."
                className="w-full bg-[#18181D] border border-[#2B2B36] rounded-xl px-3 py-2 text-white text-xs focus:border-[#FF3366] focus:outline-none font-medium"
                required
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#FF3366]" />
                <span>Cuentas del Asiento (Partida Doble)</span>
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Cuenta</span>
              </button>
            </div>

            <div className="bg-[#121215] border border-[#24242F] rounded-2xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#18181D] text-neutral-400 uppercase font-semibold text-[10px] border-b border-[#24242F]">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[240px]">Cuenta Contable (Plan NIIF)</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Detalle de la Línea</th>
                      <th className="py-2.5 px-3 text-right w-32">DEBE ($)</th>
                      <th className="py-2.5 px-3 text-right w-32">HABER ($)</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F27]">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-[#16161D]">
                        <td className="py-2 px-3">
                          <UiSelect
                            value={line.accountCode}
                            onChange={e => handleUpdateLine(line.id, 'accountCode', e.target.value)}
                            className="w-full bg-[#1A1A22] border border-[#2B2B36] rounded-xl px-2.5 py-1.5 text-white text-xs focus:border-[#FF3366] focus:outline-none cursor-pointer"
                          >
                            {CHART_OF_ACCOUNTS.map(acc => (
                              <option key={acc.code} value={acc.code}>
                                {acc.code} · {acc.name} ({acc.group})
                              </option>
                            ))}
                          </UiSelect>
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={line.concept}
                            onChange={e => handleUpdateLine(line.id, 'concept', e.target.value)}
                            placeholder="Detalle específico (opcional)"
                            className="w-full bg-[#1A1A22] border border-[#2B2B36] rounded-xl px-2.5 py-1.5 text-neutral-300 text-xs focus:border-[#FF3366] focus:outline-none"
                          />
                        </td>

                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debitStr}
                            onChange={e => handleUpdateLine(line.id, 'debitStr', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#1A1A22] border border-[#2B2B36] rounded-xl px-2.5 py-1.5 text-right font-mono font-bold text-emerald-400 text-xs focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.creditStr}
                            onChange={e => handleUpdateLine(line.id, 'creditStr', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#1A1A22] border border-[#2B2B36] rounded-xl px-2.5 py-1.5 text-right font-mono font-bold text-amber-300 text-xs focus:border-amber-500 focus:outline-none"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          {lines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Eliminar línea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot className="bg-[#181820] font-bold border-t border-[#24242F]">
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-right text-neutral-300 uppercase text-[11px]">
                        Totales del Asiento Contable:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">
                        {formatMoney(totalDebit)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300 text-sm">
                        {formatMoney(totalCredit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Real-time Double Entry Validation Badge */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
              isBalanced
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {isBalanced
                    ? '✓ Asiento Contable Cuadrado'
                    : '⚠️ Asiento Descuadrado (No cumple Partida Doble)'}
                </span>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {isBalanced
                    ? `El DEBE y el HABER suman exactamente ${formatMoney(totalDebit)}. Listo para contabilizar.`
                    : `Existe una diferencia de ${formatMoney(difference)} entre el DEBE (${formatMoney(totalDebit)}) y el HABER (${formatMoney(totalCredit)}).`}
                </p>
              </div>
            </div>
            <div className="text-right font-mono font-bold shrink-0 text-sm">
              {isBalanced ? (
                <span className="text-emerald-400">DIF: $0.00</span>
              ) : (
                <span className="text-rose-400">DIF: {formatMoney(difference)}</span>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#24242F] pt-3 shrink-0">
          <div className="text-[11px] text-neutral-500">
            Registrado por: <span className="text-neutral-300 font-medium">{currentUser?.nombres || 'Admin'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#202028] hover:bg-[#2A2A36] text-neutral-300 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isBalanced || !concept.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg cursor-pointer ${
                isBalanced && concept.trim()
                  ? 'bg-[#FF3366] hover:bg-[#E62557] text-white shadow-[0_0_15px_rgba(255,51,102,0.4)]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Asiento Contable</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

