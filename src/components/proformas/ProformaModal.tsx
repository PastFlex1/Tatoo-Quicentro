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
  Phone,
  Mail,
  User,
  Instagram,
} from 'lucide-react';
import { Proforma } from '../../types';
import { useStudio } from '../../context/StudioContext';

interface ProformaModalProps {
  proforma: Proforma | null;
  onClose: () => void;
  onConvertToAppointment?: (proforma: Proforma) => void;
}

export const ProformaModal: React.FC<ProformaModalProps> = ({
  proforma,
  onClose,
  onConvertToAppointment,
}) => {
  const { settings, formatMoney } = useStudio();

  if (!proforma) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (proforma.clientPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `¡Hola ${proforma.clientName}! 👋 Te compartimos tu Proforma / Cotización oficial de *${settings.studioName}*:\n\n` +
      `📄 *N° Proforma:* ${proforma.proformaNumber}\n` +
      `🎨 *Servicio:* ${proforma.serviceName}\n` +
      `👤 *Artista:* ${proforma.artistName}\n` +
      `📐 *Zona / Tamaño:* ${proforma.bodyPlacement || 'A convenir'} (${proforma.sizeApprox || 'Estándar'})\n` +
      `💰 *Valor Estimado:* ${formatMoney(proforma.total)}\n` +
      `🔒 *Anticipo / Seña Sugerida:* ${formatMoney(proforma.suggestedDeposit)}\n` +
      `⏳ *Válida hasta:* ${proforma.validUntil}\n\n` +
      `Para confirmar tu cita, contáctanos o responde a este mensaje para coordinar fecha y abono de seña. ¡Será un placer crear tu pieza!`
    );

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: Proforma['status']) => {
    switch (status) {
      case 'accepted':
        return {
          label: 'Aceptada por Cliente',
          className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        };
      case 'converted':
        return {
          label: 'Convertida en Cita Agendada',
          className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        };
      case 'pending':
        return {
          label: 'Pendiente de Respuesta',
          className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        };
      case 'expired':
        return {
          label: 'Expirada',
          className: 'bg-red-500/15 text-red-400 border border-red-500/30',
        };
      case 'draft':
      default:
        return {
          label: 'Borrador / Cotización Inicial',
          className: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
        };
    }
  };

  const statusBadge = getStatusBadge(proforma.status);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#141417] border border-[#272730] rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col">
        {/* Top Control Bar (Non-printable) */}
        <div className="px-5 py-3.5 border-b border-[#24242A] bg-[#16161B] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Proforma / Cotización Oficial #{proforma.proformaNumber}
            </h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 transition-colors"
              title="Compartir por WhatsApp con el cliente"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/40 hover:bg-[#FF3366]/25 transition-colors"
              title="Imprimir o Exportar PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            {onConvertToAppointment && proforma.status !== 'converted' && (
              <button
                onClick={() => onConvertToAppointment(proforma)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#FF3366] text-white hover:bg-[#e02958] transition-colors shadow-[0_0_12px_rgba(255,51,102,0.3)]"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Agendar Cita</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full border border-[#2D2D38] text-neutral-400 hover:text-white hover:bg-[#202027] flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Content Area (Styled for display & printing) */}
        <div id="printable-proforma" className="p-6 sm:p-8 bg-white text-neutral-900 font-sans text-xs overflow-y-auto max-h-[82vh] print:max-h-none print:p-0 print:overflow-visible">
          {/* Header Studio Brand */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b border-neutral-200 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
                  DI
                </div>
                <h1 className="text-xl font-black uppercase tracking-tight text-neutral-950">
                  {settings.studioName}
                </h1>
              </div>
              <p className="text-neutral-600 mt-1">{settings.address}</p>
              <p className="text-neutral-500 text-[11px]">
                NIF / Tax ID: <span className="font-semibold text-neutral-700">{settings.taxId}</span> · Tel: {settings.phone}
              </p>
              <p className="text-neutral-500 text-[11px]">
                Email: {settings.email} {settings.website && `· Web: ${settings.website}`}
              </p>
              <p className="text-neutral-500 text-[10px] mt-0.5">
                Reg. Sanitario Body Art: <span className="font-mono font-semibold">{settings.healthSanitaryRegistration}</span>
              </p>
            </div>

            <div className="sm:text-right bg-neutral-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-neutral-200 sm:border-none">
              <span className="inline-block px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-neutral-900 text-white rounded-md mb-2">
                PROFORMA / COTIZACIÓN
              </span>
              <div className="font-mono text-base font-bold text-neutral-900">
                {proforma.proformaNumber}
              </div>
              <div className="text-[11px] text-neutral-600 mt-1">
                Fecha Emisión: <span className="font-semibold text-neutral-900">{proforma.date}</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium">
                Válida hasta: <span className="font-semibold">{proforma.validUntil}</span>
              </div>
            </div>
          </div>

          {/* Client & Artist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-neutral-200">
            {/* Client Card */}
            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/80">
              <div className="flex items-center gap-1.5 text-neutral-500 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                <User className="w-3 h-3 text-[#FF3366]" />
                <span>Datos del Cliente</span>
              </div>
              <div className="text-sm font-bold text-neutral-950">{proforma.clientName}</div>
              <div className="mt-1 space-y-0.5 text-neutral-600 text-[11px]">
                {proforma.clientPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    <span>{proforma.clientPhone}</span>
                  </div>
                )}
                {proforma.clientEmail && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-neutral-400" />
                    <span>{proforma.clientEmail}</span>
                  </div>
                )}
                {proforma.clientInstagram && (
                  <div className="flex items-center gap-1.5">
                    <Instagram className="w-3 h-3 text-neutral-400" />
                    <span>{proforma.clientInstagram}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Artist & Technical Card */}
            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/80">
              <div className="flex items-center gap-1.5 text-neutral-500 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3 text-[#FF3366]" />
                <span>Detalles Artísticos & Cabina</span>
              </div>
              <div className="text-sm font-bold text-neutral-950">{proforma.artistName}</div>
              <div className="mt-1 space-y-0.5 text-neutral-600 text-[11px]">
                <div>
                  <span className="text-neutral-500">Categoría:</span>{' '}
                  <span className="font-semibold capitalize text-neutral-800">
                    {proforma.serviceCategory === 'tattoo'
                      ? 'Tatuaje Artístico'
                      : proforma.serviceCategory === 'piercing'
                      ? 'Body Piercing Aséptico'
                      : proforma.serviceCategory === 'jewelry'
                      ? 'Joyería Corporal'
                      : 'Cuidado Posterior'}
                  </span>
                </div>
                {proforma.bodyPlacement && (
                  <div>
                    <span className="text-neutral-500">Ubicación anatómica:</span>{' '}
                    <span className="font-semibold text-neutral-800">{proforma.bodyPlacement}</span>
                  </div>
                )}
                {proforma.sizeApprox && (
                  <div>
                    <span className="text-neutral-500">Dimensiones / Estilo:</span>{' '}
                    <span className="font-semibold text-neutral-800">{proforma.sizeApprox}</span>
                  </div>
                )}
                {proforma.estimatedHours && (
                  <div className="flex items-center gap-1 text-neutral-700">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>Tiempo estimado en cabina: {proforma.estimatedHours} horas</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Appointment Association (if linked) */}
          {proforma.appointmentDate && (
            <div className="my-3 py-2 px-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>
                  <strong>Cita Programada Asociada:</strong> {proforma.appointmentDate} a las{' '}
                  <strong>{proforma.appointmentTime || '11:00'}</strong>
                </span>
              </div>
              <span className="text-[10px] bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded font-semibold">
                Agendada en Calendario
              </span>
            </div>
          )}

          {/* Items Breakdown Table */}
          <div className="py-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Desglose de Servicios, Procedimiento y Materiales
            </h4>
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-600 text-[10px] uppercase font-bold border-b border-neutral-200">
                    <th className="py-2.5 px-3">Concepto / Procedimiento</th>
                    <th className="py-2.5 px-3 text-center">Cant.</th>
                    <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800">
                  {proforma.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900">{item.concept}</div>
                        {item.hours && (
                          <div className="text-[10px] text-neutral-500">
                            Duración estimada: {item.hours} horas
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatMoney(item.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-neutral-950">
                        {formatMoney(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals & Suggested Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-t border-neutral-200">
            {/* Suggested Deposit Card */}
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Anticipo / Seña para Reserva</span>
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
                  {formatMoney(proforma.suggestedDeposit)}
                </div>
                <p className="text-[11px] text-emerald-800/90 mt-1 leading-snug">
                  Este anticipo se descuenta del valor total al finalizar el trabajo en el estudio y garantiza la reserva exclusiva de cabina y materiales estériles.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-emerald-200/60 text-[10px] text-emerald-700">
                Saldo pendiente al concluir: <strong className="font-mono">{formatMoney(proforma.total - (proforma.suggestedDeposit || 0))}</strong>
              </div>
            </div>

            {/* Calculations Box */}
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-2">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal Presupuestado:</span>
                <span className="font-mono">{formatMoney(proforma.subtotal)}</span>
              </div>

              {proforma.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Descuento Aplicado:</span>
                  <span className="font-mono">-{formatMoney(proforma.discount)}</span>
                </div>
              )}

              {proforma.taxAmount > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Impuestos ({proforma.taxRate}%):</span>
                  <span className="font-mono">{formatMoney(proforma.taxAmount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-300 flex justify-between items-baseline">
                <span className="text-sm font-bold text-neutral-950">TOTAL PROFORMA:</span>
                <span className="text-xl font-black font-mono text-neutral-950">
                  {formatMoney(proforma.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Policies */}
          <div className="mt-4 pt-3 border-t border-neutral-200 space-y-2 text-[11px] text-neutral-600">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-800">Términos, Condiciones y Garantía Sanitaria:</strong>
                <p className="mt-0.5 text-neutral-600 leading-relaxed">
                  {proforma.termsAndConditions ||
                    'Este presupuesto es orientativo con una vigencia de 15 días. Las cancelaciones o modificaciones de fecha deben notificarse con al menos 48 horas de antelación para transferir el anticipo a una nueva fecha. Todos los procedimientos se realizan bajo estrictas normas de asepsia hospitalaria y material 100% descartable.'}
                </p>
                {proforma.notes && (
                  <p className="mt-1 text-neutral-700 italic">
                    <strong>Nota especial:</strong> {proforma.notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Signatures line */}
          <div className="mt-8 pt-6 border-t border-dashed border-neutral-300 grid grid-cols-2 gap-8 text-center text-[10px] text-neutral-500">
            <div>
              <div className="border-b border-neutral-400 w-40 mx-auto mb-1"></div>
              <span>Firma y Sello del Estudio</span>
            </div>
            <div>
              <div className="border-b border-neutral-400 w-40 mx-auto mb-1"></div>
              <span>Conforme Cliente / Aceptación</span>
            </div>
          </div>
        </div>

        {/* Footer info (non-printable) */}
        <div className="p-4 bg-[#141417] border-t border-[#24242A] text-center text-xs text-neutral-500 print:hidden flex items-center justify-between">
          <span>Proforma generada en {settings.studioName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="text-xs font-semibold text-[#FF3366] hover:underline"
            >
              Imprimir documento
            </button>
            <span>·</span>
            <button
              onClick={onClose}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cerrar vista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

