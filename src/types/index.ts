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
  inventoryItemId?: string; // ID del producto de inventario vendido directamente
  consumedSupplies?: { itemId: string; name: string; quantity: number }[]; // Consumibles descargados en cabina
  status: SaleStatus;
  consentFormSigned: boolean; // Consentimiento informado de salud
  consentDocumentUrl?: string; // URL o Base64 del consentimiento firmado subido para este procedimiento
  consentFileName?: string; // Nombre del archivo del consentimiento firmado
  consentSignedAt?: string; // Fecha/hora de subida del consentimiento firmado
  documentType?: 'factura' | 'nota_venta'; // Factura (Tipo 01) o Nota de Venta RIMPE (Tipo 02)
  sriStatus?: SriDocumentStatus;
  sriAccessKey?: string;
  sriAuthorizationDate?: string;
  sriAuthorizationNumber?: string;
  /** Mensajes devueltos por el SRI (errores / advertencias) */
  sriMessages?: string[];
  /** XML autorizado devuelto por el SRI */
  sriAuthorizedXml?: string;
  creditNoteId?: string;
  creditNoteNumber?: string;
  notes?: string;
}

export type CreditNoteReason =
  | 'ANULACION_TOTAL'
  | 'DEVOLUCION_MERCADERIA'
  | 'DESCUENTO_BONIFICACION'
  | 'ERROR_DATOS';

/**
 * Estado del comprobante electrónico ante el SRI.
 * PENDIENTE = aún no enviado · EN_PROCESO = enviado, esperando autorización
 * RECHAZADO = devuelto / no autorizado · ERROR = falla de conexión o configuración
 */
export type SriDocumentStatus = 'PENDIENTE' | 'EN_PROCESO' | 'AUTORIZADO' | 'RECHAZADO' | 'ERROR' | 'ANULADO';

export interface CreditNoteRecord {
  id: string;
  creditNoteNumber: string; // ej. 001-001-000000001
  date: string;
  affectedInvoiceId: string;
  affectedInvoiceNumber: string;
  affectedInvoiceDate: string;
  clientName: string;
  clientDni?: string;
  clientEmail?: string;
  clientPhone?: string;
  reason: CreditNoteReason;
  reasonDescription: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  sriAccessKey?: string;
  sriStatus: SriDocumentStatus;
  sriAuthorizationDate?: string;
  sriAuthorizationNumber?: string;
  sriMessages?: string[];
  sriAuthorizedXml?: string;
  revertInventory?: boolean;
  notes?: string;
  createdAt: string;
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
  supplierRuc?: string;
  sriAccessKey?: string;
  sriStatus?: 'AUTORIZADO' | 'PENDIENTE' | 'RECHAZADO' | 'ANULADO';
  sriAuthorizationDate?: string;
  documentType?: 'factura' | 'nota_venta' | 'liquidacion_compra';
  subtotal?: number;
  taxRate?: number;
}

export type SupplierCategory =
  | 'insumos_tatuaje'
  | 'joyeria_piercing'
  | 'bioseguridad'
  | 'aftercare'
  | 'servicios'
  | 'alquiler'
  | 'otros';

