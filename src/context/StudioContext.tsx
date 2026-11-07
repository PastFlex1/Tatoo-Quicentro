import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  Artist,
  ArtistSettlement,
  CashShift,
  DateFilterRange,
  ExpenseRecord,
  ExpenseCategory,
  InventoryItem,
  ComprobanteRecibido,
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
  CashMovement,
  CashMovementType,
  CashShiftSummary,
  SystemRole,
  VoidSaleInput,
} from '../types';
import {
  ADMIN_ROLE_ID,
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  normalizePermissions,
  PERMISSION_MODULES,
} from '../data/permissions';
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
  LEGACY_DEMO_IDS,
  LEGACY_DEMO_USER_IDS,
  getDefaultTabsForRole,
} from '../data/initialData';
import { computeArtistBalance } from '../utils/artistBalance';
import { hashPassword, validatePassword, verifyPassword } from '../utils/password';
import { reserveDocumentNumber } from '../services/sequenceService';
import {
  CONSUMIDOR_FINAL_CREDIT_NOTE_MESSAGE,
  consumidorFinalLimitMessage,
  exceedsConsumidorFinalLimit,
  isConsumidorFinal,
} from '../utils/consumidorFinal';
import { validarIdentificacionEcuador } from '../utils/ecuadorIdValidator';
import { SequenceType, padCode, parseDocumentSequential } from '../utils/documentNumber';
import { computeShiftSummary, ShiftTransaction } from '../utils/cashShift';
import { buildJournalEntries, buildPostings, LedgerPosting, UnifiedJournalEntry } from '../utils/accountingEngine';
import {
  buildAccessKey,
  buildFacturaXml,
  buildNotaCreditoXml,
  emitElectronicDocument,
  SriEmissionResult,
} from '../services/sriElectronicService';

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
  /** Bandeja de comprobantes electrónicos recibidos (compras) */
  comprobantesRecibidos: ComprobanteRecibido[];
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
    finalTotal?: number,
    buyer?: { dni?: string; name?: string }
  ) => Promise<SaleRecord>;

  // Actions - Cotizaciones & Proformas
  addProforma: (proforma: Omit<Proforma, 'id' | 'createdAt' | 'proformaNumber'>) => Promise<Proforma>;
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
    finalTotal?: number,
    buyer?: { dni?: string; name?: string }
  ) => Promise<SaleRecord>;
  getProformaByAppointmentId: (appointmentId: string) => Proforma | undefined;

  // Actions - Sales
  addSale: (sale: Omit<SaleRecord, 'id' | 'invoiceNumber'>) => Promise<SaleRecord>;
  /** Anula una factura a consumidor final o una nota de venta (no admiten nota de crédito) */
  voidSale: (saleId: string, input: VoidSaleInput) => SaleRecord;
  updateSale: (id: string, updated: Partial<SaleRecord>) => void;
  deleteSale: (id: string) => void;

  // Actions - Credit Notes / Notas de Crédito
  /** Envía (o reintenta) una factura al SRI usando la API Java */
  emitSaleToSri: (saleId: string) => Promise<SriEmissionResult | null>;
  /** Envía (o reintenta) una nota de crédito al SRI usando la API Java */
  emitCreditNoteToSri: (creditNoteId: string) => Promise<SriEmissionResult | null>;
  addCreditNote: (creditNote: Omit<CreditNoteRecord, 'id' | 'creditNoteNumber' | 'createdAt' | 'sriStatus'> & { sriStatus?: CreditNoteRecord['sriStatus'] }) => Promise<CreditNoteRecord>;
  deleteCreditNote: (id: string) => void;

  // Actions - Comprobantes recibidos (compras SRI)
  /** Agrega a la bandeja; omite los que ya existen (misma clave de acceso) */
  addComprobantesRecibidos: (items: ComprobanteRecibido[]) => { added: number; duplicates: number };
  updateComprobanteRecibido: (id: string, patch: Partial<ComprobanteRecibido>) => void;
  deleteComprobanteRecibido: (id: string) => void;

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
    notes?: string,
    type?: 'liquidacion' | 'anticipo'
  ) => ArtistSettlement | null;

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
  /** ¿Hay una sesión iniciada? Sin sesión no se muestra ningún módulo. */
  isAuthenticated: boolean;
  /** Instalación nueva: el administrador aún no tiene contraseña y debe crearla. */
  needsAdminSetup: boolean;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  setupAdminPassword: (password: string) => { ok: boolean; error?: string };
  logout: () => void;
  changeOwnPassword: (current: string, next: string) => { ok: boolean; error?: string };
  /** El administrador asigna o restablece la contraseña de un trabajador. */
  setUserPassword: (userId: string, password: string, mustChange?: boolean) => { ok: boolean; error?: string };
  addUser: (user: Omit<SystemUser, 'id' | 'createdAt'>) => SystemUser;
  updateUser: (id: string, updated: Partial<SystemUser>) => void;
  deleteUser: (id: string) => void;
  canAccessTab: (tabId: string) => boolean;
  /** Permiso granular `modulo.accion` del usuario conectado */
  can: (permission: string) => boolean;
  roles: SystemRole[];
  currentRole: SystemRole | null;
  getRole: (roleId: string) => SystemRole | undefined;
  addRole: (data: Pick<SystemRole, 'name' | 'description' | 'color' | 'permissions'>) => SystemRole | null;
  updateRole: (id: string, updates: Partial<Pick<SystemRole, 'name' | 'description' | 'color' | 'permissions'>>) => boolean;
  deleteRole: (id: string) => { ok: boolean; error?: string };

  // Actions - General Ledger Manual Entries
  addManualJournalEntry: (entry: Omit<ManualJournalEntry, 'id' | 'entryNumber'> & { entryNumber?: string }) => void;
  updateManualJournalEntry: (id: string, updates: Partial<ManualJournalEntry>) => void;
  deleteManualJournalEntry: (id: string) => void;

  // Actions - Cash Shift
  openCashShift: (openingCash: number, openedBy: string, notes?: string) => void;
  closeCashShift: (
    actualCounted: number,
    closedBy: string,
    notes?: string,
    denominations?: Record<string, number>
  ) => CashShift | null;
  addCashMovement: (type: CashMovementType, amount: number, concept: string) => void;
  removeCashMovement: (id: string) => void;
  /** Resumen y movimientos del turno en curso */
  currentShiftSummary: CashShiftSummary;
  currentShiftTransactions: ShiftTransaction[];

  // Settings & Utilities
  updateSettings: (newSettings: Partial<StudioSettings>) => void;
  formatMoney: (amount: number | undefined | null) => string;
  clearAllData: () => void;
  exportBackup: () => void;
  importBackup: (jsonString: string) => boolean;

  // Computed / Filtered
  filteredSales: SaleRecord[];
  filteredCreditNotes: CreditNoteRecord[];
  filteredExpenses: ExpenseRecord[];
  /** Asientos contables automáticos de todas las secciones (según el filtro de fechas) */
  accountingEntries: UnifiedJournalEntry[];
  accountingPostings: LedgerPosting[];
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

