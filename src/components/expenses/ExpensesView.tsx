import React, { useState, useMemo } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { Search, PlusCircle, Trash2, FileCode, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ExpenseCategory } from '../../types';
import { SriXmlImportModal } from './SriXmlImportModal';

interface ExpensesViewProps {
  onOpenNewExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenNewExpense }) => {
  const { filteredExpenses, deleteExpense, updateExpense, formatMoney } = useStudio();

  const { guard: guardPermission } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [sriStatusFilter, setSriStatusFilter] = useState<'all' | 'AUTORIZADO' | 'PENDIENTE'>('all');
  const [isSriImportOpen, setIsSriImportOpen] = useState(false);
  const [selectedSriKey, setSelectedSriKey] = useState<string | null>(null);

  const filteredList = useMemo(() => {
    return filteredExpenses.filter(e => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        e.description.toLowerCase().includes(q) ||
        e.supplier.toLowerCase().includes(q) ||
        (e.supplierRuc && e.supplierRuc.toLowerCase().includes(q)) ||
        (e.sriAccessKey && e.sriAccessKey.toLowerCase().includes(q)) ||
        (e.invoiceReference && e.invoiceReference.toLowerCase().includes(q));

      const matchesCat = selectedCat === 'all' || e.category === selectedCat;

      const isAuth = e.sriStatus === 'AUTORIZADO' || (!e.sriStatus && (Boolean(e.sriAccessKey) || e.taxDeductible));
      const matchesSri =
        sriStatusFilter === 'all' ||
        (sriStatusFilter === 'AUTORIZADO' && isAuth) ||
        (sriStatusFilter === 'PENDIENTE' && !isAuth);

      return matchesSearch && matchesCat && matchesSri;
    });
  }, [filteredExpenses, searchTerm, selectedCat, sriStatusFilter]);

  const totalAmount = filteredList.reduce((acc, e) => acc + e.amount, 0);
  const totalTax = filteredList.reduce((acc, e) => acc + (e.taxDeductible ? e.taxAmount : 0), 0);
  const deductibleTotal = filteredList.filter(e => e.taxDeductible).reduce((acc, e) => acc + e.amount, 0);
  const authorizedCount = filteredExpenses.filter(
    e => e.sriStatus === 'AUTORIZADO' || (!e.sriStatus && (Boolean(e.sriAccessKey) || e.taxDeductible))
  ).length;
  const pendingCount = filteredExpenses.length - authorizedCount;

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'supplies_tattoo':
        return 'Insumos Tatuaje';
      case 'supplies_piercing':
        return 'Insumos Piercing';
      case 'jewelry_restock':
        return 'Joyería Titanio';
      case 'hygiene_sanitary':
        return 'Bioseguridad';
      case 'rent_studio':
        return 'Alquiler';
      case 'utilities':
        return 'Suministros';
      case 'software_terminals':
        return 'TPV & Web';
      case 'artist_payout':
        return 'Liquidación Artistas';
      case 'marketing_ads':
        return 'Marketing';
      case 'maintenance':
        return 'Mantenimiento';
      default:
        return 'Otros';
    }
  };

  const handleDelete = (id: string, desc: string) => {
    if (!guardPermission('expenses.delete')) return;
    if (confirm(`¿Eliminar el registro de gasto "${desc}"?`)) {
      deleteExpense(id);
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-5">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#24242A]">
        <div>
          <h1 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Gastos Operativos & Facturas de Compra</span>
          </h1>
          <p className="text-[11px] text-neutral-400">
            Control fiscal con extracción directa de comprobantes electrónicos XML del SRI Ecuador
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSriImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all shadow-[0_0_14px_rgba(16,185,129,0.25)] cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            <span>Importar Facturas SRI (XML)</span>
          </button>

          <button
            onClick={onOpenNewExpense}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_14px_rgba(255,51,102,0.35)] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Gasto Manual</span>
          </button>
        </div>
      </div>

      {/* Top Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Total Gastos Operativos</span>
          <span className="text-lg font-bold font-mono tabular-nums text-[#FF3366]">
            {formatMoney(totalAmount)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">{filteredList.length} compras registradas</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Base Fiscal Deducible</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(deductibleTotal)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Con factura autorizada</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">IVA Soportado (Deducible)</span>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
            {formatMoney(totalTax)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Crédito tributario SRI</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-emerald-400 font-semibold block mb-1">Estado SRI Comprobantes</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
              {authorizedCount}
            </span>
            <span className="text-xs text-neutral-400">Autorizados</span>
            {pendingCount > 0 && (
              <span className="text-xs text-amber-400 font-mono font-bold ml-1">
                ({pendingCount} Pendientes)
              </span>
            )}
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">Crédito tributario compras</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por concepto, proveedor, RUC o factura..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {/* Filtro de Estado SRI */}
          <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730] shrink-0">
            <button
              onClick={() => setSriStatusFilter('all')}
              className={`px-2.5 py-0.5 text-[11px] rounded-full transition-all cursor-pointer ${
                sriStatusFilter === 'all'
                  ? 'bg-[#FF3366] text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSriStatusFilter('AUTORIZADO')}
              className={`px-2.5 py-0.5 text-[11px] rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                sriStatusFilter === 'AUTORIZADO'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Autorizados</span>
            </button>
            <button
              onClick={() => setSriStatusFilter('PENDIENTE')}
              className={`px-2.5 py-0.5 text-[11px] rounded-full transition-all cursor-pointer ${
                sriStatusFilter === 'PENDIENTE'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Pendientes</span>
            </button>
          </div>

          {[
            { id: 'all', label: 'Todo Rubro' },
            { id: 'supplies_tattoo', label: 'Insumos Tatuaje' },
            { id: 'supplies_piercing', label: 'Insumos Piercing' },
            { id: 'jewelry_restock', label: 'Joyería' },
            { id: 'hygiene_sanitary', label: 'Bioseguridad' },
            { id: 'rent_studio', label: 'Alquiler' },
            { id: 'utilities', label: 'Suministros' },
          ].map(tag => {
            const isActive = selectedCat === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setSelectedCat(tag.id)}
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
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        {/* Mobile Card List (md:hidden) */}
        <div className="md:hidden divide-y divide-[#222228]">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              No se han registrado gastos para el período seleccionado.
            </div>
          ) : (
            filteredList.map(item => {
              const isAuth = item.sriStatus === 'AUTORIZADO' || (!item.sriStatus && (Boolean(item.sriAccessKey) || item.taxDeductible));
              return (
                <div key={`m-exp-${item.id}`} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-400">
                        {new Date(item.date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#121215] border border-[#272730] text-neutral-300 font-medium">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <div>
                      {isAuth ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>AUTORIZADO</span>
                          {item.sriAccessKey && (
                            <button
                              type="button"
                              onClick={() => setSelectedSriKey(item.sriAccessKey || '')}
                              className="ml-1 text-[9px] underline text-emerald-400 hover:text-white cursor-pointer"
                              title="Ver Clave de Acceso SRI"
                            >
                              Clave
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            PENDIENTE
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (guardPermission('expenses.edit')) updateExpense(item.id, { sriStatus: 'AUTORIZADO' });
                            }}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 cursor-pointer font-bold"
                            title="Marcar como comprobante autorizado por el SRI"
                          >
                            ✓ Validar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#121215] p-2.5 rounded-xl border border-[#23232A] space-y-1">
                    <div className="font-semibold text-xs text-white">{item.description}</div>
                    {item.notes && <div className="text-[10px] text-neutral-500 italic line-clamp-2">{item.notes}</div>}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1C1C22]">
                      <span className="text-neutral-300 font-medium truncate">{item.supplier}</span>
                      {item.supplierRuc && (
                        <span className="text-[10px] font-mono text-emerald-400 shrink-0">RUC: {item.supplierRuc}</span>
                      )}
                    </div>
                    {item.invoiceReference && (
                      <div className="text-[10px] font-mono text-neutral-400">
                        Factura / Ref: <span className="text-neutral-200">{item.invoiceReference}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="uppercase font-mono text-neutral-400 px-2 py-0.5 rounded-full bg-[#121215] border border-[#272730]">
                        {item.paymentMethod === 'cash' ? 'Caja' : item.paymentMethod === 'credit_card' ? 'Tarjeta' : 'Transf'}
                      </span>
                      {item.taxDeductible ? (
                        <span className="text-emerald-400 font-mono font-semibold">
                          Deducible IVA ({formatMoney(item.taxAmount)})
                        </span>
                      ) : (
                        <span className="text-neutral-500">No Deducible</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#FF3366]">
                        -{formatMoney(item.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id, item.description)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-[#FF3366] border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4 whitespace-nowrap">Fecha</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Categoría</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Descripción / Concepto</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Proveedor & RUC</th>
                <th className="py-3.5 px-4 whitespace-nowrap">N° Factura</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Estado SRI</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Pago</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Deducible SRI</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Importe</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-500">
                    No se han registrado gastos para el período seleccionado.
                  </td>
                </tr>
              ) : (
                filteredList.map(item => {
                  const isAuth = item.sriStatus === 'AUTORIZADO' || (!item.sriStatus && (Boolean(item.sriAccessKey) || item.taxDeductible));
                  return (
                    <tr key={item.id} className="hover:bg-[#1E1E25] transition-colors">
                      <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-neutral-300 font-medium">
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="font-semibold text-white">{item.description}</div>
                        {item.notes && <div className="text-[10px] text-neutral-500 italic line-clamp-1">{item.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                        <div className="font-medium">{item.supplier}</div>
                        {item.supplierRuc && (
                          <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                            <span className="text-emerald-400 font-semibold">RUC:</span>
                            <span>{item.supplierRuc}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                        <span>{item.invoiceReference || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isAuth ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>AUTORIZADO</span>
                            {item.sriAccessKey && (
                              <button
                                type="button"
                                onClick={() => setSelectedSriKey(item.sriAccessKey || '')}
                                className="ml-1 text-[9px] underline text-emerald-400 hover:text-white cursor-pointer"
                                title="Ver Clave de Acceso SRI"
                              >
                                Clave
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                              PENDIENTE
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (guardPermission('expenses.edit')) updateExpense(item.id, { sriStatus: 'AUTORIZADO' });
                              }}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 cursor-pointer font-bold"
                              title="Marcar como comprobante autorizado por el SRI"
                            >
                              ✓ Validar
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[10px] uppercase font-mono text-neutral-400 px-2 py-0.5 rounded-full bg-[#121215] border border-[#272730]">
                          {item.paymentMethod === 'cash' ? 'Caja' : item.paymentMethod === 'credit_card' ? 'Tarjeta' : 'Transf'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.taxDeductible ? (
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                            SÍ ({formatMoney(item.taxAmount)})
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">NO</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#FF3366] whitespace-nowrap">
                        -{formatMoney(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(item.id, item.description)}
                          className="p-1.5 rounded-full text-neutral-500 hover:text-[#FF3366] hover:bg-[#282834] transition-colors cursor-pointer"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle Clave de Acceso SRI */}
      {selectedSriKey && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Comprobante Electrónico Autorizado SRI</span>
              </div>
              <button
                onClick={() => setSelectedSriKey(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] text-neutral-400 block font-semibold">
                Clave de Acceso Oficial de 49 Dígitos:
              </label>
              <div className="p-3 bg-[#121215] rounded-xl border border-[#272730] font-mono text-[11px] text-emerald-300 break-all select-all leading-relaxed">
                {selectedSriKey}
              </div>
              <p className="text-[10px] text-neutral-500">
                Esta clave identifica unívocamente el comprobante en la base de datos nacional del SRI de Ecuador.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24242B]">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedSriKey);
                  alert('✓ Clave de acceso copiada al portapapeles.');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                Copiar Clave
              </button>
              <button
                type="button"
                onClick={() => setSelectedSriKey(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#25252E] text-white text-xs font-bold cursor-pointer hover:bg-[#32323D]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SRI XML Import Modal */}
      <SriXmlImportModal
        isOpen={isSriImportOpen}
        onClose={() => setIsSriImportOpen(false)}
      />
    </div>
  );
};