export interface Supplier {
  id: string;
  ruc: string; // 13 dígitos según catastro SRI
  razonSocial: string;
  nombreComercial?: string;
  categoria: SupplierCategory;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  diasCredito?: number; // 0 = Contado, 15, 30, 45, 60 días
  cupoCredito?: number; // Cantidad / cupo máximo de crédito asignado en USD ($)
  bancoNombre?: string;
  bancoTipoCuenta?: 'CORRIENTE' | 'AHORROS';
  bancoNumeroCuenta?: string;
  retencionIvaPorcentaje?: number; // 0, 30, 70, 100%
  retencionRentaPorcentaje?: number; // 1.75, 2.75, 8%
  estado: 'ACTIVO' | 'INACTIVO';
  notas?: string;
  createdAt: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  inventoryItemId?: string;
  code?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
  taxRate: number; // e.g. 15 or 0
  taxAmount: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string; // ej. OC-2026-0001
  date: string; // YYYY-MM-DD
  expectedDate?: string;
  supplierId: string;
  supplierName: string;
  supplierRuc: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: PurchaseOrderStatus;
  paymentTerms?: string; // Contado, Crédito 15 días, Crédito 30 días
  paymentMethod?: 'bank_transfer' | 'cash' | 'credit_card';
  notes?: string;
  receivedAt?: string;
  receivedBy?: string;
  invoiceReference?: string;
  createdAt: string;
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
  /** Cédula / pasaporte del artista (aparece en el comprobante de pago) */
  dni?: string;
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
  /** 'liquidacion' = pago total/normal de comisiones; 'anticipo' = pago parcial adelantado */
  type?: 'liquidacion' | 'anticipo';
  /** Número correlativo del comprobante de pago (LIQ-000001 / ANT-000001) */
  receiptNumber?: string;
  /** Saldo pendiente del artista antes y después de este pago */
  balanceBefore?: number;
  balanceAfter?: number;
  /** Usuario del sistema que registró el pago */
  registeredBy?: string;
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
  supplier?: string; // Proveedor / Distribuidor
  taxRate?: VatRateType; // Tarifa SRI: 15, 5, 0, NO_OBJETO, EXENTO
  priceWithoutVat?: number; // PVP sin IVA (Subtotal base)
  priceWithVat?: number; // PVP final con IVA
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

export interface JournalEntryLine {
  id: string;
  accountId?: string;
  accountCode: string;
  accountName?: string;
  concept?: string;
  detalle?: string;
  debit: number;
  credit: number;
  debe?: number;
  haber?: number;
}

export type JournalEntryType = 'diario' | 'ajuste' | 'apertura' | 'cierre';

export interface ManualJournalEntry {
  id: string;
  entryNumber: string; // ej. ASI-2026-0001
  date: string;
  reference: string;
  concept: string;
  entryType?: JournalEntryType;
  lines?: JournalEntryLine[];
  // Campos de compatibilidad:
  debitAccountCode?: string;
  creditAccountCode?: string;
  amount?: number;
  totalDebit?: number;
  totalCredit?: number;
  status?: 'cuadrado' | 'anulado';
  notes?: string;
  createdByName?: string;
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

export type SriRegimenTributario =
  | 'RIMPE_EMPRENDEDOR'
  | 'RIMPE_NEGOCIO_POPULAR'
  | 'GENERAL'
  | 'REGIMEN GENERAL';

export type SriAmbiente = '1' | '2' | 'PRUEBAS' | 'PRODUCCION';

export type SriDocumentType = '01' | '02' | '03' | '04' | '05' | '06' | '07';

export type IdentificationType = '04' | '05' | '06' | '07' | '08';
// 04 = RUC, 05 = Cédula, 06 = Pasaporte, 07 = Consumidor Final, 08 = Identificación Exterior

export type SriTaxRegime =
  | 'GENERAL'
  | 'RIMPE_EMPRENDEDOR'
  | 'RIMPE_NEGOCIO_POPULAR'
  | 'ARTESANO_CALIFICADO';

export type TaxRegime = SriTaxRegime;

export type SriEnvironment = '1' | '2'; // 1 = Pruebas, 2 = Producción
export type SriEmissionType = '1'; // 1 = Normal

export type VatRateType = 15 | 5 | 0 | 'NO_OBJETO' | 'EXENTO';

export type SriPaymentMethod = '01' | '16' | '19' | '20' | '21';

export type AccountCategory = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESOS' | 'COSTOS' | 'GASTOS';
export type AccountType = AccountCategory;
export type AccountNature = 'DEUDORA' | 'ACREEDORA';

export interface Account {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: AccountCategory;
  naturaleza: AccountNature;
  padreId?: string;
  permiteMovimiento?: boolean;
  esNIIF?: boolean;

