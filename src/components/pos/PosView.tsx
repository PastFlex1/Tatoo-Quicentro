import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UiSelect } from '../common/UiSelect';
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
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { usePermission } from '../../hooks/usePermission';
import { Appointment, ClientProfile, InventoryItem, PaymentMethod, SaleLineItem, SaleRecord, ServiceCategory } from '../../types';
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

/** Accesos rápidos de servicios del estudio */
const QUICK_SERVICES: { label: string; category: ServiceCategory; description: string; price: number; hours?: number }[] = [
  { label: 'Tatuaje por sesión', category: 'tattoo', description: 'Tatuaje personalizado (sesión)', price: 0, hours: 3 },
  { label: 'Tatuaje pequeño', category: 'tattoo', description: 'Tatuaje pequeño / minimalista', price: 0, hours: 1 },
  { label: 'Retoque', category: 'tattoo', description: 'Retoque de tatuaje', price: 0, hours: 1 },
  { label: 'Perforación', category: 'piercing', description: 'Perforación (piercing)', price: 0 },
  { label: 'Cambio de joya', category: 'piercing', description: 'Cambio / colocación de joya', price: 0 },
  { label: 'Otro servicio', category: 'other', description: 'Servicio del estudio', price: 0 },
];

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
  } = useStudio();
  const { guard: guardPermission, can } = usePermission();
  const canDiscount = can('pos.discount');
  const canChangeCommission = can('pos.change_commission');
  const canChangeTax = can('pos.change_tax');
  const canChangePrice = can('pos.change_price');

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
  const [consentSigned, setConsentSigned] = useState(false);
  const [notes, setNotes] = useState('');

  // Insumos de cabina
  const [supplies, setSupplies] = useState<{ itemId: string; name: string; quantity: number }[]>([]);
  const [showSupplies, setShowSupplies] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!artistId && artists.length > 0) {
      const first = artists.find(a => a.active) || artists[0];
      setArtistId(first.id);
      setCommission(first.defaultCommissionRate);
    }
  }, [artists, artistId]);

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

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory
      .filter(i => i.isForSale)
      .filter(i => !q || i.name.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q));
  }, [inventory, query]);

  const recentSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [sales]
  );

  // ---------------------------------------------------------------- carrito
  const addService = (svc: (typeof QUICK_SERVICES)[number]) => {
    setError(null);
    setLines(prev => [
      ...prev,
      {
        id: newId(),
        kind: 'service',
        category: svc.category,
        description: svc.description,
        quantity: 1,
        unitPrice: svc.price,
        discount: 0,
        taxRate: standardVatRate,
        commissionPercent: commission,
        hours: svc.hours,
      },
    ]);
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
    setLines(prev => [
      ...prev.filter(l => !l.id.startsWith('apt-')),
      {
        id: `apt-${apt.id}`,
        kind: 'service',
        category: apt.serviceCategory,
        description: apt.serviceName + (apt.bodyPlacement ? ` · ${apt.bodyPlacement}` : ''),
        quantity: 1,
        unitPrice: apt.estimatedPrice || 0,
        discount: 0,
        taxRate: standardVatRate,
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
    setConsentSigned(false);
    setNotes('');
    setSupplies([]);
    setShowSupplies(false);
    setCommissionEdited(false);
    setError(null);
    setDocumentType('factura');
  };

  const validate = (): string | null => {
    if (lines.length === 0) return 'Agregue al menos un servicio o producto.';
    if (lines.some(l => !l.description.trim())) return 'Todas las líneas deben tener descripción.';
    if (lines.some(l => l.unitPrice <= 0)) return 'Hay líneas con precio $0. Ingrese el precio.';
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
      consumedSupplies: supplies.length > 0 ? supplies : undefined,
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
      tipAmount: tipNum,
      artistCommissionPercent: commission,
      artistShare: computed.artistShare,
      studioShare: r2(computed.base - computed.artistShare),
      status: deposit > 0 && toPay === 0 ? 'deposit_only' : 'completed',
      consentFormSigned: consentSigned || clientHasConsent,
      notes: notes.trim() || undefined,
      });
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
    onOpenReceipt(sale);
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
  const inputCls =
    'w-full px-3 py-2 bg-[#121215] border border-[#2B2B36] rounded-xl text-white text-xs focus:outline-none focus:border-[#FF3366]/60 disabled:opacity-50';
  const numCls = `${inputCls} font-mono text-right`;

  const PayButton: React.FC<{ id: PaymentMethod; label: string; Icon: React.FC<{ className?: string }>; hint: string }> = ({ id, label, Icon, hint }) => (
    <button
      type="button"
      onClick={() => setMethod(id)}
      className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
        method === id ? 'bg-[#FF3366]/20 border-[#FF3366] text-white' : 'bg-[#121215] border-[#2B2B36] text-neutral-400 hover:text-white'
      }`}
      title={hint}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Punto de venta</h2>
          <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" /> F2 buscar producto · F4 consumidor final · F9 cobrar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* ============================================================ IZQUIERDA: CATÁLOGO + CARRITO */}
        <div className="xl:col-span-7 space-y-4">
          {/* Catálogo */}
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'services', label: 'Servicios', Icon: Sparkles },
                { id: 'products', label: 'Productos', Icon: Boxes },
                { id: 'appointments', label: `Citas (${pendingAppointments.length})`, Icon: CalendarCheck },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCatalogTab(t.id as typeof catalogTab)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    catalogTab === t.id ? 'bg-[#FF3366] text-white' : 'bg-[#121215] border border-[#2B2B36] text-neutral-400 hover:text-white'
                  }`}
                >
                  <t.Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
              {catalogTab === 'products' && (
                <div className="relative flex-1 min-w-[180px]">
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && products[0]) addProduct(products[0]);
                      if (e.key === 'Escape') setQuery('');
                    }}
                    placeholder="Buscar por nombre, marca o código (Enter agrega el primero)"
                    className={`${inputCls} pl-8`}
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                </div>
              )}
            </div>

            {catalogTab === 'services' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUICK_SERVICES.map(s => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => addService(s)}
                    className="p-3 rounded-xl bg-[#121215] border border-[#2B2B36] hover:border-[#FF3366]/60 text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{s.label}</span>
                      <Plus className="w-4 h-4 text-neutral-500 group-hover:text-[#FF3366]" />
                    </div>
                    <span className="text-[10px] text-neutral-500 capitalize">{s.category === 'tattoo' ? 'Tatuaje' : s.category === 'piercing' ? 'Piercing' : 'Servicio'}</span>
                  </button>
                ))}
              </div>
            )}

            {catalogTab === 'products' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {products.length === 0 ? (
                  <p className="col-span-full text-center text-[11px] text-neutral-500 py-6">
                    No hay productos para la venta{query ? ' con esa búsqueda' : ''}. Márquelos como "a la venta" en Inventario.
                  </p>
                ) : (
                  products.map(p => {
                    const noStock = p.currentStock <= 0;
                    const withVat = priceWithoutVat(p) * (1 + (typeof p.taxRate === 'number' ? p.taxRate : 15) / 100);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={noStock}
                        onClick={() => addProduct(p)}
                        className="p-2.5 rounded-xl bg-[#121215] border border-[#2B2B36] hover:border-[#FF3366]/60 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="text-xs font-bold text-white line-clamp-2">{p.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{p.brand}</div>
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
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {pendingAppointments.length === 0 ? (
                  <p className="text-center text-[11px] text-neutral-500 py-6">No hay citas pendientes por cobrar.</p>
                ) : (
                  pendingAppointments.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => loadAppointment(a)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer ${
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
          </div>

          {/* Carrito */}
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#24242B] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Detalle de la venta ({lines.length})</span>
              {linkedAppointment && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30">
                  Cita vinculada: {linkedAppointment.date} {linkedAppointment.startTime}
                </span>
              )}
            </div>
            {lines.length === 0 ? (
              <div className="p-10 text-center text-neutral-500 text-xs">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Toque un servicio, un producto o una cita para empezar.
              </div>
            ) : (
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
                      const priceLocked = !canChangePrice && (l.kind === 'product' || l.id.startsWith('apt-'));
                      const rate = effectiveTax(l);
                      const lineTotal = r2(lineBase(l) * (1 + rate / 100));
                      return (
                        <tr key={l.id} className="align-middle">
                          <td className="py-2 px-3">
                            <input
                              value={l.description}
                              onChange={e => updateLine(l.id, { description: e.target.value })}
                              disabled={l.kind === 'product'}
                              className="w-full bg-transparent border-b border-transparent focus:border-[#FF3366]/60 text-white text-xs focus:outline-none disabled:opacity-100"
                            />
                            <div className="text-[10px] text-neutral-500">
                              {l.kind === 'product' ? `Producto${l.sku ? ` · ${l.sku}` : ''}` : l.category === 'tattoo' ? 'Tatuaje' : l.category === 'piercing' ? 'Piercing' : 'Servicio'}
                              {l.category === 'tattoo' && (
                                <>
                                  {' · '}
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={l.hours ?? ''}
                                    onChange={e => updateLine(l.id, { hours: parseFloat(e.target.value) || 0 })}
                                    className="w-10 bg-transparent text-neutral-300 text-[10px] border-b border-[#2B2B36] focus:outline-none"
                                    aria-label="Horas"
                                  />{' '}
                                  h
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => updateLine(l.id, { quantity: l.quantity - 1 })} className="w-6 h-6 rounded-lg bg-[#121215] border border-[#2B2B36] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer" aria-label="Restar">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center font-mono text-white">{l.quantity}</span>
                              <button type="button" onClick={() => updateLine(l.id, { quantity: l.quantity + 1 })} className="w-6 h-6 rounded-lg bg-[#121215] border border-[#2B2B36] flex items-center justify-center text-[#FF3366] cursor-pointer" aria-label="Sumar">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.unitPrice || ''}
                              placeholder="0.00"
                              disabled={priceLocked}
                              title={priceLocked ? 'Sin permiso para modificar el precio' : undefined}
                              onChange={e => updateLine(l.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                              className={`${numCls} ${l.unitPrice <= 0 ? 'border-amber-500/60' : ''}`}
                              autoFocus={l.kind === 'service' && l.unitPrice === 0}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.discount || ''}
                              placeholder="0"
                              disabled={!canDiscount}
                              title={canDiscount ? undefined : 'Sin permiso para aplicar descuentos'}
                              onChange={e => updateLine(l.id, { discount: parseFloat(e.target.value) || 0 })}
                              className={numCls}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <UiSelect
                              value={rate}
                              disabled={isNotaVenta || !canChangeTax}
                              title={!canChangeTax ? 'Sin permiso para cambiar el IVA' : isNotaVenta ? 'La nota de venta RIMPE no lleva IVA' : undefined}
                              onChange={e => updateLine(l.id, { taxRate: parseFloat(e.target.value) })}
                              className={`${inputCls} px-1 text-right min-w-[72px]`}
                            >
                              {[standardVatRate, 5, 0].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                                <option key={v} value={v}>
                                  {v}%
                                </option>
                              ))}
                            </UiSelect>
                          </td>
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
            )}

            {/* Insumos de cabina */}
            {hasServices && (
              <div className="px-4 py-2.5 border-t border-[#24242B] space-y-2">
                <button type="button" onClick={() => setShowSupplies(v => !v)} className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer">
                  <Layers className="w-3.5 h-3.5 text-[#FF3366]" />
                  Insumos usados en cabina ({supplies.length}) — descuenta del Kardex
                </button>
                {showSupplies && (
                  <div className="space-y-1.5">
                    <UiSelect
                      value=""
                      onChange={e => {
                        const inv = inventory.find(i => i.id === e.target.value);
                        if (inv && !supplies.some(s => s.itemId === inv.id)) setSupplies(prev => [...prev, { itemId: inv.id, name: inv.name, quantity: 1 }]);
                      }}
                      className={inputCls}
                    >
                      <option value="">+ Agregar insumo…</option>
                      {inventory.filter(i => i.currentStock > 0).map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} (stock {i.currentStock})
                        </option>
                      ))}
                    </UiSelect>
                    {supplies.map(s => (
                      <div key={s.itemId} className="flex items-center gap-2 text-[11px]">
                        <span className="flex-1 text-neutral-300 truncate">{s.name}</span>
                        <input
                          type="number"
                          min="1"
                          value={s.quantity}
                          onChange={e => setSupplies(prev => prev.map(x => (x.itemId === s.itemId ? { ...x, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)))}
                          className="w-16 px-2 py-1 bg-[#121215] border border-[#2B2B36] rounded-lg text-white font-mono text-right"
                        />
                        <button type="button" onClick={() => setSupplies(prev => prev.filter(x => x.itemId !== s.itemId))} className="text-neutral-500 hover:text-red-400 cursor-pointer" aria-label="Quitar insumo">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Últimas ventas */}
          {recentSales.length > 0 && (
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
          )}
        </div>

        {/* ============================================================ DERECHA: COBRO */}
        <div className="xl:col-span-5 xl:sticky xl:top-4 space-y-3">
          {/* Cliente */}
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Cliente</span>
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

          {/* Artista y comprobante */}
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-4 grid grid-cols-2 gap-2.5">
            <label className="col-span-2 sm:col-span-1 block">
              <span className="block text-[10px] uppercase text-neutral-400 mb-1">Artista</span>
              <UiSelect
                value={artistId}
                onChange={e => {
                  setArtistId(e.target.value);
                  const a = artists.find(x => x.id === e.target.value);
                  if (a) {
                    setCommission(a.defaultCommissionRate);
                    setCommissionEdited(false);
                  }
                }}
                className={inputCls}
              >
                {artists.length === 0 && <option value="">Registre artistas primero</option>}
                {artists.filter(a => a.active).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </UiSelect>
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase text-neutral-400 mb-1">Comisión servicios %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={commission}
                disabled={!canChangeCommission}
                title={canChangeCommission ? undefined : 'Sin permiso para modificar la comisión'}
                onChange={e => {
                  setCommissionEdited(true);
                  setCommission(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)));
                }}
                className={numCls}
              />
            </label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              {(['factura', 'nota_venta'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocumentType(t)}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    documentType === t ? 'bg-[#FF3366]/20 border-[#FF3366] text-white' : 'bg-[#121215] border-[#2B2B36] text-neutral-400'
                  }`}
                >
                  {t === 'factura' ? `Factura electrónica (IVA ${standardVatRate}%)` : 'Nota de venta RIMPE'}
                </button>
              ))}
            </div>
          </div>

          {/* Totales y pago */}
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] p-4 space-y-3">
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

            <div className="p-3 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/40 flex items-end justify-between">
              <span className="text-xs font-bold text-white uppercase">Total a cobrar</span>
              <span className="font-mono text-3xl font-black text-white tabular-nums">{formatMoney(toCollect)}</span>
            </div>

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
                    <input type="number" min="0" step="0.01" value={split[k]} onChange={e => setSplit(s => ({ ...s, [k]: e.target.value }))} className={numCls} />
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

            {hasServices && !clientHasConsent && (
              <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={consentSigned} onChange={e => setConsentSigned(e.target.checked)} />
                Consentimiento informado firmado en papel
              </label>
            )}
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nota interna (opcional)" className={inputCls} />

            {cfBlocked && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-[11px] text-amber-200 flex gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Identifique al comprador.</strong> Por ley, a consumidor final solo se factura hasta ${CONSUMIDOR_FINAL_LIMIT}. Ingrese
                  cédula, RUC o pasaporte (o reduzca el valor).
                </span>
              </div>
            )}
            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-[11px] flex gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleCharge}
              disabled={lines.length === 0 || charging || cfBlocked}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white font-black text-base flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,51,102,0.35)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ReceiptText className="w-5 h-5" />
              {charging ? 'Emitiendo…' : cfBlocked ? `Identifique al cliente (más de $${CONSUMIDOR_FINAL_LIMIT})` : <>Cobrar {formatMoney(toCollect)} · F9</>}
            </button>
            <p className="text-[10px] text-neutral-500 text-center">
              {isNotaVenta ? 'Se emitirá una nota de venta RIMPE.' : 'La factura se enviará automáticamente al SRI.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
