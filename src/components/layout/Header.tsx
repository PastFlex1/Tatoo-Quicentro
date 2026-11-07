import React, { useMemo, useState } from 'react';
import {
  PlusCircle,
  ArrowDownRight,
  Sun,
  Moon,
  Calendar,
  X,
  Menu,
  User,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { DateFilterRange } from '../../types';
import { LogoutModal } from '../users/LogoutModal';
import { CalendarPanel, todayKey } from '../common/DatePicker';

interface HeaderProps {
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
  onToggleSidebar?: () => void;
  /** Muestra el botón ☰ también en escritorio (POS a pantalla completa) */
  forceMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewSale,
  onOpenNewExpense,
  onToggleSidebar,
  forceMenuButton = false,
}) => {
  const { activeTab, setActiveTab, dateFilter, setDateFilter, theme, toggleTheme, currentUser, currentRole, appointments } = useStudio();
  const appointmentDays = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.filter(a => a.status !== 'cancelled').forEach(a => (map[a.date] = (map[a.date] || 0) + 1));
    return map;
  }, [appointments]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Tablero General & KPIs';
      case 'pos':
        return 'Terminal Punto de Venta (POS)';
      case 'clients':
        return 'Historial & Expediente de Clientes';
      case 'gallery':
        return 'Galería de Fotos & Portafolio Artístico';
      case 'appointments':
        return 'Agenda & Agendamiento de Citas';
      case 'proformas':
        return 'Cotizaciones & Proformas Oficiales';
      case 'sales':
        return 'Libro Diario de Ventas';
      case 'credit-notes':
        return 'Notas de Crédito (Tipo 04)';
      case 'expenses':
        return 'Gastos & Compras';
      case 'suppliers':
        return 'Gestión de Proveedores & Distribuidores';
      case 'purchase-orders':
        return 'Órdenes de Compra & Adquisiciones';
      case 'artists':
        return 'Liquidación de Artistas';
      case 'cash':
        return 'Arqueo de Caja';
      case 'inventory':
        return 'Inventario & Joyería';
      case 'received-docs':
        return 'Comprobantes Recibidos SRI';
      case 'services':
        return 'Catálogo de Servicios';
      case 'kardex':
        return 'Kardex Valorizado de Insumos';
      case 'ledger':
        return 'Asientos Contables & Libro Diario';
      case 'reports':
        return 'Centro de Reportes Financieros';
      case 'users':
        return 'Gestión de Usuarios, Roles & Permisos';
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
              className={`${forceMenuButton ? '' : 'lg:hidden'} p-2 rounded-xl bg-[#1A1A20] border border-[#2D2D36] text-neutral-300 hover:text-white hover:border-[#FF3366]/50 transition-colors shrink-0`}
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

          {/* Active User Switcher Pill */}
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[#1A1A20] border border-[#2D2D36] hover:border-[#FF3366]/50 transition-all cursor-pointer shrink-0"
            title={`Usuario conectado: ${currentUser?.nombres} (@${currentUser?.username})`}
          >
            <div className="w-6 h-6 rounded-full bg-[#FF3366] text-white flex items-center justify-center font-bold text-[10px]">
              {currentUser?.nombres?.slice(0, 1) || 'U'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-[11px] font-bold text-white leading-tight">
                {currentUser?.nombres?.split(' ')[0] || 'Usuario'}
              </span>
              <span className="text-[9px] text-[#FF3366] font-mono leading-tight">
                {currentRole?.name || currentUser?.rol || 'Sin rol'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* User Switcher Modal */}
      <LogoutModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
      />

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

      {/* Mini calendario (mismo diseño que todos los calendarios del sistema) */}
      {showCalendarModal && (
        <div className="absolute right-3 sm:right-6 top-14 sm:top-16 z-50 mt-2 p-3 bg-[#17171C] border border-[#2E2E38] rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.6)] w-72 max-w-[calc(100vw-1.5rem)] text-xs">
          <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-[#FF3366] to-transparent" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#FF3366]" />
              <span>Calendario</span>
            </div>
            <button onClick={() => setShowCalendarModal(false)} className="p-1 text-neutral-400 hover:text-white cursor-pointer" aria-label="Cerrar">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <CalendarPanel
            value={todayKey()}
            markedDays={appointmentDays}
            onSelect={() => {
              setActiveTab('appointments');
              setShowCalendarModal(false);
            }}
            footer={
              <div className="flex justify-between text-[11px]">
                <button
                  onClick={() => {
                    setDateFilter('today');
                    setShowCalendarModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FF3366]/15 text-[#FF3366] font-bold hover:bg-[#FF3366]/25 cursor-pointer"
                >
                  Filtrar hoy
                </button>
                <button
                  onClick={() => {
                    setDateFilter('all');
                    setShowCalendarModal(false);
                  }}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  Ver todo
                </button>
              </div>
            }
          />
          <p className="mt-2 text-[10px] text-neutral-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3366]" /> Días con citas · toque un día para abrir la agenda
          </p>
        </div>
      )}
    </header>
  );
};
