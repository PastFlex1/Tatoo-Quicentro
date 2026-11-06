import React, { useState, useMemo } from 'react';
import {
  CONSUMIDOR_FINAL_LIMIT,
  consumidorFinalLimitMessage,
  exceedsConsumidorFinalLimit,
} from '../../utils/consumidorFinal';
import { UiSelect } from '../common/UiSelect';
import { usePermission } from '../../hooks/usePermission';
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
  Eye,
  AlertTriangle,
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

  const { guard: guardPermission } = usePermission();
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
  const [billingBuyerDni, setBillingBuyerDni] = useState<string>('');
  // El valor final de la proforma ya incluye IVA; con la propina forma el importe del comprobante
  const billingInvoiceTotal = Math.round((billingFinalPrice + billingTipAmount) * 100) / 100;
  const billingCfBlocked = exceedsConsumidorFinalLimit(billingBuyerDni, billingInvoiceTotal);
  const [billingSuccessNotice, setBillingSuccessNotice] = useState<string | null>(null);

  // Filtered List
  const filteredProformas = useMemo(() => {
    return proformas.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        p.proformaNumber.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.serviceName.toLowerCase().includes(q) ||
        p.artistName.toLowerCase().includes(q) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.clientPhone && p.clientPhone.includes(q)) ||
        (p.clientDni && p.clientDni.includes(q));

      const isFacturada = Boolean(p.invoiceNumber) || p.status === 'invoiced';
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'invoiced' ? isFacturada : p.status === filterStatus && !isFacturada);
      const matchCategory = filterCategory === 'all' || p.serviceCategory === filterCategory;
      const matchArtist = filterArtist === 'all' || p.artistId === filterArtist;

      return matchSearch && matchStatus && matchCategory && matchArtist;
    });
  }, [proformas, searchQuery, filterStatus, filterCategory, filterArtist]);

  // Key KPI Metrics
  const totalCotizaciones = proformas.length;
  const pendingCount = proformas.filter(p => p.status === 'pending' && !p.invoiceNumber).length;
  const acceptedCount = proformas.filter(p => p.status === 'accepted' && !p.invoiceNumber).length;
  const invoicedCount = proformas.filter(p => Boolean(p.invoiceNumber) || p.status === 'invoiced').length;
  const totalCotizado = proformas.reduce((acc, p) => acc + p.total, 0);

  const getStatusBadge = (status: ProformaStatus, invoiceNumber?: string) => {
    if (invoiceNumber || status === 'invoiced') {
      return {
        label: invoiceNumber ? `Facturada (${invoiceNumber})` : 'Facturada',
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

  const getCategoryLabel = (cat: ServiceCategory) => {
    switch (cat) {
      case 'tattoo':
        return 'Tatuaje';
      case 'piercing':
        return 'Piercing';
      case 'jewelry':
        return 'Joyería';
      case 'aftercare':
        return 'Aftercare';
      default:
        return 'Servicio';
    }
  };

  const handleQuickConvert = (proforma: Proforma) => {
    if (!guardPermission('proformas.convert')) return;
    convertProformaToAppointment(proforma.id, undefined, undefined, false);
    setActiveTab('appointments');
  };

  const handleOpenBillingModal = (prof: Proforma) => {
    if (!guardPermission('proformas.convert')) return;
    setBillingProforma(prof);
    setBillingBuyerDni(prof.clientDni || '');
    setBillingFinalPrice(prof.total);
    setBillingTipAmount(0);
    setBillingPaymentMethod('card');
    setIsBillingModalOpen(true);
  };

  const handleProcessBilling = async () => {
    if (!guardPermission('proformas.convert')) return;
    if (!billingProforma) return;
    try {
      const sale = await convertProformaToSale(
        billingProforma.id,
        billingPaymentMethod,
        billingTipAmount,
        billingFinalPrice,
        { dni: billingBuyerDni }
      );
      setIsBillingModalOpen(false);
      setBillingSuccessNotice(`¡Factura ${sale.invoiceNumber} emitida exitosamente para ${sale.clientName}!`);
      setTimeout(() => setBillingSuccessNotice(null), 5000);

      if (onOpenReceipt) {
        onOpenReceipt(sale);
      }
    } catch (err: any) {
      alert('Error al facturar proforma: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleDeleteProforma = (proforma: Proforma) => {
    if (!guardPermission('proformas.delete')) return;
    if (confirm(`¿Eliminar la cotización ${proforma.proformaNumber} del cliente "${proforma.clientName}"?`)) {
      deleteProforma(proforma.id);
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
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Billing Success Notification Banner */}
      {billingSuccessNotice && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-semibold animate-in fade-in duration-200 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{billingSuccessNotice}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase">
              Cotizaciones & Proformas
            </h1>
            <p className="text-[11px] text-neutral-400">
              Gestión horizontal de cotizaciones, conversión directa a factura oficial y control de presupuestos.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#FF3366] text-white text-xs font-bold hover:bg-[#e02958] transition-all shadow-[0_0_16px_rgba(255,51,102,0.35)] active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cotización / Proforma</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Proformas
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1 font-mono">
            {totalCotizaciones}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            Emitidas en el estudio
          </div>
        </div>

        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Pendientes de Confirmar
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-300 mt-1 font-mono">
            {pendingCount}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            En espera de respuesta cliente
          </div>
        </div>

        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Facturadas / Aceptadas
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-300 mt-1 font-mono">
            {invoicedCount + acceptedCount}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            {invoicedCount} facturadas en caja
          </div>
        </div>

        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="text-[10px] font-bold text-[#FF3366] uppercase tracking-wider">
            Valor Total Cotizado
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1 font-mono">
            {formatMoney(totalCotizado)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            Volumen presupuestado
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, N° proforma, servicio, artista o DNI..."
            className="w-full bg-[#121215] border border-[#272730] rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter: Status */}
          <UiSelect
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#121215] border border-[#272730] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60 cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendientes</option>
            <option value="accepted">Aceptadas</option>
            <option value="invoiced">Facturadas</option>
            <option value="converted">Convertidas a Cita</option>
            <option value="draft">Borradores</option>
            <option value="expired">Expiradas</option>
          </UiSelect>

          {/* Quick Filter: Category */}
          <UiSelect
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-[#121215] border border-[#272730] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60 cursor-pointer"
          >
            <option value="all">Todas las Categorías</option>
            <option value="tattoo">Tatuajes</option>
            <option value="piercing">Piercings</option>
            <option value="jewelry">Joyería</option>
            <option value="aftercare">Aftercare</option>
          </UiSelect>

          {/* Quick Filter: Artist */}
          <UiSelect
            value={filterArtist}
            onChange={e => setFilterArtist(e.target.value)}
            className="bg-[#121215] border border-[#272730] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60 cursor-pointer"
          >
            <option value="all">Todos los Artistas</option>
            {artists.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </UiSelect>
        </div>
      </div>

      {/* =========================================================================
          HORIZONTAL PROFORMAS TABLE (DISEÑO HORIZONTAL DE COTIZACIONES)
          ========================================================================= */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4 whitespace-nowrap">N° Cotización</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Estado</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Fecha / Vence</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Cliente</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Servicio / Detalle</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Artista</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Total ($ USD)</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Anticipo</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filteredProformas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    No se encontraron cotizaciones con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredProformas.map(proforma => {
                  const badge = getStatusBadge(proforma.status, proforma.invoiceNumber);
                  const isInvoiced = Boolean(proforma.invoiceNumber) || proforma.status === 'invoiced';

                  return (
                    <tr
                      key={proforma.id}
                      className="hover:bg-[#1E1E25] transition-colors"
                    >
                      {/* N° Cotización */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#FF3366] text-xs block">
                          {proforma.proformaNumber}
                        </span>
                        {proforma.estimatedHours && (
                          <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{proforma.estimatedHours} hrs est.</span>
                          </span>
                        )}
                      </td>

                      {/* Estado con Selector Rápido o Número de Factura Emitida */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 max-w-fit ${badge.className}`}
                          >
                            {isInvoiced && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                            <span>{badge.label}</span>
                          </span>
                          {isInvoiced && proforma.invoiceNumber ? (
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold pl-1">
                              Factura N° {proforma.invoiceNumber}
                            </span>
                          ) : (
                            <UiSelect
                              value={proforma.status}
                              onChange={e =>
                                updateProforma(proforma.id, { status: e.target.value as any })
                              }
                              className="text-[9px] bg-[#121215] border border-[#272730] rounded-md px-1.5 py-0.5 text-neutral-400 focus:outline-hidden cursor-pointer"
                            >
                              <option value="draft">Borrador</option>
                              <option value="pending">Pendiente</option>
                              <option value="accepted">Aceptada</option>
                              <option value="converted">Convertida Cita</option>
                              <option value="expired">Expirada</option>
                            </UiSelect>
                          )}
                        </div>
                      </td>

                      {/* Fechas: Emisión y Vencimiento */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <span className="text-neutral-200 block">
                          {new Date(proforma.date).toLocaleDateString('es-EC', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          Vence: {proforma.validUntil}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="font-semibold text-white truncate flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />
                          <span>{proforma.clientName}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
                          {proforma.clientPhone && <span>{proforma.clientPhone}</span>}
                          {proforma.clientDni && (
                            <span className="font-mono text-[10px] text-neutral-500">
                              {proforma.clientDni}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Servicio & Ubicación Corporal */}
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="font-medium text-white truncate">
                          {proforma.serviceName}
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <span className="text-[#FF3366] font-semibold">
                            {getCategoryLabel(proforma.serviceCategory)}
                          </span>
                          {proforma.bodyPlacement && (
                            <>
                              <span>•</span>
                              <span className="truncate">{proforma.bodyPlacement}</span>
                            </>
                          )}
                          {proforma.sizeApprox && (
                            <span className="text-neutral-500 font-mono">({proforma.sizeApprox})</span>
                          )}
                        </div>
                      </td>

                      {/* Artista */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-neutral-200 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#FF3366]" />
                          <span>{proforma.artistName}</span>
                        </div>
                      </td>

                      {/* Total Presupuestado */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <span className="font-bold text-white text-xs block">
                          {formatMoney(proforma.total)}
                        </span>
                        {proforma.discount > 0 && (
                          <span className="text-[10px] text-neutral-500 block">
                            Desc: -{formatMoney(proforma.discount)}
                          </span>
                        )}
                      </td>

                      {/* Anticipo Sugerido */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <span className="font-bold text-emerald-400 text-xs block">
                          {formatMoney(proforma.suggestedDeposit)}
                        </span>
                        <span className="text-[9px] text-neutral-500 block">Seña reserva</span>
                      </td>

                      {/* ACCIONES HORIZONTALES: Ver Proforma, Convertir a Factura, Eliminar */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* ACCIÓN 1: Ver Proforma */}
                          <button
                            onClick={() => setSelectedProforma(proforma)}
                            className="p-1.5.5 rounded-xl bg-[#121215] hover:bg-[#252530] text-neutral-200 hover:text-white border border-[#272730] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Ver e imprimir documento oficial de cotización"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#FF3366]" />
                          </button>

                          {/* ACCIÓN 2: Convertir a Factura (o Ver Factura emitida) */}
                          {isInvoiced ? (
                            <button
                              onClick={() => {
                                const linkedSale = sales.find(
                                  s =>
                                    s.id === proforma.saleId ||
                                    s.invoiceNumber === proforma.invoiceNumber
                                );
                                if (linkedSale && onOpenReceipt) {
                                  onOpenReceipt(linkedSale);
                                } else {
                                  setSelectedProforma(proforma);
                                }
                              }}
                              className="p-1.5.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              title={`Ver factura ${proforma.invoiceNumber || 'emitida'}`}
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenBillingModal(proforma)}
                              className="p-1.5.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
                              title="Convertir esta proforma en factura oficial y cobrar en POS"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Acción complementaria: WhatsApp */}
                          <button
                            onClick={() => handleShareWhatsApp(proforma)}
                            className="p-1.5 rounded-xl bg-[#121215] hover:bg-emerald-600/20 text-neutral-400 hover:text-emerald-400 border border-[#272730] transition-colors cursor-pointer"
                            title="Compartir presupuesto por WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* ACCIÓN 3: Eliminar */}
                          <button
                            onClick={() => handleDeleteProforma(proforma)}
                            className="p-1.5 rounded-xl bg-[#121215] hover:bg-red-500/20 text-neutral-500 hover:text-red-400 border border-[#272730] transition-colors cursor-pointer"
                            title="Eliminar cotización"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Modal Nueva Proforma */}
      <NewProformaModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onProformaCreated={created => {
          setSelectedProforma(created);
        }}
      />

      {/* 2. Modal Ver Proforma Oficial */}
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

      {/* 3. MODAL: FACTURAR / CONVERTIR PROFORMA A FACTURA OFICIAL */}
      {isBillingModalOpen && billingProforma && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-lg bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#25252E] bg-[#121215] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Convertir Proforma a Factura
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {billingProforma.proformaNumber} • Cliente:{' '}
                    <span className="text-white font-semibold">{billingProforma.clientName}</span>
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

            {/* Form */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
              {/* Client & Service Info Card */}
              <div className="p-3.5 bg-[#121215] border border-[#272730] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Servicio Cotizado:</span>
                  <span className="font-bold text-white text-right">{billingProforma.serviceName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Artista Asignado:</span>
                  <span className="font-semibold text-emerald-400">{billingProforma.artistName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400 shrink-0">RUC / Cédula Cliente:</span>
                  <input
                    type="text"
                    value={billingBuyerDni}
                    onChange={e => setBillingBuyerDni(e.target.value.trim())}
                    placeholder="Vacío = consumidor final"
                    className={`w-48 bg-[#17171C] border rounded-lg px-2 py-1 text-right font-mono font-bold text-neutral-200 focus:outline-hidden ${
                      billingCfBlocked ? 'border-amber-500/60' : 'border-[#2B2B36]'
                    }`}
                  />
                </div>
                {billingCfBlocked && (
                  <p className="text-[11px] text-amber-300 leading-snug">
                    Por ley, a consumidor final solo se factura hasta ${CONSUMIDOR_FINAL_LIMIT}. Esta factura suma {formatMoney(billingInvoiceTotal)}: ingrese la cédula, RUC o pasaporte del comprador.
                  </p>
                )}
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
                  <span className="font-bold text-white font-mono">
                    {formatMoney(billingProforma.total)}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={billingFinalPrice || ''}
                    placeholder="0.00"
                    onChange={e => setBillingFinalPrice(parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className="w-full bg-[#121215] border border-[#272730] rounded-xl pl-8 pr-4 py-2.5 text-white font-mono text-sm font-bold focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                </div>
                <span className="text-[10px] text-neutral-500">
                  Puedes ajustar el valor final facturado si hubo variaciones durante la sesión.
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
                        : 'bg-[#121215] border-[#272730] text-neutral-400 hover:text-white'
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
                        : 'bg-[#121215] border-[#272730] text-neutral-400 hover:text-white'
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
                        : 'bg-[#121215] border-[#272730] text-neutral-400 hover:text-white'
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
                  <span className="font-mono text-emerald-400 font-bold">
                    +{formatMoney(billingTipAmount)}
                  </span>
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
                          : 'bg-[#121215] border-[#272730] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tip === 0 ? 'Sin propina' : `$${tip}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total final a cobrar */}
              <div className="p-4 bg-[#121215] border border-emerald-500/30 rounded-2xl flex items-baseline justify-between">
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

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 bg-[#121215] border-t border-[#25252E] flex justify-end gap-3 shrink-0">
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
                disabled={billingCfBlocked}
                title={billingCfBlocked ? 'Identifique al comprador: más de $' + CONSUMIDOR_FINAL_LIMIT + ' a consumidor final no está permitido' : undefined}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Receipt className="w-4 h-4" />
                <span>Emitir Factura & Abrir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
