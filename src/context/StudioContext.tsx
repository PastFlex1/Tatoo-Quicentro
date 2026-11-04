import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Artist,
  ArtistSettlement,
  CashShift,
  DateFilterRange,
  ExpenseRecord,
  ExpenseCategory,
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
  GalleryPhoto,
  Supplier,
  PurchaseOrder,
  SystemUser,
  UserRole,
  CreditNoteRecord,
} from '../types';
import {
  INITIAL_ARTISTS,
  INITIAL_CASH_SHIFT,
  INITIAL_EXPENSES,
  INITIAL_INVENTORY,
  INITIAL_SALES,
  INITIAL_CREDIT_NOTES,
  INITIAL_SETTINGS,
  INITIAL_APPOINTMENTS,
  INITIAL_KARDEX,
  INITIAL_CLIENTS,
  INITIAL_PROFORMAS,
  INITIAL_GALLERY_PHOTOS,
  INITIAL_SUPPLIERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_USERS,
  INITIAL_JOURNAL_ENTRIES,
  getDefaultTabsForRole,
} from '../data/initialData';
import { generateSriClaveAcceso } from '../utils/sriCalculations';

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
  galleryPhotos: GalleryPhoto[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  creditNotes: CreditNoteRecord[];
  users: SystemUser[];
  currentUser: SystemUser;
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
  convertProformaToSale: (
    proformaId: string,
    paymentMethod?: PaymentMethod,
    tipAmount?: number,
    finalTotal?: number
  ) => SaleRecord;
  getProformaByAppointmentId: (appointmentId: string) => Proforma | undefined;

  // Actions - Sales
  addSale: (sale: Omit<SaleRecord, 'id' | 'invoiceNumber'>) => SaleRecord;
  updateSale: (id: string, updated: Partial<SaleRecord>) => void;
  deleteSale: (id: string) => void;

  // Actions - Credit Notes / Notas de Crédito
  addCreditNote: (creditNote: Omit<CreditNoteRecord, 'id' | 'creditNoteNumber' | 'createdAt'>) => CreditNoteRecord;
  deleteCreditNote: (id: string) => void;

  // Actions - Expenses
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => ExpenseRecord;
  updateExpense: (id: string, updated: Partial<ExpenseRecord>) => void;
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
    isEntry?: boolean;
  }) => void;
  reconcileKardexInventory: () => { reconciledCount: number; adjustmentsMade: number };

  // Actions - Clients & History
  addClient: (client: Omit<ClientProfile, 'id' | 'createdAt'>) => ClientProfile;
  updateClient: (id: string, updated: Partial<ClientProfile>) => void;
  deleteClient: (id: string) => void;
  upsertClient: (profile: Partial<ClientProfile> & { name: string }) => ClientProfile;

  // Actions - Gallery & Portfolio
  addGalleryPhoto: (photo: Omit<GalleryPhoto, 'id' | 'createdAt'>) => GalleryPhoto;
  updateGalleryPhoto: (id: string, updated: Partial<GalleryPhoto>) => void;
  deleteGalleryPhoto: (id: string) => void;

  // Actions - Suppliers / Proveedores
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, updated: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Actions - Purchase Orders / Órdenes de Compra
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => PurchaseOrder;
  updatePurchaseOrder: (id: string, updated: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  receivePurchaseOrder: (
    id: string,
    details?: {
      receivedBy?: string;
      invoiceReference?: string;
      updateInventoryStock?: boolean;
      registerExpense?: boolean;
    }
  ) => void;

  // Actions - Users & Roles / Gestión de Usuarios y Permisos
  switchUser: (userId: string, pin?: string) => boolean;
  addUser: (user: Omit<SystemUser, 'id' | 'createdAt'>) => SystemUser;
  updateUser: (id: string, updated: Partial<SystemUser>) => void;
  deleteUser: (id: string) => void;
  canAccessTab: (tabId: string) => boolean;

  // Actions - General Ledger Manual Entries
  addManualJournalEntry: (entry: Omit<ManualJournalEntry, 'id'>) => void;
  updateManualJournalEntry: (id: string, updates: Partial<ManualJournalEntry>) => void;
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
  filteredCreditNotes: CreditNoteRecord[];
  filteredExpenses: ExpenseRecord[];
}

const StudioContext: React.Context<StudioContextType | undefined> =
  (typeof globalThis !== 'undefined' && (globalThis as any).__STUDIO_CONTEXT__) ||
  createContext<StudioContextType | undefined>(undefined);

if (typeof globalThis !== 'undefined') {
  (globalThis as any).__STUDIO_CONTEXT__ = StudioContext;
}

function safeLoadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (err) {
    console.warn(`[StudioContext] Error al parsear "${key}" desde localStorage:`, err);
    return fallback;
  }
}

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
  GALLERY: 'inkledger_gallery_v1',
  SUPPLIERS: 'inkledger_suppliers_v1',
  PURCHASE_ORDERS: 'inkledger_purchase_orders_v1',
  CREDIT_NOTES: 'inkledger_credit_notes_v1',
  USERS: 'inkledger_users_v1',
  CURRENT_USER: 'inkledger_current_user_v1',
  CURRENT_SHIFT: 'inkledger_curr_shift_v1',
  PAST_SHIFTS: 'inkledger_past_shifts_v1',
  SETTINGS: 'inkledger_settings_v1',
  THEME: 'inkledger_theme_v1',
};

