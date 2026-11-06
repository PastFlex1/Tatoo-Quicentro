import React, { useState, useEffect } from 'react';
import { UiSelect } from '../common/UiSelect';
import {
  X,
  User,
  Shield,
  CreditCard,
  Palette,
  Package,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  KeyRound,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SystemUser, UserRole } from '../../types';
import { ADMIN_ROLE_ID, PERMISSION_MODULES } from '../../data/permissions';
import { consultarIdentificacion } from '../../services/sriService';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: SystemUser | null;
}

export const NewUserModal: React.FC<NewUserModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { artists, addUser, updateUser, roles, currentUser } = useStudio();

  // Form fields
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [cedula, setCedula] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<UserRole>('CAJERO_RECEPCION');
  const [pin, setPin] = useState('');
  const [artistId, setArtistId] = useState<string>('');
  const [estado, setEstado] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');

  // UI status
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setNombres(userToEdit.nombres);
      setApellidos(userToEdit.apellidos);
      setCedula(userToEdit.cedula || '');
      setUsername(userToEdit.username);
      setEmail(userToEdit.email);
      setTelefono(userToEdit.telefono || '');
      setRol(userToEdit.rol);
      setPin(userToEdit.pin || '');
      setArtistId(userToEdit.artistId || '');
      setEstado(userToEdit.estado);
    } else {
      setNombres('');
      setApellidos('');
      setCedula('');
      setUsername('');
      setEmail('');
      setTelefono('');
      setRol('CAJERO_RECEPCION');
      setPin('');
      setArtistId(artists[0]?.id || '');
      setEstado('ACTIVO');
    }
    setErrorMessage(null);
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleLookupSri = async () => {
    const clean = cedula.trim().replace(/\D/g, '');
    if (!clean) return;
    setIsSearchingSri(true);
    setErrorMessage(null);
    try {
      const res = await consultarIdentificacion(clean);
      if (res.found && res.nombre) {
        const parts = res.nombre.split(' ');
        if (parts.length >= 2) {
          setNombres(parts.slice(2).join(' ') || parts[0]);
          setApellidos(parts.slice(0, 2).join(' '));
        } else {
          setNombres(res.nombre);
        }
        if (!username) {
          const autoUser = res.nombre.toLowerCase().replace(/[^a-z0-9]/g, '.').slice(0, 15);
          setUsername(autoUser);
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsSearchingSri(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombres.trim() || !apellidos.trim()) {
      setErrorMessage('Por favor ingrese nombres y apellidos del usuario.');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Por favor ingrese un nombre de usuario (ej. alex.palma).');
      return;
    }
    if (pin && pin.length < 4) {
      setErrorMessage('El PIN debe tener al menos 4 dígitos numéricos.');
      return;
    }

    const userData = {
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      cedula: cedula.trim() || undefined,
      username: username.trim().toLowerCase(),
      email: email.trim() || `${username.trim().toLowerCase()}@devolutionink.com`,
      telefono: telefono.trim() || undefined,
      rol,
      estado,
      pin: pin.trim() || undefined,
      artistId: rol === 'ARTISTA' ? artistId || undefined : undefined,
    };

    if (userToEdit) {
      updateUser(userToEdit.id, userData);
    } else {
      addUser(userData);
    }

    onClose();
  };

  const selectedRole = roles.find(r => r.id === rol);
  const allowedTabsPreview = PERMISSION_MODULES.filter(
    m => rol === ADMIN_ROLE_ID || selectedRole?.permissions.includes(`${m.id}.view`)
  ).map(m => m.label);
  const rolePermCount = rol === ADMIN_ROLE_ID
    ? PERMISSION_MODULES.reduce((acc, m) => acc + m.actions.length, 0)
    : selectedRole?.permissions.length || 0;
  // Solo un Administrador puede asignar el rol Administrador
  const assignableRoles = roles.filter(r => r.id !== ADMIN_ROLE_ID || currentUser.rol === ADMIN_ROLE_ID || userToEdit?.rol === ADMIN_ROLE_ID);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242C] bg-[#121215] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {userToEdit ? 'Editar Usuario & Permisos' : 'Crear Nuevo Usuario del Sistema'}
              </h3>
              <p className="text-xs text-neutral-400">
                Asigne un rol para delimitar accesos a módulos operativos y contables
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-[#202027] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Identificación y Nombres */}
          <div className="bg-[#1C1C24] p-4 rounded-2xl border border-[#2B2B38] space-y-3">
            <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-[#FF3366]" />
              <span>1. Datos Personales & Acceso</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cedula */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Cédula de Identidad
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="1712345678"
                    className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#FF3366]"
                  />
                  <button
                    type="button"
                    onClick={handleLookupSri}
                    disabled={isSearchingSri || !cedula}
                    className="p-2 rounded-xl bg-[#24242F] hover:bg-[#2B2B38] text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    title="Consultar en Registro Civil / SRI"
                  >
                    <Search className={`w-4 h-4 ${isSearchingSri ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Nombres */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nombres *
                </label>
                <input
                  type="text"
                  value={nombres}
                  onChange={e => setNombres(e.target.value)}
                  placeholder="Ej. Mateo Sebastián"
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                  required
                />
              </div>

              {/* Apellidos */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Apellidos *
                </label>
                <input
                  type="text"
                  value={apellidos}
                  onChange={e => setApellidos(e.target.value)}
                  placeholder="Ej. Silva Ramos"
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="usuario.ink"
                    className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono font-semibold focus:outline-none focus:border-[#FF3366]"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@devolutionink.com"
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                />
              </div>

              {/* Telefono */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="+593 99 123 4567"
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3366]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Rol y Permisos de Acceso */}
          <div className="bg-[#1C1C24] p-4 rounded-2xl border border-[#2B2B38] space-y-4">
            <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FF3366]" />
              <span>2. Rol en el Estudio & Permisos Asignados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Rol */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Rol del Usuario *
                </label>
                <UiSelect
                  value={rol}
                  onChange={e => setRol(e.target.value as UserRole)}
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-[#FF3366]"
                >
                  {assignableRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name.toUpperCase()}
                      {r.description ? ` — ${r.description}` : ''}
                    </option>
                  ))}
                </UiSelect>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  PIN de Acceso Rápido (4 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1234"
                  className="w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest text-center focus:outline-none focus:border-[#FF3366]"
                />
              </div>
            </div>

            {/* If role is ARTISTA, show artist linking dropdown */}
            {rol === 'ARTISTA' && (
              <div className="p-3 bg-[#141419] rounded-xl border border-purple-500/30 space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-bold text-purple-300">
                  Vincular con Artista del Estudio:
                </label>
                <UiSelect
                  value={artistId}
                  onChange={e => setArtistId(e.target.value)}
                  className="w-full bg-[#1C1C24] border border-[#2B2B38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Seleccionar Artista del Catálogo --</option>
                  {artists.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.name} ({art.role} - Comisión: {art.defaultCommissionRate}%)
                    </option>
                  ))}
                </UiSelect>
                <p className="text-[10px] text-neutral-400">
                  Permite que este usuario vea directamente sus citas agendadas, clientes atendidos y el cálculo de sus liquidaciones de comisión.
                </p>
              </div>
            )}

            {/* State */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-semibold text-neutral-300">Estado de la Cuenta:</span>
                <p className="text-[10px] text-neutral-500">Los usuarios inactivos no pueden iniciar sesión en el POS ni en el sistema.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEstado('ACTIVO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    estado === 'ACTIVO'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-[#121215] text-neutral-500 border border-transparent'
                  }`}
                >
                  ACTIVO
                </button>
                <button
                  type="button"
                  onClick={() => setEstado('INACTIVO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    estado === 'INACTIVO'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-[#121215] text-neutral-500 border border-transparent'
                  }`}
                >
                  INACTIVO
                </button>
              </div>
            </div>

            {/* Permissions Preview Pills */}
            <div className="pt-2 border-t border-[#24242F]">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Módulos habilitados ({allowedTabsPreview.length}) · {rolePermCount} permisos. Se administran en "Roles y permisos":
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allowedTabsPreview.map(tab => (
                  <span
                    key={tab}
                    className="px-2.5 py-1 rounded-lg bg-[#141419] border border-[#282833] text-[10px] font-mono text-neutral-300"
                  >
                    ✓ {tab}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#24242C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_16px_rgba(255,51,102,0.35)] cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{userToEdit ? 'Guardar Cambios' : 'Crear Usuario'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
