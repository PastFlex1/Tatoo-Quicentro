import {
  Artist,
  ExpenseRecord,
  InventoryItem,
  SaleRecord,
  StudioSettings,
  CashShift,
  Appointment,
  KardexMovement,
  ClientProfile,
  Proforma,
  CompanyConfig,
  GalleryPhoto,
  Supplier,
  PurchaseOrder,
  SystemUser,
  UserRole,
  CreditNoteRecord,
  ManualJournalEntry,
} from '../types';

export { INITIAL_COMPANY, DEVOLUTION_INK_COMPANY } from './initialCompany';

export const INITIAL_SETTINGS: StudioSettings = {
  // Parámetros comerciales y de estudio
  studioName: 'Devolution Ink Tattoo Studio',
  taxId: '1792847102001',
  address: 'C.C. Quicentro Shopping, Local 214, Av. Naciones Unidas y 6 de Diciembre, Quito, Ecuador',
  phone: '+593 99 123 4567',
  email: 'contacto@devolutionink.com',
  website: 'www.devolutionink.com',
  currency: '$',
  currencyCode: 'USD',
  defaultTaxRate: 15,
  defaultArtistCommission: 80,
  receiptFooterMessage: '¡Gracias por confiar en Devolution Ink Tattoo Studio! Sigue rigurosamente las pautas sanitarias de curación y cuidado posterior.',
  healthSanitaryRegistration: 'REG-SAN-ARCSA-2026',

  // Configuración oficial SRI (Servicio de Rentas Internas de Ecuador)
  ruc: '1792847102001',
  razonSocial: 'DEVOLUTION INK TATTOO STUDIO S.A.S.',
  nombreComercial: 'Devolution Ink Tattoo Studio',
  dirMatriz: 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito, Ecuador',
  dirEstablecimiento: 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Local 214, Quito, Ecuador',
  pais: 'ECUADOR',
  provincia: 'PICHINCHA',
  ciudad: 'QUITO',
  parroquia: 'IÑAQUITO',
  telefono: '+593 99 123 4567',
  codigoEstablecimiento: '001',
  puntoEmision: '001',
  secuencialFactura: '000000001',
  secuencialNotaVenta: '000000001',
  regimenTributario: 'RIMPE_EMPRENDEDOR',
  obligadoContabilidad: 'NO',
  agenteRetencion: 'NO',
  ambiente: 'PRUEBAS',
  tipoEmision: 'NORMAL',
};

// =====================================================================
// La aplicación arranca VACÍA: sin ventas, clientes, artistas ni asientos
// de demostración. Solo se crea un usuario administrador inicial.
// =====================================================================