  // Backwards compatibility aliases
  code?: string;
  name?: string;
  level?: number;
  category?: AccountCategory;
  nature?: AccountNature;
  parentCode?: string;
  isAssignable?: boolean;
  balance?: number;
}

export interface CompanyConfig {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  dirMatriz?: string;
  dirEstablecimiento?: string;
  pais?: string; // ej: "ECUADOR"
  provincia?: string; // ej: "PICHINCHA"
  ciudad?: string; // ej: "QUITO"
  parroquia?: string; // ej: "IÑAQUITO"
  codigoEstablecimiento?: string; // ej: "001"
  puntoEmision?: string; // ej: "001"
  secuencialFactura?: string; // ej: "000000001" (9 dígitos SRI)
  secuencialNotaVenta?: string; // ej: "000000001" (9 dígitos SRI)
  obligadoContabilidad?: 'SI' | 'NO';
  regimenTributario?: SriTaxRegime | SriRegimenTributario | string;
  contribuyenteEspecial?: string; // Número de resolución si aplica
  agenteRetencion?: string; // Número de resolución si aplica (o 'SI' | 'NO')
  ambiente?: SriEnvironment | SriAmbiente;
  tipoEmision?: SriEmissionType | 'NORMAL' | '1';
  email?: string;
  telefono?: string;
  logoUrl?: string;
  /** URL de la API Java de facturación electrónica SRI (por defecto http://localhost:8081) */
  sriApiUrl?: string;
  /** Nombre del representante legal (firma en comprobantes de pago a artistas) */
  representanteLegal?: string;
  representanteLegalCedula?: string;
  tarifaIvaPredeterminada?: VatRateType; // Permite elegir entre 15, 5, 0, etc. como predeterminado
  // Firma Electrónica (.p12 / .pfx) y Base64
  firmaElectronicaBase64?: string;
  firmaElectronicaNombre?: string;
  firmaElectronicaNombreArchivo?: string;
  firmaElectronicaTamanio?: number; // en bytes
  firmaElectronicaClave?: string; // Contraseña del certificado digital
  firmaElectronicaFechaCarga?: string;
  firmaElectronicaEmisor?: string; // Entidad Certificadora (BCE, Security Data, ANFAC, etc.)
  firmaElectronicaFechaExpiracion?: string;
  firmaElectronicaFechaCaducidad?: string;
  firmaElectronicaValida?: boolean;
}

export interface StudioSettings extends CompanyConfig {
  studioName: string;
  taxId: string; // RUC del Contribuyente en Ecuador
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string; // '$' Dólar estadounidense (USD)
  currencyCode: string; // 'USD'
  defaultTaxRate: number; // e.g. 15 (%)
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
  consentDocumentUrl?: string; // URL o Base64 del consentimiento firmado subido para esta cita/procedimiento
  consentFileName?: string;
  consentSignedAt?: string;
  notes?: string;
  designNotes?: string;
  saleId?: string; // ID de la venta si ya fue facturada en POS
  createdAt: string;
}

export interface ProcedureConsentRecord {
  id: string;
  procedureType: 'sale' | 'appointment' | 'manual';
  procedureRefId?: string; // sale.id o appointment.id
  invoiceOrRefNumber?: string; // N° de factura o referencia de cita
  serviceName: string;
  serviceCategory?: ServiceCategory;
  artistName: string;
  date: string; // Fecha del procedimiento
  bodyPlacement?: string; // Zona anatómica del tatuaje o piercing
  fileDataUrl: string; // Base64 imagen/PDF o enlace del documento firmado por el cliente
  fileName: string;
  notes?: string;
  uploadedAt: string;
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
  procedureConsents?: ProcedureConsentRecord[]; // Historial de consentimientos firmados subidos por cada procedimiento
  emergencyContact?: string;
  notes?: string;
  createdAt: string;
  // Metadatos SRI & Facturación Electrónica Ecuador
  tradeName?: string;
  taxpayerType?: string;
  taxpayerRegime?: string; // GENERAL, RIMPE - Emprendedor, RIMPE - Negocio Popular
  sriStatus?: string; // ACTIVO, SUSPENDIDO
  sriVerified?: boolean;
  address?: string;
}

export type GalleryCategory = 'all' | 'tattoo' | 'piercing' | 'healed' | 'flash' | 'coverup';

export interface GalleryPhoto {
  id: string;
  title: string;
  imageUrl: string;
  category: 'tattoo' | 'piercing' | 'healed' | 'flash' | 'coverup';
  artistId?: string;
  artistName?: string;
  clientId?: string;
  clientName?: string;
  date: string; // YYYY-MM-DD o ISO
  bodyPlacement?: string; // e.g. Antebrazo, Costillas, Pierna, Hélice, Nostril
  style?: string; // e.g. Realismo Sombras, Blackwork, Neotradicional, Fineline
  description?: string;
  tags?: string[];
  isHealed?: boolean;
  sessionHours?: number;
  featured?: boolean;
  createdAt: string;
}

export type ProformaStatus = 'draft' | 'pending' | 'accepted' | 'converted' | 'invoiced' | 'expired';

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
  saleId?: string; // ID de la venta/factura si fue convertida en factura
  invoiceNumber?: string; // N° de factura / comprobante generado
  status: ProformaStatus;
  createdAt: string;
}

// ============================================================================
// COMPROBANTES ELECTRÓNICOS SRI, CLIENTES, PROVEEDORES & RETENCIONES
// ============================================================================

export interface CustomerOrSupplier {
  id: string;
  tipoIdentificacion: IdentificationType;
  identificacion: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion: string;
  telefono: string;
  email: string;
  tipoContribuyente: SriTaxRegime | 'CONTRIBUYENTE_ESPECIAL' | 'SOCIEDAD' | 'PERSONA_NATURAL';
  esCliente: boolean;
  esProveedor: boolean;
}

export interface InvoiceItem {
  id: string;
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tarifaIva: VatRateType;
  precioTotalSinImpuesto: number;
  valorIva: number;
  valorTotal: number;
  cuentaVentasId?: string; // Cuenta contable vinculada
}

export interface PaymentDetail {
  formaPago: SriPaymentMethod;
  total: number;
  plazo?: number;
  unidadTiempo?: 'DIAS' | 'MESES' | 'ANIOS';
  numeroTransferencia?: string;
}

export interface ElectronicInvoice {
  id: string;
  tipoDocumento: '01'; // Factura
  establecimiento: string; // '001'
  puntoEmision: string; // '001'
  secuencial: string; // '000000001'
  numeroComprobante: string; // '001-001-000000001'
  claveAcceso: string;
  fechaEmision: string; // YYYY-MM-DD
  cliente: CustomerOrSupplier;
  items: InvoiceItem[];
  subtotal15: number;
  subtotal5: number;
  subtotal0: number;
  subtotalNoObjeto: number;
  subtotalExento: number;
  totalDescuento: number;
  subtotalSinImpuestos: number;
  totalIva: number;
  propina: number;
  importeTotal: number;
  pagos: PaymentDetail[];
  estado: 'AUTORIZADO' | 'PENDIENTE' | 'ANULADO';
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  asientoId?: string;
  observaciones?: string;
  xml?: string;
}

export interface SaleNoteItem {
  id: string;
  codigoPrincipal?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  valorTotal: number;
  productoId?: string;
}

export interface SaleNote {
  id: string;
  tipoDocumento: '02'; // 02 = Nota de Venta SRI
  establecimiento: string; // '001'
  puntoEmision: string; // '001'
  secuencial: string; // '000000001'
  numeroComprobante: string; // '001-001-000000001'
  autorizacionSri?: string;
  claveAcceso?: string;
  fechaEmision: string; // YYYY-MM-DD
  cliente: CustomerOrSupplier;
  items: SaleNoteItem[];
  total: number;
  formaPago: SriPaymentMethod;
  estado: 'EMITIDA' | 'PAGADA' | 'ANULADA';
  regimenLeyenda: string; // 'CONTRIBUYENTE RÉGIMEN RIMPE - NEGOCIO POPULAR'
  asientoId?: string;
  observaciones?: string;
  esElectronica?: boolean;
  numeroTransferencia?: string;
}

export interface CreditNoteItem {
  id: string;
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tarifaIva: VatRateType;
  precioTotalSinImpuesto: number;
  valorIva: number;
  valorTotal: number;
  productoId?: string;
  cuentaContableId?: string;
}

export type CreditNoteReasonType =
  | 'DEVOLUCION_MERCADERIA'
  | 'DESCUENTO_BONIFICACION'
  | 'ANULACION_OPERACION'
  | 'AJUSTE_PRECIO'
  | 'OTRO';

export interface CreditNote {
  id: string;
  tipoDocumento: '04'; // 04 = Nota de Crédito SRI
  establecimiento: string; // '001'
  puntoEmision: string; // '001'
  secuencial: string; // '000000001'
  numeroComprobante: string; // '001-001-000000001'
  claveAcceso: string;
  fechaEmision: string; // YYYY-MM-DD
  cliente: CustomerOrSupplier;
  documentoModificado: {
    tipo: '01'; // Factura
    numero: string; // '001-001-000000001'
    fechaEmision: string; // YYYY-MM-DD
    facturaId?: string;
  };
  motivo: string; // Motivo SRI (e.g. "Devolución parcial de mercaderías")
  tipoMotivo: CreditNoteReasonType;
  items: CreditNoteItem[];
  subtotal15: number;
  subtotal5: number;
  subtotal0: number;
  subtotalNoObjeto: number;
  subtotalExento: number;
  totalDescuento: number;
  subtotalSinImpuestos: number;
  totalIva: number;
  valorModificacion: number; // Importe Total de la Nota de Crédito
  estado: 'AUTORIZADO' | 'PENDIENTE' | 'ANULADO';
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  asientoId?: string;
  movimientoStockId?: string;
  reingresarInventario?: boolean;
  bodegaId?: string;
  observaciones?: string;
  xml?: string;
}

export interface RetentionFuenteItem {
  codigoSri: string; // ej. "312", "303", "304", "343", "320"
  descripcion: string;
  baseImponible: number;
  porcentaje: number;
  valorRetenido: number;
}
export type RetentionFuenteDetail = RetentionFuenteItem;

export interface RetentionIvaItem {
  codigoSri: string; // "1" (30%), "2" (70%), "3" (100%), "7" (20%), "8" (50%), "9" (10%)
  porcentaje: number;
  baseImponibleIva: number;
  valorRetenido: number;
}
export type RetentionIvaDetail = RetentionIvaItem;

export interface RetentionDocument {
  id: string;
  tipoDocumento: '07'; // Comprobante de Retención
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  numeroComprobante: string;
  claveAcceso: string;
  fechaEmision: string;
  proveedor: CustomerOrSupplier;
  ejercicioFiscal: string; // MM/YYYY ej. "09/2026"
  documentoSustento: {
    tipo: '01' | '03' | '05'; // 01 Factura, 03 Liquidación, 05 Nota Débito
    numero: string; // 001-001-000123456
    fechaEmision: string;
    totalFactura: number;
  };
  retencionesFuente: RetentionFuenteItem[];
  retencionesIva: RetentionIvaItem[];
  totalRetenidoFuente: number;
  totalRetenidoIva: number;
  totalRetenido: number;
  estado: 'AUTORIZADO' | 'PENDIENTE' | 'ANULADO';
  asientoId?: string;
  xml?: string;
}

export interface PurchaseInvoice {
  id: string;
  tipoDocumento: '01' | '02' | '03' | '04' | '05';
  numeroComprobante: string; // '001-002-000045612'
  autorizacionSri: string;
  claveAcceso?: string;
  fechaEmision: string;
  fechaRegistro: string;
  proveedor: CustomerOrSupplier;
  sustentoTributario: string; // '01' = Crédito Tributario para IVA y Costo/Gasto
  descripcion: string;
  subtotal15: number;
  subtotal5: number;
  subtotal0: number;
  subtotalSinImpuestos: number;
  totalIva: number;
  total: number;
  retencionId?: string;
  retencionAplicada?: {
    totalFuente: number;
    totalIva: number;
    totalRetenido: number;
  };
  cuentaGastoId: string;
  asientoId?: string;
  pagado: boolean;
  estado?: 'AUTORIZADO' | 'PENDIENTE' | 'ANULADO';
}

export interface JournalEntry {
  id: string;
  numero: number;
  fecha: string; // YYYY-MM-DD
  concepto: string;
  tipo: 'VENTA' | 'COMPRA' | 'RETENCION' | 'NOTA_CREDITO' | 'PAGO' | 'COBRO' | 'NOMINA' | 'AJUSTE' | 'APERTURA' | 'CIERRE' | 'MANUAL';
  documentoReferencia?: string; // ej: "FAC-001-001-000000001"
  lineas: JournalEntryLine[];
  totalDebe: number;
  totalHaber: number;
  esCuadrado: boolean;
  creadoAutomatico: boolean;
  createdAt: string;
}

export interface SriRetentionCatalogItem {
  codigo: string;
  descripcion: string;
  porcentaje: number;
  tipo: 'RENTA' | 'IVA';
  aplicaA: string;
}

// ============================================================================
// INVENTARIOS & BODEGAS
// ============================================================================

export interface Warehouse {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  responsable: string;
  telefono?: string;
  esPrincipal: boolean;
}

export interface ProductStockByWarehouse {
  warehouseId: string;
  warehouseName: string;
  cantidad: number;
  ubicacionFisica?: string;
}

export type UnitOfMeasure =
  | 'UNIDAD'
  | 'CAJA'
  | 'DOCENA'
  | 'KG'
  | 'LITRO'
  | 'METRO'
  | 'PAQUETE'
  | 'SERVICIO'
  | 'GRAMO'
  | 'LIBRA'
  | 'MILILITRO'
  | 'CENTIMETRO'
  | 'HORA'
  | 'DIA'
  | 'MES'
  | 'QUINTAL'
  | 'TONELADA'
  | 'BULTO'
  | 'PIEZA'
  | 'GALON'
  | 'ONZA'
  | 'FRASCO'
  | 'BOTELLA'
  | 'LATA'
  | 'ROLLO'
  | 'SACO';

export interface ProductItem {
  id: string;
  codigoPrincipal: string; // SKU / Código SRI
  codigoAuxiliar?: string; // Código de barras
  nombre: string;
  descripcion?: string;
  categoria: string;
  unidadMedida: UnitOfMeasure;
  tarifaIva: VatRateType;
  costoPromedio: number; // Costo Promedio Ponderado NIIF
  ultimoCosto: number;
  precioVenta: number; // PVP 1 sin IVA
  precioVenta2?: number; // PVP 2 sin IVA
  precioVenta3?: number; // PVP 3 sin IVA
  stockMinimo: number;
  stockMaximo?: number;
  stockActual: number;
  stockPorBodega: ProductStockByWarehouse[];
  cuentaInventarioId?: string; // '1.1.04.01'
  cuentaCostoVentaId?: string; // '5.1.01'
  cuentaVentaId?: string; // '4.1.01'
  permiteInventario: boolean;
  estado: 'ACTIVO' | 'INACTIVO';
  proveedor?: string;
  diaServicio?: string;
  responsable?: string;
}

export type StockMovementType =
  | 'ENTRADA_COMPRA'
  | 'ENTRADA_AJUSTE'
  | 'ENTRADA_TRANSFERENCIA'
  | 'ENTRADA_INICIAL'
  | 'ENTRADA_DEVOLUCION'
  | 'SALIDA_VENTA'
  | 'SALIDA_AJUSTE'
  | 'SALIDA_TRANSFERENCIA'
  | 'SALIDA_MERMA'
  | 'SALIDA_CONSUMO_INTERNO';

export interface StockMovement {
  id: string;
  fecha: string;
  tipo: StockMovementType;
  tipoNombre: string;
  productoId: string;
  productoNombre: string;
  productoCodigo: string;
  bodegaOrigenId?: string;
  bodegaOrigenNombre?: string;
  bodegaDestinoId?: string;
  bodegaDestinoNombre?: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  precioVentaUnitario?: number;
  stockAnterior: number;
  stockNuevo: number;
  costoPromedioNuevo: number;
  documentoReferencia?: string;
  motivo: string;
  responsable: string;
  asientoId?: string;
}

export interface KardexRow {
  id: string;
  fecha: string;
  tipoComprobante: string;
  numeroComprobante: string;
  detalle: string;
  tipoOperacion: 'ENTRADA' | 'SALIDA' | 'SALDO_INICIAL';
  entradaCantidad: number;
  entradaCostoUnitario: number;
  entradaCostoTotal: number;
  salidaCantidad: number;
  salidaCostoUnitario: number;
  salidaCostoTotal: number;
  saldoCantidad: number;
  saldoCostoUnitario: number;
  saldoCostoTotal: number;
}

// ============================================================================
// NÓMINA, TALENTO HUMANO & ROL DE PAGOS (IESS / ECUADOR)
// ============================================================================

export interface Employee {
  id: string;
  identificacion: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  empresa: string;
  departamento: string;
  tipoContrato: string;
  sueldoBase: number;
  fechaIngreso: string;
  estado: 'ACTIVO' | 'RETIRADO' | 'NO_AFILIADO' | 'NUEVO_TRABAJADOR';
}

export interface PayrollSettings {
  iessPersonal: number;
  iessPatronal: number;
  salarioBasico: number;
  recargoSuplementario: number;
  recargoExtraordinario: number;
  recargoNocturno: number;
}

export interface PayrollSlip {
  id: string;
  employeeId: string;
  fechaEmision: string; // YYYY-MM
  diasTrabajados: number;
  horasTrabajadas: number;
  sueldoBase: number;
  
