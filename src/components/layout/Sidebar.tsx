import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  UserCheck,
  Calendar,
  ReceiptText,
  WalletCards,
  Users,
  BadgeDollarSign,
  Boxes,
  BookOpen,
  FileSpreadsheet,
  SlidersHorizontal,
  AlertTriangle,
  FileText,
  Layers,
  X,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { activeTab, setActiveTab, currentShift, inventory, appointments, proformas, settings, formatMoney } = useStudio();

  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockAlert).length;
  const pendingProformasCount = proformas.filter(p => p.status === 'pending').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayUpcomingAppointmentsCount = appointments.filter(
    a => a.date === todayStr && (a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress')
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Tablero General', icon: LayoutDashboard },
    { id: 'pos', label: 'Terminal POS / Cobro', icon: CreditCard },
    { id: 'clients', label: 'Historial Clientes', icon: UserCheck },
    { id: 'appointments', label: 'Agenda de Citas', icon: Calendar },
    { id: 'proformas', label: 'Cotizaciones & Proformas', icon: FileText },
    { id: 'sales', label: 'Ventas & Servicios', icon: ReceiptText },
    { id: 'expenses', label: 'Gastos & Compras', icon: WalletCards },
    { id: 'artists', label: 'Liquidación Artistas', icon: Users },
    { id: 'cash', label: 'Arqueo de Caja', icon: BadgeDollarSign },
    { id: 'inventory', label: 'Inventario & Joyería', icon: Boxes },
    { id: 'kardex', label: 'Kardex de Insumos', icon: Layers },
    { id: 'ledger', label: 'Libro Mayor Contable', icon: BookOpen },
    { id: 'reports', label: 'Centro de Reportes', icon: FileSpreadsheet },
    { id: 'settings', label: 'Configuración', icon: SlidersHorizontal },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 xl:w-68 shrink-0 bg-[#141417] border-r border-[#24242A] flex flex-col justify-between select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Header */}
          <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-[#24242A]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.2)]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
                  <path d="M15 13 9 7l4-4 6 6-4 4Z" />
                  <path d="m18 10 2 2" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  Devolution Ink
                </span>
                <span className="text-[11px] text-[#FF3366] font-medium truncate">
                  Tattoo Studio · Quicentro
                </span>
              </div>
            </div>

            {/* Close button on mobile/tablet */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1E1E24] transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation list (scrollable on short viewports) */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all outline-none focus:outline-none focus-visible:outline-none focus:ring-0 active:outline-none select-none cursor-pointer ${
                    isActive
                      ? 'bg-[#FF3366]/15 text-[#FF3366] font-semibold border border-[#FF3366]/30 shadow-[0_0_10px_rgba(255,51,102,0.1)]'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1C1C22] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF3366]' : 'text-neutral-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.id === 'pos' && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#FF3366] bg-[#FF3366]/15 border border-[#FF3366]/30 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                      POS
                    </span>
                  )}
                  {item.id === 'appointments' && todayUpcomingAppointmentsCount > 0 && (
                    <span className="text-[10px] font-mono text-white bg-[#FF3366] px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)] shrink-0">
                      {todayUpcomingAppointmentsCount}
                    </span>
                  )}
                  {item.id === 'proformas' && pendingProformasCount > 0 && (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">
                      {pendingProformasCount}
                    </span>
                  )}
                  {item.id === 'inventory' && lowStockCount > 0 && (
                    <span className="text-[10px] font-mono text-white bg-[#FF3366] px-2 py-0.5 rounded-full font-bold shrink-0">
                      {lowStockCount}
                    </span>
                  )}
                  {item.id === 'cash' && currentShift.status === 'open' && (
                    <span className="w-2 h-2 rounded-full bg-[#FF3366] shadow-[0_0_6px_#FF3366] shrink-0"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Drawer Status & Quick Info */}
        <div className="p-4 shrink-0 border-t border-[#24242A] space-y-3">
          <div className="p-3.5 rounded-xl bg-[#101013] border border-[#26262D] text-xs">
            <div className="flex items-center justify-between text-neutral-400 mb-1.5">
              <span className="text-[11px]">Caja del Día</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                currentShift.status === 'open'
                  ? 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                  : 'bg-neutral-800 text-neutral-400'
              }`}>
                {currentShift.status === 'open' ? 'Turno Abierto' : 'Cerrado'}
              </span>
            </div>
            <div className="font-mono tabular-nums text-sm font-bold text-white">
              {formatMoney(currentShift.expectedCash)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1.5 flex items-center justify-between pt-1.5 border-t border-[#202026]">
              <span>En Efectivo:</span>
              <span className="font-mono tabular-nums text-neutral-200">
                {formatMoney(currentShift.cashSalesTotal)}
              </span>
            </div>
          </div>

          {lowStockCount > 0 && (
            <button
              onClick={() => handleSelectTab('inventory')}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-[#26151B] border border-[#FF3366]/30 text-[#FF4D79] text-[11px] hover:bg-[#331823] transition-colors text-left"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />
              <span className="truncate">{lowStockCount} insumo(s) con stock bajo</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
