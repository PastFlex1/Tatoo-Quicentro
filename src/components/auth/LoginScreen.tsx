import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, User } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { MIN_PASSWORD_LENGTH } from '../../utils/password';

const inputCls =
  'w-full bg-[#121215] border border-[#2B2B38] rounded-xl px-3.5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FF3366] transition-colors';

/** Pantalla de ingreso: cada trabajador entra con su usuario y contraseña. */
export const LoginScreen: React.FC = () => {
  const { login, setupAdminPassword, needsAdminSetup, settings } = useStudio();
  const [username, setUsername] = useState(needsAdminSetup ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const studio = settings.nombreComercial || settings.studioName || 'Devolution Ink Tattoo Studio';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (needsAdminSetup) {
      if (password !== confirm) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      setBusy(true);
      // se deja respirar a la interfaz antes del cálculo del hash
      setTimeout(() => {
        const res = setupAdminPassword(password);
        if (!res.ok) setError(res.error || 'No se pudo guardar la contraseña.');
        setBusy(false);
      }, 20);
      return;
    }
    if (!username.trim() || !password) {
      setError('Ingrese su usuario y contraseña.');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const res = login(username, password);
      if (!res.ok) {
        setError(res.error || 'No se pudo iniciar sesión.');
        setPassword('');
      }
      setBusy(false);
    }, 20);
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0B0E] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_24px_rgba(255,51,102,0.25)]">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
              <path d="M15 13 9 7l4-4 6 6-4 4Z" />
              <path d="m18 10 2 2" />
            </svg>
          </div>
          <h1 className="mt-3 text-lg font-bold text-white">{studio}</h1>
          <p className="text-xs text-neutral-400">Sistema de gestión del estudio</p>
        </div>

        <form onSubmit={submit} className="bg-[#17171C] border border-[#2B2B36] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            {needsAdminSetup ? <ShieldCheck className="w-4 h-4 text-[#FF3366]" /> : <KeyRound className="w-4 h-4 text-[#FF3366]" />}
            {needsAdminSetup ? 'Primer ingreso: cree la contraseña del administrador' : 'Iniciar sesión'}
          </div>

          {needsAdminSetup && (
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Esta cuenta controla todo el sistema. Después podrá crear los usuarios de cada trabajador y asignarles solo las secciones que necesiten.
            </p>
          )}

          {error && (
            <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5" htmlFor="login-user">
              Usuario
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-user"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                readOnly={needsAdminSetup}
                autoComplete="username"
                autoCapitalize="none"
                autoFocus={!needsAdminSetup}
                placeholder="ej. maria.lopez"
                className={`${inputCls} pl-10 font-mono ${needsAdminSetup ? 'opacity-70' : ''}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5" htmlFor="login-pass">
              {needsAdminSetup ? 'Nueva contraseña' : 'Contraseña'}
            </label>
            <div className="relative">
              <input
                id="login-pass"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={needsAdminSetup ? 'new-password' : 'current-password'}
                autoFocus={needsAdminSetup}
                placeholder={needsAdminSetup ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres` : '••••••••'}
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-white cursor-pointer"
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {needsAdminSetup && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5" htmlFor="login-confirm">
                Repita la contraseña
              </label>
              <input
                id="login-confirm"
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-[#FF3366] hover:bg-[#e02958] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_18px_rgba(255,51,102,0.35)] cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {busy ? 'Verificando…' : needsAdminSetup ? 'Guardar y entrar' : 'Ingresar'}
          </button>

          {!needsAdminSetup && (
            <p className="text-[11px] text-neutral-500 text-center">¿Olvidó su contraseña? Pídale al administrador que la restablezca.</p>
          )}
        </form>
      </div>
    </div>
  );
};
