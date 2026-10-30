import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Artist,
  ArtistSettlement,
  CashShift,
  DateFilterRange,
  ExpenseRecord,
  InventoryItem,
  SaleRecord,
  StudioSettings,
  Appointment,
  AppointmentStatus,
  PaymentMethod,
} from '../types';
import {
  INITIAL_ARTISTS,
  INITIAL_CASH_SHIFT,
  INITIAL_EXPENSES,
  INITIAL_INVENTORY,
  INITIAL_SALES,
  INITIAL_SETTINGS,
  INITIAL_APPOINTMENTS,
} from '../data/initialData';

interface StudioContextType {
  // Data
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  artists: Artist[];
  settlements: ArtistSettlement[];
  inventory: InventoryItem[];
  appointments: Appointment[];
  currentShift: CashShift;
  pastShifts: CashShift[];
  settings: StudioSettings;
  theme: 'dark' | 'light';
  activeTab: string;
  dateFilter: DateFilterRange;

  // Navigation & Theme
  setActiveTab: (tab: string) => void;
  setDateFilter: (filter: DateFilterRange) => void;
  toggleTheme: () => void;

  // Actions - Appointments (Agendamiento)
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Appointment;
  updateAppointment: (id: string, updated: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  completeAndBillAppointment: (
    appointmentId: string,
    paymentMethod: PaymentMethod,
    tipAmount?: number,
    finalTotal?: number
  ) => SaleRecord;

  // Actions - Sales
  addSale: (sale: Omit<SaleRecord, 'id' | 'invoiceNumber'>) => SaleRecord;
  updateSale: (id: string, updated: Partial<SaleRecord>) => void;
  deleteSale: (id: string) => void;

  // Actions - Expenses
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => ExpenseRecord;
  deleteExpense: (id: string) => void;

  // Actions - Artists & Settlements
  addArtist: (artist: Omit<Artist, 'id'>) => void;
  updateArtist: (id: string, updated: Partial<Artist>) => void;
  toggleArtistStatus: (id: string) => void;
  settleArtistCommissions: (
    artistId: string,
    amount: number,
    tips: number,
    deductions: number,
    paymentMethod: 'cash' | 'transfer',
    notes?: string
  ) => void;

  // Actions - Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, updated: Partial<InventoryItem>) => void;
  adjustStock: (id: string, delta: number) => void;
  deleteInventoryItem: (id: string) => void;

  // Actions - Cash Shift
  openCashShift: (openingCash: number, openedBy: string, notes?: string) => void;
  closeCashShift: (actualCounted: number, closedBy: string, notes?: string) => void;

  // Settings & Utilities
  updateSettings: (newSettings: Partial<StudioSettings>) => void;
  formatMoney: (amount: number | undefined | null) => string;
  resetToDemo: () => void;
  clearAllData: () => void;
  exportBackup: () => void;
  importBackup: (jsonString: string) => boolean;

  // Computed / Filtered
  filteredSales: SaleRecord[];
  filteredExpenses: ExpenseRecord[];
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SALES: 'inkledger_sales_v1',
  EXPENSES: 'inkledger_expenses_v1',
  ARTISTS: 'inkledger_artists_v1',
  SETTLEMENTS: 'inkledger_settlements_v1',
  INVENTORY: 'inkledger_inventory_v1',
  APPOINTMENTS: 'inkledger_appointments_v1',
  CURRENT_SHIFT: 'inkledger_curr_shift_v1',
  PAST_SHIFTS: 'inkledger_past_shifts_v1',
  SETTINGS: 'inkledger_settings_v1',
  THEME: 'inkledger_theme_v1',
};

export const StudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial from localStorage or fall back to defaults
  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [artists, setArtists] = useState<Artist[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ARTISTS);
    return saved ? JSON.parse(saved) : INITIAL_ARTISTS;
  });

  const [settlements, setSettlements] = useState<ArtistSettlement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [currentShift, setCurrentShift] = useState<CashShift>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_SHIFT);
    return saved ? JSON.parse(saved) : INITIAL_CASH_SHIFT;
  });

  const [pastShifts, setPastShifts] = useState<CashShift[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAST_SHIFTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<StudioSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currency === '€' || parsed.currencyCode === 'EUR') {
          parsed.currency = '$';
          parsed.currencyCode = 'USD';
        }
        return parsed;
      } catch {
        return INITIAL_SETTINGS;
      }
    }
    return INITIAL_SETTINGS;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterRange>('all');

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ARTISTS, JSON.stringify(artists));
  }, [artists]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
  }, [settlements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SHIFT, JSON.stringify(currentShift));
  }, [currentShift]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAST_SHIFTS, JSON.stringify(pastShifts));
  }, [pastShifts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Helper date filtering
  const isDateInFilter = (dateStr: string, filter: DateFilterRange): boolean => {
    if (filter === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();

    if (filter === 'today') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }
    if (filter === 'week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo && date <= now;
    }
    if (filter === 'month') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }
    if (filter === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dateQuarter = Math.floor(date.getMonth() / 3);
      return date.getFullYear() === now.getFullYear() && dateQuarter === currentQuarter;
    }
    if (filter === 'year') {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => isDateInFilter(s.date, dateFilter));
  }, [sales, dateFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => isDateInFilter(e.date, dateFilter));
  }, [expenses, dateFilter]);

  // Format currency helper
  const formatMoney = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return `${settings.currency}0.00`;
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = amount < 0 ? '-' : '';
    return `${sign}${settings.currency}${formatted}`;
  };

  // Recalculate Cash Shift live when sales or cash expenses occur today
  useEffect(() => {
    if (currentShift.status !== 'open') return;
    const shiftDate = currentShift.date;

    const todaySales = sales.filter(s => s.date.startsWith(shiftDate));
    const todayExpenses = expenses.filter(e => e.date.startsWith(shiftDate));

    let cashIn = 0;
    let cardIn = 0;
    let transferIn = 0;

    todaySales.forEach(s => {
      if (s.status === 'cancelled') return;
      if (s.paymentMethod === 'cash') {
        cashIn += s.amountPaidNow;
      } else if (s.paymentMethod === 'card') {
        cardIn += s.amountPaidNow;
      } else if (s.paymentMethod === 'transfer') {
        transferIn += s.amountPaidNow;
      } else if (s.paymentMethod === 'split') {
        cashIn += s.cashPaid || 0;
        cardIn += s.cardPaid || 0;
        transferIn += s.transferPaid || 0;
      }
    });

    let cashOut = 0;
    todayExpenses.forEach(e => {
      if (e.paymentMethod === 'cash') {
        cashOut += e.amount;
      }
    });

    const expected = currentShift.openingCash + cashIn - cashOut;

    setCurrentShift(prev => {
      if (
        prev.expectedCash === expected &&
        prev.cashSalesTotal === cashIn &&
        prev.cashExpensesTotal === cashOut &&
        prev.cardTotal === cardIn &&
        prev.transferTotal === transferIn
      ) {
        return prev;
      }
      return {
        ...prev,
        expectedCash: Math.round(expected * 100) / 100,
        cashSalesTotal: Math.round(cashIn * 100) / 100,
        cashExpensesTotal: Math.round(cashOut * 100) / 100,
        cardTotal: Math.round(cardIn * 100) / 100,
        transferTotal: Math.round(transferIn * 100) / 100,
      };
    });
  }, [sales, expenses, currentShift.date, currentShift.status, currentShift.openingCash]);

  // Appointment Operations
  const addAppointment = (aptData: Omit<Appointment, 'id' | 'createdAt'>): Appointment => {
    const newApt: Appointment = {
      ...aptData,
      id: `apt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppointments(prev => [newApt, ...prev]);
    return newApt;
  };

  const updateAppointment = (id: string, updated: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => (a.id === id ? { ...a, ...updated } : a)));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
  };

  const completeAndBillAppointment = (
    appointmentId: string,
    paymentMethod: PaymentMethod,
    tipAmount: number = 0,
    finalTotal?: number
  ): SaleRecord => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) throw new Error('Cita no encontrada');

    const artist = artists.find(a => a.id === apt.artistId);
    const commissionPercent = artist?.defaultCommissionRate || settings.defaultArtistCommission;

    const baseAmount = finalTotal !== undefined ? finalTotal : apt.estimatedPrice;
    const deposit = apt.depositAmount || 0;
    const taxRate = settings.defaultTaxRate;
    const subtotal = baseAmount;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    const amountPaidNow = Math.max(0, total - deposit);

    const artistShare = ((total - taxAmount) * commissionPercent) / 100;
    const studioShare = total - artistShare;

    const sale = addSale({
      date: new Date().toISOString(),
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      clientEmail: apt.clientEmail,
      serviceCategory: apt.serviceCategory,
      serviceName: apt.serviceName,
      artistId: apt.artistId,
      artistName: apt.artistName,
      hours: apt.estimatedHours,
      pieces: 1,
      subtotal,
      discount: 0,
      taxRate,
      taxAmount,
      total,
      depositAmount: deposit,
      amountPaidNow,
      remainingBalance: 0,
      paymentMethod,
      cashPaid: paymentMethod === 'cash' ? amountPaidNow : 0,
      cardPaid: paymentMethod === 'card' ? amountPaidNow : 0,
      transferPaid: paymentMethod === 'transfer' ? amountPaidNow : 0,
      tipAmount,
      artistCommissionPercent: commissionPercent,
      artistShare,
      studioShare,
      status: 'completed',
      consentFormSigned: apt.consentSigned,
      notes: `Convertida desde cita agendada (${apt.date} ${apt.startTime}). ${apt.notes || ''}`,
    });

    // Mark appointment as completed with reference to sale
    updateAppointment(appointmentId, {
      status: 'completed',
      saleId: sale.id,
    });

    return sale;
  };

  // Sale Operations
  const addSale = (saleData: Omit<SaleRecord, 'id' | 'invoiceNumber'>): SaleRecord => {
    const nextSeq = sales.length + 183;
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;
    const newSale: SaleRecord = {
      ...saleData,
      id: `sale-${Date.now()}`,
      invoiceNumber,
    };
    setSales(prev => [newSale, ...prev]);
    return newSale;
  };

  const updateSale = (id: string, updated: Partial<SaleRecord>) => {
    setSales(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)));
  };

  const deleteSale = (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
  };

  // Expense Operations
  const addExpense = (expenseData: Omit<ExpenseRecord, 'id'>): ExpenseRecord => {
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Artist Operations
  const addArtist = (artistData: Omit<Artist, 'id'>) => {
    const colors = [
      'bg-indigo-900 text-indigo-100',
      'bg-rose-900 text-rose-100',
      'bg-amber-900 text-amber-100',
      'bg-teal-900 text-teal-100',
      'bg-zinc-800 text-zinc-100',
    ];
    const newArtist: Artist = {
      ...artistData,
      id: `art-${Date.now()}`,
      avatarColor: colors[artists.length % colors.length],
    };
    setArtists(prev => [...prev, newArtist]);
  };

  const updateArtist = (id: string, updated: Partial<Artist>) => {
    setArtists(prev => prev.map(a => (a.id === id ? { ...a, ...updated } : a)));
  };

  const toggleArtistStatus = (id: string) => {
    setArtists(prev => prev.map(a => (a.id === id ? { ...a, active: !a.active } : a)));
  };

  const settleArtistCommissions = (
    artistId: string,
    amount: number,
    tips: number,
    deductions: number,
    paymentMethod: 'cash' | 'transfer',
    notes?: string
  ) => {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;

    const netPaid = amount + tips - deductions;
    const now = new Date().toISOString();

    const settlement: ArtistSettlement = {
      id: `settle-${Date.now()}`,
      artistId,
      artistName: artist.name,
      date: now,
      periodStart: 'Histórico pendiente',
      periodEnd: now.split('T')[0],
      grossSales: 0,
      commissionEarned: amount,
      tipsEarned: tips,
      deductions,
      amountPaid: netPaid,
      paymentMethod,
      status: 'paid',
      notes: notes || `Liquidación de comisiones acumuladas para ${artist.name}`,
    };

    setSettlements(prev => [settlement, ...prev]);

    // Automatically record an expense for studio accounting
    addExpense({
      date: now,
      category: 'artist_payout',
      description: `Pago de Liquidación de Comisiones: ${artist.name}`,
      supplier: artist.name,
      amount: netPaid,
      taxDeductible: true,
      taxAmount: 0,
      paymentMethod: paymentMethod === 'cash' ? 'cash' : 'bank_transfer',
      invoiceReference: `LIQ-${Date.now().toString().slice(-6)}`,
      notes: `Liquidación comisiones: ${formatMoney(amount)} + Propinas: ${formatMoney(tips)} - Descuentos: ${formatMoney(deductions)}`,
    });
  };

  // Inventory Operations
  const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
    };
    setInventory(prev => [...prev, newItem]);
  };

  const updateInventoryItem = (id: string, updated: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => (item.id === id ? { ...item, ...updated } : item)));
  };

  const adjustStock = (id: string, delta: number) => {
    setInventory(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const newStock = Math.max(0, item.currentStock + delta);
        return { ...item, currentStock: newStock };
      })
    );
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  // Cash Shift Operations
  const openCashShift = (openingCash: number, openedBy: string, notes?: string) => {
    const now = new Date();
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      date: now.toISOString().split('T')[0],
      openedAt: now.toISOString(),
      openedBy: openedBy || 'Encargado de Caja',
      openingCash: Math.max(0, openingCash),
      expectedCash: Math.max(0, openingCash),
      actualCashCounted: undefined,
      cardTotal: 0,
      transferTotal: 0,
      cashSalesTotal: 0,
      cashExpensesTotal: 0,
      status: 'open',
      notes: notes || 'Apertura de turno',
    };
    setCurrentShift(newShift);
  };

  const closeCashShift = (actualCounted: number, closedBy: string, notes?: string) => {
    const now = new Date();
    const discrepancy = Math.round((actualCounted - currentShift.expectedCash) * 100) / 100;

    const closed: CashShift = {
      ...currentShift,
      closedAt: now.toISOString(),
      closedBy: closedBy || 'Encargado de Caja',
      actualCashCounted: actualCounted,
      discrepancy,
      status: 'closed',
      notes: notes || currentShift.notes,
    };

    setPastShifts(prev => [closed, ...prev]);
    setCurrentShift(closed);
  };

  // Settings
  const updateSettings = (newSettings: Partial<StudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Reset to Demo
  const resetToDemo = () => {
    setSales(INITIAL_SALES);
    setExpenses(INITIAL_EXPENSES);
    setArtists(INITIAL_ARTISTS);
    setInventory(INITIAL_INVENTORY);
    setAppointments(INITIAL_APPOINTMENTS);
    setCurrentShift(INITIAL_CASH_SHIFT);
    setSettlements([]);
    setSettings(INITIAL_SETTINGS);
  };

  // Clear all data (blank start)
  const clearAllData = () => {
    setSales([]);
    setExpenses([]);
    setSettlements([]);
    setAppointments([]);
    const freshShift: CashShift = {
      id: `shift-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      openedAt: new Date().toISOString(),
      openedBy: 'Administrador',
      openingCash: 0,
      expectedCash: 0,
      cardTotal: 0,
      transferTotal: 0,
      cashSalesTotal: 0,
      cashExpensesTotal: 0,
      status: 'open',
    };
    setCurrentShift(freshShift);
  };

  // Backup Export & Import
  const exportBackup = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      artists,
      sales,
      expenses,
      inventory,
      appointments,
      settlements,
      pastShifts,
      currentShift,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inkledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.sales && Array.isArray(parsed.sales)) setSales(parsed.sales);
      if (parsed.expenses && Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
      if (parsed.artists && Array.isArray(parsed.artists)) setArtists(parsed.artists);
      if (parsed.inventory && Array.isArray(parsed.inventory)) setInventory(parsed.inventory);
      if (parsed.appointments && Array.isArray(parsed.appointments)) setAppointments(parsed.appointments);
      if (parsed.settlements && Array.isArray(parsed.settlements)) setSettlements(parsed.settlements);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.currentShift) setCurrentShift(parsed.currentShift);
      if (parsed.pastShifts) setPastShifts(parsed.pastShifts);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <StudioContext.Provider
      value={{
        sales,
        expenses,
        artists,
        settlements,
        inventory,
        appointments,
        currentShift,
        pastShifts,
        settings,
        theme,
        activeTab,
        dateFilter,
        setActiveTab,
        setDateFilter,
        toggleTheme,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        updateAppointmentStatus,
        completeAndBillAppointment,
        addSale,
        updateSale,
        deleteSale,
        addExpense,
        deleteExpense,
        addArtist,
        updateArtist,
        toggleArtistStatus,
        settleArtistCommissions,
        addInventoryItem,
        updateInventoryItem,
        adjustStock,
        deleteInventoryItem,
        openCashShift,
        closeCashShift,
        updateSettings,
        formatMoney,
        resetToDemo,
        clearAllData,
        exportBackup,
        importBackup,
        filteredSales,
        filteredExpenses,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
