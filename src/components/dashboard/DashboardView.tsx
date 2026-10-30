import React from 'react';
import {
  AlertCircle,
  Eye,
  Calendar,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SaleRecord } from '../../types';

interface DashboardViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenReceipt,
}) => {
  const {
    filteredSales,
    filteredExpenses,
    artists,
    inventory,
    appointments,
    formatMoney,
    setActiveTab,
  } = useStudio();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayApts = appointments
    .filter(a => a.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Metrics calculation
  const totalIncome = filteredSales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? s.total : 0), 0);

  // Studio share vs Artists share
  const totalArtistCommissions = filteredSales.reduce(
    (acc, s) => acc + (s.status !== 'cancelled' ? s.artistShare : 0),
    0
  );
  const totalStudioGross = filteredSales.reduce(
    (acc, s) => acc + (s.status !== 'cancelled' ? s.studioShare : 0),
    0
  );

  const generalOperatingExpenses = filteredExpenses
    .filter(e => e.category !== 'artist_payout')
    .reduce((acc, e) => acc + e.amount, 0);

  const studioNetProfit = totalStudioGross - generalOperatingExpenses;
  const marginPercentage = totalIncome > 0 ? Math.round((totalStudioGross / totalIncome) * 100) : 0;

  // Breakdown by service category
  const categoryBreakdown = {
    tattoo: filteredSales
      .filter(s => s.serviceCategory === 'tattoo' && s.status !== 'cancelled')
      .reduce((acc, s) => acc + s.total, 0),
    piercing: filteredSales
      .filter(s => s.serviceCategory === 'piercing' && s.status !== 'cancelled')
      .reduce((acc, s) => acc + s.total, 0),
    jewelry: filteredSales
      .filter(s => s.serviceCategory === 'jewelry' && s.status !== 'cancelled')
      .reduce((acc, s) => acc + s.total, 0),
    aftercare: filteredSales
      .filter(s => s.serviceCategory === 'aftercare' && s.status !== 'cancelled')
      .reduce((acc, s) => acc + s.total, 0),
  };

  // Artist performance ranking
  const artistStats = artists.map(art => {
    const artistSales = filteredSales.filter(
      s => s.artistId === art.id && s.status !== 'cancelled'
    );
    const gross = artistSales.reduce((acc, s) => acc + s.total, 0);
    const commission = artistSales.reduce((acc, s) => acc + s.artistShare, 0);
    const studioCut = artistSales.reduce((acc, s) => acc + s.studioShare, 0);
    return {
      artist: art,
      count: artistSales.length,
      gross,
      commission,
      studioCut,
    };
  }).sort((a, b) => b.gross - a.gross);

  const recentSales = filteredSales.slice(0, 6);
  const criticalItems = inventory.filter(i => i.currentStock <= i.minStockAlert);

  // SVG circular gauge math
  const circleRadius = 38;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (marginPercentage / 100) * circleCircumference;

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* KPI Cards Row with circular progress widget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Facturación Total */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2 gap-2">
              <span>Facturación Total</span>
              <span className="text-[10px] font-mono text-[#FF3366] bg-[#FF3366]/10 px-2 py-0.5 rounded-full border border-[#FF3366]/20 shrink-0">
                +{filteredSales.length} ventas
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white truncate">
              {formatMoney(totalIncome)}
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex items-center justify-between">
            <span>Volumen bruto</span>
            <span className="text-white font-mono text-[11px]">100% servicios</span>
          </div>
        </div>

        {/* KPI 2: Retención / Margen con Circular Progress Widget */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-neutral-400 text-xs block mb-1">Margen Estudio</span>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white truncate">
              {formatMoney(totalStudioGross)}
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">Comisión de la casa</span>
          </div>

          {/* Reference circular gauge element */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={circleRadius}
                fill="transparent"
                stroke="#26262F"
                strokeWidth="7"
              />
              <circle
                cx="45"
                cy="45"
                r={circleRadius}
                fill="transparent"
                stroke="#FF3366"
                strokeWidth="7"
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono font-bold text-xs text-white">{marginPercentage}%</span>
              <span className="text-[9px] text-neutral-400">Margen</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Beneficio Neto */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2 gap-2">
              <span>Utilidad Neta</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                {studioNetProfit >= 0 ? 'Superávit' : 'Déficit'}
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-mono tabular-nums truncate ${studioNetProfit >= 0 ? 'text-white' : 'text-[#FF3366]'}`}>
              {formatMoney(studioNetProfit)}
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex items-center justify-between">
            <span>Gastos fijos:</span>
            <span className="text-neutral-200 font-mono">{formatMoney(generalOperatingExpenses)}</span>
          </div>
        </div>

        {/* KPI 4: Comisiones Artistas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2 gap-2">
              <span>Comisiones Artistas</span>
              <span className="text-[10px] font-mono text-[#FF3366] shrink-0">{artists.length} activos</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white truncate">
              {formatMoney(totalArtistCommissions)}
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex items-center justify-between">
            <span>A liquidar</span>
            <button
              onClick={() => setActiveTab('artists')}
              className="text-[#FF3366] font-semibold text-[11px] hover:underline"
            >
              Liquidar →
            </button>
          </div>
        </div>
      </div>

      {/* Today's Appointments & Studio Schedule Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24242B] pb-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] mt-1 sm:mt-0 shrink-0"></span>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex flex-wrap items-center gap-2">
                <span>Citas de Hoy & Turnos en Cabina</span>
                <span className="text-[10px] font-mono text-white bg-[#FF3366] px-2 py-0.5 rounded-full font-bold">
                  {todayApts.length} hoy
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Horarios programados, anticipos pagados y clientes en estudio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('appointments')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF3366]/15 hover:bg-[#FF3366]/25 border border-[#FF3366]/40 text-[#FF3366] text-xs font-semibold transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Ver Agenda Completa →</span>
            </button>
          </div>
        </div>

        {todayApts.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500">
            No hay citas programadas para hoy.
            <button
              onClick={() => setActiveTab('appointments')}
              className="text-[#FF3366] ml-2 font-semibold hover:underline"
            >
              + Agendar cita
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {todayApts.map(apt => (
              <div
                key={apt.id}
                onClick={() => setActiveTab('appointments')}
                className="p-3.5 rounded-xl bg-[#121215] border border-[#26262E] hover:border-[#FF3366]/40 transition-colors cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-mono text-[#FF3366] font-bold bg-[#FF3366]/10 px-2 py-0.5 rounded-md">
                    {apt.startTime} - {apt.endTime}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      apt.status === 'in_progress'
                        ? 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                        : apt.status === 'confirmed'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {apt.status === 'in_progress'
                      ? 'En Cabina'
                      : apt.status === 'confirmed'
                      ? 'Confirmada'
                      : 'Agendada'}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-white text-xs truncate group-hover:text-[#FF3366] transition-colors">
                    {apt.clientName}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">{apt.serviceName}</div>
                </div>

                <div className="pt-2 border-t border-[#23232A] flex items-center justify-between text-[11px] gap-2">
                  <span className="text-neutral-400 truncate">{apt.artistName}</span>
                  <span className="font-mono text-white font-bold shrink-0">{formatMoney(apt.estimatedPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Lines Breakdown with linear pink progress bars & Artist ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Revenue distribution */}
        <div className="xl:col-span-2 p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24242B] pb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Desglose por Línea de Negocio
                </h3>
                <p className="text-[11px] text-neutral-400">Distribución de ventas del estudio</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-[#FF3366]">
                  {formatMoney(totalIncome)}
                </span>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3366]/15 hover:bg-[#FF3366]/25 border border-[#FF3366]/40 text-[#FF3366] text-[11px] font-semibold transition-all shadow-[0_0_8px_rgba(255,51,102,0.15)] cursor-pointer"
                  title="Abrir reportes con gráfica de pastel y gráfica de barras"
                >
                  <span>Ver Gráficas</span>
                  <span className="font-mono">→</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Tatuajes Artísticos', amount: categoryBreakdown.tattoo },
                { label: 'Body Piercing & Perforaciones', amount: categoryBreakdown.piercing },
                { label: 'Joyería Titanio / Oro', amount: categoryBreakdown.jewelry },
                { label: 'Aftercare & Cremas', amount: categoryBreakdown.aftercare },
              ].map(cat => {
                const pct = totalIncome > 0 ? Math.round((cat.amount / totalIncome) * 100) : 0;
                return (
                  <div key={cat.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs gap-2">
                      <span className="text-neutral-300 font-medium truncate">{cat.label}</span>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="font-mono font-bold text-white">{formatMoney(cat.amount)}</span>
                        <span className="font-mono text-neutral-400 text-xs w-9 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[#24242D] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF3366] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,51,102,0.4)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Payment Methods Strips */}
          <div className="pt-4 border-t border-[#24242B] grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-[#121215] border border-[#24242C]">
              <span className="text-[10px] text-neutral-400 block mb-1">Efectivo en Caja</span>
              <span className="font-mono font-bold text-white">
                {formatMoney(filteredSales.reduce((acc, s) => acc + (s.cashPaid || (s.paymentMethod === 'cash' ? s.amountPaidNow : 0)), 0))}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#121215] border border-[#24242C]">
              <span className="text-[10px] text-neutral-400 block mb-1">Tarjeta / Datáfono</span>
              <span className="font-mono font-bold text-white">
                {formatMoney(filteredSales.reduce((acc, s) => acc + (s.cardPaid || (s.paymentMethod === 'card' ? s.amountPaidNow : 0)), 0))}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#121215] border border-[#24242C]">
              <span className="text-[10px] text-neutral-400 block mb-1">Transferencias / Zelle</span>
              <span className="font-mono font-bold text-white">
                {formatMoney(filteredSales.reduce((acc, s) => acc + (s.transferPaid || (s.paymentMethod === 'transfer' ? s.amountPaidNow : 0)), 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Artist Performance & Critical Stock Alerts */}
        <div className="space-y-4 sm:space-y-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex items-center justify-between border-b border-[#24242B] pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Artistas del Estudio
              </h3>
              <button
                onClick={() => setActiveTab('artists')}
                className="text-xs text-[#FF3366] font-semibold hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2.5">
              {artistStats.map(({ artist, count, gross, commission }) => (
                <div
                  key={artist.id}
                  className="p-3 rounded-xl bg-[#121215] border border-[#24242C] flex items-center justify-between text-xs hover:border-[#FF3366]/30 transition-colors gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] font-bold text-xs flex items-center justify-center shrink-0">
                      {artist.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{artist.name}</div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {count} trabajos · {artist.defaultCommissionRate}% comisión
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-white">{formatMoney(gross)}</div>
                    <div className="text-[10px] font-mono text-[#FF3366]">
                      {formatMoney(commission)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Warning Card */}
          {criticalItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#21141A] border border-[#FF3366]/30 text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#FF3366] font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Insumos con Stock Bajo</span>
              </div>
              <div className="space-y-1 text-[11px] text-neutral-300">
                {criticalItems.map(item => (
                  <div key={item.id} className="flex justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <span className="font-mono text-[#FF3366] font-bold shrink-0">
                      {item.currentStock} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24242B] pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Últimos Movimientos
            </h3>
            <p className="text-[11px] text-neutral-400">Facturas y tickets recientes</p>
          </div>
          <button
            onClick={() => setActiveTab('sales')}
            className="text-xs text-[#FF3366] font-semibold hover:underline"
          >
            Libro Diario Completo →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-2.5 px-3 whitespace-nowrap">Factura</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Fecha</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Cliente</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Servicio</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Artista</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Total</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Artista</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Estudio</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {recentSales.map(sale => (
                <tr key={sale.id} className="hover:bg-[#1F1F26] transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[#FF3366] font-semibold whitespace-nowrap">
                    {sale.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap">
                    {new Date(sale.date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{sale.clientName}</td>
                  <td className="py-2.5 px-3 text-neutral-300 truncate max-w-[200px] xl:max-w-[360px]">
                    {sale.serviceName}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-300 whitespace-nowrap">{sale.artistName}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                    {formatMoney(sale.total)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#FF3366] whitespace-nowrap">
                    {formatMoney(sale.artistShare)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-white whitespace-nowrap">
                    {formatMoney(sale.studioShare)}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => onOpenReceipt(sale)}
                      className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#282832] transition-colors"
                      title="Ver e imprimir ticket"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
