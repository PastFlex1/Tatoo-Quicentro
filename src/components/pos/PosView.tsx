import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ECUADOR_BANKS from '../../data/ecuadorBanks.json';
import { UiSelect } from '../common/UiSelect';
import { SriProgressModal } from './SriProgressModal';
import { splitVatIncluded } from '../../utils/vat';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Layers,
  CalendarCheck,
  Boxes,
  Sparkles,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Building2,
  ReceiptText,
  CheckCircle2,
  X,
  Keyboard,
  HeartPulse,
  Package,
  Hash,
  Lock,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { usePermission } from '../../hooks/usePermission';
import { POS_TERMINAL_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { Appointment, ClientProfile, InventoryItem, PaymentMethod, SaleLineItem, SaleRecord, StudioService } from '../../types';
import { getServiceCatalog, serviceCategoryLabel } from '../../data/serviceCatalog';
import { fetchSequenceState } from '../../services/sequenceService';
import { formatDocumentNumber, padCode, parseDocumentSequential } from '../../utils/documentNumber';
import { consultarIdentificacion } from '../../services/sriService';
import { validateSriBusinessConfig } from '../../utils/sriBusinessConfig';
import { lineBase, lineTax } from '../../utils/saleLines';
import {
  CONSUMIDOR_FINAL_ID as CONSUMIDOR_FINAL,
  CONSUMIDOR_FINAL_LIMIT,
  consumidorFinalLimitMessage,
  exceedsConsumidorFinalLimit,
  isConsumidorFinal as isCfId,
} from '../../utils/consumidorFinal';
import { validarIdentificacionEcuador } from '../../utils/ecuadorIdValidator';
import { flagLabel, riskFlagsOf } from '../../data/consentCatalog';

interface PosViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
}

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

