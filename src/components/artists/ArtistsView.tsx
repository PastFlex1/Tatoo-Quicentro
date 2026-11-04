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
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Artist, SaleRecord } from '../../types';

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
  const [newCommissionRate, setNewCommissionRate] = useState<number>(60);

  // Modal 3: Liquidar (Pagar)
  const [settleArtist, setSettleArtist] = useState<Artist | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleTips, setSettleTips] = useState<number>(0);
  const [settleDeductions, setSettleDeductions] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'transfer'>('transfer');
  const [settleNotes, setSettleNotes] = useState('');

  // Add/Edit Artist form state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'Tatuador' | 'Tatuadora' | 'Piercer' | 'Residente' | 'Invitado / Guest'>('Tatuador');
  const [specialty, setSpecialty] = useState('');
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(60);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

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

      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 7);
      sun.setHours(23, 59, 59, 999);

      return d >= mon && d <= sun;
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

      // Total historical pending balance (so artist never loses unpaid backlog)
      const allEarned = allSales.reduce((acc, s) => acc + s.artistShare + s.tipAmount, 0);
      const allPaid = allSettlements.reduce((acc, st) => acc + st.amountPaid, 0);
      const totalPendingAccumulated = Math.max(0, allEarned - allPaid);

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
    const totalJobsCount = filteredArtists.reduce((acc, a) => acc + a.salesCount, 0);

    return {
      totalBilled,
      totalCommissions,
      totalTips,
      totalStudioKept,
      totalPending,
      totalJobsCount,
    };
  }, [filteredArtists]);

  // Handler: Open Settlement Modal
  const handleOpenSettle = (art: Artist, amountToSettle: number, tipsToSettle: number) => {
    setSettleArtist(art);
    setSettleAmount(amountToSettle);
    setSettleTips(tipsToSettle);
    setSettleDeductions(0);
    setSettleMethod('transfer');
    setSettleNotes(`Liquidación de comisiones (${periodLabel}) para ${art.name}`);
  };

  // Handler: Confirm Settlement
  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleArtist) return;

    settleArtistCommissions(
      settleArtist.id,
      settleAmount,
      settleTips,
      settleDeductions,
      settleMethod,
      settleNotes
    );

    setSettleArtist(null);
  };

  // Handler: Open Commission Adjustment Modal
  const handleOpenCommissionModal = (art: Artist) => {
    setCommissionArtist(art);
    setNewCommissionRate(art.defaultCommissionRate || 60);
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
            Cálculo horizontal de liquidaciones, visualización de facturas, control de porcentajes y pagos periódicos.
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
            <span>Pendiente Total de Pago</span>
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
            {globalSummary.totalPending > 0 ? 'Requiere liquidación' : 'Todos los artistas al día'}
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
          HORIZONTAL ARTIST SETTLEMENT LIST (DISEÑO HORIZONTAL DE NÓMINA)
          ========================================================================= */}
      <div className="space-y-3">
        {filteredArtists.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 bg-[#18181D] rounded-2xl border border-[#272730]">
            No se encontraron artistas con los filtros seleccionados.
          </div>
        ) : (
          filteredArtists.map(item => {
            const {
              artist: art,
              grossBilledPeriod,
              commissionPeriod,
              tipsPeriod,
              studioSharePeriod,
              alreadyPaidPeriod,
              totalPendingAccumulated,
              salesCount,
            } = item;

            const isPending = totalPendingAccumulated > 0;

            return (
              <div
                key={art.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  art.active
                    ? 'bg-[#18181D] border-[#272730] hover:border-[#FF3366]/40'
                    : 'bg-[#141418] border-[#202026] opacity-60'
                }`}
              >
                {/* Horizontal Flex Grid Layout */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  {/* Column 1: Artist Identity & Specialty */}
                  <div className="flex items-center gap-3.5 min-w-[240px] xl:max-w-[280px]">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center font-bold text-sm text-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.15)] shrink-0">
                      {art.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-white truncate">{art.name}</h3>
                        {art.nickname && (
                          <span className="text-[11px] text-[#FF3366] font-medium">"{art.nickname}"</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-white font-semibold shrink-0">{art.role}</span>
                        <span>•</span>
                        <span className="truncate">{art.specialty}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => toggleArtistStatus(art.id)}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold cursor-pointer ${
                            art.active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {art.active ? 'Activo' : 'Inactivo'}
                        </button>
                        <button
                          onClick={() => handleOpenEditArtist(art)}
                          className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          title="Editar ficha del artista"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Commission % & Split Display */}
                  <div className="flex flex-col justify-center min-w-[150px] p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Percent className="w-3 h-3 text-[#FF3366]" />
                        <span>Comisión</span>
                      </span>
                      <button
                        onClick={() => handleOpenCommissionModal(art)}
                        className="text-[10px] text-[#FF3366] hover:underline cursor-pointer font-bold"
                        title="Cambiar % de comisión"
                      >
                        Cambiar %
                      </button>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-base text-white">
                        {art.defaultCommissionRate}%
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        (Casa {100 - art.defaultCommissionRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#252530] h-1.5 rounded-full mt-1.5 overflow-hidden flex">
                      <div
                        className="bg-[#FF3366] h-full"
                        style={{ width: `${art.defaultCommissionRate}%` }}
                      ></div>
                      <div
                        className="bg-neutral-600 h-full"
                        style={{ width: `${100 - art.defaultCommissionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Column 3: Metrics Strip (Facturación, Comisión ganada, Estudio, Pagado) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 text-xs">
                    {/* Facturación */}
                    <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">
                        Facturado ({periodLabel})
                      </span>
                      <span className="font-mono font-bold text-white text-xs block">
                        {formatMoney(grossBilledPeriod)}
                      </span>
                      <span className="text-[9px] text-neutral-500 block mt-0.5">
                        {salesCount} factura(s)
                      </span>
                    </div>

                    {/* Comisión Ganada */}
                    <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">
                        Comisión Artista
                      </span>
                      <span className="font-mono font-bold text-[#FF3366] text-xs block">
                        {formatMoney(commissionPeriod)}
                      </span>
                      {tipsPeriod > 0 && (
                        <span className="text-[9px] text-emerald-400 block mt-0.5">
                          +{formatMoney(tipsPeriod)} propinas
                        </span>
                      )}
                    </div>

                    {/* Retención Casa */}
                    <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Retención Casa</span>
                      <span className="font-mono font-bold text-neutral-200 text-xs block">
                        {formatMoney(studioSharePeriod)}
                      </span>
                      <span className="text-[9px] text-neutral-500 block mt-0.5">Estudio</span>
                    </div>

                    {/* Ya Liquidado */}
                    <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Liquidado / Pagado</span>
                      <span className="font-mono font-bold text-neutral-400 text-xs block">
                        {formatMoney(alreadyPaidPeriod)}
                      </span>
                      <span className="text-[9px] text-neutral-500 block mt-0.5">en el período</span>
                    </div>
                  </div>

                  {/* Column 4: Saldo Pendiente */}
                  <div className="min-w-[140px] p-2.5 rounded-xl bg-[#121215] border border-[#272730] flex flex-col justify-center">
                    <span className="text-[10px] text-neutral-400 block">Pendiente de Pago:</span>
                    <span
                      className={`font-mono font-bold text-sm sm:text-base block ${
                        isPending ? 'text-[#FF3366]' : 'text-emerald-400'
                      }`}
                    >
                      {formatMoney(totalPendingAccumulated)}
                    </span>
                    <span className="text-[9px] text-neutral-500 block">
                      {isPending ? 'Saldo acumulado' : 'Al día'}
                    </span>
                  </div>

                  {/* Column 5: Action Buttons (Ver Ventas, % Comisión, Liquidar) */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                    {/* Botón 1: Ver Ventas (Facturas) */}
                    <button
                      onClick={() => setViewSalesArtist(art)}
                      className="px-3.5 py-2 rounded-xl bg-[#121215] hover:bg-[#1C1C24] text-neutral-200 hover:text-white border border-[#272730] hover:border-[#FF3366]/50 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                      title="Ver todas las ventas y facturas realizadas por este artista"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FF3366]" />
                      <span>Ver Ventas</span>
                      <span className="bg-[#252530] px-1.5 py-0.2 rounded text-[10px] font-mono text-neutral-300">
                        {salesCount}
                      </span>
                    </button>

                    {/* Botón 2: % Comisión */}
                    <button
                      onClick={() => handleOpenCommissionModal(art)}
                      className="p-2 rounded-xl bg-[#121215] hover:bg-[#1C1C24] text-neutral-400 hover:text-white border border-[#272730] hover:border-[#FF3366]/50 text-xs transition-all cursor-pointer"
                      title="Ajustar porcentaje de comisión del artista"
                    >
                      <Percent className="w-3.5 h-3.5 text-[#FF3366]" />
                    </button>

                    {/* Botón 3: Liquidar (Pagar) */}
                    <button
                      onClick={() =>
                        handleOpenSettle(
                          art,
                          totalPendingAccumulated > 0 ? totalPendingAccumulated : commissionPeriod,
                          tipsPeriod
                        )
                      }
                      disabled={totalPendingAccumulated <= 0 && commissionPeriod <= 0}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                        totalPendingAccumulated > 0 || commissionPeriod > 0
                          ? 'bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#E62557] hover:to-[#CC1F4B] text-white shadow-[0_0_12px_rgba(255,51,102,0.3)]'
                          : 'bg-[#1E1E26] text-neutral-600 cursor-not-allowed border border-[#272730]'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Liquidar (Pagar)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
                  <th className="py-2.5 px-3 whitespace-nowrap">Artista</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Comisión Base</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Propinas</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Deducciones</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Neto Pagado</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Método</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Justificante / Notas</th>
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
                  Liquidar Pago de Comisiones
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
                <span className="text-[10px] text-[#FF3366] block">
                  Período: {periodLabel} • Comisión habitual: {settleArtist.defaultCommissionRate}%
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Comisión Bruta a Liquidar ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={e => setSettleAmount(parseFloat(e.target.value) || 0)}
                  onFocus={e => e.target.select()}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Propinas a Entregar ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settleTips}
                  onChange={e => setSettleTips(parseFloat(e.target.value) || 0)}
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
                  value={settleDeductions}
                  onChange={e => setSettleDeductions(parseFloat(e.target.value) || 0)}
                  onFocus={e => e.target.select()}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-[#FF3366] font-mono focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

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
                  {formatMoney(Math.max(0, settleAmount + settleTips - settleDeductions))}
                </span>
              </div>

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
                  Confirmar Pago & Registrar
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
    </div>
  );
};
