import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

/**
 * Desplegable único del sistema.
 *
 * Reemplaza al <select> nativo con la MISMA interfaz (value, onChange(e.target.value), <option>,
 * <optgroup>, disabled, required…), pero con un diseño propio: lista flotante con bordes
 * redondeados, resaltado en rosa, marca de selección, navegación por teclado, búsqueda
 * automática en listas largas y posicionamiento inteligente (sube si no hay espacio abajo).
 */

interface Opt {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

const textOf = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return '';
};

function collect(children: React.ReactNode, group: string | undefined, out: Opt[]) {
  React.Children.forEach(children, child => {
    if (!React.isValidElement(child)) return;
    const el = child as React.ReactElement<any>;
    if (el.type === 'option') {
      if (el.props.hidden) return;
      const label = textOf(el.props.children);
      out.push({
        value: el.props.value !== undefined ? String(el.props.value) : label,
        label,
        disabled: Boolean(el.props.disabled),
        group,
      });
    } else if (el.type === 'optgroup') {
      collect(el.props.children, el.props.label, out);
    } else if (el.type === React.Fragment) {
      collect(el.props.children, group, out);
    }
  });
}

/** Solo se conservan las clases de ubicación (ancho, márgenes…); el aspecto es siempre el mismo. */
const LAYOUT_TOKEN = /^(w-|min-w-|max-w-|flex-|grow|shrink|col-|row-|self-|justify-self|order-|basis-|-?m[trblxy]?-)/;
const layoutClasses = (className: string) =>
  className
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => LAYOUT_TOKEN.test(t.replace(/^(?:[a-z0-9]+:)+/, '')));

/** Campos angostos (p. ej. columna de IVA en una tabla): menos relleno para que el texto quepa */
const isNarrow = (className: string) => className.split(/\s+/).some(t => /^px-(0|0\.5|1|1\.5|2)$/.test(t));

const isCompact = (className: string) =>
  className.split(/\s+/).some(t => /^py-(0\.5|1|1\.5)$/.test(t) || /^text-\[(9|10|11)px\]$/.test(t));

// ---------------------------------------------------------------------------------------------
// Posicionamiento del menú flotante respecto de su disparador
// ---------------------------------------------------------------------------------------------
function useAnchoredPopup(open: boolean, anchor: React.RefObject<HTMLElement | null>, popup: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const update = useCallback(() => {
    if (anchor.current) setRect(anchor.current.getBoundingClientRect());
  }, [anchor]);

  useLayoutEffect(() => {
    if (open) update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (popup.current && e.target instanceof Node && popup.current.contains(e.target)) return;
      update();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popup.current?.contains(t) || anchor.current?.contains(t)) return;
      onOutside();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', update);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, update, anchor, popup, onOutside]);

  const style = useMemo<React.CSSProperties | null>(() => {
    if (!rect) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(rect.width, 200), vw - 16);
    const left = Math.max(8, Math.min(rect.left, vw - width - 8));
    const below = vh - rect.bottom - 10;
    const above = rect.top - 10;
    const up = below < 220 && above > below;
    const maxHeight = Math.min(340, Math.max(140, up ? above : below));
    return up ? { left, width, bottom: vh - rect.top + 6, maxHeight } : { left, width, top: rect.bottom + 6, maxHeight };
  }, [rect]);

  return style;
}

const POPUP_CLASS =
  'fixed z-[200] flex flex-col overflow-hidden rounded-xl border border-[#2F2F3B] bg-[#1A1A21] shadow-[0_18px_44px_rgba(0,0,0,0.6)] ui-pop';

// ---------------------------------------------------------------------------------------------
// UiSelect
// ---------------------------------------------------------------------------------------------
export interface UiSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'size' | 'defaultValue' | 'multiple'> {
  value?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Texto cuando no hay una opción seleccionada */
  placeholder?: string;
  /** Fuerza (o desactiva) el buscador. Por defecto aparece con más de 8 opciones. */
  searchable?: boolean;
  searchPlaceholder?: string;
}

