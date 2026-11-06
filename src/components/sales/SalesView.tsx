import React, { useState, useMemo } from 'react';
import { CONSUMIDOR_FINAL_CREDIT_NOTE_MESSAGE, isConsumidorFinal } from '../../utils/consumidorFinal';
import { useAlertModal } from '../../context/AlertModalContext';
import { usePermission } from '../../hooks/usePermission';
import {
  Search,
  PlusCircle,
  Download,
  Eye,
  ShieldCheck,
  FileText,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Code2,
  Printer,
  Copy,
  X,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SaleRecord, CreditNoteRecord } from '../../types';
import { NewCreditNoteModal } from './NewCreditNoteModal';
import { CreditNotePrintModal } from './CreditNotePrintModal';
import { SalesNotePrintModal } from './SalesNotePrintModal';
import { ReceiptModal } from './ReceiptModal';
import { buildAccessKey, buildFacturaXml, buildNotaCreditoXml } from '../../services/sriElectronicService';
import { SriStatusBadge } from '../common/SriStatusBadge';
import { VoidSaleModal } from './VoidSaleModal';
import { Ban } from 'lucide-react';

interface SalesViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
  onOpenNewSale: () => void;
  /** Sub-sección inicial (la sección "Notas de Crédito" del menú abre directamente la pestaña 04) */
  initialSubTab?: 'invoices' | 'sales_notes' | 'credit_notes';
}

type BillingTabType = 'invoices' | 'sales_notes' | 'credit_notes';

