import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  User,
  Minus,
  Plus,
  ShieldCheck,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Layers,
  Calendar,
  Boxes,
  ReceiptText,
  CheckCircle2,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Appointment, InventoryItem, PaymentMethod, SaleRecord, ServiceCategory } from '../../types';

interface PosViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
}

interface QuickPreset {
  id: string;
  category: ServiceCategory;
  name: string;
  price: number;
  hours?: number;
  subtitle: string;
}

const QUICK_SERVICE_PRESETS: QuickPreset[] = [
  {
    id: 'pre-tat-flash',
    category: 'tattoo',
    name: 'Tatuaje Flash / Línea Fina Pequeño',
    price: 90,
    hours: 1,
    subtitle: 'Hasta 5 cm · 1 hora en cabina',
  },
  {
    id: 'pre-tat-mid',
    category: 'tattoo',
    name: 'Tatuaje Personalizado (Media Sesión)',
    price: 250,
    hours: 3,
    subtitle: 'Diseño a medida · 3 horas',
  },
  {
    id: 'pre-tat-full',
    category: 'tattoo',
    name: 'Sesión Completa Blackwork / Realismo',
    price: 480,
    hours: 6,
    subtitle: 'Jornada completa · 6 horas',
  },
  {
    id: 'pre-tat-deposit',
    category: 'tattoo',
    name: 'Seña / Reserva de Cita Tatuaje',
    price: 100,
    hours: 1,
    subtitle: 'Anticipo para bloqueo de agenda',
  },
  {
    id: 'pre-prc-basic',
    category: 'piercing',
    name: 'Piercing Nostril / Lóbulo + Joya Titanio F136',
    price: 55,
    subtitle: 'Incluye joya grado implante estéril',
  },
  {
    id: 'pre-prc-cart',
    category: 'piercing',
    name: 'Piercing Cartílago (Helix / Septum / Conch)',
    price: 65,
    subtitle: 'Aguja americana + Labret/Clicker F136',
  },
  {
    id: 'pre-prc-double',
    category: 'piercing',
    name: 'Combo Doble Perforación + Joyería Titanio',
    price: 95,
    subtitle: '2 perforaciones en misma sesión',
  },
];

