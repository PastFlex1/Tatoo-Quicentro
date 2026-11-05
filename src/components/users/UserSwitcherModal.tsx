import React, { useEffect, useState } from 'react';
import {
  X,
  Users,
  Shield,
  CreditCard,
  Palette,
  Package,
  BookOpen,
  Lock,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SystemUser, UserRole } from '../../types';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Usuario a preseleccionar (abre directamente la pantalla de PIN) */
  preselectedUser?: SystemUser | null;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  onClose,
  preselectedUser = null,
}) => {
  const { users, currentUser, switchUser, settings } = useStudio();
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedUser(preselectedUser && preselectedUser.pin ? preselectedUser : null);
      setPinInput('');
      setPinError(null);
    }
  }, [isOpen, preselectedUser]);

  if (!isOpen) return null;

  const getRoleBadge = (rol: UserRole) => {
    switch (rol) {
      case 'ADMIN':
        return {
          label: 'Administrador / Dueño',
          icon: ShieldCheck,
          className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
      case 'CAJERO_RECEPCION':
        return {
          label: 'Cajero / Recepción',
          icon: CreditCard,
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'ARTISTA':
        return {
          label: 'Artista / Tatuador',
          icon: Palette,
          className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
      case 'BODEGA':
        return {
          label: 'Encargado de Bodega',
          icon: Package,
          className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'CONTADOR':
        return {
          label: 'Contador General',
          icon: BookOpen,
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      default:
        return {
          label: rol,
          icon: Users,
          className: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30',
        };
    }
  };

  const handleSelectUser = (user: SystemUser) => {
    // If it's already the current user, just close
    if (user.id === currentUser.id) {
      onClose();
      return;
    }

    // If user has a PIN, prompt for PIN
    if (user.pin) {
      setSelectedUser(user);
      setPinInput('');
      setPinError(null);
    } else {
      // Direct switch
      switchUser(user.id);
      onClose();
    }
  };

  const handleConfirmPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.pin && pinInput !== selectedUser.pin) {
      setPinError('PIN incorrecto. Intente nuevamente.');
      return;
    }

    const ok = switchUser(selectedUser.id, pinInput);
    if (ok) {
      onClose();
    } else {
      setPinError('No se pudo cambiar al usuario seleccionado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-xl bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242C] bg-[#121215]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Cambiar de Usuario</h3>
              <p className="text-xs text-neutral-400">
                Seleccione el perfil de trabajo según su rol en el estudio
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

        {/* Body */}
        <div className="p-6 space-y-4">
          {selectedUser ? (
            /* PIN verification view */
            <form onSubmit={handleConfirmPin} className="space-y-4 py-2">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#FF3366]/10 border border-[#FF3366]/30 flex items-center justify-center mx-auto text-[#FF3366]">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  Ingrese el PIN de acceso para {selectedUser.nombres} {selectedUser.apellidos}
                </h4>
                <p className="text-xs text-neutral-400">
                  Usuario: <span className="font-mono text-neutral-300 font-bold">@{selectedUser.username}</span>
                </p>
              </div>

              {pinError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  autoFocus
                  placeholder="PIN de 4 dígitos"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono bg-[#121215] border border-[#2B2B38] rounded-2xl py-3 text-white focus:outline-none focus:border-[#FF3366]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setPinInput('');
                    setPinError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Volver a lista
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.35)] cursor-pointer"
                >
                  Confirmar & Acceder
                </button>
              </div>
            </form>
          ) : (
            /* User list view */
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {users
                .filter(u => u.estado === 'ACTIVO')
                .map(user => {
                  const isCurrent = user.id === currentUser.id;
                  const roleBadge = getRoleBadge(user.rol);
                  const Icon = roleBadge.icon;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FF3366]/10 border-[#FF3366]/40 shadow-[0_0_15px_rgba(255,51,102,0.15)]'
                          : 'bg-[#1C1C24] hover:bg-[#22222D] border-[#2B2B38] hover:border-[#38384A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-[#141419] border border-[#2B2B38] flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {user.nombres.slice(0, 1)}
                          {user.apellidos.slice(0, 1)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {user.nombres} {user.apellidos}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-[#FF3366] bg-[#FF3366]/15 px-2 py-0.5 rounded-full border border-[#FF3366]/30">
                                Activo ahora
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-neutral-400 font-mono">
                              @{user.username}
                            </span>
                            <span className="text-neutral-600">•</span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge.className}`}
                            >
                              <Icon className="w-3 h-3" />
                              {roleBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {user.pin && (
                          <span className="text-neutral-500 text-xs flex items-center gap-1" title="Requiere PIN de seguridad">
                            <Lock className="w-3.5 h-3.5 text-neutral-400" />
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-neutral-400" />
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#24242C] bg-[#121215] flex items-center justify-between text-[11px] text-neutral-400">
          <span>Estudio: <strong>{settings.nombreComercial || settings.studioName}</strong></span>
          <span>Los usuarios con PIN deben ingresarlo para cambiar de sesión</span>
        </div>
      </div>
    </div>
  );
};