export const SalesView: React.FC<SalesViewProps> = ({ onOpenReceipt, onOpenNewSale, initialSubTab = 'invoices' }) => {
  const {
    filteredSales,
    filteredCreditNotes,
    sales: allSales,
    settings,
    formatMoney,
    emitSaleToSri,
    emitCreditNoteToSri,
  } = useStudio();

  const { guard: guardPermission, can } = usePermission();
  const { showAlert } = useAlertModal();
  // Acciones protegidas por permiso
  const openReceipt = (sale: SaleRecord) => {
    if (guardPermission('sales.print')) onOpenReceipt(sale);
  };
  const printSalesNote = (sale: SaleRecord) => {
    if (guardPermission('sales.print')) setSelectedSalesNoteToPrint(sale);
  };
  const printCreditNote = (cn: CreditNoteRecord) => {
    if (guardPermission('sales.print')) setSelectedCreditNoteToPrint(cn);
  };
  // Anulación de comprobantes que no admiten nota de crédito (factura a consumidor final / nota de venta)
  const [saleToVoid, setSaleToVoid] = useState<SaleRecord | null>(null);
  const openVoid = (sale: SaleRecord) => {
    if (guardPermission('sales.void')) setSaleToVoid(sale);
  };
  // Active Billing Tab
  const [activeSubTab, setActiveSubTab] = useState<BillingTabType>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isNewCreditNoteOpen, setIsNewCreditNoteOpen] = useState(false);
  const [creditNoteToPreselect, setCreditNoteToPreselect] = useState<SaleRecord | null>(null);
  const [selectedCreditNoteToPrint, setSelectedCreditNoteToPrint] = useState<CreditNoteRecord | null>(null);
  const [selectedCreditNoteFormat, setSelectedCreditNoteFormat] = useState<'THERMAL' | 'A4'>('A4');
  const [selectedSalesNoteToPrint, setSelectedSalesNoteToPrint] = useState<SaleRecord | null>(null);
  const [selectedSalesNoteFormat, setSelectedSalesNoteFormat] = useState<'THERMAL' | 'A4'>('A4');
  const [selectedInvoiceForRide, setSelectedInvoiceForRide] = useState<SaleRecord | null>(null);
  const [selectedInvoiceFormat, setSelectedInvoiceFormat] = useState<'THERMAL' | 'A4'>('A4');

  // Modal de Visualización de XML Firmado XAdES-BES Autorizado SRI
  const [xmlViewerDoc, setXmlViewerDoc] = useState<{
    title: string;
    docNumber: string;
    claveAcceso: string;
    authDate: string;
    xmlContent: string;
    status: string;
  } | null>(null);
  const [copiedXml, setCopiedXml] = useState(false);

  // 1. Facturas Electrónicas (Tipo 01)
  const invoicesList = useMemo(() => {
    return filteredSales
      .filter(s => s.documentType !== 'nota_venta')
      .filter(sale => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          sale.clientName.toLowerCase().includes(q) ||
          sale.serviceName.toLowerCase().includes(q) ||
          sale.invoiceNumber.toLowerCase().includes(q) ||
          sale.artistName.toLowerCase().includes(q) ||
          (sale.clientDni && sale.clientDni.toLowerCase().includes(q));

        const matchesCat = categoryFilter === 'all' || sale.serviceCategory === categoryFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'cancelled' && (sale.status === 'cancelled' || Boolean(sale.creditNoteNumber))) ||
          (statusFilter === 'active' && sale.status !== 'cancelled' && !sale.creditNoteNumber);

        return matchesSearch && matchesCat && matchesStatus;
      });
  }, [filteredSales, searchTerm, categoryFilter, statusFilter]);

  // 2. Notas de Venta RIMPE (Tipo 02)
  const salesNotesList = useMemo(() => {
    return filteredSales
      .filter(s => s.documentType === 'nota_venta')
      .filter(sale => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          sale.clientName.toLowerCase().includes(q) ||
          sale.serviceName.toLowerCase().includes(q) ||
          sale.invoiceNumber.toLowerCase().includes(q) ||
          sale.artistName.toLowerCase().includes(q) ||
          (sale.clientDni && sale.clientDni.toLowerCase().includes(q));

        const matchesCat = categoryFilter === 'all' || sale.serviceCategory === categoryFilter;
        return matchesSearch && matchesCat;
      });
  }, [filteredSales, searchTerm, categoryFilter]);

  // 3. Notas de Crédito (Tipo 04)
  const creditNotesList = useMemo(() => {
    return filteredCreditNotes.filter(cn => {
      const q = searchTerm.toLowerCase();
      return (
        cn.creditNoteNumber.toLowerCase().includes(q) ||
        cn.affectedInvoiceNumber.toLowerCase().includes(q) ||
        cn.clientName.toLowerCase().includes(q) ||
        cn.reasonDescription.toLowerCase().includes(q) ||
        (cn.clientDni && cn.clientDni.toLowerCase().includes(q))
      );
    });
  }, [filteredCreditNotes, searchTerm]);

  // Totals calculations
  // Los comprobantes anulados no cuentan en los totales (las anuladas con nota de crédito se restan aparte)
  const activeInvoices = invoicesList.filter(s => !s.voidedAt);
  const totalInvoicesGross = activeInvoices.reduce((acc, s) => acc + s.total, 0);
  const totalInvoicesTax = activeInvoices.reduce((acc, s) => acc + s.taxAmount, 0);
  const totalInvoicesStudio = activeInvoices.reduce((acc, s) => acc + s.studioShare, 0);

  const totalSalesNotesGross = salesNotesList.filter(s => !s.voidedAt).reduce((acc, s) => acc + s.total, 0);
  const totalCreditNotesReverted = creditNotesList.reduce((acc, cn) => acc + cn.total, 0);

  const exportToCSV = () => {
    if (!guardPermission('sales.export')) return;
    if (activeSubTab === 'credit_notes') {
      const headers = ['N° Nota Crédito', 'Fecha', 'Factura Afectada', 'Cliente', 'Cédula / RUC', 'Motivo', 'Subtotal', 'IVA', 'Total'];
      const rows = creditNotesList.map(cn => [
        `"${cn.creditNoteNumber}"`,
        `"${cn.date}"`,
        `"${cn.affectedInvoiceNumber}"`,
        `"${cn.clientName}"`,
        `"${cn.clientDni || ''}"`,
        `"${cn.reasonDescription.replace(/"/g, '""')}"`,
        cn.subtotal,
        cn.taxAmount,
        cn.total,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `notas_credito_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const currentData = activeSubTab === 'sales_notes' ? salesNotesList : invoicesList;
    const headers = [
      activeSubTab === 'sales_notes' ? 'N° Nota Venta' : 'N° Factura',
      'Fecha',
      'Cliente',
      'Cédula / RUC',
      'Teléfono',
      'Servicio',
      'Categoría',
      'Artista',
      'Base Imponible',
      'IVA',
      'Total',
      'Método Pago',
      'Estado',
    ];

    const rows = currentData.map(s => [
      `"${s.invoiceNumber}"`,
      `"${s.date}"`,
      `"${s.clientName}"`,
      `"${s.clientDni || ''}"`,
      `"${s.clientPhone || ''}"`,
      `"${s.serviceName.replace(/"/g, '""')}"`,
      `"${s.serviceCategory}"`,
      `"${s.artistName}"`,
      s.subtotal - s.discount,
      s.taxAmount,
      s.total,
      `"${s.paymentMethod}"`,
      s.creditNoteNumber ? `ANULADA POR NC ${s.creditNoteNumber}` : s.status === 'cancelled' ? 'ANULADA' : 'EMITIDA',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeSubTab === 'sales_notes' ? 'notas_de_venta' : 'facturas'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEmitCreditNote = (sale?: SaleRecord) => {
    if (!guardPermission('sales.credit_note')) return;
    if (sale && isConsumidorFinal(sale.clientDni)) {
      showAlert({ title: 'No se puede emitir nota de crédito', message: CONSUMIDOR_FINAL_CREDIT_NOTE_MESSAGE, type: 'warning' });
      return;
    }
    setCreditNoteToPreselect(sale || null);
    setIsNewCreditNoteOpen(true);
  };

  // XML del comprobante: el autorizado por el SRI si existe; si no, el XML generado (aún sin firma/autorización)
  const handleViewXmlForSale = (sale: SaleRecord) => {
    if (!guardPermission('sales.view_xml')) return;
    const claveAcceso = sale.sriAccessKey || buildAccessKey(settings, '01', sale.invoiceNumber, new Date(sale.date));
    const authorized = sale.sriStatus === 'AUTORIZADO' && sale.sriAuthorizedXml;
    setXmlViewerDoc({
      title: 'XML Factura Electrónica SRI (Tipo 01)',
      docNumber: sale.invoiceNumber,
      claveAcceso,
      authDate: sale.sriAuthorizationDate || '',
      status: sale.sriStatus || 'PENDIENTE',
      xmlContent: authorized ? sale.sriAuthorizedXml! : buildFacturaXml(sale, settings, claveAcceso),
    });
  };

  const handleViewXmlForCreditNote = (cn: CreditNoteRecord) => {
    if (!guardPermission('sales.view_xml')) return;
    const claveAcceso = cn.sriAccessKey || buildAccessKey(settings, '04', cn.creditNoteNumber, new Date(cn.date));
    const authorized = cn.sriStatus === 'AUTORIZADO' && cn.sriAuthorizedXml;
    const sale = allSales.find(s => s.id === cn.affectedInvoiceId);
    setXmlViewerDoc({
      title: 'XML Nota de Crédito Electrónica SRI (Tipo 04)',
      docNumber: cn.creditNoteNumber,
      claveAcceso,
      authDate: cn.sriAuthorizationDate || '',
      status: cn.sriStatus || 'PENDIENTE',
      xmlContent: authorized ? cn.sriAuthorizedXml! : buildNotaCreditoXml(cn, settings, claveAcceso, sale),
    });
  };

  const handleDownloadXml = (docNumber: string, xmlContent: string) => {
    if (!guardPermission('sales.view_xml')) return;
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SRI_XML_${docNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-5">
      {/* Top summary strip */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Total Facturas (01)</span>
          <span className="text-lg font-bold font-mono tabular-nums text-white">
            {formatMoney(totalInvoicesGross)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">{invoicesList.length} facturas emitidas</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Notas de Venta RIMPE (02)</span>
          <span className="text-lg font-bold font-mono tabular-nums text-amber-300">
            {formatMoney(totalSalesNotesGross)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">{salesNotesList.length} notas populares</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">Notas de Crédito (04)</span>
          <span className="text-lg font-bold font-mono tabular-nums text-[#FF3366]">
            -{formatMoney(totalCreditNotesReverted)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">{creditNotesList.length} reversos aplicados</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <span className="text-[10px] text-neutral-400 block mb-1">IVA Total Repercutido</span>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
            {formatMoney(totalInvoicesTax)}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">15% SRI facturación</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-center xs:col-span-2 lg:col-span-1 gap-2">
          {activeSubTab === 'credit_notes' ? (
            <button
              onClick={() => handleOpenEmitCreditNote()}
              className="w-full py-2.5 px-3 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>+ Emitir Nota Crédito</span>
            </button>
          ) : (
            <button
              onClick={() => guardPermission('sales.create') && onOpenNewSale()}
              className="w-full py-2.5 px-3 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)] cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Cobrar en POS</span>
            </button>
          )}
        </div>
      </div>

      {/* Main SubTab Selector: Facturas vs Notas de Venta vs Notas de Crédito */}
      <div className="flex items-center gap-2 border-b border-[#272730] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'invoices'
              ? 'bg-[#FF3366] text-white shadow-md shadow-[#FF3366]/20'
              : 'bg-[#18181D] text-neutral-400 hover:text-white border border-[#272730]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Historial de Facturas (Tipo 01)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
            {invoicesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('sales_notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'sales_notes'
              ? 'bg-[#FF3366] text-white shadow-md shadow-[#FF3366]/20'
              : 'bg-[#18181D] text-neutral-400 hover:text-white border border-[#272730]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Historial de Notas de Venta (Tipo 02 - RIMPE)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
            {salesNotesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('credit_notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'credit_notes'
              ? 'bg-[#FF3366] text-white shadow-md shadow-[#FF3366]/20'
              : 'bg-[#18181D] text-neutral-400 hover:text-white border border-[#272730]'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Historial de Notas de Crédito (Tipo 04)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
            {creditNotesList.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar with Tag pills */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder={
              activeSubTab === 'credit_notes'
                ? 'Buscar por N° Nota Crédito, Factura o Cliente...'
                : activeSubTab === 'sales_notes'
                ? 'Buscar por N° Nota de Venta, Cliente...'
                : 'Buscar por N° Factura, Cliente, RUC o Artista...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
          <Search className="w-4 h-4 text-[#FF3366] absolute right-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {activeSubTab === 'invoices' && (
            <>
              {[
                { id: 'all', label: 'Todo' },
                { id: 'tattoo', label: 'Tatuajes' },
                { id: 'piercing', label: 'Piercings' },
                { id: 'jewelry', label: 'Joyería' },
                { id: 'aftercare', label: 'Aftercare' },
              ].map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setCategoryFilter(tag.id)}
                  className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryFilter === tag.id
                      ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                      : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                  }`}
                >
                  {tag.label}
                </button>
              ))}

              <div className="h-4 w-px bg-[#272730] mx-1 shrink-0" />

              <button
                onClick={() => setStatusFilter(prev => (prev === 'cancelled' ? 'all' : 'cancelled'))}
                className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'cancelled'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                }`}
              >
                Con Nota de Crédito
              </button>
            </>
          )}

          {activeSubTab === 'credit_notes' && (
            <button
              onClick={() => handleOpenEmitCreditNote()}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>+ Nueva Nota de Crédito</span>
            </button>
          )}

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-4 py-1 rounded-full border border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366]/10 text-xs font-semibold transition-all whitespace-nowrap ml-auto md:ml-2 shrink-0 cursor-pointer"
            title="Exportar listado a CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HISTORIAL DE FACTURAS (TIPO 01) */}
      {/* ========================================================================= */}
      {activeSubTab === 'invoices' && (
        <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
          {/* Mobile Card List (md:hidden) */}
          <div className="md:hidden divide-y divide-[#222228]">
            {invoicesList.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                No se encontraron facturas emitidas con los filtros actuales.
              </div>
            ) : (
              invoicesList.map(sale => {
                const hasCreditNote = Boolean(sale.creditNoteNumber);
                const isCancelled = sale.status === 'cancelled';
                return (
                  <div key={`m-inv-${sale.id}`} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-[#FF3366]">
                          {sale.invoiceNumber}
                        </span>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {new Date(sale.date).toLocaleDateString('es-EC', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <div>
                        {sale.voidedAt ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/30"
                            title={`Anulada el ${new Date(sale.voidedAt).toLocaleDateString('es-EC')}: ${sale.voidReason || ''}`}
                          >
                            ANULADA
                          </span>
                        ) : isCancelled || hasCreditNote ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ANULADA CON NC
                          </span>
                        ) : (
                          <SriStatusBadge
                            status={sale.sriStatus}
                            messages={sale.sriMessages}
                            onRetry={can('sales.send_sri') ? () => emitSaleToSri(sale.id) : undefined}
                          />
                        )}
                      </div>
                    </div>

                    <div className="bg-[#121215] p-2.5 rounded-xl border border-[#23232A] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white truncate">{sale.clientName}</span>
                        <span className="text-[10px] font-mono text-neutral-400">{sale.clientDni || 'Consumidor Final'}</span>
                      </div>
                      <div className="text-[11px] text-neutral-300 truncate">{sale.serviceName}</div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                        <span className="capitalize">{sale.serviceCategory} · {sale.artistName}</span>
                        {hasCreditNote && (
                          <span className="text-amber-400 font-mono">NC: {sale.creditNoteNumber}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-xs">
                        <div>
                          <span className="text-[9px] text-neutral-500 block uppercase">Subtotal</span>
                          <span className="font-mono text-neutral-300">{formatMoney(sale.subtotal - (sale.discount || 0))}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-500 block uppercase">IVA 15%</span>
                          <span className="font-mono text-emerald-400">{formatMoney(sale.taxAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 block uppercase font-bold">Total</span>
                          <span className="font-mono font-bold text-white text-sm">{formatMoney(sale.total)}</span>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedInvoiceFormat('A4');
                            setSelectedInvoiceForRide(sale);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Ver e imprimir RIDE A4 Oficial SRI"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>RIDE</span>
                        </button>
                        <button
                          onClick={() => handleViewXmlForSale(sale)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/35 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Ver y descargar XML Firmado XAdES-BES autorizado por el SRI"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>XML</span>
                        </button>
                        <button
                          onClick={() => openReceipt(sale)}
                          className="p-2 rounded-xl bg-[#24242C] text-neutral-300 hover:text-white cursor-pointer"
                          title="Ver Ticket Térmico 80mm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!hasCreditNote && !isCancelled && !isConsumidorFinal(sale.clientDni) && (
                          <button
                            onClick={() => handleOpenEmitCreditNote(sale)}
                            className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-pointer"
                            title="Emitir Nota de Crédito (reverso tributario legal SRI)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!hasCreditNote && !isCancelled && isConsumidorFinal(sale.clientDni) && (
                          <button
                            onClick={() => openVoid(sale)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 cursor-pointer"
                            title="Anular factura a consumidor final (no admite nota de crédito)"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                  <th className="py-3.5 px-4 whitespace-nowrap">N° Factura</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Fecha Emisión</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Cliente & Cédula / RUC</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Concepto / Servicio</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Artista</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Estado SRI</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Subtotal</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">IVA (15%)</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Total</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {invoicesList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-neutral-500">
                      No se encontraron facturas emitidas con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  invoicesList.map(sale => {
                    const hasCreditNote = Boolean(sale.creditNoteNumber);
                    const isCancelled = sale.status === 'cancelled';
                    return (
                      <tr key={sale.id} className="hover:bg-[#1E1E25] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#FF3366] whitespace-nowrap">
                          <div>{sale.invoiceNumber}</div>
                          {hasCreditNote && (
                            <span className="text-[9px] text-amber-400 font-mono block">
                              NC: {sale.creditNoteNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                          {new Date(sale.date).toLocaleDateString('es-EC', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">{sale.clientName}</div>
                          <div className="text-[10px] font-mono text-neutral-500">
                            {sale.clientDni || 'Consumidor Final'}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[240px] xl:max-w-[340px]">
                          <div className="text-neutral-200 font-medium truncate">{sale.serviceName}</div>
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <span className="capitalize">{sale.serviceCategory}</span>
                            {sale.hours && <span>· {sale.hours} hrs</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                          {sale.artistName}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {sale.voidedAt ? (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/30"
                              title={`Anulada el ${new Date(sale.voidedAt).toLocaleDateString('es-EC')}: ${sale.voidReason || ''}`}
                            >
                              ANULADA
                            </span>
                          ) : isCancelled || hasCreditNote ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              ANULADA CON NC
                            </span>
                          ) : (
                            <SriStatusBadge
                              center
                              status={sale.sriStatus}
                              messages={sale.sriMessages}
                              onRetry={can('sales.send_sri') ? () => emitSaleToSri(sale.id) : undefined}
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-neutral-300 whitespace-nowrap">
                          {formatMoney(sale.subtotal - (sale.discount || 0))}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 whitespace-nowrap">
                          {formatMoney(sale.taxAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                          {formatMoney(sale.total)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedInvoiceFormat('A4');
                                setSelectedInvoiceForRide(sale);
                              }}
                              className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Ver e imprimir RIDE A4 Oficial autorizado por el SRI"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            </button>

                            <button
                              onClick={() => handleViewXmlForSale(sale)}
                              className="p-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/35 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Ver y descargar XML Firmado XAdES-BES autorizado por el SRI"
                            >
                              <Code2 className="w-3.5 h-3.5 text-blue-400" />
                            </button>

                            <button
                              onClick={() => openReceipt(sale)}
                              className="p-1.5 rounded-xl bg-[#121215] hover:bg-[#282834] text-neutral-300 hover:text-white border border-[#272730] transition-colors cursor-pointer"
                              title="Ver Ticket Térmico POS 80mm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {!hasCreditNote && !isCancelled && isConsumidorFinal(sale.clientDni) && (
                              <button
                                onClick={() => openVoid(sale)}
                                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Factura a consumidor final: no admite nota de crédito; se anula en el SRI y aquí"
                              >
                                <Ban className="w-3 h-3" />
                              </button>
                            )}
                            {!hasCreditNote && !isCancelled && !isConsumidorFinal(sale.clientDni) && (
                              <button
                                onClick={() => handleOpenEmitCreditNote(sale)}
                                className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Emitir Nota de Crédito (único mecanismo legal del SRI para anular/reversar una factura autorizada)"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-400" />
                              </button>
                            )}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIAL DE NOTAS DE VENTA (TIPO 02 - RIMPE NEGOCIO POPULAR) */}
      {/* ========================================================================= */}
      {activeSubTab === 'sales_notes' && (
        <div className="space-y-3">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Régimen RIMPE Negocio Popular:</strong> Las Notas de Venta se emiten sin desglose de IVA (Art. 97.6 Ley de Régimen Tributario Interno).
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-300">
              Tipo Comprobante: 02
            </span>
          </div>

          <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
            {/* Mobile Card List (md:hidden) */}
            <div className="md:hidden divide-y divide-[#222228]">
              {salesNotesList.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  No se han emitido notas de venta RIMPE en este período.
                </div>
              ) : (
                salesNotesList.map(sale => (
                  <div key={`m-nv-${sale.id}`} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-amber-400">
                          {sale.invoiceNumber}
                        </span>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {new Date(sale.date).toLocaleDateString('es-EC', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      {sale.voidedAt ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/30" title={sale.voidReason}>
                          ANULADA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          RIMPE POPULAR
                        </span>
                      )}
                    </div>

                    <div className="bg-[#121215] p-2.5 rounded-xl border border-[#23232A] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white truncate">{sale.clientName}</span>
                        <span className="text-[10px] font-mono text-neutral-400">{sale.clientDni || 'Consumidor Final'}</span>
                      </div>
                      <div className="text-[11px] text-neutral-300 truncate">{sale.serviceName}</div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                        <span className="capitalize">{sale.serviceCategory} · {sale.artistName}</span>
                        <span className="uppercase font-mono text-neutral-400">
                          {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transf'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[9px] text-neutral-400 block uppercase font-bold">Valor Total</span>
                        <span className="font-mono font-bold text-white text-base">{formatMoney(sale.total)}</span>
                      </div>
                      <div className="flex items-center flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSalesNoteFormat('A4');
                            printSalesNote(sale);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Ver e imprimir RIDE A4 Nota de Venta"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>RIDE</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSalesNoteFormat('THERMAL');
                            printSalesNote(sale);
                          }}
                          className="p-2 rounded-xl bg-[#24242C] text-neutral-300 hover:text-white cursor-pointer"
                          title="Ver Ticket Térmico 80mm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!sale.voidedAt && (
                          <button
                            onClick={() => openVoid(sale)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 cursor-pointer"
                            title="Anular nota de venta"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                    <th className="py-3.5 px-4 whitespace-nowrap">N° Nota de Venta</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Fecha Emisión</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Cliente & Cédula / RUC</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Concepto / Servicio</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Atendido por</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Forma de Pago</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Régimen</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Valor Total</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {salesNotesList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-500">
                        No se han emitido notas de venta RIMPE en este período.
                      </td>
                    </tr>
                  ) : (
                    salesNotesList.map(sale => (
                      <tr key={sale.id} className="hover:bg-[#1E1E25] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {sale.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                          {new Date(sale.date).toLocaleDateString('es-EC', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">{sale.clientName}</div>
                          <div className="text-[10px] font-mono text-neutral-500">
                            {sale.clientDni || 'Consumidor Final'}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[260px]">
                          <div className="text-neutral-200 font-medium truncate">{sale.serviceName}</div>
                          <div className="text-[10px] text-neutral-500 capitalize">{sale.serviceCategory}</div>
                        </td>
                        <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                          {sale.artistName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#121215] border border-[#272730] text-neutral-300">
                            {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transf'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {sale.voidedAt ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/30" title={sale.voidReason}>
                              ANULADA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              RIMPE POPULAR
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                          {formatMoney(sale.total)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSalesNoteFormat('A4');
                                printSalesNote(sale);
                              }}
                              className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Ver e imprimir RIDE A4 Nota de Venta RIMPE"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSalesNoteFormat('THERMAL');
                                printSalesNote(sale);
                              }}
                              className="p-1.5 rounded-xl bg-[#121215] hover:bg-[#282834] text-neutral-300 hover:text-white border border-[#272730] transition-colors cursor-pointer"
                              title="Ver Ticket Térmico 80mm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {!sale.voidedAt && (
                              <button
                                onClick={() => openVoid(sale)}
                                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Anular nota de venta"
                              >
                                <Ban className="w-3 h-3" />
                              </button>
                            )}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORIAL DE NOTAS DE CRÉDITO (TIPO 04) */}
      {/* ========================================================================= */}
      {activeSubTab === 'credit_notes' && (
        <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
          {/* Mobile Card List (md:hidden) */}
          <div className="md:hidden divide-y divide-[#222228]">
            {creditNotesList.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                No se han emitido notas de crédito en este período.
              </div>
            ) : (
              creditNotesList.map(cn => (
                <div key={`m-cn-${cn.id}`} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-[#FF3366]">
                        {cn.creditNoteNumber}
                      </span>
                      <div className="text-[10px] font-mono text-neutral-400">
                        {new Date(cn.date).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <SriStatusBadge
                      status={cn.sriStatus}
                      messages={cn.sriMessages}
                      onRetry={can('sales.send_sri') ? () => emitCreditNoteToSri(cn.id) : undefined}
                    />
                  </div>

                  <div className="bg-[#121215] p-2.5 rounded-xl border border-[#23232A] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white truncate">{cn.clientName}</span>
                      <span className="text-[10px] font-mono text-neutral-400">{cn.clientDni || 'Consumidor Final'}</span>
                    </div>
                    <div className="text-[11px] text-neutral-300">
                      <span className="text-neutral-500">Factura Afectada: </span>
                      <span className="font-mono text-white font-bold">{cn.affectedInvoiceNumber}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 flex items-center justify-between">
                      <span className="truncate">{cn.reasonDescription}</span>
                      {cn.revertInventory && (
                        <span className="text-emerald-400 font-bold shrink-0">✓ Reingreso Bodega</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase">Subtotal</span>
                        <span className="font-mono text-neutral-300">{formatMoney(cn.subtotal)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase">IVA Revertido</span>
                        <span className="font-mono text-emerald-400">{formatMoney(cn.taxAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-neutral-400 block uppercase font-bold">Total NC</span>
                        <span className="font-mono font-bold text-[#FF3366] text-sm">-{formatMoney(cn.total)}</span>
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedCreditNoteFormat('A4');
                          printCreditNote(cn);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Ver e imprimir RIDE A4 Nota de Crédito"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>RIDE</span>
                      </button>
                      <button
                        onClick={() => handleViewXmlForCreditNote(cn)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/35 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Ver y descargar XML Firmado XAdES-BES autorizado por el SRI"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>XML</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCreditNoteFormat('THERMAL');
                          printCreditNote(cn);
                        }}
                        className="p-2 rounded-xl bg-[#24242C] text-neutral-300 hover:text-white cursor-pointer"
                        title="Ver Ticket 80mm Nota de Crédito"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                  <th className="py-3.5 px-4 whitespace-nowrap">N° Nota Crédito</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Fecha Emisión</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Factura Afectada</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Cliente & Cédula / RUC</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Motivo Oficial SRI</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Kardex Reingresado</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Estado SRI</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Subtotal</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">IVA Revertido</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Acreditado</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {creditNotesList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-neutral-500">
                      No se han emitido notas de crédito en este período.
                    </td>
                  </tr>
                ) : (
                  creditNotesList.map(cn => (
                    <tr key={cn.id} className="hover:bg-[#1E1E25] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#FF3366] whitespace-nowrap">
                        {cn.creditNoteNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                        {new Date(cn.date).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                        <div>Factura: {cn.affectedInvoiceNumber}</div>
                        <span className="text-[10px] text-neutral-500 font-normal">
                          Emisión: {cn.affectedInvoiceDate}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{cn.clientName}</div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {cn.clientDni || 'Consumidor Final'}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="text-neutral-200 font-medium truncate">{cn.reasonDescription}</div>
                        <span className="text-[10px] text-[#FF3366] font-mono uppercase">
                          {cn.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {cn.revertInventory ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            ✓ Sí (Bodega)
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <SriStatusBadge
                          center
                          status={cn.sriStatus}
                          messages={cn.sriMessages}
                          onRetry={can('sales.send_sri') ? () => emitCreditNoteToSri(cn.id) : undefined}
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-300 whitespace-nowrap">
                        {formatMoney(cn.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 whitespace-nowrap">
                        {formatMoney(cn.taxAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#FF3366] whitespace-nowrap">
                        -{formatMoney(cn.total)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCreditNoteFormat('A4');
                              printCreditNote(cn);
                            }}
                            className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Ver e imprimir RIDE A4 Nota de Crédito autorizada por el SRI"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => handleViewXmlForCreditNote(cn)}
                            className="p-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/35 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Ver y descargar XML Firmado XAdES-BES autorizado por el SRI"
                          >
                            <Code2 className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCreditNoteFormat('THERMAL');
                              printCreditNote(cn);
                            }}
                            className="p-1.5 rounded-xl bg-[#121215] hover:bg-[#282834] text-neutral-300 hover:text-white border border-[#272730] transition-colors cursor-pointer"
                            title="Ver Ticket Térmico 80mm"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
      )}

      {/* MODAL: EMITIR NOTA DE CRÉDITO */}
      <NewCreditNoteModal
        isOpen={isNewCreditNoteOpen}
        onClose={() => {
          setIsNewCreditNoteOpen(false);
          setCreditNoteToPreselect(null);
        }}
        preselectedSale={creditNoteToPreselect}
      />

      {/* MODAL: VER / IMPRIMIR FACTURA EN MODO RIDE A4 OFICIAL SRI */}
      <ReceiptModal
        sale={selectedInvoiceForRide}
        initialFormat={selectedInvoiceFormat}
        onClose={() => setSelectedInvoiceForRide(null)}
      />

      {/* MODAL: VER / IMPRIMIR NOTA DE CRÉDITO RIDE */}
      <CreditNotePrintModal
        creditNote={selectedCreditNoteToPrint}
        initialFormat={selectedCreditNoteFormat}
        onClose={() => setSelectedCreditNoteToPrint(null)}
      />

      {/* MODAL: VER / IMPRIMIR NOTA DE VENTA */}
      <SalesNotePrintModal
        sale={selectedSalesNoteToPrint}
        initialFormat={selectedSalesNoteFormat}
        onClose={() => setSelectedSalesNoteToPrint(null)}
      />

      {/* MODAL: VISOR Y DESCARGA DEL XML DEL COMPROBANTE ELECTRÓNICO */}
      {xmlViewerDoc && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
            <div className="px-5 py-3.5 bg-[#121215] border-b border-[#25252E] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/35 text-blue-400 shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{xmlViewerDoc.title}</h3>
                    <span className="font-mono text-xs font-bold text-[#FF3366] bg-[#FF3366]/10 px-2 py-0.5 rounded-md border border-[#FF3366]/25">
                      {xmlViewerDoc.docNumber}
                    </span>
                    {xmlViewerDoc.status === 'AUTORIZADO' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>AUTORIZADO POR EL SRI</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                        <span>SIN AUTORIZACIÓN · XML generado sin firma</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                    Clave de Acceso SRI: <strong className="text-neutral-200">{xmlViewerDoc.claveAcceso}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(xmlViewerDoc.xmlContent);
                    setCopiedXml(true);
                    setTimeout(() => setCopiedXml(false), 2500);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#20202A] hover:bg-[#2B2B38] text-neutral-200 hover:text-white border border-[#2E2E3A] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>{copiedXml ? '✓ Copiado' : 'Copiar XML'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadXml(xmlViewerDoc.docNumber, xmlViewerDoc.xmlContent)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .XML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setXmlViewerDoc(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-[#0D0D10] custom-scrollbar">
              <pre className="text-[11px] font-mono text-emerald-300/95 leading-relaxed whitespace-pre-wrap break-all select-all p-4 rounded-2xl bg-[#121216] border border-[#23232C]">
                {xmlViewerDoc.xmlContent}
              </pre>
            </div>

            <div className="px-5 py-3 bg-[#121215] border-t border-[#25252E] flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
              <span>
                Estándar SRI: Ficha Técnica de Comprobantes Electrónicos Esquema Offline v2.1.0 • Firma Electrónica XAdES-BES
              </span>
              <button
                type="button"
                onClick={() => setXmlViewerDoc(null)}
                className="px-4 py-1.5 rounded-xl bg-[#252530] hover:bg-[#30303E] text-white font-semibold text-xs cursor-pointer"
              >
                Cerrar Visor XML
              </button>
            </div>
          </div>
        </div>
      )}
      <VoidSaleModal
        sale={saleToVoid}
        onClose={() => setSaleToVoid(null)}
        onDone={voided => {
          setSaleToVoid(null);
          showAlert({
            title: 'Comprobante anulado',
            message: `${voided.invoiceNumber} quedó ANULADO. Recuerde devolver el dinero al cliente; la caja, la contabilidad y el inventario ya se actualizaron.`,
            type: 'success',
          });
        }}
      />
    </div>
  );
};
