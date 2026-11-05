import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  FileText,
  Building2,
  CheckCircle2,
  CreditCard,
  User,
  Sparkles,
  ArrowRight,
  Receipt,
  Download,
} from 'lucide-react';
import { SaleRecord } from '../../types';
import { useStudio } from '../../context/StudioContext';
import { SriBarcodeSvg } from '../common/SriBarcodeSvg';
import { generateSriClaveAcceso } from '../../utils/sriCalculations';
import { SRI_SIMULATION_MODE } from '../../utils/sriCalculations';

interface ReceiptModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
  initialFormat?: 'THERMAL' | 'A4';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, initialFormat = 'THERMAL' }) => {
  const { settings, formatMoney } = useStudio();
  const [ticketFormat, setTicketFormat] = useState<'THERMAL' | 'A4'>(initialFormat);

  useEffect(() => {
    setTicketFormat(initialFormat);
  }, [initialFormat, sale?.id]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Formatted Sequential Number (001-001-000000001)
  const fullInvoiceNumber = useMemo(() => {
    if (!sale) return '';
    const digits = sale.invoiceNumber.replace(/\D/g, '');
    const sec = (digits || '1').padStart(9, '0').slice(-9);
    const estab = (settings.codigoEstablecimiento || '001').padStart(3, '0').slice(-3);
    const pto = (settings.puntoEmision || '001').padStart(3, '0').slice(-3);
    return `${estab}-${pto}-${sec}`;
  }, [sale?.invoiceNumber, settings.codigoEstablecimiento, settings.puntoEmision]);

  // Official SRI 49-digit access key
  const claveAccesoCalculada = useMemo(() => {
    if (!sale) return '';
    try {
      const estab = (settings.codigoEstablecimiento || '001').padStart(3, '0').slice(-3);
      const pto = (settings.puntoEmision || '001').padStart(3, '0').slice(-3);
      const sec = (sale.invoiceNumber.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9);
      const rucLimpio = (settings.ruc || settings.taxId || '1790012345001')
        .replace(/\D/g, '')
        .padEnd(13, '0')
        .slice(0, 13);

      return generateSriClaveAcceso({
        fechaEmision: sale.date || new Date(),
        tipoComprobante: '01',
        ruc: rucLimpio,
        ambiente: settings.ambiente === '2' || settings.ambiente === 'PRODUCCION' ? '2' : '1',
        serie: `${estab}${pto}`,
        secuencial: sec,
        codigoNumerico: '12345678',
        tipoEmision: '1',
      });
    } catch {
      return '0101202601179001234500110010010000000011234567812';
    }
  }, [sale, settings]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  // SRI Totals calculation
  const subtotalSinImpuestos = Math.max(0, sale.subtotal - sale.discount);
  const isVatApplicable = (sale.taxRate || 0) > 0;
  const subtotal15 = isVatApplicable ? subtotalSinImpuestos : 0;
  const subtotal0 = isVatApplicable ? 0 : subtotalSinImpuestos;
  const taxAmount = sale.taxAmount || 0;
  const totalAmount = sale.total || 0;

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'tattoo':
        return 'Tatuaje Artístico Profesional';
      case 'piercing':
        return 'Body Piercing Aséptico / Perforación';
      case 'jewelry':
        return 'Joyería Piercing Grado Implante';
      case 'aftercare':
        return 'Cuidado Posterior & Bioseguridad';
      default:
        return 'Servicio de Estudio';
    }
  };

  const getPaymentMethodLabel = (pm: string) => {
    switch (pm) {
      case 'cash':
        return '01 - SIN UTILIZACIÓN DEL SISTEMA FINANCIERO (EFECTIVO)';
      case 'card':
        return '19 - TARJETA DE CRÉDITO / DÉBITO';
      case 'transfer':
        return '20 - OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO (TRANSFERENCIA)';
      case 'split':
        return '16 - PAGO MIXTO / FRACCIONADO';
      default:
        return '01 - EFECTIVO';
    }
  };

  const formattedDate = new Date(sale.date).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedTime = new Date(sale.date).toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Dynamic Print Styles for exact 80mm continuous thermal roll or A4 portrait */}
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
            #printable-receipt {
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
            #printable-receipt {
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

      {/* Main Dialog Box */}
      <div
        className={`bg-[#17171C] border border-[#2B2B36] rounded-3xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[95vh] ${
          ticketFormat === 'A4' ? 'max-w-4xl' : 'max-w-lg'
        }`}
      >
        {/* =========================================================================
            HEADER BAR (no-print) - Clean 2-Tier Toolbar matching Ferretería Daynet
            ========================================================================= */}
        <div className="bg-[#121215] border-b border-[#25252E] no-print">
          {/* Level 1: Identity, SRI Badge, Format Switch & Close Button */}
          <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#1E1E26]">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-[#FF3366]/15 border border-[#FF3366]/30 text-[#FF3366] rounded-xl shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                    Comprobante Electrónico SRI
                  </h3>
                  <span className="font-mono text-xs font-bold text-[#FF3366] bg-[#FF3366]/10 px-2 py-0.5 rounded-md border border-[#FF3366]/20">
                    {fullInvoiceNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{SRI_SIMULATION_MODE ? 'SRI SIMULADO · SIN VALIDEZ' : 'SRI AUTORIZADO'}</span>
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {formattedDate} {formattedTime} • Cliente: <strong className="text-neutral-200">{sale.clientName}</strong>
                </p>
              </div>
            </div>

            {/* Format Toggle & Quick Header Close */}
            <div className="flex items-center gap-2">
              {/* Toggle Format: Ticket 80mm vs Factura A4 */}
              <div className="bg-[#1A1A22] p-1 rounded-xl border border-[#2B2B38] flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setTicketFormat('THERMAL')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ticketFormat === 'THERMAL'
                      ? 'bg-gradient-to-r from-[#FF3366] to-[#E62557] text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Formato de rollo continuo 80mm para impresoras térmicas POS"
                >
                  Ticket 80mm
                </button>
                <button
                  type="button"
                  onClick={() => setTicketFormat('A4')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ticketFormat === 'A4'
                      ? 'bg-gradient-to-r from-[#FF3366] to-[#E62557] text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Formato oficial RIDE tamaño A4 para imprimir en hoja bond o guardar en PDF"
                >
                  Factura A4 (RIDE)
                </button>
              </div>

              {/* Botón Imprimir Rápido en Header */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(255,51,102,0.3)] cursor-pointer"
                title="Imprimir documento"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              {/* Botón Cerrar en Header */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-[#25252E] transition-colors cursor-pointer"
                title="Cerrar ventana (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE DOCUMENT VIEWPORT
            ========================================================================= */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-neutral-900/60 custom-scrollbar">
          {ticketFormat === 'A4' ? (
            /* =========================================================================
               FORMATO FACTURA OFICIAL A4 (RIDE SRI ECUADOR) - MODELO FERRETERÍA DAYNET
               ========================================================================= */
            <div
              id="printable-receipt"
              className="ride-a4 bg-white text-black p-4 sm:p-6 mx-auto max-w-[840px] font-sans text-xs rounded-xl shadow-xl border border-neutral-300"
            >
              {/* TOP ROW: 2 Columns (Emisor Left + SRI Box Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
                {/* Left Column: Emisor Box & Logo */}
                <div className="flex flex-col justify-between space-y-2">
                  {/* Brand / Logo */}
                  <div className="flex items-center justify-center min-h-[55px] max-h-[85px] pb-1">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="max-h-20 max-w-[200px] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-[120px] h-[70px] bg-black rounded-xl flex flex-col items-center justify-center p-2 text-white shadow-xs relative overflow-hidden border border-neutral-800 select-none">
                        <span className="font-extrabold text-[12px] tracking-wider text-center uppercase leading-tight text-[#FF3366]">
                          DEVOLUTION INK
                        </span>
                        <span className="text-[8px] text-neutral-400 uppercase tracking-widest mt-0.5">
                          TATTOO STUDIO
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Emisor Box */}
                  <div className="border border-black rounded-2xl p-3 flex-1 text-[10.5px] leading-tight flex flex-col justify-between bg-white">
                    <div>
                      <h2 className="font-bold text-[13px] text-black leading-snug tracking-tight">
                        {settings.razonSocial || settings.studioName || 'DEVOLUTION INK TATTOO STUDIO'}
                      </h2>
                      <h3 className="font-bold text-[12px] text-black leading-snug tracking-tight mt-0.5">
                        {settings.nombreComercial || settings.studioName || 'DEVOLUTION INK QUICENTRO'}
                      </h3>
                    </div>

                    <div className="space-y-1 mt-2 text-[10px]">
                      <div>
                        <span className="text-black font-semibold">Dirección Matriz:</span>{' '}
                        <span className="text-neutral-900">
                          {settings.dirMatriz || settings.address || 'C.C. Quicentro Shopping, Local 240, Quito - Ecuador'}
                        </span>
                      </div>
                      <div>
                        <span className="text-black font-semibold">Dirección Sucursal:</span>{' '}
                        <span className="text-neutral-900">
                          {settings.dirEstablecimiento || settings.address || 'C.C. Quicentro Shopping, Local 240, Quito - Ecuador'}
                        </span>
                      </div>
                      {(settings.ciudad || settings.provincia || settings.pais) && (
                        <div>
                          <span className="text-black font-semibold">Ubicación:</span>{' '}
                          <span className="text-neutral-900 uppercase">
                            {[settings.parroquia, settings.ciudad, settings.provincia, settings.pais].filter(Boolean).join(' - ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 text-[10px] text-neutral-900 space-y-0.5 font-normal">
                      <div>Teléfono: {settings.phone || '0991234567'}</div>
                      <div>Email: {settings.email || 'info@devolutionink.ec'}</div>
                    </div>

                    <div className="mt-2 text-[10px] space-y-0.5 pt-1 border-t border-neutral-200">
                      <div className="font-bold text-black">
                        OBLIGADO A LLEVAR CONTABILIDAD: {settings.obligadoContabilidad || 'NO'}
                      </div>
                      <div className="font-bold text-black uppercase">
                        CONTRIBUYENTE RÉGIMEN{' '}
                        {settings.regimenTributario
                          ? settings.regimenTributario.replace('_', ' ')
                          : 'RIMPE'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: SRI Box with Barcode */}
                <div className="border border-black rounded-2xl p-3.5 flex flex-col justify-between text-[10.5px] bg-white">
                  <div>
                    <div className="text-[14px] font-bold text-black tracking-tight">
                      R.U.C.: <span className="font-bold">{settings.ruc || settings.taxId || '1790012345001'}</span>
                    </div>
                    <div className="text-[17px] font-bold text-black tracking-normal mt-1 uppercase">
                      FACTURA
                    </div>
                    <div className="text-[12.5px] font-bold text-black mt-0.5 mb-2">
                      No. {fullInvoiceNumber}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-black uppercase tracking-tight">
                      NÚMERO DE AUTORIZACIÓN:
                    </div>
                    {SRI_SIMULATION_MODE && (
                      <div className="text-[9px] font-bold text-red-700 uppercase">
                        Documento simulado · sin validez tributaria
                      </div>
                    )}
                    <div className="text-[9px] font-mono text-neutral-900 leading-tight mt-0.5 mb-2 select-all break-all tracking-normal">
                      {claveAccesoCalculada}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-black uppercase tracking-tight">
                      FECHA Y HORA DE AUTORIZACIÓN:
                    </div>
                    <div className="text-[10px] text-neutral-900 mt-0.5 mb-2 font-normal">
                      {formattedDate} {formattedTime}
                    </div>
                  </div>

                  <div className="space-y-0.5 mb-2 text-[10px]">
                    <div className="flex items-center">
                      <span className="font-bold text-black w-24 uppercase">AMBIENTE:</span>
                      <span className="uppercase text-neutral-900 font-normal">
                        {settings.ambiente === '2' || settings.ambiente === 'PRODUCCION' ? 'PRODUCCIÓN' : 'PRUEBAS'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-black w-24 uppercase">EMISIÓN:</span>
                      <span className="uppercase text-neutral-900 font-normal">NORMAL</span>
                    </div>
                  </div>

                  {/* Code 128 Barcode with 49-digit access key */}
                  <div className="pt-1 w-full flex flex-col items-center">
                    <SriBarcodeSvg value={claveAccesoCalculada} height={38} className="w-full max-w-[340px]" />
                    <span className="font-mono text-[8.5px] tracking-wider text-black font-semibold mt-0.5 select-all text-center break-all">
                      {claveAccesoCalculada}
                    </span>
                  </div>
                </div>
              </div>

              {/* CLIENT / RECEPTOR SECTION */}
              <div className="border border-black rounded-xl p-2.5 bg-white mt-2.5 text-[11px] space-y-1">
                <div className="grid grid-cols-[200px_1fr] items-center">
                  <span className="text-black font-semibold">Razón Social / Nombres y Apellidos:</span>
                  <span className="font-bold uppercase text-black">{sale.clientName}</span>
                </div>
                <div className="grid grid-cols-[200px_1fr] items-center">
                  <span className="text-black font-semibold">Identificación:</span>
                  <span className="font-bold text-black">{sale.clientDni || '9999999999999'}</span>
                </div>
                <div className="grid grid-cols-[200px_1fr] items-center">
                  <span className="text-black font-semibold">Fecha de Emisión:</span>
                  <span className="text-black">{formattedDate}</span>
                </div>
                <div className="grid grid-cols-[200px_1fr] items-center">
                  <span className="text-black font-semibold">Dirección:</span>
                  <span className="text-black">{settings.address || 'Quito - Ecuador'}</span>
                </div>
                {sale.clientPhone && (
                  <div className="grid grid-cols-[200px_1fr] items-center">
                    <span className="text-black font-semibold">Teléfono:</span>
                    <span className="text-black">{sale.clientPhone}</span>
                  </div>
                )}
              </div>

              {/* PRODUCTS & SERVICES TABLE */}
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full border border-black border-collapse text-[10px] bg-white">
                  <thead>
                    <tr className="border-b border-black font-bold text-black text-center bg-neutral-100">
                      <th className="border-r border-black p-1.5">Cod. Principal</th>
                      <th className="border-r border-black p-1.5">Cod. Auxiliar</th>
                      <th className="border-r border-black p-1.5">Cantidad</th>
                      <th className="border-r border-black p-1.5 text-center">Descripción</th>
                      <th className="border-r border-black p-1.5">Detalle Adicional</th>
                      <th className="border-r border-black p-1.5">Precio Unitario</th>
                      <th className="border-r border-black p-1.5">Subsidio</th>
                      <th className="border-r border-black p-1.5">Precio sin Subsidio</th>
                      <th className="border-r border-black p-1.5">Descuento</th>
                      <th className="p-1.5">Precio Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black text-black">
                      <td className="border-r border-black p-1.5 text-center font-mono">0001</td>
                      <td className="border-r border-black p-1.5 text-center font-mono">
                        {sale.serviceCategory.toUpperCase()}
                      </td>
                      <td className="border-r border-black p-1.5 text-center font-medium">
                        {(sale.pieces || 1).toFixed(2)}
                      </td>
                      <td className="border-r border-black p-1.5 text-left font-medium">
                        {sale.serviceName}
                        {sale.hours ? ` (${sale.hours} hrs)` : ''}
                      </td>
                      <td className="border-r border-black p-1.5 text-center font-bold text-[9px]">
                        IVA {sale.taxRate || 15}%
                      </td>
                      <td className="border-r border-black p-1.5 text-right font-mono">
                        ${((sale.subtotal + sale.discount) / (sale.pieces || 1)).toFixed(2)}
                      </td>
                      <td className="border-r border-black p-1.5 text-center font-mono">0.00</td>
                      <td className="border-r border-black p-1.5 text-center font-mono">0.00</td>
                      <td className="border-r border-black p-1.5 text-right font-mono">
                        ${(sale.discount || 0).toFixed(2)}
                      </td>
                      <td className="p-1.5 text-right font-bold font-mono">
                        ${sale.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* BOTTOM SECTION: Additional Info (Left) + Totals Table (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2.5 items-start">
                {/* Left Column: Información Adicional y Formas de Pago */}
                <div className="space-y-2">
                  <div className="border border-black rounded-xl p-2.5 text-[10px] space-y-1">
                    <div className="font-bold uppercase text-black mb-1 border-b border-neutral-200 pb-0.5">
                      Información Adicional
                    </div>
                    <div>
                      <span className="font-semibold text-black">Artista / Técnico:</span>{' '}
                      <span>{sale.artistName}</span>
                    </div>
                    {sale.clientEmail && (
                      <div>
                        <span className="font-semibold text-black">Email Cliente:</span>{' '}
                        <span>{sale.clientEmail}</span>
                      </div>
                    )}
                    {sale.notes && (
                      <div>
                        <span className="font-semibold text-black">Observaciones:</span>{' '}
                        <span className="italic">{sale.notes}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-black">Ficha Sanitaria:</span>{' '}
                      <span className="text-emerald-700 font-medium">
                        {sale.consentFormSigned ? 'Consentimiento Informado Firmado' : 'Ficha Médica Simplificada'}
                      </span>
                    </div>
                  </div>

                  {/* Forma de Pago */}
                  <div className="border border-black rounded-xl overflow-hidden text-[10px]">
                    <div className="bg-neutral-100 p-1.5 font-bold border-b border-black text-black uppercase">
                      Forma de Pago
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>{getPaymentMethodLabel(sale.paymentMethod)}</span>
                        <span className="font-bold font-mono">${sale.total.toFixed(2)}</span>
                      </div>
                      {sale.depositAmount > 0 && (
                        <div className="flex justify-between text-neutral-600">
                          <span>Seña / Anticipo Deducido:</span>
                          <span className="font-mono">-${sale.depositAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-neutral-800 font-bold border-t border-neutral-200 pt-0.5">
                        <span>Total Pagado en Cabina:</span>
                        <span className="font-mono text-emerald-700">${sale.amountPaidNow.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: SRI Totals Table */}
                <div className="border border-black rounded-xl overflow-hidden">
                  <table className="w-full text-[10px] border-collapse bg-white">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">SUBTOTAL 15%</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">
                          ${subtotal15.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">SUBTOTAL 5%</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">$0.00</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">SUBTOTAL 0%</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">
                          ${subtotal0.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">SUBTOTAL NO OBJETO DE IVA</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">$0.00</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">SUBTOTAL EXENTO DE IVA</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">$0.00</td>
                      </tr>
                      <tr className="border-b border-black font-semibold bg-neutral-50">
                        <td className="py-0.5 px-2 border-r border-black text-black">SUBTOTAL SIN IMPUESTOS</td>
                        <td className="py-0.5 px-2 text-right font-bold font-mono text-black">
                          ${subtotalSinImpuestos.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">TOTAL DESCUENTO</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">
                          ${(sale.discount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">ICE</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">$0.00</td>
                      </tr>
                      <tr className="border-b border-black font-semibold">
                        <td className="py-0.5 px-2 border-r border-black text-black">IVA {sale.taxRate || 15}%</td>
                        <td className="py-0.5 px-2 text-right font-bold font-mono text-black">
                          ${taxAmount.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 border-r border-black text-black">PROPINA</td>
                        <td className="py-0.5 px-2 text-right font-medium font-mono text-black">
                          ${(sale.tipAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-black font-bold text-[12px] bg-neutral-100">
                        <td className="py-1 px-2 border-r border-black text-black font-bold">VALOR TOTAL</td>
                        <td className="py-1 px-2 text-right font-bold font-mono text-black">
                          ${totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
               FORMATO TICKET TÉRMICO 80MM (ROLLO POS) - MODELO FERRETERÍA DAYNET
               ========================================================================= */
            <div
              id="printable-receipt"
              className="ticket-80mm bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-xl mx-auto w-full max-w-[340px] font-mono text-[11px] leading-snug border border-slate-300"
            >
              {/* Studio Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
                {settings.logoUrl && (
                  <div className="flex justify-center pb-1.5">
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="max-h-12 max-w-[140px] object-contain"
                    />
                  </div>
                )}
                <h2 className="font-extrabold text-sm uppercase tracking-tight text-neutral-900">
                  {settings.studioName || 'DEVOLUTION INK TATTOO STUDIO'}
                </h2>
                <p className="text-[10px] text-neutral-600">
                  {settings.address || 'C.C. Quicentro Shopping, Local 240, Quito - Ecuador'}
                </p>
                {(settings.ciudad || settings.provincia || settings.pais) && (
                  <p className="text-[9.5px] text-neutral-500 font-semibold uppercase">
                    {[settings.ciudad, settings.provincia, settings.pais].filter(Boolean).join(' - ')}
                  </p>
                )}
                <p className="text-[10px] text-neutral-600">
                  RUC: <span className="font-bold">{settings.ruc || settings.taxId || '1790012345001'}</span>
                </p>
                <p className="text-[10px] text-neutral-600">Tel: {settings.phone || '0991234567'}</p>
                <p className="text-[9px] text-neutral-500 uppercase">
                  OBLIGADO A LLEVAR CONTABILIDAD: {settings.obligadoContabilidad || 'NO'}
                </p>
                <p className="text-[9px] text-neutral-500 uppercase font-bold">
                  CONTRIBUYENTE RÉGIMEN {settings.regimenTributario ? settings.regimenTributario.replace('_', ' ') : 'RIMPE'}
                </p>
              </div>

              {/* Document Identity */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
                <p className="font-bold text-center text-xs tracking-wider">*** FACTURA ELECTRÓNICA ***</p>
                <p className="font-extrabold text-center text-xs text-neutral-900">No. {fullInvoiceNumber}</p>
                <div className="pt-1 space-y-0.5 text-[10px]">
                  <p>
                    <span className="text-neutral-500">FECHA:</span> {formattedDate} {formattedTime}
                  </p>
                  <p>
                    <span className="text-neutral-500">CLIENTE:</span>{' '}
                    <strong className="text-neutral-900">{sale.clientName.toUpperCase()}</strong>
                  </p>
                  <p>
                    <span className="text-neutral-500">RUC/CI:</span>{' '}
                    <strong className="text-neutral-900">{sale.clientDni || '9999999999999'}</strong>
                  </p>
                  {sale.clientPhone && (
                    <p>
                      <span className="text-neutral-500">TELÉFONO:</span> {sale.clientPhone}
                    </p>
                  )}
                  <p>
                    <span className="text-neutral-500">ARTISTA:</span>{' '}
                    <strong className="text-neutral-900">{sale.artistName}</strong>
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
                <div className="flex justify-between text-[10px] font-bold pb-1 border-b border-dashed border-slate-400 text-neutral-700">
                  <span className="w-8">CANT</span>
                  <span className="flex-1">DESCRIPCION</span>
                  <span className="w-14 text-right">V.UNI</span>
                  <span className="w-14 text-right">TOTAL</span>
                </div>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-900 truncate flex-1">{sale.serviceName}</p>
                    <span className="text-[9px] font-semibold text-neutral-600 ml-1">
                      IVA {sale.taxRate || 15}%
                    </span>
                  </div>
                  <div className="flex text-[10px] text-neutral-700">
                    <span className="w-8">{(sale.pieces || 1).toFixed(0)}</span>
                    <span className="flex-1 text-neutral-500 truncate">{getCategoryLabel(sale.serviceCategory)}</span>
                    <span className="w-14 text-right">
                      ${((sale.subtotal + sale.discount) / (sale.pieces || 1)).toFixed(2)}
                    </span>
                    <span className="w-14 text-right font-bold text-neutral-900">
                      ${sale.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 font-bold text-[10.5px]">
                {subtotal15 > 0 && (
                  <div className="flex justify-between">
                    <span>SUBTOTAL 15%:</span>
                    <span>${subtotal15.toFixed(2)}</span>
                  </div>
                )}
                {subtotal0 > 0 && (
                  <div className="flex justify-between">
                    <span>SUBTOTAL 0%:</span>
                    <span>${subtotal0.toFixed(2)}</span>
                  </div>
                )}
                {sale.discount > 0 && (
                  <div className="flex justify-between text-neutral-600 font-normal">
                    <span>DESCUENTO:</span>
                    <span>-${sale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-normal text-neutral-700">
                  <span>SUBTOTAL SIN IMPUESTOS:</span>
                  <span>${subtotalSinImpuestos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA {sale.taxRate || 15}%:</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                {sale.tipAmount > 0 && (
                  <div className="flex justify-between text-neutral-600 font-normal">
                    <span>PROPINA:</span>
                    <span>+${sale.tipAmount.toFixed(2)}</span>
                  </div>
                )}
                {sale.depositAmount > 0 && (
                  <div className="flex justify-between text-neutral-600 font-normal">
                    <span>ANTICIPO / SEÑA DEDUCIDA:</span>
                    <span>-${sale.depositAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1.5 border-t border-slate-400 font-black text-neutral-900">
                  <span>VALOR TOTAL:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs pt-0.5 text-emerald-800 font-black">
                  <span>IMPORTE COBRADO:</span>
                  <span>${sale.amountPaidNow.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <p>
                  <span className="text-neutral-500">FORMA PAGO:</span>{' '}
                  <span className="font-bold uppercase">
                    {sale.paymentMethod === 'cash'
                      ? 'Efectivo'
                      : sale.paymentMethod === 'card'
                      ? 'Tarjeta'
                      : sale.paymentMethod === 'transfer'
                      ? 'Transferencia'
                      : 'Mixto'}
                  </span>
                </p>
                {sale.remainingBalance > 0 && (
                  <p className="text-red-600 font-bold">
                    SALDO PENDIENTE: ${sale.remainingBalance.toFixed(2)}
                  </p>
                )}
              </div>

              {/* SRI Access Key & Barcode */}
              <div className="py-3 text-center space-y-1.5">
                <p className="text-[9px] font-bold text-neutral-600 uppercase">
                  CLAVE DE ACCESO / AUTORIZACIÓN SRI
                </p>
                <div className="flex justify-center">
                  <SriBarcodeSvg value={claveAccesoCalculada} height={35} className="w-full max-w-[280px]" />
                </div>
                <p className="text-[8px] font-mono text-neutral-800 tracking-wider break-all leading-tight">
                  {claveAccesoCalculada}
                </p>
              </div>

              {/* Sanitary Statement & Footer */}
              <div className="pt-2 border-t border-dashed border-slate-400 text-center space-y-1 text-[9.5px] text-neutral-600">
                <p className="font-semibold text-emerald-800">
                  {sale.consentFormSigned
                    ? '✓ Consentimiento informado y ficha médica sanitaria registrada.'
                    : '✓ Ficha médica simplificada del cliente.'}
                </p>
                <p className="text-[9px] text-neutral-500 leading-snug">
                  {settings.receiptFooterMessage ||
                    '¡Gracias por confiar en nosotros! Sigue estrictamente las recomendaciones de cuidado y cicatrización.'}
                </p>
                <p className="text-[8px] text-neutral-400 pt-1">
                  Valide su comprobante electrónico en www.sri.gob.ec
                </p>
              </div>
            </div>
          )}

          {/* Internal Studio Commission Audit (no-print) */}
          <div className="max-w-xl mx-auto mt-4 p-3.5 bg-[#121215] border border-[#272730] rounded-2xl no-print text-xs">
            <div className="text-[11px] font-bold text-[#FF3366] mb-2 flex items-center justify-between">
              <span>Liquidación Interna de Comisión (Solo visible para administración)</span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Artista {sale.artistCommissionPercent}% / Estudio {100 - sale.artistCommissionPercent}%
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

        {/* =========================================================================
            BOTTOM STICKY ACTION BAR (no-print) - ALWAYS ACCESSIBLE & HIGHLY VISIBLE
            ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#121215] border-t border-[#25252E] flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              Listo para imprimir en formato:{' '}
              <strong className="text-white">
                {ticketFormat === 'A4' ? 'Factura A4 (RIDE Oficial SRI)' : 'Ticket Térmico POS 80mm'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* BOTÓN CERRAR - Grande y destacado */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1A1A22] hover:bg-[#252530] text-neutral-300 hover:text-white font-semibold text-xs border border-[#2B2B38] transition-all cursor-pointer"
            >
              Cerrar Ventana
            </button>

            {/* BOTÓN IMPRIMIR - Botón primario de acción con alta visibilidad */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#E62557] hover:to-[#CC1F4B] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.4)] transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir {ticketFormat === 'A4' ? 'Factura A4' : 'Ticket'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
