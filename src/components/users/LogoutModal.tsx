import React, { useState } from 'react';
import { KeyRound, LogOut, X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { PasswordModal } from './PasswordModal';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Menú de la cuenta: cambiar mi contraseña o cerrar sesión (para que entre otro trabajador). */
export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, currentRole, logout } = useStudio();
  const [changing, setChanging] = useState(false);

  if (!isOpen) return null;

  if (changing) {
    return <PasswordModal mode="self" user={currentUser} onClose={() => { setChanging(false); onClose(); }} />;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#24242C] bg-[#121215]">
          <h3 className="font-bold text-white text-sm">Mi cuenta</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-[#202027] cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center font-bold text-[#FF3366] text-sm shrink-0">
              {currentUser.nombres.slice(0, 1)}
              {currentUser.apellidos.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {currentUser.nombres} {currentUser.apellidos}
              </p>
              <p className="text-[11px] text-neutral-400 font-mono truncate">@{currentUser.username}</p>
              <p className="text-[11px] text-[#FF3366] truncate">{currentRole?.name || currentUser.rol}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#1C1C24] hover:bg-[#22222D] border border-[#2B2B38] text-xs font-semibold text-neutral-200 cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-[#FF3366]" />
            Cambiar mi contraseña
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold cursor-pointer shadow-[0_0_14px_rgba(255,51,102,0.3)]"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
          <p className="text-[10px] text-neutral-500 text-center">La sesión también se cierra sola tras 30 minutos sin actividad.</p>
        </div>
      </div>
    </div>
  );
};
