import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ExpenseCategory } from '../../types';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose }) => {
  const { addExpense, formatMoney } = useStudio();

  const [category, setCategory] = useState<ExpenseCategory>('supplies_tattoo');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState<number>(50);
  const [taxDeductible, setTaxDeductible] = useState<boolean>(true);
  const [taxAmount, setTaxAmount] = useState<number>(10.5);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'bank_transfer'>('credit_card');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (taxDeductible) {
      setTaxAmount(Math.round(((val * 21) / 121) * 100) / 100);
    } else {
      setTaxAmount(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) {
      alert('Por favor complete la descripción y un importe válido');
      return;
    }

    addExpense({
      date: new Date().toISOString(),
      category,
      description: description.trim(),
      supplier: supplier.trim() || 'Proveedor General',
      amount,
      taxDeductible,
      taxAmount: taxDeductible ? taxAmount : 0,
      paymentMethod,
      invoiceReference: invoiceReference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Dialog box matching reference Dialog */}
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#25252E] flex items-center justify-between bg-[#121215]">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Registrar Gasto o Insumos</h2>
            <p className="text-[11px] text-neutral-400">Control de compras, material sanitario y suministros</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Categoría de Gasto
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60"
            >
              <option value="supplies_tattoo">Insumos de Tatuaje (Tintas, cartuchos, agujas, film)</option>
              <option value="supplies_piercing">Insumos de Piercing (Cánulas, pinzas, gasas)</option>
              <option value="jewelry_restock">Reposición de Joyería (Titanio F136, oro)</option>
              <option value="hygiene_sanitary">Bioseguridad & Higiene (Guantes, autoclave)</option>
              <option value="rent_studio">Alquiler del Local / Estudio</option>
              <option value="utilities">Suministros (Electricidad, agua, red)</option>
              <option value="software_terminals">Comisiones TPV / Pasarelas de Pago</option>
              <option value="marketing_ads">Marketing & Redes Sociales</option>
              <option value="maintenance">Mantenimiento de Máquinas & Cabinas</option>
              <option value="other_expense">Otros Gastos Generales</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Descripción del Gasto <span className="text-[#FF3366]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cajas de cartuchos Kwadron 03RL y 05RL"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">
                Proveedor
              </label>
              <input
                type="text"
                placeholder="Ej. Killer Ink, Barber DTS"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">
                N° de Factura / Ticket
              </label>
              <input
                type="text"
                placeholder="Ej. INV-2026-991"
                value={invoiceReference}
                onChange={e => setInvoiceReference(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">
                Importe Total con IVA <span className="text-[#FF3366]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={e => handleAmountChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono font-bold focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">
                Forma de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60"
              >
                <option value="credit_card">Tarjeta Bancaria / Débito</option>
                <option value="cash">Efectivo de la Caja</option>
                <option value="bank_transfer">Transferencia Bancaria</option>
              </select>
            </div>
          </div>

          {/* Tax Deductible Toggle */}
          <div className="p-3 bg-[#121215] rounded-xl border border-[#272730] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="taxDeduct-modal"
                checked={taxDeductible}
                onChange={e => {
                  setTaxDeductible(e.target.checked);
                  if (e.target.checked) {
                    setTaxAmount(Math.round(((amount * 21) / 121) * 100) / 100);
                  } else {
                    setTaxAmount(0);
                  }
                }}
                className="w-4 h-4 rounded text-[#FF3366] bg-[#18181D] border-[#272730]"
              />
              <label htmlFor="taxDeduct-modal" className="font-semibold text-neutral-300 cursor-pointer">
                Gasto Fiscalmente Deducible
              </label>
            </div>
            {taxDeductible && (
              <span className="text-[11px] font-mono text-[#FF3366] font-bold">
                IVA: {formatMoney(taxAmount)}
              </span>
            )}
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Notas Adicionales
            </label>
            <input
              type="text"
              placeholder="Detalle de lote o destino del material"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
            />
          </div>

          <div className="pt-4 border-t border-[#25252E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all"
            >
              Guardar Gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
