import React, { useState, useEffect } from 'react';
import { StudioProvider, useStudio } from './context/StudioContext';
import { AlertModalProvider } from './context/AlertModalContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosView } from './components/pos/PosView';
import { ClientsView } from './components/clients/ClientsView';
import { GalleryView } from './components/gallery/GalleryView';
import { SalesView } from './components/sales/SalesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { PurchaseOrdersView } from './components/purchase-orders/PurchaseOrdersView';
import { ArtistsView } from './components/artists/ArtistsView';
import { CashRegisterView } from './components/cash/CashRegisterView';
import { InventoryView } from './components/inventory/InventoryView';
import { KardexView } from './components/kardex/KardexView';
import { ServicesView } from './components/services/ServicesView';
import { GeneralLedgerView } from './components/ledger/GeneralLedgerView';
import { ReportsView } from './components/reports/ReportsView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { ProformasView } from './components/proformas/ProformasView';
import { SettingsView } from './components/settings/SettingsView';
import { UsersView } from './components/users/UsersView';
import { NewExpenseModal } from './components/expenses/NewExpenseModal';
import { ReceiptModal } from './components/sales/ReceiptModal';
import { SalesNotePrintModal } from './components/sales/SalesNotePrintModal';
import { SaleRecord } from './types';
import { ShieldAlert } from 'lucide-react';
import { POS_TERMINAL_QUERY, useMediaQuery } from './hooks/useMediaQuery';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, canAccessTab, currentRole } = useStudio();

  // Global modals & responsive sidebar state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<SaleRecord | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // En pantallas de 1366 px o menos el menú lateral es un cajón en TODAS las secciones: se abre con
  // el botón ☰ y se cierra solo al elegir una sección, así el contenido usa todo el ancho.
  const drawerSidebar = useMediaQuery(POS_TERMINAL_QUERY);

  // Close mobile sidebar when activeTab changes or window resizes to desktop
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1366) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderActiveTab = () => {
    if (!canAccessTab(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-bold text-white">Módulo de Acceso Restringido</h3>
            <p className="text-xs text-neutral-400">
              El usuario conectado <strong>@{currentUser?.username}</strong> con rol <strong>{currentRole?.name || currentUser?.rol}</strong> no cuenta con los permisos necesarios para acceder al módulo <code className="text-[#FF3366] font-mono">{activeTab}</code>.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,51,102,0.3)] cursor-pointer"
          >
            Volver a Mi Tablero
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setActiveTab('pos')}
            onOpenNewExpense={() => setIsExpenseModalOpen(true)}
          />
        );
      case 'pos':
        return <PosView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'clients':
        return <ClientsView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'gallery':
        return <GalleryView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'appointments':
        return <AppointmentsView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'proformas':
        return <ProformasView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'sales':
        return (
          <SalesView
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setActiveTab('pos')}
          />
        );
      case 'credit-notes':
        return (
          <SalesView
            key="credit-notes"
            initialSubTab="credit_notes"
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setActiveTab('pos')}
          />
        );
      case 'expenses':
        return <ExpensesView onOpenNewExpense={() => setIsExpenseModalOpen(true)} />;
      case 'suppliers':
        return <SuppliersView onOpenNewExpense={() => setIsExpenseModalOpen(true)} />;
      case 'purchase-orders':
        return <PurchaseOrdersView />;
      case 'artists':
        return <ArtistsView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'cash':
        return <CashRegisterView />;
      case 'inventory':
        return <InventoryView />;
      case 'services':
        return <ServicesView />;
      case 'kardex':
        return <KardexView />;
      case 'ledger':
        return <GeneralLedgerView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <DashboardView
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setActiveTab('pos')}
            onOpenNewExpense={() => setIsExpenseModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Sidebar Navigation (Docked on desktop, slide-over drawer on mobile/tablet) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        forceDrawer={drawerSidebar}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenNewSale={() => setActiveTab('pos')}
          onOpenNewExpense={() => setIsExpenseModalOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          forceMenuButton={drawerSidebar}
        />

        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden outline-none focus:outline-none">
          {renderActiveTab()}
        </main>
      </div>

      {/* Modals */}
      <NewExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      {receiptSale && (
        receiptSale.documentType === 'nota_venta' ? (
          <SalesNotePrintModal
            sale={receiptSale}
            onClose={() => setReceiptSale(null)}
          />
        ) : (
          <ReceiptModal
            sale={receiptSale}
            onClose={() => setReceiptSale(null)}
          />
        )
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StudioProvider>
        <AlertModalProvider>
          <MainLayout />
        </AlertModalProvider>
      </StudioProvider>
    </ErrorBoundary>
  );
}
