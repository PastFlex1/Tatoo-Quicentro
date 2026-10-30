import React, { useState } from 'react';
import {
  X,
  FileText,
  User,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Percent,
} from 'lucide-react';
import { ServiceCategory, Proforma, ProformaItem } from '../../types';
import { useStudio } from '../../context/StudioContext';

interface NewProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProformaCreated?: (proforma: Proforma) => void;
}

export const NewProformaModal: React.FC<NewProformaModalProps> = ({
  isOpen,
  onClose,
  onProformaCreated,
}) => {
  const { artists, clients, settings, addProforma, convertProformaToAppointment } = useStudio();

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [artistId, setArtistId] = useState(artists[0]?.id || '');
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('tattoo');
  const [serviceName, setServiceName] = useState('');
  const [bodyPlacement, setBodyPlacement] = useState('');
  const [sizeApprox, setSizeApprox] = useState('');
  const [complexity, setComplexity] = useState<'Sencillo / Flash' | 'Medio' | 'Complejo / Detallado' | 'Gran Formato'>('Medio');

  // Multi-item breakdown
  const [items, setItems] = useState<ProformaItem[]>([
    {
      id: 'item-1',
      concept: 'Sesión de Tatuaje Artístico / Mano de obra',
      category: 'tattoo',
      hours: 2,
      quantity: 1,
      unitPrice: 150,
      total: 150,
    },
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate || 0);
  const [suggestedDeposit, setSuggestedDeposit] = useState<number>(50);
  const [validDays, setValidDays] = useState<number>(15);
  const [notes, setNotes] = useState('');
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('11:00');

  if (!isOpen) return null;

  // Autocomplete client selection
  const handleSelectClient = (cName: string) => {
    setClientName(cName);
    const found = clients.find(c => c.name.toLowerCase() === cName.toLowerCase());
    if (found) {
      if (found.phone) setClientPhone(found.phone);
      if (found.email) setClientEmail(found.email);
      if (found.instagram) setClientInstagram(found.instagram);
    }
  };

  // Item management
  const handleAddItem = () => {
    const newItem: ProformaItem = {
      id: `item-${Date.now()}`,
      concept: serviceCategory === 'piercing' ? 'Joyería Titanio ASTM F136' : 'Material & Preparación Aséptica',
      category: serviceCategory,
      quantity: 1,
      unitPrice: 30,
      total: 30,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (index: number, updated: Partial<ProformaItem>) => {
    setItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index], ...updated };
      const qty = target.quantity || 1;
      const unit = target.unitPrice || 0;
      target.total = Math.round(qty * unit * 100) / 100;
      copy[index] = target;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxAmount = Math.round(((subtotal - discount) * (taxRate / 100)) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discount + taxAmount) * 100) / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !serviceName.trim()) {
      alert('Por favor indica el nombre del cliente y el nombre del servicio o concepto.');
      return;
    }

    const selectedArtist = artists.find(a => a.id === artistId);
    const today = new Date();
    const validUntilDate = new Date(today);
    validUntilDate.setDate(validUntilDate.getDate() + (Number(validDays) || 15));

    const totalEstimatedHours = items.reduce((acc, it) => acc + (it.hours || 0), 0);

    const newProforma = addProforma({
      date: today.toISOString().split('T')[0],
      validUntil: validUntilDate.toISOString().split('T')[0],
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      clientInstagram: clientInstagram.trim() || undefined,
      artistId,
      artistName: selectedArtist?.name || 'Artista del Estudio',
      serviceCategory,
      serviceName: serviceName.trim(),
      bodyPlacement: bodyPlacement.trim() || undefined,
      sizeApprox: sizeApprox.trim() || undefined,
      complexity,
      items,
      subtotal,
      discount: Number(discount) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount,
      total,
      suggestedDeposit: Number(suggestedDeposit) || 0,
      estimatedHours: totalEstimatedHours > 0 ? totalEstimatedHours : undefined,
      status: autoSchedule ? 'accepted' : 'pending',
      termsAndConditions: 'Proforma y presupuesto oficial. Válida por ' + validDays + ' días. Anticipo requerido para reservar cabina y materiales estériles.',
      notes: notes.trim() || undefined,
    });

    if (autoSchedule) {
      convertProformaToAppointment(newProforma.id, scheduleDate, scheduleTime, false);
    }

    if (onProformaCreated) {
      onProformaCreated(newProforma);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#141417] border border-[#272730] rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242A] bg-[#16161B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Nueva Proforma / Cotización Oficial
              </h2>
              <p className="text-[11px] text-neutral-400">
                Presupuesto desglosado para clientes antes de agendar o abonar seña
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#2A2A34] text-neutral-400 hover:text-white hover:bg-[#1E1E24] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Categoría de Servicio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'tattoo', label: 'Tatuaje Artístico' },
                { id: 'piercing', label: 'Body Piercing' },
                { id: 'jewelry', label: 'Joyería Titanio/Oro' },
                { id: 'aftercare', label: 'Cuidado & Curación' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setServiceCategory(cat.id as ServiceCategory);
                    if (!serviceName) {
                      setServiceName(
                        cat.id === 'tattoo'
                          ? 'Tatuaje Personalizado'
                          : cat.id === 'piercing'
                          ? 'Perforación Aséptica'
                          : 'Joyería F136'
                      );
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    serviceCategory === cat.id
                      ? 'bg-[#FF3366] text-white border-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.3)]'
                      : 'bg-[#18181D] text-neutral-300 border-[#2A2A34] hover:bg-[#202027]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-3 bg-[#18181D] p-4 rounded-2xl border border-[#24242A]">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-[#FF3366]" />
              <span>Datos del Cliente</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={e => handleSelectClient(e.target.value)}
                  placeholder="Ej: Sofía Martínez"
                  list="clients-list"
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
                />
                <datalist id="clients-list">
                  {clients.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Instagram / Red Social
                </label>
                <input
                  type="text"
                  value={clientInstagram}
                  onChange={e => setClientInstagram(e.target.value)}
                  placeholder="@usuario"
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>
            </div>
          </div>

          {/* Technical & Art Details */}
          <div className="space-y-3 bg-[#18181D] p-4 rounded-2xl border border-[#24242A]">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#FF3366]" />
              <span>Detalles Artísticos & Artista Asignado</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Artista Responsable
                </label>
                <select
                  value={artistId}
                  onChange={e => setArtistId(e.target.value)}
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]"
                >
                  {artists.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role} - {a.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Nombre del Proyecto / Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="Ej: Media Manga Samurai Geometría"
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Zona / Ubicación Anatómica
                </label>
                <input
                  type="text"
                  value={bodyPlacement}
                  onChange={e => setBodyPlacement(e.target.value)}
                  placeholder="Ej: Antebrazo externo, Costillas, Nostril"
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Tamaño Aproximado / Medidas
                </label>
                <input
                  type="text"
                  value={sizeApprox}
                  onChange={e => setSizeApprox(e.target.value)}
                  placeholder="Ej: 15x10 cm, Flash chico, etc."
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Complejidad del Diseño
                </label>
                <select
                  value={complexity}
                  onChange={e => setComplexity(e.target.value as any)}
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]"
                >
                  <option value="Sencillo / Flash">Sencillo / Flash</option>
                  <option value="Medio">Medio</option>
                  <option value="Complejo / Detallado">Complejo / Detallado</option>
                  <option value="Gran Formato">Gran Formato (Manga / Espalda)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Validez del Presupuesto (Días)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={validDays}
                  onChange={e => setValidDays(Number(e.target.value))}
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table Breakdown */}
          <div className="space-y-3 bg-[#18181D] p-4 rounded-2xl border border-[#24242A]">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Desglose de Conceptos & Precios
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FF3366]/15 text-[#FF3366] hover:bg-[#FF3366]/25 border border-[#FF3366]/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Concepto</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 bg-[#121215] rounded-xl border border-[#25252E]"
                >
                  <input
                    type="text"
                    value={item.concept}
                    onChange={e => handleUpdateItem(index, { concept: e.target.value })}
                    placeholder="Concepto o descripción..."
                    className="flex-1 min-w-[140px] bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-hidden"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <span>Horas:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={item.hours ?? ''}
                        onChange={e => handleUpdateItem(index, { hours: Number(e.target.value) })}
                        placeholder="h"
                        className="w-12 bg-[#1A1A20] border border-[#2C2C36] rounded px-1.5 py-1 text-center text-xs text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <span>Cant:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(index, { quantity: Number(e.target.value) })}
                        className="w-12 bg-[#1A1A20] border border-[#2C2C36] rounded px-1.5 py-1 text-center text-xs text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <span>Precio:</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unitPrice}
                        onChange={e => handleUpdateItem(index, { unitPrice: Number(e.target.value) })}
                        className="w-16 bg-[#1A1A20] border border-[#2C2C36] rounded px-1.5 py-1 text-right text-xs text-white font-mono"
                      />
                    </div>

                    <div className="w-16 text-right font-mono text-xs font-bold text-white">
                      ${item.total.toFixed(2)}
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-[#202028]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations & Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#262630]">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Descuento ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-[#FF3366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  IVA / Tax (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-[#FF3366]"
                  />
                  <Percent className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-emerald-400 font-semibold mb-1">
                  Anticipo / Seña Sugerida ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={suggestedDeposit}
                  onChange={e => setSuggestedDeposit(Number(e.target.value))}
                  className="w-full bg-[#121215] border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Total Highlight */}
            <div className="p-3 bg-[#121215] rounded-xl border border-[#262630] flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase">
                TOTAL PRESUPUESTO / PROFORMA:
              </span>
              <span className="text-lg font-black text-white font-mono">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Option: Convert / Schedule into Calendar immediately */}
          <div className="p-4 bg-[#18181D] rounded-2xl border border-[#24242A] space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={e => setAutoSchedule(e.target.checked)}
                className="rounded border-[#2C2C38] text-[#FF3366] focus:ring-[#FF3366] bg-[#121215]"
              />
              <span className="text-xs font-bold text-white">
                Agendar Cita en Calendario inmediatamente con esta Proforma
              </span>
            </label>

            {autoSchedule && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Fecha de la Cita
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Hora de Inicio
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-[#121215] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              Notas u Observaciones para el Cliente
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Instrucciones previas, tipo de piel, preferencias de tinta o consideraciones sanitarias..."
              className="w-full bg-[#18181D] border border-[#2A2A34] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#24242A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-neutral-400 hover:text-white hover:bg-[#1E1E24] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#FF3366] text-white hover:bg-[#e02958] transition-colors shadow-[0_0_15px_rgba(255,51,102,0.3)]"
            >
              <FileText className="w-4 h-4" />
              <span>{autoSchedule ? 'Crear Proforma & Agendar' : 'Generar Proforma Oficial'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

