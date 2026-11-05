import React, { useMemo, useState } from 'react';
import { X, Ban, AlertTriangle, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SaleRecord } from '../../types';
import { UiSelect } from '../common/UiSelect';

interface VoidSaleModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
  onDone: (sale: SaleRecord) => void;
}

const REASONS = [
  'Error en el valor facturado',
  'Error en el servicio o producto facturado',
  'El cliente desistió del servicio / devolución',
  'Comprobante emitido por duplicado',
  'Otro motivo (detallar abajo)',
];

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const input =
  'w-full px-3 py-2 bg-[#121215] border border-[#2B2B36] rounded-xl text-white text-xs focus:outline-none focus:border-[#FF3366]/60';

/**
 * Anulación de comprobantes que NO admiten nota de crédito:
 * facturas a consumidor final (se anulan también en SRI en Línea) y notas de venta.
 */
export const VoidSaleModal: React.FC<VoidSaleModalProps> = ({ sale, onClose, onDone }) => {
  const { voidSale, kardexMovements, formatMoney } = useStudio();
  const [reasonKind, setReasonKind] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const [sriRef, setSriRef] = useState('');
  const [sriDate, setSriDate] = useState(todayLocal());
  const [sriConfirmed, setSriConfirmed] = useState(false);
  const [revertInventory, setRevertInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasStockMovements = useMemo(
    () => Boolean(sale && kardexMovements.some(m => m.reference === sale.invoiceNumber && m.quantityOut > 0)),
    [kardexMovements, sale]
  );

  if (!sale) return null;

  const isNotaVenta = sale.documentType === 'nota_venta';
  // Solo una factura ya autorizada por el SRI existe allá y debe anularse también en SRI en Línea
  const requiresSri = !isNotaVenta && sale.sriStatus === 'AUTORIZADO';
  const refund = (sale.amountPaidNow ?? sale.total) + (sale.tipAmount || 0);
  const methodLabel =
    sale.paymentMethod === 'cash' ? 'efectivo' : sale.paymentMethod === 'card' ? 'tarjeta' : sale.paymentMethod === 'transfer' ? 'transferencia' : 'pago mixto';

  const handleConfirm = () => {
    setError(null);
    const reason = [reasonKind.startsWith('Otro') ? '' : reasonKind, detail.trim()].filter(Boolean).join(': ');
    if (reason.trim().length < 10) {
      setError('Describa el motivo de la anulación (mínimo 10 caracteres).');
      return;
    }
    if (requiresSri && (!sriConfirmed || !sriDate)) {
      setError('Confirme que ya anuló la factura en SRI en Línea e indique la fecha.');
      return;
    }
    try {
      const voided = voidSale(sale.id, {
        reason,
        sriReference: requiresSri ? sriRef : undefined,
        sriVoidDate: requiresSri ? sriDate : undefined,
        revertInventory: hasStockMovements && revertInventory,
      });
      onDone(voided);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular el comprobante.');
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(sale.sriAccessKey || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* el portapapeles puede no estar disponible */
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-xl w-full shadow-2xl flex flex-col max-h-[94vh] my-auto">
        <div className="px-5 sm:px-6 py-4 border-b border-[#25252E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/15 text-red-400">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Anular {isNotaVenta ? 'nota de venta' : 'factura a consumidor final'}</h3>
              <p className="text-[11px] text-neutral-400 font-mono">{sale.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Resumen */}
          <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#272730] grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span className="text-neutral-400">Cliente</span>
            <span className="text-white text-right truncate">{sale.clientName}</span>
            <span className="text-neutral-400">Fecha</span>
            <span className="text-white text-right">{new Date(sale.date).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <span className="text-neutral-400">Servicio</span>
            <span className="text-white text-right truncate">{sale.serviceName}</span>
            <span className="text-neutral-400">Total cobrado (con propina)</span>
            <span className="font-mono font-bold text-white text-right">{formatMoney(refund)}</span>
          </div>

          {/* Paso en el SRI */}
          {requiresSri && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2.5">
              <div className="font-bold text-amber-100 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Paso 1: anule la factura en SRI en Línea
              </div>
              <p className="text-amber-100/90 leading-relaxed">
                Una factura a consumidor final no se modifica con nota de crédito. Se anula en el portal del SRI (<strong>Facturación electrónica → Anulación de comprobantes</strong>), dentro del plazo que permita el SRI. Use esta clave de acceso:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 break-all text-[10px] font-mono bg-black/30 rounded-lg px-2.5 py-1.5 text-amber-50 select-all">{sale.sriAccessKey || '—'}</code>
                <button type="button" onClick={copyKey} className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 flex items-center gap-1 cursor-pointer shrink-0">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiada' : 'Copiar'}
                </button>
              </div>
              <div className="font-bold text-amber-100 pt-1">Paso 2: registre aquí la anulación</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="block text-[11px] font-semibold text-amber-100/90 mb-1">Fecha de anulación en el SRI *</span>
                  <input type="date" value={sriDate} max={todayLocal()} onChange={e => setSriDate(e.target.value)} className={input} />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-semibold text-amber-100/90 mb-1">N° de solicitud / referencia</span>
                  <input value={sriRef} onChange={e => setSriRef(e.target.value)} placeholder="Opcional" className={input} />
                </label>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={sriConfirmed} onChange={e => setSriConfirmed(e.target.checked)} className="mt-0.5" />
                <span className="text-amber-50">Confirmo que ya anulé esta factura en SRI en Línea.</span>
              </label>
            </div>
          )}
          {!isNotaVenta && !requiresSri && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-100 leading-relaxed">
              Esta factura <strong>no fue autorizada por el SRI</strong> (estado: {sale.sriStatus || 'PENDIENTE'}), por lo que no hay nada que anular en el portal. Si aún va a reenviarla, no la anule.
            </div>
          )}

          {/* Motivo */}
          <label className="block">
            <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Motivo *</span>
            <UiSelect value={reasonKind} onChange={e => setReasonKind(e.target.value)} className="w-full">
              {REASONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </UiSelect>
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Detalle {reasonKind.startsWith('Otro') ? '*' : '(opcional)'}</span>
            <textarea
              rows={2}
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Explique qué ocurrió (queda registrado en la anulación)"
              className={input}
            />
          </label>

          {hasStockMovements && (
            <label className="flex items-start gap-2 p-3 rounded-xl border border-[#2B2B36] cursor-pointer">
              <input type="checkbox" checked={revertInventory} onChange={e => setRevertInventory(e.target.checked)} className="mt-0.5" />
              <span className="text-neutral-200">Devolver a bodega los productos e insumos que descontó esta venta (Kardex).</span>
            </label>
          )}

          {/* Qué se revierte */}
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-100 space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Al anular se revierte
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-red-100/90">
              <li>La venta, el IVA y la comisión / propina del artista (el comprobante se conserva marcado como ANULADO).</li>
              <li>El asiento contable, con un asiento de reverso en el Libro Diario.</li>
              <li>
                El cobro: <strong>devuelva {formatMoney(refund)} al cliente</strong> ({methodLabel}). Si fue en efectivo, sale del turno de caja actual.
              </li>
              <li>La cita o la proforma vinculadas a esta venta quedan libres para volver a facturarse.</li>
            </ul>
            <p className="text-[11px] text-red-100/80">La anulación no se puede deshacer; si fue un error, emita un comprobante nuevo.</p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 flex gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[#25252E] flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Ban className="w-3.5 h-3.5" />
            Anular comprobante
          </button>
        </div>
      </div>
    </div>
  );
};