/**
 * Limpieza única de los datos de demostración que guardaban versiones anteriores.
 * Solo elimina registros cuyos IDs coinciden con los de la demo; los datos reales se conservan.
 */
function purgeLegacyDemoData(keys: Record<string, string>) {
  try {
    const FLAG = 'inkledger_demo_purged_v1';
    if (localStorage.getItem(FLAG)) return;
    const byKey: Record<string, string[]> = {
      [keys.SALES]: LEGACY_DEMO_IDS.INITIAL_SALES,
      [keys.CREDIT_NOTES]: LEGACY_DEMO_IDS.INITIAL_CREDIT_NOTES,
      [keys.EXPENSES]: LEGACY_DEMO_IDS.INITIAL_EXPENSES,
      [keys.ARTISTS]: LEGACY_DEMO_IDS.INITIAL_ARTISTS,
      [keys.INVENTORY]: LEGACY_DEMO_IDS.INITIAL_INVENTORY,
      [keys.KARDEX]: LEGACY_DEMO_IDS.INITIAL_KARDEX,
      [keys.APPOINTMENTS]: LEGACY_DEMO_IDS.INITIAL_APPOINTMENTS,
      [keys.CLIENTS]: LEGACY_DEMO_IDS.INITIAL_CLIENTS,
      [keys.PROFORMAS]: LEGACY_DEMO_IDS.INITIAL_PROFORMAS,
      [keys.GALLERY]: LEGACY_DEMO_IDS.INITIAL_GALLERY_PHOTOS,
      [keys.SUPPLIERS]: LEGACY_DEMO_IDS.INITIAL_SUPPLIERS,
      [keys.PURCHASE_ORDERS]: LEGACY_DEMO_IDS.INITIAL_PURCHASE_ORDERS,
      [keys.JOURNAL]: LEGACY_DEMO_IDS.INITIAL_JOURNAL_ENTRIES,
      [keys.USERS]: LEGACY_DEMO_USER_IDS,
    };
    Object.entries(byKey).forEach(([storageKey, demoIds]) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw || !demoIds) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const ids = new Set(demoIds);
      localStorage.setItem(storageKey, JSON.stringify(parsed.filter((r: { id?: string }) => !ids.has(r?.id || ''))));
    });
    // Liquidaciones de artistas demo
    const demoArtists = new Set(LEGACY_DEMO_IDS.INITIAL_ARTISTS);
    const rawSt = localStorage.getItem(keys.SETTLEMENTS);
    if (rawSt) {
      const st = JSON.parse(rawSt);
      if (Array.isArray(st)) {
        localStorage.setItem(
          keys.SETTLEMENTS,
          JSON.stringify(st.filter((r: { artistId?: string }) => !demoArtists.has(r?.artistId || '')))
        );
      }
    }
    // Turno de caja demo y usuario demo activo
    const rawShift = localStorage.getItem(keys.CURRENT_SHIFT);
    if (rawShift && JSON.parse(rawShift)?.id === 'shift-today') localStorage.removeItem(keys.CURRENT_SHIFT);
    const rawUser = localStorage.getItem(keys.CURRENT_USER);
    if (rawUser && LEGACY_DEMO_USER_IDS.includes(JSON.parse(rawUser)?.id)) localStorage.removeItem(keys.CURRENT_USER);
    localStorage.setItem(FLAG, new Date().toISOString());
  } catch (err) {
    console.warn('[StudioContext] No se pudo limpiar la data demo:', err);
  }
}

/** Marca de una proforma cuyo número oficial aún no llegó del servidor de numeración */
const PENDING_DOC_NUMBER = '#PENDIENTE';

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
  RECEIVED_DOCS: 'inkledger_received_docs_v1',
  USERS: 'inkledger_users_v1',
  CURRENT_USER: 'inkledger_current_user_v1',
  CURRENT_SHIFT: 'inkledger_curr_shift_v1',
  PAST_SHIFTS: 'inkledger_past_shifts_v1',
  SETTINGS: 'inkledger_settings_v1',
  THEME: 'inkledger_theme_v1',
  ROLES: 'inkledger_roles_v1',
};

