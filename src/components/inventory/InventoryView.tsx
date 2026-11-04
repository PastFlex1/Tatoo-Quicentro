import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  Edit2,
  Trash2,
  X,
  Layers,
  Truck,
  DollarSign,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { InventoryCategory, InventoryItem, VatRateType } from '../../types';

export const InventoryView: React.FC = () => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    adjustStock,
    deleteInventoryItem,
    setActiveTab,
    formatMoney,
  } = useStudio();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form states - numeric fields use string states to prevent the stuck '0' bug
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('cartridge');
  const [currentStockStr, setCurrentStockStr] = useState<string>('10');
  const [minStockAlertStr, setMinStockAlertStr] = useState<string>('3');
  const [unit, setUnit] = useState('cajas');
  const [unitCostStr, setUnitCostStr] = useState<string>('25.00');

  // Supplier & SRI VAT fields
  const [supplier, setSupplier] = useState<string>('');
  const [taxRate, setTaxRate] = useState<VatRateType>(15);
  const [priceWithoutVatStr, setPriceWithoutVatStr] = useState<string>('');
  const [priceWithVatStr, setPriceWithVatStr] = useState<string>('');
  const [isForSale, setIsForSale] = useState(false);
  const [location, setLocation] = useState('');
  const [sku, setSku] = useState('');

  // Extract existing supplier names for quick datalist autocomplete
  const existingSuppliers = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => {
      if (i.supplier && i.supplier.trim()) set.add(i.supplier.trim());
    });
    return Array.from(set).sort();
  }, [inventory]);

  const getVatPercentage = (rate: VatRateType): number => {
    if (rate === 15) return 15;
    if (rate === 5) return 5;
    return 0; // 0, 'NO_OBJETO', 'EXENTO'
  };

  // Two-way dynamic price calculation: editing sin IVA recalculates con IVA
  const handlePriceWithoutVatChange = (valStr: string) => {
    setPriceWithoutVatStr(valStr);
    if (valStr.trim() === '') {
      setPriceWithVatStr('');
      setIsForSale(false);
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 0) {
      const pct = getVatPercentage(taxRate);
      const conIva = val * (1 + pct / 100);
      setPriceWithVatStr(conIva.toFixed(2));
      setIsForSale(true);
    }
  };

  // Two-way dynamic price calculation: editing con IVA recalculates sin IVA
  const handlePriceWithVatChange = (valStr: string) => {
    setPriceWithVatStr(valStr);
    if (valStr.trim() === '') {
      setPriceWithoutVatStr('');
      setIsForSale(false);
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 0) {
      const pct = getVatPercentage(taxRate);
      const sinIva = val / (1 + pct / 100);
      setPriceWithoutVatStr(sinIva.toFixed(2));
      setIsForSale(true);
    }
  };

  // Changing VAT rate recalculates con IVA preserving sin IVA (or vice-versa)
  const handleTaxRateChange = (newRate: VatRateType) => {
    setTaxRate(newRate);
    const pct = getVatPercentage(newRate);
    if (priceWithoutVatStr.trim() !== '') {
      const val = parseFloat(priceWithoutVatStr);
      if (!isNaN(val)) {
        setPriceWithVatStr((val * (1 + pct / 100)).toFixed(2));
      }
    } else if (priceWithVatStr.trim() !== '') {
      const val = parseFloat(priceWithVatStr);
      if (!isNaN(val)) {
        setPriceWithoutVatStr((val / (1 + pct / 100)).toFixed(2));
      }
    }
  };

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.supplier && item.supplier.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesLow = !onlyLowStock || item.currentStock <= item.minStockAlert;

      return matchesSearch && matchesCat && matchesLow;
    });
  }, [inventory, searchTerm, categoryFilter, onlyLowStock]);

  const totalCostValuation = inventory.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
  const totalRetailPotential = inventory
    .filter(i => i.isForSale && (i.priceWithVat || i.retailPrice))
    .reduce((acc, i) => acc + i.currentStock * (i.priceWithVat || i.retailPrice || 0), 0);
  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockAlert).length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setBrand('');
    setCategory('cartridge');
    setCurrentStockStr('5');
    setMinStockAlertStr('2');
    setUnit('piezas');
    setUnitCostStr('15.00');
    setSupplier('');
    setTaxRate(15);
    setPriceWithoutVatStr('');
    setPriceWithVatStr('');
    setIsForSale(false);
    setLocation('');
    setSku('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setBrand(item.brand);
    setCategory(item.category);
    setCurrentStockStr(String(item.currentStock));
    setMinStockAlertStr(String(item.minStockAlert));
    setUnit(item.unit);
    setUnitCostStr(String(item.unitCost));
    setSupplier(item.supplier || '');

    const currentTaxRate: VatRateType = item.taxRate !== undefined ? item.taxRate : 15;
    setTaxRate(currentTaxRate);
    const pct = getVatPercentage(currentTaxRate);

    let sinIva = '';
    let conIva = '';

    if (item.priceWithoutVat !== undefined) {
      sinIva = String(item.priceWithoutVat);
      conIva =
        item.priceWithVat !== undefined
          ? String(item.priceWithVat)
          : (item.priceWithoutVat * (1 + pct / 100)).toFixed(2);
    } else if (item.priceWithVat !== undefined) {
      conIva = String(item.priceWithVat);
      sinIva = (item.priceWithVat / (1 + pct / 100)).toFixed(2);
    } else if (item.retailPrice !== undefined) {
      conIva = String(item.retailPrice);
      sinIva = (item.retailPrice / (1 + pct / 100)).toFixed(2);
    }

    setPriceWithoutVatStr(sinIva);
    setPriceWithVatStr(conIva);
    setIsForSale(item.isForSale || Boolean(conIva || sinIva));
    setLocation(item.location || '');
    setSku(item.sku || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Parse safely avoiding 0 lock
    const parsedStock =
      currentStockStr.trim() === '' ? 0 : Math.max(0, parseInt(currentStockStr, 10) || 0);
    const parsedMinStock =
      minStockAlertStr.trim() === '' ? 1 : Math.max(1, parseInt(minStockAlertStr, 10) || 1);
    const parsedUnitCost =
      unitCostStr.trim() === '' ? 0 : Math.max(0, parseFloat(unitCostStr) || 0);

    const parsedPriceWithoutVat =
      priceWithoutVatStr.trim() !== ''
        ? Math.max(0, parseFloat(priceWithoutVatStr) || 0)
        : undefined;

    const parsedPriceWithVat =
      priceWithVatStr.trim() !== ''
        ? Math.max(0, parseFloat(priceWithVatStr) || 0)
        : undefined;

    // retailPrice keeps backward compatibility with POS and Kardex
    const retailPrice = parsedPriceWithVat ?? parsedPriceWithoutVat;
    const isActuallyForSale = isForSale || Boolean(retailPrice);

    const itemPayload = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      currentStock: parsedStock,
      minStockAlert: parsedMinStock,
      unit: unit.trim() || 'piezas',
      unitCost: parsedUnitCost,
      supplier: supplier.trim() || undefined,
      taxRate,
      priceWithoutVat: parsedPriceWithoutVat,
      priceWithVat: parsedPriceWithVat,
      retailPrice,
      isForSale: isActuallyForSale,
      location: location.trim() || undefined,
      sku: sku.trim() || undefined,
    };

    if (editingItem) {
      updateInventoryItem(editingItem.id, itemPayload);
    } else {
      addInventoryItem(itemPayload);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, itemName: string) => {
    if (confirm(`¿Eliminar insumo "${itemName}" del inventario?`)) {
      deleteInventoryItem(id);
    }
  };

  const getCatLabel = (cat: InventoryCategory) => {
    switch (cat) {
      case 'ink':
        return 'Tintas';
      case 'cartridge':
        return 'Agujas / Cartuchos';
      case 'jewelry':
        return 'Joyería Piercing';
      case 'aftercare':
        return 'Aftercare & Cremas';
      case 'hygiene':
        return 'Bioseguridad';
      default:
        return 'Insumo';
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Valorización Total Stock</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(totalCostValuation)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Precio de costo</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Potencial Venta (PVP con IVA)</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(totalRetailPotential)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Joyería & Aftercare</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Alertas de Reposición</span>
          <span
            className={`text-lg font-bold font-mono tabular-nums ${
              lowStockCount > 0 ? 'text-[#FF3366]' : 'text-neutral-300'
            }`}
          >
            {lowStockCount} insumo(s)
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Bajo mínimo sanitario</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="w-full py-2 px-4 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Insumo / Joya</span>
          </button>
          <button
            onClick={() => setActiveTab('kardex')}
            className="w-full py-1.5 px-4 rounded-full bg-[#121215] border border-[#FF3366]/50 text-[#FF3366] hover:bg-[#FF3366]/10 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Abrir Kardex de Insumos</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar por nombre, marca, proveedor o SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todo' },
            { id: 'cartridge', label: 'Agujas' },
            { id: 'ink', label: 'Tintas' },
            { id: 'jewelry', label: 'Joyería' },
            { id: 'aftercare', label: 'Aftercare' },
            { id: 'hygiene', label: 'Bioseguridad' },
          ].map(tag => {
            const isActive = categoryFilter === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setCategoryFilter(tag.id)}
                className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                    : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                }`}
              >
                {tag.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-1 text-xs rounded-full border transition-all flex items-center gap-1.5 whitespace-nowrap ml-auto md:ml-2 shrink-0 cursor-pointer ${
              onlyLowStock
                ? 'bg-[#FF3366] text-white font-bold border-[#FF3366]'
                : 'bg-[#121215] border-[#272730] text-neutral-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Stock Bajo</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4 whitespace-nowrap">Insumo / Producto</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Proveedor</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Categoría</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ubicación</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Stock Actual</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Costo Unit.</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">PVP Venta (SRI)</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Valor Total</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Ajuste Stepper</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-500">
                    No hay insumos registrados con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isCritical = item.currentStock <= item.minStockAlert;
                  const vatPct = getVatPercentage(item.taxRate !== undefined ? item.taxRate : 15);
                  const pvpConIva = item.priceWithVat ?? item.retailPrice;
                  const pvpSinIva =
                    item.priceWithoutVat ??
                    (item.retailPrice ? item.retailPrice / (1 + vatPct / 100) : undefined);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#1E1E25] transition-colors ${
                        isCritical ? 'bg-[#25151D]/40' : ''
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {isCritical && (
                            <span title="Stock bajo el mínimo sanitario">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />
                            </span>
                          )}
                          <span>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.brand && (
                            <span className="text-[11px] text-neutral-400 font-medium">
                              {item.brand}
                            </span>
                          )}
                          {item.sku && (
                            <span className="font-mono text-[10px] text-neutral-500 bg-[#121215] px-1.5 py-0.5 rounded border border-[#272730]">
                              {item.sku}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.supplier ? (
                          <div className="flex items-center gap-1.5 text-neutral-300">
                            <Truck className="w-3 h-3 text-[#FF3366]/70 shrink-0" />
                            <span className="font-medium text-[11px]">{item.supplier}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-600 text-[11px] italic">Sin proveedor</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-neutral-400">
                          {getCatLabel(item.category)}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-neutral-400 text-[11px] whitespace-nowrap">
                        {item.location || '—'}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                            isCritical
                              ? 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                              : 'text-white'
                          }`}
                        >
                          {item.currentStock} {item.unit}
                        </span>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3 px-4 text-right font-mono text-neutral-300 whitespace-nowrap">
                        {formatMoney(item.unitCost)}
                      </td>

                      {/* PVP Venta con y sin IVA */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        {item.isForSale || pvpConIva ? (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-emerald-400 text-xs">
                              {pvpConIva ? formatMoney(pvpConIva) : '—'}
                              <span className="text-[9px] text-neutral-400 font-normal ml-1">con IVA</span>
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-0.5">
                              <span>Sin IVA: {pvpSinIva ? formatMoney(pvpSinIva) : '—'}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-[#121215] text-neutral-300 border border-[#272730]">
                                {item.taxRate === 15 || item.taxRate === undefined
                                  ? '15%'
                                  : item.taxRate === 5
                                  ? '5%'
                                  : item.taxRate === 0
                                  ? '0%'
                                  : String(item.taxRate)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[11px] italic">Insumo Interno</span>
                        )}
                      </td>

                      {/* Total Cost Valuation */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatMoney(item.currentStock * item.unitCost)}
                      </td>

                      {/* Stepper adjustment */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 bg-[#121215] px-2 py-1 rounded-xl border border-[#272730]">
                          <button
                            onClick={() => adjustStock(item.id, -1)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors cursor-pointer"
                            title="Restar 1 (registra salida en Kardex)"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-xs px-2 text-white">
                            {item.currentStock}
                          </span>
                          <button
                            onClick={() => adjustStock(item.id, 1)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[#FF3366] hover:bg-[#25252E] transition-colors cursor-pointer"
                            title="Sumar 1 (registra entrada en Kardex)"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#282834] transition-colors cursor-pointer"
                            title="Editar insumo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 rounded-full text-neutral-500 hover:text-[#FF3366] hover:bg-[#282834] transition-colors cursor-pointer"
                            title="Eliminar insumo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Inventory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF3366]/20 flex items-center justify-center text-[#FF3366]">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {editingItem ? 'Editar Insumo / Joyería' : 'Registrar Nuevo Insumo / Joyería'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Nombre del Insumo / Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cartuchos Kwadron 03RL, Tinta Dynamic Triple Black o Labret Titanio"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Marca / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ej. Kwadron, Dynamic, Anatometal, Balm Tattoo"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Categoría</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60 transition-colors cursor-pointer"
                  >
                    <option value="cartridge">Agujas / Cartuchos de Tatuaje</option>
                    <option value="ink">Tintas para Tatuaje</option>
                    <option value="jewelry">Joyería Piercing (Titanio F136 / Oro)</option>
                    <option value="aftercare">Aftercare & Bálsamos Cicatrizantes</option>
                    <option value="hygiene">Bioseguridad & Desinfección</option>
                    <option value="equipment">Equipamiento & Fuentes</option>
                  </select>
                </div>
              </div>

              {/* Supplier & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#FF3366]" />
                    <span>Proveedor / Distribuidor</span>
                  </label>
                  <input
                    type="text"
                    list="suppliers-datalist"
                    placeholder="Ej. Kwadron Ecuador, Dynamic Imports, Titanium Supply"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                  <datalist id="suppliers-datalist">
                    {existingSuppliers.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Código SKU / Barras
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. KW-03RL, DYN-TB-8"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
              </div>

              {/* Stock Actual, Minimo Alerta, Unidad - Strings with onFocus select to prevent 0 stuck */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Stock Actual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={currentStockStr}
                    onChange={e => setCurrentStockStr(e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Mínimo Alerta *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={minStockAlertStr}
                    onChange={e => setMinStockAlertStr(e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="1"
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Unidad de Medida
                  </label>
                  <input
                    type="text"
                    placeholder="piezas, cajas, frascos, ml"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
              </div>

              {/* Unit Cost & Ubicación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Costo Unitario Compra ($ USD) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitCostStr}
                    onChange={e => setUnitCostStr(e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Ubicación en Estudio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Estante A, Cabina 1, Vitrina Mostrador"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
              </div>

              {/* Sección de Precios SRI (Tipo de IVA, Precio Sin IVA, Precio Con IVA) */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#121215] border border-[#272730] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#FF3366]" />
                    <span className="font-bold text-white text-xs">
                      Precios de Venta al Público (PVP) & SRI Ecuador
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={isForSale}
                      onChange={e => setIsForSale(e.target.checked)}
                      className="rounded accent-[#FF3366] w-3.5 h-3.5"
                    />
                    <span>Disponible para venta</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Tipo de IVA */}
                  <div>
                    <label className="block font-medium text-neutral-300 mb-1 text-[11px]">
                      Tipo de IVA (SRI)
                    </label>
                    <select
                      value={String(taxRate)}
                      onChange={e => {
                        const v = e.target.value;
                        const parsedRate: VatRateType =
                          v === '15' ? 15 : v === '5' ? 5 : v === '0' ? 0 : (v as any);
                        handleTaxRateChange(parsedRate);
                      }}
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2D2D38] rounded-xl text-white text-xs focus:outline-hidden focus:border-[#FF3366]/60 transition-colors cursor-pointer"
                    >
                      <option value="15">15% (Tarifa General Ecuador)</option>
                      <option value="5">5% (Tarifa Reducida)</option>
                      <option value="0">0% (Tarifa 0% Insumos Médicos)</option>
                      <option value="NO_OBJETO">No Objeto de IVA</option>
                      <option value="EXENTO">Exento de IVA</option>
                    </select>
                  </div>

                  {/* Precio Sin IVA */}
                  <div>
                    <label className="block font-medium text-neutral-300 mb-1 text-[11px]">
                      PVP Sin IVA ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-neutral-500 font-mono text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={priceWithoutVatStr}
                        onChange={e => handlePriceWithoutVatChange(e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full pl-7 pr-3 py-2 bg-[#17171C] border border-[#2D2D38] rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Precio Con IVA */}
                  <div>
                    <label className="block font-medium text-neutral-300 mb-1 text-[11px]">
                      PVP Con IVA ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-emerald-400 font-mono text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={priceWithVatStr}
                        onChange={e => handlePriceWithVatChange(e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full pl-7 pr-3 py-2 bg-[#17171C] border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xs focus:outline-hidden focus:border-emerald-500 transition-colors font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>
                    Cálculo bidireccional automático: al escribir en Sin IVA o Con IVA, el otro se
                    calcula al instante con la tarifa SRI seleccionada ({getVatPercentage(taxRate)}%).
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                >
                  {editingItem ? 'Guardar Cambios' : 'Registrar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