  // Cálculo de fechas trabajadas y antigüedad
  fechaInicioCalculo?: string; // Primera fecha (ej. fecha de ingreso o inicio de período)
  fechaFinCalculo?: string;    // Fecha actual / corte de cálculo
  diasTotalesAntiguedad?: number; // Días acumulados en la empresa hasta la fecha
  antiguedadTexto?: string;    // Ej. "8 meses y 12 días"
  
  // Ingresos Reportables
  sueldoGanado: number; // Proporcional
  bonosReportables: number;
  comisiones: number;
  horasSuplementarias: number; // Cantidad de horas
  valorHorasSuplementarias: number;
  horasExtraordinarias: number; // Cantidad de horas
  valorHorasExtraordinarias: number;
  horasRecargo25: number;
  valorHorasRecargo25: number;
  totalIngresosReportables: number;
  
  // Ingresos No Reportables
  transporte: number;
  alimentacion: number;
  bonosNoReportables: number;
  otrosBeneficios: number;
  totalIngresosNoReportables: number;
  
  totalIngresos: number;
  
  // Descuentos
  aporteIess: number;
  anticipos: number;
  prestamosQuian: number;
  multas: number;
  descuentosAutorizados: number;
  impuestoRenta: number;
  ausencias: number;
  horasNoTrabajadas: number;
  totalEgresos: number;
  
