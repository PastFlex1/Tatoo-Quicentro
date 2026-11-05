import React, { useMemo, useState } from 'react';
import { UiSelect } from '../common/UiSelect';
import { AlertTriangle, FileSignature, Printer, Search, X, Eye, Baby } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ClientProfile, ConsentForm } from '../../types';
import { ALLERGIES, PROCEDURE_TYPES, ageFrom, flagLabel, labelFor, riskFlagsOf } from '../../data/consentCatalog';

const healthOf = (c: ClientProfile) => c.healthSheet;

const allergyText = (c: ClientProfile) => {
  const h = healthOf(c);
  if (h) {
    const list = [...h.allergies.map(labelFor), h.allergiesOther].filter(Boolean);
    return list.length ? list.join(', ') : 'Ninguna';
  }
  return c.allergies || 'Sin ficha';
};

const conditionText = (c: ClientProfile) => {
  const h = healthOf(c);
  if (h) {
    const list = [...h.conditions.map(labelFor), ...h.medications.map(labelFor), h.conditionsDetail, h.medicationsDetail].filter(Boolean);
    return list.length ? list.join(', ') : 'Ninguna';
  }
  return c.medicalConditions || 'Sin ficha';
};

const flagsOf = (c: ClientProfile) => (c.healthSheet ? riskFlagsOf(c.healthSheet).filter(f => !['alcohol', 'ayuno', 'sol', 'enfermo'].includes(f)) : []);

