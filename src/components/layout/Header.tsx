import React, { useState } from 'react';
import {
  PlusCircle,
  ArrowDownRight,
  Sun,
  Moon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { DateFilterRange } from '../../types';

interface HeaderProps {
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewSale,
  onOpenNewExpense,
  onToggleSidebar,
}) => {
  const { activeTab, dateFilter, setDateFilter, theme, toggleTheme } = useStudio();
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Tablero General & KPIs';
      case 'pos':
        return 'Terminal Punto de Venta (POS)';
      case 'clients':
        return 'Historial & Expediente de Clientes';
      case 'appointments':
        return 'Agenda & Agendamiento de Citas';
      case 'proformas':
        return 'Cotizaciones & Proformas Oficiales';
      case 'sales':
        return 'Libro Diario de Ventas';
      case 'expenses':
        return 'Gastos & Compras';
      case 'artists':
        return 'Liquidación de Artistas';
      case 'cash':
        return 'Arqueo de Caja';
      case 'inventory':
        return 'Inventario & Joyería';
      case 'kardex':
        return 'Kardex Valorizado de Insumos';
      case 'ledger':
        return 'Libro Mayor & Plan Contable';
      case 'reports':
        return 'Centro de Reportes Financieros';
      case 'settings':
        return 'Ajustes del Estudio';
      default:
        return 'Contabilidad';
    }
  };

  const filterTabs: { id: DateFilterRange; label: string }[] = [
    { id: 'today', label: 'Hoy' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Año' },
    { id: 'all', label: 'Todo el Histórico' },
  ];

  const showFilterTabs = [
    'dashboard',
    'clients',
    'appointments',
    'sales',
    'expenses',
    'artists',
    'kardex',
    'ledger',
    'reports',
  ].includes(activeTab);

  return (
    <header className="bg-[#141417] border-b border-[#24242A] shrink-0 relative z-30">
      {/* Main Row */}
      <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Hamburger Menu (mobile/tablet) + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl bg-[#1A1A20] border border-[#2D2D36] text-neutral-300 hover:text-white hover:border-[#FF3366]/50 transition-colors shrink-0"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-4 h-4 text-[#FF3366]" />
            </button>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
            <span className="hidden sm:inline text-neutral-500 hover:text-neutral-400 transition-colors shrink-0">
              Estudio
            </span>
            <span className="hidden sm:inline text-neutral-600 font-mono shrink-0">&gt;</span>
            <span className="font-semibold text-white truncate">{getBreadcrumb()}</span>
          </div>
        </div>

        {/* Zone 2: Category Tabs with pink bottom underline indicator (Desktop XL+) */}
        {showFilterTabs && (
          <div className="hidden xl:flex items-center gap-5 2xl:gap-6 text-xs shrink-0">
            {filterTabs.map(tab => {
              const isActive = dateFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDateFilter(tab.id)}
                  className={`pb-1 transition-all whitespace-nowrap relative ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-[-18px] left-0 right-0 h-[2.5px] bg-[#FF3366] rounded-full shadow-[0_0_8px_#FF3366]"></span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Zone 3: Actions matching reference rounded pill buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Calendar widget button */}
          <button
            onClick={() => setShowCalendarModal(!showCalendarModal)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#1A1A20] border border-[#2D2D36] hover:border-[#FF3366]/50 text-neutral-300 text-xs font-mono transition-colors"
            title="Ver calendario y fechas"
          >
            <Calendar className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />
            <span className="hidden md:inline">Filtro Fecha</span>
          </button>

          {/* Secondary Button: Outline button with pink stroke */}
          <button
            onClick={onOpenNewExpense}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-full border border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366]/10 text-xs font-semibold transition-all whitespace-nowrap"
            title="Registrar factura o gasto operativo"
          >
            <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Nuevo Gasto</span>
          </button>

          {/* Primary Button: Navigates to exclusive POS section */}
          <button
            onClick={onOpenNewSale}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-white text-xs font-bold transition-all whitespace-nowrap outline-none focus:outline-none focus-visible:outline-none ${
              activeTab === 'pos'
                ? 'bg-[#E62557] ring-2 ring-[#FF3366]/50 shadow-[0_0_20px_rgba(255,51,102,0.5)]'
                : 'bg-[#FF3366] hover:bg-[#E62557] shadow-[0_0_16px_rgba(255,51,102,0.35)]'
            }`}
            title="Ir a la sección exclusiva de Terminal POS"
          >
            <PlusCircle className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="hidden xs:inline sm:inline">Terminal POS</span>
            <span className="hidden md:inline">/ Cobrar</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema claro u oscuro"
            className="p-2 rounded-full border border-[#26262D] text-neutral-400 hover:text-white hover:bg-[#1E1E24] transition-colors shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#FF3366]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-neutral-300" />
            )}
          </button>
        </div>
      </div>

      {/* Sub-row: Scrollable Date Filter Strip on Mobile / Tablet / Laptop (< xl) */}
      {showFilterTabs && (
        <div className="xl:hidden px-3 sm:px-6 py-2 border-t border-[#1E1E24] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {filterTabs.map(tab => {
            const isActive = dateFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                    : 'bg-[#1A1A20] text-neutral-400 hover:text-white border border-[#26262F]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar Popover */}
      {showCalendarModal && (
        <div className="absolute right-3 sm:right-6 top-14 sm:top-16 z-50 mt-2 p-4 bg-[#17171C] border border-[#2B2B34] rounded-2xl shadow-2xl w-72 max-w-[calc(100vw-1.5rem)] text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#25252E] mb-3">
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#FF3366]" />
              <span>Octubre 2026</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-400">
              <button className="p-1 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
              <button onClick={() => setShowCalendarModal(false)} className="p-1 hover:text-white ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-neutral-500 mb-2">
            <span>D</span><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map(d => {
              const isSelected = d === 10 || d === 14 || d === 29;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setDateFilter('month');
                    setShowCalendarModal(false);
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_#FF3366]'
                      : 'text-neutral-300 hover:bg-[#25252E] hover:text-white'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-[#25252E] flex justify-between text-[11px]">
            <button
              onClick={() => {
                setDateFilter('today');
                setShowCalendarModal(false);
              }}
              className="text-[#FF3366] hover:underline"
            >
              Filtrar Hoy
            </button>
            <button
              onClick={() => {
                setDateFilter('all');
                setShowCalendarModal(false);
              }}
              className="text-neutral-400 hover:text-white"
            >
              Ver Todo
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
