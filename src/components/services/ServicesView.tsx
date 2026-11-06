import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Sparkles, AlertTriangle, Save } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { usePermission } from '../../hooks/usePermission';
import { useAlertModal } from '../../context/AlertModalContext';
import { UiSelect } from '../common/UiSelect';
import { ServiceCategory, StudioService } from '../../types';
import { getServiceCatalog, serviceCategoryLabel } from '../../data/serviceCatalog';

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

const CATEGORIES: ServiceCategory[] = ['tattoo', 'piercing', 'other'];

interface FormState {
  name: string;
  category: ServiceCategory;
  description: string;
  price: string;
  priceWithVat: string;
  taxRate: number;
  hours: string;
  active: boolean;
}

const emptyForm = (taxRate: number): FormState => ({
  name: '',
  category: 'tattoo',
  description: '',
  price: '',
  priceWithVat: '',
  taxRate,
  hours: '',
  active: true,
});

/** Catálogo de servicios del estudio: sus precios son los únicos que acepta el POS. */
export const ServicesView: React.FC = () => {
  const { settings, updateSettings, formatMoney } = useStudio();
  const { can, guard } = usePermission();
  const { showConfirm } = useAlertModal();

  const standardVatRate =
    !settings.defaultTaxRate || settings.defaultTaxRate === 8 || settings.defaultTaxRate === 12 ? 15 : settings.defaultTaxRate;
  const catalog = getServiceCatalog(settings);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ServiceCategory>('all');
  const [editing, setEditing] = useState<StudioService | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(standardVatRate));
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter(s => categoryFilter === 'all' || s.category === categoryFilter)
      .filter(s => !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
  }, [catalog, query, categoryFilter]);

  const withoutPrice = catalog.filter(s => s.active && s.price <= 0).length;

  const save = (next: StudioService[]) => updateSettings({ serviceCatalog: next });

  const openNew = () => {
    if (!guard('services.create')) return;
    setEditing(null);
    setForm(emptyForm(standardVatRate));
    setError(null);
    setOpen(true);
  };

  const openEdit = (s: StudioService) => {
    if (!guard('services.edit')) return;
    setEditing(s);
    setForm({
      name: s.name,
      category: s.category,
      description: s.description || '',
      price: s.price ? String(s.price) : '',
      priceWithVat: s.price ? String(r2(s.price * (1 + s.taxRate / 100))) : '',
      taxRate: s.taxRate,
      hours: s.hours ? String(s.hours) : '',
      active: s.active,
    });
    setError(null);
    setOpen(true);
  };

  const setPrice = (value: string) => {
    const n = parseFloat(value);
    setForm(f => ({ ...f, price: value, priceWithVat: Number.isFinite(n) ? String(r2(n * (1 + f.taxRate / 100))) : '' }));
  };
  const setPriceWithVat = (value: string) => {
    const n = parseFloat(value);
    setForm(f => ({ ...f, priceWithVat: value, price: Number.isFinite(n) ? String(r2(n / (1 + f.taxRate / 100))) : '' }));
  };
  const setTax = (rate: number) => {
    setForm(f => {
      const n = parseFloat(f.price);
      return { ...f, taxRate: rate, priceWithVat: Number.isFinite(n) ? String(r2(n * (1 + rate / 100))) : '' };
    });
  };

  const submit = () => {
    const name = form.name.trim();
    const price = r2(parseFloat(form.price) || 0);
    if (!name) return setError('Ingrese el nombre del servicio.');
    if (price <= 0) return setError('Ingrese un precio mayor a $0.');
    if (catalog.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== editing?.id)) return setError('Ya existe un servicio con ese nombre.');
    const hours = parseFloat(form.hours);
    const data: StudioService = {
      id: editing?.id || `svc-${Date.now()}`,
      name,
      category: form.category,
      description: form.description.trim() || undefined,
      price,
      taxRate: form.taxRate,
      hours: form.category === 'tattoo' && hours > 0 ? hours : undefined,
      active: form.active,
    };
    save(editing ? catalog.map(s => (s.id === editing.id ? data : s)) : [...catalog, data]);
    setOpen(false);
  };

  const toggleActive = (s: StudioService) => {
    if (!guard('services.edit')) return;
    save(catalog.map(x => (x.id === s.id ? { ...x, active: !x.active } : x)));
  };

  const remove = (s: StudioService) => {
    if (!guard('services.delete')) return;
    showConfirm({
      title: 'Eliminar servicio',
      message: `¿Eliminar "${s.name}" del catálogo? Las ventas ya emitidas no se modifican.`,
      type: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: () => save(catalog.filter(x => x.id !== s.id)),
    });
  };

  const inputCls =
    'w-full px-3 py-2 bg-[#121215] border border-[#2B2B36] rounded-xl text-white text-xs focus:outline-none focus:border-[#FF3366]/60';

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF3366]" /> Catálogo de servicios
          </h2>
          <p className="text-[11px] text-neutral-400">Los precios definidos aquí son los que se cobran en el punto de venta. En el POS no se pueden modificar.</p>
        </div>
        {can('services.create') && (
          <button type="button" onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold cursor-pointer">
            <Plus className="w-4 h-4" /> Nuevo servicio
          </button>
        )}
      </div>

      {withoutPrice > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-[11px] flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {withoutPrice} servicio(s) activo(s) sin precio. No se podrán vender en el POS hasta que les asigne un precio.
        </div>
      )}

      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
        <div className="p-3 flex flex-wrap gap-2 border-b border-[#24242B]">
          <div className="relative flex-1 min-w-[200px]">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar servicio" className={`${inputCls} pl-8`} />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          </div>
          <UiSelect value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as typeof categoryFilter)} className={`${inputCls} w-auto min-w-[160px]`}>
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {serviceCategoryLabel(c)}
              </option>
            ))}
          </UiSelect>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[680px]">
            <thead className="bg-[#121215] text-[10px] uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="py-2 px-3 text-left">Servicio</th>
                <th className="py-2 px-3 text-left">Categoría</th>
                <th className="py-2 px-3 text-right">Precio s/IVA</th>
                <th className="py-2 px-3 text-right">IVA</th>
                <th className="py-2 px-3 text-right">Precio c/IVA</th>
                <th className="py-2 px-3 text-center">Estado</th>
                <th className="py-2 px-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    No hay servicios{query || categoryFilter !== 'all' ? ' con ese filtro' : ''}.
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className={s.active ? '' : 'opacity-50'}>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="text-[10px] text-neutral-500">
                        {s.description}
                        {s.hours ? `${s.description ? ' · ' : ''}${s.hours} h` : ''}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-neutral-300">{serviceCategoryLabel(s.category)}</td>
                    <td className={`py-2 px-3 text-right font-mono ${s.price > 0 ? 'text-white' : 'text-amber-300'}`}>{s.price > 0 ? formatMoney(s.price) : 'Sin precio'}</td>
                    <td className="py-2 px-3 text-right font-mono text-neutral-400">{s.taxRate}%</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#FF3366]">{s.price > 0 ? formatMoney(r2(s.price * (1 + s.taxRate / 100))) : '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        disabled={!can('services.edit')}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer disabled:cursor-default ${
                          s.active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400'
                        }`}
                      >
                        {s.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-1">
                        {can('services.edit') && (
                          <button type="button" onClick={() => openEdit(s)} className="p-1.5 rounded text-neutral-400 hover:text-white cursor-pointer" aria-label="Editar servicio">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {can('services.delete') && (
                          <button type="button" onClick={() => remove(s)} className="p-1.5 rounded text-neutral-500 hover:text-red-400 cursor-pointer" aria-label="Eliminar servicio">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#18181D] border border-[#272730] p-5 space-y-3" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{editing ? 'Editar servicio' : 'Nuevo servicio'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer" aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block">
              <span className="block text-[10px] uppercase text-neutral-400 mb-1">Nombre *</span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] uppercase text-neutral-400 mb-1">Categoría</span>
                <UiSelect value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ServiceCategory }))} className={inputCls}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {serviceCategoryLabel(c)}
                    </option>
                  ))}
                </UiSelect>
              </label>
              <label className="block">
                <span className="block text-[10px] uppercase text-neutral-400 mb-1">IVA</span>
                <UiSelect value={form.taxRate} onChange={e => setTax(parseFloat(e.target.value))} className={inputCls}>
                  {[standardVatRate, 5, 0].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </UiSelect>
              </label>
            </div>
            <label className="block">
              <span className="block text-[10px] uppercase text-neutral-400 mb-1">Descripción en la factura</span>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Si se deja vacío se usa el nombre" className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] uppercase text-neutral-400 mb-1">Precio sin IVA *</span>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={`${inputCls} font-mono text-right`} />
              </label>
              <label className="block">
                <span className="block text-[10px] uppercase text-neutral-400 mb-1">Precio con IVA</span>
                <input type="number" min="0" step="0.01" value={form.priceWithVat} onChange={e => setPriceWithVat(e.target.value)} placeholder="0.00" className={`${inputCls} font-mono text-right`} />
              </label>
            </div>
            {form.category === 'tattoo' && (
              <label className="block">
                <span className="block text-[10px] uppercase text-neutral-400 mb-1">Horas estimadas</span>
                <input type="number" min="0" step="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} className={`${inputCls} font-mono text-right`} />
              </label>
            )}
            <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              Disponible para la venta en el POS
            </label>
            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-[11px] flex gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-[#2B2B36] text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={submit} className="px-4 py-2 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
