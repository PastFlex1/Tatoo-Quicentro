/**
 * Sincronización automática: mientras el backend esté encendido revisa cada minuto la configuración
 * (sri_configuracion.automatica) y, si toca y está dentro del horario, lee el correo y sincroniza.
 *
 *   SRI_PROGRAMADOR=0   desactiva el programador en este proceso (p. ej. en un segundo equipo)
 *
 * Si el equipo estuvo apagado, al encender se ejecuta en el primer minuto dentro del horario.
 * El candado de MongoDB evita que coincida con una sincronización manual.
 */
import { COL } from './sri.model.ts';
import type { ConfiguracionDoc, SincronizacionDoc } from './sri.model.ts';
import { db, sincronizarTodo } from './sri.service.ts';

type ConfigAuto = ConfiguracionDoc['automatica'];

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Hora local de Ecuador (UTC-5, sin horario de verano) en minutos del día */
export const minutosEcuador = (fecha: Date) => {
  const ec = new Date(fecha.getTime() - 5 * 3600 * 1000);
  return ec.getUTCHours() * 60 + ec.getUTCMinutes();
};

/** ¿Está dentro del horario? Admite horarios que cruzan la medianoche (p. ej. 20:00–06:00) */
export function estaEnHorario(ahora: Date, horaInicio: string, horaFin: string): boolean {
  const m = minutosEcuador(ahora);
  const ini = aMinutos(horaInicio);
  const fin = aMinutos(horaFin);
  if (ini === fin) return true; // todo el día
  return ini < fin ? m >= ini && m < fin : m >= ini || m < fin;
}

/** ¿Toca ejecutar ahora? (función pura) */
export function tocaEjecutar(ahora: Date, cfg: ConfigAuto | null | undefined, ultimaAutomatica: Date | null): boolean {
  if (!cfg?.activa) return false;
  if (!estaEnHorario(ahora, cfg.horaInicio, cfg.horaFin)) return false;
  if (!ultimaAutomatica) return true;
  return ahora.getTime() - ultimaAutomatica.getTime() >= cfg.cadaMinutos * 60000 - 5000; // 5 s de tolerancia
}

/** Una revisión del programador. Devuelve lo que hizo (útil para pruebas y logs). */
export async function revisar(ahora = new Date()): Promise<'inactivo' | 'fuera_de_horario' | 'no_toca' | 'ocupado' | 'ejecutada'> {
  const d = await db();
  const cfg = (await d.collection<ConfiguracionDoc>(COL.configuracion).findOne({ _id: 'principal' }))?.automatica;
  if (!cfg?.activa) return 'inactivo';
  if (!estaEnHorario(ahora, cfg.horaInicio, cfg.horaFin)) return 'fuera_de_horario';
  const ultima = await d.collection<SincronizacionDoc>(COL.sincronizaciones).find({ disparador: 'AUTOMATICA' }).sort({ inicio: -1 }).limit(1).next();
  if (!tocaEjecutar(ahora, cfg, ultima?.inicio ?? null)) return 'no_toca';
  const r = await sincronizarTodo({ disparador: 'AUTOMATICA' });
  return r.inicio.iniciada ? 'ejecutada' : 'ocupado';
}

// ------------------------------------------------------------------ ciclo de vida
const CLAVE_GLOBAL = Symbol.for('tatoo.sri.programador');
type Estado = { timer: ReturnType<typeof setInterval>; revisando: boolean };
const g = globalThis as typeof globalThis & { [CLAVE_GLOBAL]?: Estado };

/** Inicia el programador (una sola vez por proceso, aunque Vite recargue la configuración) */
export function iniciarProgramador(intervaloMs = 60000) {
  if (process.env.SRI_PROGRAMADOR === '0' || g[CLAVE_GLOBAL]) return;
  const estado: Estado = {
    revisando: false,
    timer: setInterval(async () => {
      if (estado.revisando) return;
      estado.revisando = true;
      try {
        const r = await revisar();
        if (r === 'ejecutada') console.log('[SRI] Sincronización automática iniciada por el programador');
      } catch (err: any) {
        // MongoDB apagado u otro problema: se reintenta en el siguiente minuto sin detener el servidor
        console.warn('[SRI] Programador:', err?.message || err);
      } finally {
        estado.revisando = false;
      }
    }, intervaloMs),
  };
  estado.timer.unref?.(); // no impide que el proceso termine
  g[CLAVE_GLOBAL] = estado;
  console.log('[SRI] Programador de sincronización automática activo (revisa cada minuto)');
}

export function detenerProgramador() {
  const e = g[CLAVE_GLOBAL];
  if (e) clearInterval(e.timer);
  delete g[CLAVE_GLOBAL];
}
