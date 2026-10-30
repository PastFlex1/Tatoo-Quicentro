import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { SaleRecord } from '../../types';
import { useStudio } from '../../context/StudioContext';

interface ReceiptModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings, formatMoney } = useStudio();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'tattoo':
        return 'Servicio de Tatuaje Artístico';
      case 'piercing':
        return 'Procedimiento de Body Piercing Aséptico';
      case 'jewelry':
        return 'Joyería Corporal Grado Implante';
      case 'aftercare':
        return 'Cuidado Posterior & Bioseguridad';
      default:
        return 'Servicio General';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Dialog box matching reference Dialog */}
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-8">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#25252E] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              Comprobante #{sale.invoiceNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#1A1A20] hover:bg-[#25252E] text-white border border-[#2D2D36] transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div id="printable-receipt" className="p-6 bg-white text-neutral-900 font-sans text-xs">
          {/* Studio Brand Header */}
          <div className="text-center pb-4 border-b border-dashed border-neutral-300">
            <h2 className="text-base font-bold tracking-tight text-neutral-900 uppercase">
              {settings.studioName}
            </h2>
            <p className="text-[11px] text-neutral-600 mt-0.5">{settings.address}</p>
            <p className="text-[11px] text-neutral-600">NIF/CIF: {settings.taxId} · Tel: {settings.phone}</p>
            <p className="text-[10px] text-neutral-500 mt-1">
              Registro Sanitario: <span className="font-mono">{settings.healthSanitaryRegistration}</span>
            </p>
          </div>

          {/* Ticket Metadata */}
          <div className="py-3 border-b border-dashed border-neutral-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Factura / Ticket:</span>
              <span className="font-mono font-bold text-neutral-900">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Fecha y Hora:</span>
              <span className="font-mono">
                {new Date(sale.date).toLocaleString('es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Cliente:</span>
              <span className="font-medium">{sale.clientName} {sale.clientDni ? `(${sale.clientDni})` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Artista / Técnico:</span>
              <span className="font-medium text-neutral-900">{sale.artistName}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-3 border-b border-dashed border-neutral-300">
            <div className="font-medium text-neutral-900 mb-1">
              {sale.serviceName}
            </div>
            <div className="text-[11px] text-neutral-500 flex justify-between">
              <span>{getCategoryLabel(sale.serviceCategory)} {sale.hours ? `(${sale.hours} hrs)` : ''}</span>
              <span className="font-mono font-medium text-neutral-900">{formatMoney(sale.subtotal)}</span>
            </div>
            {sale.notes && (
              <p className="text-[10px] text-neutral-500 italic mt-1 bg-neutral-50 p-1.5 rounded">
                Nota: {sale.notes}
              </p>
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="py-3 border-b border-dashed border-neutral-300 space-y-1">
            <div className="flex justify-between text-neutral-600">
              <span>Base Imponible:</span>
              <span className="font-mono">{formatMoney(sale.subtotal - sale.discount)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Descuento:</span>
                <span className="font-mono">-{formatMoney(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>Impuestos (IVA {sale.taxRate}%):</span>
              <span className="font-mono">{formatMoney(sale.taxAmount)}</span>
            </div>
            {sale.depositAmount > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Seña Previa Deducida:</span>
                <span className="font-mono text-neutral-700">-{formatMoney(sale.depositAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-200">
              <span>TOTAL FACTURA:</span>
              <span className="font-mono">{formatMoney(sale.total)}</span>
            </div>
            <div className="flex justify-between font-bold text-neutral-900 pt-1">
              <span>IMPORTE COBRADO:</span>
              <span className="font-mono text-[#E62557]">{formatMoney(sale.amountPaidNow)}</span>
            </div>
            {sale.tipAmount > 0 && (
              <div className="flex justify-between text-neutral-600 text-[11px]">
                <span>Propina artista:</span>
                <span className="font-mono font-medium text-neutral-900">{formatMoney(sale.tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-500 text-[11px] pt-1">
              <span>Método de Pago:</span>
              <span className="uppercase font-medium text-neutral-800">
                {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : sale.paymentMethod === 'transfer' ? 'Transferencia' : 'Mixto'}
              </span>
            </div>
          </div>

          {/* Sanitary Statement */}
          <div className="pt-3 pb-2 text-[10px] text-neutral-600 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {sale.consentFormSigned
                  ? 'Consentimiento informado y ficha médica sanitaria firmada.'
                  : 'Ficha médica simplificada.'}
              </span>
            </div>
            <p className="text-neutral-500 text-[10px] leading-relaxed pt-1 text-center">
              {settings.receiptFooterMessage}
            </p>
          </div>
        </div>

        {/* Studio Internal Commission Audit Box */}
        <div className="p-4 bg-[#121215] border-t border-[#25252E] text-xs">
          <div className="text-[11px] font-bold text-[#FF3366] mb-2 flex items-center justify-between">
            <span>Liquidación Interna de Comisión</span>
            <span className="text-[10px] text-neutral-400 font-mono">
              Artista {sale.artistCommissionPercent}% / Casa {100 - sale.artistCommissionPercent}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-neutral-300">
            <div className="p-2.5 rounded-xl bg-[#17171C] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-0.5">A Pagar al Artista:</span>
              <span className="font-mono font-bold text-[#FF3366] text-xs">
                {formatMoney(sale.artistShare + sale.tipAmount)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#17171C] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-0.5">Retención Estudio:</span>
              <span className="font-mono font-bold text-white text-xs">
                {formatMoney(sale.studioShare)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