export const UiSelect: React.FC<UiSelectProps> = ({
  value,
  onChange,
  children,
  className = '',
  placeholder = 'Seleccionar…',
  searchable,
  searchPlaceholder = 'Buscar…',
  disabled,
  required,
  title,
  id,
  name,
  autoFocus,
  ...rest
}) => {
  const options = useMemo(() => {
    const out: Opt[] = [];
    collect(children, undefined, out);
    return out;
  }, [children]);

  const current = value === undefined || value === null ? '' : Array.isArray(value) ? String(value[0] ?? '') : String(value);
  const selected = options.find(o => o.value === current);
  const isSearchable = searchable ?? options.length > 8;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ buf: '', t: 0 });

  const close = useCallback(() => setOpen(false), []);
  const popupStyle = useAnchoredPopup(open, triggerRef, popupRef, close);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const compact = isCompact(className);
  const narrow = isNarrow(className);
  const layout = layoutClasses(className);
  const hasWidth = layout.some(t => /^(?:[a-z0-9]+:)*w-/.test(t));

  const emit = (v: string) => {
    const target = { value: v, name, id } as unknown as HTMLSelectElement;
    onChange?.({
      target,
      currentTarget: target,
      type: 'change',
      preventDefault() {},
      stopPropagation() {},
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  const firstEnabled = (list: Opt[], from = 0, dir = 1) => {
    for (let i = from; i >= 0 && i < list.length; i += dir) if (!list[i].disabled) return i;
    return -1;
  };

  const openMenu = () => {
    if (disabled) return;
    setQuery('');
    const idx = options.findIndex(o => o.value === current && !o.disabled);
    setActive(idx >= 0 ? idx : firstEnabled(options));
    setOpen(true);
  };

  const pick = (o: Opt) => {
    if (o.disabled) return;
    if (o.value !== current) emit(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (delta: number) => {
    if (visible.length === 0) return;
    let i = active;
    for (let step = 0; step < visible.length; step++) {
      i = (i + delta + visible.length) % visible.length;
      if (!visible[i].disabled) {
        setActive(i);
        return;
      }
    }
  };

  // Mantiene la opción activa a la vista al navegar con el teclado
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // Al filtrar, se activa la primera coincidencia
  useEffect(() => {
    if (open && isSearchable) setActive(firstEnabled(visible));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const nav = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Home':
        if (!isSearchable) {
          e.preventDefault();
          setActive(firstEnabled(visible));
        }
        break;
      case 'End':
        if (!isSearchable) {
          e.preventDefault();
          setActive(firstEnabled(visible, visible.length - 1, -1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (visible[active]) pick(visible[active]);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        // Escribir una letra salta a la opción que empieza con ella (si no hay buscador)
        if (!isSearchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now();
          const t = typed.current;
          t.buf = now - t.t > 700 ? e.key.toLowerCase() : t.buf + e.key.toLowerCase();
          t.t = now;
          const idx = visible.findIndex(o => !o.disabled && o.label.toLowerCase().startsWith(t.buf));
          if (idx >= 0) setActive(idx);
        }
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    nav(e);
  };

  const longest = useMemo(() => options.reduce((a, o) => (o.label.length > a.length ? o.label : a), '').slice(0, 60), [options]);
  const showPlaceholder = !selected || selected.value === '';
  const label = selected ? selected.label : placeholder;

  const triggerCls = [
    'w-full flex items-center justify-between border text-left text-white transition-colors',
    'bg-[#121215] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    narrow ? 'gap-1 pl-2 pr-1.5' : compact ? 'gap-2 px-2.5' : 'gap-2 px-3',
    compact ? 'py-1 min-h-[28px] rounded-lg text-[11px]' : 'py-2 min-h-[36px] rounded-xl text-xs',
    open ? 'border-[#FF3366]/70 ring-2 ring-[#FF3366]/15' : 'border-[#2B2B36] hover:border-[#454556] focus-visible:border-[#FF3366]/70',
  ].join(' ');

  return (
    <div className={`relative max-w-full ${hasWidth ? 'block' : 'inline-block align-middle'} ${layout.join(' ')}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={rest['aria-label']}
        title={title}
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={triggerCls}
      >
        <span className="grid min-w-0 flex-1">
          <span className={`col-start-1 row-start-1 truncate ${showPlaceholder ? 'text-neutral-500' : ''}`}>{label}</span>
          {/* Reserva el ancho de la opción más larga (igual que el select nativo) */}
          <span aria-hidden className="col-start-1 row-start-1 invisible h-0 overflow-hidden whitespace-nowrap">
            {longest}
          </span>
        </span>
        <ChevronDown className={`${narrow ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-[#FF3366]' : 'text-neutral-400'}`} />
      </button>

      {/* Campo nativo oculto: conserva la validación `required` del formulario */}
      {required && (
        <select
          tabIndex={-1}
          aria-hidden
          required
          value={current}
          onChange={() => {}}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        >
          {options.map(o => (
            <option key={`${o.group || ''}-${o.value}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {open &&
        popupStyle &&
        createPortal(
          <div ref={popupRef} style={popupStyle} className={POPUP_CLASS}>
            {isSearchable && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2B2B36] bg-[#16161B] shrink-0">
                <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={nav}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
                />
              </div>
            )}
            <div ref={listRef} role="listbox" className="flex-1 min-h-0 overflow-y-auto p-1 ui-scroll">
              {visible.length === 0 ? (
                <div className="px-3 py-4 text-center text-[11px] text-neutral-500">Sin resultados</div>
              ) : (
                visible.map((o, i) => {
                  const isSel = o.value === current;
                  const isActive = i === active;
                  const showGroup = o.group && (i === 0 || visible[i - 1].group !== o.group);
                  return (
                    <React.Fragment key={`${o.group || ''}-${o.value}-${i}`}>
                      {showGroup && (
                        <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-bold text-neutral-500">{o.group}</div>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSel}
                        data-index={i}
                        disabled={o.disabled}
                        onMouseEnter={() => !o.disabled && setActive(i)}
                        onClick={() => pick(o)}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg text-left transition-colors ${
                          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
                        } ${
                          o.disabled
                            ? 'opacity-40 cursor-not-allowed text-neutral-400'
                            : isSel
                            ? 'bg-[#FF3366]/15 text-white font-semibold cursor-pointer'
                            : isActive
                            ? 'bg-[#25252E] text-white cursor-pointer'
                            : 'text-neutral-300 cursor-pointer'
                        } ${isSel && isActive ? 'bg-[#FF3366]/25' : ''}`}
                      >
                        <span className={`truncate ${o.value === '' ? 'text-neutral-500' : ''}`}>{o.label || '—'}</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />}
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// UiSuggestInput: campo de texto libre con lista de sugerencias (reemplaza al <datalist>)
// ---------------------------------------------------------------------------------------------
export interface UiSuggestion {
  value: string;
  /** Texto secundario (por ejemplo el RUC) */
  hint?: string;
}

interface UiSuggestInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'list'> {
  suggestions: UiSuggestion[];
}

export const UiSuggestInput: React.FC<UiSuggestInputProps> = ({ suggestions, className = '', onChange, onKeyDown, onFocus, value, ...rest }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const popupStyle = useAnchoredPopup(open, wrapRef, popupRef, close);

  const text = String(value ?? '').toLowerCase();
  const items = useMemo(
    () =>
      suggestions
        .filter((s, i, a) => a.findIndex(x => x.value === s.value) === i)
        .filter(s => !text || s.value.toLowerCase().includes(text) || (s.hint || '').toLowerCase().includes(text))
        .filter(s => s.value.toLowerCase() !== text)
        .slice(0, 30),
    [suggestions, text]
  );

  const choose = (s: UiSuggestion) => {
    const input = inputRef.current;
    if (input) {
      // Dispara el onChange de React con el valor elegido
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, s.value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        {...rest}
        ref={inputRef}
        value={value}
        autoComplete="off"
        className={className}
        onChange={e => {
          onChange?.(e);
          setOpen(true);
          setActive(0);
        }}
        onFocus={e => {
          onFocus?.(e);
          setOpen(true);
        }}
        onKeyDown={e => {
          onKeyDown?.(e);
          if (!open || items.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(a => (a + 1) % items.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(a => (a - 1 + items.length) % items.length);
          } else if (e.key === 'Enter' && items[active]) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {open &&
        items.length > 0 &&
        popupStyle &&
        createPortal(
          <div ref={popupRef} style={popupStyle} className={POPUP_CLASS}>
            <div role="listbox" className="flex-1 min-h-0 overflow-y-auto p-1 ui-scroll">
              {items.map((s, i) => (
                <button
                  key={s.value}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => choose(s)}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs text-left cursor-pointer transition-colors ${
                    i === active ? 'bg-[#25252E] text-white' : 'text-neutral-300'
                  }`}
                >
                  <span className="truncate">{s.value}</span>
                  {s.hint && <span className="text-[10px] text-neutral-500 font-mono shrink-0">{s.hint}</span>}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