const newId = () => `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const priceWithoutVat = (item: InventoryItem) => {
  const rate = typeof item.taxRate === 'number' ? item.taxRate : 15;
  if (item.priceWithoutVat != null) return item.priceWithoutVat;
  if (item.priceWithVat) return item.priceWithVat / (1 + rate / 100);
  if (item.retailPrice) return item.retailPrice / (1 + rate / 100);
  return item.unitCost * 2;
};

export const PosView: React.FC<PosViewProps> = ({ onOpenReceipt }) => {
  const {
    artists,
    inventory,
    appointments,
    sales,
    clients,
    settings,
    addSale,
    updateAppointment,
    proformas,
    updateProforma,
    formatMoney,
    setActiveTab,
    currentUser,
  } = useStudio();
  const { guard: guardPermission, can } = usePermission();
  const canDiscount = can('pos.discount');
  const canChangeTax = can('pos.change_tax');
  const serviceCatalog = useMemo(() => getServiceCatalog(settings).filter(s => s.active), [settings]);

  const standardVatRate =
    !settings.defaultTaxRate || settings.defaultTaxRate === 8 || settings.defaultTaxRate === 12 ? 15 : settings.defaultTaxRate;
  const sriValidation = useMemo(() => validateSriBusinessConfig(settings, 'factura'), [settings]);

  // ---------------------------------------------------------------- estado
  const [catalogTab, setCatalogTab] = useState<'services' | 'products' | 'appointments'>('services');
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<SaleLineItem[]>([]);
  const [documentType, setDocumentType] = useState<'factura' | 'nota_venta'>('factura');

  // Cliente
  const [clientDni, setClientDni] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientSuggestOpen, setClientSuggestOpen] = useState(false);
  const [sriLoading, setSriLoading] = useState(false);
  const [sriMsg, setSriMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Artista y comisión
  const [artistId, setArtistId] = useState('');
  const [commission, setCommission] = useState<number>(settings.defaultArtistCommission || 80);
  const [commissionEdited, setCommissionEdited] = useState(false);

  // Cita vinculada
  const [linkedAppointment, setLinkedAppointment] = useState<Appointment | null>(null);
  const [deposit, setDeposit] = useState(0);

  // Pago
  const [tip, setTip] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [split, setSplit] = useState({ cash: '', card: '', transfer: '' });
  // Datos de la transferencia del cliente
  const [transferBank, setTransferBank] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [consentSigned, setConsentSigned] = useState(false);
  const [notes, setNotes] = useState('');


  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [sriSale, setSriSale] = useState<SaleRecord | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Si quien cobra es un artista, la venta va a su nombre y con su comisión: no se le pregunta
  const loggedArtist = currentUser?.artistId ? artists.find(a => a.id === currentUser.artistId && a.active) : undefined;

  useEffect(() => {
    if (loggedArtist) {
      setArtistId(loggedArtist.id);
      setCommission(loggedArtist.defaultCommissionRate || settings.defaultArtistCommission || 80);
      return;
    }
    if (!artistId && artists.length > 0) {
      const first = artists.find(a => a.active) || artists[0];
      setArtistId(first.id);
      setCommission(first.defaultCommissionRate);
    }
  }, [artists, artistId, loggedArtist?.id]);

  // ---------------------------------------------------------------- datos derivados
  const isNotaVenta = documentType === 'nota_venta';
  const effectiveTax = (l: SaleLineItem) => (isNotaVenta ? 0 : l.taxRate);
  const computed = useMemo(() => {
    const ls = lines.map(l => ({ ...l, taxRate: effectiveTax(l) }));
    const subtotal = r2(ls.reduce((a, l) => a + l.quantity * l.unitPrice, 0));
    const discount = r2(ls.reduce((a, l) => a + (l.discount || 0), 0));
    const base = r2(ls.reduce((a, l) => a + lineBase(l), 0));
    const tax = r2(ls.reduce((a, l) => a + lineTax(l), 0));
    const total = r2(base + tax);
    const artistShare = r2(ls.reduce((a, l) => a + (lineBase(l) * (l.kind === 'service' ? commission : l.commissionPercent)) / 100, 0));
    return { ls, subtotal, discount, base, tax, total, artistShare };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, isNotaVenta, commission]);

  const tipNum = Math.max(0, parseFloat(tip) || 0);
  const toPay = r2(Math.max(0, computed.total - deposit));
  const toCollect = r2(toPay + tipNum);
  const cashNum = parseFloat(cashTendered) || 0;
  const change = method === 'cash' && cashNum > toCollect ? r2(cashNum - toCollect) : 0;
  const usesTransfer = method === 'transfer' || (method === 'split' && (parseFloat(split.transfer) || 0) > 0);
  const splitTotal = r2((parseFloat(split.cash) || 0) + (parseFloat(split.card) || 0) + (parseFloat(split.transfer) || 0));
  const splitRemaining = r2(toCollect - splitTotal);

  const isConsumidorFinal = isCfId(clientDni);
  // Ley del SRI: a consumidor final solo se factura hasta $50 (facturas y notas de venta)
  const cfBlocked = exceedsConsumidorFinalLimit(clientDni, computed.total + tipNum);
  const hasServices = lines.some(l => l.kind === 'service' && (l.category === 'tattoo' || l.category === 'piercing'));

  const matchedClient: ClientProfile | undefined = useMemo(() => {
    const d = clientDni.replace(/\D/g, '');
    if (!d || d === CONSUMIDOR_FINAL) return undefined;
    return clients.find(c => (c.dni || '').replace(/\D/g, '') === d);
  }, [clients, clientDni]);
  const healthFlags = matchedClient?.healthSheet ? riskFlagsOf(matchedClient.healthSheet) : [];
  const clientHasConsent = Boolean(matchedClient?.consentForms?.length);

  const clientSuggestions = useMemo(() => {
    const q = clientName.trim().toLowerCase();
    if (q.length < 2) return [];
    return clients.filter(c => c.name.toLowerCase().includes(q) || (c.dni || '').includes(q)).slice(0, 6);
  }, [clients, clientName]);

  const pendingAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return appointments
      .filter(a => !['completed', 'cancelled', 'no_show'].includes(a.status))
      .sort((a, b) => (a.date === todayStr ? -1 : 0) - (b.date === todayStr ? -1 : 0) || `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, [appointments]);

  // Búsqueda sin distinguir mayúsculas ni tildes ("sesion" encuentra "sesión")
  const norm = (t: string | undefined) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(query.trim());
  const matches = (...fields: (string | undefined)[]) => !q || fields.some(f => norm(f).includes(q));

  const products = useMemo(
    () => inventory.filter(i => i.isForSale).filter(i => matches(i.name, i.brand, i.sku)),
    [inventory, q]
  );

  const filteredServices = useMemo(
    () => serviceCatalog.filter(s => matches(s.name, serviceCategoryLabel(s.category))),
    [serviceCatalog, q]
  );

  const filteredAppointments = useMemo(
    () =>
      pendingAppointments.filter(a =>
        matches(a.clientName, a.serviceName, a.clientPhone, a.date, artists.find(x => x.id === a.artistId)?.name)
      ),
    [pendingAppointments, artists, q]
  );

  // ---------------------------------------------------------------- secuencial del próximo comprobante
  const estab = padCode(settings.codigoEstablecimiento, 3, '001');
  const pto = padCode(settings.puntoEmision, 3, '001');
  const [serverNext, setServerNext] = useState<{ factura: number; nota_venta: number } | null>(null);
  const [sequenceOffline, setSequenceOffline] = useState(false);

  const refreshSequence = useCallback(async () => {
    try {
      const rows = await fetchSequenceState(estab, pto);
      setServerNext({
        factura: rows.find(r => r.type === 'factura')?.next || 1,
        nota_venta: rows.find(r => r.type === 'nota_venta')?.next || 1,
      });
      setSequenceOffline(false);
    } catch {
      setSequenceOffline(true);
    }
  }, [estab, pto]);

  useEffect(() => {
    void refreshSequence();
    const t = setInterval(() => void refreshSequence(), 15000);
    return () => clearInterval(t);
  }, [refreshSequence, sales.length]);

  const nextDocumentNumber = useMemo(() => {
    if (!serverNext) return null;
    // Igual que al emitir: el contador nunca queda por debajo de lo que este equipo ya emitió
    const localMax = sales
      .filter(s => (documentType === 'nota_venta' ? s.documentType === 'nota_venta' : s.documentType !== 'nota_venta'))
      .reduce((max, s) => Math.max(max, parseDocumentSequential(documentType, s.invoiceNumber, estab, pto)), 0);
    return formatDocumentNumber(documentType, Math.max(serverNext[documentType], localMax + 1), estab, pto);
  }, [serverNext, sales, documentType, estab, pto]);

  const recentSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [sales]
  );

  // ---------------------------------------------------------------- carrito
  const addService = (svc: StudioService) => {
    setError(null);
    if (svc.price <= 0) {
      setError(`"${svc.name}" no tiene precio. Defínalo en Catálogo de Servicios.`);
      return;
    }
    setLines(prev => {
      const existing = prev.find(l => l.serviceId === svc.id);
      if (existing) return prev.map(l => (l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        {
          id: newId(),
          kind: 'service',
          category: svc.category,
          description: svc.description?.trim() || svc.name,
          quantity: 1,
          unitPrice: svc.price,
          discount: 0,
          taxRate: svc.taxRate,
          commissionPercent: commission,
          hours: svc.hours,
          serviceId: svc.id,
        },
      ];
    });
  };

  const addProduct = (item: InventoryItem) => {
    setError(null);
    setLines(prev => {
      const existing = prev.find(l => l.inventoryItemId === item.id);
      if (existing) {
        if (existing.quantity >= item.currentStock) {
          setError(`Stock insuficiente de ${item.name} (disponible: ${item.currentStock}).`);
          return prev;
        }
        return prev.map(l => (l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (item.currentStock <= 0) {
        setError(`${item.name} no tiene stock disponible.`);
        return prev;
      }
      return [
        ...prev,
        {
          id: newId(),
          kind: 'product',
          category: item.category === 'jewelry' ? 'jewelry' : 'aftercare',
          description: `${item.name}${item.brand ? ` (${item.brand})` : ''}`,
          quantity: 1,
          unitPrice: r2(priceWithoutVat(item)),
          discount: 0,
          taxRate: typeof item.taxRate === 'number' ? item.taxRate : standardVatRate,
          inventoryItemId: item.id,
          sku: item.sku,
          commissionPercent: item.category === 'jewelry' ? 30 : 20,
        },
      ];
    });
  };

  const loadAppointment = (apt: Appointment) => {
    setError(null);
    setLinkedAppointment(apt);
    setClientName(apt.clientName);
    setClientPhone(apt.clientPhone || '');
    const c = clients.find(
      x =>
        x.name.toLowerCase().trim() === apt.clientName.toLowerCase().trim() ||
        (x.phone && apt.clientPhone && x.phone.replace(/\D/g, '') === apt.clientPhone.replace(/\D/g, ''))
    );
    setClientDni(c?.dni || '');
    setClientEmail(c?.email || '');
    const art = artists.find(a => a.id === apt.artistId);
    if (art) {
      setArtistId(art.id);
      setCommission(art.defaultCommissionRate);
    }
    setDeposit(apt.depositPaid ? apt.depositAmount || 0 : 0);
    setConsentSigned(Boolean(apt.consentSigned));
    // El precio de la cita es lo que paga el cliente (con IVA): se desglosa, no se le suma IVA otra vez
    const aptRate =
      typeof apt.taxRate === 'number'
        ? apt.taxRate
        : serviceCatalog.find(sv => sv.id === apt.serviceId)?.taxRate ?? standardVatRate;
    const aptBase = splitVatIncluded(apt.estimatedPrice || 0, aptRate).base;
    setLines(prev => [
      ...prev.filter(l => !l.id.startsWith('apt-')),
      {
        id: `apt-${apt.id}`,
        kind: 'service',
        category: apt.serviceCategory,
        description: apt.serviceName + (apt.bodyPlacement ? ` · ${apt.bodyPlacement}` : ''),
        quantity: 1,
        unitPrice: aptBase,
        discount: 0,
        taxRate: aptRate,
        commissionPercent: art?.defaultCommissionRate ?? commission,
        hours: apt.estimatedHours,
      },
    ]);
    setNotes(`Cita ${apt.date} ${apt.startTime}`);
  };

  const updateLine = (id: string, patch: Partial<SaleLineItem>) => {
    setError(null);
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (next.inventoryItemId) {
          const inv = inventory.find(i => i.id === next.inventoryItemId);
          if (inv && next.quantity > inv.currentStock) {
            setError(`Stock insuficiente de ${inv.name} (disponible: ${inv.currentStock}).`);
            return l;
          }
        }
        next.quantity = Math.max(1, Math.floor(next.quantity) || 1);
        next.unitPrice = Math.max(0, next.unitPrice || 0);
        next.discount = Math.min(Math.max(0, next.discount || 0), next.quantity * next.unitPrice);
        return next;
      })
    );
  };

  const removeLine = (id: string) => {
    if (id.startsWith('apt-')) {
      setLinkedAppointment(null);
      setDeposit(0);
    }
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // ---------------------------------------------------------------- cliente
  const setConsumidorFinal = () => {
    setClientDni(CONSUMIDOR_FINAL);
    setClientName('CONSUMIDOR FINAL');
    setClientPhone('');
    setClientEmail('');
    setSriMsg(null);
  };

  const pickClient = (c: ClientProfile) => {
    setClientDni(c.dni || '');
    setClientName(c.name);
    setClientPhone(c.phone || '');
    setClientEmail(c.email || '');
    setClientSuggestOpen(false);
    setSriMsg({ text: 'Cliente registrado', ok: true });
  };

  const lookupSri = async () => {
    const id = clientDni.trim();
    if (!id) return setSriMsg({ text: 'Ingrese cédula o RUC', ok: false });
    if (id === CONSUMIDOR_FINAL) return setConsumidorFinal();
    const local = clients.find(c => (c.dni || '').replace(/\D/g, '') === id.replace(/\D/g, ''));
    if (local) return pickClient(local);
    setSriLoading(true);
    setSriMsg(null);
    try {
      const res = await consultarIdentificacion(id);
      if (res.found && res.nombre) {
        setClientName(res.nombre);
        setSriMsg({ text: `Verificado en SRI${res.regimen ? ` · ${res.regimen}` : ''}`, ok: true });
      } else {
        setSriMsg({ text: res.error || 'No encontrado en el SRI; escriba el nombre.', ok: false });
      }
    } catch {
      setSriMsg({ text: 'Sin conexión con el SRI; escriba el nombre.', ok: false });
    } finally {
      setSriLoading(false);
    }
  };

  // ---------------------------------------------------------------- cobro
  const resetAll = () => {
    setLines([]);
    setClientDni('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setSriMsg(null);
    setLinkedAppointment(null);
    setDeposit(0);
    setTip('');
    setMethod('cash');
    setCashTendered('');
    setSplit({ cash: '', card: '', transfer: '' });
    setTransferBank('');
    setTransferRef('');
    setConsentSigned(false);
    setNotes('');
    setCommissionEdited(false);
    setError(null);
    setDocumentType('factura');
  };

  const validate = (): string | null => {
    if (lines.length === 0) return 'Agregue al menos un servicio o producto.';
    if (lines.some(l => !l.description.trim())) return 'Todas las líneas deben tener descripción.';
    if (lines.some(l => l.unitPrice <= 0))
      return 'Hay líneas con precio $0. Defina el precio en el Catálogo de Servicios, en Inventario o en la cita.';
    if (!clientName.trim()) return 'Ingrese el cliente o use "Consumidor final".';
    if (!artistId) return 'Seleccione el artista.';
    if (cfBlocked) return consumidorFinalLimitMessage(computed.total + tipNum);
    if (!isNotaVenta && !isConsumidorFinal) {
      const idCheck = validarIdentificacionEcuador(clientDni.trim());
      if (!idCheck.isValid) return `La identificación del cliente no es válida: ${(idCheck.errorMessage || 'revise la cédula, RUC o pasaporte').replace(/\.+$/, '')}.`;
    }
    if (method === 'cash' && cashTendered && cashNum < toCollect) return 'El efectivo recibido es menor al total.';
    if (method === 'split' && Math.abs(splitRemaining) >= 0.01)
      return `Los montos del pago mixto deben sumar ${formatMoney(toCollect)} (falta ${formatMoney(splitRemaining)}).`;
    if (usesTransfer) {
      if (!transferBank) return 'Seleccione el banco de la transferencia.';
      if (!transferRef.trim()) return 'Ingrese el número de la transferencia.';
    }
    return null;
  };

  // Evita emitir dos veces si se hace doble clic (o se pulsa F9 de nuevo) mientras llega el número del servidor
  const [charging, setCharging] = useState(false);
  const chargingRef = useRef(false);

  const handleCharge = async () => {
    if (chargingRef.current) return;
    if (!guardPermission('pos.charge')) return;
    if (computed.discount > 0 && !guardPermission('pos.discount')) return;
    if (commissionEdited && !guardPermission('pos.change_commission')) return;
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    const artist = artists.find(a => a.id === artistId);
    const finalLines: SaleLineItem[] = computed.ls.map(l => ({
      ...l,
      commissionPercent: l.kind === 'service' ? commission : l.commissionPercent,
    }));
    const main = [...finalLines].sort((a, b) => lineBase(b) - lineBase(a))[0];
    const tattooHours = finalLines.filter(l => l.category === 'tattoo').reduce((a, l) => a + (l.hours || 0), 0);

    const cashPaid = method === 'cash' ? toCollect : method === 'split' ? parseFloat(split.cash) || 0 : 0;
    const cardPaid = method === 'card' ? toCollect : method === 'split' ? parseFloat(split.card) || 0 : 0;
    const transferPaid = method === 'transfer' ? toCollect : method === 'split' ? parseFloat(split.transfer) || 0 : 0;

    chargingRef.current = true;
    setCharging(true);
    let sale: SaleRecord;
    try {
      sale = await addSale({
      date: new Date().toISOString(),
      documentType,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      clientDni: clientDni.trim() || CONSUMIDOR_FINAL,
      serviceCategory: main.category,
      serviceName: finalLines.length === 1 ? main.description : `${main.description} + ${finalLines.length - 1} ítem(s)`,
      artistId,
      artistName: artist?.name || 'Artista del estudio',
      items: finalLines,
      hours: tattooHours || undefined,
      pieces: finalLines.length === 1 ? main.quantity : 1,
      subtotal: computed.subtotal,
      discount: computed.discount,
      taxRate: isNotaVenta ? 0 : main.taxRate,
      taxAmount: computed.tax,
      total: computed.total,
      depositAmount: deposit,
      amountPaidNow: toPay,
      remainingBalance: 0,
      paymentMethod: method,
      cashPaid,
      cardPaid,
      transferPaid,
      transferBank: transferPaid > 0 ? transferBank || undefined : undefined,
      transferReference: transferPaid > 0 ? transferRef.trim() || undefined : undefined,
      tipAmount: tipNum,
      artistCommissionPercent: commission,
      artistShare: computed.artistShare,
      studioShare: r2(computed.base - computed.artistShare),
      status: deposit > 0 && toPay === 0 ? 'deposit_only' : 'completed',
      consentFormSigned: consentSigned || clientHasConsent,
      notes: notes.trim() || undefined,
      }, { deferSri: true });
    } catch (err) {
      // Sin número del servidor no se emite nada: así nunca se repite ni se salta un secuencial
      setError(err instanceof Error ? err.message : 'No se pudo emitir el documento.');
      return;
    } finally {
      chargingRef.current = false;
      setCharging(false);
    }

    if (linkedAppointment) {
      updateAppointment(linkedAppointment.id, { status: 'completed', saleId: sale.id });
      const prof = proformas.find(p => p.appointmentId === linkedAppointment.id);
      if (prof) updateProforma(prof.id, { status: 'invoiced', saleId: sale.id, invoiceNumber: sale.invoiceNumber });
    }

    setLastSale(sale);
    // Factura electrónica: primero se firma, se envía y se autoriza en el SRI (modal con el avance);
    // el comprobante se abre recién con la autorización. La nota de venta no pasa por el SRI.
    if (sale.documentType === 'factura') setSriSale(sale);
    else onOpenReceipt(sale);
    resetAll();
  };

  // Atajos de teclado: F2 buscar · F4 consumidor final · F9 cobrar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCatalogTab('products');
        setTimeout(() => searchRef.current?.focus(), 0);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setConsumidorFinal();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCharge();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------------------------------------------------------------- UI
  // Diseño: >1366 px escritorio · ≤1366 px terminal de caja a pantalla completa (sin scroll de página)
  // · <768 px el mismo diseño apilado con el botón de cobro fijo abajo.
  const terminal = useMediaQuery(POS_TERMINAL_QUERY);
  const tabletUp = useMediaQuery('(min-width: 768px)');
  const fixedScreen = terminal && tabletUp;

  const inputCls =
    'w-full px-3 py-2 bg-[#121215] border border-[#2B2B36] rounded-xl text-white text-xs focus:outline-none focus:border-[#FF3366]/60 disabled:opacity-50';
  const numCls = `${inputCls} font-mono text-right`;
  const sectionTitle = 'text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500';

  const PayButton: React.FC<{ id: PaymentMethod; label: string; Icon: React.FC<{ className?: string }>; hint: string }> = ({ id, label, Icon, hint }) => (
    <button
      type="button"
      onClick={() => setMethod(id)}
      className={`flex flex-col items-center justify-center gap-1 ${terminal ? 'py-2' : 'py-2.5'} rounded-xl border text-xs font-bold cursor-pointer transition-all ${
        method === id ? 'bg-[#FF3366]/20 border-[#FF3366] text-white' : 'bg-[#121215] border-[#2B2B36] text-neutral-400 hover:text-white'
      }`}
      title={hint}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  // ---- Indicadores (secuencial, SRI, última venta, nueva venta)
  const statusChips = (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${
          sequenceOffline ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-[#FF3366]/10 border-[#FF3366]/40 text-white'
        }`}
        title="Número que recibirá el comprobante al cobrar. Lo asigna el servidor de numeración."
      >
        <Hash className="w-3.5 h-3.5 text-[#FF3366]" />
        {isNotaVenta ? 'Nota de venta' : 'Factura'} N°{' '}
        <span className="font-mono">{sequenceOffline ? 'sin conexión' : nextDocumentNumber || '…'}</span>
      </div>
      <div className="flex items-center p-0.5 rounded-full bg-[#121215] border border-[#2B2B36]" role="group" aria-label="Tipo de comprobante">
        {(['factura', 'nota_venta'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setDocumentType(t)}
            aria-pressed={documentType === t}
            className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
              documentType === t ? 'bg-[#FF3366] text-white' : 'text-neutral-400 hover:text-white'
            }`}
            title={t === 'factura' ? `Factura electrónica (IVA ${standardVatRate}%)` : 'Nota de venta RIMPE (sin IVA)'}
          >
            {t === 'factura' ? `Factura IVA ${standardVatRate}%` : 'Nota de venta'}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setActiveTab('settings')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold cursor-pointer ${
          sriValidation.isValid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}
      >
        {sriValidation.isValid ? <ShieldCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
        {sriValidation.isValid ? 'SRI configurado' : `Config. SRI ${sriValidation.progressPercentage}%`}
      </button>
      {lastSale && (
        <button
          type="button"
          onClick={() => onOpenReceipt(lastSale)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Último: {lastSale.invoiceNumber}
        </button>
      )}
      {lines.length > 0 && (
        <button type="button" onClick={resetAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2B2B36] text-neutral-300 hover:text-white text-[11px] font-semibold cursor-pointer">
          <X className="w-3.5 h-3.5" /> Nueva venta
        </button>
      )}
    </div>
  );

  // ---- Catálogo
  const catalogTabs = (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { id: 'services', label: 'Servicios', Icon: Sparkles },
        { id: 'products', label: 'Productos', Icon: Boxes },
        { id: 'appointments', label: `Citas (${pendingAppointments.length})`, Icon: CalendarCheck },
      ].map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            setCatalogTab(t.id as typeof catalogTab);
            setQuery('');
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            catalogTab === t.id ? 'bg-[#FF3366] text-white' : 'bg-[#121215] border border-[#2B2B36] text-neutral-400 hover:text-white'
          }`}
        >
          <t.Icon className="w-3.5 h-3.5" />
          {t.label}
        </button>
      ))}
      <div className="relative flex-1 min-w-[180px]">
        <input
          ref={searchRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (catalogTab === 'products' && products[0] && products[0].currentStock > 0) addProduct(products[0]);
              if (catalogTab === 'services') {
                const first = filteredServices.find(s => s.price > 0);
                if (first) addService(first);
              }
              if (catalogTab === 'appointments' && filteredAppointments[0]) loadAppointment(filteredAppointments[0]);
            }
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder={
            catalogTab === 'products'
              ? 'Buscar producto por nombre, marca o código'
              : catalogTab === 'services'
              ? 'Buscar servicio por nombre o tipo'
              : 'Buscar cita por cliente, servicio, artista o fecha'
          }
          aria-label="Buscar en el catálogo"
          className={`${inputCls} pl-8 ${query ? 'pr-8' : ''}`}
        />
        <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              searchRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  const gridCls = terminal
    ? 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2'
    : 'grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1';
  const tileCls = `${terminal ? 'min-h-[70px] p-3 flex flex-col justify-between' : 'p-2.5'} rounded-xl bg-[#121215] border border-[#2B2B36] hover:border-[#FF3366]/60 active:scale-[0.98] transition-transform text-left cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed`;

  const catalogContent = (
    <>
      {catalogTab === 'services' && (
        <div className={gridCls}>
          {serviceCatalog.length > 0 && filteredServices.length === 0 ? (
            <p className="col-span-full text-center text-[11px] text-neutral-500 py-6">Ningún servicio coincide con «{query}».</p>
          ) : serviceCatalog.length === 0 ? (
            <p className="col-span-full text-center text-[11px] text-neutral-500 py-6">
              No hay servicios activos.{' '}
              <button type="button" onClick={() => setActiveTab('services')} className="underline text-neutral-300 cursor-pointer">
                Registre servicios en el Catálogo de Servicios
              </button>
            </p>
          ) : (
            filteredServices.map(s => {
              const noPrice = s.price <= 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={noPrice}
                  onClick={() => addService(s)}
                  title={noPrice ? 'Sin precio: defínalo en Catálogo de Servicios' : undefined}
                  className={tileCls}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-bold text-white line-clamp-2">{s.name}</span>
                    <Plus className="w-4 h-4 shrink-0 text-neutral-500 group-hover:text-[#FF3366]" />
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <span className="font-mono text-xs text-[#FF3366] font-bold">{noPrice ? 'Sin precio' : formatMoney(r2(s.price * (1 + s.taxRate / 100)))}</span>
                    <span className="text-[10px] text-neutral-500">{serviceCategoryLabel(s.category)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {catalogTab === 'products' && (
        <div className={gridCls}>
          {products.length === 0 ? (
            <p className="col-span-full text-center text-[11px] text-neutral-500 py-6">
              No hay productos para la venta{query ? ' con esa búsqueda' : ''}. Márquelos como "a la venta" en Inventario.
            </p>
          ) : (
            products.map(p => {
              const noStock = p.currentStock <= 0;
              const withVat = priceWithoutVat(p) * (1 + (typeof p.taxRate === 'number' ? p.taxRate : 15) / 100);
              return (
                <button key={p.id} type="button" disabled={noStock} onClick={() => addProduct(p)} className={tileCls}>
                  <div>
                    <div className="text-xs font-bold text-white line-clamp-2">{p.name}</div>
                    <div className="text-[10px] text-neutral-500 truncate">{p.brand}</div>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <span className="font-mono text-xs text-[#FF3366] font-bold">{formatMoney(withVat)}</span>
                    <span className={`text-[10px] ${p.currentStock <= (p.minStockAlert || 0) ? 'text-amber-300' : 'text-neutral-500'}`}>
                      {noStock ? 'Sin stock' : `Stock ${p.currentStock}`}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {catalogTab === 'appointments' && (
        <div className={terminal ? 'space-y-1.5' : 'space-y-1.5 max-h-64 overflow-y-auto pr-1'}>
          {pendingAppointments.length === 0 ? (
            <p className="text-center text-[11px] text-neutral-500 py-6">No hay citas pendientes por cobrar.</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-center text-[11px] text-neutral-500 py-6">Ninguna cita coincide con «{query}».</p>
          ) : (
            filteredAppointments.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => loadAppointment(a)}
                className={`w-full ${terminal ? 'p-3' : 'p-2.5'} rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer ${
                  linkedAppointment?.id === a.id ? 'bg-[#FF3366]/15 border-[#FF3366]/60' : 'bg-[#121215] border-[#2B2B36] hover:border-[#FF3366]/60'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {a.clientName} · {a.serviceName}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {a.date} {a.startTime} · {artists.find(x => x.id === a.artistId)?.name || 'Artista'}
                    {a.depositPaid && a.depositAmount ? ` · Seña ${formatMoney(a.depositAmount)}` : ''}
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#FF3366] shrink-0">{formatMoney(a.estimatedPrice || 0)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </>
  );

  // ---- Detalle de la venta
  const ticketHeader = (
    <div className="px-4 py-2.5 border-b border-[#24242B] flex items-center justify-between gap-2 shrink-0">
      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <ReceiptText className="w-4 h-4 text-[#FF3366]" />
        Detalle de la venta ({lines.length})
      </span>
      {linkedAppointment && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30 truncate">
          Cita vinculada: {linkedAppointment.date} {linkedAppointment.startTime}
        </span>
      )}
    </div>
  );

  const ticketEmpty = (
    <div className="p-10 text-center text-neutral-500 text-xs">
      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
      Toque un servicio, un producto o una cita para empezar.
    </div>
  );

  const qtyStepper = (l: SaleLineItem, big = false) => {
    const btn = `${big ? 'w-8 h-8' : 'w-6 h-6'} rounded-lg bg-[#121215] border border-[#2B2B36] flex items-center justify-center cursor-pointer`;
    return (
      <div className="flex items-center justify-center gap-1">
        <button type="button" onClick={() => updateLine(l.id, { quantity: l.quantity - 1 })} className={`${btn} text-neutral-400 hover:text-white`} aria-label="Restar">
          <Minus className="w-3 h-3" />
        </button>
        <span className={`${big ? 'w-8 text-sm' : 'w-7'} text-center font-mono text-white`}>{l.quantity}</span>
        <button type="button" onClick={() => updateLine(l.id, { quantity: l.quantity + 1 })} className={`${btn} text-[#FF3366]`} aria-label="Sumar">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const lineKindLabel = (l: SaleLineItem) =>
    (l.kind === 'product' ? `Producto${l.sku ? ` · ${l.sku}` : ''}` : l.id.startsWith('apt-') ? `Cita · ${serviceCategoryLabel(l.category)}` : serviceCategoryLabel(l.category)) +
    (l.category === 'tattoo' && l.hours ? ` · ${l.hours} h` : '');

  const taxSelect = (l: SaleLineItem, extra = '') => (
    <UiSelect
      value={effectiveTax(l)}
      disabled={isNotaVenta || !canChangeTax}
      title={!canChangeTax ? 'Sin permiso para cambiar el IVA' : isNotaVenta ? 'La nota de venta RIMPE no lleva IVA' : undefined}
      onChange={e => updateLine(l.id, { taxRate: parseFloat(e.target.value) })}
      className={`${inputCls} px-1 text-right ${extra}`}
    >
      {[standardVatRate, 5, 0].filter((v, i, a) => a.indexOf(v) === i).map(v => (
        <option key={v} value={v}>
          {v}%
        </option>
      ))}
    </UiSelect>
  );

  const discountInput = (l: SaleLineItem, extra = '') => (
    <input
      type="number"
      min="0"
      step="0.01"
      value={l.discount || ''}
      placeholder="0.00"
      disabled={!canDiscount}
      title={canDiscount ? undefined : 'Sin permiso para aplicar descuentos'}
      onChange={e => updateLine(l.id, { discount: parseFloat(e.target.value) || 0 })}
      className={`${numCls} ${extra}`}
    />
  );

  /** Ticket tipo caja registradora (pantallas ≤1366 px): cada ítem en UNA sola fila */
  const ticketCols = 'grid grid-cols-[minmax(96px,1fr)_80px_62px_66px_72px_74px_24px] items-center gap-x-2';
  const ticketList = (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        <div className={`${ticketCols} px-3 py-2 bg-[#121215] text-[9px] uppercase tracking-wider text-neutral-500 border-b border-[#24242B]`}>
          <span>Descripción</span>
          <span className="text-center">Cant.</span>
          <span className="text-right">P. unit.</span>
          <span className="text-center">IVA</span>
          <span className="text-right">Desc. $</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        <div className="divide-y divide-dashed divide-[#2A2A33]">
          {lines.map(l => {
            const isAppointment = l.id.startsWith('apt-');
            const lineTotal = r2(lineBase(l) * (1 + effectiveTax(l) / 100));
            return (
              <div key={l.id} className={`${ticketCols} px-3 py-2.5`}>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate" title={l.description}>
                    {l.description}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">{lineKindLabel(l)}</div>
                </div>
                <div>{isAppointment ? <div className="text-center font-mono text-white text-sm">1</div> : qtyStepper(l)}</div>
                <span className={`text-right font-mono text-xs truncate ${l.unitPrice <= 0 ? 'text-amber-300' : 'text-neutral-200'}`}>
                  {l.unitPrice > 0 ? formatMoney(l.unitPrice) : 'Sin precio'}
                </span>
                <div>{taxSelect(l, '!py-1.5')}</div>
                <div>{discountInput(l, '!py-1.5')}</div>
                <span className="text-right font-mono text-sm font-bold text-white whitespace-nowrap">{formatMoney(lineTotal)}</span>
                <button type="button" onClick={() => removeLine(l.id)} className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer justify-self-end" aria-label="Quitar línea">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /** Tabla de detalle (escritorio grande) */
  const ticketTable = (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[600px]">
        <thead className="bg-[#121215] text-[10px] uppercase tracking-wider text-neutral-400">
          <tr>
            <th className="py-2 px-3 text-left min-w-[200px]">Descripción</th>
            <th className="py-2 px-2 text-center w-24">Cant.</th>
            <th className="py-2 px-2 text-right w-24">P. unit s/IVA</th>
            <th className="py-2 px-2 text-right w-20">Desc. $</th>
            <th className="py-2 px-2 text-right w-24">IVA %</th>
            <th className="py-2 px-3 text-right w-24">Total</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#222228]">
          {lines.map(l => {
            const isAppointment = l.id.startsWith('apt-');
            const lineTotal = r2(lineBase(l) * (1 + effectiveTax(l) / 100));
            return (
              <tr key={l.id} className="align-middle">
                <td className="py-2 px-3">
                  <div className="text-white text-xs flex items-center gap-1.5">
                    <Lock className="w-3 h-3 shrink-0 text-neutral-600" aria-hidden />
                    <span className="truncate" title={l.description}>
                      {l.description}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500">{lineKindLabel(l)}</div>
                </td>
                <td className="py-2 px-2">{isAppointment ? <div className="text-center font-mono text-white">{l.quantity}</div> : qtyStepper(l)}</td>
                <td className={`py-2 px-2 text-right font-mono ${l.unitPrice <= 0 ? 'text-amber-300' : 'text-neutral-200'}`}>
                  {l.unitPrice > 0 ? formatMoney(l.unitPrice) : 'Sin precio'}
                </td>
                <td className="py-2 px-2">{discountInput(l)}</td>
                <td className="py-2 px-2">{taxSelect(l, 'min-w-[72px]')}</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-white whitespace-nowrap">{formatMoney(lineTotal)}</td>
                <td className="py-2 pr-2">
                  <button type="button" onClick={() => removeLine(l.id)} className="p-1 rounded text-neutral-500 hover:text-red-400 cursor-pointer" aria-label="Quitar línea">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const recentSalesBlock =
    recentSales.length > 0 ? (
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-3">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Últimas ventas</div>
        <div className="divide-y divide-[#222228]">
          {recentSales.map(s => (
            <button key={s.id} type="button" onClick={() => onOpenReceipt(s)} className="w-full flex justify-between gap-2 py-1.5 text-[11px] hover:bg-[#1E1E25] px-1 rounded cursor-pointer">
              <span className="text-neutral-300 truncate">
                <span className="font-mono text-white">{s.invoiceNumber}</span> · {s.clientName}
              </span>
              <span className="font-mono text-neutral-200">{formatMoney(s.total + (s.tipAmount || 0))}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null;

  // ---- Cliente
  const clientBlock = (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className={terminal ? sectionTitle : 'text-xs font-bold text-white uppercase tracking-wider'}>Cliente</span>
        <button type="button" onClick={setConsumidorFinal} className="text-[11px] px-2.5 py-1 rounded-full border border-[#2B2B36] text-neutral-300 hover:text-white cursor-pointer">
          Consumidor final (F4)
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={clientDni}
          onChange={e => {
            setClientDni(e.target.value.trim());
            setSriMsg(null);
          }}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), lookupSri())}
          placeholder="Cédula / RUC (Enter busca)"
          className={`${inputCls} font-mono`}
        />
        <button type="button" onClick={lookupSri} disabled={sriLoading} className="px-3 rounded-xl bg-[#25252E] hover:bg-[#30303B] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0">
          {sriLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          SRI
        </button>
      </div>
      <div className="relative">
        <input
          value={clientName}
          onChange={e => {
            setClientName(e.target.value);
            setClientSuggestOpen(true);
          }}
          onBlur={() => setTimeout(() => setClientSuggestOpen(false), 150)}
          placeholder="Nombre o razón social *"
          className={inputCls}
        />
        {clientSuggestOpen && clientSuggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1C1C24] border border-[#2B2B36] rounded-xl overflow-hidden shadow-xl">
            {clientSuggestions.map(c => (
              <button key={c.id} type="button" onMouseDown={() => pickClient(c)} className="w-full text-left px-3 py-2 text-xs hover:bg-[#25252E] flex justify-between cursor-pointer">
                <span className="text-white">{c.name}</span>
                <span className="text-neutral-500 font-mono">{c.dni}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Teléfono" className={inputCls} />
        <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Correo (envío de factura)" className={inputCls} />
      </div>
      {sriMsg && (
        <div className={`text-[11px] flex items-center gap-1.5 ${sriMsg.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
          {sriMsg.ok ? <UserCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {sriMsg.text}
        </div>
      )}
      {healthFlags.length > 0 && (
        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/40 text-[11px] text-red-200 flex gap-1.5">
          <HeartPulse className="w-4 h-4 shrink-0" />
          <span>
            <strong>Alerta de salud:</strong> {healthFlags.map(flagLabel).join(', ')}
          </span>
        </div>
      )}
      {hasServices && matchedClient && !clientHasConsent && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-[11px] text-amber-200 flex justify-between items-center gap-2">
          <span>El cliente no tiene carta de consentimiento firmada.</span>
          <button type="button" onClick={() => setActiveTab('clients')} className="underline shrink-0 cursor-pointer">
            Ir a Clientes
          </button>
        </div>
      )}
    </div>
  );

  // ---- Totales
  const totalsLines = (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between text-neutral-400">
        <span>Subtotal</span>
        <span className="font-mono">{formatMoney(computed.subtotal)}</span>
      </div>
      {computed.discount > 0 && (
        <div className="flex justify-between text-neutral-400">
          <span>Descuento</span>
          <span className="font-mono text-red-300">-{formatMoney(computed.discount)}</span>
        </div>
      )}
      {!isNotaVenta && (
        <div className="flex justify-between text-neutral-400">
          <span>IVA</span>
          <span className="font-mono">{formatMoney(computed.tax)}</span>
        </div>
      )}
      {deposit > 0 && (
        <div className="flex justify-between text-emerald-300">
          <span>Seña ya pagada</span>
          <span className="font-mono">-{formatMoney(deposit)}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-neutral-400">
        <span>Propina</span>
        <div className="flex items-center gap-1">
          {[0, 5, 10].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setTip(p === 0 ? '' : String(r2((computed.total * p) / 100)))}
              className="px-1.5 py-0.5 rounded border border-[#2B2B36] text-[10px] hover:text-white cursor-pointer"
            >
              {p}%
            </button>
          ))}
          <input type="number" min="0" step="0.01" value={tip} onChange={e => setTip(e.target.value)} placeholder="0.00" className="w-20 px-2 py-1 bg-[#121215] border border-[#2B2B36] rounded-lg text-white font-mono text-right text-xs focus:outline-none" />
        </div>
      </div>
    </div>
  );

  const totalDisplay = (
    <div className={`${terminal ? 'px-3 py-2' : 'p-3'} rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/40 flex items-end justify-between`}>
      <span className="text-xs font-bold text-white uppercase">Total a cobrar</span>
      <span className={`font-mono ${terminal ? 'text-[28px] leading-none' : 'text-3xl'} font-black text-white tabular-nums`}>{formatMoney(toCollect)}</span>
    </div>
  );

  // ---- Forma de pago
  const paymentBlock = (
    <div className="space-y-2.5">
      {terminal && <span className={sectionTitle}>Forma de pago</span>}
      <div className="grid grid-cols-4 gap-2">
        <PayButton id="cash" label="Efectivo" Icon={Banknote} hint="Pago en efectivo" />
        <PayButton id="card" label="Tarjeta" Icon={CreditCard} hint="Datáfono / POS" />
        <PayButton id="transfer" label="Transfer." Icon={ArrowRightLeft} hint="Transferencia bancaria" />
        <PayButton id="split" label="Mixto" Icon={Layers} hint="Combinar métodos" />
      </div>

      {method === 'cash' && (
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {[toCollect, 5, 10, 20, 50, 100].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => (
              <button key={v} type="button" onClick={() => setCashTendered(String(v))} className="px-2.5 py-1.5 rounded-lg bg-[#121215] border border-[#2B2B36] text-[11px] font-mono text-neutral-200 hover:border-[#FF3366]/60 cursor-pointer">
                {v === toCollect ? 'Exacto' : `$${v}`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <input type="number" min="0" step="0.01" value={cashTendered} onChange={e => setCashTendered(e.target.value)} placeholder="Efectivo recibido" className={numCls} />
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block">Cambio</span>
              <span className={`font-mono text-lg font-bold ${change > 0 ? 'text-emerald-300' : 'text-neutral-500'}`}>{formatMoney(change)}</span>
            </div>
          </div>
        </div>
      )}
      {method === 'split' && (
        <div className="space-y-1.5">
          {(['cash', 'card', 'transfer'] as const).map(k => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-24 text-[11px] text-neutral-400">{k === 'cash' ? 'Efectivo' : k === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
              <input type="number" min="0" step="0.01" value={split[k]} onChange={e => setSplit(s => ({ ...s, [k]: e.target.value }))} placeholder="0.00" className={numCls} />
              <button
                type="button"
                onClick={() => setSplit(s => ({ ...s, [k]: String(r2((parseFloat(s[k]) || 0) + Math.max(0, splitRemaining))) }))}
                className="text-[10px] text-[#FF3366] whitespace-nowrap cursor-pointer"
              >
                + resto
              </button>
            </div>
          ))}
          <div className={`text-right text-[11px] font-mono ${Math.abs(splitRemaining) < 0.01 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {Math.abs(splitRemaining) < 0.01 ? 'Pagos completos' : `Falta ${formatMoney(splitRemaining)}`}
          </div>
        </div>
      )}

      {usesTransfer && (
        <div className="space-y-2 p-2.5 rounded-xl bg-[#121215]/60 border border-[#2B2B36]">
          <span className="block text-[10px] uppercase tracking-wider text-neutral-400">Datos de la transferencia</span>
          <UiSelect
            value={transferBank}
            onChange={e => setTransferBank(e.target.value)}
            placeholder="Banco de origen…"
            searchable
            searchPlaceholder="Escriba para buscar el banco…"
            className={inputCls}
            aria-label="Banco de la transferencia"
          >
            {(ECUADOR_BANKS as { id: string; name: string }[]).map(b => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </UiSelect>
          <input
            value={transferRef}
            onChange={e => setTransferRef(e.target.value.replace(/\s+/g, ' ').slice(0, 40))}
            placeholder="N° de transferencia / comprobante"
            aria-label="Número de transferencia"
            className={`${inputCls} font-mono`}
          />
        </div>
      )}

      {hasServices && !clientHasConsent && (
        <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
          <input type="checkbox" checked={consentSigned} onChange={e => setConsentSigned(e.target.checked)} />
          Consentimiento informado firmado en papel
        </label>
      )}
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nota interna (opcional)" className={inputCls} />
    </div>
  );

  const alertsBlock = (
    <>
      {cfBlocked && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-[11px] text-amber-200 flex gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Identifique al comprador.</strong> Por ley, a consumidor final solo se factura hasta ${CONSUMIDOR_FINAL_LIMIT}. Ingrese cédula, RUC o pasaporte (o reduzca
            el valor).
          </span>
        </div>
      )}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-[11px] flex gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </>
  );

  const chargeButton = (
    <button
      type="button"
      onClick={handleCharge}
      disabled={lines.length === 0 || charging || cfBlocked}
      className={`w-full ${terminal ? 'py-3.5' : 'py-4'} rounded-2xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white font-black text-base flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,51,102,0.35)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <ReceiptText className="w-5 h-5" />
      {charging ? 'Emitiendo…' : cfBlocked ? `Identifique al cliente (más de $${CONSUMIDOR_FINAL_LIMIT})` : <>Cobrar {formatMoney(toCollect)} · F9</>}
    </button>
  );

  const chargeHint = (
    <p className="text-[10px] text-neutral-500 text-center">
      {isNotaVenta ? 'Se emitirá una nota de venta RIMPE.' : 'La factura se enviará automáticamente al SRI.'}
    </p>
  );

  // ================================================================ TERMINAL DE CAJA (≤1366 px)
  const sriModal = sriSale ? (
    <SriProgressModal
      sale={sriSale}
      onClose={() => setSriSale(null)}
      onShowReceipt={s => {
        setSriSale(null);
        setLastSale(s);
        onOpenReceipt(s);
      }}
    />
  ) : null;

  if (terminal) {
    const card = 'rounded-2xl bg-[#18181D] border border-[#272730]';
    return (
      <div className={`w-full flex flex-col gap-2.5 p-2.5 sm:p-3 ${fixedScreen ? 'h-full min-h-0' : ''}`}>
        {sriModal}
        {/* Barra superior de la caja */}
        <div className={`${card} px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <h2 className="text-xs font-black text-white uppercase tracking-wider">Caja · Punto de venta</h2>
            <span className="hidden lg:flex items-center gap-1 text-[10px] text-neutral-500">
              <Keyboard className="w-3 h-3" /> F2 buscar · F4 consumidor final · F9 cobrar
            </span>
          </div>
          {statusChips}
        </div>

        <div className={fixedScreen ? 'flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_380px] gap-2.5' : 'flex flex-col gap-2.5'}>
          {/* IZQUIERDA: catálogo arriba, ticket abajo */}
          <div className={`flex flex-col gap-2.5 ${fixedScreen ? 'min-h-0' : ''}`}>
            <div className={`${card} p-3 flex flex-col gap-2.5 ${fixedScreen ? 'basis-[42%] shrink-0 min-h-0' : ''}`}>
              {catalogTabs}
              <div className={`${fixedScreen ? 'flex-1 min-h-0' : 'max-h-72'} overflow-y-auto pr-1 ink-scroll`}>{catalogContent}</div>
            </div>
            <div className={`${card} flex flex-col overflow-hidden ${fixedScreen ? 'flex-1 min-h-0' : ''}`}>
              {ticketHeader}
              <div className={`${fixedScreen ? 'flex-1 min-h-0 overflow-y-auto ink-scroll' : ''}`}>{lines.length === 0 ? ticketEmpty : ticketList}</div>
            </div>
          </div>

          {/* DERECHA: panel de cobro con el botón siempre visible */}
          <aside className={`${card} flex flex-col ${fixedScreen ? 'min-h-0 overflow-hidden' : ''}`}>
            <div className={`p-3 space-y-4 ${fixedScreen ? 'flex-1 min-h-0 overflow-y-auto ink-scroll' : ''}`}>
              {clientBlock}
              <div className="border-t border-[#24242B] pt-3">{totalsLines}</div>
              <div className="border-t border-[#24242B] pt-3">{paymentBlock}</div>
              {alertsBlock}
            </div>
            <div
              className={`shrink-0 p-3 space-y-2 border-t border-[#2A2A34] bg-[#141418] rounded-b-2xl ${
                fixedScreen ? '' : 'sticky bottom-0 z-10 shadow-[0_-12px_30px_rgba(0,0,0,0.5)]'
              }`}
            >
              {totalDisplay}
              {chargeButton}
            </div>
          </aside>
        </div>

        {!fixedScreen && recentSalesBlock}
      </div>
    );
  }

  // ================================================================ ESCRITORIO (>1366 px)
  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 space-y-4">
      {sriModal}
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Punto de venta</h2>
          <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" /> F2 buscar producto · F4 consumidor final · F9 cobrar
          </p>
        </div>
        {statusChips}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* IZQUIERDA: CATÁLOGO + CARRITO */}
        <div className="xl:col-span-7 space-y-4">
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-3 sm:p-4 space-y-3">
            {catalogTabs}
            {catalogContent}
          </div>

          <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
            {ticketHeader}
            {lines.length === 0 ? ticketEmpty : ticketTable}
          </div>

          {recentSalesBlock}
        </div>

        {/* DERECHA: COBRO */}
        <div className="xl:col-span-5 xl:sticky xl:top-4 space-y-3">
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-4">{clientBlock}</div>
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-4 space-y-3">
            {totalsLines}
            {totalDisplay}
            {paymentBlock}
            {alertsBlock}
            {chargeButton}
            {chargeHint}
          </div>
        </div>
      </div>
    </div>
  );
};
