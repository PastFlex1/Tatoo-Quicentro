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
  KardexMovement,
  KardexMovementType,
  ManualJournalEntry,
  ClientProfile,
  Proforma,
  ProformaItem,
} from '../types';
import {
  INITIAL_ARTISTS,
  INITIAL_CASH_SHIFT,
  INITIAL_EXPENSES,
  INITIAL_INVENTORY,
  INITIAL_SALES,
  INITIAL_SETTINGS,
  INITIAL_APPOINTMENTS,
  INITIAL_KARDEX,
  INITIAL_CLIENTS,
  INITIAL_PROFORMAS,
} from '../data/initialData';

interface StudioContextType {
  // Data
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  artists: Artist[];
  settlements: ArtistSettlement[];
  inventory: InventoryItem[];
  kardexMovements: KardexMovement[];
  manualJournalEntries: ManualJournalEntry[];
  appointments: Appointment[];
  clients: ClientProfile[];
  proformas: Proforma[];
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

  // Actions - Cotizaciones & Proformas
  addProforma: (proforma: Omit<Proforma, 'id' | 'createdAt' | 'proformaNumber'>) => Proforma;
  updateProforma: (id: string, updated: Partial<Proforma>) => void;
  deleteProforma: (id: string) => void;
  convertProformaToAppointment: (
    proformaId: string,
    appointmentDate?: string,
    startTime?: string,
    depositPaid?: boolean,
    depositPaymentMethod?: PaymentMethod
  ) => Appointment;
  getProformaByAppointmentId: (appointmentId: string) => Proforma | undefined;

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

