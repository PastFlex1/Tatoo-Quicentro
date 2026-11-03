import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Share2,
  Trash2,
  Printer,
  Sparkles,
  User,
  Clock,
  ArrowRight,
  Receipt,
  FileCheck,
  CheckCircle2,
  CreditCard,
  Banknote,
  Building2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Proforma, ProformaStatus, ServiceCategory, SaleRecord, PaymentMethod } from '../../types';
import { useStudio } from '../../context/StudioContext';
import { ProformaModal } from './ProformaModal';
import { NewProformaModal } from './NewProformaModal';

interface ProformasViewProps {
  onOpenReceipt?: (sale: SaleRecord) => void;
}

export const ProformasView: React.FC<ProformasViewProps> = ({ onOpenReceipt }) => {
  const {
    proformas,
    artists,
    sales,
    formatMoney,
    deleteProforma,
    updateProforma,
    convertProformaToAppointment,
    convertProformaToSale,
    setActiveTab,
  } = useStudio();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null);

  // Billing Modal state (Facturación directa de proforma)
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingProforma, setBillingProforma] = useState<Proforma | null>(null);
  const [billingPaymentMethod, setBillingPaymentMethod] = useState<PaymentMethod>('card');
  const [billingTipAmount, setBillingTipAmount] = useState<number>(0);
  const [billingFinalPrice, setBillingFinalPrice] = useState<number>(0);
  const [billingSuccessNotice, setBillingSuccessNotice] = useState<string | null>(null);

  // Filtered List
  const filteredProformas = useMemo(() => {
    return proformas.filter(p => {
      const matchSearch =
        p.proformaNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.clientPhone && p.clientPhone.includes(searchQuery));

      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchCategory = filterCategory === 'all' || p.serviceCategory === filterCategory;
      const matchArtist = filterArtist === 'all' || p.artistId === filterArtist;

      return matchSearch && matchStatus && matchCategory && matchArtist;
    });
  }, [proformas, searchQuery, filterStatus, filterCategory, filterArtist]);

  // Key KPI Metrics
  const totalCotizaciones = proformas.length;
  const pendingCount = proformas.filter(p => p.status === 'pending').length;
  const acceptedCount = proformas.filter(p => p.status === 'accepted').length;
  const convertedCount = proformas.filter(p => p.status === 'converted').length;
  const totalCotizado = proformas.reduce((acc, p) => acc + p.total, 0);

  const getStatusBadge = (status: ProformaStatus, invoiceNumber?: string) => {
    if (invoiceNumber || status === 'invoiced') {
      return {
        label: `Facturada (${invoiceNumber ? '#' + invoiceNumber : 'POS'})`,
        className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      };
    }
    switch (status) {
      case 'accepted':
        return {
          label: 'Aceptada por Cliente',
          className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        };
      case 'converted':
        return {
          label: 'Convertida en Cita',
          className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        };
      case 'pending':
        return {
          label: 'Pendiente de Confirmar',
          className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        };
      case 'expired':
        return {
          label: 'Vencida / Expirada',
          className: 'bg-red-500/15 text-red-400 border border-red-500/30',
        };
      case 'draft':
      default:
        return {
          label: 'Borrador',
          className: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
        };
    }
  };

  const handleQuickConvert = (proforma: Proforma) => {
    convertProformaToAppointment(proforma.id, undefined, undefined, false);
    // Optionally open the calendar
    setActiveTab('appointments');
  };

  const handleOpenBillingModal = (prof: Proforma) => {
    setBillingProforma(prof);
    setBillingFinalPrice(prof.total);
    setBillingTipAmount(0);
    setBillingPaymentMethod('card');
    setIsBillingModalOpen(true);
  };

  const handleProcessBilling = () => {
    if (!billingProforma) return;
    try {
      const sale = convertProformaToSale(
        billingProforma.id,
        billingPaymentMethod,
        billingTipAmount,
        billingFinalPrice
      );
      setIsBillingModalOpen(false);
      setBillingSuccessNotice(`¡Factura #${sale.invoiceNumber} emitida exitosamente para ${sale.clientName}!`);
      setTimeout(() => setBillingSuccessNotice(null), 5000);

      if (onOpenReceipt) {
        onOpenReceipt(sale);
      }
    } catch (err: any) {
      alert('Error al facturar proforma: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleShareWhatsApp = (p: Proforma) => {
    const cleanPhone = (p.clientPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola ${p.clientName}! 👋 Te compartimos tu Proforma / Cotización oficial:\n\n` +
      `📄 N°: ${p.proformaNumber}\n` +
      `🎨 Servicio: ${p.serviceName}\n` +
      `👤 Artista: ${p.artistName}\n` +
      `💰 Total: ${formatMoney(p.total)}\n` +
      `🔒 Anticipo sugerido para reservar fecha: ${formatMoney(p.suggestedDeposit)}\n` +
      `⏳ Válida hasta: ${p.validUntil}\n\n` +
      `¡Quedamos atentos para coordinar tu cita!`
    );
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Billing Success Notification */}
      {billingSuccessNotice && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-semibold animate-in fade-in duration-200 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{billingSuccessNotice}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
                Cotizaciones & Proformas
              </h1>
              <p className="text-xs text-neutral-400">
                Presupuestos técnicos con desglose, anticipo sugerido y conversión directa a citas de cabina
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FF3366] text-white text-xs font-bold hover:bg-[#e02958] transition-all shadow-[0_0_16px_rgba(255,51,102,0.35)] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cotización / Proforma</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#141417] border border-[#24242A] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Proformas
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {totalCotizaciones}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Emitidas en el estudio
          </div>
        </div>

        <div className="bg-[#141417] border border-[#24242A] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            Pendientes de Confirmar
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
            {pendingCount}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            En espera de respuesta cliente
          </div>
        </div>

        <div className="bg-[#141417] border border-[#24242A] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            Aceptadas / Convertidas
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">
            {acceptedCount + convertedCount}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {convertedCount} ya con cita en cabina
          </div>
        </div>

        <div className="bg-[#141417] border border-[#24242A] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-[#FF3366] uppercase tracking-wider">
            Valor Total Cotizado
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {formatMoney(totalCotizado)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Volumen presupuestado
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141417] border border-[#24242A] rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, N° proforma, servicio o artista..."
              className="w-full bg-[#1A1A20] border border-[#2B2B36] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]"
            />
          </div>

          {/* Quick Filter: Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#1A1A20] border border-[#2B2B36] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendientes</option>
            <option value="accepted">Aceptadas</option>
            <option value="converted">Convertidas a Cita</option>
            <option value="draft">Borradores</option>
            <option value="expired">Expiradas</option>
          </select>

          {/* Quick Filter: Category */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-[#1A1A20] border border-[#2B2B36] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]"
          >
            <option value="all">Todas las Categorías</option>
            <option value="tattoo">Tatuajes</option>
            <option value="piercing">Piercings</option>
            <option value="jewelry">Joyería</option>
            <option value="aftercare">Aftercare</option>
          </select>

          {/* Quick Filter: Artist */}
          <select
            value={filterArtist}
            onChange={e => setFilterArtist(e.target.value)}
            className="bg-[#1A1A20] border border-[#2B2B36] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]"
          >
            <option value="all">Todos los Artistas</option>
            {artists.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Proformas List Cards */}
      {filteredProformas.length === 0 ? (
        <div className="bg-[#141417] border border-[#24242A] rounded-3xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366] mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            No se encontraron cotizaciones
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 mb-4">
            No hay proformas que coincidan con los filtros aplicados o aún no has generado ninguna.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF3366] text-white text-xs font-semibold hover:bg-[#e02958] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Primera Proforma</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProformas.map(proforma => {
            const badge = getStatusBadge(proforma.status, proforma.invoiceNumber);

            return (
              <div
                key={proforma.id}
                className="bg-[#141417] border border-[#24242A] rounded-2xl p-5 hover:border-[#383842] transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#FF3366]">
                        {proforma.proformaNumber}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white pt-1 line-clamp-1">
                      {proforma.serviceName}
                    </h3>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={proforma.status}
                    onChange={e => updateProforma(proforma.id, { status: e.target.value as any })}
                    className="text-[10px] bg-[#1A1A20] border border-[#2B2B36] rounded-lg px-2 py-1 text-neutral-300 focus:outline-hidden"
                  >
                    <option value="draft">Borrador</option>
                    <option value="pending">Pendiente</option>
                    <option value="accepted">Aceptada</option>
                    <option value="converted">Convertida a Cita</option>
                    <option value="expired">Expirada</option>
                  </select>
                </div>

                {/* Client & Artist Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-[#18181D] p-3 rounded-xl border border-[#23232A]">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <User className="w-3 h-3 text-[#FF3366]" />
                      <span className="font-medium text-white truncate">{proforma.clientName}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {proforma.clientPhone || 'Sin teléfono'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <Sparkles className="w-3 h-3 text-[#FF3366]" />
                      <span className="font-medium text-white truncate">{proforma.artistName}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      {proforma.bodyPlacement || 'Ubicación flexible'}
                    </div>
                  </div>
                </div>

                {/* Items & Financials preview */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#222228]">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                      Total Estimado
                    </div>
                    <div className="text-base font-black text-white font-mono">
                      {formatMoney(proforma.total)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-emerald-400 uppercase font-semibold">
                      Anticipo / Seña Sugerida
                    </div>
                    <div className="text-sm font-bold text-emerald-300 font-mono">
                      {formatMoney(proforma.suggestedDeposit)}
                    </div>
                  </div>
                </div>

                {/* Appointment Link (if already scheduled) */}
                {proforma.appointmentDate && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-blue-500/10 border border-blue-500/25 rounded-xl text-[11px] text-blue-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      <span>Cita: {proforma.appointmentDate} a las {proforma.appointmentTime || '11:00'}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <span>Ver agenda</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#202026]">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedProforma(proforma)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#202028] hover:bg-[#282834] text-white text-xs font-semibold transition-colors"
                      title="Ver e imprimir documento oficial"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
                      <span>Ver / Imprimir</span>
                    </button>

                    <button
                      onClick={() => handleShareWhatsApp(proforma)}
                      className="p-1.5 rounded-xl bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30 transition-colors"
                      title="Compartir por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Facturar / Ver Factura */}
                    {proforma.invoiceNumber ? (
                      <button
                        onClick={() => {
                          const linkedSale = sales.find(s => s.id === proforma.saleId || s.invoiceNumber === proforma.invoiceNumber);
                          if (linkedSale && onOpenReceipt) {
                            onOpenReceipt(linkedSale);
                          } else {
                            setSelectedProforma(proforma);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                        title="Ver comprobante de factura emitida"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Factura #{proforma.invoiceNumber}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenBillingModal(proforma)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
                        title="Convertir esta proforma en factura oficial y cobrar"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Facturar</span>
                      </button>
                    )}

                    {!proforma.appointmentDate && proforma.status !== 'converted' && (
                      <button
                        onClick={() => handleQuickConvert(proforma)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FF3366]/20 text-[#FF3366] hover:bg-[#FF3366]/30 border border-[#FF3366]/40 text-xs font-bold transition-colors cursor-pointer"
                        title="Agendar cita en el calendario"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Agendar</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar la cotización ${proforma.proformaNumber}?`)) {
                          deleteProforma(proforma.id);
                        }
                      }}
                      className="p-1.5 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-[#22222A] transition-colors cursor-pointer"
                      title="Eliminar cotización"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <NewProformaModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onProformaCreated={created => {
          setSelectedProforma(created);
        }}
      />

      <ProformaModal
        proforma={selectedProforma}
        onClose={() => setSelectedProforma(null)}
        onConvertToAppointment={p => {
          setSelectedProforma(null);
          handleQuickConvert(p);
        }}
        onConvertToInvoice={p => {
          setSelectedProforma(null);
          handleOpenBillingModal(p);
        }}
      />

      {/* MODAL: FACTURAR / COBRAR PROFORMA DIRECTAMENTE EN POS */}
      {isBillingModalOpen && billingProforma && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141417] border border-[#272730] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242A] bg-[#16161B] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Facturar Proforma en POS
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {billingProforma.proformaNumber} · Cliente: <span className="text-white font-semibold">{billingProforma.clientName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-[#202027] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Client & Service Info Card */}
              <div className="p-3.5 bg-[#18181D] border border-[#272730] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Servicio Cotizado:</span>
                  <span className="font-bold text-white text-right">{billingProforma.serviceName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Artista Asignado:</span>
                  <span className="font-semibold text-emerald-400">{billingProforma.artistName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">RUC / Cédula Cliente:</span>
                  <span className="font-mono text-neutral-300 font-bold">{billingProforma.clientDni || '9999999999999 (Consumidor Final)'}</span>
                </div>
                {billingProforma.clientPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Teléfono:</span>
                    <span className="font-mono text-neutral-300">{billingProforma.clientPhone}</span>
                  </div>
                )}
              </div>

              {/* Price adjustment if applicable */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex justify-between">
                  <span>Total Cotizado en Proforma:</span>
                  <span className="font-bold text-white font-mono">{formatMoney(billingProforma.total)}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={billingFinalPrice}
                    onChange={e => setBillingFinalPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181D] border border-[#272730] rounded-xl pl-8 pr-4 py-2.5 text-white font-mono text-sm font-bold focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-neutral-500">
                  Puedes ajustar el valor final facturado si hubo variaciones en la sesión.
                </span>
              </div>

              {/* Forma de Pago SRI */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Forma de Pago del Cliente (SRI Ecuador):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingPaymentMethod('card')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      billingPaymentMethod === 'card'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-[#18181D] border-[#272730] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1 text-emerald-400" />
                    <span className="text-[11px]">Tarjeta / POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingPaymentMethod('cash')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      billingPaymentMethod === 'cash'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-[#18181D] border-[#272730] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-1 text-emerald-400" />
                    <span className="text-[11px]">Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingPaymentMethod('transfer')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      billingPaymentMethod === 'transfer'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-[#18181D] border-[#272730] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-5 h-5 mb-1 text-emerald-400" />
                    <span className="text-[11px]">Transferencia</span>
                  </button>
                </div>
              </div>

              {/* Propina Voluntaria */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex justify-between">
                  <span>Propina voluntaria para el artista (opcional):</span>
                  <span className="font-mono text-emerald-400 font-bold">+{formatMoney(billingTipAmount)}</span>
                </label>
                <div className="flex gap-2">
                  {[0, 5, 10, 20].map(tip => (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => setBillingTipAmount(tip)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        billingTipAmount === tip
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#18181D] border-[#272730] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tip === 0 ? 'Sin propina' : `$${tip}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total final a cobrar */}
              <div className="p-4 bg-[#18181D] border border-emerald-500/30 rounded-2xl flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase block">
                    Importe Total a Facturar:
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    IVA 15% desglosado automáticamente según SRI
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {formatMoney(billingFinalPrice + billingTipAmount)}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#16161B] border-t border-[#24242A] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsBillingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessBilling}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Emitir Factura y Cobrar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

