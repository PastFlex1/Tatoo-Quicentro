import React from 'react';
import {
  X,
  Printer,
  Share2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  Truck,
  CreditCard,
  Package,
} from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { useStudio } from '../../context/StudioContext';

interface PurchaseOrderPrintModalProps {
  order: PurchaseOrder | null;
  onClose: () => void;
  onReceive?: (order: PurchaseOrder) => void;
}

export const PurchaseOrderPrintModal: React.FC<PurchaseOrderPrintModalProps> = ({
  order,
  onClose,
  onReceive,
}) => {
  const { settings, formatMoney } = useStudio();

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (order.supplierPhone || '').replace(/\D/g, '');
    const itemsList = order.items
      .map((it, idx) => `  ${idx + 1}. ${it.name} (${it.quantity} ${it.unit || 'u.'}) a ${formatMoney(it.unitCost)} = ${formatMoney(it.subtotal)}`)
      .join('\n');

    const message = encodeURIComponent(
      `Estimados *${order.supplierName}*:\n\n` +
      `Adjuntamos la *Orden de Compra N° ${order.orderNumber}* emitida por *${settings.studioName}* (RUC: ${settings.ruc || settings.taxId || '—'}):\n\n` +
      `📅 *Fecha de Emisión:* ${order.date}\n` +
      (order.expectedDate ? `🚚 *Fecha Requerida de Entrega:* ${order.expectedDate}\n` : '') +
      `💳 *Condición de Pago:* ${order.paymentTerms || 'Contado'}\n\n` +
      `📦 *Detalle de Productos:*\n${itemsList}\n\n` +
      `💰 *Subtotal:* ${formatMoney(order.subtotal)}\n` +
      `🏛️ *IVA (${order.taxRate || 15}%):* ${formatMoney(order.taxAmount)}\n` +
      `💵 *TOTAL DE LA ORDEN:* ${formatMoney(order.total)}\n\n` +
      `📍 *Lugar de Entrega:* ${settings.address || 'C.C. Quicentro Shopping, Local 214, Quito'}\n` +
      `Por favor confirmar disponibilidad y fecha estimada de despacho. Saludos cordiales.`
    );

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'received':
        return {
          label: 'RECIBIDA EN BODEGA',
          className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        };
      case 'sent':
        return {
          label: 'ENVIADA / EN TRÁNSITO',
          className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        };
      case 'cancelled':
        return {
          label: 'ANULADA / CANCELADA',
          className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
        };
      case 'draft':
      default:
        return {
          label: 'BORRADOR / PENDIENTE',
          className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        };
    }
  };

  const statusInfo = getStatusBadge(order.status);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Styles for direct print to paper / PDF */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-purchase-order, #printable-purchase-order * {
            visibility: visible;
          }
          #printable-purchase-order {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
            background: white !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-4xl bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#24242C] bg-[#121215] shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Orden de Compra Oficial</h3>
                <span className="text-xs font-mono font-bold text-[#FF3366] bg-[#FF3366]/10 px-2 py-0.5 rounded-full border border-[#FF3366]/20">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Documento mercantil oficial de adquisición de insumos y materiales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order.status !== 'received' && onReceive && (
              <button
                type="button"
                onClick={() => onReceive(order)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Recibir en Bodega</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Compartir orden por WhatsApp con el proveedor"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#22222B] hover:bg-[#2B2B36] border border-[#333342] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Imprimir documento oficial en formato A4"
            >
              <Printer className="w-4 h-4 text-neutral-300" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-[#202027] transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable A4 preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0F0F12]">
          <div
            id="printable-purchase-order"
            className="w-full max-w-3xl mx-auto bg-white text-neutral-900 rounded-2xl shadow-xl p-6 sm:p-10 border border-neutral-200"
          >
            {/* Header Document */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-neutral-200 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF3366]" />
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900">
                    {settings.studioName || 'Devolution Ink Tattoo Studio'}
                  </h1>
                </div>
                <p className="text-xs text-neutral-600 font-medium">
                  Estudio Profesional de Tatuajes & Body Piercing
                </p>
                <div className="text-[11px] text-neutral-600 space-y-0.5 pt-1">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                    <span><strong>R.U.C.:</strong> {settings.ruc || settings.taxId || '—'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{settings.address || 'C.C. Quicentro Shopping, Local 214, Av. Naciones Unidas y 6 de Diciembre, Quito'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{settings.phone || '+593 99 123 4567'}</span>
                    <span className="text-neutral-400 mx-1">|</span>
                    <Mail className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{settings.email || 'compras@devolutionink.com'}</span>
                  </p>
                </div>
              </div>

              {/* Order Number Box */}
              <div className="w-full sm:w-auto text-left sm:text-right bg-neutral-50 border border-neutral-200 p-4 rounded-xl min-w-[220px]">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  ORDEN DE COMPRA
                </div>
                <div className="text-lg font-black text-[#FF3366] font-mono mt-0.5">
                  {order.orderNumber}
                </div>
                <div className="mt-2 text-[11px] text-neutral-700 space-y-0.5">
                  <p>
                    <span className="text-neutral-500">Fecha Emisión:</span>{' '}
                    <strong>{order.date}</strong>
                  </p>
                  {order.expectedDate && (
                    <p>
                      <span className="text-neutral-500">Fecha Requerida:</span>{' '}
                      <strong>{order.expectedDate}</strong>
                    </p>
                  )}
                  <div className="pt-1.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier & Destination Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-neutral-200 text-xs">
              {/* Proveedor */}
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80">
                <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-neutral-600" />
                  DATOS DEL PROVEEDOR
                </div>
                <p className="font-bold text-neutral-900 text-sm">{order.supplierName}</p>
                <p className="text-neutral-700 mt-0.5">
                  <span className="text-neutral-500">RUC:</span> <strong className="font-mono">{order.supplierRuc}</strong>
                </p>
                {order.supplierAddress && (
                  <p className="text-neutral-600 mt-0.5 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-neutral-400 mt-0.5 shrink-0" />
                    <span>{order.supplierAddress}</span>
                  </p>
                )}
                {(order.supplierPhone || order.supplierEmail) && (
                  <p className="text-neutral-600 mt-0.5">
                    {order.supplierPhone && <span>Telf: {order.supplierPhone} </span>}
                    {order.supplierEmail && <span>| {order.supplierEmail}</span>}
                  </p>
                )}
              </div>

              {/* Condiciones comerciales y entrega */}
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80">
                <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
                  CONDICIONES DE COMPRA & PAGO
                </div>
                <div className="space-y-1 text-neutral-700">
                  <p>
                    <span className="text-neutral-500">Condición de Pago:</span>{' '}
                    <strong>{order.paymentTerms || 'Contado contra entrega'}</strong>
                  </p>
                  <p>
                    <span className="text-neutral-500">Método de Pago:</span>{' '}
                    <strong>
                      {order.paymentMethod === 'bank_transfer'
                        ? 'Transferencia Bancaria'
                        : order.paymentMethod === 'cash'
                        ? 'Efectivo en Caja'
                        : 'Tarjeta de Débito / Crédito'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-neutral-500">Destino de Entrega:</span>{' '}
                    <span className="font-medium text-neutral-900">Quicentro Shopping, Local 214 (Devolution Ink)</span>
                  </p>
                  {order.invoiceReference && (
                    <p className="text-emerald-700 font-medium">
                      Factura Proveedor Ref: <span className="font-mono">{order.invoiceReference}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-6">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2.5">
                DETALLE DE ARTÍCULOS E INSUMOS SOLICITADOS
              </div>
              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Código / SKU</th>
                      <th className="py-2.5 px-3">Descripción del Producto / Insumo</th>
                      <th className="py-2.5 px-3 text-center">Unidad</th>
                      <th className="py-2.5 px-3 text-right">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                      <th className="py-2.5 px-3 text-right">IVA %</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {order.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-neutral-50/70">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-neutral-600">
                          {it.code || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-neutral-900">{it.name}</p>
                          <span className="text-[10px] text-neutral-500 uppercase">
                            Categoría: {it.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-neutral-600">
                          {it.unit || 'unidad'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 font-mono">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-700 font-mono">
                          {formatMoney(it.unitCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-600 font-mono">
                          {it.taxRate !== undefined ? `${it.taxRate}%` : `${order.taxRate || 15}%`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 font-mono">
                          {formatMoney(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals and Observations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-6 border-b border-neutral-200">
              {/* Notes */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Notas / Términos de Despacho:
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs text-neutral-700 leading-relaxed min-h-[90px]">
                  {order.notes || (
                    <span className="text-neutral-400 italic">
                      Todos los insumos que requieran esterilización médica deben incluir sus respectivos certificados de lote y fecha de caducidad vigente.
                    </span>
                  )}
                </div>
                {order.receivedAt && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Recibido y verificado en bodega el <strong>{new Date(order.receivedAt).toLocaleDateString('es-EC')}</strong> por{' '}
                      <strong>{order.receivedBy || 'Administrador'}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Subtotal Insumos (Tarifa 15%):</span>
                  <span className="font-mono font-medium text-neutral-900">{formatMoney(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Subtotal Tarifa 0%:</span>
                  <span className="font-mono font-medium text-neutral-900">{formatMoney(0)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>IVA ({order.taxRate || 15}%):</span>
                  <span className="font-mono font-medium text-neutral-900">{formatMoney(order.taxAmount)}</span>
                </div>
                <div className="border-t border-neutral-300 pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-neutral-900 uppercase">Total Orden de Compra:</span>
                  <span className="text-xl font-black text-[#FF3366] font-mono">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 pt-12 pb-4 text-center">
              <div>
                <div className="w-48 mx-auto border-b border-neutral-400 mb-2" />
                <p className="text-xs font-bold text-neutral-900">Alex Palma</p>
                <p className="text-[10px] text-neutral-500">Gerencia / Departamento de Compras</p>
                <p className="text-[10px] font-mono text-neutral-500">Devolution Ink Tattoo Studio</p>
              </div>

              <div>
                <div className="w-48 mx-auto border-b border-neutral-400 mb-2" />
                <p className="text-xs font-bold text-neutral-900">Firma & Sello de Aceptación</p>
                <p className="text-[10px] text-neutral-500">{order.supplierName}</p>
                <p className="text-[10px] font-mono text-neutral-500">Proveedor Autorizado</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-neutral-200 text-center text-[10px] text-neutral-400 flex flex-col sm:flex-row justify-between items-center gap-1">
              <span>{settings.studioName} • Sistema de Gestión Comercial & SRI</span>
              <span>C.C. Quicentro Shopping, Quito, Ecuador • Documento no válido como factura tributaria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

