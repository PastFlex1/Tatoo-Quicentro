import React, { useMemo, useState } from 'react';
import { X, ShieldCheck, Search, AlertTriangle, Lock } from 'lucide-react';
import { SystemRole } from '../../types';
import { ADMIN_ROLE_ID, normalizePermissions, PERMISSION_MODULES, PermissionModule } from '../../data/permissions';

interface RoleEditorModalProps {
  isOpen: boolean;
  role: SystemRole | null; // null = nuevo rol
  /** Rol base para "duplicar" */
  template?: SystemRole | null;
  existingNames: string[];
  /** Solo lectura (usuario sin permiso para administrar roles) */
  readOnly?: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; color: string; permissions: string[] }) => void;
}

const COLORS = ['#FF3366', '#10B981', '#A855F7', '#F59E0B', '#3B82F6', '#06B6D4', '#EF4444', '#64748B'];

const GROUPS: PermissionModule['group'][] = [
  'Operación',
  'Facturación',
  'Compras e Inventario',
  'Finanzas y Contabilidad',
  'Administración',
];

export const RoleEditorModal: React.FC<RoleEditorModalProps> = ({ isOpen, role, template, existingNames, readOnly, onClose, onSave }) => {
  const base = role || template || null;
  const [name, setName] = useState(role ? role.name : template ? `${template.name} (copia)` : '');
  const [description, setDescription] = useState(base?.description || '');
  const [color, setColor] = useState(base?.color || COLORS[5]);
  const [perms, setPerms] = useState<Set<string>>(new Set(base?.permissions || []));
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isAdminRole = role?.id === ADMIN_ROLE_ID;
  const locked = isAdminRole || Boolean(readOnly);

  const q = query.trim().toLowerCase();
  const modules = useMemo(
    () =>
      PERMISSION_MODULES.map(m => ({
        ...m,
        actions: q
          ? m.actions.filter(a => a.label.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || a.key.includes(q))
          : m.actions,
      })).filter(m => m.actions.length > 0),
    [q]
  );

  if (!isOpen) return null;

  const toggle = (key: string, moduleId: string) => {
    if (locked) return;
    setPerms(prev => {
      const next = new Set(prev);
      const viewKey = `${moduleId}.view`;
      if (next.has(key)) {
        next.delete(key);
        // Sin "ver" no tiene sentido ninguna otra acción del módulo
        if (key === viewKey) PERMISSION_MODULES.find(m => m.id === moduleId)?.actions.forEach(a => next.delete(a.key));
      } else {
        next.add(key);
        next.add(viewKey);
      }
      return next;
    });
  };

  const setModule = (m: PermissionModule, on: boolean) => {
    if (locked) return;
    setPerms(prev => {
      const next = new Set(prev);
      m.actions.forEach(a => (on ? next.add(a.key) : next.delete(a.key)));
      return next;
    });
  };

  const setAll = (on: boolean) => {
    if (locked) return;
    setPerms(on ? new Set(PERMISSION_MODULES.flatMap(m => m.actions.map(a => a.key))) : new Set());
  };

  const total = PERMISSION_MODULES.reduce((acc, m) => acc + m.actions.length, 0);

  const handleSave = () => {
    const n = name.trim();
    if (!n) return setError('Escriba un nombre para el rol.');
    if (existingNames.some(x => x.toLowerCase() === n.toLowerCase())) return setError('Ya existe un rol con ese nombre.');
    const finalPerms = normalizePermissions([...perms]);
    if (finalPerms.length === 0) return setError('Asigne al menos un permiso.');
    onSave({ name: n, description: description.trim(), color, permissions: finalPerms });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[94vh] my-auto">
        {/* Encabezado */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#25252E] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF3366]/15 text-[#FF3366]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAdminRole ? 'Rol Administrador (bloqueado)' : locked ? `Permisos del rol: ${role?.name}` : role ? `Editar rol: ${role.name}` : 'Nuevo rol'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {perms.size} de {total} permisos concedidos
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {isAdminRole && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              El Administrador tiene siempre todos los permisos para que nunca se pierda el acceso al sistema.
            </div>
          )}

          {/* Datos del rol */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-3">
            <label className="block">
              <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Nombre del rol *</span>
              <input
                value={name}
                disabled={locked}
                onChange={e => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Ej. Supervisor de turno"
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white text-xs focus:border-[#FF3366]/60 focus:outline-none disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Descripción</span>
              <input
                value={description}
                disabled={locked}
                onChange={e => setDescription(e.target.value)}
                placeholder="Qué hace este rol"
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white text-xs focus:border-[#FF3366]/60 focus:outline-none disabled:opacity-60"
              />
            </label>
            <div>
              <span className="block text-[11px] font-semibold text-neutral-300 mb-1">Color</span>
              <div className="flex gap-1.5 py-1.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    disabled={locked}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer ${color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Herramientas */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar permiso…"
                className="w-full pl-3.5 pr-9 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:border-[#FF3366]/60 focus:outline-none"
              />
              <Search className="w-4 h-4 text-[#FF3366] absolute right-3 top-2" />
            </div>
            {!locked && (
              <div className="flex gap-2 text-[11px]">
                <button type="button" onClick={() => setAll(true)} className="px-3 py-1.5 rounded-full border border-[#272730] text-neutral-300 hover:text-white cursor-pointer">
                  Marcar todo
                </button>
                <button type="button" onClick={() => setAll(false)} className="px-3 py-1.5 rounded-full border border-[#272730] text-neutral-300 hover:text-white cursor-pointer">
                  Quitar todo
                </button>
              </div>
            )}
          </div>

          {/* Matriz de permisos */}
          {GROUPS.map(group => {
            const groupModules = modules.filter(m => m.group === group);
            if (groupModules.length === 0) return null;
            return (
              <div key={group} className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">{group}</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {groupModules.map(m => {
                    const full = PERMISSION_MODULES.find(x => x.id === m.id)!;
                    const granted = full.actions.filter(a => perms.has(a.key)).length;
                    const allOn = granted === full.actions.length;
                    return (
                      <div key={m.id} className="rounded-2xl border border-[#272730] bg-[#121215] overflow-hidden">
                        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-[#222228]">
                          <div>
                            <div className="text-xs font-bold text-white">{m.label}</div>
                            <div className="text-[10px] text-neutral-500">
                              {granted}/{full.actions.length} permisos
                            </div>
                          </div>
                          <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                            <input type="checkbox" checked={allOn} disabled={locked} onChange={e => setModule(full, e.target.checked)} />
                            Todo
                          </label>
                        </div>
                        <div className="divide-y divide-[#1E1E25]">
                          {m.actions.map(a => {
                            const isView = a.key === `${m.id}.view`;
                            const checked = perms.has(a.key);
                            return (
                              <label
                                key={a.key}
                                className={`flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer hover:bg-[#18181D] ${
                                  !isView && !perms.has(`${m.id}.view`) ? 'opacity-60' : ''
                                }`}
                              >
                                <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(a.key, m.id)} />
                                <span className={`flex-1 ${isView ? 'font-semibold text-white' : 'text-neutral-300'}`}>{a.label}</span>
                                {a.sensitive && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5" title={a.description || 'Acción sensible'}>
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Sensible
                                  </span>
                                )}
                                <code className="text-[9px] text-neutral-600 hidden sm:inline">{a.key}</code>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[#25252E] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-red-300 min-h-[1em]">{error}</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer">
              {locked ? 'Cerrar' : 'Cancelar'}
            </button>
            {!locked && (
              <button onClick={handleSave} className="px-6 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold cursor-pointer">
                {role ? 'Guardar cambios' : 'Crear rol'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
