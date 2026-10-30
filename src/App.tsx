import React, { useState } from 'react';
import { StudioProvider, useStudio } from './context/StudioContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { SalesView } from './components/sales/SalesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ArtistsView } from './components/artists/ArtistsView';
import { CashRegisterView } from './components/cash/CashRegisterView';
import { InventoryView } from './components/inventory/InventoryView';
import { ReportsView } from './components/reports/ReportsView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { SettingsView } from './components/settings/SettingsView';
import { NewSaleModal } from './components/sales/NewSaleModal';
import { NewExpenseModal } from './components/expenses/NewExpenseModal';
import { ReceiptModal } from './components/sales/ReceiptModal';
import { SaleRecord } from './types';

const MainLayout: React.FC = () => {
  const { activeTab } = useStudio();

  // Global modals
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<SaleRecord | null>(null);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setIsSaleModalOpen(true)}
            onOpenNewExpense={() => setIsExpenseModalOpen(true)}
          />
        );
      case 'appointments':
        return <AppointmentsView onOpenReceipt={sale => setReceiptSale(sale)} />;
      case 'sales':
        return (
          <SalesView
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setIsSaleModalOpen(true)}
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
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <DashboardView
            onOpenReceipt={sale => setReceiptSale(sale)}
            onOpenNewSale={() => setIsSaleModalOpen(true)}
            onOpenNewExpense={() => setIsExpenseModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenNewSale={() => setIsSaleModalOpen(true)}
          onOpenNewExpense={() => setIsExpenseModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {renderActiveTab()}
        </main>
      </div>

      {/* Modals */}
      <NewSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSaleCreated={sale => {
          setReceiptSale(sale);
        }}
      />

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
