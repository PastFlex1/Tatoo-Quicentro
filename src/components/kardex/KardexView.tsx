import React, { useState, useMemo } from 'react';
import {
  Boxes,
  PlusCircle,
  Download,
  Printer,
  Search,
  Filter,
  X,
  Layers,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { KardexMovementType } from '../../types';

export const KardexView: React.FC = () => {
  const {
    inventory,
    kardexMovements,
    artists,
    formatMoney,
    addKardexMovement,
  } = useStudio();

  // Filters state
  const [selectedItemFilter, setSelectedItemFilter] = useState<string>('all');
  const [kardexTypeFilter, setKardexTypeFilter] = useState<string>('all');
  const [kardexSearch, setKardexSearch] = useState<string>('');
  const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);

  // Kardex Movement Modal Form
  const [kdxItemId, setKdxItemId] = useState<string>(inventory[0]?.id || '');
  const [kdxType, setKdxType] = useState<KardexMovementType>('cabin_out');
  const [kdxQty, setKdxQty] = useState<number>(1);
  const [kdxUnitCost, setKdxUnitCost] = useState<string>('');
  const [kdxRef, setKdxRef] = useState<string>('');
  const [kdxConcept, setKdxConcept] = useState<string>('');
  const [kdxResponsible, setKdxResponsible] = useState<string>(artists[0]?.name || 'Administración');

  // Sorted and filtered movements
  const sortedKardex = useMemo(() => {
    return [...kardexMovements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(m => {
        const matchesItem = selectedItemFilter === 'all' || m.itemId === selectedItemFilter;
        const matchesType = kardexTypeFilter === 'all' || m.type === kardexTypeFilter;
        const q = kardexSearch.toLowerCase();
        const matchesSearch =
          !q ||
          m.itemName.toLowerCase().includes(q) ||
          (m.itemSku && m.itemSku.toLowerCase().includes(q)) ||
          m.reference.toLowerCase().includes(q) ||
          m.concept.toLowerCase().includes(q) ||
          (m.responsible && m.responsible.toLowerCase().includes(q));
        return matchesItem && matchesType && matchesSearch;
      });
  }, [kardexMovements, selectedItemFilter, kardexTypeFilter, kardexSearch]);

  // Totals calculations
  const kardexTotals = useMemo(() => {
    const totalQtyIn = sortedKardex.reduce((acc, m) => acc + m.quantityIn, 0);
    const totalValIn = sortedKardex.reduce((acc, m) => acc + m.totalIn, 0);
    const totalQtyOut = sortedKardex.reduce((acc, m) => acc + m.quantityOut, 0);
    const totalValOut = sortedKardex.reduce((acc, m) => acc + m.totalOut, 0);
    const currentValuation = inventory.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
    const currentUnits = inventory.reduce((acc, i) => acc + i.currentStock, 0);
    return { totalQtyIn, totalValIn, totalQtyOut, totalValOut, currentValuation, currentUnits };
  }, [sortedKardex, inventory]);

  const handleCreateKardexMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kdxItemId || kdxQty <= 0) return;

    const item = inventory.find(i => i.id === kdxItemId);
    if (!item) return;

    const unitCostNum = kdxUnitCost ? parseFloat(kdxUnitCost) : item.unitCost;

    addKardexMovement({
      itemId: kdxItemId,
      type: kdxType,
      quantity: kdxQty,
      unitCost: unitCostNum,
      reference: kdxRef.trim() || `MOV-${Date.now().toString().slice(-4)}`,
      concept:
        kdxConcept.trim() ||
        (kdxType === 'purchase_in'
          ? 'Compra / Reposición de inventario'
          : kdxType === 'cabin_out'
          ? 'Consumo de insumo en sesión de cabina'
          : kdxType === 'retail_sale'
          ? 'Salida por venta en mostrador'
          : 'Ajuste de inventario físico'),
      responsible: kdxResponsible.trim() || 'Administración',
    });

    setIsKardexModalOpen(false);
    setKdxQty(1);
    setKdxRef('');
    setKdxConcept('');
  };

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Referencia',
      'SKU',
      'Insumo / Producto',
      'Tipo',
      'Concepto',
      'Responsable',
      'Entrada Cant.',
      'Entrada Costo U.',
      'Entrada Total',
      'Salida Cant.',
      'Salida Costo U.',
      'Salida Total',
      'Saldo Existencia',
      'Costo Promedio',
      'Saldo Valorizado',
    ];
    const rows = sortedKardex.map(m => [
      new Date(m.date).toLocaleString('es-ES'),
      `"${m.reference}"`,
      `"${m.itemSku || ''}"`,
      `"${m.itemName.replace(/"/g, '""')}"`,
      `"${m.type}"`,
      `"${m.concept.replace(/"/g, '""')}"`,
      `"${m.responsible || ''}"`,
      m.quantityIn,
      m.unitCostIn.toFixed(2),
      m.totalIn.toFixed(2),
      m.quantityOut,
      m.unitCostOut.toFixed(2),
      m.totalOut.toFixed(2),
      m.balanceQty,
      m.balanceUnitCost.toFixed(2),
      m.balanceTotal.toFixed(2),
    ]);
    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `kardex_valorizado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getKardexBadge = (type: KardexMovementType) => {
    switch (type) {
      case 'initial':
        return { label: 'Inventario Inicial', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'purchase_in':
        return { label: 'Compra / Entrada', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'cabin_out':
        return { label: 'Consumo Cabina', cls: 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/30' };
      case 'retail_sale':
        return { label: 'Venta Mostrador', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'adjustment':
        return { label: 'Ajuste Stock', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              Kardex Valorizado de Existencias
            </h1>
          </div>
          <p className="text-[11px] text-neutral-400">
            Control físico-valorizado de insumos, tintas, agujas y joyería bajo método de Costo Promedio Ponderado.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setIsKardexModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.35)] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Movimiento de Kardex</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-white text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#18181D] border border-[#272730] hover:border-[#FF3366] text-white text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Entradas Acumuladas (Compras/Inicial)</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
            +{formatMoney(kardexTotals.totalValIn)}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">
            {kardexTotals.totalQtyIn} unidades ingresadas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Salidas Acumuladas (Cabina/Ventas)</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-[#FF3366]">
            -{formatMoney(kardexTotals.totalValOut)}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">
            {kardexTotals.totalQtyOut} unidades descargadas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Saldo Valorizado en Almacén</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-white">
            {formatMoney(kardexTotals.currentValuation)}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">
            {kardexTotals.currentUnits} uds en {inventory.length} referencias
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[11px] text-neutral-400 block mb-1">Total Movimientos Registrados</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-white">
            {kardexMovements.length}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">
            Trazabilidad completa de insumos
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por insumo, SKU, factura o responsable..."
            value={kardexSearch}
            onChange={e => setKardexSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Item filter */}
          <select
            value={selectedItemFilter}
            onChange={e => setSelectedItemFilter(e.target.value)}
            className="px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:border-[#FF3366]/60"
          >
            <option value="all">Todos los Insumos ({inventory.length})</option>
            {inventory.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.currentStock} {item.unit})
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={kardexTypeFilter}
            onChange={e => setKardexTypeFilter(e.target.value)}
            className="px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:border-[#FF3366]/60"
          >
            <option value="all">Todos los Tipos de Operación</option>
            <option value="initial">Inventario Inicial</option>
            <option value="purchase_in">Compra / Entrada</option>
            <option value="cabin_out">Consumo Cabina</option>
            <option value="retail_sale">Venta Mostrador</option>
            <option value="adjustment">Ajuste de Stock</option>
          </select>
        </div>
      </div>

      {/* Main Kardex Multi-Column Ledger Table */}
      <div className="rounded-3xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Superheader row for Triple Column Structure */}
              <tr className="bg-[#101013] border-b border-[#24242B] text-[10px] uppercase tracking-wider font-bold">
                <th colSpan={5} className="py-2.5 px-3 text-neutral-400 border-r border-[#24242B]">
                  Datos de la Operación / Trazabilidad
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center text-emerald-400 bg-emerald-950/20 border-r border-[#24242B]">
                  Entradas (Compras & Saldos Iniciales)
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center text-rose-400 bg-rose-950/20 border-r border-[#24242B]">
                  Salidas (Consumo Cabina & Ventas)
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center text-white bg-[#14141A]">
                  Saldos en Existencia (Ponderado)
                </th>
              </tr>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3 px-3 whitespace-nowrap">Fecha</th>
                <th className="py-3 px-3 whitespace-nowrap">Doc / Ref</th>
                <th className="py-3 px-3 whitespace-nowrap">Insumo / SKU</th>
                <th className="py-3 px-3 whitespace-nowrap">Tipo</th>
                <th className="py-3 px-3 whitespace-nowrap border-r border-[#24242B]">Concepto / Responsable</th>

                {/* Entradas */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap bg-emerald-950/10">Cant.</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap bg-emerald-950/10">Costo U.</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap bg-emerald-950/10 border-r border-[#24242B]">Total</th>

                {/* Salidas */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap bg-rose-950/10">Cant.</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap bg-rose-950/10">Costo U.</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap bg-rose-950/10 border-r border-[#24242B]">Total</th>

                {/* Saldos */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap bg-[#16161D]">Existencia</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap bg-[#16161D]">Costo Prom.</th>
                <th className="py-3 px-3 text-right whitespace-nowrap bg-[#16161D]">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {sortedKardex.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-neutral-500">
                    No se encontraron movimientos en el Kardex para este filtro.
                  </td>
                </tr>
              ) : (
                sortedKardex.map(m => {
                  const badge = getKardexBadge(m.type);
                  return (
                    <tr key={m.id} className="hover:bg-[#1E1E25] transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-300 whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#FF3366] font-semibold whitespace-nowrap">
                        {m.reference}
                      </td>
                      <td className="py-3 px-3 min-w-[180px]">
                        <div className="font-semibold text-white">{m.itemName}</div>
                        <span className="font-mono text-[10px] text-neutral-500">
                          {m.itemSku || m.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-[#24242B] min-w-[200px]">
                        <div className="text-neutral-200">{m.concept}</div>
                        {m.responsible && (
                          <span className="text-[10px] text-neutral-500">Resp: {m.responsible}</span>
                        )}
                      </td>

                      {/* Entradas */}
                      <td className="py-3 px-2.5 text-center font-mono bg-emerald-950/5 whitespace-nowrap">
                        {m.quantityIn > 0 ? (
                          <span className="text-emerald-400 font-bold">+{m.quantityIn}</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono bg-emerald-950/5 whitespace-nowrap">
                        {m.quantityIn > 0 ? formatMoney(m.unitCostIn) : '—'}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-semibold text-emerald-400 bg-emerald-950/5 border-r border-[#24242B] whitespace-nowrap">
                        {m.totalIn > 0 ? formatMoney(m.totalIn) : '—'}
                      </td>

                      {/* Salidas */}
                      <td className="py-3 px-2.5 text-center font-mono bg-rose-950/5 whitespace-nowrap">
                        {m.quantityOut > 0 ? (
                          <span className="text-[#FF3366] font-bold">-{m.quantityOut}</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono bg-rose-950/5 whitespace-nowrap">
                        {m.quantityOut > 0 ? formatMoney(m.unitCostOut) : '—'}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-semibold text-[#FF3366] bg-rose-950/5 border-r border-[#24242B] whitespace-nowrap">
                        {m.totalOut > 0 ? formatMoney(m.totalOut) : '—'}
                      </td>

                      {/* Saldo */}
                      <td className="py-3 px-2.5 text-center font-mono font-bold text-white bg-[#16161D]/60 whitespace-nowrap">
                        {m.balanceQty} <span className="text-[10px] font-normal text-neutral-400">{m.unit}</span>
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-neutral-300 bg-[#16161D]/60 whitespace-nowrap">
                        {formatMoney(m.balanceUnitCost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white bg-[#16161D]/60 whitespace-nowrap">
                        {formatMoney(m.balanceTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Movimiento de Kardex */}
      {isKardexModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141417] border border-[#272730] rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242A] bg-[#16161B]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366]">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Registrar Movimiento de Kardex
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Control físico-valorizado de existencias por Promedio Ponderado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsKardexModalOpen(false)}
                className="w-7 h-7 rounded-full border border-[#2A2A34] text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateKardexMovement} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Insumo o Joyería *</label>
                <select
                  value={kdxItemId}
                  onChange={e => setKdxItemId(e.target.value)}
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                >
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} — Stock Actual: {item.currentStock} {item.unit} (${item.unitCost.toFixed(2)}/u)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Tipo de Movimiento</label>
                  <select
                    value={kdxType}
                    onChange={e => setKdxType(e.target.value as KardexMovementType)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  >
                    <option value="cabin_out">Consumo en Cabina (Salida)</option>
                    <option value="purchase_in">Compra / Entrada (Ingreso)</option>
                    <option value="retail_sale">Venta de Mostrador</option>
                    <option value="adjustment">Ajuste de Inventario</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Cantidad de Unidades *</label>
                  <input
                    type="number"
                    min="1"
                    value={kdxQty}
                    onChange={e => setKdxQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Costo Unitario ($) <span className="text-neutral-500 font-normal">(Vacío = costo habitual)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Auto según producto"
                    value={kdxUnitCost}
                    onChange={e => setKdxUnitCost(e.target.value)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">N° Factura / Referencia</label>
                  <input
                    type="text"
                    placeholder="Ej: FAC-9482, CAB-02"
                    value={kdxRef}
                    onChange={e => setKdxRef(e.target.value)}
                    className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Concepto / Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Sesión tatuaje espalda Krow, Reposición agujas Killer Ink"
                  value={kdxConcept}
                  onChange={e => setKdxConcept(e.target.value)}
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Responsable / Artista</label>
                <select
                  value={kdxResponsible}
                  onChange={e => setKdxResponsible(e.target.value)}
                  className="w-full bg-[#111114] border border-[#272730] focus:border-[#FF3366] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                >
                  <option value="Administración">Administración del Estudio</option>
                  {artists.map(a => (
                    <option key={a.id} value={a.name}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#24242A]">
                <button
                  type="button"
                  onClick={() => setIsKardexModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#272730] text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.4)] cursor-pointer"
                >
                  Guardar en Kardex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

