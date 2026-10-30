import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  ReceiptText,
  WalletCards,
  Users,
  BadgeDollarSign,
  Boxes,
  FileSpreadsheet,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentShift, inventory, appointments, settings, formatMoney } = useStudio();

  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockAlert).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayUpcomingAppointmentsCount = appointments.filter(
    a => a.date === todayStr && (a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress')
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Tablero General', icon: LayoutDashboard },
    { id: 'appointments', label: 'Agenda de Citas', icon: Calendar },
    { id: 'sales', label: 'Ventas & Servicios', icon: ReceiptText },
    { id: 'expenses', label: 'Gastos & Compras', icon: WalletCards },
    { id: 'artists', label: 'Liquidación Artistas', icon: Users },
    { id: 'cash', label: 'Arqueo de Caja', icon: BadgeDollarSign },
    { id: 'inventory', label: 'Inventario & Joyería', icon: Boxes },
    { id: 'reports', label: 'Centro de Reportes', icon: FileSpreadsheet },
    { id: 'settings', label: 'Configuración', icon: SlidersHorizontal },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#141417] border-r border-[#24242A] flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#24242A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.2)]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
                <path d="M15 13 9 7l4-4 6 6-4 4Z" />
                <path d="m18 10 2 2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white whitespace-nowrap">
                InkLedger Studio
              </span>
              <span className="text-[11px] text-neutral-400 truncate max-w-[145px]">
                {settings.studioName}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#FF3366]/15 text-[#FF3366] font-semibold border border-[#FF3366]/30 shadow-[0_0_10px_rgba(255,51,102,0.1)]'
                    : 'text-neutral-400 hover:text-white hover:bg-[#1C1C22]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF3366]' : 'text-neutral-500'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                {item.id === 'appointments' && todayUpcomingAppointmentsCount > 0 && (
                  <span className="text-[10px] font-mono text-white bg-[#FF3366] px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]">
                    {todayUpcomingAppointmentsCount}
                  </span>
                )}
                {item.id === 'inventory' && lowStockCount > 0 && (
                  <span className="text-[10px] font-mono text-white bg-[#FF3366] px-2 py-0.5 rounded-full font-bold">
                    {lowStockCount}
                  </span>
                )}
                {item.id === 'cash' && currentShift.status === 'open' && (
                  <span className="w-2 h-2 rounded-full bg-[#FF3366] shadow-[0_0_6px_#FF3366]"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Drawer Status & Quick Info */}
      <div className="p-4 border-t border-[#24242A] space-y-3">
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
            onClick={() => setActiveTab('inventory')}
            className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-[#26151B] border border-[#FF3366]/30 text-[#FF4D79] text-[11px] hover:bg-[#331823] transition-colors text-left"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />
            <span className="truncate">{lowStockCount} insumo(s) con stock bajo</span>
          </button>
        )}
      </div>
    </aside>
  );
};