  // Actions - Inventory & Kardex
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, updated: Partial<InventoryItem>) => void;
  adjustStock: (id: string, delta: number, reason?: string) => void;
  deleteInventoryItem: (id: string) => void;
  addKardexMovement: (params: {
    itemId: string;
    type: KardexMovementType;
    quantity: number;
    unitCost?: number;
    reference?: string;
    concept: string;
    responsible?: string;
    date?: string;
  }) => void;

  // Actions - Clients & History
  addClient: (client: Omit<ClientProfile, 'id' | 'createdAt'>) => ClientProfile;
  updateClient: (id: string, updated: Partial<ClientProfile>) => void;
  deleteClient: (id: string) => void;
  upsertClient: (profile: Partial<ClientProfile> & { name: string }) => ClientProfile;

  // Actions - General Ledger Manual Entries
  addManualJournalEntry: (entry: Omit<ManualJournalEntry, 'id'>) => void;
  deleteManualJournalEntry: (id: string) => void;

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
  KARDEX: 'inkledger_kardex_v1',
  JOURNAL: 'inkledger_journal_v1',
  APPOINTMENTS: 'inkledger_appointments_v1',
  CLIENTS: 'inkledger_clients_v1',
  PROFORMAS: 'inkledger_proformas_v1',
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

  const [kardexMovements, setKardexMovements] = useState<KardexMovement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.KARDEX);
    return saved ? JSON.parse(saved) : INITIAL_KARDEX;
  });

  const [manualJournalEntries, setManualJournalEntries] = useState<ManualJournalEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    return saved ? JSON.parse(saved) : [];
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [clients, setClients] = useState<ClientProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [proformas, setProformas] = useState<Proforma[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFORMAS);
    return saved ? JSON.parse(saved) : INITIAL_PROFORMAS;
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
        if (
          !parsed.studioName ||
          parsed.studioName === 'Black Lotus Tattoo & Piercing Atelier' ||
          parsed.studioName.includes('Black Lotus')
        ) {
          parsed.studioName = INITIAL_SETTINGS.studioName;
          parsed.address = INITIAL_SETTINGS.address;
          parsed.email = INITIAL_SETTINGS.email;
          parsed.website = INITIAL_SETTINGS.website;
          parsed.receiptFooterMessage = INITIAL_SETTINGS.receiptFooterMessage;
          parsed.healthSanitaryRegistration = INITIAL_SETTINGS.healthSanitaryRegistration;
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
    localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(kardexMovements));
  }, [kardexMovements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(manualJournalEntries));
  }, [manualJournalEntries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFORMAS, JSON.stringify(proformas));
  }, [proformas]);

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

  // Client Operations
  const addClient = (clientData: Omit<ClientProfile, 'id' | 'createdAt'>): ClientProfile => {
    const newClient: ClientProfile = {
      ...clientData,
      id: `cli-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updated: Partial<ClientProfile>) => {
    setClients(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const upsertClient = (profile: Partial<ClientProfile> & { name: string }): ClientProfile => {
    const cleanName = profile.name.trim();
    const existing = clients.find(
      c =>
        c.name.toLowerCase() === cleanName.toLowerCase() ||
        (profile.phone && c.phone && c.phone === profile.phone) ||
        (profile.dni && c.dni && c.dni.toLowerCase() === profile.dni.toLowerCase())
    );

    if (existing) {
      const updated: ClientProfile = {
        ...existing,
        phone: profile.phone || existing.phone,
        dni: profile.dni || existing.dni,
        email: profile.email || existing.email,
        instagram: profile.instagram || existing.instagram,
        consentSigned: profile.consentSigned !== undefined ? profile.consentSigned : existing.consentSigned,
      };
      updateClient(existing.id, updated);
      return updated;
    } else {
      return addClient({
        name: cleanName,
        phone: profile.phone,
        dni: profile.dni,
        email: profile.email,
        instagram: profile.instagram,
        consentSigned: profile.consentSigned || false,
        tags: ['Nuevo'],
      });
    }
  };

  // Appointment Operations
  const addAppointment = (aptData: Omit<Appointment, 'id' | 'createdAt'>): Appointment => {
    const newApt: Appointment = {
      ...aptData,
      id: `apt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppointments(prev => [newApt, ...prev]);

    // Ensure client profile exists
    if (aptData.clientName) {
      upsertClient({
        name: aptData.clientName,
        phone: aptData.clientPhone,
        email: aptData.clientEmail,
        instagram: aptData.clientInstagram,
        consentSigned: aptData.consentSigned,
      });
    }

    // Automatically generate and attach a Proforma for this appointment
    const currentYear = new Date().getFullYear();
    const aptProforma: Proforma = {
      id: `prof-apt-${newApt.id}`,
      proformaNumber: `PROF-${currentYear}-${String(Date.now()).slice(-4)}`,
      date: aptData.date || new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      clientName: aptData.clientName,
      clientPhone: aptData.clientPhone,
      clientEmail: aptData.clientEmail,
      clientInstagram: aptData.clientInstagram,
      artistId: aptData.artistId,
      artistName: aptData.artistName,
      serviceCategory: aptData.serviceCategory,
      serviceName: aptData.serviceName,
      bodyPlacement: aptData.bodyPlacement,
      sizeApprox: aptData.sizeApprox,
      items: [
        {
          id: `pitem-${Date.now()}`,
          concept: `${aptData.serviceName} (${aptData.estimatedHours}h est.)`,
          category: aptData.serviceCategory,
          hours: aptData.estimatedHours,
          quantity: 1,
          unitPrice: aptData.estimatedPrice,
          total: aptData.estimatedPrice,
        },
      ],
      subtotal: aptData.estimatedPrice,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: aptData.estimatedPrice,
      suggestedDeposit: aptData.depositAmount,
      estimatedHours: aptData.estimatedHours,
      appointmentId: newApt.id,
      appointmentDate: aptData.date,
      appointmentTime: aptData.startTime,
      status: aptData.depositPaid ? 'accepted' : 'draft',
      termsAndConditions: 'Proforma y reserva oficial de cita de estudio. Anticipo deducible del total del servicio en cabina. Avisar con mínimo 48h para reprogramación.',
      notes: aptData.notes,
      createdAt: newApt.createdAt,
    };
    setProformas(prev => [aptProforma, ...prev]);

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

  // Cotizaciones & Proformas Operations
  const addProforma = (profData: Omit<Proforma, 'id' | 'createdAt' | 'proformaNumber'>): Proforma => {
    const currentYear = new Date().getFullYear();
    const nextSeq = String(proformas.length + 45).padStart(4, '0');
    const newProf: Proforma = {
      ...profData,
      id: `prof-${Date.now()}`,
      proformaNumber: `PROF-${currentYear}-${nextSeq}`,
      createdAt: new Date().toISOString(),
    };
    setProformas(prev => [newProf, ...prev]);

    if (profData.clientName) {
      upsertClient({
        name: profData.clientName,
        phone: profData.clientPhone,
        email: profData.clientEmail,
        instagram: profData.clientInstagram,
        dni: profData.clientDni,
        tags: ['Cotización'],
      });
    }

    return newProf;
  };

  const updateProforma = (id: string, updated: Partial<Proforma>) => {
    setProformas(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)));
  };

  const deleteProforma = (id: string) => {
    setProformas(prev => prev.filter(p => p.id !== id));
  };

  const getProformaByAppointmentId = (appointmentId: string): Proforma | undefined => {
    const existing = proformas.find(p => p.appointmentId === appointmentId);
    if (existing) return existing;

    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return undefined;

    const currentYear = new Date().getFullYear();
    const fallbackProf: Proforma = {
      id: `prof-apt-${apt.id}`,
      proformaNumber: `PROF-${currentYear}-${apt.id.slice(-4).toUpperCase()}`,
      date: apt.date || new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      clientEmail: apt.clientEmail,
      clientInstagram: apt.clientInstagram,
      artistId: apt.artistId,
      artistName: apt.artistName,
      serviceCategory: apt.serviceCategory,
      serviceName: apt.serviceName,
      bodyPlacement: apt.bodyPlacement,
      sizeApprox: apt.sizeApprox,
      items: [
        {
          id: `pitem-${apt.id}`,
          concept: `${apt.serviceName} (${apt.estimatedHours}h est.)`,
          category: apt.serviceCategory,
          hours: apt.estimatedHours,
          quantity: 1,
          unitPrice: apt.estimatedPrice,
          total: apt.estimatedPrice,
        },
      ],
      subtotal: apt.estimatedPrice,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: apt.estimatedPrice,
      suggestedDeposit: apt.depositAmount,
      estimatedHours: apt.estimatedHours,
      appointmentId: apt.id,
      appointmentDate: apt.date,
      appointmentTime: apt.startTime,
      status: apt.status === 'completed' ? 'converted' : apt.depositPaid ? 'accepted' : 'draft',
      termsAndConditions: 'Proforma y confirmación de reserva. Anticipo deducible del total del servicio en cabina. Se requiere 48h de preaviso para reprogramar.',
      notes: apt.notes,
      createdAt: apt.createdAt,
    };
    return fallbackProf;
  };

  const convertProformaToAppointment = (
    proformaId: string,
    appointmentDate?: string,
    startTime?: string,
    depositPaid: boolean = false,
    depositPaymentMethod?: PaymentMethod
  ): Appointment => {
    const prof = proformas.find(p => p.id === proformaId);
    if (!prof) throw new Error('Cotización / Proforma no encontrada');

    const date = appointmentDate || prof.appointmentDate || new Date().toISOString().split('T')[0];
    const time = startTime || prof.appointmentTime || '11:00';
    const hours = prof.estimatedHours || 2;
    const [h, m] = time.split(':').map(Number);
    const endTotalMinutes = (isNaN(h) ? 11 : h) * 60 + (isNaN(m) ? 0 : m) + Math.round(hours * 60);
    const endH = String(Math.floor(endTotalMinutes / 60) % 24).padStart(2, '0');
    const endM = String(endTotalMinutes % 60).padStart(2, '0');
    const endTime = `${endH}:${endM}`;

    const newApt = addAppointment({
      clientName: prof.clientName,
      clientPhone: prof.clientPhone || 'No especificado',
      clientEmail: prof.clientEmail,
      clientInstagram: prof.clientInstagram,
      artistId: prof.artistId,
      artistName: prof.artistName,
      serviceCategory: prof.serviceCategory,
      serviceName: prof.serviceName,
      date,
      startTime: time,
      endTime,
      estimatedHours: prof.estimatedHours || 2,
      estimatedPrice: prof.total,
      depositAmount: prof.suggestedDeposit || 0,
      depositPaid,
      depositPaymentMethod,
      bodyPlacement: prof.bodyPlacement,
      sizeApprox: prof.sizeApprox,
      status: depositPaid ? 'confirmed' : 'scheduled',
      consentSigned: false,
      notes: prof.notes,
    });

    updateProforma(proformaId, {
      status: 'converted',
      appointmentId: newApt.id,
      appointmentDate: date,
      appointmentTime: time,
    });

    return newApt;
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

    // Ensure client profile is synced in client directory
    if (saleData.clientName) {
      upsertClient({
        name: saleData.clientName,
        phone: saleData.clientPhone,
        email: saleData.clientEmail,
        dni: saleData.clientDni,
        consentSigned: saleData.consentFormSigned,
      });
    }

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

  // Inventory & Kardex Operations
  const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>) => {
    const newId = `inv-${Date.now()}`;
    const newItem: InventoryItem = {
      ...itemData,
      id: newId,
    };
    setInventory(prev => [...prev, newItem]);

    if (itemData.currentStock > 0) {
      const totalVal = Math.round(itemData.currentStock * itemData.unitCost * 100) / 100;
      const kdx: KardexMovement = {
        id: `kdx-${Date.now()}`,
        date: new Date().toISOString(),
        itemId: newId,
        itemName: itemData.name,
        itemSku: itemData.sku,
        unit: itemData.unit,
        type: 'initial',
        reference: `ALTA-${newId.slice(-4)}`,
        concept: 'Alta inicial de insumo en catálogo',
        responsible: 'Administración',
        quantityIn: itemData.currentStock,
        unitCostIn: itemData.unitCost,
        totalIn: totalVal,
        quantityOut: 0,
        unitCostOut: 0,
        totalOut: 0,
        balanceQty: itemData.currentStock,
        balanceUnitCost: itemData.unitCost,
        balanceTotal: totalVal,
      };
      setKardexMovements(prev => [kdx, ...prev]);
    }
  };

  const updateInventoryItem = (id: string, updated: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => (item.id === id ? { ...item, ...updated } : item)));
  };

  const addKardexMovement = (params: {
    itemId: string;
    type: KardexMovementType;
    quantity: number;
    unitCost?: number;
    reference?: string;
    concept: string;
    responsible?: string;
    date?: string;
  }) => {
    const item = inventory.find(i => i.id === params.itemId);
    if (!item || params.quantity <= 0) return;

    const isEntry = params.type === 'purchase_in' || params.type === 'initial';
    const qty = params.quantity;
    const costPerUnit = params.unitCost !== undefined && params.unitCost > 0 ? params.unitCost : item.unitCost;

    let newBalanceQty = item.currentStock;
    let newUnitCost = item.unitCost;

    if (isEntry) {
      const prevVal = item.currentStock * item.unitCost;
      const entryVal = qty * costPerUnit;
      newBalanceQty = item.currentStock + qty;
      newUnitCost =
        newBalanceQty > 0
          ? Math.round(((prevVal + entryVal) / newBalanceQty) * 100) / 100
          : costPerUnit;
    } else {
      newBalanceQty = Math.max(0, item.currentStock - qty);
    }

    const totalMovement = Math.round(qty * costPerUnit * 100) / 100;
    const newBalanceTotal = Math.round(newBalanceQty * newUnitCost * 100) / 100;

    const movement: KardexMovement = {
      id: `kdx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: params.date || new Date().toISOString(),
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      unit: item.unit,
      type: params.type,
      reference: params.reference || `KDX-${Date.now().toString().slice(-5)}`,
      concept: params.concept,
      responsible: params.responsible || 'Administración',
      quantityIn: isEntry ? qty : 0,
      unitCostIn: isEntry ? costPerUnit : 0,
      totalIn: isEntry ? totalMovement : 0,
      quantityOut: !isEntry ? qty : 0,
      unitCostOut: !isEntry ? costPerUnit : 0,
      totalOut: !isEntry ? totalMovement : 0,
      balanceQty: newBalanceQty,
      balanceUnitCost: newUnitCost,
      balanceTotal: newBalanceTotal,
    };

    setKardexMovements(prev => [movement, ...prev]);
    setInventory(prev =>
      prev.map(i =>
        i.id === item.id
          ? { ...i, currentStock: newBalanceQty, unitCost: newUnitCost }
          : i
      )
    );
  };

  const adjustStock = (id: string, delta: number, reason?: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item || delta === 0) return;

    const newStock = Math.max(0, item.currentStock + delta);
    const actualDelta = newStock - item.currentStock;
    if (actualDelta === 0) return;

    const isEntry = actualDelta > 0;
    const absQty = Math.abs(actualDelta);
    const totalMov = Math.round(absQty * item.unitCost * 100) / 100;
    const balanceTotal = Math.round(newStock * item.unitCost * 100) / 100;

    const movement: KardexMovement = {
      id: `kdx-${Date.now()}`,
      date: new Date().toISOString(),
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      unit: item.unit,
      type: isEntry ? 'purchase_in' : 'cabin_out',
      reference: `AJU-${Date.now().toString().slice(-5)}`,
      concept:
        reason ||
        (isEntry
          ? 'Ingreso rápido de stock desde inventario'
          : 'Salida / consumo en cabina registrado desde inventario'),
      responsible: 'Operador de Estudio',
      quantityIn: isEntry ? absQty : 0,
      unitCostIn: isEntry ? item.unitCost : 0,
      totalIn: isEntry ? totalMov : 0,
      quantityOut: !isEntry ? absQty : 0,
      unitCostOut: !isEntry ? item.unitCost : 0,
      totalOut: !isEntry ? totalMov : 0,
      balanceQty: newStock,
      balanceUnitCost: item.unitCost,
      balanceTotal,
    };

    setInventory(prev =>
      prev.map(i => (i.id === id ? { ...i, currentStock: newStock } : i))
    );
    setKardexMovements(prev => [movement, ...prev]);
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  // Manual Journal Entries for General Ledger
  const addManualJournalEntry = (entryData: Omit<ManualJournalEntry, 'id'>) => {
    const newEntry: ManualJournalEntry = {
      ...entryData,
      id: `jrnl-${Date.now()}`,
    };
    setManualJournalEntries(prev => [newEntry, ...prev]);
  };

  const deleteManualJournalEntry = (id: string) => {
    setManualJournalEntries(prev => prev.filter(j => j.id !== id));
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
    setKardexMovements(INITIAL_KARDEX);
    setManualJournalEntries([]);
    setAppointments(INITIAL_APPOINTMENTS);
    setClients(INITIAL_CLIENTS);
    setProformas(INITIAL_PROFORMAS);
    setCurrentShift(INITIAL_CASH_SHIFT);
    setSettlements([]);
    setSettings(INITIAL_SETTINGS);
  };

  // Clear all data (blank start)
  const clearAllData = () => {
    setSales([]);
    setExpenses([]);
    setSettlements([]);
    setKardexMovements([]);
    setManualJournalEntries([]);
    setAppointments([]);
    setClients([]);
    setProformas([]);
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
      version: '1.2',
      exportedAt: new Date().toISOString(),
      settings,
      artists,
      sales,
      expenses,
      inventory,
      kardexMovements,
      manualJournalEntries,
      appointments,
      clients,
      proformas,
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
      if (parsed.kardexMovements && Array.isArray(parsed.kardexMovements)) setKardexMovements(parsed.kardexMovements);
      if (parsed.manualJournalEntries && Array.isArray(parsed.manualJournalEntries)) setManualJournalEntries(parsed.manualJournalEntries);
      if (parsed.appointments && Array.isArray(parsed.appointments)) setAppointments(parsed.appointments);
      if (parsed.clients && Array.isArray(parsed.clients)) setClients(parsed.clients);
      if (parsed.proformas && Array.isArray(parsed.proformas)) setProformas(parsed.proformas);
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
        kardexMovements,
        manualJournalEntries,
        appointments,
        clients,
        proformas,
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
        addProforma,
        updateProforma,
        deleteProforma,
        convertProformaToAppointment,
        getProformaByAppointmentId,
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
        addKardexMovement,
        addClient,
        updateClient,
        deleteClient,
        upsertClient,
        addManualJournalEntry,
        deleteManualJournalEntry,
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
