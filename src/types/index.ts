export type ServiceCategory = 
  | 'tattoo' 
  | 'piercing' 
  | 'jewelry' 
  | 'aftercare' 
  | 'other';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'split';

export type SaleStatus = 'completed' | 'deposit_only' | 'pending_balance' | 'cancelled';

export interface SaleRecord {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string or YYYY-MM-DD
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDni?: string;
  serviceCategory: ServiceCategory;
  serviceName: string; // e.g., "Tatuaje Realismo Black & Grey", "Piercing Nostril + Joya Titanio"
  artistId: string;
  artistName: string;
  hours?: number; // For tattoos
  pieces?: number; // Quantity
  subtotal: number;
  discount: number;
  taxRate: number; // e.g. 0, 16, 21 (%)
  taxAmount: number;
  total: number;
  depositAmount: number; // Seña previa
  amountPaidNow: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  cashPaid?: number;
  cardPaid?: number;
  transferPaid?: number;
  tipAmount: number;
  artistCommissionPercent: number; // e.g. 60
  artistShare: number; // (total - insumos/tax) * %
  studioShare: number;
  materialCostDeducted?: number; // Insumos cobrados al artista si aplica
  status: SaleStatus;
  consentFormSigned: boolean; // Consentimiento informado de salud
  notes?: string;
}

export type ExpenseCategory =
  | 'supplies_tattoo'    // Tintas, agujas, grips, papel hectográfico
  | 'supplies_piercing'  // Cánulas, agujas americanas, pinzas estériles
  | 'jewelry_restock'    // Joyería en bruto para reventa (Titanio ASTM F136, oro)
  | 'hygiene_sanitary'   // Guantes nitrilo, film, autoclave, contenedores biológicos
  | 'rent_studio'        // Alquiler del local
  | 'utilities'          // Electricidad, agua, internet
  | 'software_terminals' // Comisiones TPV, software, datáfono
  | 'marketing_ads'      // Redes sociales, cartelería, eventos
  | 'artist_payout'      // Liquidaciones pagadas a tatuadores
  | 'maintenance'        // Mobiliario, camillas, autoclaves
  | 'taxes_licenses'     // Impuestos, licencias de sanidad
  | 'other_expense';

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  supplier: string;
  amount: number;
  taxDeductible: boolean;
  taxAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card';
  invoiceReference?: string;
  notes?: string;
}

export interface Artist {
  id: string;
  name: string;
  nickname?: string;
  role: 'Tatuador' | 'Tatuadora' | 'Piercer' | 'Residente' | 'Invitado / Guest';
  specialty: string; // e.g. "Blackwork & Neo-Tradicional", "Microrealismo", "Body Piercing & Curación"
  defaultCommissionRate: number; // e.g. 65 (%)
  stationRentMonthly?: number; // Tarifa fija de alquiler de cabina si aplica
  phone: string;
  email?: string;
  active: boolean;
  avatarColor: string;
}

export interface ArtistSettlement {
  id: string;
  artistId: string;
  artistName: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  grossSales: number;
  commissionEarned: number;
  tipsEarned: number;
  deductions: number; // Insumos o adelantos
  amountPaid: number;
  paymentMethod: 'cash' | 'transfer';
  status: 'paid' | 'pending';
  notes?: string;
}

export type InventoryCategory =
  | 'ink'           // Tintas
  | 'cartridge'     // Cartuchos y agujas
  | 'jewelry'       // Joyería piercing
  | 'aftercare'     // Cremas, bálsamos cicatrizantes
  | 'hygiene'       // Guantes, papel, desinfectante
  | 'equipment';    // Grip, fuentes, autoclave

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: InventoryCategory;
  currentStock: number;
  minStockAlert: number;
  unit: string; // 'piezas', 'cajas', 'ml', 'frascos'
  unitCost: number; // Costo de compra
  retailPrice?: number; // Precio de venta (si es joyería o aftercare)
  isForSale: boolean; // Si se vende al cliente o es insumo interno
  location?: string;
  sku?: string;
  notes?: string;
}

export type KardexMovementType =
  | 'initial'       // Inventario inicial
  | 'purchase_in'   // Entrada por compra / reposición
  | 'cabin_out'     // Salida por consumo en cabina (tatuaje/piercing)
  | 'retail_sale'   // Salida por venta en mostrador
  | 'adjustment';   // Ajuste de inventario / merma sanitaria

