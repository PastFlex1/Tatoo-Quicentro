import React, { useState } from 'react';
import { UiSelect } from '../common/UiSelect';
import { usePermission } from '../../hooks/usePermission';
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
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Appointment, ServiceCategory, PaymentMethod, ClientProfile } from '../../types';
import { consultarIdentificacion } from '../../services/sriService';
import { DatePicker, TimePicker } from '../common/DatePicker';
import { getServiceCatalog, serviceCategoryLabel } from '../../data/serviceCatalog';
import { ConsentWizardModal } from '../clients/ConsentWizardModal';

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
  const { artists, clients, addAppointment, formatMoney, settings } = useStudio();

  const { guard: guardPermission, can } = usePermission();
  const todayStr = new Date().toISOString().split('T')[0];

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [sriNotice, setSriNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleLookupClientSri = async () => {
    const clean = clientDni.trim().replace(/\D/g, '');
    if (!clean) return;
    // 1) Cliente ya guardado: se cargan sus datos de la base, sin consultar al SRI
    const saved = clients.find(c => (c.dni || '').replace(/\D/g, '') === clean);
    if (saved) {
      setClientName(saved.name);
      if (saved.phone) setClientPhone(saved.phone);
      if (saved.email) setClientEmail(saved.email);
      if (saved.instagram) setClientInstagram(saved.instagram);
      setSriNotice({ text: `✓ Cliente registrado: ${saved.name} (datos cargados de la base)`, type: 'success' });
      return;
    }
    // 2) Cliente nuevo: se consulta en el SRI / Registro Civil
    setIsSearchingSri(true);
    setSriNotice(null);
    try {
      const res = await consultarIdentificacion(clean);
      if (res.found && res.nombre) {
        setClientName(res.nombre);
        // Look up known client
        const existing = clients.find(c => c.dni && c.dni.replace(/\D/g, '') === clean);
        if (existing) {
          if (existing.phone && !clientPhone) setClientPhone(existing.phone);
          if (existing.email && !clientEmail) setClientEmail(existing.email);
          if (existing.instagram && !clientInstagram) setClientInstagram(existing.instagram);
        }
        setSriNotice({
          text: `✓ ${res.nombre} (${res.regimen ? `Régimen ${res.regimen}` : 'SRI / Registro Civil Verificado'})`,
          type: 'success',
        });
      } else {
        setSriNotice({
          text: res.error || 'No registrado en SRI ni Registro Civil.',
          type: 'error',
        });
      }
    } catch {
      setSriNotice({ text: 'Error consultando catastro SRI.', type: 'error' });
    } finally {
      setIsSearchingSri(false);
    }
  };
  const [artistId, setArtistId] = useState(initialArtistId || (artists[0]?.id || ''));
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('tattoo');
  const [serviceName, setServiceName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(initialDate || todayStr);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number>(3.0);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositPaid, setDepositPaid] = useState<boolean>(false);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<PaymentMethod>('card');
  const [bodyPlacement, setBodyPlacement] = useState('');
  const [sizeApprox, setSizeApprox] = useState('');
  const [consentSigned, setConsentSigned] = useState<boolean>(false);
  const [consentWizard, setConsentWizard] = useState<{ key: number; client: ClientProfile } | null>(null);
  const [notes, setNotes] = useState('');
  const [designNotes, setDesignNotes] = useState('');

  if (!isOpen) return null;

  const selectedArtist = artists.find(a => a.id === artistId);

  // Catálogo de servicios del estudio (sección Servicios): de ahí salen nombre, duración y precio
  const catalog = getServiceCatalog(settings).filter(sv => sv.active);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  /** Hora fin = inicio + duración (formato HH:mm, sin pasar de 23:59) */
  const addHours = (start: string, hours: number) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(start || '');
    if (!m || !hours) return '';
    const total = Math.min(23 * 60 + 59, parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + Math.round(hours * 60));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const handleCategorySelect = (cat: ServiceCategory) => {
    setServiceCategory(cat);
    // Si el servicio elegido es de otro tipo, se suelta para elegir uno nuevo
    const current = catalog.find(sv => sv.id === serviceId);
    if (current && current.category !== cat) setServiceId('');
  };

  /** Al elegir un servicio del catálogo se completan los datos de la cita */
  const handleServiceSelect = (id: string) => {
    setServiceId(id);
    const sv = catalog.find(x => x.id === id);
    if (!sv) return;
    setServiceCategory(sv.category);
    setServiceName(sv.name);
    const hours = sv.hours && sv.hours > 0 ? sv.hours : sv.category === 'tattoo' ? 1 : 0.5;
    setEstimatedHours(hours);
    if (startTime) setEndTime(addHours(startTime, hours));
    if (sv.price > 0) setEstimatedPrice(r2(sv.price * (1 + (sv.taxRate || 0) / 100)));
  };

  // Cliente ya registrado (por cédula, o por nombre exacto si no se escribió cédula)
  const dniDigits = clientDni.replace(/\D/g, '');
  const savedClient = dniDigits
    ? clients.find(c => (c.dni || '').replace(/\D/g, '') === dniDigits)
    : clientName.trim()
    ? clients.find(c => c.name.trim().toLowerCase() === clientName.trim().toLowerCase())
    : undefined;
  const savedHasConsent = Boolean(savedClient && (savedClient.consentSigned || (savedClient.consentForms || []).length > 0));

  const openConsentWizard = () => {
    if (!clientName.trim()) {
      setSriNotice({ text: 'Escriba primero el nombre (o la cédula) del cliente para generar el consentimiento.', type: 'error' });
      return;
    }
    // Cliente nuevo: se pasa una ficha borrador; el asistente la registra al firmar
    const client: ClientProfile =
      savedClient ||
      ({
        id: `draft-${Date.now()}`,
        name: clientName.trim(),
        dni: clientDni.trim() || undefined,
        phone: clientPhone.trim() || undefined,
        email: clientEmail.trim() || undefined,
        instagram: clientInstagram.trim() || undefined,
        consentSigned: false,
        tags: [],
        createdAt: new Date().toISOString(),
      } as ClientProfile);
    setConsentWizard({ key: Date.now(), client });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('appointments.create')) return;
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
      serviceId: serviceId || undefined,
      taxRate: catalog.find(sv => sv.id === serviceId)?.taxRate,
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
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                2. Datos del Cliente
              </span>
              <span className="text-[10px] text-neutral-400">
                Consulta directa SRI / Registro Civil
              </span>
            </div>

            {/* SRI Notice */}
            {sriNotice && (
              <div className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${
                sriNotice.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">{sriNotice.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cédula / RUC with SRI search */}
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Cédula / RUC</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={clientDni}
                    onChange={e => {
                      setClientDni(e.target.value);
                      setSriNotice(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookupClientSri();
                      }
                    }}
                    placeholder="10 díg. Cédula / 13 díg. RUC"
                    className="flex-1 bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-neutral-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleLookupClientSri}
                    disabled={isSearchingSri || !clientDni.trim()}
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                    title="Buscar datos del cliente en el SRI"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSearchingSri ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                    <span>SRI</span>
                  </button>
                </div>
              </div>

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
                    placeholder="Ej. 099 123 4567"
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
                <UiSelect
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
                </UiSelect>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-neutral-400 block mb-1">Servicio del catálogo</label>
                <UiSelect
                  value={serviceId}
                  onChange={e => handleServiceSelect(e.target.value)}
                  placeholder={catalog.length ? 'Elija un servicio para llenar los datos…' : 'No hay servicios en el catálogo'}
                  searchable={catalog.length > 6}
                  searchPlaceholder="Buscar servicio…"
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                >
                  {(['tattoo', 'piercing', 'jewelry', 'other'] as ServiceCategory[])
                    .filter(cat => catalog.some(sv => sv.category === cat))
                    .map(cat => (
                      <optgroup key={cat} label={serviceCategoryLabel(cat)}>
                        {catalog
                          .filter(sv => sv.category === cat)
                          .map(sv => (
                            <option key={sv.id} value={sv.id}>
                              {sv.name}
                              {sv.hours ? ` · ${sv.hours} h` : ''}
                              {sv.price > 0 ? ` · ${formatMoney(r2(sv.price * (1 + (sv.taxRate || 0) / 100)))}` : ' · sin precio'}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                </UiSelect>
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
                <DatePicker
                  required
                  value={date}
                  onChange={v => setDate(v)}
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden" />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Hora Inicio *</label>
                <div className="relative">
                  <TimePicker
                    required
                    value={startTime}
                    onChange={v => {
                      setStartTime(v);
                      if (serviceId || !endTime) setEndTime(addHours(v, estimatedHours));
                    }}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden" />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Hora Fin Estimada</label>
                <div className="relative">
                  <TimePicker
                    value={endTime}
                    onChange={v => setEndTime(v)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden" />
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
                  onClick={() => {
                    const h = Math.max(0.5, estimatedHours - 0.5);
                    setEstimatedHours(h);
                    if (startTime) setEndTime(addHours(startTime, h));
                  }}
                  className="w-7 h-7 rounded-full bg-[#1C1C22] text-white hover:bg-[#FF3366] transition-colors flex items-center justify-center font-bold text-xs"
                >
                  -
                </button>
                <span className="font-mono font-bold text-xs text-white px-3 w-16 text-center">
                  {estimatedHours} h
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const h = estimatedHours + 0.5;
                    setEstimatedHours(h);
                    if (startTime) setEndTime(addHours(startTime, h));
                  }}
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
                    value={estimatedPrice || ''}
                    placeholder="0.00"
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
                    value={depositAmount || ''}
                    placeholder="0.00"
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#FF3366]/5 border border-[#FF3366]/25">
              <div className="text-[11px] min-w-0">
                <span className="text-white font-semibold block">Carta de consentimiento y ficha de salud</span>
                <span className={savedHasConsent || consentSigned ? 'text-emerald-300' : 'text-neutral-400'}>
                  {consentSigned
                    ? '✓ Consentimiento firmado para esta cita'
                    : savedHasConsent
                    ? `✓ ${savedClient?.name} ya tiene un consentimiento registrado`
                    : 'Genere el formulario para que el cliente lo firme.'}
                </span>
              </div>
              {can('clients.view_medical') && (
                <button
                  type="button"
                  onClick={openConsentWizard}
                  className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {savedHasConsent || consentSigned ? 'Nuevo consentimiento' : 'Generar consentimiento'}
                </button>
              )}
            </div>

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
              <span>Confirmar & Ver Proforma</span>
            </button>
          </div>
        </form>
      </div>

      {consentWizard && (
        <ConsentWizardModal
          key={consentWizard.key}
          isOpen
          initialClient={consentWizard.client}
          canConsent={can('clients.view_medical')}
          initialProcedure={{
            type: serviceCategory === 'piercing' || serviceCategory === 'jewelry' ? 'piercing' : serviceCategory === 'tattoo' ? 'tattoo' : 'other',
            description: serviceName,
            zone: bodyPlacement,
            artistId,
            date,
            price: estimatedPrice || undefined,
          }}
          onClose={() => setConsentWizard(null)}
          onSaved={form => {
            setConsentWizard(null);
            setConsentSigned(true);
            if (!clientDni && form.clientDni) setClientDni(form.clientDni);
            setSriNotice({ text: `✓ Consentimiento ${form.number} firmado y guardado en la ficha del cliente.`, type: 'success' });
          }}
        />
      )}
    </div>
  );
};
