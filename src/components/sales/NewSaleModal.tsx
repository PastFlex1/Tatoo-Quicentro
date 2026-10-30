import React, { useState, useEffect } from 'react';
import { X, Sparkles, User, FileText, Minus, Plus, ShieldCheck } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { PaymentMethod, SaleRecord, ServiceCategory } from '../../types';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated?: (sale: SaleRecord) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSaleCreated }) => {
  const { artists, settings, addSale, formatMoney } = useStudio();

  // Form states
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('tattoo');
  const [serviceName, setServiceName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [artistId, setArtistId] = useState('');
  const [hours, setHours] = useState<number>(3);
  const [pieces, setPieces] = useState<number>(1);
  const [subtotal, setSubtotal] = useState<number>(200);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [consentFormSigned, setConsentFormSigned] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [customCommission, setCustomCommission] = useState<number>(settings.defaultArtistCommission);

  useEffect(() => {
    if (artists.length > 0 && !artistId) {
      setArtistId(artists[0].id);
      setCustomCommission(artists[0].defaultCommissionRate);
    }
  }, [artists, artistId]);

  const handleArtistChange = (id: string) => {
    setArtistId(id);
    const selected = artists.find(a => a.id === id);
    if (selected) {
      setCustomCommission(selected.defaultCommissionRate);
    }
  };

  useEffect(() => {
    if (serviceCategory === 'tattoo' && !serviceName) {
      setServiceName('Tatuaje Personalizado (Sesión)');
      setSubtotal(250);
      setHours(3);
    } else if (serviceCategory === 'piercing' && (!serviceName || serviceName.includes('Tatuaje'))) {
      setServiceName('Perforación Nostril + Labret Titanio ASTM F136');
      setSubtotal(55);
    } else if (serviceCategory === 'jewelry' && (!serviceName || serviceName.includes('Perforación'))) {
      setServiceName('Aro Bisagra Clicker Titanio Anodizado');
      setSubtotal(35);
    } else if (serviceCategory === 'aftercare' && (!serviceName || serviceName.includes('Aro'))) {
      setServiceName('Bálsamo Cicatrizante Balm Tattoo Vegano 50g');
      setSubtotal(15);
    }
  }, [serviceCategory]);

  if (!isOpen) return null;

  const taxableBase = Math.max(0, subtotal - discount);
  const calculatedTax = Math.round(((taxableBase * taxRate) / 100) * 100) / 100;
  const grandTotal = Math.round((taxableBase + calculatedTax) * 100) / 100;
  const balanceToPay = Math.max(0, Math.round((grandTotal - depositAmount) * 100) / 100);

  const artistCalculatedShare = Math.round(((taxableBase * customCommission) / 100) * 100) / 100;
  const studioCalculatedShare = Math.round((taxableBase - artistCalculatedShare) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor introduce el nombre del cliente');
      return;
    }

    const selectedArtist = artists.find(a => a.id === artistId);
    const artistName = selectedArtist ? selectedArtist.name : 'Artista del Estudio';

    const saleRecord = addSale({
      date: new Date().toISOString(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientDni: clientDni.trim() || undefined,
      serviceCategory,
      serviceName: serviceName.trim() || 'Servicio de Estudio',
      artistId,
      artistName,
      hours: serviceCategory === 'tattoo' ? hours : undefined,
      pieces: pieces || 1,
      subtotal,
      discount,
      taxRate,
      taxAmount: calculatedTax,
      total: grandTotal,
      depositAmount,
      amountPaidNow: balanceToPay,
      remainingBalance: 0,
      paymentMethod,
      tipAmount,
      artistCommissionPercent: customCommission,
      artistShare: artistCalculatedShare,
      studioShare: studioCalculatedShare,
      status: depositAmount > 0 && balanceToPay === 0 ? 'deposit_only' : 'completed',
      consentFormSigned,
      notes: notes.trim() || undefined,
    });

    if (onSaleCreated) {
      onSaleCreated(saleRecord);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Dialog box matching reference Dialog */}
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Dialog Header */}
        <div className="px-6 py-4 border-b border-[#25252E] flex items-center justify-between bg-[#121215]">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Nueva Venta / Sesión POS</h2>
            <p className="text-[11px] text-neutral-400">Emisión de ticket contable y liquidación de artista</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Category Tabs with Pink Active Line / Pills */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Categoría del Servicio
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'tattoo', label: 'Tatuaje' },
                { id: 'piercing', label: 'Piercing' },
                { id: 'jewelry', label: 'Joyería' },
                { id: 'aftercare', label: 'Aftercare' },
                { id: 'other', label: 'Otro' },
              ].map(cat => {
                const isSelected = serviceCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setServiceCategory(cat.id as ServiceCategory)}
                    className={`py-1.5 px-4 text-xs rounded-full font-semibold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#FF3366] text-white shadow-[0_0_12px_rgba(255,51,102,0.4)]'
                        : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client & Artist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nombre del Cliente <span className="text-[#FF3366]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Lucas Fernández"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Tatuador / Piercer Asignado
              </label>
              <select
                value={artistId}
                onChange={e => handleArtistChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
              >
                {artists.map(art => (
                  <option key={art.id} value={art.id}>
                    {art.name} ({art.role} - {art.defaultCommissionRate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                DNI / Identificación Sanitaria
              </label>
              <input
                type="text"
                placeholder="Ej. 12345678Z"
                value={clientDni}
                onChange={e => setClientDni(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Teléfono
              </label>
              <input
                type="text"
                placeholder="+34 600 000 000"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>
          </div>

          {/* Service Name & Stepper Counter matching reference `- 1 +` */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Descripción del Trabajo
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>

            {/* Stepper control `- 1 +` (faithfully matching reference image) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                {serviceCategory === 'tattoo' ? 'Horas' : 'Cantidad'}
              </label>
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#121215] border border-[#272730] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    if (serviceCategory === 'tattoo') setHours(prev => Math.max(0.5, prev - 0.5));
                    else setPieces(prev => Math.max(1, prev - 1));
                  }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-white text-xs">
                  {serviceCategory === 'tattoo' ? `${hours} hrs` : pieces}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (serviceCategory === 'tattoo') setHours(prev => prev + 0.5);
                    else setPieces(prev => prev + 1);
                  }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[#FF3366] hover:bg-[#25252E] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Card with Pink Accents */}
          <div className="p-4 rounded-2xl bg-[#121215] border border-[#272730] space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Importes y Porcentajes</span>
              <span className="text-[11px] text-[#FF3366] font-mono">Cálculo automático</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Subtotal Bruto</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={subtotal}
                  onChange={e => setSubtotal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Descuento</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">IVA %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Seña Previa</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositAmount}
                  onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>
            </div>

            {/* Split Preview */}
            <div className="pt-3 border-t border-[#24242B] grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-[#18181D] border border-[#272730]">
                <span className="text-[10px] text-neutral-400 block">Artista ({customCommission}%):</span>
                <span className="font-mono font-bold text-[#FF3366] text-xs">
                  {formatMoney(artistCalculatedShare)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#18181D] border border-[#272730]">
                <span className="text-[10px] text-neutral-400 block">Estudio ({100 - customCommission}%):</span>
                <span className="font-mono font-bold text-white text-xs">
                  {formatMoney(studioCalculatedShare)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30">
                <span className="text-[10px] text-[#FF4D79] block font-semibold">Total a Cobrar:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {formatMoney(balanceToPay)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method & Tip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60"
              >
                <option value="card">Tarjeta / TPV / Datáfono</option>
                <option value="cash">Efectivo en Caja</option>
                <option value="transfer">Transferencia / Bizum / Zelle</option>
                <option value="split">Cobro Mixto (Efectivo + Tarjeta)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Propina Artista (Opcional)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={tipAmount}
                onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>
          </div>

          {/* Sanitary Consent Toggle / Checkbox matching reference style */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#121215] border border-[#272730]">
            <input
              type="checkbox"
              id="consent-sale"
              checked={consentFormSigned}
              onChange={e => setConsentFormSigned(e.target.checked)}
              className="w-4 h-4 rounded text-[#FF3366] bg-[#18181D] border-[#272730]"
            />
            <label htmlFor="consent-sale" className="text-xs text-neutral-300 cursor-pointer">
              <span className="font-bold text-white">Consentimiento Sanitario Firmado</span>{' '}
              <span className="text-neutral-500">(Ficha médica oficial exigida por normativa)</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Observaciones
            </label>
            <input
              type="text"
              placeholder="Zona de la piel, curación o notas del tatuaje"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
            />
          </div>

          {/* Footer with Pill Button matching reference BUTTON */}
          <div className="pt-4 border-t border-[#25252E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,51,102,0.4)] transition-all"
            >
              Emitir Ticket & Registrar Cobro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
