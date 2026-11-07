import React, { useMemo, useState } from 'react';
import { UiSelect } from '../common/UiSelect';
import {
  X,
  User,
  HeartPulse,
  Syringe,
  ScrollText,
  PenLine,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldAlert,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { useAlertModal } from '../../context/AlertModalContext';
import { consultarIdentificacion } from '../../services/sriService';
import { ClientProfile, ConsentForm, ConsentGuardian, HealthSheet } from '../../types';
import {
  ALLERGIES,
  BODY_ZONES,
  CatalogItem,
  CONDITIONS,
  CURRENT_STATE,
  DECLARATIONS,
  MEDICATIONS,
  PROCEDURE_TYPES,
  ageFrom,
  emptyHealthSheet,
  flagLabel,
  labelFor,
  riskFlagsOf,
} from '../../data/consentCatalog';
import { SignaturePad } from './SignaturePad';
import { DatePicker } from '../common/DatePicker';

interface ConsentWizardModalProps {
  isOpen: boolean;
  initialClient?: ClientProfile | null;
  /** El usuario puede ver/firmar fichas de salud y consentimientos */
  canConsent?: boolean;
  onClose: () => void;
  onSaved: (form: ConsentForm) => void;
  /** Datos del procedimiento ya conocidos (p. ej. desde la cita que se está agendando) */
  initialProcedure?: {
    type?: ConsentForm['procedureType'];
    description?: string;
    zone?: string;
    artistId?: string;
    date?: string;
    price?: number;
  };
}

const STEPS = [
  { id: 1, label: 'Cliente', Icon: User },
  { id: 2, label: 'Ficha de salud', Icon: HeartPulse },
  { id: 3, label: 'Procedimiento', Icon: Syringe },
  { id: 4, label: 'Declaraciones', Icon: ScrollText },
  { id: 5, label: 'Firmas', Icon: PenLine },
];

const input =
  'w-full px-3 py-2 bg-[#121215] border border-[#2B2B36] rounded-xl text-white text-xs focus:outline-none focus:border-[#FF3366]/60';

const Field: React.FC<{ label: string; required?: boolean; error?: boolean; children: React.ReactNode; className?: string }> = ({
  label,
  required,
  error,
  children,
  className,
}) => (
  <label className={`block ${className || ''}`}>
    <span className={`block text-[11px] font-semibold mb-1 ${error ? 'text-red-300' : 'text-neutral-300'}`}>
      {label} {required && <span className="text-[#FF3366]">*</span>}
    </span>
    {children}
  </label>
);

/** Grupo de opciones tipo "chip" con botón explícito de "Ninguna". */
const ChipGroup: React.FC<{
  title: string;
  items: CatalogItem[];
  selected: string[];
  none: boolean;
  onToggle: (key: string) => void;
  onNone: () => void;
}> = ({ title, items, selected, none, onToggle, onNone }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-white">{title}</span>
      <button
        type="button"
        onClick={onNone}
        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
          none ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300' : 'border-[#2B2B36] text-neutral-400 hover:text-white'
        }`}
      >
        {none ? '✓ Ninguna' : 'Ninguna'}
      </button>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {items.map(it => {
        const on = selected.includes(it.key);
        return (
          <button
            type="button"
            key={it.key}
            onClick={() => onToggle(it.key)}
            title={it.hint}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] border cursor-pointer text-left ${
              on
                ? it.risk
                  ? 'bg-red-500/20 border-red-500/60 text-red-200'
                  : 'bg-[#FF3366]/20 border-[#FF3366]/60 text-white'
                : 'bg-[#121215] border-[#2B2B36] text-neutral-300 hover:border-[#3A3A48]'
            }`}
          >
            {on ? '✓ ' : ''}
            {it.label}
          </button>
        );
      })}
    </div>
  </div>
);