export const StudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial from localStorage safely or fall back to defaults
  const [sales, setSales] = useState<SaleRecord[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.SALES, INITIAL_SALES)
  );

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES)
  );

  const [artists, setArtists] = useState<Artist[]>(() => {
    const loaded = safeLoadFromStorage<Artist[]>(STORAGE_KEYS.ARTISTS, INITIAL_ARTISTS);
    return loaded.map(art => ({
      ...art,
      defaultCommissionRate:
        art.defaultCommissionRate && [50, 60, 65, 70].includes(art.defaultCommissionRate)
          ? 80
          : (art.defaultCommissionRate ?? 80),
    }));
  });

  const [settlements, setSettlements] = useState<ArtistSettlement[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.SETTLEMENTS, [])
  );

  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY)
  );

  const [kardexMovements, setKardexMovements] = useState<KardexMovement[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.KARDEX, INITIAL_KARDEX)
  );

  const [manualJournalEntries, setManualJournalEntries] = useState<ManualJournalEntry[]>(() => {
    const loaded = safeLoadFromStorage<ManualJournalEntry[]>(STORAGE_KEYS.JOURNAL, INITIAL_JOURNAL_ENTRIES);
    return loaded && loaded.length > 0 ? loaded : INITIAL_JOURNAL_ENTRIES;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS)
  );

  const [clients, setClients] = useState<ClientProfile[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS)
  );

  const [proformas, setProformas] = useState<Proforma[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.PROFORMAS, INITIAL_PROFORMAS)
  );

  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.GALLERY, INITIAL_GALLERY_PHOTOS)
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS)
  );

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.PURCHASE_ORDERS, INITIAL_PURCHASE_ORDERS)
  );

  const [creditNotes, setCreditNotes] = useState<CreditNoteRecord[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.CREDIT_NOTES, INITIAL_CREDIT_NOTES)
  );

  const [users, setUsers] = useState<SystemUser[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS)
  );

  const [currentUser, setCurrentUser] = useState<SystemUser>(() => {
    const saved = safeLoadFromStorage<SystemUser | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (saved && saved.id) return saved;
    return INITIAL_USERS[0];
  });

  const [currentShift, setCurrentShift] = useState<CashShift>(() =>
    safeLoadFromStorage(STORAGE_KEYS.CURRENT_SHIFT, INITIAL_CASH_SHIFT)
  );

  const [pastShifts, setPastShifts] = useState<CashShift[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.PAST_SHIFTS, [])
  );

  const [settings, setSettings] = useState<StudioSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // En Ecuador la moneda oficial es el Dólar estadounidense ($ USD)
        parsed.currency = '$';
        parsed.currencyCode = 'USD';
        // En Ecuador la tarifa general vigente de IVA por ley del SRI es del 15%
        if (!parsed.defaultTaxRate || parsed.defaultTaxRate === 8 || parsed.defaultTaxRate === 12) {
          parsed.defaultTaxRate = 15;
        }
        // Reparto oficial del estudio: 80% artista / 20% retención empresa
        if (!parsed.defaultArtistCommission || [50, 60, 65, 70].includes(parsed.defaultArtistCommission)) {
          parsed.defaultArtistCommission = 80;
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
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          defaultTaxRate: (!parsed.defaultTaxRate || parsed.defaultTaxRate === 8 || parsed.defaultTaxRate === 12) ? 15 : parsed.defaultTaxRate,
          defaultArtistCommission: (!parsed.defaultArtistCommission || [50, 60, 65, 70].includes(parsed.defaultArtistCommission)) ? 80 : parsed.defaultArtistCommission,
          ruc: parsed.ruc || parsed.taxId || INITIAL_SETTINGS.ruc,
          razonSocial: parsed.razonSocial || INITIAL_SETTINGS.razonSocial,
          nombreComercial: parsed.nombreComercial || parsed.studioName || INITIAL_SETTINGS.nombreComercial,
          dirMatriz: parsed.dirMatriz || parsed.address || INITIAL_SETTINGS.dirMatriz,
          dirEstablecimiento: parsed.dirEstablecimiento || parsed.address || INITIAL_SETTINGS.dirEstablecimiento,
          telefono: parsed.telefono || parsed.phone || INITIAL_SETTINGS.telefono,
          codigoEstablecimiento: parsed.codigoEstablecimiento || INITIAL_SETTINGS.codigoEstablecimiento,
          puntoEmision: parsed.puntoEmision || INITIAL_SETTINGS.puntoEmision,
          pais: parsed.pais || INITIAL_SETTINGS.pais,
          provincia: parsed.provincia || INITIAL_SETTINGS.provincia,
          ciudad: parsed.ciudad || INITIAL_SETTINGS.ciudad,
          parroquia: parsed.parroquia || INITIAL_SETTINGS.parroquia,
          secuencialFactura: parsed.secuencialFactura || INITIAL_SETTINGS.secuencialFactura,
          secuencialNotaVenta: parsed.secuencialNotaVenta || INITIAL_SETTINGS.secuencialNotaVenta,
          regimenTributario: parsed.regimenTributario || INITIAL_SETTINGS.regimenTributario,
          ambiente: parsed.ambiente || INITIAL_SETTINGS.ambiente,
        };
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
    localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(galleryPhotos));
  }, [galleryPhotos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CREDIT_NOTES, JSON.stringify(creditNotes));
  }, [creditNotes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

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

  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter(cn => isDateInFilter(cn.date, dateFilter));
  }, [creditNotes, dateFilter]);

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

  // Gallery Operations
  const addGalleryPhoto = (photoData: Omit<GalleryPhoto, 'id' | 'createdAt'>): GalleryPhoto => {
    const newPhoto: GalleryPhoto = {
      ...photoData,
      id: `gal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setGalleryPhotos(prev => [newPhoto, ...prev]);
    return newPhoto;
  };

  const updateGalleryPhoto = (id: string, updated: Partial<GalleryPhoto>) => {
    setGalleryPhotos(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)));
  };

  const deleteGalleryPhoto = (id: string) => {
    setGalleryPhotos(prev => prev.filter(p => p.id !== id));
  };

  // Supplier Operations
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setSuppliers(prev => [newSupplier, ...prev]);
    return newSupplier;
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  // Purchase Order Operations / Órdenes de Compra
  const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'createdAt'>): PurchaseOrder => {
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    return newPO;
  };

  const updatePurchaseOrder = (id: string, updated: Partial<PurchaseOrder>) => {
    setPurchaseOrders(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)));
  };

  const deletePurchaseOrder = (id: string) => {
    setPurchaseOrders(prev => prev.filter(p => p.id !== id));
  };

  const receivePurchaseOrder = (
    id: string,
    details?: {
      receivedBy?: string;
      invoiceReference?: string;
      updateInventoryStock?: boolean;
      registerExpense?: boolean;
    }
  ) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po || po.status === 'received') return;

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const receiver = details?.receivedBy || 'Administrador';
    const invRef = details?.invoiceReference || po.invoiceReference || '';
    const shouldUpdateStock = details?.updateInventoryStock ?? true;
    const shouldRegisterExpense = details?.registerExpense ?? true;

    // 1. Marcar estado de orden como 'received'
    setPurchaseOrders(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              status: 'received' as const,
              receivedAt: now,
              receivedBy: receiver,
              invoiceReference: invRef || p.invoiceReference,
            }
          : p
      )
    );

    // 2. Si se solicita, actualizar stock de inventario y registrar movimientos en Kardex
    if (shouldUpdateStock && po.items.length > 0) {
      setInventory(prevInventory => {
        const updatedInv = [...prevInventory];
        const newMovements: KardexMovement[] = [];

        po.items.forEach(item => {
          const targetIndex = updatedInv.findIndex(
            i =>
              (item.inventoryItemId && i.id === item.inventoryItemId) ||
              (item.code && i.sku && i.sku.toLowerCase() === item.code.toLowerCase()) ||
              i.name.toLowerCase() === item.name.toLowerCase()
          );

          if (targetIndex >= 0) {
            const invItem = updatedInv[targetIndex];
            const qty = item.quantity;
            const costPerUnit = item.unitCost > 0 ? item.unitCost : invItem.unitCost;
            const prevVal = invItem.currentStock * invItem.unitCost;
            const entryVal = qty * costPerUnit;
            const newBalanceQty = invItem.currentStock + qty;
            const newUnitCost =
              newBalanceQty > 0
                ? Math.round(((prevVal + entryVal) / newBalanceQty) * 100) / 100
                : costPerUnit;

            updatedInv[targetIndex] = {
              ...invItem,
              currentStock: newBalanceQty,
              unitCost: newUnitCost,
            };

            newMovements.push({
              id: `kdx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              date: now,
              itemId: invItem.id,
              itemName: invItem.name,
              itemSku: invItem.sku,
              unit: invItem.unit,
              type: 'purchase_in',
              reference: po.orderNumber,
              concept: `Recepción Orden de Compra ${po.orderNumber} - Proveedor: ${po.supplierName}`,
              responsible: receiver,
              quantityIn: qty,
              unitCostIn: costPerUnit,
              totalIn: Math.round(qty * costPerUnit * 100) / 100,
              quantityOut: 0,
              unitCostOut: 0,
              totalOut: 0,
              balanceQty: newBalanceQty,
              balanceUnitCost: newUnitCost,
              balanceTotal: Math.round(newBalanceQty * newUnitCost * 100) / 100,
            });
          }
        });

        if (newMovements.length > 0) {
          setKardexMovements(prevKardex => [...newMovements, ...prevKardex]);
        }

        return updatedInv;
      });
    }

    // 3. Registrar gasto contable si aplica
    if (shouldRegisterExpense && po.total > 0) {
      let expenseCat: ExpenseCategory = 'supplies_tattoo';
      const hasPiercing = po.items.some(i => i.category === 'piercing');
      const hasJewelry = po.items.some(i => i.category === 'jewelry' || i.name.toLowerCase().includes('titanio') || i.name.toLowerCase().includes('joya'));
      const hasHygiene = po.items.some(i => i.category === 'supplies' || i.category === 'aftercare' || i.name.toLowerCase().includes('guantes') || i.name.toLowerCase().includes('dermalize'));

      if (hasJewelry) {
        expenseCat = 'jewelry_restock';
      } else if (hasPiercing) {
        expenseCat = 'supplies_piercing';
      } else if (hasHygiene) {
        expenseCat = 'hygiene_sanitary';
      }

      addExpense({
        date: today,
        category: expenseCat,
        description: `Compra Suministros OC ${po.orderNumber} - ${po.supplierName} ${invRef ? `(Fac: ${invRef})` : ''}`.trim(),
        amount: po.total,
        subtotal: po.subtotal,
        taxRate: po.taxRate,
        taxAmount: po.taxAmount,
        paymentMethod: po.paymentMethod || 'bank_transfer',
        invoiceReference: invRef || po.orderNumber,
        supplier: po.supplierName,
        supplierRuc: po.supplierRuc,
        taxDeductible: true,
        notes: `Generado automáticamente por recepción de OC ${po.orderNumber}. Recibido por: ${receiver}.`,
      });
    }
  };

  // User & Role Operations / Gestión de Usuarios y Permisos
  const switchUser = (userId: string, pin?: string): boolean => {
    const targetUser = users.find(u => u.id === userId && u.estado === 'ACTIVO');
    if (!targetUser) return false;

    if (targetUser.pin && pin !== undefined && pin !== targetUser.pin) {
      return false;
    }

    const updated: SystemUser = {
      ...targetUser,
      lastLogin: new Date().toISOString(),
    };

    setCurrentUser(updated);
    setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));

    // Redirect if current tab is not accessible
    const allowed = targetUser.allowedTabs && targetUser.allowedTabs.length > 0
      ? targetUser.allowedTabs
      : getDefaultTabsForRole(targetUser.rol);

    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0] || 'dashboard');
    }

    return true;
  };

  const addUser = (userData: Omit<SystemUser, 'id' | 'createdAt'>): SystemUser => {
    const newUser: SystemUser = {
      ...userData,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, updated: Partial<SystemUser>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updated } : u)));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updated }));
    }
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser.id === id) {
      const fallback = users.find(u => u.id !== id) || INITIAL_USERS[0];
      setCurrentUser(fallback);
    }
  };

  const canAccessTab = (tabId: string): boolean => {
    if (!currentUser) return true;
    if (currentUser.rol === 'ADMIN') return true;
    if (currentUser.allowedTabs && currentUser.allowedTabs.length > 0) {
      return currentUser.allowedTabs.includes(tabId);
    }
    const defaultTabs = getDefaultTabsForRole(currentUser.rol);
    return defaultTabs.includes(tabId);
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

  const convertProformaToSale = (
    proformaId: string,
    paymentMethod: PaymentMethod = 'card',
    tipAmount: number = 0,
    finalTotal?: number
  ): SaleRecord => {
    const prof = proformas.find(p => p.id === proformaId);
    if (!prof) throw new Error('Cotización / Proforma no encontrada');

    const artist = artists.find(a => a.id === prof.artistId);
    const commissionPercent = artist?.defaultCommissionRate || settings.defaultArtistCommission;

    const baseAmount = finalTotal !== undefined ? finalTotal : prof.total;
    const taxRate = prof.taxRate ?? settings.defaultTaxRate;
    const taxableBase = prof.subtotal > 0 ? Math.max(0, prof.subtotal - (prof.discount || 0)) : baseAmount;
    const taxAmount = prof.taxAmount > 0 ? prof.taxAmount : Math.round(((taxableBase * taxRate) / 100) * 100) / 100;
    const total = finalTotal !== undefined ? finalTotal : (prof.total || (taxableBase + taxAmount));
    const deposit = prof.suggestedDeposit || 0;
    const amountPaidNow = total;

    const artistShare = ((total - taxAmount) * commissionPercent) / 100;
    const studioShare = total - artistShare;

    const sale = addSale({
      date: new Date().toISOString(),
      clientName: prof.clientName,
      clientPhone: prof.clientPhone,
      clientEmail: prof.clientEmail,
      clientDni: prof.clientDni,
      serviceCategory: prof.serviceCategory,
      serviceName: prof.serviceName,
      artistId: prof.artistId,
      artistName: prof.artistName,
      hours: prof.estimatedHours || 2,
      pieces: 1,
      subtotal: prof.subtotal || taxableBase,
      discount: prof.discount || 0,
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
      consentFormSigned: true,
      notes: `Factura oficial generada desde Proforma ${prof.proformaNumber}. ${prof.notes || ''}`.trim(),
    });

    // Mark proforma as converted with reference to sale
    updateProforma(proformaId, {
      status: 'converted',
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
    });

    return sale;
  };

  // Sale Operations
  const addSale = (saleData: Omit<SaleRecord, 'id' | 'invoiceNumber'>): SaleRecord => {
    const isNotaVenta = saleData.documentType === 'nota_venta';
    // Código de serie SRI (Establecimiento y Punto de Emisión)
    const estab = (settings.codigoEstablecimiento || '001').padStart(3, '0').slice(-3);
    const pto = (settings.puntoEmision || '001').padStart(3, '0').slice(-3);

    let invoiceNumber = '';
    let currentSeqNum = 1;

    if (isNotaVenta) {
      currentSeqNum =
        parseInt(settings.secuencialNotaVenta?.replace(/\D/g, '') || '', 10) ||
        (sales.filter(s => s.documentType === 'nota_venta').length + 46);
      const secuencialPadded = String(currentSeqNum).padStart(9, '0').slice(-9);
      invoiceNumber = `NV-${estab}-${pto}-${secuencialPadded}`;

      // Incrementar secuencialNotaVenta
      const nextSecuencialPadded = String(currentSeqNum + 1).padStart(9, '0').slice(-9);
      setSettings(prev => ({
        ...prev,
        secuencialNotaVenta: nextSecuencialPadded,
      }));
    } else {
      currentSeqNum =
        parseInt(settings.secuencialFactura?.replace(/\D/g, '') || '', 10) ||
        (sales.filter(s => s.documentType !== 'nota_venta').length + 184);
      const secuencialPadded = String(currentSeqNum).padStart(9, '0').slice(-9);
      invoiceNumber = `${estab}-${pto}-${secuencialPadded}`;

      // Incrementar secuencialFactura
      const nextSecuencialPadded = String(currentSeqNum + 1).padStart(9, '0').slice(-9);
      setSettings(prev => ({
        ...prev,
        secuencialFactura: nextSecuencialPadded,
      }));
    }

    const rucLimpio = (settings.ruc || settings.taxId || '1792847102001')
      .replace(/\D/g, '')
      .padEnd(13, '0')
      .slice(0, 13);

    const now = new Date();
    let sriAccessKey = saleData.sriAccessKey;
    if (!isNotaVenta && !sriAccessKey) {
      try {
        const sec9 = String(currentSeqNum).padStart(9, '0').slice(-9);
        sriAccessKey = generateSriClaveAcceso({
          fechaEmision: now,
          tipoComprobante: '01',
          ruc: rucLimpio,
          ambiente: settings.ambiente === '2' || settings.ambiente === 'PRODUCCION' ? '2' : '1',
          serie: `${estab}${pto}`,
          secuencial: sec9,
          codigoNumerico: '12345678',
          tipoEmision: '1',
        });
      } catch {
        sriAccessKey = undefined;
      }
    }

    const newSale: SaleRecord = {
      ...saleData,
      id: `sale-${Date.now()}`,
      invoiceNumber,
      documentType: isNotaVenta ? 'nota_venta' : 'factura',
      sriStatus: isNotaVenta ? undefined : 'AUTORIZADO',
      sriAccessKey,
      sriAuthorizationDate: isNotaVenta ? undefined : now.toISOString(),
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

    // Sincronización automática de inventario y Kardex
    const itemsToDeduct: { itemId: string; name: string; sku?: string; qty: number; type: KardexMovementType; concept: string }[] = [];

    // 1. Si se especificó un ítem directo de inventario (venta mostrador / retail)
    if (saleData.inventoryItemId) {
      const invItem = inventory.find(i => i.id === saleData.inventoryItemId);
      if (invItem) {
        itemsToDeduct.push({
          itemId: invItem.id,
          name: invItem.name,
          sku: invItem.sku,
          qty: saleData.pieces || 1,
          type: 'retail_sale',
          concept: `Venta mostrador (${invoiceNumber}) - Cliente: ${saleData.clientName}`,
        });
      }
    } else if (saleData.serviceCategory === 'jewelry' || saleData.serviceCategory === 'aftercare') {
      // Búsqueda inteligente por nombre o SKU si fue ingresado en POS
      const invItem = inventory.find(
        i =>
          i.name.toLowerCase() === saleData.serviceName.toLowerCase() ||
          saleData.serviceName.toLowerCase().includes(i.name.toLowerCase()) ||
          (i.sku && saleData.serviceName.toLowerCase().includes(i.sku.toLowerCase()))
      );
      if (invItem) {
        itemsToDeduct.push({
          itemId: invItem.id,
          name: invItem.name,
          sku: invItem.sku,
          qty: saleData.pieces || 1,
          type: 'retail_sale',
          concept: `Venta mostrador (${invoiceNumber}) - Cliente: ${saleData.clientName}`,
        });
      }
    }

    // 2. Si se especificaron consumibles de cabina usados en la sesión de tatuaje o piercing
    if (saleData.consumedSupplies && saleData.consumedSupplies.length > 0) {
      saleData.consumedSupplies.forEach(cs => {
        const invItem = inventory.find(i => i.id === cs.itemId || i.name.toLowerCase() === cs.name.toLowerCase());
        if (invItem && cs.quantity > 0) {
          itemsToDeduct.push({
            itemId: invItem.id,
            name: invItem.name,
            sku: invItem.sku,
            qty: cs.quantity,
            type: 'cabin_out',
            concept: `Consumo en cabina servicio ${saleData.serviceName} (${invoiceNumber}) - Artista: ${saleData.artistName}`,
          });
        }
      });
    }

    // Ejecutar deducción atómica en inventario y kardex
    if (itemsToDeduct.length > 0) {
      setInventory(prevInv => {
        const updatedInv = [...prevInv];
        const newMovements: KardexMovement[] = [];

        itemsToDeduct.forEach(d => {
          const idx = updatedInv.findIndex(i => i.id === d.itemId);
          if (idx >= 0) {
            const item = updatedInv[idx];
            const newStock = Math.max(0, item.currentStock - d.qty);
            const totalOut = Math.round(d.qty * item.unitCost * 100) / 100;
            const balanceTotal = Math.round(newStock * item.unitCost * 100) / 100;

            updatedInv[idx] = {
              ...item,
              currentStock: newStock,
            };

            newMovements.push({
              id: `kdx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              date: new Date().toISOString(),
              itemId: item.id,
              itemName: item.name,
              itemSku: item.sku,
              unit: item.unit,
              type: d.type,
              reference: invoiceNumber,
              concept: d.concept,
              responsible: saleData.artistName || currentUser?.nombres || 'Operador POS',
              quantityIn: 0,
              unitCostIn: 0,
              totalIn: 0,
              quantityOut: d.qty,
              unitCostOut: item.unitCost,
              totalOut,
              balanceQty: newStock,
              balanceUnitCost: item.unitCost,
              balanceTotal,
            });
          }
        });

        if (newMovements.length > 0) {
          setKardexMovements(prevKdx => [...newMovements, ...prevKdx]);
        }

        return updatedInv;
      });
    }

    return newSale;
  };

  const updateSale = (id: string, updated: Partial<SaleRecord>) => {
    setSales(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)));
  };

  const deleteSale = (id: string) => {
    const saleToDelete = sales.find(s => s.id === id);
    if (!saleToDelete) return;

    // Buscar movimientos de Kardex asociados a esta factura para revertir
    const relatedMovements = kardexMovements.filter(
      m => m.reference === saleToDelete.invoiceNumber
    );

    if (relatedMovements.length > 0) {
      setInventory(prevInv => {
        const updatedInv = [...prevInv];
        const reversalMovements: KardexMovement[] = [];

        relatedMovements.forEach(rm => {
          const idx = updatedInv.findIndex(i => i.id === rm.itemId);
          if (idx >= 0 && rm.quantityOut > 0) {
            const item = updatedInv[idx];
            const restoredStock = item.currentStock + rm.quantityOut;
            const totalIn = Math.round(rm.quantityOut * item.unitCost * 100) / 100;
            const balanceTotal = Math.round(restoredStock * item.unitCost * 100) / 100;

            updatedInv[idx] = {
              ...item,
              currentStock: restoredStock,
            };

            reversalMovements.push({
              id: `kdx-rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              date: new Date().toISOString(),
              itemId: item.id,
              itemName: item.name,
              itemSku: item.sku,
              unit: item.unit,
              type: 'adjustment',
              reference: `ANUL-${saleToDelete.invoiceNumber}`,
              concept: `Reverso de stock por anulación de Factura ${saleToDelete.invoiceNumber} (${saleToDelete.clientName})`,
              responsible: currentUser?.nombres || 'Administración',
              quantityIn: rm.quantityOut,
              unitCostIn: item.unitCost,
              totalIn,
              quantityOut: 0,
              unitCostOut: 0,
              totalOut: 0,
              balanceQty: restoredStock,
              balanceUnitCost: item.unitCost,
              balanceTotal,
            });
          }
        });

        if (reversalMovements.length > 0) {
          setKardexMovements(prevKdx => [...reversalMovements, ...prevKdx]);
        }

        return updatedInv;
      });
    }

    setSales(prev => prev.filter(s => s.id !== id));
  };

  // Credit Note Operations / Notas de Crédito
  const addCreditNote = (
    cnData: Omit<CreditNoteRecord, 'id' | 'creditNoteNumber' | 'createdAt'>
  ): CreditNoteRecord => {
    const estab = (settings.codigoEstablecimiento || '001').padStart(3, '0').slice(-3);
    const pto = (settings.puntoEmision || '001').padStart(3, '0').slice(-3);
    const currentSeqNum = creditNotes.length + 1;
    const secuencialPadded = String(currentSeqNum).padStart(9, '0').slice(-9);
    const creditNoteNumber = `${estab}-${pto}-${secuencialPadded}`;

    const rucLimpio = (settings.ruc || settings.taxId || '1792847102001')
      .replace(/\D/g, '')
      .padEnd(13, '0')
      .slice(0, 13);

    const now = new Date();
    let sriAccessKey = cnData.sriAccessKey;
    if (!sriAccessKey) {
      try {
        sriAccessKey = generateSriClaveAcceso({
          fechaEmision: now,
          tipoComprobante: '04', // 04 = Nota de Crédito SRI
          ruc: rucLimpio,
          ambiente: settings.ambiente === '2' || settings.ambiente === 'PRODUCCION' ? '2' : '1',
          serie: `${estab}${pto}`,
          secuencial: secuencialPadded,
          codigoNumerico: '12345678',
          tipoEmision: '1',
        });
      } catch {
        sriAccessKey = '0101202604179284710200110010010000000011234567814';
      }
    }

    const newCN: CreditNoteRecord = {
      ...cnData,
      id: `cn-${Date.now()}`,
      creditNoteNumber,
      sriAccessKey,
      sriStatus: 'AUTORIZADO',
      sriAuthorizationDate: now.toISOString(),
      createdAt: now.toISOString(),
    };

    setCreditNotes(prev => [newCN, ...prev]);

    // 1. Modificar la factura afectada
    if (cnData.affectedInvoiceId) {
      setSales(prev =>
        prev.map(s => {
          if (s.id === cnData.affectedInvoiceId) {
            return {
              ...s,
              status: cnData.reason === 'ANULACION_TOTAL' ? 'cancelled' : s.status,
              creditNoteId: newCN.id,
              creditNoteNumber: newCN.creditNoteNumber,
            };
          }
          return s;
        })
      );
    }

    // 2. Si se solicitó reingresar a Kardex / inventario por devolución de producto
    if (cnData.revertInventory && cnData.affectedInvoiceId) {
      const targetSale = sales.find(s => s.id === cnData.affectedInvoiceId);
      if (targetSale) {
        const relatedKdx = kardexMovements.filter(m => m.reference === targetSale.invoiceNumber);
        if (relatedKdx.length > 0) {
          setInventory(prevInv => {
            const updatedInv = [...prevInv];
            const revMovements: KardexMovement[] = [];

            relatedKdx.forEach(rm => {
              const idx = updatedInv.findIndex(i => i.id === rm.itemId);
              if (idx >= 0 && rm.quantityOut > 0) {
                const item = updatedInv[idx];
                const newStock = item.currentStock + rm.quantityOut;
                updatedInv[idx] = { ...item, currentStock: newStock };

                revMovements.push({
                  id: `kdx-nc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  date: now.toISOString(),
                  itemId: item.id,
                  itemName: item.name,
                  itemSku: item.sku,
                  unit: item.unit,
                  type: 'adjustment',
                  reference: newCN.creditNoteNumber,
                  concept: `Reingreso a bodega por Nota de Crédito ${newCN.creditNoteNumber} (Fac. ${targetSale.invoiceNumber})`,
                  responsible: currentUser?.nombres || 'Administración',
                  quantityIn: rm.quantityOut,
                  unitCostIn: item.unitCost,
                  totalIn: Math.round(rm.quantityOut * item.unitCost * 100) / 100,
                  quantityOut: 0,
                  unitCostOut: 0,
                  totalOut: 0,
                  balanceQty: newStock,
                  balanceUnitCost: item.unitCost,
                  balanceTotal: Math.round(newStock * item.unitCost * 100) / 100,
                });
              }
            });

            if (revMovements.length > 0) {
              setKardexMovements(prev => [...revMovements, ...prev]);
            }

            return updatedInv;
          });
        }
      }
    }

    return newCN;
  };

  const deleteCreditNote = (id: string) => {
    setCreditNotes(prev => prev.filter(cn => cn.id !== id));
  };

  // Expense Operations
  const addExpense = (expenseData: Omit<ExpenseRecord, 'id'>): ExpenseRecord => {
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      sriStatus: expenseData.sriStatus || (expenseData.sriAccessKey ? 'AUTORIZADO' : expenseData.taxDeductible ? 'AUTORIZADO' : 'PENDIENTE'),
    };
    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  };

  const updateExpense = (id: string, updated: Partial<ExpenseRecord>) => {
    setExpenses(prev => prev.map(e => (e.id === id ? { ...e, ...updated } : e)));
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
    isEntry?: boolean;
  }) => {
    const item = inventory.find(i => i.id === params.itemId);
    if (!item || params.quantity <= 0) return;

    const isEntry = params.isEntry !== undefined
      ? params.isEntry
      : (params.type === 'purchase_in' || params.type === 'initial');
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
      responsible: params.responsible || currentUser?.nombres || 'Administración',
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
      id: `kdx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString(),
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      unit: item.unit,
      type: 'adjustment',
      reference: `AJU-${Date.now().toString().slice(-5)}`,
      concept:
        reason ||
        (isEntry
          ? 'Ajuste positivo por inventario físico en bodega'
          : 'Baja / merma sanitaria de insumo en bodega'),
      responsible: currentUser?.nombres || 'Operador de Estudio',
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

  const reconcileKardexInventory = (): { reconciledCount: number; adjustmentsMade: number } => {
    let adjustmentsMade = 0;
    const newMovements: KardexMovement[] = [];
    const now = new Date().toISOString();

    inventory.forEach(item => {
      const itemMovements = kardexMovements.filter(m => m.itemId === item.id);
      const sumIn = itemMovements.reduce((acc, m) => acc + (m.quantityIn || 0), 0);
      const sumOut = itemMovements.reduce((acc, m) => acc + (m.quantityOut || 0), 0);
      const kardexCalculatedStock = sumIn - sumOut;

      if (kardexCalculatedStock !== item.currentStock) {
        const delta = item.currentStock - kardexCalculatedStock;
        const isEntry = delta > 0;
        const absQty = Math.abs(delta);
        const totalVal = Math.round(absQty * item.unitCost * 100) / 100;
        const balanceTotal = Math.round(item.currentStock * item.unitCost * 100) / 100;

        newMovements.push({
          id: `kdx-sync-${Date.now()}-${item.id.slice(-4)}-${Math.random().toString(36).slice(2, 5)}`,
          date: now,
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          unit: item.unit,
          type: 'adjustment',
          reference: `SYNC-${Date.now().toString().slice(-5)}`,
          concept: `Conciliación y sincronización de Kardex con inventario físico (${isEntry ? 'Cuadre positivo +' : 'Cuadre merma -'})`,
          responsible: currentUser?.nombres || 'Sistema Automático',
          quantityIn: isEntry ? absQty : 0,
          unitCostIn: isEntry ? item.unitCost : 0,
          totalIn: isEntry ? totalVal : 0,
          quantityOut: !isEntry ? absQty : 0,
          unitCostOut: !isEntry ? item.unitCost : 0,
          totalOut: !isEntry ? totalVal : 0,
          balanceQty: item.currentStock,
          balanceUnitCost: item.unitCost,
          balanceTotal,
        });
        adjustmentsMade++;
      }
    });

    if (newMovements.length > 0) {
      setKardexMovements(prev => [...newMovements, ...prev]);
    }

    return {
      reconciledCount: inventory.length,
      adjustmentsMade,
    };
  };

  const deleteInventoryItem = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item && item.currentStock > 0) {
      const totalMov = Math.round(item.currentStock * item.unitCost * 100) / 100;
      const movement: KardexMovement = {
        id: `kdx-del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toISOString(),
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        unit: item.unit,
        type: 'adjustment',
        reference: `BAJA-${item.id.slice(-4)}`,
        concept: `Baja definitiva del insumo / eliminación del catálogo (${item.name})`,
        responsible: currentUser?.nombres || 'Administración',
        quantityIn: 0,
        unitCostIn: 0,
        totalIn: 0,
        quantityOut: item.currentStock,
        unitCostOut: item.unitCost,
        totalOut: totalMov,
        balanceQty: 0,
        balanceUnitCost: item.unitCost,
        balanceTotal: 0,
      };
      setKardexMovements(prev => [movement, ...prev]);
    }
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  // Manual Journal Entries for General Ledger & Libro Diario
  const addManualJournalEntry = (entryData: Omit<ManualJournalEntry, 'id'>) => {
    const year = new Date().getFullYear();
    const nextNumber = entryData.entryNumber || `ASI-${year}-${String(manualJournalEntries.length + 1).padStart(4, '0')}`;
    const newEntry: ManualJournalEntry = {
      ...entryData,
      id: `jrnl-${Date.now()}`,
      entryNumber: nextNumber,
      status: entryData.status || 'cuadrado',
    };
    setManualJournalEntries(prev => [newEntry, ...prev]);
  };

  const updateManualJournalEntry = (id: string, updates: Partial<ManualJournalEntry>) => {
    setManualJournalEntries(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry))
    );
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
    setManualJournalEntries(INITIAL_JOURNAL_ENTRIES);
    setAppointments(INITIAL_APPOINTMENTS);
    setClients(INITIAL_CLIENTS);
    setProformas(INITIAL_PROFORMAS);
    setGalleryPhotos(INITIAL_GALLERY_PHOTOS);
    setSuppliers(INITIAL_SUPPLIERS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
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
    setGalleryPhotos([]);
    setSuppliers([]);
    setPurchaseOrders([]);
    setUsers([INITIAL_USERS[0]]);
    setCurrentUser(INITIAL_USERS[0]);
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
      galleryPhotos,
      suppliers,
      purchaseOrders,
      users,
      currentUser,
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
      if (parsed.galleryPhotos && Array.isArray(parsed.galleryPhotos)) setGalleryPhotos(parsed.galleryPhotos);
      if (parsed.suppliers && Array.isArray(parsed.suppliers)) setSuppliers(parsed.suppliers);
      if (parsed.purchaseOrders && Array.isArray(parsed.purchaseOrders)) setPurchaseOrders(parsed.purchaseOrders);
      if (parsed.users && Array.isArray(parsed.users)) setUsers(parsed.users);
      if (parsed.currentUser && parsed.currentUser.id) setCurrentUser(parsed.currentUser);
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
        galleryPhotos,
        suppliers,
        purchaseOrders,
        creditNotes,
        users,
        currentUser,
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
        convertProformaToSale,
        getProformaByAppointmentId,
        addSale,
        updateSale,
        deleteSale,
        addCreditNote,
        deleteCreditNote,
        addExpense,
        updateExpense,
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
        reconcileKardexInventory,
        addClient,
        updateClient,
        deleteClient,
        upsertClient,
        addGalleryPhoto,
        updateGalleryPhoto,
        deleteGalleryPhoto,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        receivePurchaseOrder,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        canAccessTab,
        addManualJournalEntry,
        updateManualJournalEntry,
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
        filteredCreditNotes,
        filteredExpenses,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

const FALLBACK_STUDIO_CONTEXT: StudioContextType = {
  sales: INITIAL_SALES,
  expenses: INITIAL_EXPENSES,
  artists: INITIAL_ARTISTS,
  settlements: [],
  inventory: INITIAL_INVENTORY,
  kardexMovements: INITIAL_KARDEX,
  manualJournalEntries: [],
  appointments: INITIAL_APPOINTMENTS,
  clients: INITIAL_CLIENTS,
  proformas: INITIAL_PROFORMAS,
  galleryPhotos: INITIAL_GALLERY_PHOTOS,
  suppliers: INITIAL_SUPPLIERS,
  purchaseOrders: INITIAL_PURCHASE_ORDERS,
  creditNotes: INITIAL_CREDIT_NOTES,
  users: INITIAL_USERS,
  currentUser: INITIAL_USERS[0],
  currentShift: INITIAL_CASH_SHIFT,
  pastShifts: [],
  settings: INITIAL_SETTINGS,
  theme: 'dark',
  activeTab: 'dashboard',
  dateFilter: 'all',
  setActiveTab: () => {},
  setDateFilter: () => {},
  toggleTheme: () => {},
  addAppointment: (app) => ({ ...app, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }),
  updateAppointment: () => {},
  deleteAppointment: () => {},
  updateAppointmentStatus: () => {},
  completeAndBillAppointment: () => ({} as any),
  addProforma: (prof) => ({ ...prof, id: 'temp-' + Date.now(), createdAt: new Date().toISOString(), proformaNumber: 'PROF-0001' }),
  updateProforma: () => {},
  deleteProforma: () => {},
  convertProformaToAppointment: () => ({} as any),
  convertProformaToSale: () => ({} as any),
  getProformaByAppointmentId: () => undefined,
  addSale: (sale) => ({ ...sale, id: 'temp-' + Date.now(), invoiceNumber: 'INV-0001' }),
  updateSale: () => {},
  deleteSale: () => {},
  addCreditNote: (cn) => ({ ...cn, id: 'temp-' + Date.now(), creditNoteNumber: '001-001-000000001', createdAt: new Date().toISOString() }),
  deleteCreditNote: () => {},
  addExpense: (exp) => ({ ...exp, id: 'temp-' + Date.now() }),
  updateExpense: () => {},
  deleteExpense: () => {},
  addArtist: () => {},
  updateArtist: () => {},
  toggleArtistStatus: () => {},
  settleArtistCommissions: () => {},
  addInventoryItem: () => {},
  updateInventoryItem: () => {},
  adjustStock: () => {},
  deleteInventoryItem: () => {},
  addKardexMovement: () => {},
  reconcileKardexInventory: () => ({ reconciledCount: 0, adjustmentsMade: 0 }),
  addClient: (cli) => ({ ...cli, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }),
  updateClient: () => {},
  deleteClient: () => {},
  upsertClient: (cli) => ({ ...cli, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() } as any),
  addGalleryPhoto: (photo) => ({ ...photo, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }),
  updateGalleryPhoto: () => {},
  deleteGalleryPhoto: () => {},
  addSupplier: (sup) => ({ ...sup, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }),
  updateSupplier: () => {},
  deleteSupplier: () => {},
  addPurchaseOrder: (po) => ({ ...po, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }),
  updatePurchaseOrder: () => {},
  deletePurchaseOrder: () => {},
  receivePurchaseOrder: () => {},
  switchUser: () => true,
  addUser: (u) => ({ ...u, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }),
  updateUser: () => {},
  deleteUser: () => {},
  canAccessTab: () => true,
  addManualJournalEntry: () => {},
  updateManualJournalEntry: () => {},
  deleteManualJournalEntry: () => {},
  openCashShift: () => {},
  closeCashShift: () => {},
  updateSettings: () => {},
  formatMoney: (val) => `$${Number(val || 0).toFixed(2)}`,
  resetToDemo: () => {},
  clearAllData: () => {},
  exportBackup: () => {},
  importBackup: () => false,
  filteredSales: INITIAL_SALES,
  filteredCreditNotes: INITIAL_CREDIT_NOTES,
  filteredExpenses: INITIAL_EXPENSES,
};

export const useStudio = (): StudioContextType => {
  const context = useContext(StudioContext);
  if (!context) {
    console.warn(
      '[useStudio] Hook ejecutado sin Provider activo o durante recarga en caliente (HMR). Usando contexto seguro por defecto.'
    );
    return FALLBACK_STUDIO_CONTEXT;
  }
  return context;
};
