import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary atrapó un error no controlado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[#121215] text-white p-6">
          <div className="max-w-md w-full bg-[#18181D] border border-[#272730] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">
                Devolution Ink Tattoo Studio
              </h2>
              <p className="text-xs text-neutral-400">
                Se detectó una recarga en caliente o actualización de componentes.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-[#121215] border border-[#272730] rounded-xl text-[11px] font-mono text-amber-300/90 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-lg shadow-[#FF3366]/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar Aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