if (typeof window !== 'undefined') {
  purgeLegacyDemoData(STORAGE_KEYS);
}

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
    return safeLoadFromStorage<ManualJournalEntry[]>(STORAGE_KEYS.JOURNAL, INITIAL_JOURNAL_ENTRIES);
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

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const loaded = safeLoadFromStorage<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    return loaded.map(sup => {
      if (sup.cupoCredito !== undefined) return sup;
      const initialMatch = INITIAL_SUPPLIERS.find(i => i.id === sup.id || i.ruc === sup.ruc);
      return {
        ...sup,
        cupoCredito: initialMatch?.cupoCredito ?? ((sup.diasCredito ?? 0) > 0 ? 1500 : 0),
      };
    });
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.PURCHASE_ORDERS, INITIAL_PURCHASE_ORDERS)
  );

  const [creditNotes, setCreditNotes] = useState<CreditNoteRecord[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.CREDIT_NOTES, INITIAL_CREDIT_NOTES)
  );

  const [comprobantesRecibidos, setComprobantesRecibidos] = useState<ComprobanteRecibido[]>(() =>
    safeLoadFromStorage<ComprobanteRecibido[]>(STORAGE_KEYS.RECEIVED_DOCS, [])
  );

  const [users, setUsers] = useState<SystemUser[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS)
  );

  // Roles y permisos granulares
  const [roles, setRoles] = useState<SystemRole[]>(() => {
    const saved = safeLoadFromStorage<SystemRole[]>(STORAGE_KEYS.ROLES, []);
    const list = Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_ROLES;
    // El Administrador siempre conserva TODOS los permisos (incluidos los nuevos del catálogo)
    const admin = DEFAULT_ROLES.find(r => r.id === ADMIN_ROLE_ID)!;
    const others = list.filter(r => r.id !== ADMIN_ROLE_ID).map(r => ({ ...r, permissions: normalizePermissions(r.permissions || []) }));
    return [{ ...admin, permissions: ALL_PERMISSIONS }, ...others];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
  }, [roles]);

  // Sesión: vive solo en esta pestaña del navegador (al cerrarla hay que volver a ingresar)
  const SESSION_KEY = 'inkledger_session_v1';
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });
  const persistSession = (id: string | null) => {
    setSessionUserId(id);
    try {
      if (id) sessionStorage.setItem(SESSION_KEY, id);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* sin almacenamiento de sesión: se mantiene solo en memoria */
    }
  };

  const [currentUser, setCurrentUser] = useState<SystemUser>(() => {
    const sid = (() => {
      try {
        return sessionStorage.getItem(SESSION_KEY);
      } catch {
        return null;
      }
    })();
    return users.find(u => u.id === sid && u.estado === 'ACTIVO') || INITIAL_USERS[0];
  });

  const isAuthenticated = !!sessionUserId && users.some(u => u.id === sessionUserId && u.estado === 'ACTIVO');
  const needsAdminSetup = !users.some(u => u.rol === ADMIN_ROLE_ID && u.estado === 'ACTIVO' && !!u.passwordHash);

  // Si la cuenta con sesión abierta se desactiva o elimina, la sesión se cierra sola
  useEffect(() => {
    if (sessionUserId && !isAuthenticated) persistSession(null);
  }, [sessionUserId, isAuthenticated]);

  // Mantiene currentUser al día con la lista de usuarios
  useEffect(() => {
    if (!sessionUserId) return;
    const fresh = users.find(u => u.id === sessionUserId);
    if (fresh && fresh !== currentUser) setCurrentUser(fresh);
  }, [users, sessionUserId]);

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
        // Seguridad: la clave del certificado .p12 nunca debe venir de localStorage
        // (limpia valores guardados por versiones anteriores).
        delete parsed.firmaElectronicaClave;
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
    try {
      localStorage.setItem(STORAGE_KEYS.RECEIVED_DOCS, JSON.stringify(comprobantesRecibidos));
    } catch (err) {
      console.warn('[StudioContext] No se pudieron guardar los comprobantes recibidos (¿almacenamiento lleno?):', err);
    }
  }, [comprobantesRecibidos]);

  const comprobantesRecibidosRef = useRef(comprobantesRecibidos);
  comprobantesRecibidosRef.current = comprobantesRecibidos;

  const addComprobantesRecibidos = (items: ComprobanteRecibido[]) => {
    const known = new Set(comprobantesRecibidosRef.current.map(c => c.claveAcceso));
    const fresh: ComprobanteRecibido[] = [];
    let duplicates = 0;
    for (const item of items) {
      // También evita duplicados dentro del mismo lote
      if (!item.claveAcceso || known.has(item.claveAcceso)) {
        duplicates++;
        continue;
      }
      known.add(item.claveAcceso);
      fresh.push(item);
    }
    if (fresh.length) {
      comprobantesRecibidosRef.current = [...fresh, ...comprobantesRecibidosRef.current];
      setComprobantesRecibidos(comprobantesRecibidosRef.current);
    }
    return { added: fresh.length, duplicates };
  };

  const updateComprobanteRecibido = (id: string, patch: Partial<ComprobanteRecibido>) => {
    setComprobantesRecibidos(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteComprobanteRecibido = (id: string) => {
    setComprobantesRecibidos(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SHIFT, JSON.stringify(currentShift));
  }, [currentShift]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAST_SHIFTS, JSON.stringify(pastShifts));
  }, [pastShifts]);

  useEffect(() => {
    // Seguridad: la clave del certificado .p12 se mantiene solo en memoria
    // durante la sesión y no se persiste en el navegador.
    const { firmaElectronicaClave: _omitClave, ...persistable } = settings;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(persistable));
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

  // Motor contable único: todas las secciones generan sus asientos aquí
  const accountingEntries = useMemo<UnifiedJournalEntry[]>(() => {
    const inRange = (d: string) => isDateInFilter(d, dateFilter);
    return buildJournalEntries({
      sales: filteredSales,
      voidedSales: sales.filter(x => x.voidedAt && inRange(x.voidedAt)),
      creditNotes: filteredCreditNotes,
      expenses: filteredExpenses,
      settlements: settlements.filter(st => inRange(st.date)),
      kardexMovements: kardexMovements.filter(m => inRange(m.date)),
      manualJournalEntries: manualJournalEntries.filter(j => inRange(j.date)),
      purchaseOrders,
      // El turno recién cerrado está en currentShift y en pastShifts: se deduplica por id
      shifts: [currentShift, ...pastShifts.filter(p => p.id !== currentShift.id)].filter(sh => sh && inRange(sh.openedAt)),
    });
  }, [
    sales,
    filteredSales,
    filteredCreditNotes,
    filteredExpenses,
    settlements,
    kardexMovements,
    manualJournalEntries,
    purchaseOrders,
    pastShifts,
    currentShift,
    dateFilter,
  ]);
  const accountingPostings = useMemo(() => buildPostings(accountingEntries), [accountingEntries]);

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

  // Resumen del turno de caja en curso (ventana apertura → cierre/ahora, no por fecha UTC)
  const currentShiftComputed = useMemo(
    () => computeShiftSummary(currentShift, sales, expenses, creditNotes),
    [currentShift, sales, expenses, creditNotes]
  );

  // Mantener los totales del turno abierto sincronizados (los usa el menú lateral)
  useEffect(() => {
    if (currentShift.status !== 'open') return;
    const sm = currentShiftComputed.summary;
    const cashIn = Math.round((sm.cashSales + sm.cashTips) * 100) / 100;
    const cashOut = Math.round((sm.cashExpenses + sm.cashArtistPayouts + sm.cashRefunds) * 100) / 100;
    setCurrentShift(prev => {
      if (
        prev.expectedCash === sm.expectedCash &&
        prev.cashSalesTotal === cashIn &&
        prev.cashExpensesTotal === cashOut &&
        prev.cardTotal === sm.cardSales &&
        prev.transferTotal === sm.transferSales
      ) {
        return prev;
      }
      return {
        ...prev,
        expectedCash: sm.expectedCash,
        cashSalesTotal: cashIn,
        cashExpensesTotal: cashOut,
        cardTotal: sm.cardSales,
        transferTotal: sm.transferSales,
      };
    });
  }, [currentShiftComputed, currentShift.status]);

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
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCK_MINUTES = 5;
  const IDLE_LOGOUT_MS = 30 * 60 * 1000;

  const enterSession = (user: SystemUser) => {
    const updated: SystemUser = { ...user, lastLogin: new Date().toISOString(), failedAttempts: 0, lockedUntil: undefined };
    setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
    setCurrentUser(updated);
    persistSession(user.id);
    // Cada trabajador entra directo a una sección que sí tiene asignada
    const perms = new Set(roles.find(r => r.id === user.rol)?.permissions || []);
    if (user.rol === ADMIN_ROLE_ID || perms.has('dashboard.view')) setActiveTab('dashboard');
    else setActiveTab(firstTabForRole(user.rol));
  };

  const login = (username: string, password: string): { ok: boolean; error?: string } => {
    const generic = 'Usuario o contraseña incorrectos.';
    const uname = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === uname);
    if (!user || !password) return { ok: false, error: generic };
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      const mins = Math.max(1, Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000));
      return { ok: false, error: `Cuenta bloqueada por intentos fallidos. Intente de nuevo en ${mins} min.` };
    }
    if (user.estado !== 'ACTIVO') return { ok: false, error: 'Esta cuenta está inactiva. Contacte al administrador.' };
    if (!user.passwordHash) return { ok: false, error: 'Esta cuenta aún no tiene contraseña. Pídasela al administrador.' };
    if (!verifyPassword(password, user)) {
      const attempts = (user.failedAttempts || 0) + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id
            ? { ...u, failedAttempts: lock ? 0 : attempts, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : u.lockedUntil }
            : u
        )
      );
      return {
        ok: false,
        error: lock ? `Demasiados intentos. Cuenta bloqueada ${LOCK_MINUTES} minutos.` : generic,
      };
    }
    enterSession(user);
    return { ok: true };
  };

  const setupAdminPassword = (password: string): { ok: boolean; error?: string } => {
    if (!needsAdminSetup) return { ok: false, error: 'El administrador ya tiene contraseña.' };
    const err = validatePassword(password);
    if (err) return { ok: false, error: err };
    const admin = users.find(u => u.rol === ADMIN_ROLE_ID && u.estado === 'ACTIVO');
    if (!admin) return { ok: false, error: 'No existe una cuenta de administrador activa.' };
    const withPassword: SystemUser = { ...admin, ...hashPassword(password), mustChangePassword: false };
    setUsers(prev => prev.map(u => (u.id === admin.id ? withPassword : u)));
    enterSession(withPassword);
    return { ok: true };
  };

  const logout = () => {
    persistSession(null);
    setActiveTab('dashboard');
  };

  const changeOwnPassword = (current: string, next: string): { ok: boolean; error?: string } => {
    if (!isAuthenticated) return { ok: false, error: 'Sin sesión iniciada.' };
    if (!verifyPassword(current, currentUser)) return { ok: false, error: 'La contraseña actual no es correcta.' };
    const err = validatePassword(next);
    if (err) return { ok: false, error: err };
    if (verifyPassword(next, currentUser)) return { ok: false, error: 'La nueva contraseña debe ser distinta a la actual.' };
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? { ...u, ...hashPassword(next), mustChangePassword: false } : u)));
    return { ok: true };
  };

  const setUserPassword = (userId: string, password: string, mustChange = true): { ok: boolean; error?: string } => {
    const target = users.find(u => u.id === userId);
    if (!target) return { ok: false, error: 'Usuario no encontrado.' };
    const self = userId === currentUser.id;
    if (!self && !can('users.edit')) return { ok: false, error: 'No tiene permiso para cambiar contraseñas de otros usuarios.' };
    if (target.rol === ADMIN_ROLE_ID && currentUser.rol !== ADMIN_ROLE_ID) return { ok: false, error: 'Solo un administrador puede cambiar la contraseña de un administrador.' };
    const err = validatePassword(password);
    if (err) return { ok: false, error: err };
    setUsers(prev =>
      prev.map(u =>
        u.id === userId ? { ...u, ...hashPassword(password), mustChangePassword: self ? false : mustChange, failedAttempts: 0, lockedUntil: undefined } : u
      )
    );
    return { ok: true };
  };

  // Cierre de sesión automático por inactividad (equipo compartido en recepción)
  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        persistSession(null);
        setActiveTab('dashboard');
      }, IDLE_LOGOUT_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [isAuthenticated]);

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
    if (currentUser.id === id) persistSession(null);
  };

  // ===================== ROLES & PERMISOS =====================
  const currentRole = useMemo(() => roles.find(r => r.id === currentUser?.rol) || null, [roles, currentUser]);
  const currentPermissions = useMemo(() => new Set(currentRole?.permissions || []), [currentRole]);

  /** ¿El usuario conectado tiene el permiso `modulo.accion`? */
  const can = (permission: string): boolean => {
    if (!currentUser || !isAuthenticated) return false;
    if (currentUser.rol === ADMIN_ROLE_ID) return true;
    return currentPermissions.has(permission);
  };

  // Secciones del menú que comparten permisos con otro módulo
  const TAB_PERMISSION_ALIAS: Record<string, string> = { 'credit-notes': 'sales.view', 'received-docs': 'expenses.view' };
  const canAccessTab = (tabId: string): boolean => can(TAB_PERMISSION_ALIAS[tabId] || `${tabId}.view`);

  const getRole = (roleId: string) => roles.find(r => r.id === roleId);

  /** Primer módulo visible para un rol (para redirigir al cambiar de usuario). */
  const firstTabForRole = (roleId: string): string => {
    if (roleId === ADMIN_ROLE_ID) return 'dashboard';
    const perms = new Set(roles.find(r => r.id === roleId)?.permissions || []);
    return PERMISSION_MODULES.find(m => perms.has(`${m.id}.view`))?.id || 'dashboard';
  };

  const addRole = (data: Pick<SystemRole, 'name' | 'description' | 'color' | 'permissions'>): SystemRole | null => {
    if (!can('users.manage_roles')) return null;
    const role: SystemRole = {
      id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      color: data.color || '#64748B',
      permissions: normalizePermissions(data.permissions),
      createdAt: new Date().toISOString(),
    };
    setRoles(prev => [...prev, role]);
    return role;
  };

  const updateRole = (id: string, updates: Partial<Pick<SystemRole, 'name' | 'description' | 'color' | 'permissions'>>): boolean => {
    if (!can('users.manage_roles') || id === ADMIN_ROLE_ID) return false;
    setRoles(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              ...updates,
              name: (updates.name ?? r.name).trim(),
              permissions: updates.permissions ? normalizePermissions(updates.permissions) : r.permissions,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
    return true;
  };

  const deleteRole = (id: string): { ok: boolean; error?: string } => {
    if (!can('users.manage_roles')) return { ok: false, error: 'No tiene permiso para administrar roles.' };
    if (id === ADMIN_ROLE_ID) return { ok: false, error: 'El rol Administrador no se puede eliminar.' };
    const assigned = users.filter(u => u.rol === id).length;
    if (assigned > 0) return { ok: false, error: `El rol está asignado a ${assigned} usuario(s). Reasígnelos antes de eliminarlo.` };
    setRoles(prev => prev.filter(r => r.id !== id));
    return { ok: true };
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
    // (el número oficial lo asigna el servidor central un instante después)
    const aptProforma: Proforma = {
      id: `prof-apt-${newApt.id}`,
      proformaNumber: PENDING_DOC_NUMBER,
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
    void assignPendingProformaNumbers();

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

  const completeAndBillAppointment = async (
    appointmentId: string,
    paymentMethod: PaymentMethod,
    tipAmount: number = 0,
    finalTotal?: number,
    buyer?: { dni?: string; name?: string }
  ): Promise<SaleRecord> => {
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

    // Identificación del comprador: la ingresada al cobrar, o la de su ficha de cliente
    const profile = clients.find(
      c =>
        c.name.toLowerCase().trim() === apt.clientName.toLowerCase().trim() ||
        (c.phone && apt.clientPhone && c.phone.replace(/\D/g, '') === apt.clientPhone.replace(/\D/g, ''))
    );
    const buyerDni = (buyer?.dni || '').trim() || profile?.dni || undefined;

    const sale = await addSale({
      date: new Date().toISOString(),
      clientName: (buyer?.name || '').trim() || apt.clientName,
      clientDni: buyerDni,
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

    // If there is a proforma linked to this appointment, also mark it as invoiced with the invoice number
    const linkedProforma = proformas.find(p => p.appointmentId === appointmentId);
    if (linkedProforma) {
      updateProforma(linkedProforma.id, {
        status: 'invoiced',
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
      });
    }

    return sale;
  };

  // Cotizaciones & Proformas Operations
  const addProforma = async (profData: Omit<Proforma, 'id' | 'createdAt' | 'proformaNumber'>): Promise<Proforma> => {
    const proformaNumber = await nextDocumentNumber('proforma');
    const newProf: Proforma = {
      ...profData,
      id: `prof-${Date.now()}`,
      proformaNumber,
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

    const fallbackProf: Proforma = {
      id: `prof-apt-${apt.id}`,
      proformaNumber: PENDING_DOC_NUMBER,
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

  const convertProformaToSale = async (
    proformaId: string,
    paymentMethod: PaymentMethod = 'card',
    tipAmount: number = 0,
    finalTotal?: number,
    buyer?: { dni?: string; name?: string }
  ): Promise<SaleRecord> => {
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

    const sale = await addSale({
      date: new Date().toISOString(),
      clientName: (buyer?.name || '').trim() || prof.clientName,
      clientPhone: prof.clientPhone,
      clientEmail: prof.clientEmail,
      clientDni: (buyer?.dni || '').trim() || prof.clientDni,
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

    // Mark proforma as invoiced with reference to sale and its official invoice number
    updateProforma(proformaId, {
      status: 'invoiced',
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
    });

    // If the proforma had a linked appointment, mark it completed with saleId too
    if (prof.appointmentId) {
      updateAppointment(prof.appointmentId, {
        status: 'completed',
        saleId: sale.id,
      });
    }

    return sale;
  };

  // ===================== FACTURACIÓN ELECTRÓNICA REAL (API Java SRI) =====================
  // Referencias al estado más reciente para los procesos asíncronos de envío al SRI
  const salesRef = useRef(sales);
  salesRef.current = sales;
  const creditNotesRef = useRef(creditNotes);
  creditNotesRef.current = creditNotes;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sriInFlight = useRef<Set<string>>(new Set());

  const applySriResult = (result: SriEmissionResult) => ({
    sriStatus: result.status,
    sriAuthorizationNumber: result.authorizationNumber,
    sriAuthorizationDate: result.authorizationDate,
    sriMessages: result.messages,
    sriAuthorizedXml: result.xml,
  });

  /** Firma, envía y consulta la autorización de una factura en el SRI. */
  const emitSaleToSri = async (saleId: string, saleSnapshot?: SaleRecord): Promise<SriEmissionResult | null> => {
    const sale = saleSnapshot || salesRef.current.find(s => s.id === saleId);
    if (!sale || sale.documentType === 'nota_venta' || sale.sriStatus === 'AUTORIZADO' || sale.voidedAt) return null;
    if (sriInFlight.current.has(saleId)) return null;
    sriInFlight.current.add(saleId);
    try {
      const cfg = settingsRef.current;
      const claveAcceso = sale.sriAccessKey || buildAccessKey(cfg, '01', sale.invoiceNumber, new Date(sale.date));
      const wasInProcess = sale.sriStatus === 'EN_PROCESO';
      setSales(prev => prev.map(s => (s.id === saleId ? { ...s, sriAccessKey: claveAcceso, sriStatus: 'EN_PROCESO' } : s)));
      const xml = buildFacturaXml({ ...sale, sriAccessKey: claveAcceso }, cfg, claveAcceso);
      const result = await emitElectronicDocument(xml, claveAcceso, cfg, { alreadyReceived: wasInProcess });
      // Si mientras tanto se anuló la venta, el estado "ANULADO" prevalece sobre la respuesta del SRI
      setSales(prev => prev.map(s => (s.id === saleId && !s.voidedAt ? { ...s, ...applySriResult(result) } : s)));
      return result;
    } finally {
      sriInFlight.current.delete(saleId);
    }
  };

  /** Firma, envía y consulta la autorización de una nota de crédito en el SRI. */
  const emitCreditNoteToSri = async (
    cnId: string,
    cnSnapshot?: CreditNoteRecord
  ): Promise<SriEmissionResult | null> => {
    const cn = cnSnapshot || creditNotesRef.current.find(c => c.id === cnId);
    if (!cn || cn.sriStatus === 'AUTORIZADO' || cn.sriStatus === 'ANULADO') return null;
    if (sriInFlight.current.has(cnId)) return null;
    sriInFlight.current.add(cnId);
    try {
      const cfg = settingsRef.current;
      const claveAcceso = cn.sriAccessKey || buildAccessKey(cfg, '04', cn.creditNoteNumber, new Date(cn.date));
      const wasInProcess = cn.sriStatus === 'EN_PROCESO';
      setCreditNotes(prev =>
        prev.map(c => (c.id === cnId ? { ...c, sriAccessKey: claveAcceso, sriStatus: 'EN_PROCESO' } : c))
      );
      const sale = salesRef.current.find(s => s.id === cn.affectedInvoiceId);
      const xml = buildNotaCreditoXml(cn, cfg, claveAcceso, sale);
      const result = await emitElectronicDocument(xml, claveAcceso, cfg, { alreadyReceived: wasInProcess });
      setCreditNotes(prev => prev.map(c => (c.id === cnId ? { ...c, ...applySriResult(result) } : c)));
      return result;
    } finally {
      sriInFlight.current.delete(cnId);
    }
  };

  // ===================== NUMERACIÓN CENTRAL DE DOCUMENTOS =====================
  // Proformas #000001 · Notas de venta #0000001 · Facturas y notas de crédito 001-001-000000001.
  // Cada número lo entrega el SERVIDOR de forma atómica: varios trabajadores pueden emitir a la vez
  // (cada uno desde su equipo) y nunca reciben el mismo número.
  const proformasRef = useRef(proformas);
  proformasRef.current = proformas;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  /** Mayor secuencial que este equipo ya conoce de la serie (sube el contador central si hay documentos previos). */
  const localMaxSequential = (type: SequenceType, estab: string, pto: string): number => {
    const numbers: string[] =
      type === 'factura'
        ? salesRef.current.filter(x => x.documentType !== 'nota_venta').map(x => x.invoiceNumber)
        : type === 'nota_venta'
        ? salesRef.current.filter(x => x.documentType === 'nota_venta').map(x => x.invoiceNumber)
        : type === 'nota_credito'
        ? creditNotesRef.current.map(x => x.creditNoteNumber)
        : proformasRef.current.map(x => x.proformaNumber);
    return numbers.reduce((max, n) => Math.max(max, parseDocumentSequential(type, n, estab, pto)), 0);
  };

  const nextDocumentNumber = async (type: SequenceType): Promise<string> => {
    const cfg = settingsRef.current;
    const estab = padCode(cfg.codigoEstablecimiento, 3, '001');
    const pto = padCode(cfg.puntoEmision, 3, '001');
    const u = currentUserRef.current;
    const reserved = await reserveDocumentNumber({
      type,
      estab,
      pto,
      atLeast: localMaxSequential(type, estab, pto),
      user: `${u?.nombres || ''} ${u?.apellidos || ''}`.trim() || u?.username,
    });
    return reserved.formatted;
  };

  // Asigna el número oficial a las proformas que se crearon sin él (p. ej. las automáticas de cada cita).
  // Si el servidor no responde, se reintenta solo cada pocos segundos.
  const assigningProformas = useRef(false);
  const assignPendingProformaNumbers = async () => {
    if (assigningProformas.current) return;
    assigningProformas.current = true;
    try {
      // Se esperan al siguiente ciclo para leer el estado más reciente
      await new Promise(r => setTimeout(r, 0));
      for (const prof of proformasRef.current.filter(x => x.proformaNumber === PENDING_DOC_NUMBER)) {
        const number = await nextDocumentNumber('proforma');
        setProformas(prev => prev.map(x => (x.id === prof.id ? { ...x, proformaNumber: number } : x)));
        proformasRef.current = proformasRef.current.map(x => (x.id === prof.id ? { ...x, proformaNumber: number } : x));
      }
    } catch {
      setTimeout(() => void assignPendingProformaNumbers(), 5000);
    } finally {
      assigningProformas.current = false;
    }
  };
  useEffect(() => {
    if (proformas.some(x => x.proformaNumber === PENDING_DOC_NUMBER)) void assignPendingProformaNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proformas.length]);

  // Sale Operations
  const addSale = async (saleData: Omit<SaleRecord, 'id' | 'invoiceNumber'>): Promise<SaleRecord> => {
    const isNotaVenta = saleData.documentType === 'nota_venta';

    // ---- Reglas del SRI (se validan ANTES de pedir el número, para no gastar un secuencial)
    const importeTotal = (saleData.total || 0) + (saleData.tipAmount || 0);
    if (exceedsConsumidorFinalLimit(saleData.clientDni, importeTotal)) {
      throw new Error(consumidorFinalLimitMessage(importeTotal));
    }
    const buyerId = (saleData.clientDni || '').trim();
    if (!isNotaVenta && !isConsumidorFinal(buyerId)) {
      const check = validarIdentificacionEcuador(buyerId);
      if (!check.isValid) {
        throw new Error(`La identificación del comprador no es válida (${check.errorMessage || 'revise cédula, RUC o pasaporte'}). El SRI rechazaría la factura.`);
      }
    }

    // El servidor central entrega el número: atómico y consecutivo aunque varios trabajadores facturen a la vez
    const invoiceNumber = await nextDocumentNumber(isNotaVenta ? 'nota_venta' : 'factura');

    const now = new Date();
    // Clave de acceso de 49 dígitos (código numérico aleatorio). Las notas de venta RIMPE no son electrónicas.
    const sriAccessKey = isNotaVenta
      ? undefined
      : saleData.sriAccessKey || buildAccessKey(settings, '01', invoiceNumber, new Date(saleData.date || now));

    const newSale: SaleRecord = {
      ...saleData,
      id: `sale-${Date.now()}`,
      invoiceNumber,
      documentType: isNotaVenta ? 'nota_venta' : 'factura',
      // La factura queda PENDIENTE hasta que el SRI responda la autorización real
      sriStatus: isNotaVenta ? undefined : 'PENDIENTE',
      sriAccessKey,
      sriAuthorizationDate: undefined,
    };
    setSales(prev => [newSale, ...prev]);
    if (!isNotaVenta) {
      // Envío automático al SRI (firma → recepción → autorización) mediante la API Java
      setTimeout(() => void emitSaleToSri(newSale.id, newSale), 0);
    }

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

    // 0. Factura de varias líneas: cada producto de inventario descarga su propio stock
    if (saleData.items && saleData.items.length > 0) {
      saleData.items.forEach(it => {
        if (!it.inventoryItemId) return;
        const invItem = inventory.find(i => i.id === it.inventoryItemId);
        if (invItem && it.quantity > 0) {
          itemsToDeduct.push({
            itemId: invItem.id,
            name: invItem.name,
            sku: invItem.sku,
            qty: it.quantity,
            type: 'retail_sale',
            concept: `Venta mostrador (${invoiceNumber}) - Cliente: ${saleData.clientName}`,
          });
        }
      });
    } else if (saleData.inventoryItemId) {
      // 1. Si se especificó un ítem directo de inventario (venta mostrador / retail)
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
  /**
   * Devuelve a bodega lo que una venta descontó (productos y consumibles de cabina) y lo registra en el Kardex.
   * Lo usan las notas de crédito y la anulación de comprobantes.
   */
  const restockSaleInventory = (targetSale: SaleRecord, reference: string, concept: string) => {
    const relatedKdx = kardexMovements.filter(m => m.reference === targetSale.invoiceNumber && m.quantityOut > 0);
    if (relatedKdx.length === 0) return;
    const nowIso = new Date().toISOString();
    setInventory(prevInv => {
      const updatedInv = [...prevInv];
      const revMovements: KardexMovement[] = [];
      relatedKdx.forEach(rm => {
        const idx = updatedInv.findIndex(i => i.id === rm.itemId);
        if (idx < 0) return;
        const item = updatedInv[idx];
        const newStock = item.currentStock + rm.quantityOut;
        updatedInv[idx] = { ...item, currentStock: newStock };
        revMovements.push({
          id: `kdx-rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: nowIso,
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          unit: item.unit,
          type: 'adjustment',
          reference,
          concept,
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
      });
      if (revMovements.length > 0) setKardexMovements(prev => [...revMovements, ...prev]);
      return updatedInv;
    });
  };

  /**
   * Anula un comprobante que NO admite nota de crédito:
   *  - facturas a CONSUMIDOR FINAL (anuladas también en SRI en Línea)
   *  - notas de venta
   * La venta se conserva (nunca se borra) marcada como ANULADA; se revierten comisión, propina, caja,
   * contabilidad e inventario, y la cita / proforma vinculadas quedan libres para volver a facturarse.
   */
  const voidSale = (saleId: string, input: VoidSaleInput): SaleRecord => {
    if (!can('sales.void')) throw new Error('Su rol no tiene permiso para anular comprobantes.');
    const sale = salesRef.current.find(x => x.id === saleId);
    if (!sale) throw new Error('No se encontró el comprobante.');
    if (sale.voidedAt || sale.status === 'cancelled') throw new Error('Este comprobante ya está anulado.');
    if (sale.creditNoteNumber) throw new Error('Este comprobante ya fue anulado con una nota de crédito.');
    const isNotaVenta = sale.documentType === 'nota_venta';
    if (!isNotaVenta && !isConsumidorFinal(sale.clientDni)) {
      throw new Error('Una factura con comprador identificado no se anula aquí: se modifica con una nota de crédito.');
    }
    const reason = (input.reason || '').trim();
    if (reason.length < 10) throw new Error('Escriba el motivo de la anulación (mínimo 10 caracteres).');

    const nowIso = new Date().toISOString();
    const u = currentUserRef.current;
    const voided: SaleRecord = {
      ...sale,
      status: 'cancelled',
      voidedAt: nowIso,
      voidReason: reason,
      voidReference: (input.sriReference || '').trim() || undefined,
      voidSriDate: input.sriVoidDate || undefined,
      voidedBy: `${u?.nombres || ''} ${u?.apellidos || ''}`.trim() || u?.username,
      voidRevertedInventory: input.revertInventory,
      sriStatus: isNotaVenta ? sale.sriStatus : 'ANULADO',
    };
    setSales(prev => prev.map(x => (x.id === saleId ? voided : x)));
    salesRef.current = salesRef.current.map(x => (x.id === saleId ? voided : x));

    if (input.revertInventory) {
      restockSaleInventory(
        sale,
        `ANU-${sale.invoiceNumber}`,
        `Reingreso a bodega por anulación de ${isNotaVenta ? 'nota de venta' : 'factura'} ${sale.invoiceNumber}`
      );
    }

    // La cita y la proforma ligadas a esta venta quedan disponibles para facturarse de nuevo
    setAppointments(prev => prev.map(a => (a.saleId === saleId ? { ...a, status: 'in_progress', saleId: undefined } : a)));
    setProformas(prev =>
      prev.map(pf => (pf.saleId === saleId ? { ...pf, status: 'accepted', saleId: undefined, invoiceNumber: undefined } : pf))
    );
    return voided;
  };

  const addCreditNote = async (
    cnData: Omit<CreditNoteRecord, 'id' | 'creditNoteNumber' | 'createdAt' | 'sriStatus'> & { sriStatus?: CreditNoteRecord['sriStatus'] }
  ): Promise<CreditNoteRecord> => {
    // El SRI no permite notas de crédito sobre facturas a consumidor final
    const targetSale = salesRef.current.find(x => x.id === cnData.affectedInvoiceId);
    if (targetSale && isConsumidorFinal(targetSale.clientDni)) {
      throw new Error(CONSUMIDOR_FINAL_CREDIT_NOTE_MESSAGE);
    }
    if (!targetSale && isConsumidorFinal(cnData.clientDni)) {
      throw new Error(CONSUMIDOR_FINAL_CREDIT_NOTE_MESSAGE);
    }

    // Serie propia de notas de crédito (001-001-000000001), independiente de la de facturas
    const creditNoteNumber = await nextDocumentNumber('nota_credito');

    const now = new Date();
    const sriAccessKey = cnData.sriAccessKey || buildAccessKey(settings, '04', creditNoteNumber, now);

    const newCN: CreditNoteRecord = {
      ...cnData,
      id: `cn-${Date.now()}`,
      creditNoteNumber,
      sriAccessKey,
      sriStatus: 'PENDIENTE',
      sriAuthorizationDate: undefined,
      createdAt: now.toISOString(),
    };

    setCreditNotes(prev => [newCN, ...prev]);
    setTimeout(() => void emitCreditNoteToSri(newCN.id, newCN), 0);

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
        restockSaleInventory(
          targetSale,
          newCN.creditNoteNumber,
          `Reingreso a bodega por Nota de Crédito ${newCN.creditNoteNumber} (Fac. ${targetSale.invoiceNumber})`
        );
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
    notes?: string,
    type: 'liquidacion' | 'anticipo' = 'liquidacion'
  ): ArtistSettlement | null => {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return null;

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const isAdvance = type === 'anticipo';
    const commission = round2(Math.max(0, amount));
    const tipsApplied = isAdvance ? 0 : round2(Math.max(0, tips));
    const deductionsApplied = isAdvance ? 0 : round2(Math.max(0, deductions));
    const netPaid = round2(Math.max(0, commission + tipsApplied - deductionsApplied));
    if (commission + tipsApplied <= 0) return null;

    const now = new Date().toISOString();
    const { balance: balanceBefore } = computeArtistBalance(artistId, sales, settlements);
    const balanceAfter = round2(balanceBefore - (commission + tipsApplied));

    // Correlativo independiente para liquidaciones (LIQ) y anticipos (ANT)
    const prefix = isAdvance ? 'ANT' : 'LIQ';
    const lastSeq = settlements.reduce((max, st) => {
      const m = (st.receiptNumber || '').match(isAdvance ? /^ANT-(\d+)$/ : /^LIQ-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const receiptNumber = `${prefix}-${String(lastSeq + 1).padStart(6, '0')}`;

    const settlement: ArtistSettlement = {
      id: `settle-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      artistId,
      artistName: artist.name,
      date: now,
      periodStart: 'Histórico pendiente',
      periodEnd: now.split('T')[0],
      grossSales: 0,
      commissionEarned: commission,
      tipsEarned: tipsApplied,
      deductions: deductionsApplied,
      amountPaid: netPaid,
      paymentMethod,
      status: 'paid',
      type,
      receiptNumber,
      balanceBefore,
      balanceAfter,
      registeredBy: currentUser ? `${currentUser.nombres} ${currentUser.apellidos}`.trim() : undefined,
      notes:
        notes ||
        (isAdvance
          ? `Anticipo de comisiones para ${artist.name}`
          : `Liquidación de comisiones acumuladas para ${artist.name}`),
    };

    setSettlements(prev => [settlement, ...prev]);

    // Registrar el egreso en contabilidad del estudio
    addExpense({
      date: now,
      category: 'artist_payout',
      description: `${isAdvance ? 'Anticipo de Comisiones' : 'Pago de Liquidación de Comisiones'}: ${artist.name}`,
      supplier: artist.name,
      amount: netPaid,
      taxDeductible: true,
      taxAmount: 0,
      paymentMethod: paymentMethod === 'cash' ? 'cash' : 'bank_transfer',
      invoiceReference: receiptNumber,
      notes: isAdvance
        ? `Anticipo (pago parcial) ${receiptNumber}: ${formatMoney(netPaid)}`
        : `Liquidación ${receiptNumber}: comisiones ${formatMoney(commission)} + propinas ${formatMoney(tipsApplied)} - descuentos ${formatMoney(deductionsApplied)}`,
    });

    return settlement;
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
  const addManualJournalEntry = (entryData: Omit<ManualJournalEntry, 'id' | 'entryNumber'> & { entryNumber?: string }) => {
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
  const nextShiftNumber = () => {
    const max = [currentShift, ...pastShifts].reduce((m, sh) => {
      const n = parseInt((sh?.shiftNumber || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return `ARQ-${String(max + 1).padStart(6, '0')}`;
  };

  const openCashShift = (openingCash: number, openedBy: string, notes?: string) => {
    if (currentShift.status === 'open' && currentShift.shiftNumber) return;
    const now = new Date();
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      date: now.toISOString().split('T')[0],
      openedAt: now.toISOString(),
      openedBy: openedBy || `${currentUser.nombres} ${currentUser.apellidos}`.trim() || 'Encargado de Caja',
      openingCash: Math.max(0, Math.round(openingCash * 100) / 100),
      expectedCash: Math.max(0, openingCash),
      actualCashCounted: undefined,
      cardTotal: 0,
      transferTotal: 0,
      cashSalesTotal: 0,
      cashExpensesTotal: 0,
      status: 'open',
      notes: notes || undefined,
      shiftNumber: nextShiftNumber(),
      movements: [],
    };
    setCurrentShift(newShift);
  };

  const addCashMovement = (type: CashMovementType, amount: number, concept: string) => {
    if (currentShift.status !== 'open' || !(amount > 0)) return;
    const movement: CashMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString(),
      type,
      amount: Math.round(amount * 100) / 100,
      concept: concept.trim() || (type === 'ingreso' ? 'Ingreso de efectivo' : type === 'retiro' ? 'Retiro de efectivo' : 'Depósito al banco'),
      registeredBy: `${currentUser.nombres} ${currentUser.apellidos}`.trim(),
    };
    setCurrentShift(prev => ({ ...prev, movements: [...(prev.movements || []), movement] }));
  };

  const removeCashMovement = (id: string) => {
    if (currentShift.status !== 'open') return;
    setCurrentShift(prev => ({ ...prev, movements: (prev.movements || []).filter(m => m.id !== id) }));
  };

  const closeCashShift = (
    actualCounted: number,
    closedBy: string,
    notes?: string,
    denominations?: Record<string, number>
  ): CashShift | null => {
    if (currentShift.status !== 'open') return null;
    const now = new Date().toISOString();
    const shiftAtClose: CashShift = { ...currentShift, closedAt: now };
    const { summary } = computeShiftSummary(shiftAtClose, sales, expenses, creditNotes);
    const counted = Math.round(actualCounted * 100) / 100;
    const discrepancy = Math.round((counted - summary.expectedCash) * 100) / 100;

    const closed: CashShift = {
      ...shiftAtClose,
      shiftNumber: currentShift.shiftNumber || nextShiftNumber(),
      closedBy: closedBy || `${currentUser.nombres} ${currentUser.apellidos}`.trim() || 'Encargado de Caja',
      expectedCash: summary.expectedCash,
      cashSalesTotal: Math.round((summary.cashSales + summary.cashTips) * 100) / 100,
      cashExpensesTotal: Math.round((summary.cashExpenses + summary.cashArtistPayouts + summary.cashRefunds) * 100) / 100,
      cardTotal: summary.cardSales,
      transferTotal: summary.transferSales,
      actualCashCounted: counted,
      discrepancy,
      status: 'closed',
      notes: notes || currentShift.notes,
      closingDenominations: denominations,
      closingSummary: summary,
    };

    setPastShifts(prev => [closed, ...prev.filter(p => p.id !== closed.id)]);
    setCurrentShift(closed);
    return closed;
  };

  // Settings
  const updateSettings = (newSettings: Partial<StudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
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
    persistSession(null);
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
      comprobantesRecibidos,
      users,
      roles,
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
      if (parsed.comprobantesRecibidos && Array.isArray(parsed.comprobantesRecibidos)) setComprobantesRecibidos(parsed.comprobantesRecibidos);
      if (parsed.users && Array.isArray(parsed.users)) setUsers(parsed.users);
      if (parsed.roles && Array.isArray(parsed.roles) && parsed.roles.length > 0) {
        const admin = DEFAULT_ROLES.find(r => r.id === ADMIN_ROLE_ID)!;
        setRoles([
          { ...admin, permissions: ALL_PERMISSIONS },
          ...parsed.roles
            .filter((r: SystemRole) => r && r.id && r.id !== ADMIN_ROLE_ID)
            .map((r: SystemRole) => ({ ...r, permissions: normalizePermissions(r.permissions || []) })),
        ]);
      }
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
        comprobantesRecibidos,
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
        addComprobantesRecibidos,
        updateComprobanteRecibido,
        deleteComprobanteRecibido,
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
        isAuthenticated,
        needsAdminSetup,
        login,
        setupAdminPassword,
        logout,
        changeOwnPassword,
        setUserPassword,
        addUser,
        updateUser,
        deleteUser,
        canAccessTab,
        can,
        roles,
        currentRole,
        getRole,
        addRole,
        updateRole,
        deleteRole,
        addManualJournalEntry,
        updateManualJournalEntry,
        deleteManualJournalEntry,
        openCashShift,
        closeCashShift,
        addCashMovement,
        removeCashMovement,
        currentShiftSummary: currentShiftComputed.summary,
        currentShiftTransactions: currentShiftComputed.transactions,
        updateSettings,
        formatMoney,
        clearAllData,
        exportBackup,
        importBackup,
        filteredSales,
        filteredCreditNotes,
        filteredExpenses,
        accountingEntries,
        accountingPostings,
        emitSaleToSri,
        emitCreditNoteToSri,
        voidSale,
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
  comprobantesRecibidos: [],
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
  completeAndBillAppointment: async () => ({} as any),
  addProforma: async prof => ({ ...prof, id: 'temp-' + Date.now(), createdAt: new Date().toISOString(), proformaNumber: '#000001' }),
  updateProforma: () => {},
  deleteProforma: () => {},
  convertProformaToAppointment: () => ({} as any),
  convertProformaToSale: async () => ({} as any),
  getProformaByAppointmentId: () => undefined,
  addSale: async sale => ({ ...sale, id: 'temp-' + Date.now(), invoiceNumber: '001-001-000000001' }),
  updateSale: () => {},
  deleteSale: () => {},
  addCreditNote: async cn => ({ ...cn, sriStatus: cn.sriStatus || 'PENDIENTE', id: 'temp-' + Date.now(), creditNoteNumber: '001-001-000000001', createdAt: new Date().toISOString() }),
  deleteCreditNote: () => {},
  addComprobantesRecibidos: () => ({ added: 0, duplicates: 0 }),
  updateComprobanteRecibido: () => {},
  deleteComprobanteRecibido: () => {},
  addExpense: (exp) => ({ ...exp, id: 'temp-' + Date.now() }),
  updateExpense: () => {},
  deleteExpense: () => {},
  addArtist: () => {},
  updateArtist: () => {},
  toggleArtistStatus: () => {},
  settleArtistCommissions: () => null,
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
  isAuthenticated: false,
  needsAdminSetup: false,
  login: () => ({ ok: false }),
  setupAdminPassword: () => ({ ok: false }),
  logout: () => {},
  changeOwnPassword: () => ({ ok: false }),
  setUserPassword: () => ({ ok: false }),
  addUser: (u) => ({ ...u, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }),
  updateUser: () => {},
  deleteUser: () => {},
  canAccessTab: () => true,
  can: () => true,
  roles: DEFAULT_ROLES,
  currentRole: null,
  getRole: () => undefined,
  addRole: () => null,
  updateRole: () => false,
  deleteRole: () => ({ ok: false }),
  addManualJournalEntry: () => {},
  updateManualJournalEntry: () => {},
  deleteManualJournalEntry: () => {},
  openCashShift: () => {},
  closeCashShift: () => null,
  addCashMovement: () => {},
  removeCashMovement: () => {},
  currentShiftSummary: computeShiftSummary(INITIAL_CASH_SHIFT, [], [], []).summary,
  currentShiftTransactions: [],
  updateSettings: () => {},
  formatMoney: (val) => `$${Number(val || 0).toFixed(2)}`,
  clearAllData: () => {},
  exportBackup: () => {},
  importBackup: () => false,
  filteredSales: INITIAL_SALES,
  filteredCreditNotes: INITIAL_CREDIT_NOTES,
  filteredExpenses: INITIAL_EXPENSES,
  accountingEntries: [],
  accountingPostings: [],
  emitSaleToSri: async () => null,
  voidSale: () => ({} as SaleRecord),
  emitCreditNoteToSri: async () => null,
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
