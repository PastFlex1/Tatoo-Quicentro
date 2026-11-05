import React, { useState, useMemo } from 'react';
import { UiSelect } from '../common/UiSelect';
import {
  Calendar,
  Search,
  X,
  User,
  Clock,
  DollarSign,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  Check,
  CalendarDays,
  CalendarCheck,
  UserCheck,
  Phone,
  Tag,
  FileText,
} from 'lucide-react';
import { Appointment, Artist, ClientProfile } from '../../types';

interface SelectAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  artists: Artist[];
  clients: ClientProfile[];
  onSelectAppointment: (appointment: Appointment) => void;
  formatMoney: (val: number | undefined | null) => string;
  selectedAppointmentId?: string | null;
  onGoToAppointments?: () => void;
}

type FilterTab = 'pending' | 'today' | 'confirmed' | 'deposit' | 'all';

export const SelectAppointmentModal: React.FC<SelectAppointmentModalProps> = ({
  isOpen,
  onClose,
  appointments,
  artists,
  clients,
  onSelectAppointment,
  formatMoney,
  selectedAppointmentId,
  onGoToAppointments,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [selectedArtistFilter, setSelectedArtistFilter] = useState<string>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesClient = apt.clientName.toLowerCase().includes(query);
        const matchesPhone = (apt.clientPhone || '').toLowerCase().includes(query);
        const matchesService = apt.serviceName.toLowerCase().includes(query);
        const matchesArtist = apt.artistName.toLowerCase().includes(query);
        const matchesDate = apt.date.includes(query);
        const matchesPlacement = (apt.bodyPlacement || '').toLowerCase().includes(query);
        if (
          !matchesClient &&
          !matchesPhone &&
          !matchesService &&
          !matchesArtist &&
          !matchesDate &&
          !matchesPlacement
        ) {
          return false;
        }
      }

      // 2. Artist filter
      if (selectedArtistFilter !== 'all' && apt.artistId !== selectedArtistFilter) {
        return false;
      }

      // 3. Tab filter
      switch (activeTab) {
        case 'pending':
          return apt.status !== 'completed' && apt.status !== 'cancelled' && apt.status !== 'no_show';
        case 'today':
          return apt.date === todayStr && apt.status !== 'cancelled' && apt.status !== 'no_show';
        case 'confirmed':
          return apt.status === 'confirmed' || apt.status === 'in_progress';
        case 'deposit':
          return apt.depositPaid && apt.depositAmount > 0 && apt.status !== 'completed';
        case 'all':
        default:
          return true;
      }
    });
  }, [appointments, searchQuery, selectedArtistFilter, activeTab, todayStr]);

  // Tab counters
  const counts = useMemo(() => {
    const pending = appointments.filter(
      a => a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no_show'
    ).length;
    const today = appointments.filter(
      a => a.date === todayStr && a.status !== 'cancelled' && a.status !== 'no_show'
    ).length;
    const confirmed = appointments.filter(
      a => a.status === 'confirmed' || a.status === 'in_progress'
    ).length;
    const withDeposit = appointments.filter(
      a => a.depositPaid && a.depositAmount > 0 && a.status !== 'completed'
    ).length;
    return { pending, today, confirmed, withDeposit, all: appointments.length };
  }, [appointments, todayStr]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#121215] border border-[#272730] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#24242A] bg-[#18181D] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30 text-[#FF3366] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Traer Cita a Facturación POS
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/30 text-[#FF3366] text-[10px] font-bold">
                  {counts.pending} disponibles
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Selecciona una cita agendada para autocompletar cliente, artista, servicio y seña en un clic.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-xl bg-[#121215] border border-[#26262F] hover:border-[#FF3366] transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-[#222228] bg-[#16161B] space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, teléfono, servicio, artista o fecha (YYYY-MM-DD)..."
                className="w-full bg-[#101013] border border-[#26262F] focus:border-[#FF3366] rounded-xl pl-9.5 pr-8 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Artist Filter Dropdown */}
            <div className="sm:w-56 shrink-0">
              <UiSelect
                value={selectedArtistFilter}
                onChange={e => setSelectedArtistFilter(e.target.value)}
                className="w-full bg-[#101013] border border-[#26262F] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">Todos los artistas</option>
                {artists.map(art => (
                  <option key={art.id} value={art.id}>
                    {art.name} ({art.defaultCommissionRate}%)
                  </option>
                ))}
              </UiSelect>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'pending', label: 'Pendientes de Cobro', count: counts.pending },
              { id: 'today', label: 'Citas de Hoy', count: counts.today },
              { id: 'confirmed', label: 'En Curso / Confirmadas', count: counts.confirmed },
              { id: 'deposit', label: 'Con Seña Pagada', count: counts.withDeposit },
              { id: 'all', label: 'Todas las Citas', count: counts.all },
            ].map(tab => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FilterTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF3366] text-white shadow-md shadow-[#FF3366]/20'
                      : 'bg-[#101013] text-neutral-400 hover:text-white border border-[#24242C]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointments List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#18181D] border border-[#272730] text-neutral-500 flex items-center justify-center mx-auto">
                <CalendarDays className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">No se encontraron citas</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `No hay citas que coincidan con "${searchQuery}". Intenta con otro término o limpia los filtros.`
                    : 'No hay citas registradas en esta vista para traer al POS.'}
                </p>
              </div>

              {onGoToAppointments && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToAppointments();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181D] hover:bg-[#22222A] border border-[#272730] text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span>Ir al Módulo de Citas y Agenda</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAppointments.map(apt => {
                const isSelectedInPos = selectedAppointmentId === apt.id;
                const isToday = apt.date === todayStr;

                // Match client for DNI
                const matchedClient = clients.find(
                  c =>
                    (c.name && c.name.toLowerCase().trim() === apt.clientName.toLowerCase().trim()) ||
                    (c.phone && apt.clientPhone && c.phone.replace(/\D/g, '') === apt.clientPhone.replace(/\D/g, ''))
                );

                const deposit = apt.depositPaid ? apt.depositAmount : 0;
                const balanceDue = Math.max(0, apt.estimatedPrice - deposit);

                return (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelectedInPos
                        ? 'bg-[#FF3366]/10 border-[#FF3366] shadow-[0_0_15px_rgba(255,51,102,0.2)]'
                        : 'bg-[#18181D] border-[#26262F] hover:border-[#383845]'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono flex items-center gap-1 ${
                              isToday
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-[#121215] text-neutral-300 border border-[#26262F]'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>
                              {isToday ? 'HOY' : apt.date} · {apt.startTime}
                            </span>
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              apt.status === 'in_progress'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : apt.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : apt.status === 'completed'
                                ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {apt.status === 'in_progress'
                              ? 'En Cabina'
                              : apt.status === 'confirmed'
                              ? 'Confirmada'
                              : apt.status === 'completed'
                              ? 'Completada'
                              : 'Programada'}
                          </span>
                        </div>

                        {isSelectedInPos && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF3366] text-white text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>En POS</span>
                          </span>
                        )}
                      </div>

                      {/* Client & Service Info */}
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {apt.clientName}
                          </h4>
                          {matchedClient?.dni && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono shrink-0">
                              DNI: {matchedClient.dni}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-300 font-medium truncate">
                          {apt.serviceName}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#FF3366]" />
                            <strong className="text-neutral-200">{apt.artistName}</strong>
                          </span>
                          {apt.clientPhone && (
                            <span className="flex items-center gap-1 font-mono text-neutral-400">
                              <Phone className="w-3 h-3 text-neutral-500" />
                              {apt.clientPhone}
                            </span>
                          )}
                          {apt.bodyPlacement && (
                            <span className="text-neutral-400">
                              Zona: <strong className="text-neutral-300">{apt.bodyPlacement}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial Info Card */}
                      <div className="p-2.5 rounded-lg bg-[#121215] border border-[#222229] grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="text-[10px] text-neutral-400">Total Est.</div>
                          <div className="font-mono font-bold text-white">
                            {formatMoney(apt.estimatedPrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400">Seña Pagada</div>
                          <div
                            className={`font-mono font-bold ${
                              deposit > 0 ? 'text-emerald-400' : 'text-neutral-500'
                            }`}
                          >
                            {formatMoney(deposit)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400">Saldo a Cobrar</div>
                          <div className="font-mono font-bold text-[#FF3366]">
                            {formatMoney(balanceDue)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-[#222229]">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAppointment(apt);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelectedInPos
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white shadow-md shadow-[#FF3366]/20'
                        }`}
                      >
                        {isSelectedInPos ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Cita ya cargada en POS (Volver a cargar)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Traer Cita al POS de Facturación</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#24242A] bg-[#18181D] flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Al traer una cita, se completan automáticamente los datos fiscales y seña en el cobro.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#26262F] hover:bg-[#343440] text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
