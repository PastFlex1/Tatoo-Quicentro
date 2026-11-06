/**
 * Cliente del módulo "Comprobantes recibidos SRI" (backend Express + MongoDB, rutas /api/sri/*).
 */
import type { ComprobanteParseado } from '../server/modules/sri/sri.types';

export type EstadoProcesamientoApi = 'PENDIENTE_REVISION' | 'REVISADO' | 'CONTABILIZADO' | 'ERROR';
export type FuenteApi = 'TXT' | 'CLAVE' | 'XML' | 'IMAP' | 'WEBHOOK' | 'MIGRACION';

/** Documento tal como llega en JSON (fechas como texto ISO) */
export interface ComprobanteApi extends Omit<ComprobanteParseado, 'fechaEmision' | 'autorizacion'> {
  _id: string;
  fechaEmision: string;
  fechaAutorizacion: string | null;
  numeroAutorizacion: string;
  estadoSri: 'AUTORIZADO' | 'ANULADO';
  estadoProcesamiento: EstadoProcesamientoApi;
  fuente: FuenteApi;
  esParaEmpresa: boolean | null;
  sincronizadoEn: string;
  actualizadoEn: string;
  expenseId?: string;
  observacion?: string;
}

export interface ResumenListado {
  comprobantes: number;
  total: number;
  iva: number;
  base15: number;
  base0: number;
  retenido: number;
  porContabilizar: number;
}

export interface Paginacion {
  pagina: number;
  porPagina: number;
  total: number;
  paginas: number;
}

export interface Ejecucion {
  _id: string;
  inicio: string;
  fin: string | null;
  estado: 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA' | 'FALLIDA';
  disparador: 'MANUAL' | 'AUTOMATICA';
  rango: { desde: string | null; hasta: string | null };
  encontrados: number;
  procesados: number;
  nuevos: number;
  duplicados: number;
  errores: number;
  detalleErrores?: { claveAcceso: string; tipo: string; mensaje: string }[];
  mensaje?: string;
}

export interface ConfigAutomatica {
  activa: boolean;
  cadaMinutos: number;
  horaInicio: string;
  horaFin: string;
}

export interface EstadoSync {
  enCurso: boolean;
  ultima: Ejecucion | null;
  actual: Ejecucion | null;
  cola: { pendientes: number; fallidas: number };
  automatica: ConfigAutomatica | null;
}

export interface ClavePendiente {
  claveAcceso: string;
  tipo: string;
  fechaEmision: string;
  fuente: FuenteApi;
  estado: 'PENDIENTE' | 'PROCESADA' | 'FALLIDA';
  intentos: number;
  ultimoError?: { tipo: string; mensaje: string; en: string };
  proximoIntento: string | null;
}

export interface ResultadoEncolar {
  recibidas: number;
  encoladas: number;
  yaEnCola: number;
  yaRegistradas: number;
  invalidas: string[];
  reactivadas: number;
  sincronizacion?: { iniciada: boolean; idEjecucion: string } | null;
}

export interface LecturaCorreo {
  omitido?: string;
  mensajes: number;
  xmls: number;
  claves: number;
  encoladas: number;
  yaRegistradas: number;
  error?: string;
}

export interface CorreoConfig {
  activo: boolean;
  host: string;
  puerto: number;
  seguro: boolean;
  usuario: string;
  carpeta: string;
  diasAtras: number;
  tieneContrasena: boolean;
  ultimaLectura: string | null;
  ultimoResultado?: Omit<LecturaCorreo, 'omitido' | 'error'>;
  ultimoError?: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function pedir<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor del sistema.');
  }
  const texto = await res.text();
  let data: any = null;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    /* respuesta no JSON */
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `El servidor respondió ${res.status}.`);
  return data as T;
}

