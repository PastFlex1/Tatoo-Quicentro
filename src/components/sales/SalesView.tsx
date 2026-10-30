import React, { useState, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  Download,
  Eye,
  Trash2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SaleRecord } from '../../types';

interface SalesViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
  onOpenNewSale: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ onOpenReceipt, onOpenNewSale }) => {
  const { filteredSales, deleteSale, formatMoney } = useStudio();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [methodFilter] = useState<string>('all');

  const salesList = useMemo(() => {
    return filteredSales.filter(sale => {
      const matchesSearch =
        sale.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.artistName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = categoryFilter === 'all' || sale.serviceCategory === categoryFilter;
      const matchesMethod = methodFilter === 'all' || sale.paymentMethod === methodFilter;

      return matchesSearch && matchesCat && matchesMethod;
    });
  }, [filteredSales, searchTerm, categoryFilter, methodFilter]);

  const totalGross = salesList.reduce((acc, s) => acc + s.total, 0);
  const totalTax = salesList.reduce((acc, s) => acc + s.taxAmount, 0);
  const totalStudio = salesList.reduce((acc, s) => acc + s.studioShare, 0);
  const totalArtists = salesList.reduce((acc, s) => acc + s.artistShare, 0);

  const exportToCSV = () => {
    const headers = [
      'Factura',
      'Fecha',
      'Cliente',
      'DNI',
      'Teléfono',
      'Servicio',
      'Categoría',
      'Artista',
      'Horas',
      'Base Imponible',
      'IVA',
      'Total',
      'Seña Previa',
      'Cobrado Hoy',
      'Método Pago',
      'Comisión Artista %',
      'Comisión Artista Importe',
      'Retención Estudio',
      'Propina',
      'Consentimiento Firmado',
    ];

    const rows = salesList.map(s => [
      `"${s.invoiceNumber}"`,
      `"${s.date}"`,
      `"${s.clientName}"`,
      `"${s.clientDni || ''}"`,
      `"${s.clientPhone || ''}"`,
      `"${s.serviceName.replace(/"/g, '""')}"`,
      `"${s.serviceCategory}"`,
      `"${s.artistName}"`,
      s.hours || 0,
      s.subtotal - s.discount,
      s.taxAmount,
      s.total,
      s.depositAmount,
      s.amountPaidNow,
      `"${s.paymentMethod}"`,
      s.artistCommissionPercent,
      s.artistShare,
      s.studioShare,
      s.tipAmount,
      s.consentFormSigned ? 'SÍ' : 'NO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_tatuajes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: string, invoice: string) => {
    if (confirm(`¿Estás seguro de anular y eliminar la factura ${invoice}?`)) {
      deleteSale(id);
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-5">
      {/* Top summary strip */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Ventas Filtradas</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(totalGross)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">{salesList.length} operaciones</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Retención Estudio</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(totalStudio)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Beneficio de la casa</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Comisiones Artistas</span>
          <span className="text-lg font-bold font-mono tabular-nums text-[#FF3366]">
            {formatMoney(totalArtists)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">A pagar</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">IVA / Impuestos</span>
          <span className="text-lg font-bold font-mono tabular-nums text-neutral-200">
            {formatMoney(totalTax)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Repercutido</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-center xs:col-span-2 lg:col-span-1">
          <button
            onClick={onOpenNewSale}
            className="w-full py-2.5 px-3 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Cobrar Servicio</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Tag pills */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar cliente, factura o artista..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todo' },
            { id: 'tattoo', label: 'Tatuajes' },
            { id: 'piercing', label: 'Piercings' },
            { id: 'jewelry', label: 'Joyería' },
            { id: 'aftercare', label: 'Aftercare' },
          ].map(tag => {
            const isActive = categoryFilter === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setCategoryFilter(tag.id)}
                className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap shrink-0 ${
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
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-4 py-1 rounded-full border border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366]/10 text-xs font-semibold transition-all whitespace-nowrap ml-auto md:ml-2 shrink-0"
            title="Exportar a CSV / Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4 whitespace-nowrap">Factura</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Fecha</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Cliente</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Concepto / Servicio</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Artista</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Pago</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Total</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Artista</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Estudio</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Ficha</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {salesList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-500">
                    No se encontraron registros de ventas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                salesList.map(sale => (
                  <tr key={sale.id} className="hover:bg-[#1E1E25] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#FF3366] whitespace-nowrap">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                      {new Date(sale.date).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{sale.clientName}</div>
                      {sale.clientPhone && (
                        <div className="text-[10px] text-neutral-500">{sale.clientPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[240px] xl:max-w-[380px]">
                      <div className="text-neutral-200 font-medium truncate">{sale.serviceName}</div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <span className="capitalize">{sale.serviceCategory}</span>
                        {sale.hours && <span>· {sale.hours} hrs</span>}
                        {sale.depositAmount > 0 && (
                          <span className="text-[#FF3366]">· Seña: {formatMoney(sale.depositAmount)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                      {sale.artistName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono bg-[#121215] border border-[#272730] text-neutral-300">
                        {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : sale.paymentMethod === 'transfer' ? 'Transf' : 'Mixto'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatMoney(sale.total)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#FF3366] whitespace-nowrap">
                      {formatMoney(sale.artistShare)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white whitespace-nowrap">
                      {formatMoney(sale.studioShare)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.consentFormSigned ? (
                        <span title="Ficha sanitaria firmada" className="inline-flex text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                      ) : (
                        <span title="Sin ficha médica firmada" className="inline-flex text-neutral-600">
                          <ShieldAlert className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenReceipt(sale)}
                          className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#282834] transition-colors"
                          title="Ver Ticket Imprimible"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id, sale.invoiceNumber)}
                          className="p-1.5 rounded-full text-neutral-500 hover:text-[#FF3366] hover:bg-[#282834] transition-colors"
                          title="Anular venta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
