import React from 'react';
import { RefreshCw, CloudDownload, Square, Clock, AlertTriangle, Settings2, CheckCircle2, Timer, Mail } from 'lucide-react';
import type { CorreoConfig, EstadoSync } from '../../../services/sriRecibidosApi';
import { fechaHora, ui } from './sriUi';

interface Props {
  estado: EstadoSync | null;
  correo: CorreoConfig | null;
  /** Mientras se lee el correo antes de sincronizar */
  iniciando: boolean;
  error: string | null;
  puedeSincronizar: boolean;
  onSincronizar: () => void;
  onCancelar: () => void;
  onVerFallidas: () => void;
  onConfigurar: () => void;
  onCorreo: () => void;
}

/** Estado de la sincronización con el SRI: botón principal, progreso en vivo y contadores. */
export const SyncStatusPanel: React.FC<Props> = ({ estado, correo, iniciando, error, puedeSincronizar, onSincronizar, onCancelar, onVerFallidas, onConfigurar, onCorreo }) => {
  const enCurso = Boolean(estado?.enCurso);
  const run = (enCurso ? estado?.actual : estado?.ultima) || null;
  const progreso = run && run.encontrados > 0 ? Math.round((run.procesados / run.encontrados) * 100) : enCurso ? 0 : 100;
  const auto = estado?.automatica;

  const contadores = [
    { label: 'Encontrados', valor: run?.encontrados ?? 0, cls: 'text-white' },
    { label: 'Nuevos', valor: run?.nuevos ?? 0, cls: 'text-emerald-300' },
    { label: 'Duplicados', valor: run?.duplicados ?? 0, cls: 'text-neutral-300' },
    { label: 'Errores', valor: run?.errores ?? 0, cls: (run?.errores ?? 0) > 0 ? 'text-red-300' : 'text-neutral-300' },
  ];

  return (
    <div className={`${ui.card} p-3 sm:p-4 space-y-3`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${
              error ? 'bg-red-500/10 border-red-500/30 text-red-300' : enCurso ? 'bg-[#FF3366]/15 border-[#FF3366]/40 text-[#FF3366]' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {error ? <AlertTriangle className="w-5 h-5" /> : enCurso ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-white">
              {error ? 'Sin conexión con el módulo' : enCurso ? `Sincronizando con el SRI… ${run?.procesados ?? 0} de ${run?.encontrados ?? 0}` : 'Sincronización inactiva'}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {error
                ? error
                : estado?.ultima
                ? `Última: ${fechaHora(estado.ultima.inicio)} · ${estado.ultima.disparador === 'AUTOMATICA' ? 'automática' : 'manual'}${estado.ultima.estado !== 'COMPLETADA' && !enCurso ? ` · ${estado.ultima.estado.toLowerCase()}` : ''}`
                : 'Todavía no se ha sincronizado'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCorreo}
            className={`${ui.btn} ${correo?.ultimoError ? 'border-red-500/40 text-red-300' : correo?.activo ? 'border-emerald-500/30 text-emerald-300' : ''}`}
            title={correo?.ultimoError || (correo?.activo ? `Lee ${correo.usuario}` : 'Configurar el buzón donde llegan las facturas')}
          >
            <Mail className="w-3.5 h-3.5" />
            {correo?.activo ? (correo.ultimoError ? 'Correo: error' : 'Correo activo') : 'Correo: no'}
          </button>
          <button type="button" onClick={onConfigurar} className={ui.btn} title="Sincronización automática">
            <Settings2 className="w-3.5 h-3.5" />
            {auto?.activa ? `Auto cada ${auto.cadaMinutos} min` : 'Automática: no'}
          </button>
          {enCurso ? (
            <button type="button" onClick={onCancelar} className={`${ui.btn} border-red-500/40 text-red-300`}>
              <Square className="w-3.5 h-3.5" /> Detener
            </button>
          ) : (
            <button type="button" onClick={onSincronizar} disabled={!puedeSincronizar || Boolean(error) || iniciando} className={`${ui.btnPrimario} px-5 py-2.5`}>
              {iniciando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />} {iniciando ? (correo?.activo ? 'Leyendo correo…' : 'Iniciando…') : 'SINCRONIZAR SRI'}
            </button>
          )}
        </div>
      </div>

      {enCurso && (
        <div className="h-1.5 rounded-full bg-[#121215] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FF3366] to-[#E62557] transition-all duration-500" style={{ width: `${progreso}%` }} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {contadores.map(c => (
          <div key={c.label} className="px-3 py-2 rounded-xl bg-[#121215] border border-[#24242B]">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">{c.label}</div>
            <div className={`font-mono text-lg font-bold ${c.cls}`}>{c.valor}</div>
          </div>
        ))}
        <div className="px-3 py-2 rounded-xl bg-[#121215] border border-[#24242B]" title="Claves esperando consulta (incluye las que se reintentarán más tarde)">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-1">
            <Timer className="w-3 h-3" /> En cola
          </div>
          <div className="font-mono text-lg font-bold text-white">{estado?.cola.pendientes ?? 0}</div>
        </div>
        <button
          type="button"
          onClick={onVerFallidas}
          disabled={!estado?.cola.fallidas}
          className="px-3 py-2 rounded-xl bg-[#121215] border border-[#24242B] text-left enabled:hover:border-red-500/40 cursor-pointer disabled:cursor-default"
          title="Ver claves que no se pudieron traer y su motivo"
        >
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Fallidas
          </div>
          <div className={`font-mono text-lg font-bold ${estado?.cola.fallidas ? 'text-red-300 underline decoration-dotted' : 'text-neutral-300'}`}>{estado?.cola.fallidas ?? 0}</div>
        </button>
      </div>
      {!enCurso && run?.mensaje && <p className="text-[11px] text-amber-300">{run.mensaje}</p>}
    </div>
  );
};