export const INITIAL_ARTISTS: Artist[] = [];
export const INITIAL_SALES: SaleRecord[] = [];
export const INITIAL_CREDIT_NOTES: CreditNoteRecord[] = [];
export const INITIAL_EXPENSES: ExpenseRecord[] = [];
export const INITIAL_INVENTORY: InventoryItem[] = [];
export const INITIAL_KARDEX: KardexMovement[] = [];
export const INITIAL_APPOINTMENTS: Appointment[] = [];
export const INITIAL_CLIENTS: ClientProfile[] = [];
export const INITIAL_PROFORMAS: Proforma[] = [];
export const INITIAL_GALLERY_PHOTOS: GalleryPhoto[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const INITIAL_JOURNAL_ENTRIES: ManualJournalEntry[] = [];

export const INITIAL_CASH_SHIFT: CashShift = {
  id: 'shift-initial',
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

export const getDefaultTabsForRole = (role: UserRole): string[] => {
  switch (role) {
    case 'ADMIN':
      return [
        'dashboard',
        'pos',
        'clients',
        'gallery',
        'appointments',
        'proformas',
        'sales',
        'expenses',
        'suppliers',
        'purchase-orders',
        'artists',
        'cash',
        'inventory',
        'kardex',
        'ledger',
        'reports',
        'users',
        'settings',
      ];
    case 'CAJERO_RECEPCION':
      return [
        'dashboard',
        'pos',
        'clients',
        'gallery',
        'appointments',
        'proformas',
        'sales',
        'cash',
      ];
    case 'ARTISTA':
      return [
        'appointments',
        'clients',
        'gallery',
        'proformas',
        'artists',
      ];
    case 'BODEGA':
      return [
        'inventory',
        'kardex',
        'suppliers',
        'purchase-orders',
        'expenses',
      ];
    case 'CONTADOR':
      return [
        'dashboard',
        'sales',
        'expenses',
        'suppliers',
        'purchase-orders',
        'cash',
        'ledger',
        'reports',
      ];
    default:
      return ['dashboard'];
  }
};

/** Usuario administrador inicial. Asigne un PIN desde Usuarios & Permisos. */
export const INITIAL_USERS: SystemUser[] = [
  {
    id: 'usr-1',
    cedula: '',
    nombres: 'Administrador',
    apellidos: '',
    username: 'admin',
    email: '',
    telefono: '',
    rol: 'ADMIN',
    estado: 'ACTIVO',
    createdAt: new Date().toISOString(),
  },
];

/**
 * IDs de los registros de demostración que traían versiones anteriores.
 * Se usan una sola vez para limpiarlos del navegador sin tocar los datos reales.
 * (El usuario usr-1 se conserva porque es el administrador.)
 */
export const LEGACY_DEMO_IDS: Record<string, string[]> = {
  "INITIAL_ARTISTS": [
    "art-1",
    "art-2",
    "art-3",
    "art-4"
  ],
  "INITIAL_SALES": [
    "sale-001",
    "sale-002",
    "sale-003",
    "sale-004",
    "sale-005",
    "sale-006",
    "sale-007",
    "sale-008"
  ],
  "INITIAL_CREDIT_NOTES": [
    "nc-001",
    "nc-002"
  ],
  "INITIAL_EXPENSES": [
    "exp-001",
    "exp-002",
    "exp-003",
    "exp-004",
    "exp-005",
    "exp-006",
    "exp-007",
    "exp-008"
  ],
  "INITIAL_INVENTORY": [
    "inv-1",
    "inv-2",
    "inv-3",
    "inv-4",
    "inv-5",
    "inv-6",
    "inv-7",
    "inv-8",
    "inv-9"
  ],
  "INITIAL_KARDEX": [
    "kdx-001",
    "kdx-002",
    "kdx-003",
    "kdx-004",
    "kdx-005",
    "kdx-006",
    "kdx-007",
    "kdx-008",
    "kdx-009",
    "kdx-010",
    "kdx-011"
  ],
  "INITIAL_APPOINTMENTS": [
    "apt-001",
    "apt-002",
    "apt-003",
    "apt-004",
    "apt-005",
    "apt-006",
    "apt-007"
  ],
  "INITIAL_CLIENTS": [
    "cli-001",
    "cli-002",
    "cli-003",
    "cli-004",
    "cli-005",
    "cli-006",
    "cli-007",
    "cli-008"
  ],
  "INITIAL_PROFORMAS": [
    "prof-001",
    "prof-002",
    "prof-003",
    "prof-004"
  ],
  "INITIAL_GALLERY_PHOTOS": [
    "gal-1",
    "gal-2",
    "gal-3",
    "gal-4",
    "gal-5",
    "gal-6",
    "gal-7",
    "gal-8"
  ],
  "INITIAL_SUPPLIERS": [
    "sup-1",
    "sup-2",
    "sup-3",
    "sup-4",
    "sup-5",
    "sup-6"
  ],
  "INITIAL_PURCHASE_ORDERS": [
    "po-1",
    "po-2",
    "po-3",
    "po-4"
  ],
  "INITIAL_JOURNAL_ENTRIES": [
    "jrnl-001",
    "jrnl-002",
    "jrnl-003",
    "jrnl-004"
  ]
};
export const LEGACY_DEMO_USER_IDS = ["usr-2", "usr-3", "usr-4", "usr-5", "usr-6"];
