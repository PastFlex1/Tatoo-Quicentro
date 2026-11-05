import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  FileText,
  Truck,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  CreditCard,
  Building2,
  CheckCircle2,
  Package,
  Layers,
  AlertCircle,
  Clock,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Supplier, InventoryItem } from '../../types';
import { useStudio } from '../../context/StudioContext';

interface NewPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit?: PurchaseOrder | null;
  onOrderSaved?: (order: PurchaseOrder) => void;
}

export const NewPurchaseOrderModal: React.FC<NewPurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  orderToEdit,
  onOrderSaved,
}) => {
  const { suppliers, inventory, purchaseOrders, addPurchaseOrder, updatePurchaseOrder, formatMoney } = useStudio();

  // Selected supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierRuc, setSupplierRuc] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  // Searchable Supplier Combobox state
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Order Details
  const [orderNumber, setOrderNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Contado');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'credit_card'>('bank_transfer');
  const [status, setStatus] = useState<PurchaseOrderStatus>('draft');
  const [notes, setNotes] = useState('');

  // Items
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);

  // Item form for adding line
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemCategory, setItemCategory] = useState('cartridge');
  const [itemUnit, setItemUnit] = useState('cajas');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitCost, setItemUnitCost] = useState<number>(0);
  const [itemTaxRate, setItemTaxRate] = useState<number>(15);

  // Searchable Inventory Combobox state
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [isInventoryDropdownOpen, setIsInventoryDropdownOpen] = useState(false);
  const inventoryDropdownRef = useRef<HTMLDivElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
      if (inventoryDropdownRef.current && !inventoryDropdownRef.current.contains(e.target as Node)) {
        setIsInventoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Suppliers for searchable dropdown
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearchQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      sup =>
        sup.razonSocial.toLowerCase().includes(q) ||
        (sup.nombreComercial && sup.nombreComercial.toLowerCase().includes(q)) ||
        sup.ruc.toLowerCase().includes(q) ||
        (sup.contactoNombre && sup.contactoNombre.toLowerCase().includes(q)) ||
        (sup.ciudad && sup.ciudad.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearchQuery]);

  // Filtered Inventory Items for searchable dropdown
  const filteredInventory = useMemo(() => {
    const q = inventorySearchQuery.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      inv =>
        inv.name.toLowerCase().includes(q) ||
        (inv.sku && inv.sku.toLowerCase().includes(q)) ||
        (inv.category && inv.category.toLowerCase().includes(q)) ||
        (inv.supplier && inv.supplier.toLowerCase().includes(q))
    );
  }, [inventory, inventorySearchQuery]);

  // Auto-generate next Order Number
  const generateNextOrderNumber = () => {
    const currentYear = new Date().getFullYear();
    const count = purchaseOrders.length + 1;
    return `OC-${currentYear}-${String(count).padStart(4, '0')}`;
  };

  useEffect(() => {
    if (orderToEdit) {
      setSelectedSupplierId(orderToEdit.supplierId);
      setSupplierName(orderToEdit.supplierName);
      setSupplierRuc(orderToEdit.supplierRuc);
      setSupplierEmail(orderToEdit.supplierEmail || '');
      setSupplierPhone(orderToEdit.supplierPhone || '');
      setSupplierAddress(orderToEdit.supplierAddress || '');
      setSupplierSearchQuery(`${orderToEdit.supplierName} (${orderToEdit.supplierRuc})`);
      setOrderNumber(orderToEdit.orderNumber);
      setDate(orderToEdit.date);
      setExpectedDate(orderToEdit.expectedDate || '');
      setPaymentTerms(orderToEdit.paymentTerms || 'Contado');
      setPaymentMethod(orderToEdit.paymentMethod || 'bank_transfer');
      setStatus(orderToEdit.status);
      setNotes(orderToEdit.notes || '');
      setItems(orderToEdit.items || []);
      setInventorySearchQuery('');
      setIsSupplierDropdownOpen(false);
      setIsInventoryDropdownOpen(false);
    } else {
      // New Order defaults
      const nextNum = generateNextOrderNumber();
      setOrderNumber(nextNum);
      setDate(new Date().toISOString().split('T')[0]);
      setExpectedDate('');
      setPaymentTerms('Contado');
      setPaymentMethod('bank_transfer');
      setStatus('draft');
      setNotes('');
      setItems([]);
      setErrorMessage(null);
      setInventorySearchQuery('');
      setIsSupplierDropdownOpen(false);
      setIsInventoryDropdownOpen(false);

      if (suppliers.length > 0) {
        handleSupplierChange(suppliers[0].id);
      } else {
        setSupplierSearchQuery('');
      }
    }
  }, [orderToEdit, isOpen]);

  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId);
    const sup = suppliers.find(s => s.id === supId);
    if (sup) {
      const displayName = sup.razonSocial || sup.nombreComercial || '';
      setSupplierName(displayName);
      setSupplierRuc(sup.ruc);
      setSupplierEmail(sup.email || '');
      setSupplierPhone(sup.telefono || '');
      setSupplierAddress(sup.direccion || '');
      setSupplierSearchQuery(`${displayName} (${sup.ruc})`);
      if (sup.diasCredito && sup.diasCredito > 0) {
        setPaymentTerms(`Crédito ${sup.diasCredito} días`);
      } else {
        setPaymentTerms('Contado');
      }
    }
    setIsSupplierDropdownOpen(false);
  };

  const handleSelectInventoryItem = (invId: string) => {
    setSelectedInventoryId(invId);
    if (!invId) {
      setInventorySearchQuery('');
      return;
    }

    const inv = inventory.find(i => i.id === invId);
    if (inv) {
      setItemName(inv.name);
      setItemCode(inv.sku || '');
      setItemCategory(inv.category || 'supplies');
      setItemUnit(inv.unit || 'unidad');
      setItemUnitCost(inv.unitCost || 0);
      setItemTaxRate(typeof inv.taxRate === 'number' ? inv.taxRate : 15);
      setInventorySearchQuery(`${inv.name}${inv.sku ? ` [${inv.sku}]` : ''}`);
    }
    setIsInventoryDropdownOpen(false);
  };

  const handleAddItem = () => {
    if (!itemName.trim()) {
      setErrorMessage('Por favor ingrese el nombre del producto o insumo.');
      return;
    }
    if (itemQuantity <= 0) {
      setErrorMessage('La cantidad debe ser mayor a 0.');
      return;
    }
    if (itemUnitCost < 0) {
      setErrorMessage('El costo unitario no puede ser negativo.');
      return;
    }

    const sub = Math.round(itemQuantity * itemUnitCost * 100) / 100;
    const taxAmt = Math.round(((sub * itemTaxRate) / 100) * 100) / 100;
    const tot = Math.round((sub + taxAmt) * 100) / 100;

    const newItem: PurchaseOrderItem = {
      id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      inventoryItemId: selectedInventoryId || undefined,
      code: itemCode.trim() || undefined,
      name: itemName.trim(),
      category: itemCategory,
      quantity: Number(itemQuantity),
      unit: itemUnit,
      unitCost: Number(itemUnitCost),
      subtotal: sub,
      taxRate: Number(itemTaxRate),
      taxAmount: taxAmt,
      total: tot,
    };

    setItems(prev => [...prev, newItem]);

    // Reset single item form
    setSelectedInventoryId('');
    setInventorySearchQuery('');
    setItemName('');
    setItemCode('');
    setItemQuantity(1);
    setItemUnitCost(0);
    setErrorMessage(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Calculations
  const calculatedSubtotal = Math.round(
    items.reduce((acc, it) => acc + (it.subtotal || 0), 0) * 100
  ) / 100;

  const calculatedTax = Math.round(
    items.reduce((acc, it) => acc + (it.taxAmount || 0), 0) * 100
  ) / 100;

  const calculatedTotal = Math.round((calculatedSubtotal + calculatedTax) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !supplierRuc.trim()) {
      setErrorMessage('Debe seleccionar un proveedor con RUC válido.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Debe agregar al menos un ítem a la orden de compra.');
      return;
    }

    const orderData = {
      orderNumber: orderNumber.trim() || generateNextOrderNumber(),
      date,
      expectedDate: expectedDate || undefined,
      supplierId: selectedSupplierId || 'sup-generic',
      supplierName,
      supplierRuc,
      supplierEmail: supplierEmail || undefined,
      supplierPhone: supplierPhone || undefined,
      supplierAddress: supplierAddress || undefined,
      items,
      subtotal: calculatedSubtotal,
      taxRate: 15,
      taxAmount: calculatedTax,
      total: calculatedTotal,
      status,
      paymentTerms,
      paymentMethod,
      notes: notes.trim() || undefined,
    };

    if (orderToEdit) {
      updatePurchaseOrder(orderToEdit.id, orderData);
      if (onOrderSaved) {
        onOrderSaved({
          ...orderToEdit,
          ...orderData,
        });
      }
    } else {
      const created = addPurchaseOrder(orderData);
      if (onOrderSaved) {
        onOrderSaved(created);
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242C] bg-[#121215] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {orderToEdit ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
              </h3>
              <p className="text-xs text-neutral-400">
                Adquisición de insumos, cartuchos, agujas, tintas y bioseguridad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-[#202027] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Proveedor y Datos Básicos */}
          <div className="bg-[#1C1C24] p-4 sm:p-5 rounded-2xl border border-[#2B2B38] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-[#FF3366]" />
              <span>1. Datos del Proveedor & Encabezado</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Searchable Select Supplier (Escribir o desplegar lista) */}
              <div className="sm:col-span-2 relative" ref={supplierDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Proveedor Registrado (Escribe o selecciona) *
                  </label>
                  {selectedSupplierId && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                      ✓ Proveedor seleccionado
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={supplierSearchQuery}
                    onFocus={() => setIsSupplierDropdownOpen(true)}
                    onChange={e => {
                      const val = e.target.value;
                      setSupplierSearchQuery(val);
                      setIsSupplierDropdownOpen(true);
                      if (!val.trim()) {
                        setSelectedSupplierId('');
                        setSupplierName('');
                        setSupplierRuc('');
                      } else {
                        setSupplierName(val);
                      }
                    }}
                    placeholder="Buscar por nombre comercial, razón social o RUC..."
                    className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl pl-9 pr-14 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF3366] transition-colors"
                  />

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {supplierSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierSearchQuery('');
                          setSelectedSupplierId('');
                          setSupplierName('');
                          setSupplierRuc('');
                          setIsSupplierDropdownOpen(true);
                        }}
                        className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#24242F] transition-colors cursor-pointer"
                        title="Limpiar búsqueda de proveedor"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsSupplierDropdownOpen(prev => !prev)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#24242F] transition-colors cursor-pointer"
                      title="Desplegar lista de proveedores"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isSupplierDropdownOpen ? 'rotate-180 text-[#FF3366]' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Dropdown List of Suppliers */}
                {isSupplierDropdownOpen && (
                  <div className="absolute z-40 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-[#141419] border border-[#2F2F3D] rounded-2xl shadow-2xl divide-y divide-[#22222C] custom-scrollbar">
                    {filteredSuppliers.length === 0 ? (
                      <div className="p-3.5 text-center text-xs text-neutral-400">
                        <p className="font-semibold text-white">No se encontraron proveedores que coincidan</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Puedes usar el nombre escrito manualmente e ingresar su RUC abajo.
                        </p>
                      </div>
                    ) : (
                      filteredSuppliers.map(sup => {
                        const isSelected = sup.id === selectedSupplierId;
                        return (
                          <button
                            key={sup.id}
                            type="button"
                            onClick={() => handleSupplierChange(sup.id)}
                            className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#FF3366]/15 text-white'
                                : 'hover:bg-[#1E1E26] text-neutral-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white truncate">
                                  {sup.razonSocial}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-neutral-400 mt-0.5">
                                <span className="font-mono text-neutral-300">RUC: {sup.ruc}</span>
                                {sup.nombreComercial && (
                                  <span className="text-[#FF3366] font-medium">• {sup.nombreComercial}</span>
                                )}
                                {sup.ciudad && <span>• {sup.ciudad}</span>}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                                  (sup.diasCredito ?? 0) > 0
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                    : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                }`}
                              >
                                {(sup.diasCredito ?? 0) === 0 ? 'Contado' : `${sup.diasCredito} días`}
                              </span>
                              {(sup.diasCredito ?? 0) > 0 && (sup.cupoCredito ?? 0) > 0 && (
                                <span className="block text-[9.5px] font-mono text-neutral-400 mt-0.5">
                                  Cupo: {formatMoney(sup.cupoCredito)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Order Number */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  N° de Orden (Secuencial)
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="OC-2026-0001"
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#FF3366] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Read-only / Editable details for provider */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  R.U.C. Proveedor
                </label>
                <input
                  type="text"
                  value={supplierRuc}
                  onChange={e => setSupplierRuc(e.target.value)}
                  className="w-full bg-[#121215]/80 border border-[#24242F] rounded-xl px-3 py-2 text-xs text-neutral-300 font-mono"
                  placeholder="1792345678001"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Fecha Requerida de Entrega
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Condición de Pago
                </label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                >
                  <option value="Contado">Contado</option>
                  <option value="Crédito 15 días">Crédito 15 días</option>
                  <option value="Crédito 30 días">Crédito 30 días</option>
                  <option value="Crédito 60 días">Crédito 60 días</option>
                  <option value="50% Anticipo - 50% Entrega">50% Anticipo - 50% Entrega</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Método de Pago Sugerido
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                >
                  <option value="bank_transfer">Transferencia Bancaria (Pichincha / Produbanco)</option>
                  <option value="cash">Efectivo en Caja</option>
                  <option value="credit_card">Tarjeta de Crédito Corporativa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Estado de la Orden
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as PurchaseOrderStatus)}
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                >
                  <option value="draft">Borrador (Draft)</option>
                  <option value="sent">Enviada a Proveedor (Sent)</option>
                  <option value="received">Recibida en Bodega (Received)</option>
                  <option value="cancelled">Cancelada (Cancelled)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Agregar Ítems / Productos */}
          <div className="bg-[#1C1C24] p-4 sm:p-5 rounded-2xl border border-[#2B2B38] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                <Package className="w-4 h-4 text-[#FF3366]" />
                <span>2. Artículos e Insumos de la Orden</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                {items.length} {items.length === 1 ? 'producto' : 'productos'} en la lista
              </span>
            </div>

            {/* Quick selector from Inventory (Searchable Combobox + Manual fields) */}
            <div className="bg-[#141419] p-3.5 rounded-xl border border-[#282833] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-neutral-300">
                  Buscar insumo / producto en inventario (escribe para filtrar o despliega la lista):
                </div>
                {selectedInventoryId && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                    ✓ Vinculado a Bodega / Kardex
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Searchable Inventory Combobox */}
                <div className="sm:col-span-5 relative" ref={inventoryDropdownRef}>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={inventorySearchQuery}
                      onFocus={() => setIsInventoryDropdownOpen(true)}
                      onChange={e => {
                        const val = e.target.value;
                        setInventorySearchQuery(val);
                        setIsInventoryDropdownOpen(true);
                        if (!val.trim()) {
                          setSelectedInventoryId('');
                        } else if (!selectedInventoryId) {
                          // Si escribe directamente en el buscador, también autocompleta la descripción
                          setItemName(val);
                        }
                      }}
                      placeholder="Escribe nombre, SKU o despliega..."
                      className="w-full bg-[#1A1A22] border border-[#30303D] rounded-xl pl-9 pr-14 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF3366] transition-colors"
                    />

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {inventorySearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setInventorySearchQuery('');
                            setSelectedInventoryId('');
                            setIsInventoryDropdownOpen(true);
                          }}
                          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#282834] transition-colors cursor-pointer"
                          title="Limpiar búsqueda de insumo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsInventoryDropdownOpen(prev => !prev)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#282834] transition-colors cursor-pointer"
                        title="Desplegar lista de insumos"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            isInventoryDropdownOpen ? 'rotate-180 text-[#FF3366]' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown List of Inventory Items */}
                  {isInventoryDropdownOpen && (
                    <div className="absolute z-40 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-[#16161D] border border-[#323242] rounded-2xl shadow-2xl divide-y divide-[#23232F] custom-scrollbar">
                      {filteredInventory.length === 0 ? (
                        <div className="p-3.5 text-center text-xs text-neutral-400">
                          <p className="font-semibold text-white">No hay insumos que coincidan con "{inventorySearchQuery}"</p>
                          <p className="text-[10.5px] text-neutral-500 mt-0.5">
                            Puedes agregarlo como ítem manual completando la descripción y el costo.
                          </p>
                        </div>
                      ) : (
                        filteredInventory.map(inv => {
                          const isSelected = inv.id === selectedInventoryId;
                          const isLowStock = inv.currentStock <= (inv.minStockAlert || 5);
                          return (
                            <button
                              key={inv.id}
                              type="button"
                              onClick={() => handleSelectInventoryItem(inv.id)}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FF3366]/15 text-white'
                                  : 'hover:bg-[#20202A] text-neutral-200'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white truncate">
                                    {inv.name}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                                  {inv.sku && (
                                    <span className="font-mono text-neutral-300 bg-[#121217] px-1.5 py-0.2 rounded border border-[#272733]">
                                      {inv.sku}
                                    </span>
                                  )}
                                  <span
                                    className={`font-mono font-semibold ${
                                      isLowStock ? 'text-amber-400' : 'text-emerald-400'
                                    }`}
                                  >
                                    Stock: {inv.currentStock} {inv.unit}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 font-mono">
                                <span className="text-xs font-bold text-white block">
                                  {formatMoney(inv.unitCost)}
                                </span>
                                <span className="text-[9.5px] text-neutral-500 block">
                                  Costo unit.
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    placeholder="Descripción del ítem *"
                    className="w-full bg-[#1A1A22] border border-[#30303D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    placeholder="Código / SKU"
                    className="w-full bg-[#1A1A22] border border-[#30303D] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#FF3366]"
                  />
                </div>
              </div>

              {/* Quantities, Unit, Cost and Add button */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={itemQuantity}
                    onChange={e => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#1A1A22] border border-[#30303D] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-[#FF3366]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                    Unidad
                  </label>
                  <select
                    value={itemUnit}
                    onChange={e => setItemUnit(e.target.value)}
                    className="w-full bg-[#1A1A22] border border-[#30303D] rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                  >
                    <option value="cajas">cajas</option>
                    <option value="frascos">frascos</option>
                    <option value="piezas">piezas / unidades</option>
                    <option value="rollos">rollos</option>
                    <option value="paquetes">paquetes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                    Costo Unit. ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemUnitCost}
                    onChange={e => setItemUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#1A1A22] border border-[#30303D] rounded-xl px-3 py-2 text-xs text-white font-mono text-right focus:outline-none focus:border-[#FF3366]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                    IVA (%)
                  </label>
                  <select
                    value={itemTaxRate}
                    onChange={e => setItemTaxRate(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1A1A22] border border-[#30303D] rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                  >
                    <option value="15">15% (General)</option>
                    <option value="0">0% (Exento)</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 text-xs border border-dashed border-[#2B2B38] rounded-xl">
                No hay productos agregados a esta orden todavía.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#2B2B38]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#141419] text-neutral-400 font-bold border-b border-[#24242F] text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-right">Cant.</th>
                      <th className="py-2.5 px-3 text-center">Unidad</th>
                      <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                      <th className="py-2.5 px-3 text-right">IVA %</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24242F]">
                    {items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-[#1A1A24]/60">
                        <td className="py-2 px-3 font-mono text-[11px] text-neutral-400">
                          {it.code || '-'}
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-white">{it.name}</p>
                          <span className="text-[10px] text-neutral-500 uppercase">
                            {it.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white">
                          {it.quantity}
                        </td>
                        <td className="py-2 px-3 text-center text-neutral-400">
                          {it.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-neutral-300">
                          {formatMoney(it.unitCost)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-neutral-400">
                          {it.taxRate}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white">
                          {formatMoney(it.subtotal)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            className="text-neutral-500 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Observaciones y Totales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Observaciones / Instrucciones de Entrega
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Ej. Entregar en Quicentro Shopping local 214 de 10:00 a 17:00. Incluir factura con IVA 15%."
                className="w-full bg-[#1C1C24] border border-[#2B2B38] rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF3366]"
              />
            </div>

            {/* Financial Totals */}
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2B2B38] space-y-2">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Subtotal Neto:</span>
                <span className="font-mono font-medium text-white">{formatMoney(calculatedSubtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>IVA Estimado (15%):</span>
                <span className="font-mono font-medium text-white">{formatMoney(calculatedTax)}</span>
              </div>
              <div className="border-t border-[#2B2B38] pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Total Orden de Compra:</span>
                <span className="text-xl font-black text-[#FF3366] font-mono">
                  {formatMoney(calculatedTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#24242C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_16px_rgba(255,51,102,0.35)] cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{orderToEdit ? 'Guardar Cambios' : 'Crear Orden de Compra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
