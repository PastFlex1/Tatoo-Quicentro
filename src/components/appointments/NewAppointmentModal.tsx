import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Instagram,
  DollarSign,
  ShieldCheck,
  FileText,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Appointment, ServiceCategory, PaymentMethod } from '../../types';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialArtistId?: string;
  onAppointmentCreated?: (appointment: Appointment) => void;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialArtistId,
  onAppointmentCreated,
}) => {
  const { artists, addAppointment, formatMoney, settings } = useStudio();

  const todayStr = new Date().toISOString().split('T')[0];

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [artistId, setArtistId] = useState(initialArtistId || (artists[0]?.id || ''));
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('tattoo');
  const [serviceName, setServiceName] = useState('');
  const [date, setDate] = useState(initialDate || todayStr);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('14:00');
  const [estimatedHours, setEstimatedHours] = useState<number>(3.0);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(250);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [depositPaid, setDepositPaid] = useState<boolean>(true);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<PaymentMethod>('card');
  const [bodyPlacement, setBodyPlacement] = useState('');
  const [sizeApprox, setSizeApprox] = useState('');
  const [consentSigned, setConsentSigned] = useState<boolean>(false);
  const [notes, setNotes] = useState('');
  const [designNotes, setDesignNotes] = useState('');

  if (!isOpen) return null;

  const selectedArtist = artists.find(a => a.id === artistId);

  // Auto-suggest service name on category switch if empty
  const handleCategorySelect = (cat: ServiceCategory) => {
    setServiceCategory(cat);
    if (!serviceName || serviceName.startsWith('Tatuaje') || serviceName.startsWith('Piercing')) {
      if (cat === 'tattoo') {
        setServiceName('Tatuaje Personalizado');
        setEstimatedHours(3);
        setEstimatedPrice(250);
        setDepositAmount(50);
      } else if (cat === 'piercing') {
        setServiceName('Perforación Aséptica + Joya Titanio ASTM F136');
        setEstimatedHours(0.75);
        setEstimatedPrice(80);
        setDepositAmount(25);
      } else if (cat === 'jewelry') {
        setServiceName('Cambio de Joyería & Curación');
        setEstimatedHours(0.5);
        setEstimatedPrice(45);
        setDepositAmount(15);
      } else {
        setServiceName('Sesión Retoque / Consulta');
        setEstimatedHours(1);
        setEstimatedPrice(90);
        setDepositAmount(20);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !serviceName.trim() || !artistId) {
      alert('Por favor complete los campos obligatorios: Cliente, Artista y Servicio.');
      return;
    }

    const newApt = addAppointment({
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || 'No especificado',
      clientEmail: clientEmail.trim() || undefined,
      clientInstagram: clientInstagram.trim() || undefined,
      artistId,
      artistName: selectedArtist?.name || 'Artista del Estudio',
      serviceCategory,
      serviceName: serviceName.trim(),
      date,
      startTime,
      endTime,
      estimatedHours: Number(estimatedHours) || 1,
      estimatedPrice: Number(estimatedPrice) || 0,
      depositAmount: Number(depositAmount) || 0,
      depositPaid,
      depositPaymentMethod: depositPaid ? depositPaymentMethod : undefined,
      bodyPlacement: bodyPlacement.trim() || undefined,
      sizeApprox: sizeApprox.trim() || undefined,
      status: depositPaid ? 'confirmed' : 'scheduled',
      consentSigned,
      notes: notes.trim() || undefined,
      designNotes: designNotes.trim() || undefined,
    });

    if (onAppointmentCreated) {
      onAppointmentCreated(newApt);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#141417] border border-[#272730] rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header matching dark neon pink reference */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242A] bg-[#16161B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Agendar Nueva Cita
              </h2>
              <p className="text-[11px] text-neutral-400">
                Reserva de cabina, anticipo de seña y ficha técnica del cliente
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Service Category Selection (Pill Buttons) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              1. Tipo de Servicio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'tattoo', label: 'Tatuaje Artístico' },
                { id: 'piercing', label: 'Body Piercing' },
                { id: 'jewelry', label: 'Joyería / Cambio' },
                { id: 'other', label: 'Retoque / Consulta' },
              ].map(cat => {
                const isSelected = serviceCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id as ServiceCategory)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-[#FF3366] text-white border-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.35)]'
                        : 'bg-[#18181D] text-neutral-300 border-[#272730] hover:border-[#FF3366]/40'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Client Details */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              2. Datos del Cliente
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nombre Completo *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ej. Mateo Morales"
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Teléfono / WhatsApp *</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="Ej. +1 (555) 432-8765"
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Instagram (Opcional)</label>
                <div className="relative">
                  <Instagram className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="text"
                    value={clientInstagram}
                    onChange={e => setClientInstagram(e.target.value)}
                    placeholder="Ej. @mateo_ink"
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Email (Opcional)</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Artist Assignment & Service Name */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              3. Asignación de Artista & Cabina
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Artista Responsable *</label>
                <select
                  value={artistId}
                  onChange={e => setArtistId(e.target.value)}
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                >
                  {artists
                    .filter(a => a.active)
                    .map(art => (
                      <option key={art.id} value={art.id}>
                        {art.name} ({art.role} · {art.defaultCommissionRate}%)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Descripción del Servicio *</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="Ej. Manga Geometría Sagrada (Sesión 1)"
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Zona Anatómica</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="text"
                    value={bodyPlacement}
                    onChange={e => setBodyPlacement(e.target.value)}
                    placeholder="Ej. Antebrazo exterior, Costillas, Helix..."
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Dimensiones / Calibre</label>
                <input
                  type="text"
                  value={sizeApprox}
                  onChange={e => setSizeApprox(e.target.value)}
                  placeholder="Ej. 15 x 8 cm / 16G Titanio"
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Schedule, Date & Estimated Time */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              4. Fecha, Horario & Duración Estimada
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Fecha de la Cita *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Hora Inicio *</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Hora Fin Estimada</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Stepper for estimated hours matching reference - 1 + */}
            <div className="flex items-center justify-between pt-2 border-t border-[#23232A]">
              <div>
                <span className="text-xs font-medium text-neutral-300">Duración estimada en cabina:</span>
                <span className="text-[11px] text-neutral-400 block">Horas de máquina / servicio</span>
              </div>
              <div className="flex items-center gap-2 bg-[#121215] border border-[#2A2A33] rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setEstimatedHours(prev => Math.max(0.5, prev - 0.5))}
                  className="w-7 h-7 rounded-full bg-[#1C1C22] text-white hover:bg-[#FF3366] transition-colors flex items-center justify-center font-bold text-xs"
                >
                  -
                </button>
                <span className="font-mono font-bold text-xs text-white px-3 w-16 text-center">
                  {estimatedHours} h
                </span>
                <button
                  type="button"
                  onClick={() => setEstimatedHours(prev => prev + 0.5)}
                  className="w-7 h-7 rounded-full bg-[#1C1C22] text-white hover:bg-[#FF3366] transition-colors flex items-center justify-center font-bold text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Financials & Deposit (Seña) in USD ($) */}
          <div className="space-y-4 p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                5. Presupuesto & Seña (Anticipo de Reserva) en USD ($)
              </span>
              <span className="text-xs font-mono font-bold text-[#FF3366]">
                Moneda: {settings.currencyCode} ($)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Precio Total Estimado ($ USD)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={estimatedPrice}
                    onChange={e => setEstimatedPrice(Number(e.target.value))}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Seña / Depósito de Reserva ($ USD)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-3 top-3 text-[#FF3366]" />
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={depositAmount}
                    onChange={e => setDepositAmount(Number(e.target.value))}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-[#FF3366] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Deposit status and payment method */}
            <div className="p-3 rounded-xl bg-[#121215] border border-[#24242C] space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={depositPaid}
                    onChange={e => setDepositPaid(e.target.checked)}
                    className="rounded border-[#2D2D36] text-[#FF3366] focus:ring-[#FF3366] w-4 h-4 bg-[#141417]"
                  />
                  <span>¿La seña ya fue pagada por el cliente?</span>
                </label>
                {depositPaid && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Seña cobrada: {formatMoney(depositAmount)}
                  </span>
                )}
              </div>

              {depositPaid && (
                <div className="flex items-center gap-3 pt-2 border-t border-[#222228] text-xs">
                  <span className="text-neutral-400 text-[11px]">Método de la seña:</span>
                  {[
                    { id: 'card', label: 'Tarjeta / POS' },
                    { id: 'cash', label: 'Efectivo en Caja' },
                    { id: 'transfer', label: 'Transferencia / Zelle' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDepositPaymentMethod(m.id as PaymentMethod)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                        depositPaymentMethod === m.id
                          ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.3)]'
                          : 'bg-[#18181D] text-neutral-400 border border-[#292933] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-[11px] text-neutral-400 flex justify-between pt-1">
                <span>Saldo pendiente el día del servicio:</span>
                <span className="font-mono font-bold text-white">
                  {formatMoney(Math.max(0, estimatedPrice - depositAmount))}
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Health Consent & Notes */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              6. Bioseguridad, Consentimiento & Notas
            </span>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-[#121215] border border-[#282830] cursor-pointer hover:border-[#FF3366]/40 transition-colors">
              <input
                type="checkbox"
                checked={consentSigned}
                onChange={e => setConsentSigned(e.target.checked)}
                className="w-4 h-4 rounded border-[#2E2E38] text-[#FF3366] focus:ring-[#FF3366] bg-[#141417]"
              />
              <div className="text-xs">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF3366]" />
                  Consentimiento Informado Sanitario Firmado
                </span>
                <span className="text-neutral-400 text-[11px] block">
                  Exención de alergias, declaración jurada de mayoría de edad y normativa sanitaria.
                </span>
              </div>
            </label>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Notas de Diseño o Referencias</label>
              <textarea
                rows={2}
                value={designNotes}
                onChange={e => setDesignNotes(e.target.value)}
                placeholder="Detalles sobre agujas, tintas, estilo, referencias fotográficas aprobadas..."
                className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-hidden resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Notas Internas / Instrucciones para el Día</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Preferencias del cliente, descansos, alergias conocidas o preparación previa..."
                className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Action Buttons matching pill buttons in reference */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#24242A]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#2A2A33] text-neutral-400 hover:text-white hover:bg-[#1A1A20] text-xs font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_16px_rgba(255,51,102,0.4)] cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar & Agendar Cita</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