export const PosView: React.FC<PosViewProps> = ({ onOpenReceipt }) => {
  const {
    artists,
    inventory,
    appointments,
    filteredSales,
    clients,
    settings,
    addSale,
    addKardexMovement,
    updateAppointment,
    formatMoney,
    setActiveTab,
  } = useStudio();

  // Form states
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('tattoo');
  const [serviceName, setServiceName] = useState('Tatuaje Personalizado (Media Sesión)');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [artistId, setArtistId] = useState('');
  const [hours, setHours] = useState<number>(3);
  const [pieces, setPieces] = useState<number>(1);
  const [subtotal, setSubtotal] = useState<number>(250);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [consentFormSigned, setConsentFormSigned] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [customCommission, setCustomCommission] = useState<number>(settings.defaultArtistCommission);

  // Split payment & cash tendered states
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitTransfer, setSplitTransfer] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');

  // Linked Appointment or Inventory Item
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(null);
  const [linkedInventoryItemId, setLinkedInventoryItemId] = useState<string | null>(null);
  const [lastCreatedSale, setLastCreatedSale] = useState<SaleRecord | null>(null);

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

  // Pending appointments that can be billed in POS
  const pendingAppointments = useMemo(() => {
    return appointments.filter(
      a => a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no_show'
    );
  }, [appointments]);

  // Retail items from inventory
  const retailItems = useMemo(() => {
    return inventory.filter(i => i.isForSale && i.currentStock > 0);
  }, [inventory]);

  // Calculations
  const taxableBase = Math.max(0, subtotal - discount);
  const calculatedTax = Math.round(((taxableBase * taxRate) / 100) * 100) / 100;
  const grandTotal = Math.round((taxableBase + calculatedTax) * 100) / 100;
  const balanceToPay = Math.max(0, Math.round((grandTotal - depositAmount) * 100) / 100);

  const artistCalculatedShare = Math.round(((taxableBase * customCommission) / 100) * 100) / 100;
  const studioCalculatedShare = Math.round((taxableBase - artistCalculatedShare) * 100) / 100;

  const cashReceivedNum = parseFloat(cashTendered) || 0;
  const changeToReturn =
    paymentMethod === 'cash' && cashReceivedNum > balanceToPay + tipAmount
      ? Math.round((cashReceivedNum - (balanceToPay + tipAmount)) * 100) / 100
      : 0;

  // Load from appointment
  const handleSelectAppointment = (apt: Appointment) => {
    setLinkedAppointmentId(apt.id);
    setLinkedInventoryItemId(null);
    setServiceCategory(apt.serviceCategory);
    setServiceName(apt.serviceName);
    setClientName(apt.clientName);
    setClientPhone(apt.clientPhone || '');
    setArtistId(apt.artistId);
    const foundArtist = artists.find(a => a.id === apt.artistId);
    if (foundArtist) setCustomCommission(foundArtist.defaultCommissionRate);
    setHours(apt.estimatedHours || 1);
    setPieces(1);
    setSubtotal(apt.estimatedPrice);
    setDiscount(0);
    setDepositAmount(apt.depositPaid ? apt.depositAmount : 0);
    setConsentFormSigned(apt.consentSigned);
    setNotes(
      `Cita agendada (${apt.date} ${apt.startTime})${apt.bodyPlacement ? ` · Zona: ${apt.bodyPlacement}` : ''}`
    );
  };

  // Load from preset
  const handleSelectPreset = (preset: QuickPreset) => {
    setLinkedAppointmentId(null);
    setLinkedInventoryItemId(null);
    setServiceCategory(preset.category);
    setServiceName(preset.name);
    setSubtotal(preset.price);
    if (preset.hours) setHours(preset.hours);
    setPieces(1);
  };

  // Load from retail inventory item
  const handleSelectRetailItem = (item: InventoryItem) => {
    setLinkedAppointmentId(null);
    setLinkedInventoryItemId(item.id);
    const cat: ServiceCategory = item.category === 'jewelry' ? 'jewelry' : 'aftercare';
    setServiceCategory(cat);
    setServiceName(`${item.name} (${item.brand})`);
    setPieces(1);
    setSubtotal(item.retailPrice || item.unitCost * 2);
    setDepositAmount(0);
    setConsentFormSigned(false);
    setCustomCommission(cat === 'jewelry' ? 30 : 20);
  };

  const handleResetForm = () => {
    setLinkedAppointmentId(null);
    setLinkedInventoryItemId(null);
    setClientName('');
    setClientPhone('');
    setClientDni('');
    setServiceCategory('tattoo');
    setServiceName('Tatuaje Personalizado (Media Sesión)');
    setSubtotal(250);
    setDiscount(0);
    setDepositAmount(0);
    setTipAmount(0);
    setHours(3);
    setPieces(1);
    setCashTendered('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor ingresa el nombre del cliente para emitir el ticket.');
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
      cashPaid:
        paymentMethod === 'cash'
          ? balanceToPay
          : paymentMethod === 'split'
          ? splitCash
          : 0,
      cardPaid:
        paymentMethod === 'card'
          ? balanceToPay
          : paymentMethod === 'split'
          ? splitCard
          : 0,
      transferPaid:
        paymentMethod === 'transfer'
          ? balanceToPay
          : paymentMethod === 'split'
          ? splitTransfer
          : 0,
      tipAmount,
      artistCommissionPercent: customCommission,
      artistShare: artistCalculatedShare,
      studioShare: studioCalculatedShare,
      status: depositAmount > 0 && balanceToPay === 0 ? 'deposit_only' : 'completed',
      consentFormSigned,
      notes: notes.trim() || undefined,
    });

    // If linked to an appointment, mark appointment as completed
    if (linkedAppointmentId) {
      updateAppointment(linkedAppointmentId, {
        status: 'completed',
        saleId: saleRecord.id,
      });
    }

    // If linked to an inventory item, automatically deduct stock in Kardex
    if (linkedInventoryItemId) {
      addKardexMovement({
        itemId: linkedInventoryItemId,
        type: 'retail_sale',
        quantity: pieces || 1,
        reference: saleRecord.invoiceNumber,
        concept: `Venta POS a ${clientName.trim()} (${saleRecord.invoiceNumber})`,
        responsible: artistName,
      });
    }

    setLastCreatedSale(saleRecord);
    onOpenReceipt(saleRecord);
    handleResetForm();
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top POS Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Terminal Punto de Venta (POS) & Facturación en Cabina
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400">
            Sección exclusiva de cobro rápido, liquidación automática de comisiones de artistas y descarga de Kardex.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {lastCreatedSale && (
            <button
              onClick={() => onOpenReceipt(lastCreatedSale)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Último Ticket: {lastCreatedSale.invoiceNumber}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleResetForm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-neutral-300 hover:text-white text-xs font-medium transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>Limpiar Terminal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-white text-xs font-semibold transition-all"
          >
            <ReceiptText className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>Ver Historial de Ventas</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN (7/12 or 8/12): Quick Selectors + Service & Client Details */}
        <div className="xl:col-span-7 2xl:col-span-8 space-y-4 sm:space-y-5">
          {/* 1. Cargar Cita Agendada (1-Click Import) */}
          {pendingAppointments.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span>Cargar Cliente desde Citas en Curso / Agendadas</span>
                </div>
                <span className="text-[10px] font-mono text-[#FF3366]">
                  Clic para autocompletar cobro
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                {pendingAppointments.slice(0, 6).map(apt => {
                  const isSelected = linkedAppointmentId === apt.id;
                  return (
                    <button
                      type="button"
                      key={apt.id}
                      onClick={() => handleSelectAppointment(apt)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#FF3366]/15 border-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]'
                          : 'bg-[#121215] border-[#26262F] hover:border-[#FF3366]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-white truncate">{apt.clientName}</span>
                        <span className="font-mono text-[#FF3366] font-bold shrink-0">
                          {formatMoney(apt.estimatedPrice)}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{apt.serviceName}</div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1.5 pt-1.5 border-t border-[#22222A]">
                        <span className="truncate">{apt.artistName}</span>
                        {apt.depositAmount > 0 && (
                          <span className="text-emerald-400 font-mono">
                            Seña: {formatMoney(apt.depositAmount)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Catálogo Rápido de Servicios y Productos en Stock */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24242B] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#FF3366]" />
                <span>1. Categoría y Catálogo Rápido POS</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'tattoo', label: 'Tatuajes' },
                  { id: 'piercing', label: 'Piercings' },
                  { id: 'jewelry', label: 'Joyería Stock' },
                  { id: 'aftercare', label: 'Aftercare Stock' },
                  { id: 'other', label: 'Otro / Libre' },
                ].map(cat => {
                  const isSelected = serviceCategory === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => {
                        setServiceCategory(cat.id as ServiceCategory);
                        setLinkedInventoryItemId(null);
                      }}
                      className={`py-1 px-3 text-xs rounded-full font-semibold transition-all whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-[#FF3366] text-white shadow-[0_0_10px_rgba(255,51,102,0.4)]'
                          : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets or Live Inventory Cards */}
            {(serviceCategory === 'tattoo' || serviceCategory === 'piercing') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                {QUICK_SERVICE_PRESETS.filter(p => p.category === serviceCategory).map(preset => {
                  const isActive = serviceName === preset.name && subtotal === preset.price;
                  return (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-[#FF3366]/15 border-[#FF3366]'
                          : 'bg-[#121215] border-[#26262F] hover:border-[#FF3366]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-white mb-0.5">
                        <span className="truncate">{preset.name}</span>
                        <span className="font-mono text-[#FF3366] shrink-0">
                          {formatMoney(preset.price)}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        {preset.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {(serviceCategory === 'jewelry' || serviceCategory === 'aftercare') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-[#FF3366]" />
                    Selecciona un artículo de vitrina (descuenta automáticamente del Kardex):
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                  {retailItems
                    .filter(i =>
                      serviceCategory === 'jewelry'
                        ? i.category === 'jewelry'
                        : i.category === 'aftercare'
                    )
                    .map(item => {
                      const isSelected = linkedInventoryItemId === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleSelectRetailItem(item)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#FF3366]/15 border-[#FF3366]'
                              : 'bg-[#121215] border-[#26262F] hover:border-[#FF3366]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs font-bold text-white mb-0.5">
                            <span className="truncate">{item.name}</span>
                            <span className="font-mono text-emerald-400 shrink-0">
                              {formatMoney(item.retailPrice || item.unitCost)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-neutral-400">
                            <span>{item.brand}</span>
                            <span className="font-mono text-neutral-300">
                              Stock: {item.currentStock} {item.unit}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Datos del Cliente, Artista y Detalle del Trabajo */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-[#FF3366]" />
                <span>2. Datos del Cliente, Artista y Sesión</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={e => {
                    const found = clients.find(c => c.id === e.target.value);
                    if (found) {
                      setClientName(found.name);
                      setClientPhone(found.phone || '');
                      setClientDni(found.dni || '');
                      setConsentFormSigned(found.consentSigned);
                    }
                  }}
                  className="px-2.5 py-1 bg-[#121215] border border-[#2B2B36] rounded-lg text-[11px] text-[#FF3366] focus:border-[#FF3366] max-w-[200px] truncate"
                  defaultValue=""
                >
                  <option value="" disabled>Historial Clientes...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.tags?.includes('VIP') ? '⭐ VIP' : ''}
                    </option>
                  ))}
                </select>
                {linkedAppointmentId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 font-semibold">
                    Cita Activa
                  </span>
                )}
              </div>
            </div>

            {/* Health / Allergy Warning banner for client if present */}
            {(() => {
              const matchedClient = clients.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
              if (matchedClient && (matchedClient.allergies || matchedClient.medicalConditions)) {
                return (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                    <span className="font-bold text-amber-400 shrink-0">⚠️ Expediente Médico:</span>
                    <div className="text-[11px] space-y-0.5">
                      {matchedClient.allergies && <div><strong>Alergias:</strong> {matchedClient.allergies}</div>}
                      {matchedClient.medicalConditions && <div><strong>Condición:</strong> {matchedClient.medicalConditions}</div>}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Nombre del Cliente <span className="text-[#FF3366]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mateo Morales"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  DNI / Cédula / Pasaporte
                </label>
                <input
                  type="text"
                  placeholder="Identificación sanitaria"
                  value={clientDni}
                  onChange={e => setClientDni(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Tatuador / Piercer Asignado
                </label>
                <select
                  value={artistId}
                  onChange={e => handleArtistChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60"
                >
                  {artists.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.name} ({art.role} · {art.defaultCommissionRate}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  % Comisión Artista
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customCommission}
                  onChange={e => setCustomCommission(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {serviceCategory === 'tattoo' ? 'Horas de Sesión' : 'Cantidad / Piezas'}
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
                    {serviceCategory === 'tattoo' ? `${hours} hrs` : `${pieces} ud(s)`}
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

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Concepto / Descripción del Servicio en Factura *
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#121215] border border-[#272730]">
                <input
                  type="checkbox"
                  id="pos-consent"
                  checked={consentFormSigned}
                  onChange={e => setConsentFormSigned(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF3366] bg-[#18181D] border-[#272730]"
                />
                <label htmlFor="pos-consent" className="text-xs text-neutral-300 cursor-pointer">
                  <span className="font-bold text-white flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Consentimiento Informado Firmado
                  </span>
                  <span className="text-[10px] text-neutral-500 block">
                    Exigido por normativa sanitaria
                  </span>
                </label>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Observaciones clínicas, lote de agujas/tinta o notas..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5/12 or 4/12): Financial Checkout & Payment Terminal */}
        <div className="xl:col-span-5 2xl:col-span-4 space-y-4 sm:space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                3. Liquidación & Terminal de Cobro
              </h3>
              <span className="text-[11px] font-mono text-[#FF3366] font-bold">
                Ticket en Curso
              </span>
            </div>

            {/* Numeric Inputs Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Subtotal Bruto ({settings.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={subtotal}
                  onChange={e => setSubtotal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono text-sm font-bold focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Descuento ({settings.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono text-sm focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Impuesto / IVA (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono text-sm focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Seña Previa Pagada ({settings.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositAmount}
                  onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-emerald-400 font-mono text-sm focus:border-[#FF3366]/60"
                />
              </div>
            </div>

            {/* Live Receipt Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-[#26262F] space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Base Imponible Neta:</span>
                <span className="font-mono text-white">{formatMoney(taxableBase)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>IVA / Impuesto ({taxRate}%):</span>
                <span className="font-mono text-neutral-300">+{formatMoney(calculatedTax)}</span>
              </div>
              <div className="flex justify-between text-neutral-300 font-semibold pt-1 border-t border-[#22222A]">
                <span>Total Facturado:</span>
                <span className="font-mono text-white">{formatMoney(grandTotal)}</span>
              </div>
              {depositAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>(-) Seña / Anticipo Previo:</span>
                  <span className="font-mono">-{formatMoney(depositAmount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#24242C] grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-[#18181D] border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block">
                    Comisión Artista ({customCommission}%):
                  </span>
                  <span className="font-mono font-bold text-[#FF3366] text-xs">
                    {formatMoney(artistCalculatedShare)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[#18181D] border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block">
                    Retención Estudio ({100 - customCommission}%):
                  </span>
                  <span className="font-mono font-bold text-white text-xs">
                    {formatMoney(studioCalculatedShare)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grand Total Display Banner */}
            <div className="p-4 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#FF4D79] uppercase tracking-wider block">
                  Saldo a Cobrar Ahora
                </span>
                <span className="text-[10px] text-neutral-300">
                  {tipAmount > 0 ? `+ Propina: ${formatMoney(tipAmount)}` : 'Impuestos incluidos'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
                {formatMoney(balanceToPay + tipAmount)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Método de Cobro
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'card', label: 'Tarjeta / POS', icon: CreditCard },
                  { id: 'cash', label: 'Efectivo Caja', icon: Banknote },
                  { id: 'transfer', label: 'Transferencia', icon: ArrowRightLeft },
                  { id: 'split', label: 'Pago Mixto', icon: Layers },
                ].map(m => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold transition-all ${
                        active
                          ? 'bg-[#FF3366] text-white border-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.35)]'
                          : 'bg-[#121215] text-neutral-300 border-[#272730] hover:border-[#FF3366]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Calculator (when paymentMethod === 'cash') */}
            {paymentMethod === 'cash' && (
              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-semibold">Efectivo Recibido</span>
                  <div className="flex items-center gap-1">
                    {[balanceToPay + tipAmount, 50, 100, 200, 500].map((bill, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setCashTendered(String(bill))}
                        className="px-2 py-0.5 rounded bg-[#18181D] border border-[#2D2D36] text-[10px] font-mono text-neutral-300 hover:text-white hover:border-[#FF3366]"
                      >
                        {idx === 0 ? 'Exacto' : `$${bill}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto entregado..."
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono"
                  />
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block">Cambio / Vuelto:</span>
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {formatMoney(changeToReturn)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Split Breakdown (when paymentMethod === 'split') */}
            {paymentMethod === 'split' && (
              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730] grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Efectivo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitCash}
                    onChange={e => setSplitCash(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Tarjeta POS</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitCard}
                    onChange={e => setSplitCard(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Transferencia</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitTransfer}
                    onChange={e => setSplitTransfer(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Tip Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Propina Voluntaria para el Artista ({settings.currency})
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={tipAmount}
                onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white font-mono focus:border-[#FF3366]/60"
              />
            </div>

            {/* Submit POS Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,51,102,0.45)] transition-all cursor-pointer"
            >
              Emitir Ticket & Registrar Cobro en POS
            </button>
          </div>

          {/* Mini Recent POS Tickets Strip */}
          <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider">
                Últimos Tickets Emitidos
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Reimpresión rápida
              </span>
            </div>
            <div className="divide-y divide-[#23232B] text-xs">
              {filteredSales.slice(0, 4).map(sale => (
                <div key={sale.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-[#FF3366] mr-2">
                      {sale.invoiceNumber}
                    </span>
                    <span className="text-white font-medium truncate">{sale.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-white">
                      {formatMoney(sale.total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(sale)}
                      className="p-1.5 rounded-full bg-[#121215] border border-[#272730] text-neutral-300 hover:text-white hover:border-[#FF3366]"
                      title="Ver / Imprimir Ticket"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

