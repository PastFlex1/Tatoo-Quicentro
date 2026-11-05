import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { CashShift, CashShiftSummary } from '../../types';
import { CASH_BILLS, CASH_COINS, denomKey, denomValue, ShiftTransaction } from '../../utils/cashShift';

interface CashClosingTicketModalProps {
  shift: CashShift | null;
  summary: CashShiftSummary | null;
  transactions: ShiftTransaction[];
  /** Corte parcial (X): turno aún abierto, sin conteo físico */
  isPartial?: boolean;
  justClosed?: boolean;
  onClose: () => void;
}

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';

const duration = (from: string, to?: string) => {
  const ms = new Date(to || Date.now()).getTime() - new Date(from).getTime();
  if (isNaN(ms) || ms < 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} h ${String(m).padStart(2, '0')} min`;
};

/** Ticket 80 mm con el detalle completo del cierre (o corte parcial) de caja. */
export const CashClosingTicketModal: React.FC<CashClosingTicketModalProps> = ({
  shift,
  summary,
  transactions,
  isPartial = false,
  justClosed = false,
  onClose,
}) => {
  const { settings, formatMoney } = useStudio();
  if (!shift || !summary) return null;

  const counted = shift.actualCashCounted ?? 0;
  const diff = isPartial ? 0 : Math.round((counted - summary.expectedCash) * 100) / 100;
  const diffLabel = Math.abs(diff) < 0.01 ? 'CUADRADO' : diff > 0 ? 'SOBRANTE' : 'FALTANTE';
  const cashTx = transactions.filter(t => Math.abs(t.cashEffect) > 0.004);
  const denoms = shift.closingDenominations || {};
  const denomRows = [
    ...CASH_BILLS.map(v => ({ key: denomKey(v, 'bill'), label: `Billete $${v}` })),
    ...CASH_COINS.map(v => ({ key: denomKey(v, 'coin'), label: `Moneda $${v}` })),
  ].filter(r => (denoms[r.key] || 0) > 0);

  const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span className="font-mono tabular-nums text-right whitespace-nowrap">{value}</span>
    </div>
  );
  const Sep = () => <div className="border-t border-dashed border-black my-2" />;
  const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="font-bold uppercase text-center mb-1">{children}</div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          #printable-receipt {
            width: 76mm !important;
            max-width: 76mm !important;
            padding: 2mm !important;
            font-size: 10.5px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-md w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-3.5 border-b border-[#25252E] flex items-center justify-between bg-[#121215] shrink-0">
          <div className="flex items-center gap-2">
            {justClosed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <h3 className="text-sm font-bold text-white">
              {isPartial ? 'Corte parcial de caja' : `${justClosed ? 'Caja cerrada · ' : ''}Cierre ${shift.shiftNumber || ''}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] cursor-pointer" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <div id="printable-receipt" className="bg-white text-black mx-auto w-full max-w-[300px] p-4 text-[11px] leading-snug font-sans rounded-md">
            <div className="text-center space-y-0.5">
              <div className="font-bold text-[13px] uppercase">{settings.nombreComercial || settings.studioName}</div>
              {settings.razonSocial && <div className="uppercase">{settings.razonSocial}</div>}
              {(settings.ruc || settings.taxId) && <div>RUC: {settings.ruc || settings.taxId}</div>}
              {(settings.dirEstablecimiento || settings.address) && <div>{settings.dirEstablecimiento || settings.address}</div>}
            </div>
            <Sep />
            <div className="text-center font-bold uppercase text-[12px]">
              {isPartial ? 'Corte parcial de caja (X)' : 'Cierre de caja (Z)'}
            </div>
            <div className="text-center font-mono font-bold">N° {shift.shiftNumber || shift.id.slice(-6)}</div>
            <Sep />

            <Row label="Apertura" value={fmtDateTime(shift.openedAt)} />
            <Row label="Abrió" value={shift.openedBy} />
            <Row label={isPartial ? 'Corte' : 'Cierre'} value={fmtDateTime(isPartial ? new Date().toISOString() : shift.closedAt)} />
            {!isPartial && <Row label="Cerró" value={shift.closedBy || '—'} />}
            <Row label="Duración" value={duration(shift.openedAt, isPartial ? undefined : shift.closedAt)} />
            <Sep />

            <Title>Ventas del turno</Title>
            <Row label="Facturas emitidas" value={String(summary.invoicesCount)} />
            <Row label="Notas de venta" value={String(summary.salesNotesCount)} />
            <Row label="Total facturado" value={formatMoney(summary.grossSales)} bold />
            <Row label="Cobrado en efectivo" value={formatMoney(summary.cashSales)} />
            <Row label="Cobrado con tarjeta" value={formatMoney(summary.cardSales)} />
            <Row label="Cobrado por transferencia" value={formatMoney(summary.transferSales)} />
            <Row label="Propinas en efectivo" value={formatMoney(summary.cashTips)} />
            {summary.otherTips > 0 && <Row label="Propinas tarjeta/transf." value={formatMoney(summary.otherTips)} />}
            <Sep />

            <Title>Flujo de efectivo</Title>
            <Row label="Fondo inicial" value={formatMoney(summary.openingCash)} />
            <Row label="(+) Ventas en efectivo" value={formatMoney(summary.cashSales)} />
            <Row label="(+) Propinas en efectivo" value={formatMoney(summary.cashTips)} />
            {summary.manualIn > 0 && <Row label="(+) Ingresos de caja" value={formatMoney(summary.manualIn)} />}
            <Row label="(−) Gastos pagados" value={formatMoney(summary.cashExpenses)} />
            <Row label="(−) Pagos a artistas" value={formatMoney(summary.cashArtistPayouts)} />
            {summary.cashRefunds > 0 && <Row label="(−) Devoluciones (NC)" value={formatMoney(summary.cashRefunds)} />}
            {summary.manualOut > 0 && <Row label="(−) Retiros" value={formatMoney(summary.manualOut)} />}
            {summary.bankDeposits > 0 && <Row label="(−) Depósitos al banco" value={formatMoney(summary.bankDeposits)} />}
            <div className="border-t border-black my-1" />
            <Row label="EFECTIVO ESPERADO" value={formatMoney(summary.expectedCash)} bold />
            {!isPartial && (
              <>
                <Row label="EFECTIVO CONTADO" value={formatMoney(counted)} bold />
                <Row label={`DIFERENCIA (${diffLabel})`} value={`${diff > 0 ? '+' : ''}${formatMoney(diff)}`} bold />
              </>
            )}

            {!isPartial && denomRows.length > 0 && (
              <>
                <Sep />
                <Title>Conteo por denominación</Title>
                {denomRows.map(r => (
                  <Row
                    key={r.key}
                    label={`${r.label} × ${denoms[r.key]}`}
                    value={formatMoney(denomValue(r.key) * (denoms[r.key] || 0))}
                  />
                ))}
              </>
            )}

            {cashTx.length > 0 && (
              <>
                <Sep />
                <Title>Movimientos de efectivo ({cashTx.length})</Title>
                {cashTx.map(t => (
                  <div key={t.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {new Date(t.date).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })} {t.label}
                    </span>
                    <span className="font-mono tabular-nums whitespace-nowrap">
                      {t.cashEffect > 0 ? '+' : '−'}
                      {formatMoney(Math.abs(t.cashEffect))}
                    </span>
                  </div>
                ))}
              </>
            )}

            {shift.notes && (
              <>
                <Sep />
                <div>
                  <strong>Observaciones:</strong> {shift.notes}
                </div>
              </>
            )}

            {!isPartial && (
              <div className="mt-10 space-y-10">
                <div className="text-center">
                  <div className="border-t border-black mx-4 pt-1">
                    <div className="font-bold uppercase">{shift.closedBy || ' '}</div>
                    <div>CAJERO(A) RESPONSABLE</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black mx-4 pt-1">
                    <div className="font-bold uppercase">{settings.representanteLegal || ' '}</div>
                    <div>SUPERVISOR / REPRESENTANTE LEGAL</div>
                  </div>
                </div>
              </div>
            )}
            <div className="text-center text-[9px] mt-4">Impreso: {fmtDateTime(new Date().toISOString())}</div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#25252E] bg-[#121215] flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer">
            Cerrar
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir {isPartial ? 'corte' : 'cierre'}
          </button>
        </div>
      </div>
    </div>
  );
};
