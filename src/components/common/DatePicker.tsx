/**
 * Calendario y selector de hora propios del sistema (reemplazan a los nativos del navegador).
 *  - <CalendarPanel>  calendario en línea (lo usan el selector y el mini-calendario del encabezado)
 *  - <DatePicker>     campo de fecha con calendario desplegable · valor 'YYYY-MM-DD'
 *  - <TimePicker>     campo de hora con selector de horas/minutos · valor 'HH:mm'
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

// ------------------------------------------------------------------ utilidades de fecha (hora local)
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const WEEKDAYS_LONG = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => toDateKey(new Date());
export const parseDateKey = (v?: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
/** "mié, 5 nov 2026" */
export const formatDateEs = (v?: string) => {
  const d = parseDateKey(v);
  return d ? `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` : '';
};

/** Celdas del mes empezando en lunes (6 semanas fijas para que no salte la altura). */
const monthCells = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
};

// ------------------------------------------------------------------ calendario en línea
export interface CalendarPanelProps {
  value?: string;
  onSelect: (value: string) => void;
  min?: string;
  max?: string;
  /** Marca con un punto los días que tienen algo (p. ej. citas) */
  markedDays?: Set<string> | Record<string, number>;
  footer?: React.ReactNode;
  className?: string;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ value, onSelect, min, max, markedDays, footer, className = '' }) => {
  const selected = parseDateKey(value);
  const base = selected || parseDateKey(max && todayKey() > max ? max : min && todayKey() < min ? min : undefined) || new Date();
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');
  const today = todayKey();

  useEffect(() => {
    if (selected) setView({ year: selected.getFullYear(), month: selected.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const outOfRange = (key: string) => Boolean((min && key < min) || (max && key > max));
  const marks = (key: string): number => {
    if (!markedDays) return 0;
    if (markedDays instanceof Set) return markedDays.has(key) ? 1 : 0;
    return markedDays[key] || 0;
  };

  const shift = (delta: number) => {
    if (mode === 'days') {
      const d = new Date(view.year, view.month + delta, 1);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      setView(v => ({ ...v, year: v.year + delta * (mode === 'years' ? 12 : 1) }));
    }
  };

  const yearStart = view.year - (view.year % 12);
  const navBtn =
    'w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#FF3366]/15 transition-colors cursor-pointer';

  return (
    <div className={`ink-calendar select-none ${className}`}>
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" onClick={() => shift(-1)} className={navBtn} aria-label="Anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode(m => (m === 'days' ? 'months' : m === 'months' ? 'years' : 'days'))}
          className="flex items-baseline gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#25252E] cursor-pointer"
          title="Cambiar mes / año"
        >
          {mode === 'days' && <span className="text-sm font-black text-white tracking-tight">{MONTHS[view.month]}</span>}
          <span className="text-xs font-mono font-bold text-[#FF3366]">
            {mode === 'years' ? `${yearStart} – ${yearStart + 11}` : view.year}
          </span>
        </button>
        <button type="button" onClick={() => shift(1)} className={navBtn} aria-label="Siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {mode === 'days' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={`text-center text-[10px] font-bold uppercase tracking-wider ${i >= 5 ? 'text-[#FF3366]/70' : 'text-neutral-500'}`}>
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells(view.year, view.month).map(d => {
              const key = toDateKey(d);
              const inMonth = d.getMonth() === view.month;
              const isSel = key === value;
              const isToday = key === today;
              const disabled = outOfRange(key);
              const count = marks(key);
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(key)}
                  className={`relative h-8 rounded-xl text-xs font-mono font-semibold flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                    isSel
                      ? 'bg-gradient-to-br from-[#FF3366] to-[#C81E4E] text-white shadow-[0_4px_14px_rgba(255,51,102,0.45)] scale-105'
                      : disabled
                      ? 'text-neutral-700 line-through'
                      : isToday
                      ? 'text-white ring-1 ring-inset ring-[#FF3366] bg-[#FF3366]/10 hover:bg-[#FF3366]/20'
                      : inMonth
                      ? `${weekend ? 'text-[#FF8FAB]' : 'text-neutral-200'} hover:bg-[#25252E] hover:text-white`
                      : 'text-neutral-600 hover:bg-[#1E1E25]'
                  }`}
                >
                  {d.getDate()}
                  {count > 0 && !isSel && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF3366] shadow-[0_0_4px_#FF3366]" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === 'months' && (
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((m, i) => {
            const isCur = selected && selected.getFullYear() === view.year && selected.getMonth() === i;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setView(v => ({ ...v, month: i }));
                  setMode('days');
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  isCur ? 'bg-[#FF3366] text-white' : 'text-neutral-300 hover:bg-[#25252E] hover:text-white'
                }`}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'years' && (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => yearStart + i).map(y => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setView(v => ({ ...v, year: y }));
                setMode('months');
              }}
              className={`py-2.5 rounded-xl text-xs font-mono font-semibold cursor-pointer ${
                selected?.getFullYear() === y ? 'bg-[#FF3366] text-white' : 'text-neutral-300 hover:bg-[#25252E] hover:text-white'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {footer && <div className="mt-3 pt-3 border-t border-[#25252E]">{footer}</div>}
    </div>
  );
};

// ------------------------------------------------------------------ popover flotante (portal)
const usePopover = (open: boolean, close: () => void, width: number) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;
      const h = popRef.current?.offsetHeight || 340;
      const below = a.bottom + 6;
      const top = below + h > window.innerHeight - 8 && a.top - h - 6 > 8 ? a.top - h - 6 : below;
      const left = Math.min(Math.max(8, a.left), window.innerWidth - width - 8);
      setPos({ top, left });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!anchorRef.current?.contains(t) && !popRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);

  const render = (content: React.ReactNode) =>
    open
      ? createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, zIndex: 9999 }}
            className="ink-popover p-3 rounded-2xl bg-[#17171C] border border-[#2E2E38] shadow-[0_18px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,51,102,0.08)]"
          >
            <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-[#FF3366] to-transparent" />
            {content}
          </div>,
          document.body
        )
      : null;

  return { anchorRef, render };
};

/** Input invisible que conserva la validación `required` del formulario nativo */
const RequiredProxy: React.FC<{ value: string; required?: boolean }> = ({ value, required }) =>
  required ? (
    <input
      tabIndex={-1}
      aria-hidden
      required
      value={value}
      onChange={() => {}}
      className="absolute bottom-0 left-1/2 w-px h-px opacity-0 pointer-events-none"
    />
  ) : null;

const triggerBase = 'relative flex items-center gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

// ------------------------------------------------------------------ selector de fecha
export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Clases del campo (se conservan las de cada formulario) */
  className?: string;
  /** Permite borrar la fecha (por defecto, si no es obligatoria) */
  clearable?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = 'Seleccione una fecha',
  className = '',
  clearable,
}) => {
  const [open, setOpen] = useState(false);
  const close = useMemo(() => () => setOpen(false), []);
  const { anchorRef, render } = usePopover(open, close, 288);
  const canClear = clearable ?? !required;
  const today = todayKey();
  const todayAllowed = !((min && today < min) || (max && today > max));

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`${className} ${triggerBase} ${open ? '!border-[#FF3366]' : ''}`}
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-[#FF3366]" />
        <span className={`flex-1 truncate ${value ? '' : 'text-neutral-500'}`}>{value ? formatDateEs(value) : placeholder}</span>
      </button>
      <RequiredProxy value={value} required={required} />
      {render(
        <CalendarPanel
          value={value}
          min={min}
          max={max}
          onSelect={v => {
            onChange(v);
            setOpen(false);
          }}
          footer={
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={!todayAllowed}
                onClick={() => {
                  onChange(today);
                  setOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#FF3366]/15 text-[#FF3366] text-[11px] font-bold hover:bg-[#FF3366]/25 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Hoy
              </button>
              {canClear && value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              ) : (
                <span className="text-[10px] font-mono text-neutral-500">{formatDateEs(value || today)}</span>
              )}
            </div>
          }
        />
      )}
    </div>
  );
};

// ------------------------------------------------------------------ selector de hora
export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Intervalo de minutos (por defecto 5) */
  minuteStep?: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  required,
  disabled,
  placeholder = '--:--',
  className = '',
  minuteStep = 5,
}) => {
  const [open, setOpen] = useState(false);
  const close = useMemo(() => () => setOpen(false), []);
  const { anchorRef, render } = usePopover(open, close, 200);
  const [h, m] = /^\d{2}:\d{2}/.test(value || '') ? value.slice(0, 5).split(':') : ['', ''];
  const minutes = useMemo(() => {
    const list = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));
    if (m && !list.includes(m)) list.push(m);
    return list.sort();
  }, [minuteStep, m]);
  const hourCol = useRef<HTMLDivElement>(null);
  const minCol = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Centra la hora y el minuto elegidos dentro de cada columna (sin mover la página)
    const center = (col: HTMLDivElement | null) => {
      const el = col?.querySelector<HTMLElement>('[data-active="true"]');
      if (col && el) col.scrollTop = el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2;
    };
    const t = setTimeout(() => {
      center(hourCol.current);
      center(minCol.current);
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  const cell = (active: boolean) =>
    `w-full py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors ${
      active ? 'bg-gradient-to-br from-[#FF3366] to-[#C81E4E] text-white shadow-[0_3px_10px_rgba(255,51,102,0.4)]' : 'text-neutral-300 hover:bg-[#25252E] hover:text-white'
    }`;

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`${className} ${triggerBase} ${open ? '!border-[#FF3366]' : ''}`}
      >
        <Clock className="w-3.5 h-3.5 shrink-0 text-[#FF3366]" />
        <span className={`flex-1 font-mono ${value ? '' : 'text-neutral-500'}`}>{value ? value.slice(0, 5) : placeholder}</span>
      </button>
      <RequiredProxy value={value} required={required} />
      {render(
        <div className="select-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Hora</span>
            <span className="text-sm font-mono font-black text-white">
              {h || '--'}
              <span className="text-[#FF3366]">:</span>
              {m || '--'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div ref={hourCol} className="relative h-48 overflow-y-auto space-y-0.5 pr-1 ink-scroll">
              {HOURS.map(x => (
                <button key={x} type="button" data-active={x === h} onClick={() => onChange(`${x}:${m || '00'}`)} className={cell(x === h)}>
                  {x}
                </button>
              ))}
            </div>
            <div ref={minCol} className="relative h-48 overflow-y-auto space-y-0.5 pr-1 ink-scroll">
              {minutes.map(x => (
                <button
                  key={x}
                  type="button"
                  data-active={x === m}
                  onClick={() => {
                    onChange(`${h || '09'}:${x}`);
                    setOpen(false);
                  }}
                  className={cell(x === m)}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#25252E] flex justify-between">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(`${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / minuteStep) * minuteStep)}`);
                setOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#FF3366]/15 text-[#FF3366] text-[11px] font-bold hover:bg-[#FF3366]/25 cursor-pointer"
            >
              Ahora
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-neutral-400 hover:text-white cursor-pointer">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
