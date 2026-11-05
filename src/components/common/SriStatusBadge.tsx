import React, { useState } from 'react';
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { SriDocumentStatus } from '../../types';

interface SriStatusBadgeProps {
  status?: SriDocumentStatus;
  messages?: string[];
  /** Reintentar envío / consultar autorización */
  onRetry?: () => Promise<unknown> | void;
  center?: boolean;
}

const STYLES: Record<SriDocumentStatus, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
  AUTORIZADO: { label: 'AUTORIZADO SRI', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: CheckCircle2 },
  PENDIENTE: { label: 'PENDIENTE SRI', cls: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30', Icon: Clock },
  EN_PROCESO: { label: 'EN PROCESO SRI', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30', Icon: Loader2 },
  RECHAZADO: { label: 'RECHAZADO SRI', cls: 'bg-red-500/15 text-red-300 border-red-500/30', Icon: XCircle },
  ERROR: { label: 'NO ENVIADO', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: AlertTriangle },
  ANULADO: { label: 'ANULADO', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: XCircle },
};

/** Estado real del comprobante electrónico ante el SRI, con opción de reintento. */
export const SriStatusBadge: React.FC<SriStatusBadgeProps> = ({ status = 'PENDIENTE', messages, onRetry, center }) => {
  const [busy, setBusy] = useState(false);
  const { label, cls, Icon } = STYLES[status] || STYLES.PENDIENTE;
  const canRetry = onRetry && status !== 'AUTORIZADO' && status !== 'ANULADO';
  const title = messages && messages.length > 0 ? messages.join('\n') : undefined;

  return (
    <div className={`inline-flex flex-col gap-1 ${center ? 'items-center' : 'items-start'}`}>
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 whitespace-nowrap ${cls}`}
        title={title}
      >
        <Icon className={`w-3 h-3 ${status === 'EN_PROCESO' || busy ? 'animate-spin' : ''}`} />
        <span>{label}</span>
      </span>
      {(status === 'RECHAZADO' || status === 'ERROR') && messages && messages[0] && (
        <span className="text-[9px] text-red-300/90 max-w-[220px] whitespace-normal leading-tight" title={title}>
          {messages[0].length > 110 ? `${messages[0].slice(0, 110)}…` : messages[0]}
        </span>
      )}
      {canRetry && (
        <button
          type="button"
          disabled={busy}
          onClick={async e => {
            e.stopPropagation();
            setBusy(true);
            try {
              await onRetry?.();
            } finally {
              setBusy(false);
            }
          }}
          className="text-[10px] text-[#FF3366] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
          {status === 'EN_PROCESO' ? 'Consultar SRI' : 'Enviar al SRI'}
        </button>
      )}
    </div>
  );
};
