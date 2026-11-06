import React, { useState, useMemo } from 'react';
import { usePermission } from '../../hooks/usePermission';
import {
  ClipboardList,
  Search,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
  CreditCard,
  Check,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { PurchaseOrder, PurchaseOrderStatus } from '../../types';
import { NewPurchaseOrderModal } from './NewPurchaseOrderModal';
import { PurchaseOrderPrintModal } from './PurchaseOrderPrintModal';

export const PurchaseOrdersView: React.FC = () => {
  const {
    purchaseOrders,
    deletePurchaseOrder,
    receivePurchaseOrder,
    formatMoney,
    currentUser,
  } = useStudio();
  const currentUserName = `${currentUser?.nombres || ''} ${currentUser?.apellidos || ''}`.trim() || currentUser?.username || '';

  const { guard: guardPermission } = usePermission();
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<PurchaseOrder | null>(null);

  // Receive Modal state
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [updateInventoryStock, setUpdateInventoryStock] = useState(true);
  const [registerExpense, setRegisterExpense] = useState(true);
  const [receiveSuccessNotice, setReceiveSuccessNotice] = useState<string | null>(null);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      const matchSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierRuc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.notes && order.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.items.some(it => it.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalOrders = purchaseOrders.length;
    const pendingOrders = purchaseOrders.filter(o => o.status === 'sent' || o.status === 'draft').length;
    const receivedOrders = purchaseOrders.filter(o => o.status === 'received').length;
    const totalSpent = purchaseOrders
      .filter(o => o.status === 'received')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    return { totalOrders, pendingOrders, receivedOrders, totalSpent };
  }, [purchaseOrders]);

  const handleOpenEdit = (order: PurchaseOrder) => {
    if (!guardPermission('purchase-orders.edit')) return;
    setOrderToEdit(order);
    setIsNewModalOpen(true);
  };

  const handleOpenReceive = (order: PurchaseOrder) => {
    if (!guardPermission('purchase-orders.receive')) return;
    setOrderToReceive(order);
    setReceivedBy('');
    setInvoiceReference(order.invoiceReference || '');
    setUpdateInventoryStock(true);
    setRegisterExpense(true);
  };

  const handleConfirmReceive = () => {
    if (!guardPermission('purchase-orders.receive')) return;
    if (!orderToReceive) return;
    receivePurchaseOrder(orderToReceive.id, {
      receivedBy: receivedBy.trim() || currentUserName,
      invoiceReference: invoiceReference.trim(),
      updateInventoryStock,
      registerExpense,
    });

    setReceiveSuccessNotice(`¡Orden ${orderToReceive.orderNumber} recibida exitosamente! Stock de inventario y Kardex actualizados.`);
    setTimeout(() => setReceiveSuccessNotice(null), 5000);
    setOrderToReceive(null);
  };

  const handleDelete = (id: string, num: string) => {
    if (!guardPermission('purchase-orders.cancel')) return;
    if (window.confirm(`¿Está seguro de eliminar la Orden de Compra ${num}?`)) {
      deletePurchaseOrder(id);
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'received':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Recibida
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            En Tránsito
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <X className="w-3.5 h-3.5 text-rose-400" />
            Cancelada
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Borrador
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner / Success Toast */}
      {receiveSuccessNotice && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{receiveSuccessNotice}</span>
          </div>
          <button
            onClick={() => setReceiveSuccessNotice(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Title and New Order Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366] shadow-[0_0_15px_rgba(255,51,102,0.15)]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Órdenes de Compra & Adquisiciones
              </h2>
              <p className="text-xs text-neutral-400">
                Gestión de abastecimiento, reposición de insumos de tatuaje y recepción en bodega
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setOrderToEdit(null);
            setIsNewModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF3366] text-white text-xs font-bold hover:bg-[#e02958] transition-all shadow-[0_0_20px_rgba(255,51,102,0.35)] active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Orden de Compra</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Total Órdenes
            </div>
            <div className="text-xl font-black text-white font-mono mt-0.5">
              {kpis.totalOrders}
            </div>
          </div>
        </div>

        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              En Tránsito / Pendientes
            </div>
            <div className="text-xl font-black text-blue-400 font-mono mt-0.5">
              {kpis.pendingOrders}
            </div>
          </div>
        </div>

        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Recibidas en Bodega
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {kpis.receivedOrders}
            </div>
          </div>
        </div>

        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366] shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Inversión Recibida (USD)
            </div>
            <div className="text-xl font-black text-white font-mono mt-0.5">
              {formatMoney(kpis.totalSpent)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#17171C] border border-[#24242F] p-3 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por N° Orden, Proveedor, RUC o Producto..."
            className="w-full bg-[#121215] border border-[#24242F] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF3366] transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'draft', label: 'Borrador' },
              { id: 'sent', label: 'En Tránsito' },
              { id: 'received', label: 'Recibidas' },
              { id: 'cancelled', label: 'Canceladas' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#FF3366] text-white shadow-[0_0_12px_rgba(255,51,102,0.3)]'
                  : 'bg-[#121215] text-neutral-400 hover:text-white hover:bg-[#202027]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table & Mobile Cards */}
      <div className="bg-[#17171C] border border-[#24242F] rounded-2xl overflow-hidden shadow-xl">
        {/* Mobile Card List (md:hidden) */}
        <div className="md:hidden divide-y divide-[#24242F]">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              <ClipboardList className="w-10 h-10 mx-auto text-neutral-600 mb-2 opacity-50" />
              <p className="font-semibold text-neutral-400">No se encontraron órdenes de compra</p>
              <p className="text-[11px] text-neutral-600 mt-1">
                Intente ajustando los filtros de búsqueda o cree una nueva orden de compra.
              </p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={`m-po-${order.id}`} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-white text-xs block">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      <span>{order.date}</span>
                    </span>
                  </div>
                  <div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="bg-[#121215] p-2.5 rounded-xl border border-[#24242F] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white truncate max-w-[200px]">{order.supplierName}</span>
                    <span className="text-[10px] font-mono text-neutral-400">RUC: {order.supplierRuc}</span>
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    {order.items.length > 0
                      ? order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')
                      : 'Sin ítems'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-[#1C1C22]">
                    <span>{order.paymentTerms || 'Contado'}</span>
                    <span>{order.expectedDate ? `Entrega: ${order.expectedDate}` : 'Inmediata'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[9px] text-neutral-400 uppercase font-bold block">Total (USD)</span>
                    <span className="font-mono font-black text-white text-base">{formatMoney(order.total)}</span>
                    <span className="text-[10px] text-neutral-500 font-mono block">Subtotal: {formatMoney(order.subtotal)} + IVA</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => guardPermission('purchase-orders.print') && setSelectedOrderForPrint(order)}
                      className="p-2 rounded-xl bg-[#24242F] text-neutral-300 hover:text-white cursor-pointer"
                      title="Ver / Imprimir Orden A4"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {order.status !== 'received' && (
                      <button
                        type="button"
                        onClick={() => handleOpenReceive(order)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Recibir en Bodega"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Recibir</span>
                      </button>
                    )}

                    {order.status !== 'received' && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(order)}
                        className="p-2 rounded-xl bg-[#24242F] text-neutral-300 hover:text-white cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(order.id, order.orderNumber)}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
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
            <thead className="bg-[#121215] text-neutral-400 font-bold border-b border-[#24242F] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">N° Orden & Fecha</th>
                <th className="py-3.5 px-4">Proveedor & RUC</th>
                <th className="py-3.5 px-4">Artículos Solicitados</th>
                <th className="py-3.5 px-4">Condición & Entrega</th>
                <th className="py-3.5 px-4 text-right">Subtotal & IVA</th>
                <th className="py-3.5 px-4 text-right">Total (USD)</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24242F]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    <ClipboardList className="w-10 h-10 mx-auto text-neutral-600 mb-2 opacity-50" />
                    <p className="font-semibold text-neutral-400">No se encontraron órdenes de compra</p>
                    <p className="text-[11px] text-neutral-600 mt-1">
                      Intente ajustando los filtros de búsqueda o cree una nueva orden de compra.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#1C1C24]/70 transition-colors">
                    {/* Order Number & Date */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white text-xs flex items-center gap-2">
                        <span>{order.orderNumber}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-neutral-500" />
                        <span>{order.date}</span>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{order.supplierName}</p>
                      <p className="text-[11px] font-mono text-neutral-400 flex items-center gap-1 mt-0.5">
                        <span>RUC: {order.supplierRuc}</span>
                      </p>
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="text-neutral-300 font-medium truncate">
                        {order.items.length > 0
                          ? order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')
                          : 'Sin ítems'}
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {order.items.length} {order.items.length === 1 ? 'ítem' : 'ítems en orden'}
                      </span>
                    </td>

                    {/* Terms */}
                    <td className="py-3 px-4">
                      <p className="text-neutral-300 font-medium">
                        {order.paymentTerms || 'Contado'}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {order.expectedDate ? `Entrega: ${order.expectedDate}` : 'Entrega inmediata'}
                      </p>
                    </td>

                    {/* Subtotal & IVA */}
                    <td className="py-3 px-4 text-right font-mono">
                      <p className="text-neutral-300">{formatMoney(order.subtotal)}</p>
                      <p className="text-[10px] text-neutral-500">IVA 15%: {formatMoney(order.taxAmount)}</p>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right font-mono font-black text-white text-sm">
                      {formatMoney(order.total)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(order.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Ver Documento / Imprimir A4 */}
                        <button
                          type="button"
                          onClick={() => guardPermission('purchase-orders.print') && setSelectedOrderForPrint(order)}
                          className="p-1.5 rounded-lg bg-[#24242F] hover:bg-[#2F2F3D] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          title="Visualizar e Imprimir Orden Oficial A4"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Recibir en Bodega */}
                        {order.status !== 'received' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReceive(order)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Recibir mercadería en bodega y actualizar Kardex"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Recibir</span>
                          </button>
                        )}

                        {/* Editar */}
                        {order.status !== 'received' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(order)}
                            className="p-1.5 rounded-lg bg-[#24242F] hover:bg-[#2F2F3D] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                            title="Editar Orden de Compra"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => handleDelete(order.id, order.orderNumber)}
                          className="p-1.5 rounded-lg bg-[#24242F] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar Orden"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* MODAL 1: Crear / Editar Orden de Compra */}
      <NewPurchaseOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        orderToEdit={orderToEdit}
        onOrderSaved={saved => {
          setSelectedOrderForPrint(saved);
        }}
      />

      {/* MODAL 2: Visualizar / Imprimir A4 Oficial */}
      <PurchaseOrderPrintModal
        order={selectedOrderForPrint}
        onClose={() => setSelectedOrderForPrint(null)}
        onReceive={ord => {
          setSelectedOrderForPrint(null);
          handleOpenReceive(ord);
        }}
      />

      {/* MODAL 3: Confirmación de Recepción en Bodega */}
      {orderToReceive && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-lg bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242C] bg-[#121215]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Recepción de Mercadería en Bodega
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Orden: <span className="font-mono text-[#FF3366] font-bold">{orderToReceive.orderNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderToReceive(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-[#202027] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-[#1C1C24] p-4 rounded-2xl border border-[#2B2B38] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Proveedor:</span>
                  <span className="font-bold text-white">{orderToReceive.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total a Recibir:</span>
                  <span className="font-bold text-[#FF3366] font-mono">{formatMoney(orderToReceive.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Ítems:</span>
                  <span className="text-neutral-200">{orderToReceive.items.length} productos</span>
                </div>
              </div>

              {/* Form inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    N° Factura SRI del Proveedor (Opcional)
                  </label>
                  <input
                    type="text"
                    value={invoiceReference}
                    onChange={e => setInvoiceReference(e.target.value)}
                    placeholder="Ej. 001-002-0048912"
                    className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Si el proveedor entregó la factura física o electrónica, ingrese el número para cruce fiscal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Responsable de Recepción
                  </label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={e => setReceivedBy(e.target.value)}
                    placeholder={currentUserName ? `Ej: ${currentUserName}` : 'Nombre de quien recibe'}
                    className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Checkboxes for automatic updates */}
                <div className="space-y-2 pt-2 border-t border-[#24242F]">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={updateInventoryStock}
                      onChange={e => setUpdateInventoryStock(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span>
                      <strong>Actualizar stock de bodega</strong> y registrar movimiento de ingreso en el <strong>Kardex</strong>.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={registerExpense}
                      onChange={e => setRegisterExpense(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span>
                      <strong>Registrar comprobante contable</strong> en el módulo de <strong>Gastos del Estudio</strong>.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#24242C] bg-[#121215]">
              <button
                type="button"
                onClick={() => setOrderToReceive(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_16px_rgba(16,185,129,0.35)] cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Recepción</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

