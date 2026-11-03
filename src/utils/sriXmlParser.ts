import { ExpenseCategory } from '../types';

export interface SriInvoiceItem {
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ParsedSriInvoice {
  rawXml: string;
  supplierName: string;
  supplierTradeName?: string;
  supplierRuc: string;
  invoiceNumber: string;
  accessKey: string;
  authorizationNumber?: string;
  emissionDate: string; // ISO string
  formattedDate: string; // YYYY-MM-DD
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer';
  paymentMethodCode?: string;
  suggestedCategory: ExpenseCategory;
  summaryDescription: string;
  items: SriInvoiceItem[];
  buyerName?: string;
  buyerRuc?: string;
  isAuthorized: boolean;
  warnings: string[];
}

/**
 * Categorizes an expense based on supplier and items text
 */
export function autoCategorizeSriExpense(textToAnalyze: string): ExpenseCategory {
  const t = textToAnalyze.toLowerCase();

  // 1. Insumos Tatuaje
  if (
    /tinta|tintas|cartucho|cartuchos|aguja|agujas|dynamic|kwadron|eternal|intenze|solid ink|world famous|stencil|transfer|spirit|bishop|cheyenne|fkirons|mast|rotativa|pen |bobina|tetina|vaselina|pigmento|piel sintetica|tubo desechable|cubre grip|clip cord/i.test(
      t
    )
  ) {
    return 'supplies_tattoo';
  }

  // 2. Joyería Piercing
  if (
    /joyeria|titanio|astm f136|f-136|labret|nostril|septum|helix|daith|tragus|conch|industrial|clicker|aro continuo|banana|surface|microdermal|dermal|top rosca|disco titanio|circonita|opalo|oro 14k|oro 18k|barbell|plata 925/i.test(
      t
    )
  ) {
    return 'jewelry_restock';
  }

  // 3. Insumos Piercing (Herramientas / Agujas)
  if (
    /piercing|cateter|canula|cánula|pinza foerster|pinza mosquito|abridor aros|cerrador aros|bisturi|punch dermal|marcador septico/i.test(
      t
    )
  ) {
    return 'supplies_piercing';
  }

  // 4. Bioseguridad e Higiene
  if (
    /guante|guantes|nitrilo|latex|alcohol|film|dermalize|saniderm|clorhexidina|autoclave|esteriliz|desinfect|bactericida|jabon quirurgico|gasas|bacterias|toallas interdobladas|rollo papel|bolsas esteril|caja sharps|guardagujas|bata|mascarilla|cofia/i.test(
      t
    )
  ) {
    return 'hygiene_sanitary';
  }

  // 5. Alquiler / Centro Comercial
  if (/quicentro|arriendo|alquiler|inmobiliaria|administracion|local comercial|canon arrend/i.test(t)) {
    return 'rent_studio';
  }

  // 6. Suministros Básicos (Luz, Agua, Internet)
  if (
    /luz|agua|cnel|eeq|empresa electrica|cnt|claro|movistar|netlife|puntonet|internet|telefonia|agua potable|epmaps/i.test(
      t
    )
  ) {
    return 'utilities';
  }

  // 7. Software / Terminales / Pasarelas
  if (/datafast|medianet|payphone|redypago|pos|visa|mastercard|software|hosting|dominio/i.test(t)) {
    return 'software_terminals';
  }

  // 8. Publicidad / Marketing
  if (/meta platforms|facebook|instagram|google ads|publicidad|imprenta|flyers|afiches|stickers/i.test(t)) {
    return 'marketing_ads';
  }

  // 9. Mantenimiento
  if (/mantenimiento|reparacion|ferreteria|pintura|luces|focos|camilla|sillon/i.test(t)) {
    return 'maintenance';
  }

  return 'other_expense';
}

/**
 * Parses an SRI electronic invoice XML string (supports raw <factura> or wrapped <autorizacion>)
 */
export function parseSriXml(xmlString: string): ParsedSriInvoice {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('El archivo XML está vacío o no es una cadena de texto válida.');
  }

  const parser = new DOMParser();
  let xmlDoc = parser.parseFromString(xmlString.trim(), 'application/xml');

