import React, { useState, useMemo } from 'react';
import { Search, PlusCircle, Trash2, ArrowDownRight } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ExpenseCategory } from '../../types';

interface ExpensesViewProps {
  onOpenNewExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenNewExpense }) => {
  const { filteredExpenses, deleteExpense, formatMoney } = useStudio();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filteredList = useMemo(() => {
    return filteredExpenses.filter(e => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.invoiceReference && e.invoiceReference.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCat === 'all' || e.category === selectedCat;

      return matchesSearch && matchesCat;
    });
  }, [filteredExpenses, searchTerm, selectedCat]);

  const totalAmount = filteredList.reduce((acc, e) => acc + e.amount, 0);
  const totalTax = filteredList.reduce((acc, e) => acc + (e.taxDeductible ? e.taxAmount : 0), 0);
  const deductibleTotal = filteredList.filter(e => e.taxDeductible).reduce((acc, e) => acc + e.amount, 0);

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
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Total Gastos Operativos</span>
          <span className="text-lg font-bold font-mono tabular-nums text-[#FF3366]">
            {formatMoney(totalAmount)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">{filteredList.length} compras</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Base Fiscal Deducible</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(deductibleTotal)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Con factura oficial</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">IVA Soportado</span>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
            {formatMoney(totalTax)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Deducción de trimestre</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex items-center justify-center">
          <button
            onClick={onOpenNewExpense}
            className="w-full py-2.5 px-4 rounded-full border border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366]/10 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Tag Pills matching reference */}
      <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar concepto o proveedor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todo' },
            { id: 'supplies_tattoo', label: 'Insumos Tatuaje' },
            { id: 'supplies_piercing', label: 'Insumos Piercing' },
            { id: 'jewelry_restock', label: 'Joyería' },
            { id: 'hygiene_sanitary', label: 'Sanidad' },
            { id: 'rent_studio', label: 'Alquiler' },
          ].map(tag => {
            const isActive = selectedCat === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setSelectedCat(tag.id)}
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
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Descripción / Concepto</th>
                <th className="py-3.5 px-4">Proveedor</th>
                <th className="py-3.5 px-4">N° Factura</th>
                <th className="py-3.5 px-4">Pago</th>
                <th className="py-3.5 px-4 text-center">Deducible</th>
                <th className="py-3.5 px-4 text-right">Importe</th>
                <th className="py-3.5 px-4 text-center">Acción</th>
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
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.description}</div>
                      {item.notes && <div className="text-[10px] text-neutral-500 italic">{item.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">{item.supplier}</td>
                    <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                      {item.invoiceReference || '—'}
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
                        className="p-1.5 rounded-full text-neutral-500 hover:text-[#FF3366] hover:bg-[#282834] transition-colors"
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
    </div>
  );
};
