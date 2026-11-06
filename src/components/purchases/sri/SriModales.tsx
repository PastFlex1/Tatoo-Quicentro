import React, { useEffect, useState } from 'react';
import { X, FileCheck2, RotateCcw, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { UiSelect } from '../../common/UiSelect';
import { TimePicker } from '../../common/DatePicker';
import { sriApi } from '../../../services/sriRecibidosApi';
import type { ClavePendiente, ComprobanteApi, ConfigAutomatica } from '../../../services/sriRecibidosApi';
import type { ExpenseCategory, ExpenseRecord } from '../../../types';
import { ERRORES, diaEc, fechaHora, tipoDe, ui } from './sriUi';

/** Cierra con Escape */
const useEscape = (onClose: () => void) =>
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

const Modal: React.FC<{ titulo: React.ReactNode; ancho?: string; onClose: () => void; children: React.ReactNode }> = ({ titulo, ancho = 'max-w-md', onClose, children }) => {
  useEscape(onClose);
  return (
    <div className={ui.modalFondo} onMouseDown={onClose}>
      <div className={`${ui.card} w-full ${ancho} max-h-[90vh] flex flex-col`} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#24242B]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer" title="Cerrar (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto ink-scroll space-y-3">{children}</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ contabilizar
export const CATEGORIAS: { id: ExpenseCategory; label: string }[] = [
  { id: 'supplies_tattoo', label: 'Insumos tatuaje' },
  { id: 'supplies_piercing', label: 'Insumos piercing' },
  { id: 'jewelry_restock', label: 'Joyería' },
  { id: 'hygiene_sanitary', label: 'Bioseguridad' },
  { id: 'rent_studio', label: 'Alquiler' },
  { id: 'utilities', label: 'Servicios básicos' },
  { id: 'software_terminals', label: 'Software / datáfono' },
  { id: 'marketing_ads', label: 'Publicidad' },
  { id: 'maintenance', label: 'Mantenimiento' },
  { id: 'taxes_licenses', label: 'Impuestos / licencias' },
  { id: 'other_expense', label: 'Otros gastos' },
];

export const PAGOS: { id: ExpenseRecord['paymentMethod']; label: string }[] = [
  { id: 'bank_transfer', label: 'Transferencia' },
  { id: 'credit_card', label: 'Tarjeta' },
  { id: 'cash', label: 'Efectivo' },
];

export const ContabilizarModal: React.FC<{
  comprobante: ComprobanteApi;
  categoriaSugerida: ExpenseCategory;
  pagoSugerido: ExpenseRecord['paymentMethod'];
  formatMoney: (n: number) => string;
  onConfirmar: (categoria: ExpenseCategory, pago: ExpenseRecord['paymentMethod']) => Promise<void>;
  onClose: () => void;
}> = ({ comprobante: c, categoriaSugerida, pagoSugerido, formatMoney, onConfirmar, onClose }) => {
  const [categoria, setCategoria] = useState(categoriaSugerida);
  const [pago, setPago] = useState(pagoSugerido);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await onConfirmar(categoria, pago);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo contabilizar.');
      setGuardando(false);
    }
  };
  return (
    <Modal titulo={<><FileCheck2 className="w-4 h-4 text-emerald-400" /> Contabilizar compra</>} onClose={onClose}>
      <div className="px-3 py-2.5 rounded-xl bg-[#121215] border border-[#24242B] text-[11px] space-y-0.5">
        <div className="text-white font-semibold truncate">{c.emisor.nombreComercial || c.emisor.razonSocial}</div>
        <div className="text-neutral-400 font-mono">
          {tipoDe(c.tipo).nombre} {c.numero} · {diaEc(c.fechaEmision)}
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-neutral-400">IVA {formatMoney(c.totales.iva)}</span>
          <span className="font-mono font-bold text-white">{formatMoney(c.totales.total)}</span>
        </div>
      </div>
      <label className="block">
        <span className={ui.label}>Categoría del gasto</span>
        <UiSelect value={categoria} onChange={e => setCategoria(e.target.value as ExpenseCategory)} className={ui.input}>
          {CATEGORIAS.map(x => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </UiSelect>
      </label>
      <label className="block">
        <span className={ui.label}>Forma de pago</span>
        <UiSelect value={pago} onChange={e => setPago(e.target.value as ExpenseRecord['paymentMethod'])} className={ui.input}>
          {PAGOS.map(x => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </UiSelect>
      </label>
      <p className="text-[10px] text-neutral-500">Se registra en Gastos & Compras con su clave de acceso; el libro diario genera el asiento y el comprobante queda marcado como contabilizado.</p>
      {error && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-[11px]">{error}</div>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className={ui.btn}>
          Cancelar
        </button>
        <button type="button" onClick={confirmar} disabled={guardando} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          <FileCheck2 className="w-3.5 h-3.5" /> {guardando ? 'Guardando…' : 'Contabilizar'}
        </button>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------------ claves fallidas
export const ClavesFallidasModal: React.FC<{ onReintentar: (claves: string[]) => Promise<void>; onClose: () => void }> = ({ onReintentar, onClose }) => {
  const [items, setItems] = useState<ClavePendiente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  useEffect(() => {
    sriApi.clavesFallidas().then(r => setItems(r.items)).catch(e => setError(e.message));
  }, []);
  const reintentables = (items || []).filter(i => !['CLAVE_INVALIDA', 'OTRO_RECEPTOR'].includes(i.ultimoError?.tipo || ''));
  return (
    <Modal titulo={<><AlertTriangle className="w-4 h-4 text-red-300" /> Claves que no se pudieron traer</>} ancho="max-w-3xl" onClose={onClose}>
      {error && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-[11px]">{error}</div>}
      {!items && !error && <p className="text-xs text-neutral-500 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando…</p>}
      {items && items.length === 0 && <p className="text-xs text-neutral-500">No hay claves fallidas.</p>}
      {items && items.length > 0 && (
        <>
          <p className="text-[11px] text-neutral-400">
            "No existe" suele significar que el comprobante aún no está autorizado o que la clave se copió mal. Puede reintentarlas: vuelven a la cola y se consultan en la próxima sincronización.
          </p>
          <div className="rounded-xl border border-[#24242B] divide-y divide-[#222228] max-h-[50vh] overflow-y-auto ink-scroll">
            {items.map(i => (
              <div key={i.claveAcceso} className="px-3 py-2 text-[11px] flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-neutral-300 break-all">{i.claveAcceso}</div>
                  <div className="text-neutral-500">
                    {tipoDe(i.tipo).nombre} · emitido {diaEc(i.fechaEmision)} · {i.intentos} intento(s) · {fechaHora(i.ultimoError?.en)}
                  </div>
                </div>
                <div className="sm:text-right sm:max-w-[45%]">
                  <span className={`${ui.badge} bg-red-500/10 border-red-500/30 text-red-300`}>{ERRORES[i.ultimoError?.tipo || ''] || i.ultimoError?.tipo}</span>
                  <div className="text-neutral-400 mt-0.5">{i.ultimoError?.mensaje}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!reintentables.length || trabajando}
              onClick={async () => {
                setTrabajando(true);
                await onReintentar(reintentables.map(i => i.claveAcceso)).finally(() => setTrabajando(false));
              }}
              className={ui.btn}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reintentar {reintentables.length} y sincronizar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

// ------------------------------------------------------------------ buzón de correo
const SERVIDORES: { nombre: string; host: string; nota: string }[] = [
  { nombre: 'Gmail', host: 'imap.gmail.com', nota: 'Active la verificación en 2 pasos y cree una "contraseña de aplicación".' },
  { nombre: 'Outlook / Hotmail', host: 'outlook.office365.com', nota: 'Use una contraseña de aplicación si tiene verificación en 2 pasos.' },
  { nombre: 'Yahoo', host: 'imap.mail.yahoo.com', nota: 'Requiere contraseña de aplicación.' },
];

export const CorreoModal: React.FC<{ onGuardado: () => void; onClose: () => void }> = ({ onGuardado, onClose }) => {
  const [cargando, setCargando] = useState(true);
  const [cifrado, setCifrado] = useState(true);
  const [cfg, setCfg] = useState({ activo: true, host: 'imap.gmail.com', puerto: 993, seguro: true, usuario: '', contrasena: '', carpeta: 'INBOX', diasAtras: 30 });
  const [tieneContrasena, setTieneContrasena] = useState(false);
  const [estadoLectura, setEstadoLectura] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [trabajando, setTrabajando] = useState<'probar' | 'guardar' | 'leer' | null>(null);

  useEffect(() => {
    sriApi
      .obtenerCorreo()
      .then(r => {
        setCifrado(r.cifradoDisponible);
        if (r.correo) {
          const c = r.correo;
          setCfg({ activo: c.activo, host: c.host, puerto: c.puerto, seguro: c.seguro, usuario: c.usuario, contrasena: '', carpeta: c.carpeta, diasAtras: c.diasAtras });
          setTieneContrasena(c.tieneContrasena);
          setEstadoLectura(
            c.ultimoError
              ? `Último error: ${c.ultimoError}`
              : c.ultimaLectura
              ? `Última lectura: ${fechaHora(c.ultimaLectura)} · ${c.ultimoResultado?.mensajes ?? 0} correos, ${c.ultimoResultado?.claves ?? 0} claves`
              : 'Todavía no se ha leído el buzón.'
          );
        }
      })
      .catch(e => setMsg({ ok: false, texto: e.message }))
      .finally(() => setCargando(false));
  }, []);

  const datos = () => ({ host: cfg.host.trim(), puerto: Number(cfg.puerto) || 993, seguro: cfg.seguro, usuario: cfg.usuario.trim(), contrasena: cfg.contrasena || undefined, carpeta: cfg.carpeta.trim() || 'INBOX' });
  const nota = SERVIDORES.find(s => s.host === cfg.host)?.nota;

  return (
    <Modal titulo="Buzón de correo de comprobantes" ancho="max-w-lg" onClose={onClose}>
      <p className="text-[11px] text-neutral-400">
        Los proveedores están obligados a enviarle el XML de cada comprobante. Si llegan a un correo, el sistema lo lee <strong className="text-neutral-200">en solo lectura</strong> (no marca ni
        borra nada), toma las claves de acceso y descarga el XML oficial del SRI.
      </p>
      {!cifrado && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px]">
          Falta <span className="font-mono">SRI_SECRET_KEY</span> en el archivo <span className="font-mono">.env</span> del servidor: sin ella no se puede guardar la contraseña de forma segura.
        </div>
      )}
      {cargando ? (
        <p className="text-xs text-neutral-500 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando…</p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <input type="checkbox" checked={cfg.activo} onChange={e => setCfg(c => ({ ...c, activo: e.target.checked }))} />
            Leer este buzón al sincronizar
          </label>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <label className="block">
              <span className={ui.label}>Servidor IMAP</span>
              <input list="servidores-imap" value={cfg.host} onChange={e => setCfg(c => ({ ...c, host: e.target.value }))} placeholder="Ej: imap.gmail.com" className={ui.input} />
              <datalist id="servidores-imap">
                {SERVIDORES.map(s => (
                  <option key={s.host} value={s.host}>
                    {s.nombre}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className={ui.label}>Puerto</span>
              <input type="number" value={cfg.puerto || ''} onChange={e => setCfg(c => ({ ...c, puerto: Number(e.target.value) }))} placeholder="993" className={`${ui.input} font-mono text-right`} />
            </label>
          </div>
          {nota && <p className="text-[10px] text-blue-300">{nota}</p>}
          <label className="block">
            <span className={ui.label}>Usuario (correo)</span>
            <input value={cfg.usuario} onChange={e => setCfg(c => ({ ...c, usuario: e.target.value }))} placeholder="Ej: facturas@tuestudio.com" className={ui.input} autoComplete="off" />
          </label>
          <label className="block">
            <span className={ui.label}>Contraseña {tieneContrasena && <span className="normal-case text-emerald-300">· guardada (cifrada); deje vacío para mantenerla</span>}</span>
            <input type="password" value={cfg.contrasena} onChange={e => setCfg(c => ({ ...c, contrasena: e.target.value }))} placeholder={tieneContrasena ? '••••••••' : 'Contraseña de aplicación'} className={ui.input} autoComplete="new-password" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={ui.label}>Carpeta</span>
              <input value={cfg.carpeta} onChange={e => setCfg(c => ({ ...c, carpeta: e.target.value }))} placeholder="INBOX" className={ui.input} />
            </label>
            <label className="block">
              <span className={ui.label}>Primera lectura: días atrás</span>
              <input type="number" value={cfg.diasAtras || ''} onChange={e => setCfg(c => ({ ...c, diasAtras: Number(e.target.value) }))} placeholder="30" className={`${ui.input} font-mono text-right`} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={cfg.seguro} onChange={e => setCfg(c => ({ ...c, seguro: e.target.checked }))} />
            Conexión segura TLS (recomendado, puerto 993)
          </label>
          {estadoLectura && <p className="text-[10px] text-neutral-500">{estadoLectura}</p>}
          {msg && <div className={`p-2 rounded-lg border text-[11px] ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>{msg.texto}</div>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={trabajando !== null}
              onClick={async () => {
                setTrabajando('probar');
                setMsg(null);
                const r = await sriApi.probarCorreo(datos()).catch(e => ({ ok: false as const, error: e.message }));
                setMsg(r.ok ? { ok: true, texto: `Conexión correcta: la carpeta tiene ${r.mensajes} correos.` } : { ok: false, texto: r.error });
                setTrabajando(null);
              }}
              className={ui.btn}
            >
              {trabajando === 'probar' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null} Probar conexión
            </button>
            {tieneContrasena && (
              <button
                type="button"
                disabled={trabajando !== null}
                onClick={async () => {
                  setTrabajando('leer');
                  setMsg(null);
                  const r = await sriApi.leerCorreo().catch(e => ({ error: e.message } as any));
                  setMsg(
                    r.error || r.omitido
                      ? { ok: false, texto: r.error || r.omitido }
                      : { ok: true, texto: `${r.mensajes} correos nuevos, ${r.xmls} XML, ${r.claves} claves (${r.encoladas} a la cola, ${r.yaRegistradas} ya registradas).` }
                  );
                  setTrabajando(null);
                  onGuardado();
                }}
                className={ui.btn}
              >
                {trabajando === 'leer' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null} Leer ahora
              </button>
            )}
            <button
              type="button"
              disabled={trabajando !== null || !cifrado}
              onClick={async () => {
                setTrabajando('guardar');
                setMsg(null);
                try {
                  const r = await sriApi.guardarCorreo({ ...datos(), activo: cfg.activo, diasAtras: Number(cfg.diasAtras) || 30 });
                  setTieneContrasena(Boolean(r.correo?.tieneContrasena));
                  setCfg(c => ({ ...c, contrasena: '' }));
                  setMsg({ ok: true, texto: 'Buzón guardado. Se leerá en cada sincronización.' });
                  onGuardado();
                } catch (e) {
                  setMsg({ ok: false, texto: e instanceof Error ? e.message : String(e) });
                }
                setTrabajando(null);
              }}
              className={ui.btnPrimario}
            >
              <Save className="w-3.5 h-3.5" /> Guardar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

// ------------------------------------------------------------------ sincronización automática
export const AutoSyncModal: React.FC<{ actual: ConfigAutomatica | null; onGuardar: (cfg: ConfigAutomatica) => Promise<void>; onClose: () => void }> = ({ actual, onGuardar, onClose }) => {
  const [cfg, setCfg] = useState<ConfigAutomatica>(actual || { activa: false, cadaMinutos: 60, horaInicio: '08:00', horaFin: '20:00' });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  return (
    <Modal titulo="Sincronización automática" onClose={onClose}>
      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
        <input type="checkbox" checked={cfg.activa} onChange={e => setCfg(c => ({ ...c, activa: e.target.checked }))} />
        Sincronizar automáticamente mientras el sistema esté encendido
      </label>
      <label className="block">
        <span className={ui.label}>Cada</span>
        <UiSelect value={cfg.cadaMinutos} onChange={e => setCfg(c => ({ ...c, cadaMinutos: Number(e.target.value) }))} className={ui.input} disabled={!cfg.activa}>
          {[15, 30, 60, 120, 240, 480, 1440].map(m => (
            <option key={m} value={m}>
              {m < 60 ? `${m} minutos` : m === 1440 ? '1 vez al día' : `${m / 60} hora(s)`}
            </option>
          ))}
        </UiSelect>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={ui.label}>Desde</span>
          <TimePicker value={cfg.horaInicio} onChange={v => setCfg(c => ({ ...c, horaInicio: v }))} className={ui.input} disabled={!cfg.activa} />
        </label>
        <label className="block">
          <span className={ui.label}>Hasta</span>
          <TimePicker value={cfg.horaFin} onChange={v => setCfg(c => ({ ...c, horaFin: v }))} className={ui.input} disabled={!cfg.activa} />
        </label>
      </div>
      <p className="text-[10px] text-neutral-500">
        Lee el buzón de correo (si está configurado), procesa las claves en cola y reintenta las que fallaron por el SRI. Funciona mientras el sistema esté encendido; para que arranque con Windows use <span className="font-mono">scripts\windows\instalar-inicio-automatico.ps1</span>.
      </p>
      {error && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-[11px]">{error}</div>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={ui.btn}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={async () => {
            setGuardando(true);
            setError(null);
            try {
              await onGuardar(cfg);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo guardar.');
              setGuardando(false);
            }
          }}
          className={ui.btnPrimario}
        >
          <Save className="w-3.5 h-3.5" /> Guardar
        </button>
      </div>
    </Modal>
  );
};
