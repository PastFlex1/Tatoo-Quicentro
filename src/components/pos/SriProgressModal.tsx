import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, FileSignature, Loader2, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SaleRecord } from '../../types';
import { SriEmissionResult, SriStep, SriStepState } from '../../services/sriElectronicService';

type StepView = SriStepState | 'pending';

interface SriProgressModalProps {
  sale: SaleRecord;
  /** Muestra el comprobante (solo se llama con la factura ya autorizada, o si el cajero lo pide igual) */
  onShowReceipt: (sale: SaleRecord) => void;
  onClose: () => void;
}

const STEPS: { id: SriStep; label: string; running: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'firma', label: 'Firmado', running: 'Firmando con la firma electrónica…', Icon: FileSignature },
  { id: 'recepcion', label: 'Recibido por el SRI', running: 'Enviando al SRI (recepción)…', Icon: Send },
  { id: 'autorizacion', label: 'Autorizado', running: 'Esperando la autorización del SRI…', Icon: ShieldCheck },
];

const initialSteps = (): Record<SriStep, StepView> => ({ firma: 'pending', recepcion: 'pending', autorizacion: 'pending' });

/**
 * Al cobrar una factura en el POS: muestra el avance Firma → Recepción → Autorización
 * y recién con la autorización del SRI abre el comprobante.
 */
export const SriProgressModal: React.FC<SriProgressModalProps> = ({ sale, onShowReceipt, onClose }) => {
  const { emitSaleToSri, sales } = useStudio();
  const [steps, setSteps] = useState<Record<SriStep, StepView>>(initialSteps);
  const [result, setResult] = useState<SriEmissionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [authorizedSale, setAuthorizedSale] = useState<SaleRecord | null>(null);
  const started = useRef(false);
  const salesRef = useRef(sales);
  salesRef.current = sales;

  const run = useCallback(
    async (first: boolean) => {
      setRunning(true);
      setResult(null);
      setSteps(initialSteps());
      const onStep = (step: SriStep, state: SriStepState) => setSteps(prev => ({ ...prev, [step]: state }));
      // En el primer intento se usa la venta recién creada (aún puede no estar en la lista)
      const res = await emitSaleToSri(sale.id, { snapshot: first ? sale : undefined, onStep });
      const latest = salesRef.current.find(s => s.id === sale.id);
      if (!res && latest?.sriStatus === 'AUTORIZADO') {
        setSteps({ firma: 'done', recepcion: 'done', autorizacion: 'done' });
        setAuthorizedSale(latest);
      } else if (res) {
        setResult(res);
        if (res.status === 'AUTORIZADO') {
          setAuthorizedSale({
            ...(latest || sale),
            sriStatus: 'AUTORIZADO',
            sriAuthorizationNumber: res.authorizationNumber,
            sriAuthorizationDate: res.authorizationDate,
            sriMessages: res.messages,
            sriAuthorizedXml: res.xml,
          });
        }
      } else {
        setResult({ status: 'ERROR', messages: ['El comprobante ya se está enviando. Espere unos segundos y vuelva a intentar.'] });
      }
      setRunning(false);
    },
    [emitSaleToSri, sale]
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run(true);
  }, [run]);

  // Con la autorización, el comprobante se abre solo
  useEffect(() => {
    if (!authorizedSale) return;
    const t = setTimeout(() => onShowReceipt(authorizedSale), 1200);
    return () => clearTimeout(t);
  }, [authorizedSale, onShowReceipt]);

  const failed = !running && !authorizedSale && !!result;
  const pendingLater = result?.status === 'EN_PROCESO';

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="sri-progress-title">
      <div className="w-full max-w-md bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-[#24242C] bg-[#121215]">
          <h3 id="sri-progress-title" className="font-bold text-white text-sm">
            {authorizedSale ? 'Factura autorizada por el SRI' : failed ? 'La factura no se pudo autorizar' : 'Enviando factura al SRI'}
          </h3>
          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Factura N° {sale.invoiceNumber} · {sale.clientName}
          </p>
        </div>

        <div className="p-5 space-y-3">
          <ol className="space-y-2.5">
            {STEPS.map(({ id, label, running: runningText, Icon }) => {
              const st = steps[id];
              return (
                <li
                  key={id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    st === 'done'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : st === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : st === 'running'
                      ? 'bg-[#FF3366]/10 border-[#FF3366]/40'
                      : 'bg-[#121215] border-[#2B2B36]'
                  }`}
                >
                  <span className="shrink-0">
                    {st === 'done' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : st === 'error' ? (
                      <XCircle className="w-6 h-6 text-rose-400" />
                    ) : st === 'running' ? (
                      <Loader2 className="w-6 h-6 text-[#FF3366] animate-spin" />
                    ) : (
                      <Circle className="w-6 h-6 text-neutral-600" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold ${st === 'pending' ? 'text-neutral-500' : 'text-white'}`}>{label}</div>
                    {st === 'running' && <div className="text-[11px] text-neutral-400">{runningText}</div>}
                  </div>
                  <Icon className={`w-4 h-4 shrink-0 ${st === 'done' ? 'text-emerald-400' : 'text-neutral-600'}`} />
                </li>
              );
            })}
          </ol>

          {authorizedSale && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200 space-y-0.5">
              <div className="font-bold">Abriendo el comprobante autorizado…</div>
              {authorizedSale.sriAuthorizationNumber && (
                <div className="font-mono break-all text-emerald-300/80">Autorización: {authorizedSale.sriAuthorizationNumber}</div>
              )}
            </div>
          )}

          {failed && result && (
            <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${pendingLater ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {pendingLater ? 'El SRI aún no responde' : result.status === 'RECHAZADO' ? 'El SRI rechazó el comprobante' : 'No se pudo completar el envío'}
              </div>
              {result.messages.slice(0, 4).map((m, i) => (
                <div key={i} className="break-words">{m}</div>
              ))}
              <div className="text-neutral-400 pt-1">
                La venta ya quedó registrada con este número. Puede reintentar ahora o más tarde desde Facturación.
              </div>
            </div>
          )}
        </div>

        {(failed || authorizedSale) && (
          <div className="px-5 py-3.5 border-t border-[#24242C] bg-[#121215] flex flex-wrap items-center justify-end gap-2">
            {failed && (
              <>
                <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-bold text-neutral-400 hover:text-white cursor-pointer">
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => onShowReceipt(salesRef.current.find(s => s.id === sale.id) || sale)}
                  className="px-3 py-2 rounded-xl border border-[#2B2B36] text-xs font-bold text-neutral-300 hover:text-white cursor-pointer"
                >
                  Ver comprobante pendiente
                </button>
                <button
                  type="button"
                  onClick={() => void run(false)}
                  className="px-4 py-2 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                </button>
              </>
            )}
            {authorizedSale && (
              <button
                type="button"
                onClick={() => onShowReceipt(authorizedSale)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Ver comprobante
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