export interface KardexMovement {
  id: string;
  date: string; // ISO string
  itemId: string;
  itemName: string;
  itemSku?: string;
  unit: string;
  type: KardexMovementType;
  reference: string; // e.g. "INV-KILLER-9482", "CABINA-1", "FAC-2026-0184"
  concept: string;
  responsible?: string; // Artista o encargado
  quantityIn: number;
  unitCostIn: number;
  totalIn: number;
  quantityOut: number;
  unitCostOut: number;
  totalOut: number;
  balanceQty: number; // Saldo en existencia tras el movimiento
  balanceUnitCost: number; // Costo promedio ponderado
  balanceTotal: number; // Saldo valorizado total
}

export interface ManualJournalEntry {
  id: string;
  date: string;
  reference: string;
  concept: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  notes?: string;
}

export interface CashShift {
  id: string;
  date: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  openingCash: number; // Fondo inicial de caja
  expectedCash: number; // Calculado del día
  actualCashCounted?: number;
  discrepancy?: number; // counted - expected (0 = exacto)
  cardTotal: number;
  transferTotal: number;
  cashSalesTotal: number;
  cashExpensesTotal: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface StudioSettings {
  studioName: string;
  taxId: string; // CIF / NIF / RFC / RUT
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string; // '$', '€', 'MXN', 'COP'
  currencyCode: string;
  defaultTaxRate: number; // e.g. 16, 21, or 0
  defaultArtistCommission: number; // e.g. 60%
  receiptFooterMessage: string;
  healthSanitaryRegistration: string; // N° registro sanitario de la clínica/estudio
}

export type DateFilterRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export type AppointmentStatus =
  | 'scheduled'     // Agendada / Reservada
  | 'confirmed'     // Confirmada con cliente (vía WhatsApp/teléfono)
  | 'in_progress'   // En cabina realizándose
  | 'completed'     // Finalizada (lista para cobrar o ya facturada)
  | 'no_show'       // No asistió / Incomparecencia
  | 'cancelled';    // Cancelada

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientInstagram?: string;
  artistId: string;
  artistName: string;
  serviceCategory: ServiceCategory;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "11:00")
  endTime: string; // HH:mm (e.g. "14:30")
  estimatedHours: number;
  estimatedPrice: number; // in USD $
  depositAmount: number; // Seña o anticipo cobrado
  depositPaid: boolean;
  depositPaymentMethod?: PaymentMethod;
  bodyPlacement?: string; // Ej: "Antebrazo exterior", "Costillas", "Nostril izquierdo"
  sizeApprox?: string; // Ej: "15x10 cm", "Flash pequeño"
  status: AppointmentStatus;
  consentSigned: boolean;
  notes?: string;
  designNotes?: string;
  saleId?: string; // ID de la venta si ya fue facturada en POS
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  dni?: string;
  instagram?: string;
  birthDate?: string;
  bloodType?: string;
  allergies?: string; // Látex, lidocaína, níquel, apósitos adhesivos
  medicalConditions?: string; // Anticoagulantes, diabetes, queloides, dermatitis
  skinNotes?: string; // Piel sensible, buena cicatrización, prefiere film
  tags?: string[]; // VIP, Frecuente, Coleccionista, Piel Sensible
  consentSigned: boolean;
  emergencyContact?: string;
  notes?: string;
  createdAt: string;
}

export type ProformaStatus = 'draft' | 'pending' | 'accepted' | 'converted' | 'expired';

export interface ProformaItem {
  id: string;
  concept: string;
  category: ServiceCategory;
  hours?: number;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proforma {
  id: string;
  proformaNumber: string; // Ej: PROF-2026-0042
  date: string;
  validUntil: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDni?: string;
  clientInstagram?: string;
  artistId: string;
  artistName: string;
  serviceCategory: ServiceCategory;
  serviceName: string;
  bodyPlacement?: string;
  sizeApprox?: string;
  complexity?: 'Sencillo / Flash' | 'Medio' | 'Complejo / Detallado' | 'Gran Formato';
  items: ProformaItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  suggestedDeposit: number; // Anticipo / seña sugerida
  estimatedHours?: number;
  termsAndConditions?: string;
  notes?: string;
  appointmentId?: string; // Si se originó al agendar cita o generó una cita
  appointmentDate?: string;
  appointmentTime?: string;
  status: ProformaStatus;
  createdAt: string;
}
