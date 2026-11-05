import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Share2 } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { CreditNoteRecord } from '../../types';
import { SriBarcodeSvg } from '../common/SriBarcodeSvg';
import { SRI_SIMULATION_MODE } from '../../utils/sriCalculations';

interface CreditNotePrintModalProps {
  creditNote: CreditNoteRecord | null;
  onClose: () => void;
  initialFormat?: 'THERMAL' | 'A4';
}

export const CreditNotePrintModal: React.FC<CreditNotePrintModalProps> = ({
  creditNote,
  onClose,
  initialFormat = 'THERMAL',
}) => {
  const { settings, formatMoney } = useStudio();
  const [ticketFormat, setTicketFormat] = useState<'THERMAL' | 'A4'>(initialFormat);

  if (!creditNote) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (creditNote.clientPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `¡Hola ${creditNote.clientName}! 👋 Te compartimos tu *Nota de Crédito Electrónica oficial* emitida por *${settings.studioName}*:\n\n` +
      `📄 *N° Comprobante:* ${creditNote.creditNoteNumber}\n` +
      `📑 *Factura Modificada:* ${creditNote.affectedInvoiceNumber}\n` +
      `📅 *Fecha:* ${new Date(creditNote.date).toLocaleDateString()}\n` +
      `📝 *Motivo:* ${creditNote.reasonDescription}\n` +
      `💰 *Total Acreditado:* ${formatMoney(creditNote.total)}\n` +
      `🔑 *Clave SRI:* ${creditNote.sriAccessKey || 'En trámite'}\n\n` +
      `Documento electrónico autorizado por el SRI del Ecuador.`
    );

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const formattedDate = new Date(creditNote.date).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedTime = new Date(creditNote.date).toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Print Styles */}
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
            #printable-credit-note {
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
            #printable-credit-note {
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

      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-[#25252E] flex items-center justify-between bg-[#121215] shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Nota de Crédito Oficial SRI · {creditNote.creditNoteNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle: 80mm vs A4 */}
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
                RIDE A4
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

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0E0E11] flex justify-center">
          <div
            id="printable-credit-note"
            className={`bg-white text-neutral-900 rounded-lg shadow-xl font-sans transition-all ${
              ticketFormat === 'THERMAL'
                ? 'w-[320px] p-4 text-[11px] leading-tight'
                : 'w-full max-w-[620px] p-6 text-xs'
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
                R.U.C.: {settings.ruc || settings.taxId || '1792847102001'}
              </p>
              <p className="text-[10px] text-neutral-600">
                {settings.dirMatriz || settings.address || 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito'}
              </p>
              <p className="text-[9px] text-neutral-500">
                Contribuyente Régimen General / Obligado a llevar contabilidad
              </p>
            </div>

            {/* Document Title Banner */}
            <div className="py-2.5 my-2 border-y-2 border-neutral-800 text-center bg-neutral-100">
              <span className="font-black text-xs uppercase tracking-wider block">
                NOTA DE CRÉDITO
              </span>
              <span className="font-mono font-bold text-xs block text-black">
                N° {creditNote.creditNoteNumber}
              </span>
            </div>

            {/* Clave de Acceso SRI y Código de Barras */}
            <div className="py-2 border-b border-dashed border-neutral-300 text-center">
              <span className="text-[9px] font-bold text-neutral-600 uppercase block mb-1">
                Clave de Acceso y Autorización SRI:
              </span>
              <div className="flex justify-center my-1">
                <SriBarcodeSvg
                  value={creditNote.sriAccessKey || '0101202604179284710200110010010000000011234567814'}
                  height={34}
                />
              </div>
              <span className="font-mono text-[9px] tracking-tight block select-all break-all text-neutral-800">
                {creditNote.sriAccessKey || '0101202604179284710200110010010000000011234567814'}
              </span>
              <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                {SRI_SIMULATION_MODE ? '⚠ ESTADO: SIMULADO · SIN VALIDEZ TRIBUTARIA' : '✓ ESTADO: AUTORIZADO POR EL SRI'}
              </span>
            </div>

            {/* Datos del Cliente y Comprobante que se Modifica */}
            <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Fecha Emisión:</span>
                <span className="font-mono font-bold">{formattedDate} - {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Cliente:</span>
                <span className="font-bold text-right truncate ml-2">{creditNote.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Cédula / RUC:</span>
                <span className="font-mono font-bold">{creditNote.clientDni || '9999999999999'}</span>
              </div>

              {/* Referencia Cruzada a Factura Modificada */}
              <div className="mt-2 pt-2 border-t border-neutral-200 bg-neutral-50 p-2 rounded">
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-700">Comprobante que Modifica:</span>
                  <span className="font-mono font-bold text-black">Factura {creditNote.affectedInvoiceNumber}</span>
                </div>
                <div className="flex justify-between text-[9px] text-neutral-500 mt-0.5">
                  <span>Fecha Emisión Factura:</span>
                  <span className="font-mono">{creditNote.affectedInvoiceDate}</span>
                </div>
                <div className="text-[9px] text-neutral-700 mt-1">
                  <strong>Razón de Modificación:</strong> {creditNote.reasonDescription}
                </div>
              </div>
            </div>

            {/* Totales y Liquidación */}
            <div className="py-3 border-b-2 border-neutral-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal 15% (Base Gravada):</span>
                <span className="font-mono font-semibold">{formatMoney(creditNote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal 0% (Tarifa Cero):</span>
                <span className="font-mono font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>IVA {creditNote.taxRate || 15}% Revertido:</span>
                <span className="font-mono font-semibold">{formatMoney(creditNote.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1.5 border-t border-neutral-300 text-black">
                <span>VALOR TOTAL ACREDITADO:</span>
                <span className="font-mono">{formatMoney(creditNote.total)}</span>
              </div>
            </div>

            {/* Footer Legal SRI */}
            <div className="pt-3 text-center text-[9px] text-neutral-500 space-y-0.5">
              <p className="font-semibold text-neutral-700">
                Documento Electrónico Generado según Resolución SRI
              </p>
              <p>Descarga tus comprobantes en https://sri.gob.ec</p>
              <p className="italic">¡Gracias por tu confianza en Devolution Ink!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

