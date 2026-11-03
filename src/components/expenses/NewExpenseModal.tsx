import React, { useState } from 'react';
import { X, FileCode, UploadCloud, CheckCircle2, AlertCircle, Building2, RefreshCw } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ExpenseCategory } from '../../types';
import { parseSriXml } from '../../utils/sriXmlParser';
import { consultarRuc } from '../../services/sriService';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose }) => {
  const { addExpense, formatMoney, settings } = useStudio();

  const [category, setCategory] = useState<ExpenseCategory>('supplies_tattoo');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState<number>(50);
  const [taxDeductible, setTaxDeductible] = useState<boolean>(true);
  const [taxAmount, setTaxAmount] = useState<number>(6.52);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'bank_transfer'>('credit_card');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierRuc, setSupplierRuc] = useState('');
  const [sriAccessKey, setSriAccessKey] = useState('');
  const [sriLoadedNotice, setSriLoadedNotice] = useState<string | null>(null);
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [sriSupplierStatus, setSriSupplierStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const defaultTaxRate = settings.defaultTaxRate || 15;

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (taxDeductible) {
      setTaxAmount(Math.round(((val * defaultTaxRate) / (100 + defaultTaxRate)) * 100) / 100);
    } else {
      setTaxAmount(0);
    }
  };

  const handleXmlFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseSriXml(text);

      setSupplier(parsed.supplierTradeName ? `${parsed.supplierTradeName} (${parsed.supplierName})` : parsed.supplierName);
      setSupplierRuc(parsed.supplierRuc);
      setInvoiceReference(parsed.invoiceNumber);
      setAmount(parsed.totalAmount);
      setTaxDeductible(parsed.taxAmount > 0);
      setTaxAmount(parsed.taxAmount);
      setPaymentMethod(parsed.paymentMethod);
      setCategory(parsed.suggestedCategory);
      setDescription(parsed.summaryDescription);
      setSriAccessKey(parsed.accessKey);
      setNotes(`Factura SRI Autorizada. RUC: ${parsed.supplierRuc} · Clave de Acceso: ${parsed.accessKey}`);

      setSriLoadedNotice(
        `✓ Datos extraídos del XML del SRI: Factura ${parsed.invoiceNumber} de ${parsed.supplierName} (${formatMoney(parsed.totalAmount)})`
      );
    } catch (err: any) {
      alert(`Error al procesar el archivo XML del SRI: ${err.message || 'Formato no compatible.'}`);
    }

    e.target.value = '';
  };

  const handleLookupSupplierRuc = async () => {
    const clean = supplierRuc.trim().replace(/\D/g, '');
    if (!clean) return;
    setIsSearchingSri(true);
    setSriSupplierStatus(null);
    try {
      const res = await consultarRuc(clean);
      if (res.found && res.nombre) {
        setSupplier(res.nombreComercial ? `${res.nombreComercial} (${res.nombre})` : res.nombre);
        setTaxDeductible(res.estado === 'ACTIVO');
        setSriSupplierStatus({
          text: `✓ ${res.nombre} (Régimen: ${res.regimen || 'GENERAL'} · Estado: ${res.estado || 'ACTIVO'})`,
          type: 'success',
        });
      } else {
        setSriSupplierStatus({
          text: res.error || 'RUC no encontrado en catastro del SRI.',
          type: 'error',
        });
      }
    } catch {
      setSriSupplierStatus({ text: 'Error consultando al SRI.', type: 'error' });
    } finally {
      setIsSearchingSri(false);
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
      supplierRuc: supplierRuc.trim() || undefined,
      sriAccessKey: sriAccessKey.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#25252E] flex items-center justify-between bg-[#121215]">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Registrar Gasto o Insumos</h2>
            <p className="text-[11px] text-neutral-400">Control de compras, material sanitario y suministros</p>
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
          {/* Quick SRI XML loader Box */}
          <div className="p-3.5 bg-[#121215] border border-dashed border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-white text-xs block truncate">
                  ¿Factura Electrónica del SRI?
                </span>
                <span className="text-[10px] text-neutral-400 block truncate">
                  Sube el archivo .XML para autocompletar todo
                </span>
              </div>
            </div>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold cursor-pointer transition-all shrink-0">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Cargar XML</span>
              <input
                type="file"
                accept=".xml,text/xml"
                onChange={handleXmlFileLoad}
                className="hidden"
              />
            </label>
          </div>

          {/* SRI loaded notification */}
          {sriLoadedNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{sriLoadedNotice}</span>
            </div>
          )}

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
              <option value="utilities">Suministros (Electricidad, agua, internet)</option>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-neutral-300">
                  RUC del Proveedor (SRI)
                </label>
                {supplierRuc.trim().length === 13 && (
                  <span className="text-[10px] text-emerald-400 font-mono">13 dígitos</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="13 dígitos (ej. 1790016919001)"
                  value={supplierRuc}
                  onChange={e => {
                    setSupplierRuc(e.target.value);
                    setSriSupplierStatus(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupSupplierRuc();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-[#FF3366]/60"
                />
                <button
                  type="button"
                  onClick={handleLookupSupplierRuc}
                  disabled={isSearchingSri || !supplierRuc.trim()}
                  className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-40"
                  title="Consultar RUC en el SRI"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearchingSri ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                  <span>SRI</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">
                Razón Social / Proveedor <span className="text-[#FF3366]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Distribuidora Tattoo Ecuador"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>
          </div>

          {/* Estado de validación SRI del proveedor */}
          {sriSupplierStatus && (
            <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              sriSupplierStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px]">{sriSupplierStatus.text}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              N° de Factura / Comprobante
            </label>
            <input
              type="text"
              placeholder="Ej. 001-002-00004521"
              value={invoiceReference}
              onChange={e => setInvoiceReference(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono text-xs placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
            />
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
                <option value="bank_transfer">Transferencia Bancaria</option>
                <option value="credit_card">Tarjeta Bancaria / Débito</option>
                <option value="cash">Efectivo de la Caja</option>
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
                    setTaxAmount(Math.round(((amount * defaultTaxRate) / (100 + defaultTaxRate)) * 100) / 100);
                  } else {
                    setTaxAmount(0);
                  }
                }}
                className="w-4 h-4 rounded text-[#FF3366] bg-[#18181D] border-[#272730]"
              />
              <label htmlFor="taxDeduct-modal" className="font-semibold text-neutral-300 cursor-pointer">
                Gasto Fiscalmente Deducible (Factura SRI)
              </label>
            </div>
            {taxDeductible && (
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                IVA: {formatMoney(taxAmount)}
              </span>
            )}
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Notas Adicionales / Clave de Acceso SRI
            </label>
            <input
              type="text"
              placeholder="Detalle o clave de acceso SRI"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
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
              className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
            >
              Guardar Gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
