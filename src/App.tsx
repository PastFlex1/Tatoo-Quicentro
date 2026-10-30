import React, { useState, useEffect } from 'react';
import { StudioProvider, useStudio } from './context/StudioContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosView } from './components/pos/PosView';
import { ClientsView } from './components/clients/ClientsView';
import { SalesView } from './components/sales/SalesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ArtistsView } from './components/artists/ArtistsView';
import { CashRegisterView } from './components/cash/CashRegisterView';
import { InventoryView } from './components/inventory/InventoryView';
import { LedgerKardexView } from './components/ledger/LedgerKardexView';
import { ReportsView } from './components/reports/ReportsView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { SettingsView } from './components/settings/SettingsView';
import { NewExpenseModal } from './components/expenses/NewExpenseModal';
import { ReceiptModal } from './components/sales/ReceiptModal';
import { SaleRecord } from './types';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useStudio();

  // Global modals & responsive sidebar state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<SaleRecord | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Close mobile sidebar when activeTab changes or window resizes to desktop
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderActiveTab = () => {
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
      case 'appointments':
        return <AppointmentsView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'sales':
        return (
          <SalesView
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setActiveTab('pos')}
          />
        );
      case 'expenses':
        return <ExpensesView onOpenNewExpense={() => setIsExpenseModalOpen(true)} />;
      case 'artists':
        return <ArtistsView />;
      case 'cash':
        return <CashRegisterView />;
      case 'inventory':
        return <InventoryView />;
      case 'ledger':
        return <LedgerKardexView />;
      case 'reports':
        return <ReportsView />;
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
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenNewSale={() => setActiveTab('pos')}
          onOpenNewExpense={() => setIsExpenseModalOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden">
          {renderActiveTab()}
        </main>
      </div>

      {/* Modals */}
      <NewExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <ReceiptModal
        sale={receiptSale}
        onClose={() => setReceiptSale(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <StudioProvider>
      <MainLayout />
    </StudioProvider>
  );
}
