import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  DollarSign,
  Edit2,
  X,
  Phone,
  Mail,
  FileText,
  Calendar,
  Percent,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  Eye,
  CreditCard,
  Building2,
  Sparkles,
  Users,
  TrendingUp,
  HandCoins,
  Printer,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Artist, ArtistSettlement, SaleRecord } from '../../types';
import { computeArtistBalance } from '../../utils/artistBalance';
import { ArtistPaymentTicketModal } from './ArtistPaymentTicketModal';

interface ArtistsViewProps {
  onOpenReceipt?: (sale: SaleRecord) => void;
}

type SettlementPeriod = 'day' | 'week' | 'month' | 'all';

export const ArtistsView: React.FC<ArtistsViewProps> = ({ onOpenReceipt }) => {
  const {
    artists,
    sales,
    settlements,
    settleArtistCommissions,
    addArtist,
    updateArtist,
    toggleArtistStatus,
    formatMoney,
  } = useStudio();

  // Period filter for settlements: Día, Semana, Mes, o Todo
  const [period, setPeriod] = useState<SettlementPeriod>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals state
  const [isNewArtistModalOpen, setIsNewArtistModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  // Modal 1: Ver Ventas / Facturas del Artista
  const [viewSalesArtist, setViewSalesArtist] = useState<Artist | null>(null);

  // Modal 2: Ajustar Porcentaje de Comisión
  const [commissionArtist, setCommissionArtist] = useState<Artist | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<number>(80);

  // Modal 3: Liquidar (Pagar)
  const [settleArtist, setSettleArtist] = useState<Artist | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleTips, setSettleTips] = useState<number>(0);
  const [settleDeductions, setSettleDeductions] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'transfer'>('transfer');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleType, setSettleType] = useState<'liquidacion' | 'anticipo'>('liquidacion');
  const [settleBalance, setSettleBalance] = useState<number>(0);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Comprobante de pago a imprimir (firma representante legal + artista)
  const [ticketSettlement, setTicketSettlement] = useState<ArtistSettlement | null>(null);
  const [ticketArtist, setTicketArtist] = useState<Artist | null>(null);
  const [ticketJustCreated, setTicketJustCreated] = useState(false);

  // Add/Edit Artist form state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'Tatuador' | 'Tatuadora' | 'Piercer' | 'Residente' | 'Invitado / Guest'>('Tatuador');
  const [specialty, setSpecialty] = useState('');
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(80);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');

  // Helper to determine if a date falls in selected period
  const isDateInPeriod = (dateStr: string, p: SettlementPeriod): boolean => {
    if (p === 'all') return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();

    if (p === 'day') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }

    if (p === 'week') {
      const dayOfWeek = now.getDay();
      const distToMon = (dayOfWeek + 6) % 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() - distToMon);
      mon.setHours(0, 0, 0, 0);

      const nextMon = new Date(mon);
      nextMon.setDate(mon.getDate() + 7);

      return d >= mon && d < nextMon;
    }

    if (p === 'month') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    }

    return true;
  };

  // Human-readable period label
  const periodLabel = useMemo(() => {
    const now = new Date();
    if (period === 'day') {
      return `Hoy (${now.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })})`;
    }
    if (period === 'week') {
      return 'Esta Semana';
    }
    if (period === 'month') {
      return `Este Mes (${now.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })})`;
    }
    return 'Histórico Completo';
  }, [period]);

  // Compute artist statistics mapped horizontally
  const artistsWithMetrics = useMemo(() => {
    return artists.map(art => {
      // Sales for this artist
      const allSales = sales.filter(s => s.artistId === art.id && s.status !== 'cancelled');
      const periodSales = allSales.filter(s => isDateInPeriod(s.date, period));

      // Period totals
      const grossBilledPeriod = periodSales.reduce((acc, s) => acc + s.total, 0);
      const commissionPeriod = periodSales.reduce((acc, s) => acc + s.artistShare, 0);
      const tipsPeriod = periodSales.reduce((acc, s) => acc + s.tipAmount, 0);
      const studioSharePeriod = periodSales.reduce((acc, s) => acc + s.studioShare, 0);
      const totalEarnedPeriod = commissionPeriod + tipsPeriod;

      // Settlements for this artist
      const allSettlements = settlements.filter(st => st.artistId === art.id);
      const periodSettlements = allSettlements.filter(st => isDateInPeriod(st.date, period));
      const alreadyPaidPeriod = periodSettlements.reduce((acc, st) => acc + st.amountPaid, 0);

      const advancesPeriod = periodSettlements
        .filter(st => st.type === 'anticipo')
        .reduce((acc, st) => acc + st.amountPaid, 0);

      // Saldo histórico: lo ganado menos lo aplicado en liquidaciones y anticipos.
      // (Las deducciones se descuentan del efectivo, no quedan como deuda con el artista.)
      const balanceInfo = computeArtistBalance(art.id, sales, settlements);
      const totalPendingAccumulated = Math.max(0, balanceInfo.balance);
      const advanceCredit = Math.max(0, -balanceInfo.balance);

      // Period pending balance
      const periodPending = Math.max(0, totalEarnedPeriod - alreadyPaidPeriod);

      return {
        artist: art,
        allSales,
        periodSales,
        grossBilledPeriod,
        commissionPeriod,
        tipsPeriod,
        studioSharePeriod,
        totalEarnedPeriod,
        alreadyPaidPeriod,
        periodPending,
        totalPendingAccumulated,
        advanceCredit,
        advancesPeriod,
        balanceInfo,
        salesCount: periodSales.length,
      };
    });
  }, [artists, sales, settlements, period]);

  // Filtered artists for display
  const filteredArtists = useMemo(() => {
    return artistsWithMetrics.filter(({ artist }) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        artist.name.toLowerCase().includes(q) ||
        (artist.nickname && artist.nickname.toLowerCase().includes(q)) ||
        artist.specialty.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'all' || artist.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [artistsWithMetrics, searchTerm, roleFilter]);

  // Global summary KPIs for the period
  const globalSummary = useMemo(() => {
    const totalBilled = filteredArtists.reduce((acc, a) => acc + a.grossBilledPeriod, 0);
    const totalCommissions = filteredArtists.reduce((acc, a) => acc + a.commissionPeriod, 0);
    const totalTips = filteredArtists.reduce((acc, a) => acc + a.tipsPeriod, 0);
    const totalStudioKept = filteredArtists.reduce((acc, a) => acc + a.studioSharePeriod, 0);
    const totalPending = filteredArtists.reduce((acc, a) => acc + a.totalPendingAccumulated, 0);
    const totalPaidPeriod = filteredArtists.reduce((acc, a) => acc + a.alreadyPaidPeriod, 0);
    const totalJobsCount = filteredArtists.reduce((acc, a) => acc + a.salesCount, 0);

    return {
      totalBilled,
      totalCommissions,
      totalTips,
      totalStudioKept,
      totalPending,
      totalPaidPeriod,
      totalJobsCount,
    };
  }, [filteredArtists]);

  // Handler: Abrir modal de Liquidación (pago total) o Anticipo (pago parcial)
  const handleOpenSettle = (art: Artist, type: 'liquidacion' | 'anticipo') => {
    const { balance, pendingCommission, pendingTips } = computeArtistBalance(art.id, sales, settlements);
    setSettleArtist(art);
    setSettleType(type);
    setSettleBalance(balance);
    setSettleError(null);
    setSettleDeductions(0);
    setSettleMethod('transfer');
    if (type === 'liquidacion') {
      setSettleAmount(pendingCommission);
      setSettleTips(pendingTips);
      setSettleNotes(`Liquidación de comisiones pendientes para ${art.name}`);
    } else {
      setSettleAmount(0);
      setSettleTips(0);
      setSettleNotes(`Anticipo de comisiones para ${art.name}`);
    }
  };

  // Handler: Confirmar pago, registrar y abrir el comprobante para firmas
  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleArtist) return;

    const isAdvance = settleType === 'anticipo';
    const applied = settleAmount + (isAdvance ? 0 : settleTips);
    const pending = Math.max(0, settleBalance);

    if (settleAmount < 0 || settleTips < 0 || settleDeductions < 0) {
      setSettleError('Los valores no pueden ser negativos.');
      return;
    }
    if (applied <= 0) {
      setSettleError('El monto a pagar debe ser mayor a 0.');
      return;
    }
    if (!isAdvance && applied > pending + 0.005) {
      setSettleError(
        `La liquidación (${formatMoney(applied)}) supera el saldo pendiente (${formatMoney(pending)}). Use "Anticipo" para adelantos.`
      );
      return;
    }
    if (!isAdvance && settleDeductions > applied) {
      setSettleError('Las deducciones no pueden ser mayores al monto liquidado.');
      return;
    }

    const created = settleArtistCommissions(
      settleArtist.id,
      settleAmount,
      isAdvance ? 0 : settleTips,
      isAdvance ? 0 : settleDeductions,
      settleMethod,
      settleNotes,
      settleType
    );

    const artistForTicket = settleArtist;
    setSettleArtist(null);
    if (created) {
      setTicketArtist(artistForTicket);
      setTicketJustCreated(true);
      setTicketSettlement(created);
    }
  };

  // Reimprimir el comprobante de un pago anterior
  const openTicketFor = (st: ArtistSettlement) => {
    setTicketArtist(artists.find(a => a.id === st.artistId) || null);
    setTicketJustCreated(false);
    setTicketSettlement(st);
  };

  // Handler: Open Commission Adjustment Modal
  const handleOpenCommissionModal = (art: Artist) => {
    setCommissionArtist(art);
    setNewCommissionRate(art.defaultCommissionRate || 80);
  };

  // Handler: Save Commission Adjustment
  const handleSaveCommissionRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionArtist) return;

    updateArtist(commissionArtist.id, {
      defaultCommissionRate: newCommissionRate,
    });

    setCommissionArtist(null);
  };

  // Handler: Open Add/Edit Artist Modal
  const handleOpenEditArtist = (art: Artist) => {
    setEditingArtist(art);
    setName(art.name);
    setNickname(art.nickname || '');
    setRole(art.role);
    setSpecialty(art.specialty);
    setDefaultCommissionRate(art.defaultCommissionRate);
    setPhone(art.phone);
    setEmail(art.email || '');
    setDni(art.dni || '');
    setIsNewArtistModalOpen(true);
  };

  const handleSaveArtist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingArtist) {
      updateArtist(editingArtist.id, {
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        role,
        specialty: specialty.trim() || 'Tatuador Artístico',
        defaultCommissionRate,
        phone: phone.trim(),
        email: email.trim() || undefined,
        dni: dni.trim() || undefined,
      });
      setEditingArtist(null);
    } else {
      addArtist({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        role,
        specialty: specialty.trim() || 'Tatuador Artístico',
        defaultCommissionRate,
        phone: phone.trim() || '+593 99 000 0000',
        email: email.trim() || undefined,
        dni: dni.trim() || undefined,
        active: true,
        avatarColor: 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/30',
      });
    }

    setIsNewArtistModalOpen(false);
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* =========================================================================
          TOP BANNER: Title & Period Switcher (Día, Semana, Mes, Todo)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Módulo de Liquidación de Artistas & Comisiones
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400">
            Comisiones por período, saldos pendientes, anticipos y liquidaciones con comprobante para firma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector Tabs: DÍA, SEMANA, MES, TODO */}
          <div className="bg-[#141418] p-1 rounded-2xl border border-[#272730] flex items-center shadow-xs">
            {[
              { id: 'day', label: 'Día (Hoy)' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mes' },
              { id: 'all', label: 'Todo' },
            ].map(p => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as SettlementPeriod)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF3366] to-[#E62557] text-white shadow-[0_0_10px_rgba(255,51,102,0.3)]'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Add Artist Button */}
          <button
            onClick={() => {
              setEditingArtist(null);
              setName('');
              setNickname('');
              setSpecialty('');
              setPhone('');
              setEmail('');
              setDni('');
              setIsNewArtistModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Artista / Guest</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PERIOD SUMMARY KPI CARDS
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
            <span>Facturación del Período</span>
            <Calendar className="w-3.5 h-3.5 text-[#FF3366]" />
          </div>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white block">
            {formatMoney(globalSummary.totalBilled)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 block truncate">
            {globalSummary.totalJobsCount} servicios en {periodLabel}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
            <span>Comisiones Artistas</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#FF3366] block">
            {formatMoney(globalSummary.totalCommissions)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-1 block truncate">
            +{formatMoney(globalSummary.totalTips)} propinas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
            <span>Ingreso Retenido Estudio</span>
            <Building2 className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white block">
            {formatMoney(globalSummary.totalStudioKept)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 block">
            Margen de casa ({periodLabel})
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
            <span>Saldo Pendiente (Histórico)</span>
            <DollarSign className="w-3.5 h-3.5 text-[#FF3366]" />
          </div>
          <span
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums block ${
              globalSummary.totalPending > 0 ? 'text-[#FF3366]' : 'text-emerald-400'
            }`}
          >
            {formatMoney(globalSummary.totalPending)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 block">
            {globalSummary.totalPending > 0
              ? `Pagado en el período: ${formatMoney(globalSummary.totalPaidPeriod)}`
              : 'Todos los artistas al día'}
          </span>
        </div>
      </div>

      {/* =========================================================================
          FILTER & SEARCH TOOLBAR
          ========================================================================= */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por artista, apodo o especialidad..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Todos los Roles' },
            { id: 'Tatuador', label: 'Tatuadores' },
            { id: 'Piercer', label: 'Piercers' },
            { id: 'Invitado / Guest', label: 'Guests' },
          ].map(r => {
            const isActive = roleFilter === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                    : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TABLA DE LIQUIDACIÓN DE ARTISTAS
          ========================================================================= */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        {filteredArtists.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            No se encontraron artistas con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[1080px]">
              <thead>
                <tr className="bg-[#121215] border-b border-[#272730] text-[10px] uppercase tracking-wider text-neutral-400">
                  <th className="py-3 px-4 font-semibold">Artista</th>
                  <th className="py-3 px-3 font-semibold text-center">Comisión</th>
                  <th className="py-3 px-3 font-semibold text-center">Servicios</th>
                  <th className="py-3 px-3 font-semibold text-right">Facturado</th>
                  <th className="py-3 px-3 font-semibold text-right">Comisión artista</th>
                  <th className="py-3 px-3 font-semibold text-right">Propinas</th>
                  <th className="py-3 px-3 font-semibold text-right">Retención casa</th>
                  <th className="py-3 px-3 font-semibold text-right">Pagado período</th>
                  <th className="py-3 px-3 font-semibold text-right">Saldo pendiente</th>
                  <th className="py-3 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {filteredArtists.map(item => {
                  const {
                    artist: art,
                    grossBilledPeriod,
                    commissionPeriod,
                    tipsPeriod,
                    studioSharePeriod,
                    alreadyPaidPeriod,
                    advancesPeriod,
                    totalPendingAccumulated,
                    advanceCredit,
                    salesCount,
                  } = item;
                  const isPending = totalPendingAccumulated > 0;

                  return (
                    <tr
                      key={art.id}
                      className={`transition-colors hover:bg-[#1E1E25] ${art.active ? '' : 'opacity-55'}`}
                    >
                      {/* Artista */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="w-9 h-9 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center font-bold text-[11px] text-[#FF3366] shrink-0">
                            {art.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {art.name}
                              {art.nickname && !art.name.includes(art.nickname) && (
                                <span className="ml-1.5 text-[11px] text-[#FF3366] font-medium">"{art.nickname}"</span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate max-w-[220px]" title={art.specialty}>
                              {art.role} · {art.specialty}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                onClick={() => toggleArtistStatus(art.id)}
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold cursor-pointer ${
                                  art.active
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                }`}
                                title="Activar / desactivar"
                              >
                                {art.active ? 'Activo' : 'Inactivo'}
                              </button>
                              <button
                                onClick={() => handleOpenEditArtist(art)}
                                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                title="Editar ficha del artista"
                              >
                                <Edit2 className="w-3 h-3" />
                                Editar
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Comisión % */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCommissionModal(art)}
                          className="inline-flex flex-col items-center px-2 py-1 rounded-lg hover:bg-[#25252E] cursor-pointer"
                          title="Cambiar % de comisión"
                        >
                          <span className="font-mono font-bold text-white text-sm">{art.defaultCommissionRate}%</span>
                          <span className="text-[9px] text-neutral-500 font-mono">Casa {100 - art.defaultCommissionRate}%</span>
                        </button>
                      </td>

                      {/* Servicios */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setViewSalesArtist(art)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#121215] border border-[#272730] hover:border-[#FF3366]/50 text-neutral-200 font-mono cursor-pointer"
                          title="Ver ventas y facturas del artista"
                        >
                          <FileText className="w-3 h-3 text-[#FF3366]" />
                          {salesCount}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-white whitespace-nowrap">
                        {formatMoney(grossBilledPeriod)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#FF3366] font-semibold whitespace-nowrap">
                        {formatMoney(commissionPeriod)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                        {formatMoney(tipsPeriod)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300 whitespace-nowrap">
                        {formatMoney(studioSharePeriod)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums text-neutral-300">{formatMoney(alreadyPaidPeriod)}</div>
                        {advancesPeriod > 0 && (
                          <div className="text-[9px] text-amber-400">incl. {formatMoney(advancesPeriod)} anticipo</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div
                          className={`font-mono tabular-nums font-bold text-sm ${
                            isPending ? 'text-[#FF3366]' : 'text-emerald-400'
                          }`}
                        >
                          {formatMoney(totalPendingAccumulated)}
                        </div>
                        <div className="text-[9px] text-neutral-500">
                          {advanceCredit > 0
                            ? <span className="text-amber-400">Anticipo a descontar {formatMoney(advanceCredit)}</span>
                            : isPending ? 'Acumulado' : 'Al día'}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenSettle(art, 'anticipo')}
                            disabled={!art.active}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                            title="Registrar un anticipo (pago parcial)"
                          >
                            <HandCoins className="w-3.5 h-3.5" />
                            Anticipo
                          </button>
                          <button
                            onClick={() => handleOpenSettle(art, 'liquidacion')}
                            disabled={!isPending}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 whitespace-nowrap ${
                              isPending
                                ? 'bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#E62557] hover:to-[#CC1F4B] text-white cursor-pointer'
                                : 'bg-[#1E1E26] text-neutral-600 border border-[#272730] cursor-not-allowed'
                            }`}
                            title="Liquidar el saldo pendiente"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Liquidar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#121215] border-t border-[#272730] font-bold">
                  <td className="py-3 px-4 text-neutral-300 uppercase text-[10px] tracking-wider">
                    Totales ({filteredArtists.length} artistas)
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-center font-mono text-neutral-300">{globalSummary.totalJobsCount}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-white whitespace-nowrap">
                    {formatMoney(globalSummary.totalBilled)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#FF3366] whitespace-nowrap">
                    {formatMoney(globalSummary.totalCommissions)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                    {formatMoney(globalSummary.totalTips)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300 whitespace-nowrap">
                    {formatMoney(globalSummary.totalStudioKept)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300 whitespace-nowrap">
                    {formatMoney(globalSummary.totalPaidPeriod)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#FF3366] whitespace-nowrap">
                    {formatMoney(globalSummary.totalPending)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-[#24242B] text-[10px] text-neutral-500">
          Las columnas de facturación, comisión, propinas, retención y pagos corresponden a <strong className="text-neutral-300">{periodLabel}</strong>.
          El saldo pendiente es acumulado histórico (ganado − liquidaciones − anticipos). Facturado incluye IVA y propinas.
        </div>
      </div>

      {/* =========================================================================
          HISTORIAL DE LIQUIDACIONES EMITIDAS (HISTORICAL SETTLEMENTS)
          ========================================================================= */}
      {settlements.length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
          <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#FF3366]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Historial de Liquidaciones y Pagos Emitidos
              </h3>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              {settlements.length} pagos registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#24242B] text-neutral-400 font-medium">
                  <th className="py-2.5 px-3 whitespace-nowrap">Fecha de Pago</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Comprobante</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Artista</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Comisión Base</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Propinas</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Deducciones</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Neto Pagado</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Método</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Justificante / Notas</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {settlements.map(st => (
                  <tr key={st.id} className="hover:bg-[#1E1E25] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">
                      {new Date(st.date).toLocaleString('es-EC', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-mono text-neutral-200">{st.receiptNumber || '—'}</div>
                      <span
                        className={`text-[9px] font-bold uppercase ${
                          st.type === 'anticipo' ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {st.type === 'anticipo' ? 'Anticipo' : 'Liquidación'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                      {st.artistName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">
                      {formatMoney(st.commissionEarned)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 whitespace-nowrap">
                      +{formatMoney(st.tipsEarned)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#FF3366] whitespace-nowrap">
                      -{formatMoney(st.deductions)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatMoney(st.amountPaid)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[#121215] border border-[#272730] text-neutral-300">
                        {st.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400 text-[11px] truncate max-w-[220px]">
                      {st.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => openTicketFor(st)}
                        className="p-1.5 rounded-lg border border-[#272730] text-neutral-300 hover:text-white hover:border-[#FF3366]/50 cursor-pointer"
                        title="Ver / reimprimir comprobante para firmas"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: VER VENTAS (FACTURAS) DEL ARTISTA
          ========================================================================= */}
      {viewSalesArtist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-4xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center font-bold text-sm text-[#FF3366]">
                  {viewSalesArtist.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Ventas y Facturas: {viewSalesArtist.name}</span>
                    {viewSalesArtist.nickname && (
                      <span className="text-xs text-[#FF3366]">"{viewSalesArtist.nickname}"</span>
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Período activo: <strong className="text-white">{periodLabel}</strong> • Comisión:{' '}
                    <strong className="text-[#FF3366]">{viewSalesArtist.defaultCommissionRate}%</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewSalesArtist(null)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sales Table Viewport */}
            <div className="overflow-y-auto flex-1 custom-scrollbar rounded-xl border border-[#272730] bg-[#121215]">
              {(() => {
                const artistSales = sales.filter(
                  s => s.artistId === viewSalesArtist.id && s.status !== 'cancelled'
                );
                const salesInPeriod = artistSales.filter(s => isDateInPeriod(s.date, period));

                if (salesInPeriod.length === 0) {
                  return (
                    <div className="py-12 text-center text-neutral-500 text-xs">
                      No se registraron ventas para {viewSalesArtist.name} en el período seleccionado ({periodLabel}).
                    </div>
                  );
                }

                const totalFacturado = salesInPeriod.reduce((acc, s) => acc + s.total, 0);
                const totalComision = salesInPeriod.reduce((acc, s) => acc + s.artistShare, 0);
                const totalPropinas = salesInPeriod.reduce((acc, s) => acc + s.tipAmount, 0);
                const totalEstudio = salesInPeriod.reduce((acc, s) => acc + s.studioShare, 0);

                return (
                  <div>
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#24242B] text-neutral-400 font-medium bg-[#17171C]">
                          <th className="py-3 px-3 whitespace-nowrap">N° Factura / Ticket</th>
                          <th className="py-3 px-3 whitespace-nowrap">Fecha</th>
                          <th className="py-3 px-3 whitespace-nowrap">Cliente</th>
                          <th className="py-3 px-3 whitespace-nowrap">Servicio / Procedimiento</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Total Factura</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">% Aplicado</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Comisión Artista</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Propina</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Estudio</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222228]">
                        {salesInPeriod.map(sale => (
                          <tr key={sale.id} className="hover:bg-[#1A1A22] transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                              {sale.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap text-[11px]">
                              {new Date(sale.date).toLocaleDateString('es-EC', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-semibold text-neutral-200 block">{sale.clientName}</span>
                              {sale.clientDni && (
                                <span className="font-mono text-[10px] text-neutral-500">
                                  {sale.clientDni}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-300 max-w-[200px] truncate">
                              {sale.serviceName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                              {formatMoney(sale.total)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-neutral-400 whitespace-nowrap">
                              {sale.artistCommissionPercent || viewSalesArtist.defaultCommissionRate}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#FF3366] whitespace-nowrap">
                              {formatMoney(sale.artistShare)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-400 whitespace-nowrap">
                              {sale.tipAmount > 0 ? `+${formatMoney(sale.tipAmount)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-neutral-400 whitespace-nowrap">
                              {formatMoney(sale.studioShare)}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {onOpenReceipt && (
                                <button
                                  onClick={() => onOpenReceipt(sale)}
                                  className="px-2.5 py-1 rounded-lg bg-[#252530] hover:bg-[#FF3366] hover:text-white text-neutral-300 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Ver comprobante RIDE o Ticket"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Ticket</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Table Footer Totals */}
                      <tfoot>
                        <tr className="bg-[#17171C] font-bold text-white border-t border-[#2B2B36]">
                          <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-[11px]">
                            Totales del Período ({salesInPeriod.length} ventas):
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-white">
                            {formatMoney(totalFacturado)}
                          </td>
                          <td></td>
                          <td className="py-3 px-3 text-right font-mono text-[#FF3366]">
                            {formatMoney(totalComision)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-400">
                            +{formatMoney(totalPropinas)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-neutral-300">
                            {formatMoney(totalEstudio)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-[#25252E] flex justify-between items-center">
              <span className="text-[11px] text-neutral-400">
                Pulsa en "Ticket" para reimprimir o ver la factura oficial RIDE de cualquier trabajo.
              </span>
              <button
                type="button"
                onClick={() => setViewSalesArtist(null)}
                className="px-5 py-2 rounded-xl bg-[#252530] hover:bg-[#30303E] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: AJUSTAR % DE COMISIÓN DEL ARTISTA
          ========================================================================= */}
      {commissionArtist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#FF3366]/15 text-[#FF3366]">
                  <Percent className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Ajustar % de Comisión
                </h3>
              </div>
              <button
                onClick={() => setCommissionArtist(null)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCommissionRate} className="space-y-4 text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Artista Seleccionado:</span>
                <span className="font-bold text-white text-sm">{commissionArtist.name}</span>
                <span className="text-neutral-500 text-[11px] block">{commissionArtist.role} • {commissionArtist.specialty}</span>
              </div>

              {/* Botones rápidos de porcentajes estándar */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-2 text-[11px]">
                  Porcentajes habituales de comisión:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[50, 60, 65, 70, 80].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setNewCommissionRate(pct)}
                      className={`py-2 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer ${
                        newCommissionRate === pct
                          ? 'bg-[#FF3366] text-white shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                          : 'bg-[#121215] text-neutral-300 hover:text-white border border-[#272730]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Input manual */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5 text-[11px]">
                  Porcentaje Personalizado (0 a 100%):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newCommissionRate}
                    onChange={e => setNewCommissionRate(parseInt(e.target.value, 10) || 0)}
                    onFocus={e => e.target.select()}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono text-base font-bold focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                  <span className="absolute right-4 top-2.5 text-neutral-400 font-mono text-sm">%</span>
                </div>
              </div>

              {/* Simulación visual del reparto */}
              <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#272730] space-y-2">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider block">
                  Simulación de Reparto (por cada $100 facturados):
                </span>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#FF3366] font-bold">
                    Artista: ${newCommissionRate.toFixed(2)} ({newCommissionRate}%)
                  </span>
                  <span className="text-neutral-300 font-bold">
                    Estudio: ${(100 - newCommissionRate).toFixed(2)} ({100 - newCommissionRate}%)
                  </span>
                </div>
                <div className="w-full bg-[#252530] h-2 rounded-full overflow-hidden flex">
                  <div className="bg-[#FF3366] h-full" style={{ width: `${newCommissionRate}%` }}></div>
                  <div className="bg-neutral-600 h-full" style={{ width: `${100 - newCommissionRate}%` }}></div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCommissionArtist(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                >
                  Guardar Porcentaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: LIQUIDAR (PAGAR) COMISIONES
          ========================================================================= */}
      {settleArtist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {settleType === 'anticipo' ? 'Anticipo de Pago (Parcial)' : 'Liquidar Pago de Comisiones'}
                </h3>
              </div>
              <button
                onClick={() => setSettleArtist(null)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-[#121215] border border-[#272730]">
                <span className="text-[10px] text-neutral-400 block">Artista a Liquidar:</span>
                <span className="font-bold text-white text-sm block">{settleArtist.name}</span>
                <span className="text-[10px] text-neutral-400 block">
                  Comisión habitual: {settleArtist.defaultCommissionRate}%
                </span>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-[11px] text-neutral-300">
                    {settleBalance < 0 ? 'Anticipo ya entregado a descontar:' : 'Saldo pendiente actual:'}
                  </span>
                  <span className={`font-mono font-bold ${settleBalance < 0 ? 'text-amber-400' : 'text-[#FF3366]'}`}>
                    {formatMoney(Math.abs(settleBalance))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  {settleType === 'anticipo' ? 'Monto del Anticipo ($ USD) *' : 'Comisión a Liquidar ($ USD) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={settleAmount}
                  onChange={e => {
                    setSettleAmount(parseFloat(e.target.value) || 0);
                    setSettleError(null);
                  }}
                  onFocus={e => e.target.select()}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              {settleType === 'anticipo' && (
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                  El anticipo se descuenta del saldo pendiente del artista.
                  {settleAmount > Math.max(0, settleBalance) && (
                    <> Supera el saldo actual: la diferencia ({formatMoney(settleAmount - Math.max(0, settleBalance))}) se descontará de comisiones futuras.</>
                  )}
                </p>
              )}

              {settleType === 'liquidacion' && (
              <>
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Propinas a Entregar ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settleTips}
                  onChange={e => {
                    setSettleTips(parseFloat(e.target.value) || 0);
                    setSettleError(null);
                  }}
                  onFocus={e => e.target.select()}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-emerald-400 font-mono focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Deducciones (Insumos propios o préstamos) ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settleDeductions}
                  onChange={e => {
                    setSettleDeductions(parseFloat(e.target.value) || 0);
                    setSettleError(null);
                  }}
                  onFocus={e => e.target.select()}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-[#FF3366] font-mono focus:border-[#FF3366]/60 transition-colors"
                />
              </div>
              </>
              )}

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Forma de Pago del Estudio
                </label>
                <select
                  value={settleMethod}
                  onChange={e => setSettleMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 cursor-pointer"
                >
                  <option value="transfer">Transferencia Bancaria / Pago Digital</option>
                  <option value="cash">Efectivo de Caja Chica / Arqueo</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Notas / Justificante del Pago
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              {/* Total neto */}
              <div className="p-3.5 rounded-2xl bg-[#121215] border border-emerald-500/40 flex justify-between items-center text-sm">
                <span className="font-semibold text-neutral-300">Neto a Transferir / Pagar:</span>
                <span className="font-mono font-bold text-emerald-400 text-lg">
                  {formatMoney(
                    settleType === 'anticipo'
                      ? Math.max(0, settleAmount)
                      : Math.max(0, settleAmount + settleTips - settleDeductions)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-neutral-400 px-1">
                <span>Saldo después del pago:</span>
                {(() => {
                  const after =
                    settleBalance - (settleAmount + (settleType === 'anticipo' ? 0 : settleTips));
                  return (
                    <span className={`font-mono ${after < 0 ? 'text-amber-400' : 'text-neutral-200'}`}>
                      {after < 0 ? `Anticipo a descontar ${formatMoney(-after)}` : formatMoney(after)}
                    </span>
                  );
                })()}
              </div>

              {settleError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-[11px]">
                  {settleError}
                </div>
              )}

              <div className="pt-3 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSettleArtist(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  Registrar e Imprimir Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: AÑADIR / EDITAR ARTISTA
          ========================================================================= */}
      {isNewArtistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {editingArtist ? 'Editar Datos del Artista' : 'Registrar Nuevo Artista o Guest'}
              </h3>
              <button
                onClick={() => setIsNewArtistModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveArtist} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Méndez"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Apodo / Firma</label>
                  <input
                    type="text"
                    placeholder="Ej. Rob Ink"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Rol</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 cursor-pointer"
                  >
                    <option value="Tatuador">Tatuador Residente</option>
                    <option value="Tatuadora">Tatuadora Residente</option>
                    <option value="Piercer">Piercer / Anillador</option>
                    <option value="Invitado / Guest">Artista Guest</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Especialidad</label>
                <input
                  type="text"
                  placeholder="Ej. Realismo sombras, Tradicional, Fine line, Piercing aséptico"
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">% Comisión Inicial</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={defaultCommissionRate}
                    onChange={e => setDefaultCommissionRate(parseInt(e.target.value, 10) || 0)}
                    onFocus={e => e.target.select()}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+593 99 000 0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Cédula / Pasaporte</label>
                <input
                  type="text"
                  placeholder="1712345678"
                  value={dni}
                  onChange={e => setDni(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="artista@devolutionink.ec"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewArtistModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                >
                  {editingArtist ? 'Guardar Cambios' : 'Registrar Artista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: COMPROBANTE DE PAGO PARA FIRMAS */}
      <ArtistPaymentTicketModal
        settlement={ticketSettlement}
        artist={ticketArtist}
        justCreated={ticketJustCreated}
        onClose={() => {
          setTicketSettlement(null);
          setTicketArtist(null);
          setTicketJustCreated(false);
        }}
      />
    </div>
  );
};
