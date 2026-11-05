import React, { useCallback, useEffect, useState } from 'react';
import { Hash, RefreshCw, Wifi, WifiOff, History, Save } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  fetchSequenceLog,
  fetchSequenceState,
  SequenceLogEntry,
  SequenceStateRow,
  setNextSequence,
} from '../../services/sequenceService';
import { SEQUENCE_LABELS, SequenceType, padCode } from '../../utils/documentNumber';

const EXAMPLES: Record<SequenceType, string> = {
  proforma: '#000001',
  nota_venta: '#0000001',
  factura: '001-001-000000001',
  nota_credito: '001-001-000000001',
};

/** Estado de la numeración central de documentos: serie, último emitido, próximo y auditoría. */
export const SequencePanel: React.FC = () => {
  const { settings, can, currentUser } = useStudio();
  const estab = padCode(settings.codigoEstablecimiento, 3, '001');
  const pto = padCode(settings.puntoEmision, 3, '001');
  const canEdit = can('settings.edit_sri');

  const [rows, setRows] = useState<SequenceStateRow[]>([]);
  const [log, setLog] = useState<SequenceLogEntry[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<SequenceType, string>>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [state, entries] = await Promise.all([fetchSequenceState(estab, pto), fetchSequenceLog(12)]);
      setRows(state);
      setLog(entries);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [estab, pto]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const applyNext = async (row: SequenceStateRow) => {
    const value = parseInt(drafts[row.type] || '', 10);
    if (!(value >= 1)) {
      setMsg({ text: 'Ingrese un número válido (1 o mayor).', ok: false });
      return;
    }
    try {
      const res = await setNextSequence({
        type: row.type,
        next: value,
        estab,
        pto,
        user: `${currentUser.nombres} ${currentUser.apellidos}`.trim(),
      });
      setMsg({ text: `${SEQUENCE_LABELS[row.type]}: el próximo número será ${res.formatted}.`, ok: true });
      setDrafts(d => ({ ...d, [row.type]: '' }));
      void refresh();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'No se pudo cambiar el número.', ok: false });
    }
  };

  return (
    <div className="p-4 rounded-xl bg-[#121215] border border-[#2B2B36] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#FF3366]" />
            Numeración central de documentos
          </h4>
          <p className="text-[11px] text-neutral-400 mt-0.5 max-w-2xl">
            Los números los entrega el servidor, uno por uno. Varios trabajadores pueden emitir al mismo tiempo desde distintos equipos y nunca
            reciben el mismo número. Las facturas y notas de crédito usan la serie <strong className="text-white font-mono">{estab}-{pto}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
              online === false
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : online
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-neutral-500/10 border-neutral-500/30 text-neutral-300'
            }`}
          >
            {online === false ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {online === false ? 'Servidor sin conexión' : online ? 'Servidor conectado' : 'Conectando…'}
          </span>
          <button type="button" onClick={refresh} disabled={loading} className="p-1.5 rounded-lg border border-[#272730] text-neutral-300 hover:text-white cursor-pointer" aria-label="Actualizar">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {online === false && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-[11px]">
          No hay conexión con el servidor de numeración: <strong>no se podrán emitir documentos</strong> hasta que vuelva (así no se repiten ni se saltan números).
        </div>
      )}
      {msg && (
        <div className={`p-2.5 rounded-xl border text-[11px] ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#24242B]">
        <table className="w-full text-xs text-left min-w-[640px]">
          <thead className="bg-[#18181D] text-[10px] uppercase tracking-wider text-neutral-400">
            <tr>
              <th className="py-2 px-3">Documento</th>
              <th className="py-2 px-3">Formato</th>
              <th className="py-2 px-3">Último emitido</th>
              <th className="py-2 px-3">Próximo número</th>
              {canEdit && <th className="py-2 px-3">Cambiar el próximo (nº)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222228]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="py-6 text-center text-neutral-500">
                  {online === false ? 'Sin datos: el servidor no responde.' : 'Cargando…'}
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.type}>
                  <td className="py-2 px-3 font-semibold text-white">{SEQUENCE_LABELS[r.type]}</td>
                  <td className="py-2 px-3 font-mono text-neutral-500">{EXAMPLES[r.type]}</td>
                  <td className="py-2 px-3 font-mono text-neutral-300">{r.lastFormatted || '—'}</td>
                  <td className="py-2 px-3 font-mono font-bold text-[#FF3366]">{r.nextFormatted}</td>
                  {canEdit && (
                    <td className="py-2 px-3">
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min={r.next}
                          value={drafts[r.type] || ''}
                          onChange={e => setDrafts(d => ({ ...d, [r.type]: e.target.value }))}
                          placeholder={String(r.next)}
                          className="w-28 px-2 py-1.5 bg-[#18181D] border border-[#272730] rounded-lg text-white font-mono text-right text-xs focus:outline-none focus:border-[#FF3366]/60"
                        />
                        <button
                          type="button"
                          onClick={() => applyNext(r)}
                          className="px-2.5 rounded-lg bg-[#25252E] hover:bg-[#30303B] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          Fijar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-neutral-500">
        Solo se puede avanzar el contador (útil para continuar una numeración que ya traía el negocio); nunca retroceder, porque el SRI no admite repetir un secuencial.
      </p>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mb-1.5">
          <History className="w-3.5 h-3.5" />
          Últimos números entregados
        </div>
        {log.length === 0 ? (
          <p className="text-[11px] text-neutral-500">Todavía no se ha emitido ningún documento.</p>
        ) : (
          <div className="divide-y divide-[#222228] rounded-xl border border-[#24242B] text-[11px]">
            {log.map((l, i) => (
              <div key={i} className="flex flex-wrap justify-between gap-2 px-3 py-1.5">
                <span className="text-neutral-400 font-mono">{new Date(l.at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                <span className="text-neutral-300">
                  {SEQUENCE_LABELS[l.type]} ·{' '}
                  <span className="font-mono text-white">{l.event === 'reserve' ? l.formatted : `próximo → ${l.next}`}</span>
                </span>
                <span className="text-neutral-500">{l.user || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
