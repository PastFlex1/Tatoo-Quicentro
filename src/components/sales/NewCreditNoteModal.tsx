import React, { useState, useEffect } from 'react';
import { UiSelect } from '../common/UiSelect';
import { usePermission } from '../../hooks/usePermission';
import { X, RefreshCw, AlertCircle, FileText, CheckCircle2, Boxes } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SaleRecord, CreditNoteReason, CreditNoteRecord } from '../../types';

interface NewCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSale?: SaleRecord | null;
}

export const NewCreditNoteModal: React.FC<NewCreditNoteModalProps> = ({
  isOpen,
  onClose,
  preselectedSale,
}) => {
  const { sales, addCreditNote, formatMoney, settings } = useStudio();

  const { guard: guardPermission } = usePermission();
  // Selected Invoice
  // Evita doble emisión mientras llega el número del servidor
  const [saving, setSaving] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [reason, setReason] = useState<CreditNoteReason>('ANULACION_TOTAL');
  const [reasonDescription, setReasonDescription] = useState<string>('Anulación total de la operación comercial y servicio.');
  const [creditSubtotal, setCreditSubtotal] = useState<number>(0);
  const [creditTax, setCreditTax] = useState<number>(0);
  const [revertInventory, setRevertInventory] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // Eligible invoices for credit notes (only facturas, not already cancelled)
  const eligibleInvoices = sales.filter(
    s => s.documentType !== 'nota_venta' && s.status !== 'cancelled'
  );

  useEffect(() => {
    if (preselectedSale) {
      setSelectedInvoiceId(preselectedSale.id);
      setCreditSubtotal(preselectedSale.subtotal - (preselectedSale.discount || 0));
      setCreditTax(preselectedSale.taxAmount || 0);
    } else if (eligibleInvoices.length > 0 && !selectedInvoiceId) {
      const first = eligibleInvoices[0];
      setSelectedInvoiceId(first.id);
      setCreditSubtotal(first.subtotal - (first.discount || 0));
      setCreditTax(first.taxAmount || 0);
    }
  }, [preselectedSale, eligibleInvoices.length, isOpen]);

  const activeSale = sales.find(s => s.id === selectedInvoiceId);

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const found = sales.find(s => s.id === invId);
    if (found) {
      const netSub = found.subtotal - (found.discount || 0);
      setCreditSubtotal(netSub);
      setCreditTax(found.taxAmount || 0);
    }
  };

  const handleReasonChange = (newReason: CreditNoteReason) => {
    setReason(newReason);
    switch (newReason) {
      case 'ANULACION_TOTAL':
        setReasonDescription('Anulación total de la operación comercial y del comprobante electrónico.');
        setRevertInventory(true);
        if (activeSale) {
          setCreditSubtotal(activeSale.subtotal - (activeSale.discount || 0));
          setCreditTax(activeSale.taxAmount || 0);
        }
        break;
      case 'DEVOLUCION_MERCADERIA':
        setReasonDescription('Devolución de mercadería, apósito o joyería adquirida.');
        setRevertInventory(true);
        break;
      case 'DESCUENTO_BONIFICACION':
        setReasonDescription('Descuento o rebaja comercial aplicada con posterioridad a la emisión.');
        setRevertInventory(false);
        break;
      case 'ERROR_DATOS':
        setReasonDescription('Corrección por error en datos de razón social, RUC o concepto del cliente.');
        setRevertInventory(false);
        break;
    }
  };

  if (!isOpen) return null;

  const creditTotal = creditSubtotal + creditTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('sales.credit_note')) return;
    if (!activeSale) {
      alert('Por favor selecciona la factura a la que se aplicará la Nota de Crédito.');
      return;
    }

    if (creditTotal <= 0) {
      alert('El valor de la Nota de Crédito debe ser mayor a 0.');
      return;
    }

    if (saving) return;
    setSaving(true);
    let created: CreditNoteRecord;
    try {
      created = await addCreditNote({
      date: new Date().toISOString(),
      affectedInvoiceId: activeSale.id,
      affectedInvoiceNumber: activeSale.invoiceNumber,
      affectedInvoiceDate: activeSale.date.split('T')[0],
      clientName: activeSale.clientName,
      clientDni: activeSale.clientDni,
      clientPhone: activeSale.clientPhone,
      clientEmail: activeSale.clientEmail,
      reason,
      reasonDescription: reasonDescription.trim(),
      subtotal: creditSubtotal,
      taxRate: activeSale.taxRate || settings.defaultTaxRate || 15,
      taxAmount: creditTax,
      total: creditTotal,
      revertInventory,
      notes: notes.trim() || undefined,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo emitir la nota de crédito.');
      setSaving(false);
      return;
    }
    setSaving(false);

    alert(`✓ Nota de Crédito ${created.creditNoteNumber} emitida exitosamente en el sistema.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#25252E] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF3366]/15 text-[#FF3366] flex items-center justify-center font-bold text-xs">
              04
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Emitir Nota de Crédito Electrónica (SRI)
              </h2>
              <p className="text-[11px] text-neutral-400">
                Documento tributario oficial para anular, devolver o modificar facturas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Factura Afectada Selector */}
          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Factura a Modificar / Anular (Comprobante Origen) <span className="text-[#FF3366]">*</span>
            </label>
            <UiSelect
              value={selectedInvoiceId}
              onChange={e => handleSelectInvoice(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white text-xs focus:border-[#FF3366]/60"
            >
              <option value="" disabled>-- Selecciona una factura emitida --</option>
              {eligibleInvoices.map(s => (
                <option key={s.id} value={s.id}>
                  {s.invoiceNumber} — {s.clientName} ({formatMoney(s.total)}) · {new Date(s.date).toLocaleDateString()}
                </option>
              ))}
            </UiSelect>
          </div>

          {/* Active Invoice Info Card */}
          {activeSale && (
            <div className="p-3.5 bg-[#141419] rounded-2xl border border-[#282834] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Cliente / Razón Social:</span>
                <span className="font-bold text-white">{activeSale.clientName}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Cédula / RUC:</span>
                <span className="font-mono text-emerald-400">{activeSale.clientDni || 'Consumidor Final'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Concepto Facturado:</span>
                <span className="text-neutral-200 truncate max-w-[280px]">{activeSale.serviceName}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#22222A]">
                <span className="text-neutral-400">Total Original Facturado:</span>
                <span className="font-mono font-bold text-white">{formatMoney(activeSale.total)}</span>
              </div>
            </div>
          )}

          {/* Motivo Oficial SRI */}
          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Motivo de Modificación (Según Ficha Técnica SRI) <span className="text-[#FF3366]">*</span>
            </label>
            <UiSelect
              value={reason}
              onChange={e => handleReasonChange(e.target.value as CreditNoteReason)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white text-xs focus:border-[#FF3366]/60"
            >
              <option value="ANULACION_TOTAL">01 - ANULACIÓN TOTAL DE LA OPERACIÓN</option>
              <option value="DEVOLUCION_MERCADERIA">02 - DEVOLUCIÓN DE MERCADERÍA / JOYERÍA</option>
              <option value="DESCUENTO_BONIFICACION">03 - DESCUENTO O BONIFICACIÓN POSTERIOR</option>
              <option value="ERROR_DATOS">04 - CORRECCIÓN POR ERROR EN DATOS DE CLIENTE</option>
            </UiSelect>
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Justificación / Razón de Modificación <span className="text-[#FF3366]">*</span>
            </label>
            <input
              type="text"
              required
              value={reasonDescription}
              onChange={e => setReasonDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:border-[#FF3366]/60"
              placeholder="Ej. Devolución de joya por cambio de calibre, o anulación de cita..."
            />
          </div>

          {/* Importes de Acreditación */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#121215] rounded-xl border border-[#272730]">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Subtotal a Acreditar ({settings.currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={creditSubtotal}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setCreditSubtotal(val);
                  if (activeSale && activeSale.taxRate > 0) {
                    setCreditTax(Math.round(((val * activeSale.taxRate) / 100) * 100) / 100);
                  }
                }}
                className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white font-mono font-bold text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                IVA a Revertir ({settings.currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={creditTax}
                onChange={e => setCreditTax(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white font-mono font-bold text-xs"
              />
            </div>

            <div className="col-span-2 pt-2 border-t border-[#24242B] flex items-center justify-between">
              <span className="font-bold text-neutral-300">Total Nota de Crédito:</span>
              <span className="font-mono text-base font-bold text-[#FF3366]">
                {formatMoney(creditTotal)}
              </span>
            </div>
          </div>

          {/* Reversión de Inventario / Kardex */}
          <div className="p-3 bg-[#121215] rounded-xl border border-[#272730] flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={revertInventory}
                onChange={e => setRevertInventory(e.target.checked)}
                className="w-4 h-4 rounded text-[#FF3366] bg-[#18181D] border-[#272730]"
              />
              <div>
                <span className="font-bold text-white text-xs block">
                  📦 Reingresar mercadería / joyería al inventario (Kardex)
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  Genera automáticamente un movimiento de ajuste positivo en el Kardex
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Observaciones adicionales
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalle interno o motivo administrativo..."
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:border-[#FF3366]/60"
            />
          </div>

          <div className="pt-4 border-t border-[#25252E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Generar Nota de Crédito SRI</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