// =====================================================================================
// NÓMINA DE CONTROL DE ALERGIAS Y SALUD
// =====================================================================================
export const HealthControlPanel: React.FC<{
  onNewConsent: (c: ClientProfile) => void;
  onViewForm: (f: ConsentForm) => void;
}> = ({ onNewConsent, onViewForm }) => {
  const { clients, settings } = useStudio();
  const [q, setQ] = useState('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [allergyFilter, setAllergyFilter] = useState('');
  const [printing, setPrinting] = useState(false);

  const rows = useMemo(
    () =>
      clients
        .filter(c => {
          const t = q.toLowerCase();
          if (t && !c.name.toLowerCase().includes(t) && !(c.dni || '').includes(t)) return false;
          const flags = flagsOf(c);
          const hasAllergy = c.healthSheet ? c.healthSheet.allergies.length > 0 || !!c.healthSheet.allergiesOther : !!c.allergies && !/ninguna/i.test(c.allergies);
          if (onlyAlerts && flags.length === 0 && !hasAllergy) return false;
          if (allergyFilter && !c.healthSheet?.allergies.includes(allergyFilter)) return false;
          return true;
        })
        .sort((a, b) => flagsOf(b).length - flagsOf(a).length || a.name.localeCompare(b.name)),
    [clients, q, onlyAlerts, allergyFilter]
  );

  const withoutSheet = clients.filter(c => !c.healthSheet).length;
  const withAlerts = clients.filter(c => flagsOf(c).length > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div className="text-[10px] uppercase text-neutral-400">Clientes con alertas médicas</div>
          <div className="text-xl font-bold font-mono text-red-300">{withAlerts}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div className="text-[10px] uppercase text-neutral-400">Sin ficha de salud completa</div>
          <div className="text-xl font-bold font-mono text-amber-300">{withoutSheet}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div className="text-[10px] uppercase text-neutral-400">Total en la nómina</div>
          <div className="text-xl font-bold font-mono text-white">{clients.length}</div>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente o cédula" className="w-full pl-9 pr-3 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:outline-none focus:border-[#FF3366]/60" />
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <UiSelect value={allergyFilter} onChange={e => setAllergyFilter(e.target.value)} className="px-3 py-2 bg-[#121215] border border-[#272730] rounded-full text-white">
            <option value="">Todas las alergias</option>
            {ALLERGIES.map(a => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </UiSelect>
          <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={onlyAlerts} onChange={e => setOnlyAlerts(e.target.checked)} />
            Solo con alertas
          </label>
          <button onClick={() => setPrinting(true)} className="px-3.5 py-2 rounded-full border border-[#272730] bg-[#121215] hover:border-[#FF3366]/60 text-white font-semibold flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
            Imprimir nómina
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[980px]">
          <thead className="bg-[#121215] text-[10px] uppercase tracking-wider text-neutral-400">
            <tr>
              <th className="py-2.5 px-4">Cliente</th>
              <th className="py-2.5 px-3">Edad</th>
              <th className="py-2.5 px-3">Alergias</th>
              <th className="py-2.5 px-3">Condiciones / medicamentos</th>
              <th className="py-2.5 px-3">Sangre</th>
              <th className="py-2.5 px-3">Alertas</th>
              <th className="py-2.5 px-3">Ficha / consentimientos</th>
              <th className="py-2.5 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222228]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-neutral-500">
                  No hay clientes que coincidan.
                </td>
              </tr>
            ) : (
              rows.map(c => {
                const flags = flagsOf(c);
                const age = ageFrom(c.birthDate);
                const last = (c.consentForms || [])[0];
                return (
                  <tr key={c.id} className="hover:bg-[#1E1E25] align-top">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{c.dni || 'Sin cédula'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300 whitespace-nowrap">
                      {age ?? '—'}
                      {age !== undefined && age < 18 && <Baby className="inline w-3.5 h-3.5 ml-1 text-amber-300" />}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-200 max-w-[200px]">{allergyText(c)}</td>
                    <td className="py-2.5 px-3 text-neutral-300 max-w-[220px]">{conditionText(c)}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-300">{c.healthSheet?.bloodType || c.bloodType || '—'}</td>
                    <td className="py-2.5 px-3">
                      {flags.length === 0 ? (
                        <span className="text-emerald-400 text-[11px]">Sin alertas</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {flags.map(f => (
                            <span key={f} className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30 text-[10px]">
                              {flagLabel(f)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-neutral-400 whitespace-nowrap">
                      {c.healthSheet ? new Date(c.healthSheet.updatedAt).toLocaleDateString('es-EC') : <span className="text-amber-300">Sin ficha</span>}
                      <div>{(c.consentForms || []).length} carta(s)</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => onNewConsent(c)} className="px-2.5 py-1.5 rounded-lg bg-[#FF3366]/15 border border-[#FF3366]/40 text-[#FF3366] text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap" title="Actualizar ficha y firmar nueva carta">
                          <FileSignature className="w-3.5 h-3.5" />
                          Ficha + carta
                        </button>
                        {last && (
                          <button onClick={() => onViewForm(last)} className="p-1.5 rounded-lg border border-[#272730] text-neutral-300 hover:text-white cursor-pointer" title={`Ver carta ${last.number}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Versión imprimible */}
      {printing && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } #printable-receipt { padding: 0 !important; font-size: 9.5px !important; } }`}</style>
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3 flex justify-between items-center border-b border-[#25252E] bg-[#121215]">
              <span className="text-sm font-bold text-white">Nómina de control de alergias y salud</span>
              <button onClick={() => setPrinting(false)} className="p-1.5 text-neutral-400 hover:text-white cursor-pointer" aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto p-4 bg-neutral-700/30">
              <div id="printable-receipt" className="bg-white text-black p-6 text-[10px]">
                <div className="flex justify-between border-b-2 border-black pb-1 mb-2">
                  <div>
                    <div className="font-bold text-[13px] uppercase">{settings.nombreComercial || settings.studioName}</div>
                    <div className="font-bold">NÓMINA DE CONTROL DE ALERGIAS, CONDICIONES MÉDICAS Y CONTRAINDICACIONES</div>
                  </div>
                  <div className="text-right">
                    <div>Fecha: {new Date().toLocaleDateString('es-EC')}</div>
                    <div>{rows.length} cliente(s){onlyAlerts ? ' · solo con alertas' : ''}</div>
                  </div>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neutral-200">
                      {['#', 'Cliente', 'C.I.', 'Edad', 'Alergias', 'Condiciones / medicamentos', 'Sangre', 'Contraindicaciones', 'Emergencia', 'Última ficha'].map(h => (
                        <th key={h} className="border border-neutral-500 px-1.5 py-1 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c, i) => (
                      <tr key={c.id}>
                        <td className="border border-neutral-400 px-1.5 py-1">{i + 1}</td>
                        <td className="border border-neutral-400 px-1.5 py-1 font-semibold">{c.name}</td>
                        <td className="border border-neutral-400 px-1.5 py-1">{c.dni}</td>
                        <td className="border border-neutral-400 px-1.5 py-1">{ageFrom(c.birthDate) ?? ''}</td>
                        <td className="border border-neutral-400 px-1.5 py-1">{allergyText(c)}</td>
                        <td className="border border-neutral-400 px-1.5 py-1">{conditionText(c)}</td>
                        <td className="border border-neutral-400 px-1.5 py-1">{c.healthSheet?.bloodType || c.bloodType || ''}</td>
                        <td className="border border-neutral-400 px-1.5 py-1">{flagsOf(c).map(flagLabel).join(', ') || 'Ninguna'}</td>
                        <td className="border border-neutral-400 px-1.5 py-1">
                          {c.emergencyContactName ? `${c.emergencyContactName} ${c.emergencyContactPhone || ''}` : c.emergencyContact || ''}
                        </td>
                        <td className="border border-neutral-400 px-1.5 py-1">{c.healthSheet ? new Date(c.healthSheet.updatedAt).toLocaleDateString('es-EC') : 'Sin ficha'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[8px] text-neutral-600">Documento confidencial · datos de salud protegidos por la Ley Orgánica de Protección de Datos Personales.</p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[#25252E] bg-[#121215] flex justify-end">
              <button onClick={() => window.print()} className="px-5 py-2 rounded-full bg-[#FF3366] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================================
// REGISTRO DE CARTAS DE CONSENTIMIENTO
// =====================================================================================
export const ConsentRegistryPanel: React.FC<{ onViewForm: (f: ConsentForm) => void }> = ({ onViewForm }) => {
  const { clients } = useStudio();
  const [q, setQ] = useState('');
  const forms = useMemo(
    () =>
      clients
        .flatMap(c => c.consentForms || [])
        .filter(f => {
          const t = q.toLowerCase();
          return !t || f.clientName.toLowerCase().includes(t) || f.clientDni.includes(t) || f.number.toLowerCase().includes(t) || f.artistName.toLowerCase().includes(t);
        })
        .sort((a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime()),
    [clients, q]
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por N°, cliente, cédula o artista" className="w-full pl-9 pr-3 py-2 bg-[#121215] border border-[#272730] rounded-full text-xs text-white focus:outline-none focus:border-[#FF3366]/60" />
        <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2" />
      </div>
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[860px]">
          <thead className="bg-[#121215] text-[10px] uppercase tracking-wider text-neutral-400">
            <tr>
              <th className="py-2.5 px-4">N°</th>
              <th className="py-2.5 px-3">Firmada</th>
              <th className="py-2.5 px-3">Cliente</th>
              <th className="py-2.5 px-3">Procedimiento</th>
              <th className="py-2.5 px-3">Artista</th>
              <th className="py-2.5 px-3">Alertas</th>
              <th className="py-2.5 px-4 text-center">Carta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222228]">
            {forms.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-neutral-500">
                  Aún no hay cartas de consentimiento firmadas.
                </td>
              </tr>
            ) : (
              forms.map(f => (
                <tr key={f.id} className="hover:bg-[#1E1E25]">
                  <td className="py-2.5 px-4 font-mono font-bold text-white">{f.number}</td>
                  <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap">{new Date(f.signedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="py-2.5 px-3">
                    <div className="text-white font-semibold">{f.clientName}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {f.clientDni}
                      {f.isMinor && <span className="ml-1 text-amber-300">· menor con representante</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-300">
                    {PROCEDURE_TYPES.find(p => p.key === f.procedureType)?.label} · {f.bodyZone}
                    <div className="text-[10px] text-neutral-500 truncate max-w-[240px]">{f.procedureDescription}</div>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-300">{f.artistName}</td>
                  <td className="py-2.5 px-3">
                    {f.riskFlags.length ? (
                      <span className="text-amber-300 flex items-center gap-1" title={f.riskFlags.map(flagLabel).join(', ')}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {f.riskFlags.length}
                      </span>
                    ) : (
                      <span className="text-emerald-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => onViewForm(f)} className="p-1.5 rounded-lg border border-[#272730] text-neutral-300 hover:text-white hover:border-[#FF3366]/50 cursor-pointer" title="Ver / imprimir carta">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
