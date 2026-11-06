/** Etiquetas, colores y utilidades compartidas por la bandeja de comprobantes recibidos. */
import type { EstadoProcesamientoApi } from '../../../services/sriRecibidosApi';

export const TIPOS: { codigo: string; nombre: string; corto: string; cls: string }[] = [
  { codigo: '01', nombre: 'Factura', corto: 'Factura', cls: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
  { codigo: '04', nombre: 'Nota de crédito', corto: 'N. crédito', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
  { codigo: '05', nombre: 'Nota de débito', corto: 'N. débito', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
  { codigo: '07', nombre: 'Comprobante de retención', corto: 'Retención', cls: 'bg-violet-500/10 border-violet-500/30 text-violet-300' },
  { codigo: '06', nombre: 'Guía de remisión', corto: 'Guía', cls: 'bg-neutral-500/10 border-neutral-500/30 text-neutral-300' },
  { codigo: '03', nombre: 'Liquidación de compra', corto: 'Liquidación', cls: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
];
export const tipoDe = (codigo: string) => TIPOS.find(t => t.codigo === codigo) || { codigo, nombre: `Tipo ${codigo}`, corto: codigo, cls: 'bg-neutral-500/10 border-neutral-500/30 text-neutral-300' };

export const ESTADOS: Record<EstadoProcesamientoApi, { label: string; cls: string }> = {
  PENDIENTE_REVISION: { label: 'Pendiente', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
  REVISADO: { label: 'Revisado', cls: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
  CONTABILIZADO: { label: 'Contabilizado', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
  ERROR: { label: 'Error', cls: 'bg-red-500/10 border-red-500/30 text-red-300' },
};

export const FUENTES: Record<string, string> = {
  TXT: 'Reporte TXT del SRI',
  CLAVE: 'Clave de acceso',
  XML: 'XML subido',
  IMAP: 'Correo electrónico',
  WEBHOOK: 'Webhook',
  MIGRACION: 'Migrado del navegador',
};

export const ERRORES: Record<string, string> = {
  CLAVE_INVALIDA: 'Clave inválida',
  NO_EXISTE: 'No existe en el SRI',
  NO_AUTORIZADO: 'No autorizado',
  OTRO_RECEPTOR: 'Emitido a otro RUC',
  TIMEOUT: 'El SRI no respondió',
  RED: 'Sin conexión',
  SRI_ERROR: 'Error del SRI',
  ERROR: 'XML inválido',
};

/** Tipos que se registran como gasto (la NC resta, la retención y la guía no son compras) */
export const CONTABILIZABLES = ['01', '03', '05'];

/** 'YYYY-MM-DD' de una fecha ISO, en hora de Ecuador */
export const diaEc = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

export const fechaHora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const ui = {
  card: 'rounded-2xl bg-[#18181D] border border-[#272730]',
  input: 'w-full px-3 py-2 bg-[#121215] border border-[#2B2B36] rounded-xl text-white text-xs focus:outline-none focus:border-[#FF3366]/60',
  btn: 'flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2B2B36] text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
  btnPrimario:
    'flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white text-xs font-black cursor-pointer shadow-[0_0_14px_rgba(255,51,102,0.3)] disabled:opacity-40 disabled:cursor-not-allowed',
  icono: 'p-1.5 rounded-lg border transition-colors cursor-pointer',
  badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap',
  label: 'block text-[10px] uppercase text-neutral-400 mb-1',
  modalFondo: 'fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4',
};
