import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Receipt,
  Trash2,
  MessageCircle,
  X,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Appointment, AppointmentStatus, PaymentMethod, SaleRecord } from '../../types';
import { NewAppointmentModal } from './NewAppointmentModal';

interface AppointmentsViewProps {
  onOpenReceipt?: (sale: SaleRecord) => void;
}

type ViewMode = 'calendar' | 'timeline' | 'list';

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({ onOpenReceipt }) => {
  const {
    appointments,
    artists,
    formatMoney,
    updateAppointmentStatus,
    deleteAppointment,
    completeAndBillAppointment,
    settings,
  } = useStudio();

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArtist, setFilterArtist] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Calendar Date State (default to current month/year)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayString, setSelectedDayString] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Quick navigation for Month
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayString(now.toISOString().split('T')[0]);
  };

  // Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const matchesSearch =
        searchQuery === '' ||
        apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (apt.clientPhone && apt.clientPhone.includes(searchQuery)) ||
        (apt.clientInstagram && apt.clientInstagram.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesArtist = filterArtist === 'all' || apt.artistId === filterArtist;
      const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || apt.serviceCategory === filterCategory;

      return matchesSearch && matchesArtist && matchesStatus && matchesCategory;
    });
  }, [appointments, searchQuery, filterArtist, filterStatus, filterCategory]);

  // Appointments for the selected day in calendar view
  const appointmentsForSelectedDay = useMemo(() => {
    return filteredAppointments
      .filter(apt => apt.date === selectedDayString)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filteredAppointments, selectedDayString]);

  // Today's appointments count & metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = useMemo(() => {
    return appointments.filter(a => a.date === todayStr);
  }, [appointments, todayStr]);

  const activeTodayCount = todayAppointments.filter(
    a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress'
  ).length;

  const totalDepositsHeld = appointments
    .filter(a => a.depositPaid && a.status !== 'cancelled' && a.status !== 'completed')
    .reduce((acc, a) => acc + a.depositAmount, 0);

  // Status helper badges
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled':
        return {
          label: 'Agendada',
          className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
          dot: 'bg-blue-400',
        };
      case 'confirmed':
        return {
          label: 'Confirmada',
          className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'in_progress':
        return {
          label: 'En Cabina',
          className: 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 shadow-[0_0_8px_rgba(255,51,102,0.3)]',
          dot: 'bg-[#FF3366] animate-pulse',
        };
      case 'completed':
        return {
          label: 'Completada / Facturada',
          className: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
          dot: 'bg-neutral-400',
        };
      case 'no_show':
        return {
          label: 'No Asistió',
          className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'cancelled':
        return {
          label: 'Cancelada',
          className: 'bg-red-500/15 text-red-400 border border-red-500/30',
          dot: 'bg-red-400',
        };
      default:
        return {
          label: status,
          className: 'bg-neutral-800 text-neutral-400 border border-neutral-700',
          dot: 'bg-neutral-500',
        };
    }
  };

  // Billing State
  const [billingPaymentMethod, setBillingPaymentMethod] = useState<PaymentMethod>('card');
  const [billingTipAmount, setBillingTipAmount] = useState<number>(0);
  const [billingFinalPrice, setBillingFinalPrice] = useState<number>(0);

  const handleStartBilling = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setBillingFinalPrice(apt.estimatedPrice);
    setBillingTipAmount(0);
    setBillingPaymentMethod(apt.depositPaymentMethod || 'card');
    setIsBillingModalOpen(true);
  };

  const handleConfirmBilling = () => {
    if (!selectedAppointment) return;
    try {
      const sale = completeAndBillAppointment(
        selectedAppointment.id,
        billingPaymentMethod,
        billingTipAmount,
        billingFinalPrice
      );
      setIsBillingModalOpen(false);
      setSelectedAppointment(null);
      if (onOpenReceipt) {
        onOpenReceipt(sale);
      }
    } catch (err: any) {
      alert(err.message || 'Error al facturar');
    }
  };

  // WhatsApp shortcut
  const getWhatsAppLink = (apt: Appointment) => {
    const cleanPhone = apt.clientPhone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `¡Hola ${apt.clientName}! Te recordamos tu cita de ${apt.serviceName} en ${settings.studioName} para el ${apt.date} a las ${apt.startTime} hrs con ${apt.artistName}. Saldo pendiente: ${formatMoney(Math.max(0, apt.estimatedPrice - apt.depositAmount))}. ¡Te esperamos!`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Banner & Quick KPI Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Agenda & Agendamiento de Citas
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400">
            Control de reservas por cabina, señas/anticipos en USD ($), consentimientos y cobro directo en POS.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730] overflow-x-auto max-w-full">
            {[
              { id: 'calendar', label: 'Calendario Mensual' },
              { id: 'timeline', label: 'Timeline Cabinas' },
              { id: 'list', label: 'Listado' },
            ].map(vm => (
              <button
                key={vm.id}
                onClick={() => setViewMode(vm.id as ViewMode)}
                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === vm.id
                    ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsNewAppointmentOpen(true)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_14px_rgba(255,51,102,0.35)] cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
          <span className="text-neutral-400 text-xs block mb-1">Citas para Hoy</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">{activeTodayCount}</span>
            <span className="text-xs text-neutral-400">activas / en cabina</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-2 pt-2 border-t border-[#23232A]">
            Total del día: {todayAppointments.length} citas
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
          <span className="text-neutral-400 text-xs block mb-1">Señas en Custodia</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#FF3366]">
            {formatMoney(totalDepositsHeld)}
          </div>
          <span className="text-[11px] text-neutral-400 mt-2 pt-2 border-t border-[#23232A]">
            Anticipos de citas pendientes
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
          <span className="text-neutral-400 text-xs block mb-1">Total Citas en Sistema</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">{appointments.length}</div>
          <span className="text-[11px] text-neutral-400 mt-2 pt-2 border-t border-[#23232A]">
            Histórico registrado
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
          <span className="text-neutral-400 text-xs block mb-1">Artistas en Turno</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {artists.filter(a => a.active).length}
          </div>
          <span className="text-[11px] text-neutral-400 mt-2 pt-2 border-t border-[#23232A]">
            Cabinas y estaciones listas
          </span>
        </div>
      </div>

      {/* Filter Bar with Search, Category & Artist Filter */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#FF3366]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, teléfono, @instagram o servicio..."
            className="w-full bg-[#121215] border border-[#272730] focus:border-[#FF3366] rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2.5">
          <select
            value={filterArtist}
            onChange={e => setFilterArtist(e.target.value)}
            className="bg-[#121215] border border-[#272730] rounded-full px-3 py-1.5 text-xs text-neutral-300 focus:border-[#FF3366] focus:outline-hidden"
          >
            <option value="all">Todos los Artistas</option>
            {artists.map(art => (
              <option key={art.id} value={art.id}>
                {art.name} ({art.role})
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-[#121215] border border-[#272730] rounded-full px-3 py-1.5 text-xs text-neutral-300 focus:border-[#FF3366] focus:outline-hidden"
          >
            <option value="all">Todas las Categorías</option>
            <option value="tattoo">Tatuajes</option>
            <option value="piercing">Piercings</option>
            <option value="jewelry">Joyería</option>
            <option value="other">Retoques / Consultas</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#121215] border border-[#272730] rounded-full px-3 py-1.5 text-xs text-neutral-300 focus:border-[#FF3366] focus:outline-hidden"
          >
            <option value="all">Todos los Estados</option>
            <option value="scheduled">Agendadas</option>
            <option value="confirmed">Confirmadas</option>
            <option value="in_progress">En Cabina</option>
            <option value="completed">Completadas / Facturadas</option>
            <option value="no_show">No Asistió</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Left 2 Cols: Monthly Calendar Matrix */}
          <div className="xl:col-span-2 p-3.5 sm:p-6 rounded-3xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex items-center justify-between border-b border-[#24242A] pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_6px_#FF3366]"></span>
                <span className="text-xs sm:text-sm font-bold text-white capitalize tracking-wide font-sans">
                  {monthName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleJumpToday}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-[#2A2A33] text-neutral-300 hover:text-white hover:border-[#FF3366] transition-colors"
                >
                  Hoy
                </button>
                <div className="flex items-center gap-1 bg-[#121215] border border-[#272730] rounded-full p-0.5">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-[#1E1E24] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-[#1E1E24] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs font-bold text-neutral-400 py-1">
              <span>Dom</span>
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 sm:h-22 rounded-xl bg-[#141417]/40 border border-transparent opacity-30" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDayString === dateKey;
                const isToday = dateKey === todayStr;

                const dayApts = filteredAppointments.filter(a => a.date === dateKey);

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDayString(dateKey)}
                    className={`h-14 sm:h-22 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-[#1F1F27] border-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]'
                        : isToday
                        ? 'bg-[#18181E] border-neutral-600 hover:border-[#FF3366]/50'
                        : 'bg-[#131317] border-[#222229] hover:bg-[#1A1A20] hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold ${
                          isSelected
                            ? 'bg-[#FF3366] text-white shadow-[0_0_8px_#FF3366]'
                            : isToday
                            ? 'bg-white text-black font-bold'
                            : 'text-neutral-400 group-hover:text-white'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayApts.length > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-mono text-[#FF3366] font-bold">
                          <span className="sm:hidden">{dayApts.length}</span>
                          <span className="hidden sm:inline">
                            {dayApts.length} {dayApts.length === 1 ? 'cita' : 'citas'}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Chips for appointments on desktop, dots on mobile */}
                    <div className="hidden sm:block space-y-1 overflow-hidden mt-1">
                      {dayApts.slice(0, 2).map(apt => (
                        <div
                          key={apt.id}
                          className="px-1.5 py-0.5 rounded-md bg-[#23232C] border border-[#2D2D38] text-[9px] truncate text-neutral-200 flex items-center gap-1"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              apt.status === 'in_progress'
                                ? 'bg-[#FF3366]'
                                : apt.status === 'confirmed'
                                ? 'bg-emerald-400'
                                : 'bg-blue-400'
                            }`}
                          />
                          <span className="font-mono text-neutral-400">{apt.startTime}</span>
                          <span className="truncate">{apt.clientName.split(' ')[0]}</span>
                        </div>
                      ))}
                      {dayApts.length > 2 && (
                        <span className="text-[9px] text-neutral-500 block text-center">
                          +{dayApts.length - 2} más
                        </span>
                      )}
                    </div>

                    {dayApts.length > 0 && (
                      <div className="flex sm:hidden items-center justify-center gap-1 pb-0.5">
                        {dayApts.slice(0, 3).map(apt => (
                          <span
                            key={apt.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              apt.status === 'in_progress'
                                ? 'bg-[#FF3366]'
                                : apt.status === 'confirmed'
                                ? 'bg-emerald-400'
                                : 'bg-blue-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Selected Day Appointments Drawer */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[#18181D] border border-[#272730] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#24242A] pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Agenda: {selectedDayString}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {appointmentsForSelectedDay.length} citas programadas para este día
                  </p>
                </div>
                <button
                  onClick={() => setIsNewAppointmentOpen(true)}
                  className="p-1.5 rounded-full bg-[#FF3366]/15 border border-[#FF3366]/40 text-[#FF3366] hover:bg-[#FF3366] hover:text-white transition-all"
                  title="Nueva cita en esta fecha"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {appointmentsForSelectedDay.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#FF3366]" />
                    <p>No hay citas agendadas para esta fecha.</p>
                    <button
                      onClick={() => setIsNewAppointmentOpen(true)}
                      className="mt-3 text-xs text-[#FF3366] hover:underline font-semibold"
                    >
                      + Agendar cita aquí
                    </button>
                  </div>
                ) : (
                  appointmentsForSelectedDay.map(apt => {
                    const badge = getStatusBadge(apt.status);
                    return (
                      <div
                        key={apt.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-[#131317] border border-[#272730] space-y-3 hover:border-[#FF3366]/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#FF3366] bg-[#FF3366]/10 px-2 py-0.5 rounded-full">
                              {apt.startTime} - {apt.endTime}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              ({apt.estimatedHours}h)
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5 ${badge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-white text-xs">{apt.clientName}</h4>
                          <p className="text-[11px] text-neutral-300 font-medium">
                            {apt.serviceName}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Artista: <span className="text-white font-medium">{apt.artistName}</span>
                            {apt.bodyPlacement && ` · Zona: ${apt.bodyPlacement}`}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#191920] border border-[#24242C] flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-neutral-400 block">Total Est.</span>
                            <span className="font-bold text-white">{formatMoney(apt.estimatedPrice)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block">Seña Pagada</span>
                            <span className="font-bold text-emerald-400">
                              {apt.depositPaid ? formatMoney(apt.depositAmount) : '$0'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block">Por Cobrar</span>
                            <span className="font-bold text-[#FF3366]">
                              {formatMoney(Math.max(0, apt.estimatedPrice - (apt.depositPaid ? apt.depositAmount : 0)))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#222228] gap-2 flex-wrap">
                          <a
                            href={getWhatsAppLink(apt)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-[#2A2A33] text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors"
                            title="Enviar recordatorio por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {apt.status !== 'completed' && (
                              <button
                                onClick={() => handleStartBilling(apt)}
                                className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-[11px] font-bold shadow-[0_0_8px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Cobrar en POS</span>
                              </button>
                            )}

                            <select
                              value={apt.status}
                              onChange={e =>
                                updateAppointmentStatus(apt.id, e.target.value as AppointmentStatus)
                              }
                              className="bg-[#191920] border border-[#2B2B36] rounded-full px-2 py-1 text-[10px] text-neutral-300 focus:outline-hidden"
                            >
                              <option value="scheduled">Agendada</option>
                              <option value="confirmed">Confirmada</option>
                              <option value="in_progress">En Cabina</option>
                              <option value="completed">Completada</option>
                              <option value="no_show">No Asistió</option>
                              <option value="cancelled">Cancelada</option>
                            </select>

                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar la cita de ${apt.clientName}?`)) {
                                  deleteAppointment(apt.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Eliminar cita"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#121215] border border-[#23232A] text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Señas protegidas en caja:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatMoney(
                  appointmentsForSelectedDay
                    .filter(a => a.depositPaid)
                    .reduce((acc, a) => acc + a.depositAmount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TIMELINE POR CABINAS Y ARTISTAS */}
      {viewMode === 'timeline' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-[#18181D] border border-[#272730] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24242A] pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Timeline de Cabinas & Estaciones del Estudio
              </h3>
              <p className="text-[11px] text-neutral-400">
                Visualización de ocupación horaria para la fecha: <span className="text-[#FF3366] font-mono font-bold">{selectedDayString}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDayString}
                onChange={e => setSelectedDayString(e.target.value)}
                className="bg-[#121215] border border-[#272730] rounded-full px-3 py-1.5 text-xs text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-6">
            {artists
              .filter(a => a.active)
              .map(artist => {
                const artistDayApts = appointmentsForSelectedDay.filter(
                  a => a.artistId === artist.id
                );

                return (
                  <div
                    key={artist.id}
                    className="p-4 rounded-2xl bg-[#121215] border border-[#24242C] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] font-bold text-xs flex items-center justify-center shrink-0">
                          {artist.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">{artist.name}</div>
                          <div className="text-[10px] text-neutral-400 truncate">
                            {artist.role} · Cabina {artist.specialty}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-neutral-400 shrink-0">
                        {artistDayApts.length} {artistDayApts.length === 1 ? 'cita' : 'citas'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {artistDayApts.length === 0 ? (
                        <div className="p-3 rounded-xl bg-[#16161B] border border-dashed border-[#2A2A33] text-center text-[11px] text-neutral-500">
                          Cabina libre en esta fecha.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                          {artistDayApts.map(apt => (
                            <div
                              key={apt.id}
                              className="p-3 rounded-xl bg-[#191920] border border-[#2B2B38] space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-[#FF3366] font-bold">
                                  {apt.startTime} - {apt.endTime}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  Seña: {formatMoney(apt.depositAmount)}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-white truncate">
                                {apt.clientName}
                              </div>
                              <div className="text-[11px] text-neutral-400 truncate">
                                {apt.serviceName}
                              </div>
                              <div className="pt-2 border-t border-[#252530] flex items-center justify-between">
                                <span className="text-[10px] font-mono text-neutral-300">
                                  Total: {formatMoney(apt.estimatedPrice)}
                                </span>
                                <button
                                  onClick={() => handleStartBilling(apt)}
                                  className="text-[11px] text-[#FF3366] font-semibold hover:underline"
                                >
                                  Cobrar →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 3: LISTADO COMPLETO DE CITAS */}
      {viewMode === 'list' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-[#18181D] border border-[#272730] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24242A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Listado Cronológico de Citas ({filteredAppointments.length})
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              Ordenadas por fecha y hora
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#121215] text-neutral-400 border-b border-[#26262E] font-medium">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Fecha & Hora</th>
                  <th className="py-3 px-4 whitespace-nowrap">Cliente</th>
                  <th className="py-3 px-4 whitespace-nowrap">Servicio & Zona</th>
                  <th className="py-3 px-4 whitespace-nowrap">Artista</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Presupuesto ($)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Seña ($)</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Consentimiento</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22222A]">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-500">
                      No se encontraron citas con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map(apt => {
                    const badge = getStatusBadge(apt.status);
                    return (
                      <tr key={apt.id} className="hover:bg-[#1C1C24] transition-colors">
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="text-white font-bold">{apt.date}</div>
                          <div className="text-[#FF3366] text-[11px] font-semibold">
                            {apt.startTime} - {apt.endTime}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-white">{apt.clientName}</div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                            <span>{apt.clientPhone}</span>
                            {apt.clientInstagram && (
                              <span className="text-[#FF3366]">{apt.clientInstagram}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="font-medium text-neutral-200">{apt.serviceName}</div>
                          {apt.bodyPlacement && (
                            <div className="text-[10px] text-neutral-400">
                              Zona: {apt.bodyPlacement} {apt.sizeApprox ? `(${apt.sizeApprox})` : ''}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-white font-medium">{apt.artistName}</div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                          {formatMoney(apt.estimatedPrice)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                          <span className={apt.depositPaid ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                            {formatMoney(apt.depositAmount)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {apt.consentSigned ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" />
                              Firmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                              Pendiente
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-0.5 rounded-full ${badge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {apt.status !== 'completed' && (
                              <button
                                onClick={() => handleStartBilling(apt)}
                                className="px-3 py-1 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-[11px] font-bold shadow-[0_0_8px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                              >
                                Cobrar
                              </button>
                            )}

                            <select
                              value={apt.status}
                              onChange={e =>
                                updateAppointmentStatus(apt.id, e.target.value as AppointmentStatus)
                              }
                              className="bg-[#121215] border border-[#2A2A33] rounded-full px-2 py-1 text-[10px] text-neutral-300 focus:outline-hidden"
                            >
                              <option value="scheduled">Agendada</option>
                              <option value="confirmed">Confirmada</option>
                              <option value="in_progress">En Cabina</option>
                              <option value="completed">Completada</option>
                              <option value="no_show">No Asistió</option>
                              <option value="cancelled">Cancelada</option>
                            </select>

                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar la cita de ${apt.clientName}?`)) {
                                  deleteAppointment(apt.id);
                                }
                              }}
                              className="p-1 rounded-lg text-neutral-500 hover:text-red-400"
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
      )}

      {/* MODAL 1: NUEVA CITA */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        initialDate={selectedDayString}
        initialArtistId={filterArtist !== 'all' ? filterArtist : undefined}
      />

      {/* MODAL 2: FACTURAR / COBRAR CITA DIRECTO EN POS */}
      {isBillingModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141417] border border-[#272730] rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242A] bg-[#16161B]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366]">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Cobrar Cita en POS
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Cliente: {selectedAppointment.clientName} · {selectedAppointment.serviceName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="w-7 h-7 rounded-full border border-[#2A2A34] text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
                <div className="flex justify-between text-neutral-300">
                  <span>Precio Acordado / Final:</span>
                  <input
                    type="number"
                    value={billingFinalPrice}
                    onChange={e => setBillingFinalPrice(Number(e.target.value))}
                    className="w-24 bg-[#111114] border border-[#2A2A33] rounded-lg px-2 py-1 text-right font-mono font-bold text-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>(-) Seña previa descontada:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    -{formatMoney(selectedAppointment.depositAmount)}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>Propina voluntaria para artista:</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={billingTipAmount}
                    onChange={e => setBillingTipAmount(Number(e.target.value))}
                    placeholder="$0"
                    className="w-20 bg-[#111114] border border-[#2A2A33] rounded-lg px-2 py-1 text-right font-mono text-[#FF3366] focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-[#252530] flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Importe a Cobrar Ahora:</span>
                  <span className="text-xl font-bold font-mono text-[#FF3366]">
                    {formatMoney(
                      Math.max(0, billingFinalPrice - selectedAppointment.depositAmount) + billingTipAmount
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Método de Pago para el Saldo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'card', label: 'Tarjeta POS' },
                    { id: 'cash', label: 'Efectivo en Caja' },
                    { id: 'transfer', label: 'Transferencia' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBillingPaymentMethod(m.id as PaymentMethod)}
                      className={`py-2 px-3 rounded-xl font-medium transition-all border ${
                        billingPaymentMethod === m.id
                          ? 'bg-[#FF3366] text-white border-[#FF3366] shadow-[0_0_8px_rgba(255,51,102,0.3)]'
                          : 'bg-[#18181D] text-neutral-300 border-[#272730] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#121215] border border-[#24242C] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Consentimiento Informado</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {selectedAppointment.consentSigned ? 'Firmado' : 'Validar en recepción'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#24242A]">
                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#272730] text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBilling}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.4)] cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Generar Ticket & Completar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