  // Provisiones (Informativo / Contable)
  aportePatronal: number;
  decimoTercero: number;
  decimoCuarto: number;
  vacaciones: number;
  fondosReserva: number;
  
  netoRecibir: number;
  asientoId?: string;
}

export type UserRole =
  | 'ADMIN'             // Administrador General / Propietario del Estudio
  | 'CAJERO_RECEPCION'  // Recepcionista, Cajero & Coordinador de Citas
  | 'ARTISTA'           // Tatuador / Piercer Residente o Invitado
  | 'BODEGA'            // Bodeguero / Administrador de Insumos y Kardex
  | 'CONTADOR';         // Contador / Auditor Fiscal Externo

export interface SystemUser {
  id: string;
  cedula?: string;
  nombres: string;
  apellidos: string;
  username: string;
  email: string;
  telefono?: string;
  rol: UserRole;
  estado: 'ACTIVO' | 'INACTIVO';
  pin?: string;          // PIN numérico de 4 dígitos para cambio rápido
  artistId?: string;     // Vinculación a un artista de INITIAL_ARTISTS si rol === 'ARTISTA'
  avatar?: string;
  allowedTabs?: string[]; // Personalización granular opcional de módulos
  createdAt: string;
  lastLogin?: string;
}

// ============================================================================
// COMPROBANTES RECIBIDOS DEL SRI (XML COMPRAS & RETENCIONES)
// ============================================================================

export type EstadoComprobanteRecibido =
  | 'PENDIENTE_REVISION'
  | 'REVISADO'
  | 'CONTABILIZADO'
  | 'DUPLICADO'
  | 'ANULADO'
  | 'ERROR';

export interface ItemComprobanteRecibido {
  codigoPrincipal: string;
  codigoAuxiliar: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  baseImponible: number;
  porcentajeIva: number;
  valorIva: number;
  totalItem: number;
}

export interface ComprobanteRecibido {
  id: string;
  claveAcceso: string;
  tipoComprobante: string;
  rucEmisor: string;
  razonSocialProveedor: string;
  fechaEmision: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  numeroCompleto: string;
  subtotalTarifa0: number;
  subtotalGravado: number;
  descuento: number;
  iva: number;
  ice: number;
  propina: number;
  total: number;
  formaPago: string;
  xmlOriginal: string;
  estado: EstadoComprobanteRecibido;
  items: ItemComprobanteRecibido[];
  fechaImportacion: string;
}

export interface BitacoraSincronizacion {
  id: string;
  fechaHora: string;
  empresaRuc: string;
  periodoConsultado: string;
  cantidadEncontrada: number;
  cantidadNueva: number;
  cantidadDuplicada: number;
  cantidadError: number;
}

export interface ComprobantesRecibidosProvider {
  sincronizar(ruc: string, password: string, year: string, month: string): Promise<ComprobanteRecibido[]>;
}

// ============================================================================
// CONFIGURACIÓN INICIAL DE EJEMPLO Y ESTUDIO
// ============================================================================

export const INITIAL_COMPANY: CompanyConfig = {
  ruc: '1792345678001',
  razonSocial: 'CORPORACION CONTABLE & TRIBUTARIA DEL ECUADOR S.A.S.',
  nombreComercial: 'CORPCONTABLE ECUADOR',
  dirMatriz: 'Av. Amazonas N34-120 y Av. República, Edificio Las Cámaras, Piso 5, Quito - Ecuador',
  dirEstablecimiento: 'Av. Amazonas N34-120 y Av. República, Quito - Ecuador',
  codigoEstablecimiento: '001',
  puntoEmision: '001',
  obligadoContabilidad: 'SI',
  regimenTributario: 'GENERAL',
  agenteRetencion: 'NAC-DNCRASC20-00000001',
  contribuyenteEspecial: '',
  ambiente: '1', // 1 = Pruebas, 2 = Producción
  tipoEmision: '1', // 1 = Normal
  email: 'tributacion@corpcontable.ec',
  telefono: '+593 2 298 7654',
  logoUrl: '',
  tarifaIvaPredeterminada: 15,
};

export const DEVOLUTION_INK_COMPANY: CompanyConfig = {
  ruc: '1792847102001',
  razonSocial: 'DEVOLUTION INK TATTOO STUDIO S.A.S.',
  nombreComercial: 'Devolution Ink Tattoo Studio',
  dirMatriz: 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito, Ecuador',
  dirEstablecimiento: 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Local 214, Quito, Ecuador',
  codigoEstablecimiento: '001',
  puntoEmision: '001',
  obligadoContabilidad: 'NO',
  regimenTributario: 'RIMPE_EMPRENDEDOR',
  agenteRetencion: 'NO',
  contribuyenteEspecial: '',
  ambiente: '1',
  tipoEmision: '1',
  email: 'contacto@devolutionink.com',
  telefono: '+593 99 123 4567',
  logoUrl: '',
  tarifaIvaPredeterminada: 15,
};
