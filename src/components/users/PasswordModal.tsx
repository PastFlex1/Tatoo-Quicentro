import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SystemUser } from '../../types';
import { MIN_PASSWORD_LENGTH } from '../../utils/password';

interface PasswordModalProps {
  /** 'self': el trabajador cambia la suya (pide la actual). 'admin': el administrador asigna una nueva a otro. */
  mode: 'self' | 'admin';
  user: SystemUser;
  /** Cambio obligatorio: no se puede cerrar sin cambiarla */
  forced?: boolean;
  onClose: () => void;
}

const inputCls =
  'w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF3366]';

export const PasswordModal: React.FC<PasswordModalProps> = ({ mode, user, forced = false, onClose }) => {
  const { changeOwnPassword, setUserPassword } = useStudio();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mustChange, setMustChange] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    const res = mode === 'self' ? changeOwnPassword(current, next) : setUserPassword(user.id, next, mustChange);
    if (!res.ok) {
      setError(res.error || 'No se pudo guardar la contraseña.');
      return;
    }
    setDone(true);
    setTimeout(onClose, mode === 'self' ? 900 : 1400);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-[#17171C] border border-[#2B2B36] rounded-3xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#24242C] bg-[#121215]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366] shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate">
                {mode === 'self' ? (forced ? 'Cree su nueva contraseña' : 'Cambiar mi contraseña') : 'Asignar contraseña'}
              </h3>
              <p className="text-[11px] text-neutral-400 truncate">
                {user.nombres} {user.apellidos} · @{user.username}
              </p>
            </div>
          </div>
          {!forced && (
            <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-[#202027] cursor-pointer" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {done ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">Contraseña guardada</p>
            {mode === 'admin' && (
              <p className="text-[11px] text-neutral-400">Entréguela al trabajador en persona. No queda visible en el sistema.</p>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3.5">
            {forced && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                El administrador le asignó una contraseña temporal. Debe crear una propia para continuar.
              </p>
            )}
            {error && (
              <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}
            {mode === 'self' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Contraseña actual</label>
                <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" autoFocus className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={next}
                onChange={e => setNext(e.target.value)}
                autoComplete="new-password"
                autoFocus={mode === 'admin'}
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Repetir nueva contraseña</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" className={inputCls} />
            </div>
            {mode === 'admin' && (
              <label className="flex items-start gap-2 text-[11px] text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={mustChange} onChange={e => setMustChange(e.target.checked)} className="mt-0.5 accent-[#FF3366]" />
                <span>Obligar al trabajador a cambiarla en su próximo ingreso (recomendado)</span>
              </label>
            )}
            <div className="flex items-center justify-end gap-3 pt-1">
              {!forced && (
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
              )}
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#e02958] text-white text-xs font-bold cursor-pointer">
                Guardar contraseña
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