const qs = (o: Record<string, string | number | undefined>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

export interface FiltrosApi {
  desde?: string;
  hasta?: string;
  tipo?: string;
  estado?: string;
  q?: string;
  pagina?: number;
  porPagina?: number;
  orden?: 'fecha_desc' | 'fecha_asc' | 'total_desc' | 'total_asc';
}

export const sriApi = {
  listar: (f: FiltrosApi) =>
    pedir<{ items: ComprobanteApi[]; paginacion: Paginacion; resumen: ResumenListado }>(`/api/sri/comprobantes-recibidos?${qs(f as Record<string, string | number | undefined>)}`),
  detalle: (clave: string) => pedir<ComprobanteApi>(`/api/sri/comprobantes-recibidos/${clave}`),
  xmlUrl: (clave: string, descargar = false) => `/api/sri/comprobantes-recibidos/${clave}/xml${descargar ? '?descargar=1' : ''}`,
  xml: async (clave: string) => {
    const r = await fetch(`/api/sri/comprobantes-recibidos/${clave}/xml`);
    if (!r.ok) throw new ApiError(r.status, 'No se pudo obtener el XML.');
    return r.text();
  },
  actualizar: (clave: string, cambios: { estadoProcesamiento?: EstadoProcesamientoApi; expenseId?: string | null; observacion?: string | null }) =>
    pedir<ComprobanteApi>(`/api/sri/comprobantes-recibidos/${clave}`, { method: 'PATCH', body: JSON.stringify(cambios) }),
  agregarClaves: (datos: { texto?: string; claves?: string[]; fuente?: 'TXT' | 'CLAVE'; sincronizar?: boolean }) =>
    pedir<ResultadoEncolar>('/api/sri/claves', { method: 'POST', body: JSON.stringify(datos) }),
  agregarXml: (archivos: { nombre: string; contenido: string }[], sincronizar = true) =>
    pedir<{ encolado: ResultadoEncolar | null; errores: { nombre: string; error: string }[]; sincronizacion: unknown }>('/api/sri/xml', {
      method: 'POST',
      body: JSON.stringify({ archivos, sincronizar }),
    }),
  clavesFallidas: (pagina = 1) => pedir<{ items: ClavePendiente[]; paginacion: Paginacion }>(`/api/sri/claves?estado=FALLIDA&pagina=${pagina}&porPagina=100`),
  sincronizar: (rango: { desde?: string; hasta?: string }) =>
    pedir<{ iniciada: true; idEjecucion: string; correo: LecturaCorreo }>('/api/sri/sincronizar', { method: 'POST', body: JSON.stringify(rango) }),
  obtenerCorreo: () => pedir<{ correo: CorreoConfig | null; cifradoDisponible: boolean }>('/api/sri/correo'),
  guardarCorreo: (datos: { activo: boolean; host: string; puerto: number; seguro: boolean; usuario: string; contrasena?: string; carpeta: string; diasAtras: number }) =>
    pedir<{ correo: CorreoConfig | null; cifradoDisponible: boolean }>('/api/sri/correo', { method: 'PUT', body: JSON.stringify(datos) }),
  probarCorreo: async (datos: { host: string; puerto: number; seguro: boolean; usuario: string; contrasena?: string; carpeta: string }) => {
    const r = await fetch('/api/sri/correo/probar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
    const j = await r.json().catch(() => ({ ok: false, error: `El servidor respondió ${r.status}.` }));
    return j as { ok: true; mensajes: number } | { ok: false; error: string };
  },
  leerCorreo: async () => {
    const r = await fetch('/api/sri/correo/leer', { method: 'POST' });
    return (await r.json()) as LecturaCorreo;
  },
  cancelar: () => pedir<{ mensaje: string }>('/api/sri/sincronizar/cancelar', { method: 'POST' }),
  estado: () => pedir<EstadoSync>('/api/sri/estado-sincronizacion'),
  configurarAutomatica: (cfg: ConfigAutomatica) => pedir<ConfigAutomatica>('/api/sri/sincronizacion/automatica', { method: 'POST', body: JSON.stringify(cfg) }),
  migrar: (comprobantes: { claveAcceso?: string; xml?: string; estadoProcesamiento?: string; expenseId?: string }[]) =>
    pedir<{ nuevos: number; duplicados: number; encolados: number; errores: { claveAcceso: string; error: string }[] }>('/api/sri/migrar', {
      method: 'POST',
      body: JSON.stringify({ comprobantes }),
    }),
};
