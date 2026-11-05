import React, { useState } from 'react';
import { saleLines } from '../../utils/saleLines';
import { X, Printer, Share2 } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SaleRecord } from '../../types';

interface SalesNotePrintModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
  initialFormat?: 'THERMAL' | 'A4';
}

export const SalesNotePrintModal: React.FC<SalesNotePrintModalProps> = ({
  sale,
  onClose,
  initialFormat = 'THERMAL',
}) => {
  const { settings, formatMoney } = useStudio();
  const [ticketFormat, setTicketFormat] = useState<'THERMAL' | 'A4'>(initialFormat);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (sale.clientPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `¡Hola ${sale.clientName}! 👋 Te compartimos tu *Nota de Venta oficial* de *${settings.studioName}*:\n\n` +
      `📝 *N° Comprobante:* ${sale.invoiceNumber}\n` +
      `📅 *Fecha:* ${new Date(sale.date).toLocaleDateString()}\n` +
      `🎨 *Servicio:* ${sale.serviceName}\n` +
      `👤 *Atendido por:* ${sale.artistName}\n` +
      `💰 *Total:* ${formatMoney(sale.total)}\n\n` +
      `Contribuyente Régimen RIMPE - Negocio Popular.`
    );

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const formattedDate = new Date(sale.date).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedTime = new Date(sale.date).toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <style>{`
        @media print {
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .fixed {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          ${
            ticketFormat === 'THERMAL'
              ? `
            @page {
              size: 80mm auto !important;
              margin: 0 !important;
            }
            #printable-sales-note {
              width: 76mm !important;
              max-width: 76mm !important;
              min-width: 76mm !important;
              margin: 0 auto !important;
              padding: 2mm 1.5mm !important;
              box-shadow: none !important;
              border: none !important;
              font-size: 10.5px !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
          `
              : `
            @page {
              size: A4 portrait !important;
              margin: 6mm 6mm !important;
            }
            #printable-sales-note {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
          `
          }
        }
      `}</style>

      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-[#25252E] flex items-center justify-between bg-[#121215] shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Nota de Venta RIMPE · {sale.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#18181D] border border-[#2B2B36] rounded-xl p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTicketFormat('THERMAL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  ticketFormat === 'THERMAL'
                    ? 'bg-[#FF3366] text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Térmico 80mm
              </button>
              <button
                type="button"
                onClick={() => setTicketFormat('A4')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  ticketFormat === 'A4'
                    ? 'bg-[#FF3366] text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                A4
              </button>
            </div>

            <button
              onClick={handleWhatsAppShare}
              className="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
              title="Compartir por WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(255,51,102,0.3)]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0E0E11] flex justify-center">
          <div
            id="printable-sales-note"
            className={`bg-white text-neutral-900 rounded-lg shadow-xl font-sans transition-all ${
              ticketFormat === 'THERMAL'
                ? 'w-[320px] p-4 text-[11px] leading-tight'
                : 'w-full max-w-[580px] p-6 text-xs'
            }`}
          >
            {/* Header / Studio Information */}
            <div className="text-center pb-3 border-b border-dashed border-neutral-300">
              <h1 className="font-black text-sm uppercase tracking-wide text-black">
                {settings.nombreComercial || settings.studioName}
              </h1>
              <p className="text-[10px] text-neutral-600 font-medium">
                {settings.razonSocial || 'DEVOLUTION INK TATTOO STUDIO S.A.S.'}
              </p>
              <p className="font-mono text-[10px] text-neutral-800 font-bold mt-0.5">
                R.U.C.: {settings.ruc || settings.taxId || '—'}
              </p>
              <p className="text-[10px] text-neutral-600">
                {settings.dirMatriz || settings.address || 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito'}
              </p>
              <p className="text-[9px] font-bold text-amber-700 uppercase mt-1">
                CONTRIBUYENTE RÉGIMEN RIMPE - NEGOCIO POPULAR
              </p>
            </div>

            {/* Document Title Banner */}
            <div className="py-2.5 my-2 border-y-2 border-neutral-800 text-center bg-neutral-100">
              <span className="font-black text-xs uppercase tracking-wider block">
                NOTA DE VENTA
              </span>
              <span className="font-mono font-bold text-xs block text-black">
                N° {sale.invoiceNumber}
              </span>
            </div>

            {/* Datos del Cliente y Emisión */}
            <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Fecha Emisión:</span>
                <span className="font-mono font-bold">{formattedDate} - {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Cliente:</span>
                <span className="font-bold text-right truncate ml-2">{sale.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Cédula / RUC:</span>
                <span className="font-mono font-bold">{sale.clientDni || '9999999999999'}</span>
              </div>
              {sale.clientPhone && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-semibold">Teléfono:</span>
                  <span className="font-mono">{sale.clientPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Atendido por:</span>
                <span className="font-medium">{sale.artistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Forma de Pago:</span>
                <span className="font-bold uppercase">
                  {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : sale.paymentMethod === 'transfer' ? 'Transferencia' : 'Mixto'}
                </span>
              </div>
            </div>

            {/* Detalle del Producto o Servicio */}
            <div className="py-3 border-b border-dashed border-neutral-300 space-y-2">
              <div className="flex justify-between font-bold text-[10px] text-neutral-500 uppercase border-b border-neutral-200 pb-1">
                <span>Descripción</span>
                <span>Total</span>
              </div>
              {saleLines(sale).map((l, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <div className="pr-2">
                    <span className="font-bold block text-black">{l.description}</span>
                    <span className="text-[9px] text-neutral-500 capitalize">
                      {l.category} · Cant: {l.quantity} × {formatMoney(l.unitPrice)}
                      {l.discount > 0 ? ` · desc. ${formatMoney(l.discount)}` : ''}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-black shrink-0">{formatMoney(l.base + l.taxAmount)}</span>
                </div>
              ))}
            </div>

            {/* Total (Sin desglose de IVA) */}
            <div className="py-3 border-b-2 border-neutral-800 space-y-1 text-[11px]">
              <div className="flex justify-between font-black text-sm text-black">
                <span>VALOR TOTAL A PAGAR:</span>
                <span className="font-mono">{formatMoney(sale.total)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-neutral-500 pt-0.5">
                <span>Importe Pagado Ahora:</span>
                <span className="font-mono font-bold">{formatMoney(sale.amountPaidNow)}</span>
              </div>
            </div>

            {/* Leyenda Legal SRI */}
            <div className="pt-3 text-center text-[9px] text-neutral-600 space-y-1">
              <p className="font-bold text-amber-800">
                NOTA DE VENTA - RÉGIMEN RIMPE
              </p>
              <p className="text-neutral-500">
                Documento emitido sin desglose de IVA conforme a la normativa del Servicio de Rentas Internas (SRI) del Ecuador.
              </p>
              <p className="italic text-neutral-400 pt-1">
                ¡Gracias por tu preferencia en Devolution Ink Tattoo Studio!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

