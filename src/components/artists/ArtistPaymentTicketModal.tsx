import React, { useState } from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Artist, ArtistSettlement } from '../../types';

interface ArtistPaymentTicketModalProps {
  settlement: ArtistSettlement | null;
  artist?: Artist | null;
  onClose: () => void;
  /** true cuando se abre justo después de registrar el pago */
  justCreated?: boolean;
}

/**
 * Comprobante (ticket 80mm) de pago o anticipo a un artista,
 * con espacio de firma para el representante legal y el artista.
 */
export const ArtistPaymentTicketModal: React.FC<ArtistPaymentTicketModalProps> = ({
  settlement,
  artist,
  onClose,
  justCreated = false,
}) => {
  const { settings, updateSettings, formatMoney } = useStudio();
  const [repName, setRepName] = useState(settings.representanteLegal || '');
  const [repDni, setRepDni] = useState(settings.representanteLegalCedula || '');

  if (!settlement) return null;

  const isAdvance = settlement.type === 'anticipo';
  const date = new Date(settlement.date);
  const fecha = date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
  const ruc = settings.ruc || settings.taxId;
  const razonSocial = settings.razonSocial || settings.studioName;
  const address = settings.dirEstablecimiento || settings.address;

  const saveRepresentative = () => {
    if (repName !== (settings.representanteLegal || '') || repDni !== (settings.representanteLegalCedula || '')) {
      updateSettings({ representanteLegal: repName.trim(), representanteLegalCedula: repDni.trim() });
    }
  };

  const handlePrint = () => {
    saveRepresentative();
    // Deja que React pinte los nombres antes de abrir el diálogo de impresión
    setTimeout(() => window.print(), 50);
  };

  const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold text-[12px]' : ''}`}>
      <span>{label}</span>
      <span className="font-mono tabular-nums text-right">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          #printable-receipt {
            width: 76mm !important;
            max-width: 76mm !important;
            padding: 2mm 2mm !important;
            font-size: 10.5px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-md w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Barra superior (no se imprime) */}
        <div className="px-5 py-3.5 border-b border-[#25252E] flex items-center justify-between bg-[#121215] shrink-0">
          <div className="flex items-center gap-2">
            {justCreated && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <h3 className="text-sm font-bold text-white">
              {justCreated ? 'Pago registrado · ' : ''}Comprobante {settlement.receiptNumber || ''}
            </h3>
          </div>
          <button
            onClick={() => {
              saveRepresentative();
              onClose();
            }}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Datos del representante legal (no se imprime el formulario) */}
        <div className="px-5 pt-4 grid grid-cols-2 gap-2 text-xs shrink-0">
          <label className="col-span-2 sm:col-span-1">
            <span className="block text-neutral-400 mb-1">Representante legal</span>
            <input
              value={repName}
              onChange={e => setRepName(e.target.value)}
              onBlur={saveRepresentative}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-lg text-white focus:border-[#FF3366]/60"
            />
          </label>
          <label className="col-span-2 sm:col-span-1">
            <span className="block text-neutral-400 mb-1">C.I. representante</span>
            <input
              value={repDni}
              onChange={e => setRepDni(e.target.value)}
              onBlur={saveRepresentative}
              placeholder="Cédula"
              className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-lg text-white font-mono focus:border-[#FF3366]/60"
            />
          </label>
        </div>

        {/* Ticket imprimible */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <div
            id="printable-receipt"
            className="bg-white text-black mx-auto w-full max-w-[300px] p-4 text-[11px] leading-snug font-sans rounded-md"
          >
            <div className="text-center space-y-0.5">
              <div className="font-bold text-[13px] uppercase">{settings.nombreComercial || settings.studioName}</div>
              {razonSocial && <div className="uppercase">{razonSocial}</div>}
              {ruc && <div>RUC: {ruc}</div>}
              {address && <div>{address}</div>}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            <div className="text-center font-bold uppercase text-[12px]">
              {isAdvance ? 'Comprobante de anticipo' : 'Comprobante de pago'}
              <br />
              de comisiones a artista
            </div>
            <div className="text-center font-mono font-bold mt-1">N° {settlement.receiptNumber || settlement.id}</div>
            <div className="text-center">
              {fecha} {hora}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            <div className="space-y-0.5">
              <div>
                <strong>Artista:</strong> {settlement.artistName}
                {artist?.nickname && !settlement.artistName.includes(artist.nickname) ? ` "${artist.nickname}"` : ''}
              </div>
              {artist?.role && (
                <div>
                  <strong>Rol:</strong> {artist.role}
                </div>
              )}
              <div>
                <strong>C.I.:</strong> {artist?.dni || '______________________'}
              </div>
              <div>
                <strong>Tipo:</strong> {isAdvance ? 'Anticipo (pago parcial)' : 'Liquidación de comisiones'}
              </div>
              <div>
                <strong>Forma de pago:</strong> {settlement.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            <div className="space-y-0.5">
              {typeof settlement.balanceBefore === 'number' && (
                <Row label="Saldo pendiente anterior" value={formatMoney(settlement.balanceBefore)} />
              )}
              <Row label={isAdvance ? 'Anticipo de comisiones' : 'Comisiones'} value={formatMoney(settlement.commissionEarned)} />
              {settlement.tipsEarned > 0 && <Row label="Propinas" value={`+${formatMoney(settlement.tipsEarned)}`} />}
              {settlement.deductions > 0 && (
                <Row label="Deducciones (insumos/préstamos)" value={`-${formatMoney(settlement.deductions)}`} />
              )}
              <div className="border-t border-black my-1" />
              <Row label="NETO ENTREGADO" value={formatMoney(settlement.amountPaid)} bold />
              {typeof settlement.balanceAfter === 'number' && (
                <Row
                  label={settlement.balanceAfter < 0 ? 'Anticipo a descontar' : 'Saldo pendiente restante'}
                  value={formatMoney(Math.abs(settlement.balanceAfter))}
                />
              )}
            </div>

            {settlement.notes && (
              <>
                <div className="border-t border-dashed border-black my-2" />
                <div>
                  <strong>Concepto:</strong> {settlement.notes}
                </div>
              </>
            )}

            <div className="border-t border-dashed border-black my-2" />

            <p className="text-justify">
              Yo, <strong>{settlement.artistName}</strong>, declaro haber recibido a mi entera satisfacción la
              cantidad de <strong>{formatMoney(settlement.amountPaid)}</strong> por concepto de{' '}
              {isAdvance ? 'anticipo de comisiones' : 'liquidación de comisiones'} por servicios prestados en{' '}
              {settings.nombreComercial || settings.studioName}.
            </p>

            {/* Firmas */}
            <div className="mt-10 space-y-10">
              <div className="text-center">
                <div className="border-t border-black mx-4 pt-1">
                  <div className="font-bold uppercase">{repName || ' '}</div>
                  <div>REPRESENTANTE LEGAL</div>
                  <div>C.I.: {repDni || '____________________'}</div>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-black mx-4 pt-1">
                  <div className="font-bold uppercase">{settlement.artistName}</div>
                  <div>ARTISTA / TATUADOR(A) – RECIBÍ CONFORME</div>
                  <div>C.I.: {artist?.dni || '____________________'}</div>
                </div>
              </div>
            </div>

            {settlement.registeredBy && (
              <div className="text-center text-[9px] mt-4">Registrado por: {settlement.registeredBy}</div>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#25252E] bg-[#121215] flex justify-end gap-2 shrink-0">
          <button
            onClick={() => {
              saveRepresentative();
              onClose();
            }}
            className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir ticket para firmas
          </button>
        </div>
      </div>
    </div>
  );
};
