import React, { useState, useEffect, useMemo } from 'react';
import { usePermission } from '../../hooks/usePermission';
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
  CalendarCheck,
  Search,
  Boxes,
  ReceiptText,
  CheckCircle2,
  Eye,
  RotateCcw,
  Building2,
  RefreshCw,
  AlertCircle,
  FileText,
  Receipt,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Appointment, InventoryItem, PaymentMethod, SaleRecord, ServiceCategory } from '../../types';
import { consultarIdentificacion } from '../../services/sriService';
import { validarIdentificacionEcuador } from '../../utils/ecuadorIdValidator';
import { validateSriBusinessConfig } from '../../utils/sriBusinessConfig';
import { SelectAppointmentModal } from './SelectAppointmentModal';

interface PosViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
}

export const PosView: React.FC<PosViewProps> = ({ onOpenReceipt }) => {
  const {
    artists,
    inventory,
    appointments,
    filteredSales,
    clients,
    settings,
    addSale,
    addClient,
    addKardexMovement,
    updateAppointment,
    proformas,
    updateProforma,
    formatMoney,
    setActiveTab,
  } = useStudio();

  const { guard: guardPermission, can } = usePermission();
  const canDiscount = can('pos.discount');
  const canChangeCommission = can('pos.change_commission');
  const canChangeTax = can('pos.change_tax');
  const canChangePrice = can('pos.change_price');
  // Solo los cambios hechos a mano por el usuario requieren permiso (no los automáticos por categoría/producto)
  const [commissionEdited, setCommissionEdited] = useState(false);
  const [taxEdited, setTaxEdited] = useState(false);
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
  const standardVatRate = (!settings.defaultTaxRate || settings.defaultTaxRate === 8 || settings.defaultTaxRate === 12) ? 15 : settings.defaultTaxRate;
  const [documentType, setDocumentType] = useState<'factura' | 'nota_venta'>('factura');
  const [taxRate, setTaxRate] = useState<number>(standardVatRate);
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

  // Estados de consulta SRI / Registro Civil
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [sriStatusMsg, setSriStatusMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [sriRegimen, setSriRegimen] = useState<string>('');

  // Validación de configuración fiscal del negocio
  const sriBusinessValidation = useMemo(() => validateSriBusinessConfig(settings, 'factura'), [settings]);

  // Linked Appointment or Inventory Item
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(null);
  const [linkedInventoryItemId, setLinkedInventoryItemId] = useState<string | null>(null);
  const [consumedSupplies, setConsumedSupplies] = useState<{ itemId: string; name: string; quantity: number }[]>([]);
  const [showCabinSupplies, setShowCabinSupplies] = useState(false);
  const [selectedSupplyToAdd, setSelectedSupplyToAdd] = useState('');
  const [lastCreatedSale, setLastCreatedSale] = useState<SaleRecord | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

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

  // Linked appointment object if any
  const linkedAppointment = useMemo(() => {
    return appointments.find(a => a.id === linkedAppointmentId);
  }, [appointments, linkedAppointmentId]);

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

    // Match client in clients database to get DNI if available
    const matchedClient = clients.find(
      c =>
        (c.name && c.name.toLowerCase().trim() === apt.clientName.toLowerCase().trim()) ||
        (c.phone && apt.clientPhone && c.phone.replace(/\D/g, '') === apt.clientPhone.replace(/\D/g, ''))
    );
    if (matchedClient?.dni) {
      setClientDni(matchedClient.dni);
      handleSearchSriInPos(matchedClient.dni);
    } else {
      setClientDni('');
      setSriRegimen('');
      setSriStatusMsg(null);
    }

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

  const handleUnlinkAppointment = () => {
    setLinkedAppointmentId(null);
  };

  // Load from retail inventory item
  const handleSelectRetailItem = (item: InventoryItem) => {
    setLinkedAppointmentId(null);
    setLinkedInventoryItemId(item.id);
    const cat: ServiceCategory = item.category === 'jewelry' ? 'jewelry' : 'aftercare';
    setServiceCategory(cat);
    setServiceName(`${item.name} (${item.brand})`);
    setPieces(1);
    
    // In Ecuador SRI, subtotal is base without VAT
    const vatMultiplier = item.taxRate === 15 ? 0.15 : item.taxRate === 5 ? 0.05 : 0;
    const baseSubtotal =
      item.priceWithoutVat ??
      (item.priceWithVat ? item.priceWithVat / (1 + vatMultiplier) : undefined) ??
      (item.retailPrice ? item.retailPrice / (1 + vatMultiplier) : item.unitCost * 2);

    setSubtotal(Math.round(baseSubtotal * 100) / 100);

    if (item.taxRate !== undefined) {
      const rateNum = typeof item.taxRate === 'number' ? item.taxRate : 0;
      setTaxRate(rateNum);
    }

    setDepositAmount(0);
    setConsentFormSigned(false);
    setCustomCommission(cat === 'jewelry' ? 30 : 20);
  };

  const handleSetConsumidorFinal = () => {
    setClientDni('9999999999999');
    setClientName('CONSUMIDOR FINAL');
    setClientPhone('');
    setSriRegimen('');
    setSriStatusMsg({ text: '✓ Modo Consumidor Final (SRI 9999999999999)', type: 'success' });
  };

  const handleSearchSriInPos = async (explicitDni?: string) => {
    const targetDni = (explicitDni || clientDni || '').trim();
    if (!targetDni) {
      setSriStatusMsg({ text: 'Ingresa un número de cédula o RUC para consultar.', type: 'warning' });
      return;
    }

    if (targetDni === '9999999999999') {
      handleSetConsumidorFinal();
      return;
    }

    setIsSearchingSri(true);
    setSriStatusMsg(null);

    try {
      const res = await consultarIdentificacion(targetDni);
      if (res.found && res.nombre) {
        setClientName(res.nombre);
        setSriRegimen(res.regimen || '');

        // Match with local clients database
        const existing = clients.find(c => c.dni && c.dni.replace(/\D/g, '') === targetDni.replace(/\D/g, ''));
        if (existing) {
          if (existing.phone && !clientPhone) setClientPhone(existing.phone);
          setSriStatusMsg({
            text: `✓ ${res.nombre} (Cliente registrado · ${res.regimen ? `Régimen ${res.regimen}` : 'Activo'})`,
            type: 'success',
          });
        } else {
          setSriStatusMsg({
            text: `✓ ${res.nombre} (Verificado en SRI · ${res.regimen ? `Régimen ${res.regimen}` : 'Activo'})`,
            type: 'success',
          });
        }
      } else {
        setSriStatusMsg({
          text: res.error || 'No se encontraron datos registrados en el SRI.',
          type: 'error',
        });
      }
    } catch {
      setSriStatusMsg({
        text: 'Error de conexión con el SRI.',
        type: 'error',
      });
    } finally {
      setIsSearchingSri(false);
    }
  };

  const handleResetForm = () => {
    setCommissionEdited(false);
    setTaxEdited(false);
    setLinkedAppointmentId(null);
    setLinkedInventoryItemId(null);
    setConsumedSupplies([]);
    setSelectedSupplyToAdd('');
    setClientName('');
    setClientPhone('');
    setClientDni('');
    setSriRegimen('');
    setSriStatusMsg(null);
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
    setDocumentType('factura');
    setTaxRate(standardVatRate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('pos.charge')) return;
    // Validación de permisos finos (aunque el campo se haya modificado por otra vía)
    if (discount > 0 && !guardPermission('pos.discount')) return;
    if (commissionEdited && !guardPermission('pos.change_commission')) return;
    if (taxEdited && !guardPermission('pos.change_tax')) return;
    if (!clientName.trim()) {
      alert('Por favor ingresa el nombre del cliente para emitir el ticket.');
      return;
    }

    const selectedArtist = artists.find(a => a.id === artistId);
    const artistName = selectedArtist ? selectedArtist.name : 'Artista del Estudio';

    const saleRecord = addSale({
      date: new Date().toISOString(),
      documentType,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientDni: clientDni.trim() || undefined,
      serviceCategory,
      serviceName: serviceName.trim() || 'Servicio de Estudio',
      artistId,
      artistName,
      inventoryItemId: linkedInventoryItemId || undefined,
      consumedSupplies: consumedSupplies.length > 0 ? consumedSupplies : undefined,
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

    // If linked to an appointment, mark appointment as completed and any linked proforma as invoiced
    if (linkedAppointmentId) {
      updateAppointment(linkedAppointmentId, {
        status: 'completed',
        saleId: saleRecord.id,
      });
      const linkedProf = proformas.find(p => p.appointmentId === linkedAppointmentId);
      if (linkedProf) {
        updateProforma(linkedProf.id, {
          status: 'invoiced',
          saleId: saleRecord.id,
          invoiceNumber: saleRecord.invoiceNumber,
        });
      }
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
          {/* BOTÓN CITA DESTACADO */}
          <button
            type="button"
            onClick={() => setIsAppointmentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white text-xs font-bold shadow-lg shadow-[#FF3366]/25 hover:shadow-[#FF3366]/40 transition-all cursor-pointer transform active:scale-95"
            title="Buscar y traer cita agendada para facturación automática en POS"
          >
            <Calendar className="w-4 h-4 text-white" />
            <span className="tracking-wide">CITA</span>
            {pendingAppointments.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-[#FF3366] text-[10px] font-black leading-none shadow-xs">
                {pendingAppointments.length}
              </span>
            )}
          </button>

          {/* Estado de Configuración SRI del Negocio */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              sriBusinessValidation.isValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Ver diagnóstico de configuración tributaria del negocio en el SRI"
          >
            {sriBusinessValidation.isValid ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {sriBusinessValidation.isValid
                ? `SRI: ${settings.regimenTributario ? settings.regimenTributario.replace('_', ' ') : 'Activo'}`
                : `Config SRI: ${sriBusinessValidation.progressPercentage}% (${sriBusinessValidation.missingFields.length} pendientes)`}
            </span>
          </button>

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

      {/* Banner de Cita Vinculada al POS */}
      {linkedAppointment && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF3366]/20 via-[#18181D] to-[#18181D] border border-[#FF3366]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-[#FF3366]/10 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  ✓ Cita Cargada en POS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#FF3366] text-white text-[10px] font-bold">
                  {linkedAppointment.date} · {linkedAppointment.startTime} hs
                </span>
                {linkedAppointment.depositAmount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono">
                    Seña: {formatMoney(linkedAppointment.depositAmount)}
                  </span>
                )}
                {clientDni && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono">
                    DNI: {clientDni}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-300 mt-1">
                Cliente: <strong className="text-white">{linkedAppointment.clientName}</strong> · Servicio: <strong className="text-white">{linkedAppointment.serviceName}</strong> · Artista: <strong className="text-white">{linkedAppointment.artistName}</strong>
                {linkedAppointment.bodyPlacement && <span className="text-neutral-400"> · Zona: {linkedAppointment.bodyPlacement}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAppointmentModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#262630] hover:bg-[#323240] text-xs font-semibold text-neutral-200 transition-all cursor-pointer"
            >
              Cambiar Cita
            </button>
            <button
              type="button"
              onClick={handleUnlinkAppointment}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              Desvincular
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column POS Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN (7/12 or 8/12): Service & Client Details */}
        <div className="xl:col-span-7 2xl:col-span-8 space-y-4 sm:space-y-5">
          {/* 1. Datos del Cliente, Artista y Detalle del Servicio */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-[#FF3366]" />
                <span>1. Datos del Cliente, Artista y Servicio</span>
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

            {/* SRI Status feedback */}
            {sriStatusMsg && (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                sriStatusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : sriStatusMsg.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] truncate">{sriStatusMsg.text}</span>
                </div>
                {sriStatusMsg.type === 'success' && clientDni && clientDni !== '9999999999999' && !clients.some(c => c.dni && c.dni.replace(/\D/g, '') === clientDni.replace(/\D/g, '')) && (
                  <button
                    type="button"
                    onClick={() => {
                      addClient({
                        name: clientName,
                        dni: clientDni,
                        phone: clientPhone || undefined,
                        consentSigned: consentFormSigned,
                        taxpayerRegime: sriRegimen || undefined,
                        tags: ['Cliente POS', 'SRI Verificado'],
                      });
                      alert(`✓ Cliente "${clientName}" registrado en la base de datos.`);
                    }}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold shrink-0"
                  >
                    + Guardar en Clientes
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5">
              {/* Cédula / RUC with Live SRI Lookup */}
              <div className="md:col-span-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Cédula / RUC / Pasaporte
                  </label>
                  <button
                    type="button"
                    onClick={handleSetConsumidorFinal}
                    className="text-[10px] text-[#FF3366] hover:underline font-semibold"
                  >
                    Consumidor Final
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="10 díg. Cédula / 13 díg. RUC"
                    value={clientDni}
                    onChange={e => {
                      setClientDni(e.target.value);
                      setSriStatusMsg(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchSriInPos();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white font-mono placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchSriInPos()}
                    disabled={isSearchingSri || !clientDni.trim()}
                    className="px-2.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all disabled:opacity-40"
                    title="Consultar nombre legal y régimen tributario en el SRI / Registro Civil"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSearchingSri ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                    <span className="hidden sm:inline">SRI</span>
                  </button>
                </div>
              </div>

              {/* Client Name */}
              <div className="md:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Nombre o Razón Social <span className="text-[#FF3366]">*</span>
                  </label>
                  {sriRegimen && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {sriRegimen}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mateo Morales"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                />
              </div>

              {/* Phone / WhatsApp */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="+593 99 000 0000"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-3.5">
              {/* Categoría de Servicio */}
              <div className="sm:col-span-1 md:col-span-3">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Categoría
                </label>
                <select
                  value={serviceCategory}
                  onChange={e => {
                    const newCat = e.target.value as ServiceCategory;
                    setServiceCategory(newCat);
                    setLinkedInventoryItemId(null);
                    if (newCat === 'tattoo') {
                      setServiceName('Tatuaje Personalizado');
                    } else if (newCat === 'piercing') {
                      setServiceName('Perforación / Body Piercing');
                    } else if (newCat === 'jewelry') {
                      setServiceName('Joyería Piercing Titanio');
                    } else if (newCat === 'aftercare') {
                      setServiceName('Crema / Cuidado Posterior');
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60 font-medium"
                >
                  <option value="tattoo">Tatuaje</option>
                  <option value="piercing">Piercing</option>
                  <option value="jewelry">Joyería</option>
                  <option value="aftercare">Aftercare</option>
                  <option value="other">Otro / Libre</option>
                </select>
              </div>

              {/* Tatuador / Piercer Asignado */}
              <div className="sm:col-span-1 md:col-span-4">
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

              {/* % Comisión Artista */}
              <div className="sm:col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  % Comisión
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customCommission}
                  disabled={!canChangeCommission}
                  title={canChangeCommission ? undefined : 'Sin permiso para modificar la comisión'}
                  onChange={e => {
                    setCommissionEdited(true);
                    setCustomCommission(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)));
                  }}
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60 text-center"
                />
              </div>

              {/* Horas o Piezas */}
              <div className="sm:col-span-1 md:col-span-3">
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

            {/* Vinculación opcional con Joyería o Aftercare de Vitrina */}
            {(serviceCategory === 'jewelry' || serviceCategory === 'aftercare') && (
              <div className="p-3 bg-[#121215] border border-[#272730] rounded-xl space-y-1.5">
                <label className="block text-[11px] font-semibold text-neutral-400">
                  Vincular producto de vitrina / Kardex (Opcional):
                </label>
                <select
                  value={linkedInventoryItemId || ''}
                  onChange={e => {
                    const item = inventory.find(i => i.id === e.target.value);
                    if (item) handleSelectRetailItem(item);
                    else setLinkedInventoryItemId(null);
                  }}
                  className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-lg text-xs text-white"
                >
                  <option value="">-- Ingresar libre o seleccionar producto de vitrina --</option>
                  {retailItems
                    .filter(i => (serviceCategory === 'jewelry' ? i.category === 'jewelry' : i.category === 'aftercare'))
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.brand}) · Stock: {item.currentStock} {item.unit} · {formatMoney(item.priceWithVat ?? item.retailPrice ?? item.unitCost)}
                      </option>
                    ))}
                </select>
              </div>
            )}

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

            {/* Consumibles de Cabina (Kardex descarga automática) */}
            <div className="pt-2 border-t border-[#24242B]">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setShowCabinSupplies(prev => !prev)}
                  className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Descarga de Insumos / Materiales de Cabina (Kardex)</span>
                  {consumedSupplies.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                      {consumedSupplies.length} {consumedSupplies.length === 1 ? 'insumo' : 'insumos'}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCabinSupplies(prev => !prev)}
                  className="text-[11px] text-[#FF3366] hover:underline cursor-pointer"
                >
                  {showCabinSupplies ? 'Ocultar' : '+ Añadir Insumo Usado'}
                </button>
              </div>

              {showCabinSupplies && (
                <div className="p-3 bg-[#121215] border border-[#272730] rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex gap-2">
                    <select
                      value={selectedSupplyToAdd}
                      onChange={e => setSelectedSupplyToAdd(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-xs text-white"
                    >
                      <option value="">-- Seleccionar Insumo de Cabina --</option>
                      {inventory
                        .filter(i => i.currentStock > 0 && !consumedSupplies.some(cs => cs.itemId === i.id))
                        .map(i => (
                          <option key={i.id} value={i.id}>
                            {i.name} (Stock: {i.currentStock} {i.unit})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedSupplyToAdd}
                      onClick={() => {
                        const invItem = inventory.find(i => i.id === selectedSupplyToAdd);
                        if (invItem) {
                          setConsumedSupplies(prev => [
                            ...prev,
                            { itemId: invItem.id, name: invItem.name, quantity: 1 },
                          ]);
                          setSelectedSupplyToAdd('');
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      + Añadir
                    </button>
                  </div>

                  {consumedSupplies.length > 0 && (
                    <div className="space-y-1.5">
                      {consumedSupplies.map(cs => {
                        const item = inventory.find(i => i.id === cs.itemId);
                        return (
                          <div
                            key={cs.itemId}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#18181D] border border-[#25252E] text-xs"
                          >
                            <div className="truncate mr-2">
                              <span className="font-semibold text-white">{cs.name}</span>
                              <span className="text-[10px] text-neutral-400 ml-2 font-mono">
                                Stock disp: {item?.currentStock ?? 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 bg-[#121215] border border-[#272730] rounded-lg px-2 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConsumedSupplies(prev =>
                                      prev.map(p =>
                                        p.itemId === cs.itemId
                                          ? { ...p, quantity: Math.max(1, p.quantity - 1) }
                                          : p
                                      )
                                    );
                                  }}
                                  className="text-neutral-400 hover:text-white"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-white text-xs px-1.5">
                                  {cs.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConsumedSupplies(prev =>
                                      prev.map(p =>
                                        p.itemId === cs.itemId
                                          ? { ...p, quantity: p.quantity + 1 }
                                          : p
                                      )
                                    );
                                  }}
                                  className="text-neutral-400 hover:text-white"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setConsumedSupplies(prev => prev.filter(p => p.itemId !== cs.itemId))
                                }
                                className="text-red-400 hover:text-red-300 text-xs px-1 cursor-pointer"
                                title="Quitar de la lista"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5/12 or 4/12): Financial Checkout & Payment Terminal */}
        <div className="xl:col-span-5 2xl:col-span-4 space-y-4 sm:space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Liquidación & Terminal de Cobro
              </h3>
              <span className="text-[11px] font-mono text-[#FF3366] font-bold">
                Ticket en Curso
              </span>
            </div>

            {/* Selector de Tipo de Comprobante SRI: Factura (01) vs Nota de Venta RIMPE (02) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                Tipo de Comprobante a Emitir
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDocumentType('factura');
                    setTaxRate(standardVatRate);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    documentType === 'factura'
                      ? 'bg-[#FF3366]/20 border-[#FF3366] text-white shadow-sm'
                      : 'bg-[#121215] border-[#272730] text-neutral-400 hover:text-white hover:border-[#383846]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span>Factura (IVA {standardVatRate}%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentType('nota_venta');
                    setTaxRate(0);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    documentType === 'nota_venta'
                      ? 'bg-purple-500/20 border-purple-500 text-white shadow-sm'
                      : 'bg-[#121215] border-[#272730] text-neutral-400 hover:text-white hover:border-[#383846]'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-purple-400" />
                  <span>Nota Venta RIMPE</span>
                </button>
              </div>
              {documentType === 'nota_venta' && (
                <p className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/25 px-2.5 py-1.5 rounded-xl">
                  ℹ️ Régimen RIMPE - Negocio Popular (Art. 97.6 LRTI). Tarifa 0% IVA, sin desglose tributario.
                </p>
              )}
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
                  disabled={!canChangePrice && Boolean(linkedAppointmentId || linkedInventoryItemId)}
                  title={!canChangePrice && (linkedAppointmentId || linkedInventoryItemId) ? 'Sin permiso para modificar el precio de la cita / producto' : undefined}
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
                  disabled={!canDiscount}
                  title={canDiscount ? undefined : 'Sin permiso para aplicar descuentos'}
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
                  disabled={documentType === 'nota_venta' || !canChangeTax}
                  title={canChangeTax ? undefined : 'Sin permiso para cambiar la tarifa de IVA'}
                  value={taxRate}
                  onChange={e => {
                    setTaxEdited(true);
                    setTaxRate(parseFloat(e.target.value) || 0);
                  }}
                  className={`w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono text-sm focus:border-[#FF3366]/60 ${
                    documentType === 'nota_venta' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
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

      {/* Modal para Seleccionar y Traer Citas al POS */}
      <SelectAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        appointments={appointments}
        artists={artists}
        clients={clients}
        onSelectAppointment={handleSelectAppointment}
        formatMoney={formatMoney}
        selectedAppointmentId={linkedAppointmentId}
        onGoToAppointments={() => setActiveTab('appointments')}
      />
    </div>
  );
};

