import React, { useState, useMemo } from 'react';
import { Search, PlusCircle, Trash2, FileCode, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ExpenseCategory } from '../../types';
import { SriXmlImportModal } from './SriXmlImportModal';

interface ExpensesViewProps {
  onOpenNewExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenNewExpense }) => {
  const { filteredExpenses, deleteExpense, formatMoney } = useStudio();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [isSriImportOpen, setIsSriImportOpen] = useState(false);

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

      return matchesSearch && matchesCat;
    });
  }, [filteredExpenses, searchTerm, selectedCat]);

  const totalAmount = filteredList.reduce((acc, e) => acc + e.amount, 0);
  const totalTax = filteredList.reduce((acc, e) => acc + (e.taxDeductible ? e.taxAmount : 0), 0);
  const deductibleTotal = filteredList.filter(e => e.taxDeductible).reduce((acc, e) => acc + e.amount, 0);
  const sriInvoicesCount = filteredList.filter(e => e.sriAccessKey || e.supplierRuc).length;

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
          <span className="text-[10px] text-emerald-400 font-semibold block mb-1">Facturas Electrónicas SRI</span>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-300">
            {sriInvoicesCount}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Extraídas de XML oficial</span>
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
          {[
            { id: 'all', label: 'Todo' },
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

      {/* Table */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4 whitespace-nowrap">Fecha</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Categoría</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Descripción / Concepto</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Proveedor & RUC</th>
                <th className="py-3.5 px-4 whitespace-nowrap">N° Factura</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Pago</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Deducible SRI</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Importe</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    No se han registrado gastos para el período seleccionado.
                  </td>
                </tr>
              ) : (
                filteredList.map(item => (
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
                      <div className="flex items-center gap-1.5">
                        <span>{item.invoiceReference || '—'}</span>
                        {item.sriAccessKey && (
                          <span
                            className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold"
                            title={`Autorizado SRI: ${item.sriAccessKey}`}
                          >
                            SRI
                          </span>
                        )}
                      </div>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SRI XML Import Modal */}
      <SriXmlImportModal
        isOpen={isSriImportOpen}
        onClose={() => setIsSriImportOpen(false)}
      />
    </div>
  );
};