export const ConsentWizardModal: React.FC<ConsentWizardModalProps> = ({ isOpen, initialClient, canConsent = true, onClose, onSaved, initialProcedure }) => {
  const { clients, artists, addClient, updateClient, currentUser } = useStudio();
  const { showAlert } = useAlertModal();
  const [step, setStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  // ---- Paso 1: cliente
  const [clientId, setClientId] = useState<string | null>(
    initialClient && clients.some(c => c.id === initialClient.id) ? initialClient.id : null
  );
  const [search, setSearch] = useState('');
  const [name, setName] = useState(initialClient?.name || '');
  const [dni, setDni] = useState(initialClient?.dni || '');
  const [birthDate, setBirthDate] = useState(initialClient?.birthDate || '');
  const [gender, setGender] = useState<ClientProfile['gender']>(initialClient?.gender || '');
  const [phone, setPhone] = useState(initialClient?.phone || '');
  const [email, setEmail] = useState(initialClient?.email || '');
  const [address, setAddress] = useState(initialClient?.address || '');
  const [city, setCity] = useState(initialClient?.city || '');
  const [occupation, setOccupation] = useState(initialClient?.occupation || '');
  const [emName, setEmName] = useState(initialClient?.emergencyContactName || '');
  const [emPhone, setEmPhone] = useState(initialClient?.emergencyContactPhone || '');
  const [emRelation, setEmRelation] = useState(initialClient?.emergencyContactRelation || '');
  const [guardian, setGuardian] = useState<ConsentGuardian>({ name: '', dni: '', relationship: '', phone: '' });
  const [instagram, setInstagram] = useState(initialClient?.instagram || '');
  const [sri, setSri] = useState({
    tradeName: initialClient?.tradeName || '',
    regime: initialClient?.taxpayerRegime || '',
    type: initialClient?.taxpayerType || '',
    status: initialClient?.sriStatus || '',
    verified: Boolean(initialClient?.sriVerified),
  });
  const [sriLoading, setSriLoading] = useState(false);
  const [sriMsg, setSriMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Una ficha borrador (p. ej. desde Agendar cita con un cliente nuevo) no es una edición
  const isEdit = Boolean(initialClient && clients.some(c => c.id === initialClient.id));

  // ---- Paso 2: salud
  const [health, setHealth] = useState<HealthSheet>(() => ({
    ...emptyHealthSheet(),
    ...(initialClient?.healthSheet || {}),
    bloodType: initialClient?.healthSheet?.bloodType || initialClient?.bloodType || '',
  }));
  const [noneGroups, setNoneGroups] = useState<Record<string, boolean>>({});
  const [healthConfirmed, setHealthConfirmed] = useState(false);

  // ---- Paso 3: procedimiento
  const [procedureType, setProcedureType] = useState<ConsentForm['procedureType']>(initialProcedure?.type || 'tattoo');
  const [description, setDescription] = useState(initialProcedure?.description || '');
  // Zona recibida (texto libre de la cita): si coincide con una de la lista se elige; si no, va en "Otra"
  const initialZone = (initialProcedure?.zone || '').trim();
  const matchedZone = initialZone
    ? BODY_ZONES.find(z => z.toLowerCase() === initialZone.toLowerCase() || initialZone.toLowerCase().startsWith(z.toLowerCase()))
    : undefined;
  const [zone, setZone] = useState(matchedZone || (initialZone ? 'Otra' : ''));
  const [zoneOther, setZoneOther] = useState(matchedZone ? '' : initialZone);
  const [artistId, setArtistId] = useState(initialProcedure?.artistId || artists.find(a => a.active)?.id || '');
  const [procedureDate, setProcedureDate] = useState(() => {
    if (initialProcedure?.date) return initialProcedure.date;
    // Fecha local (no UTC) para que en Ecuador no salte al día siguiente en la noche
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [sessions, setSessions] = useState('1');
  const [price, setPrice] = useState(initialProcedure?.price ? String(initialProcedure.price) : '');
  const [jewelry, setJewelry] = useState('');
  const [riskNote, setRiskNote] = useState('');
  const [riskAck, setRiskAck] = useState(false);

  // ---- Paso 4 y 5
  const [declarations, setDeclarations] = useState<string[]>([]);
  const [photoAuth, setPhotoAuth] = useState(false);
  const [sigClient, setSigClient] = useState('');
  const [sigGuardian, setSigGuardian] = useState('');
  const [sigArtist, setSigArtist] = useState('');

  const age = ageFrom(birthDate);
  const isMinor = age !== undefined && age < 18;
  const riskFlags = useMemo(() => riskFlagsOf(health), [health]);
  const blockingNow = health.currentState.filter(k => ['alcohol', 'enfermo'].includes(k));
  const requiredDecl = DECLARATIONS.filter(d => d.required && (!d.minorOnly || isMinor));

  if (!isOpen) return null;

  const loadClient = (c: ClientProfile) => {
    setClientId(c.id);
    setName(c.name || '');
    setDni(c.dni || '');
    setBirthDate(c.birthDate || '');
    setGender(c.gender || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCity(c.city || '');
    setOccupation(c.occupation || '');
    setEmName(c.emergencyContactName || c.emergencyContact || '');
    setEmPhone(c.emergencyContactPhone || '');
    setEmRelation(c.emergencyContactRelation || '');
    setHealth({ ...emptyHealthSheet(), ...(c.healthSheet || {}), bloodType: c.healthSheet?.bloodType || c.bloodType || '' });
    setInstagram(c.instagram || '');
    setSri({ tradeName: c.tradeName || '', regime: c.taxpayerRegime || '', type: c.taxpayerType || '', status: c.sriStatus || '', verified: Boolean(c.sriVerified) });
    setSearch('');
  };

  // Consulta de cédula / RUC en el SRI y Registro Civil (rellena nombre y datos tributarios)
  const lookupSri = async () => {
    const id = dni.trim();
    if (!id) return setSriMsg({ text: 'Ingrese la cédula o RUC para consultar.', ok: false });
    const existing = clients.find(c => (c.dni || '').replace(/\D/g, '') === id.replace(/\D/g, ''));
    if (existing && existing.id !== clientId) {
      loadClient(existing);
      setSriMsg({ text: 'Este cliente ya estaba registrado: se cargó su ficha.', ok: true });
      return;
    }
    setSriLoading(true);
    setSriMsg(null);
    try {
      const res = await consultarIdentificacion(id);
      if (res.found && res.nombre) {
        setName(res.nombre);
        setSri({
          tradeName: res.nombreComercial || '',
          regime: res.regimen || '',
          type: res.tipoPersona || res.tipoContribuyente || '',
          status: res.estado || 'ACTIVO',
          verified: true,
        });
        setSriMsg({ text: `Identificación verificada: ${res.nombre}${res.regimen ? ` · ${res.regimen}` : ''}`, ok: true });
      } else {
        setSriMsg({ text: res.error || 'No se encontró en el SRI ni en el Registro Civil; escriba el nombre.', ok: false });
      }
    } catch {
      setSriMsg({ text: 'Sin conexión con el SRI; escriba el nombre manualmente.', ok: false });
    } finally {
      setSriLoading(false);
    }
  };

  const toggleIn = (field: 'allergies' | 'conditions' | 'medications' | 'currentState', key: string) => {
    setHealth(h => ({ ...h, [field]: h[field].includes(key) ? h[field].filter(k => k !== key) : [...h[field], key] }));
    setNoneGroups(g => ({ ...g, [field]: false }));
    setHealthConfirmed(false);
  };
  const setNone = (field: 'allergies' | 'conditions' | 'medications' | 'currentState') => {
    setHealth(h => ({ ...h, [field]: [] }));
    setNoneGroups(g => ({ ...g, [field]: true }));
  };
  const groupAnswered = (field: 'allergies' | 'conditions' | 'medications' | 'currentState') =>
    health[field].length > 0 || noneGroups[field];

  // ---------------------------------------------------------------- validación por paso
  const errorsFor = (s: number): string[] => {
    const e: string[] = [];
    if (s === 1) {
      if (!name.trim()) e.push('Nombre completo');
      if (!dni.trim()) e.push('Cédula / pasaporte');
      if (!birthDate) e.push('Fecha de nacimiento');
      if (!phone.trim()) e.push('Teléfono');
      if (!emName.trim() || !emPhone.trim()) e.push('Contacto de emergencia (nombre y teléfono)');
      if (isMinor && (!guardian.name.trim() || !guardian.dni.trim() || !guardian.relationship.trim()))
        e.push('Datos del representante legal (el cliente es menor de edad)');
    }
    if (s === 2) {
      (['allergies', 'conditions', 'medications', 'currentState'] as const).forEach(f => {
        if (!groupAnswered(f))
          e.push(
            `Responder: ${f === 'allergies' ? 'Alergias' : f === 'conditions' ? 'Condiciones médicas' : f === 'medications' ? 'Medicamentos' : 'Estado actual'} (marque opciones o "Ninguna")`
          );
      });
      if (!healthConfirmed) e.push('Confirmar que el cliente respondió personalmente el cuestionario');
    }
    if (s === 3) {
      if (!description.trim()) e.push('Descripción del diseño / procedimiento');
      if (!zone || (zone === 'Otra' && !zoneOther.trim())) e.push('Zona del cuerpo');
      if (!artistId) e.push('Artista responsable');
      if (riskFlags.length > 0 && (!riskAck || riskNote.trim().length < 10))
        e.push('Evaluación de contraindicaciones del artista (nota de al menos 10 caracteres y confirmación)');
    }
    if (s === 4) {
      requiredDecl.forEach(d => {
        if (!declarations.includes(d.key)) e.push(`Aceptar: ${d.label.slice(0, 60)}…`);
      });
    }
    if (s === 5) {
      if (!sigClient) e.push('Firma del cliente');
      if (isMinor && !sigGuardian) e.push('Firma del representante legal');
      if (!sigArtist) e.push('Firma del artista');
    }
    return e;
  };
  const currentErrors = errorsFor(step);

  const next = () => {
    if (currentErrors.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    // Evita duplicar clientes: si la cédula ya existe, se actualiza esa ficha
    if (step === 1 && !clientId && dni.trim()) {
      const dup = clients.find(c => (c.dni || '').replace(/\D/g, '') === dni.replace(/\D/g, ''));
      if (dup) {
        setClientId(dup.id);
        setNotice(`Ya existía un cliente con esa cédula (${dup.name}). Se actualizará su ficha en lugar de crear otra.`);
      }
    }
    setStep(s => Math.min(5, s + 1));
  };

  // ---------------------------------------------------------------- guardado
  const handleSave = () => {
    for (let s = 1; s <= 5; s++) {
      if (errorsFor(s).length > 0) {
        setStep(s);
        setShowErrors(true);
        return;
      }
    }
    const artist = artists.find(a => a.id === artistId);
    const now = new Date().toISOString();
    const by = `${currentUser.nombres} ${currentUser.apellidos}`.trim();
    const finalHealth: HealthSheet = { ...health, updatedAt: now, updatedBy: by };

    const maxNum = clients.reduce(
      (m, c) => Math.max(m, ...(c.consentForms || []).map(f => parseInt(f.number.replace(/\D/g, ''), 10) || 0)),
      0
    );

    const allergyText = [...health.allergies.map(labelFor), health.allergiesOther].filter(Boolean).join(', ');
    const conditionText = [
      ...health.conditions.map(labelFor),
      ...health.medications.map(labelFor),
      health.conditionsDetail,
      health.medicationsDetail,
    ]
      .filter(Boolean)
      .join(', ');

    const personal: Partial<ClientProfile> = {
      name: name.trim(),
      dni: dni.trim(),
      birthDate,
      gender,
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      occupation: occupation.trim() || undefined,
      emergencyContactName: emName.trim(),
      emergencyContactPhone: emPhone.trim(),
      emergencyContactRelation: emRelation.trim() || undefined,
      emergencyContact: `${emName.trim()} · ${emPhone.trim()}${emRelation ? ` (${emRelation})` : ''}`,
      instagram: instagram.trim() || undefined,
      tradeName: sri.tradeName || undefined,
      taxpayerRegime: sri.regime || undefined,
      taxpayerType: sri.type || undefined,
      sriStatus: sri.status || undefined,
      sriVerified: sri.verified,
      bloodType: health.bloodType || undefined,
      allergies: allergyText || 'Ninguna conocida',
      medicalConditions: conditionText || 'Ninguna',
      skinNotes: health.skinNotes || undefined,
      healthSheet: finalHealth,
      consentSigned: true,
    };

    // Un cliente "descubierto" desde ventas antiguas aún no existe en la lista real: se crea su ficha
    let targetId = clientId && clients.some(c => c.id === clientId) ? clientId : null;
    let existingForms: ConsentForm[] = [];
    if (targetId) {
      existingForms = clients.find(c => c.id === targetId)?.consentForms || [];
    } else {
      const created = addClient({ ...(personal as ClientProfile), tags: ['Nuevo'], consentSigned: true });
      targetId = created.id;
    }

    const form: ConsentForm = {
      id: `cf-${Date.now()}`,
      number: `CI-${String(maxNum + 1).padStart(6, '0')}`,
      createdAt: now,
      clientId: targetId!,
      clientName: name.trim(),
      clientDni: dni.trim(),
      clientBirthDate: birthDate,
      clientAge: age,
      clientPhone: phone.trim(),
      clientEmail: email.trim() || undefined,
      clientAddress: [address.trim(), city.trim()].filter(Boolean).join(', ') || undefined,
      isMinor,
      guardian: isMinor ? guardian : undefined,
      procedureType,
      procedureDescription: description.trim(),
      bodyZone: zone === 'Otra' ? zoneOther.trim() : zone,
      artistId,
      artistName: artist?.name || '',
      procedureDate,
      estimatedSessions: parseInt(sessions, 10) || undefined,
      estimatedPrice: parseFloat(price) || undefined,
      jewelryMaterial: procedureType === 'piercing' ? jewelry.trim() || undefined : undefined,
      health: finalHealth,
      riskFlags,
      riskAssessmentNote: riskFlags.length > 0 ? riskNote.trim() : undefined,
      acceptedDeclarations: declarations,
      photoAuthorization: photoAuth,
      clientSignature: sigClient,
      guardianSignature: isMinor ? sigGuardian : undefined,
      artistSignature: sigArtist,
      signedAt: now,
      registeredBy: by,
    };

    updateClient(targetId!, { ...personal, consentForms: [form, ...existingForms] });
    onSaved(form);
  };

  // Guardar únicamente los datos del cliente (sin ficha de salud ni carta). Queda "pendiente de consentimiento".
  const handleSaveOnly = () => {
    if (!name.trim()) {
      setShowErrors(true);
      setStep(1);
      return;
    }
    const base: Partial<ClientProfile> = {
      name: name.trim(),
      dni: dni.trim() || undefined,
      birthDate: birthDate || undefined,
      gender,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      occupation: occupation.trim() || undefined,
      instagram: instagram.trim() || undefined,
      emergencyContactName: emName.trim() || undefined,
      emergencyContactPhone: emPhone.trim() || undefined,
      emergencyContactRelation: emRelation.trim() || undefined,
      emergencyContact: emName.trim() ? `${emName.trim()} · ${emPhone.trim()}${emRelation ? ` (${emRelation})` : ''}` : undefined,
      tradeName: sri.tradeName || undefined,
      taxpayerRegime: sri.regime || undefined,
      taxpayerType: sri.type || undefined,
      sriStatus: sri.status || undefined,
      sriVerified: sri.verified,
    };
    let targetId = clientId && clients.some(c => c.id === clientId) ? clientId : null;
    if (!targetId && dni.trim()) {
      targetId = clients.find(c => (c.dni || '').replace(/\D/g, '') === dni.replace(/\D/g, ''))?.id || null;
    }
    if (targetId) {
      updateClient(targetId, base);
    } else {
      addClient({ ...(base as ClientProfile), name: name.trim(), consentSigned: false, tags: ['Nuevo'] });
    }
    showAlert({
      title: isEdit || targetId ? 'Cliente actualizado' : 'Cliente registrado',
      message: 'Se guardaron los datos. Recuerde completar la ficha de salud y firmar el consentimiento ANTES de realizar el procedimiento.',
      type: 'success',
    });
    onClose();
  };

  const filteredClients = search.trim()
    ? clients
        .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.dni || '').includes(search))
        .slice(0, 6)
    : [];

  const err = (cond: boolean) => showErrors && cond;

  // ================================================================ RENDER
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[95vh] my-auto">
        {/* Encabezado + progreso */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-[#25252E] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">{isEdit ? `Ficha de ${initialClient?.name}` : 'Nuevo cliente'}</h3>
              <p className="text-[11px] text-neutral-400">
                {canConsent
                  ? 'Datos del cliente, ficha de salud y carta de consentimiento en un solo formulario. Los campos con * son obligatorios.'
                  : 'Registre los datos del cliente. (Su rol no permite firmar fichas de salud ni consentimientos.)'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] cursor-pointer" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {STEPS.map(s => {
              const done = s.id < step;
              const active = s.id === step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-2 rounded-xl text-[10px] sm:text-[11px] font-semibold border ${
                    active
                      ? 'bg-[#FF3366]/15 border-[#FF3366]/60 text-white'
                      : done
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 cursor-pointer'
                      : 'bg-[#121215] border-[#2B2B36] text-neutral-500'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <s.Icon className="w-4 h-4" />}
                  <span className="truncate">{s.id}. {s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* ================= PASO 1: CLIENTE ================= */}
          {step === 1 && (
            <>
              {!clientId && clients.length > 0 && (
                <div className="relative">
                  <Field label="¿Cliente ya registrado? Búsquelo para cargar sus datos">
                    <div className="relative">
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o cédula" className={`${input} pl-9`} />
                      <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2" />
                    </div>
                  </Field>
                  {filteredClients.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-[#1C1C24] border border-[#2B2B36] rounded-xl overflow-hidden shadow-xl">
                      {filteredClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => loadClient(c)}
                          className="w-full text-left px-3 py-2 hover:bg-[#25252E] flex justify-between cursor-pointer"
                        >
                          <span className="text-white">{c.name}</span>
                          <span className="text-neutral-400 font-mono">{c.dni}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {clientId && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex justify-between items-center">
                  <span>Actualizando la ficha de un cliente existente.</span>
                  {!initialClient && (
                    <button type="button" onClick={() => setClientId(null)} className="underline cursor-pointer">
                      Registrar otro
                    </button>
                  )}
                </div>
              )}

              {sriMsg && (
                <div className={`p-2.5 rounded-xl border text-[11px] ${sriMsg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
                  {sriMsg.text}
                </div>
              )}
              {notice && <div className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-200 text-[11px]">{notice}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Field label="Nombre completo" required error={err(!name.trim())} className="lg:col-span-2">
                  <input value={name} onChange={e => setName(e.target.value)} className={input} />
                </Field>
                <Field label="Cédula / RUC / pasaporte" required error={err(!dni.trim())}>
                  <div className="flex gap-1.5">
                    <input
                      value={dni}
                      onChange={e => {
                        setDni(e.target.value);
                        setSriMsg(null);
                      }}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), lookupSri())}
                      className={`${input} font-mono`}
                    />
                    <button
                      type="button"
                      onClick={lookupSri}
                      disabled={sriLoading}
                      title="Buscar en el SRI y Registro Civil"
                      className="px-2.5 rounded-xl bg-[#25252E] hover:bg-[#30303B] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {sriLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      SRI
                    </button>
                  </div>
                </Field>
                <Field label={`Fecha de nacimiento${age !== undefined ? ` (${age} años)` : ''}`} required error={err(!birthDate)}>
                  <DatePicker value={birthDate} max={procedureDate} onChange={v => setBirthDate(v)} className={input} />
                </Field>
                <Field label="Sexo">
                  <UiSelect value={gender} onChange={e => setGender(e.target.value as ClientProfile['gender'])} className={input}>
                    <option value="">Prefiere no decir</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                    <option value="O">Otro</option>
                  </UiSelect>
                </Field>
                <Field label="Ocupación">
                  <input value={occupation} onChange={e => setOccupation(e.target.value)} className={input} />
                </Field>
                <Field label="Instagram">
                  <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@usuario" className={input} />
                </Field>
                <Field label="Teléfono / WhatsApp" required error={err(!phone.trim())}>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={input} />
                </Field>
                <Field label="Correo electrónico">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={input} />
                </Field>
                <Field label="Ciudad">
                  <input value={city} onChange={e => setCity(e.target.value)} className={input} />
                </Field>
                <Field label="Dirección" className="sm:col-span-2 lg:col-span-3">
                  <input value={address} onChange={e => setAddress(e.target.value)} className={input} />
                </Field>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#272730] space-y-3">
                <div className="font-bold text-white">Contacto de emergencia</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Nombre" required error={err(!emName.trim())}>
                    <input value={emName} onChange={e => setEmName(e.target.value)} className={input} />
                  </Field>
                  <Field label="Teléfono" required error={err(!emPhone.trim())}>
                    <input value={emPhone} onChange={e => setEmPhone(e.target.value)} className={input} />
                  </Field>
                  <Field label="Parentesco">
                    <input value={emRelation} onChange={e => setEmRelation(e.target.value)} placeholder="Madre, pareja…" className={input} />
                  </Field>
                </div>
              </div>

              {isMinor && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                  <div className="font-bold text-amber-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Cliente menor de edad ({age} años): el representante legal debe estar presente y firmar.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Field label="Nombre del representante" required error={err(!guardian.name.trim())} className="sm:col-span-2">
                      <input value={guardian.name} onChange={e => setGuardian(g => ({ ...g, name: e.target.value }))} className={input} />
                    </Field>
                    <Field label="Cédula" required error={err(!guardian.dni.trim())}>
                      <input value={guardian.dni} onChange={e => setGuardian(g => ({ ...g, dni: e.target.value }))} className={`${input} font-mono`} />
                    </Field>
                    <Field label="Parentesco" required error={err(!guardian.relationship.trim())}>
                      <input value={guardian.relationship} onChange={e => setGuardian(g => ({ ...g, relationship: e.target.value }))} placeholder="Padre, madre, tutor" className={input} />
                    </Field>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= PASO 2: SALUD ================= */}
          {step === 2 && (
            <>
              <p className="text-neutral-400">
                Lea cada grupo al cliente. Marque lo que aplique o pulse <strong className="text-white">Ninguna</strong>. Las opciones en rojo son contraindicaciones.
              </p>
              <ChipGroup title="1. Alergias" items={ALLERGIES} selected={health.allergies} none={!!noneGroups.allergies} onToggle={k => toggleIn('allergies', k)} onNone={() => setNone('allergies')} />
              <Field label="Otras alergias">
                <input value={health.allergiesOther} onChange={e => setHealth(h => ({ ...h, allergiesOther: e.target.value }))} className={input} />
              </Field>
              <ChipGroup title="2. Condiciones médicas" items={CONDITIONS} selected={health.conditions} none={!!noneGroups.conditions} onToggle={k => toggleIn('conditions', k)} onNone={() => setNone('conditions')} />
              <Field label="Detalle de condiciones (tratamiento, desde cuándo)">
                <input value={health.conditionsDetail} onChange={e => setHealth(h => ({ ...h, conditionsDetail: e.target.value }))} className={input} />
              </Field>
              <ChipGroup title="3. Medicamentos" items={MEDICATIONS} selected={health.medications} none={!!noneGroups.medications} onToggle={k => toggleIn('medications', k)} onNone={() => setNone('medications')} />
              <Field label="Otros medicamentos">
                <input value={health.medicationsDetail} onChange={e => setHealth(h => ({ ...h, medicationsDetail: e.target.value }))} className={input} />
              </Field>
              <ChipGroup title="4. Estado actual (hoy)" items={CURRENT_STATE} selected={health.currentState} none={!!noneGroups.currentState} onToggle={k => toggleIn('currentState', k)} onNone={() => setNone('currentState')} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Tipo de sangre">
                  <UiSelect value={health.bloodType} onChange={e => setHealth(h => ({ ...h, bloodType: e.target.value }))} className={input}>
                    <option value="">No sabe</option>
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                      <option key={b}>{b}</option>
                    ))}
                  </UiSelect>
                </Field>
                <Field label="Reacciones en tatuajes / piercings anteriores" className="sm:col-span-2">
                  <input value={health.previousTattooReactions} onChange={e => setHealth(h => ({ ...h, previousTattooReactions: e.target.value }))} placeholder="Ninguna / describa" className={input} />
                </Field>
                <Field label="Notas de la piel" className="sm:col-span-2">
                  <input value={health.skinNotes} onChange={e => setHealth(h => ({ ...h, skinNotes: e.target.value }))} placeholder="Piel sensible, lunares en la zona…" className={input} />
                </Field>
                {gender !== 'M' && (
                  <label className="flex items-center gap-2 mt-5 cursor-pointer">
                    <input type="checkbox" checked={!!health.pregnantOrNursing} onChange={e => setHealth(h => ({ ...h, pregnantOrNursing: e.target.checked }))} />
                    <span className="text-neutral-200">Embarazo o lactancia</span>
                  </label>
                )}
              </div>

              <label className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer ${err(!healthConfirmed) ? 'border-red-500/60' : 'border-[#2B2B36]'}`}>
                <input type="checkbox" checked={healthConfirmed} onChange={e => setHealthConfirmed(e.target.checked)} className="mt-0.5" />
                <span className="text-neutral-200">
                  Confirmo que el cliente respondió personalmente cada pregunta del cuestionario de salud.
                </span>
              </label>
            </>
          )}

          {/* ================= PASO 3: PROCEDIMIENTO ================= */}
          {step === 3 && (
            <>
              <div className="flex flex-wrap gap-2">
                {PROCEDURE_TYPES.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setProcedureType(p.key)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      procedureType === p.key ? 'bg-[#FF3366]/20 border-[#FF3366] text-white' : 'bg-[#121215] border-[#2B2B36] text-neutral-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Descripción del diseño / procedimiento" required error={err(!description.trim())} className="sm:col-span-2">
                  <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Rosa blackwork 12x8 cm con texto 'Libertad'" className={input} />
                </Field>
                <Field label="Zona del cuerpo" required error={err(!zone || (zone === 'Otra' && !zoneOther.trim()))}>
                  <UiSelect value={zone} onChange={e => setZone(e.target.value)} className={input}>
                    <option value="">Seleccione…</option>
                    {BODY_ZONES.map(z => (
                      <option key={z}>{z}</option>
                    ))}
                  </UiSelect>
                </Field>
                {zone === 'Otra' && (
                  <Field label="Especifique la zona" required>
                    <input value={zoneOther} onChange={e => setZoneOther(e.target.value)} className={input} />
                  </Field>
                )}
                <Field label="Artista responsable" required error={err(!artistId)}>
                  <UiSelect value={artistId} onChange={e => setArtistId(e.target.value)} className={input}>
                    <option value="">Seleccione…</option>
                    {artists.filter(a => a.active).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </UiSelect>
                </Field>
                <Field label="Fecha del procedimiento">
                  <DatePicker value={procedureDate} onChange={v => setProcedureDate(v)} className={input} />
                </Field>
                <Field label="Sesiones estimadas">
                  <input type="number" min="1" value={sessions} onChange={e => setSessions(e.target.value)} className={input} />
                </Field>
                <Field label="Precio estimado ($)">
                  <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={input} />
                </Field>
                {procedureType === 'piercing' && (
                  <Field label="Material de la joya">
                    <input value={jewelry} onChange={e => setJewelry(e.target.value)} placeholder="Titanio ASTM F136, acero 316L…" className={input} />
                  </Field>
                )}
              </div>

              {riskFlags.length > 0 ? (
                <div className={`p-3.5 rounded-2xl border space-y-2.5 ${blockingNow.length ? 'bg-red-500/10 border-red-500/50' : 'bg-amber-500/10 border-amber-500/40'}`}>
                  <div className="font-bold text-amber-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Contraindicaciones detectadas ({riskFlags.length})
                  </div>
                  <ul className="list-disc pl-5 text-amber-100/90 space-y-0.5">
                    {riskFlags.map(f => (
                      <li key={f}>{flagLabel(f)}</li>
                    ))}
                  </ul>
                  {blockingNow.length > 0 && (
                    <p className="text-red-200 font-semibold">
                      Se recomienda POSPONER el procedimiento (alcohol/drogas o enfermedad actual).
                    </p>
                  )}
                  <Field label="Evaluación del artista (qué se revisó y por qué se procede)" required error={err(riskNote.trim().length < 10)}>
                    <textarea rows={2} value={riskNote} onChange={e => setRiskNote(e.target.value)} className={input} placeholder="Ej. Alergia al látex: se usarán guantes de nitrilo." />
                  </Field>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={riskAck} onChange={e => setRiskAck(e.target.checked)} className="mt-0.5" />
                    <span className="text-amber-50">Evalué las contraindicaciones con el cliente y tomé las precauciones necesarias.</span>
                  </label>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Sin contraindicaciones registradas en la ficha de salud.
                </div>
              )}
            </>
          )}

          {/* ================= PASO 4: DECLARACIONES ================= */}
          {step === 4 && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-neutral-400">Lea cada punto con el cliente. Los marcados con * son obligatorios.</p>
                <button
                  type="button"
                  onClick={() => setDeclarations(DECLARATIONS.filter(d => !d.minorOnly || isMinor).map(d => d.key))}
                  className="px-3 py-1.5 rounded-full border border-[#2B2B36] text-neutral-300 hover:text-white cursor-pointer"
                >
                  Marcar todas
                </button>
              </div>
              <div className="space-y-2">
                {DECLARATIONS.filter(d => !d.minorOnly || isMinor).map((d, i) => {
                  const on = declarations.includes(d.key);
                  const missing = err(d.required && !on);
                  return (
                    <label key={d.key} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${missing ? 'border-red-500/60 bg-red-500/5' : on ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-[#2B2B36]'}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setDeclarations(prev => (on ? prev.filter(k => k !== d.key) : [...prev, d.key]))}
                        className="mt-0.5"
                      />
                      <span className="text-neutral-200 leading-relaxed">
                        <strong className="text-white">{i + 1}.</strong> {d.label} {d.required && <span className="text-[#FF3366]">*</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#2B2B36] cursor-pointer">
                <input type="checkbox" checked={photoAuth} onChange={e => setPhotoAuth(e.target.checked)} className="mt-0.5" />
                <span className="text-neutral-200">
                  (Opcional) Autorizo al estudio a fotografiar el trabajo y publicarlo en su portafolio y redes sociales, sin mostrar mi rostro sin permiso.
                </span>
              </label>
            </>
          )}

          {/* ================= PASO 5: FIRMAS ================= */}
          {step === 5 && (
            <>
              <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#272730] grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-300">
                <div><span className="text-neutral-500">Cliente:</span> <strong className="text-white">{name}</strong> · {dni} {age !== undefined && `· ${age} años`}</div>
                <div><span className="text-neutral-500">Procedimiento:</span> {PROCEDURE_TYPES.find(p => p.key === procedureType)?.label} · {zone === 'Otra' ? zoneOther : zone}</div>
                <div className="sm:col-span-2"><span className="text-neutral-500">Diseño:</span> {description}</div>
                <div><span className="text-neutral-500">Artista:</span> {artists.find(a => a.id === artistId)?.name}</div>
                <div>
                  <span className="text-neutral-500">Alertas de salud:</span>{' '}
                  {riskFlags.length ? <span className="text-amber-300">{riskFlags.map(flagLabel).join(', ')}</span> : 'Ninguna'}
                </div>
              </div>
              <div className={`grid grid-cols-1 ${isMinor ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
                <SignaturePad label="Firma del cliente *" sublabel={`${name} · C.I. ${dni}`} value={sigClient} onChange={setSigClient} />
                {isMinor && (
                  <SignaturePad label="Firma del representante legal *" sublabel={`${guardian.name} · C.I. ${guardian.dni}`} value={sigGuardian} onChange={setSigGuardian} />
                )}
                <SignaturePad label="Firma del artista *" sublabel={artists.find(a => a.id === artistId)?.name} value={sigArtist} onChange={setSigArtist} />
              </div>
            </>
          )}

          {showErrors && currentErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 space-y-1">
              <div className="font-bold">Complete lo siguiente para continuar:</div>
              <ul className="list-disc pl-5">
                {currentErrors.map(e => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Navegación */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#25252E] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(s => s - 1))}
            className="px-4 py-2 text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>
          <span className="text-[11px] text-neutral-500">Paso {step} de 5</span>
          {step < 5 ? (
            <div className="flex items-center gap-2">
              {step === 1 && (
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  className="px-3.5 py-2 rounded-full border border-[#2B2B36] text-neutral-200 hover:text-white hover:border-[#3A3A48] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Guarda los datos ahora; el consentimiento queda pendiente"
                >
                  <Save className="w-3.5 h-3.5" />
                  {canConsent ? (isEdit ? 'Guardar y firmar después' : 'Guardar y firmar después') : isEdit ? 'Guardar cambios' : 'Guardar cliente'}
                </button>
              )}
              {(canConsent || step > 1) && (
                <button type="button" onClick={next} className="px-5 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                  {step === 1 ? 'Continuar: ficha de salud' : 'Siguiente'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={handleSave} className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <CheckCircle2 className="w-4 h-4" />
              Guardar y generar carta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
