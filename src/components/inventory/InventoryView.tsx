import React, { useState, useMemo } from 'react';
import {
  Boxes,
  PlusCircle,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { InventoryCategory, InventoryItem } from '../../types';

export const InventoryView: React.FC = () => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    adjustStock,
    deleteInventoryItem,
    formatMoney,
  } = useStudio();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('cartridge');
  const [currentStock, setCurrentStock] = useState<number>(10);
  const [minStockAlert, setMinStockAlert] = useState<number>(3);
  const [unit, setUnit] = useState('cajas');
  const [unitCost, setUnitCost] = useState<number>(25);
  const [retailPrice, setRetailPrice] = useState<string>('');
  const [isForSale, setIsForSale] = useState(false);
  const [location, setLocation] = useState('');
  const [sku, setSku] = useState('');

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesLow = !onlyLowStock || item.currentStock <= item.minStockAlert;

      return matchesSearch && matchesCat && matchesLow;
    });
  }, [inventory, searchTerm, categoryFilter, onlyLowStock]);

  const totalCostValuation = inventory.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
  const totalRetailPotential = inventory
    .filter(i => i.isForSale && i.retailPrice)
    .reduce((acc, i) => acc + i.currentStock * (i.retailPrice || 0), 0);
  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockAlert).length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setBrand('');
    setCategory('cartridge');
    setCurrentStock(5);
    setMinStockAlert(2);
    setUnit('piezas');
    setUnitCost(15);
    setRetailPrice('');
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
    setCurrentStock(item.currentStock);
    setMinStockAlert(item.minStockAlert);
    setUnit(item.unit);
    setUnitCost(item.unitCost);
    setRetailPrice(item.retailPrice !== undefined ? String(item.retailPrice) : '');
    setIsForSale(item.isForSale);
    setLocation(item.location || '');
    setSku(item.sku || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedRetail = retailPrice ? parseFloat(retailPrice) : undefined;

    if (editingItem) {
      updateInventoryItem(editingItem.id, {
        name: name.trim(),
        brand: brand.trim(),
        category,
        currentStock,
        minStockAlert,
        unit,
        unitCost,
        retailPrice: parsedRetail,
        isForSale,
        location: location.trim() || undefined,
        sku: sku.trim() || undefined,
      });
    } else {
      addInventoryItem({
        name: name.trim(),
        brand: brand.trim(),
        category,
        currentStock,
        minStockAlert,
        unit,
        unitCost,
        retailPrice: parsedRetail,
        isForSale,
        location: location.trim() || undefined,
        sku: sku.trim() || undefined,
      });
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Valorización Total Stock</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(totalCostValuation)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Precio de costo</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Potencial Venta (PVP)</span>
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

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex items-center justify-center">
          <button
            onClick={handleOpenAdd}
            className="w-full py-2.5 px-4 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Insumo / Joya</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar with Tag Pills */}
      <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por nombre, marca o SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
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
                className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap ${
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
            className={`px-3 py-1 text-xs rounded-full border transition-all flex items-center gap-1.5 whitespace-nowrap ml-2 ${
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

      {/* Inventory Table with Stepper Controls `- 1 +` matching reference */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4">Insumo / Producto</th>
                <th className="py-3.5 px-4">Marca</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Ubicación</th>
                <th className="py-3.5 px-4 text-center">Stock Actual</th>
                <th className="py-3.5 px-4 text-right">Costo Unidad</th>
                <th className="py-3.5 px-4 text-right">PVP Venta</th>
                <th className="py-3.5 px-4 text-right">Valor Total</th>
                <th className="py-3.5 px-4 text-center">Ajuste Stepper</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
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
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#1E1E25] transition-colors ${
                        isCritical ? 'bg-[#25151D]/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {isCritical && (
                            <span title="Stock bajo el mínimo">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />
                            </span>
                          )}
                          <span>{item.name}</span>
                        </div>
                        {item.sku && (
                          <span className="font-mono text-[10px] text-neutral-500">{item.sku}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-300">{item.brand}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-neutral-400">
                          {getCatLabel(item.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-400 text-[11px]">
                        {item.location || '—'}
                      </td>
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
                      <td className="py-3 px-4 text-right font-mono text-neutral-300 whitespace-nowrap">
                        {formatMoney(item.unitCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 whitespace-nowrap">
                        {item.retailPrice ? formatMoney(item.retailPrice) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatMoney(item.currentStock * item.unitCost)}
                      </td>

                      {/* Stepper Control `- 1 +` matching reference image */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 bg-[#121215] px-2 py-1 rounded-xl border border-[#272730]">
                          <button
                            onClick={() => adjustStock(item.id, -1)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors"
                            title="Restar 1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-xs px-2 text-white">
                            {item.currentStock}
                          </span>
                          <button
                            onClick={() => adjustStock(item.id, 1)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[#FF3366] hover:bg-[#25252E] transition-colors"
                            title="Sumar 1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#282834] transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 rounded-full text-neutral-500 hover:text-[#FF3366] hover:bg-[#282834] transition-colors"
                            title="Eliminar"
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

      {/* Add / Edit Inventory Modal matching reference Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {editingItem ? 'Editar Insumo / Joyería' : 'Registrar Nuevo Insumo / Joyería'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">Nombre del Insumo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cartuchos Kwadron 03RL o Labret Titanio F136"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Marca</label>
                  <input
                    type="text"
                    placeholder="Ej. Kwadron, Dynamic"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Categoría</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  >
                    <option value="cartridge">Agujas / Cartuchos</option>
                    <option value="ink">Tintas</option>
                    <option value="jewelry">Joyería Piercing (Titanio/Oro)</option>
                    <option value="aftercare">Aftercare</option>
                    <option value="hygiene">Bioseguridad</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={currentStock}
                    onChange={e => setCurrentStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Mínimo Alerta</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Unidad</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Costo Unitario *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitCost}
                    onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">PVP Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retailPrice}
                    onChange={e => {
                      setRetailPrice(e.target.value);
                      setIsForSale(Boolean(e.target.value));
                    }}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all"
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
