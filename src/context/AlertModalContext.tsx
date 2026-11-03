import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export interface AlertModalOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export interface ConfirmModalOptions {
  title: string;
  message: string;
  type?: 'warning' | 'info' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AlertModalContextType {
  showAlert: (options: AlertModalOptions) => void;
  showConfirm: (options: ConfirmModalOptions) => void;
  closeModal: () => void;
}

const AlertModalContext = createContext<AlertModalContextType | undefined>(undefined);

export const AlertModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertModalOptions | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmModalOptions | null>(null);

  const showAlert = (options: AlertModalOptions) => {
    setConfirmState(null);
    setAlertState(options);
  };

  const showConfirm = (options: ConfirmModalOptions) => {
    setAlertState(null);
    setConfirmState(options);
  };

  const closeModal = () => {
    setAlertState(null);
    setConfirmState(null);
  };

  return (
    <AlertModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}

      {/* Alert Modal */}
      {alertState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#18181D] border border-[#272730] rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-white space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl shrink-0 mt-0.5">
                {alertState.type === 'success' && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                )}
                {alertState.type === 'error' && (
                  <XCircle className="w-6 h-6 text-rose-500" />
                )}
                {alertState.type === 'warning' && (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                )}
                {(!alertState.type || alertState.type === 'info') && (
                  <Info className="w-6 h-6 text-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white mb-1">{alertState.title}</h3>
                <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
                  {alertState.message}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#FF3366]/25 transition-all cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#18181D] border border-[#272730] rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-white space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl shrink-0 mt-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white mb-1">{confirmState.title}</h3>
                <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
                  {confirmState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirmState.onCancel) confirmState.onCancel();
                  closeModal();
                }}
                className="px-4 py-2 bg-[#272730] hover:bg-[#343440] text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {confirmState.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm();
                  closeModal();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
              >
                {confirmState.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertModalContext.Provider>
  );
};

export function useAlertModal() {
  const context = useContext(AlertModalContext);
  if (!context) {
    // Fallback if rendered outside AlertModalProvider
    return {
      showAlert: ({ title, message }: AlertModalOptions) => {
        window.alert(`${title}\n\n${message}`);
      },
      showConfirm: ({ message, onConfirm }: ConfirmModalOptions) => {
        if (window.confirm(message)) {
          onConfirm();
        }
      },
      closeModal: () => {},
    };
  }
  return context;
}