  // Check XML parser errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Formato XML no válido: ' + parseError.textContent?.slice(0, 150));
  }

  let isAuthorized = false;
  let authorizationNumber = '';

  // Check if it's wrapped in <autorizacion>
  let facturaElem = xmlDoc.querySelector('factura');

  if (!facturaElem) {
    const autorizacionElem = xmlDoc.querySelector('autorizacion');
    if (autorizacionElem) {
      const estado = autorizacionElem.querySelector('estado')?.textContent?.trim() || '';
      isAuthorized = estado.toUpperCase() === 'AUTORIZADO';
      authorizationNumber = autorizacionElem.querySelector('numeroAutorizacion')?.textContent?.trim() || '';

      const comprobanteText = autorizacionElem.querySelector('comprobante')?.textContent?.trim() || '';
      if (comprobanteText) {
        // Parse inner comprobante XML
        xmlDoc = parser.parseFromString(comprobanteText, 'application/xml');
        facturaElem = xmlDoc.querySelector('factura');
      }
    }
  } else {
    isAuthorized = true;
  }

  if (!facturaElem) {
    throw new Error(
      'No se encontró la estructura de <factura> en el archivo. Asegúrate de que sea un Comprobante Electrónico de Factura del SRI.'
    );
  }

  const getText = (parent: Element | null, tag: string): string => {
    return parent?.querySelector(tag)?.textContent?.trim() || '';
  };

  const getNum = (parent: Element | null, tag: string): number => {
    const val = getText(parent, tag);
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const infoTrib = facturaElem.querySelector('infoTributaria');
  const infoFact = facturaElem.querySelector('infoFactura');

  if (!infoTrib || !infoFact) {
    throw new Error('El XML no contiene las secciones requeridas <infoTributaria> o <infoFactura> del SRI.');
  }

  // 1. Supplier data
  const supplierName = getText(infoTrib, 'razonSocial') || 'PROVEEDOR GENERAL';
  const supplierTradeName = getText(infoTrib, 'nombreComercial') || undefined;
  const supplierRuc = getText(infoTrib, 'ruc');

  // 2. Invoice Number
  const estab = getText(infoTrib, 'estab') || '001';
  const ptoEmi = getText(infoTrib, 'ptoEmi') || '001';
  const secuencial = getText(infoTrib, 'secuencial') || '000000001';
  const invoiceNumber = `${estab}-${ptoEmi}-${secuencial.padStart(9, '0')}`;

  // 3. Access key / Auth
  const accessKey = getText(infoTrib, 'claveAcceso');
  if (!authorizationNumber) {
    authorizationNumber = accessKey;
  }

  // 4. Date parsing (DD/MM/YYYY)
  const rawDate = getText(infoFact, 'fechaEmision');
  let isoDate = new Date().toISOString();
  let formattedDate = isoDate.split('T')[0];

  if (rawDate) {
    const parts = rawDate.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      formattedDate = `${year}-${month}-${day}`;
      const d = new Date(`${year}-${month}-${day}T12:00:00Z`);
      if (!isNaN(d.getTime())) {
        isoDate = d.toISOString();
      }
    } else {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        isoDate = d.toISOString();
        formattedDate = d.toISOString().split('T')[0];
      }
    }
  }

  // 5. Financial totals
  const subtotal = getNum(infoFact, 'totalSinImpuestos');
  const totalAmount = getNum(infoFact, 'importeTotal');

  // Parse taxes (IVA)
  let taxAmount = 0;
  let taxRate = 15; // Standard Ecuador IVA default

  const totalImpuestos = infoFact.querySelectorAll('totalConImpuestos > totalImpuesto');
  totalImpuestos.forEach(imp => {
    const codigo = getText(imp, 'codigo');
    // Codigo 2 = IVA
    if (codigo === '2' || !codigo) {
      const valor = getNum(imp, 'valor');
      const tarifa = getNum(imp, 'tarifa');
      if (valor > 0) {
        taxAmount += valor;
        if (tarifa > 0) {
          taxRate = tarifa;
        }
      }
    }
  });

  // Fallback calculation if taxAmount is 0 but difference exists
  if (taxAmount === 0 && totalAmount > subtotal) {
    taxAmount = Math.round((totalAmount - subtotal) * 100) / 100;
  }

  // 6. Payment Method
  const paymentMethodCode = getText(infoFact, 'pagos > pago > formaPago');
  let paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' = 'bank_transfer';
  if (paymentMethodCode === '01') {
    paymentMethod = 'cash';
  } else if (['16', '18', '19'].includes(paymentMethodCode)) {
    paymentMethod = 'credit_card';
  } else {
    paymentMethod = 'bank_transfer';
  }

  // 7. Buyer (Comprador)
  const buyerName = getText(infoFact, 'razonSocialComprador') || undefined;
  const buyerRuc = getText(infoFact, 'identificacionComprador') || undefined;

  // 8. Items Details
  const items: SriInvoiceItem[] = [];
  const detalleElems = facturaElem.querySelectorAll('detalles > detalle');

  detalleElems.forEach(det => {
    const desc = getText(det, 'descripcion');
    const cant = getNum(det, 'cantidad') || 1;
    const precioU = getNum(det, 'precioUnitario') || 0;
    const totalItem = getNum(det, 'precioTotalSinImpuesto') || Math.round(cant * precioU * 100) / 100;
    const code = getText(det, 'codigoPrincipal') || getText(det, 'codigoInterno') || undefined;

    if (desc) {
      items.push({
        code,
        description: desc,
        quantity: cant,
        unitPrice: precioU,
        total: totalItem,
      });
    }
  });

  // 9. Composing summary description
  let summaryDescription = '';
  if (items.length === 1) {
    summaryDescription = items[0].description;
  } else if (items.length > 1) {
    const firstTwo = items.slice(0, 2).map(i => i.description).join(', ');
    const remaining = items.length - 2;
    summaryDescription = remaining > 0 ? `${firstTwo} (+${remaining} ítems más)` : firstTwo;
  } else {
    summaryDescription = `Factura de compra ${supplierName}`;
  }

  // 10. Auto-categorize
  const textForAnalysis = `${supplierName} ${supplierTradeName || ''} ${items.map(i => i.description).join(' ')}`;
  const suggestedCategory = autoCategorizeSriExpense(textForAnalysis);

  const warnings: string[] = [];
  if (!supplierRuc) warnings.push('No se detectó RUC del proveedor en el XML.');
  if (totalAmount <= 0) warnings.push('El importe total de la factura es $0.00.');

  return {
    rawXml: xmlString,
    supplierName,
    supplierTradeName,
    supplierRuc,
    invoiceNumber,
    accessKey,
    authorizationNumber,
    emissionDate: isoDate,
    formattedDate,
    subtotal,
    taxAmount,
    taxRate,
    totalAmount,
    paymentMethod,
    paymentMethodCode,
    suggestedCategory,
    summaryDescription,
    items,
    buyerName,
    buyerRuc,
    isAuthorized,
    warnings,
  };
}

