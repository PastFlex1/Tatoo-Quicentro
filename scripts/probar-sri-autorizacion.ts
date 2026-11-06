/**
 * Prueba de la Etapa 3: recuperación de XML por clave de acceso.
 *
 *   npm run sri:probar                         → pruebas sin red + 1 consulta real de control
 *   npm run sri:probar -- <clave> [<clave> …]  → consulta claves reales y guarda los XML en ./tmp-sri/
 */
import fs from 'fs';
import path from 'path';
import { consultarAutorizacion, interpretarRespuesta } from '../src/server/modules/sri/sri.authorization.ts';
import { procesarLote } from '../src/server/modules/sri/sri.batch.ts';

const verde = (s: string) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s: string) => `\x1b[31m${s}\x1b[0m`;
let fallas = 0;
const check = (nombre: string, cond: boolean, extra = '') => {
  console.log(`${cond ? verde('✔') : rojo('✘')} ${nombre}${extra ? `  ${extra}` : ''}`);
  if (!cond) fallas++;
};

/** Genera una clave con dígito verificador válido (para pruebas) */
const conDv = (base48: string) => {
  let f = 2, s = 0;
  for (let i = base48.length - 1; i >= 0; i--) { s += +base48[i] * f; f = f === 7 ? 2 : f + 1; }
  let d = 11 - (s % 11); if (d === 11) d = 0; if (d === 10) d = 1;
  return base48 + d;
};

const claves = process.argv.slice(2).filter(a => /^\d{49}$/.test(a.replace(/\s/g, '')));

if (claves.length) {
  // ---------------------------------------------------------------- claves reales
  const dir = path.resolve('tmp-sri');
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Consultando ${claves.length} clave(s) al SRI…\n`);
  const resumen = await procesarLote(claves, {
    onResultado: (r, p) => {
      if (r.ok) {
        const file = path.join(dir, `${r.claveAcceso}.xml`);
        fs.writeFileSync(file, r.autorizacionXml, 'utf8');
        console.log(`${verde('✔')} [${p.hechas}/${p.total}] ${r.claveAcceso}  ${r.ambiente}  autorizado ${r.fechaAutorizacion}  → ${path.relative(process.cwd(), file)}`);
      } else {
        console.log(`${rojo('✘')} [${p.hechas}/${p.total}] ${r.claveAcceso}  ${r.error}: ${r.mensaje} (intentos: ${r.intentos})`);
      }
    },
  });
  console.log(`\nAutorizados: ${resumen.autorizados} · Errores: ${resumen.errores} ${JSON.stringify(resumen.porError)} · ${resumen.duracionMs} ms`);
  process.exitCode = 0;
} else {

// ---------------------------------------------------------------- pruebas sin red
const clave = conDv('0511202601' + '1791234567001' + '2' + '001001' + '000012345' + '12345678' + '1');
const factura = `<?xml version="1.0" encoding="UTF-8"?><factura id="comprobante" version="1.1.0"><infoTributaria><claveAcceso>${clave}</claveAcceso></infoTributaria></factura>`;
const sobre = (inner: string, n = 1) =>
  `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ns2:autorizacionComprobanteResponse xmlns:ns2="http://ec.gob.sri.ws.autorizacion"><RespuestaAutorizacionComprobante><claveAccesoConsultada>${clave}</claveAccesoConsultada><numeroComprobantes>${n}</numeroComprobantes><autorizaciones>${inner}</autorizaciones></RespuestaAutorizacionComprobante></ns2:autorizacionComprobanteResponse></soap:Body></soap:Envelope>`;
const aut = (estado: string, comprobante: string, mensajes = '') =>
  `<autorizacion><estado>${estado}</estado><numeroAutorizacion>${clave}</numeroAutorizacion><fechaAutorizacion>2026-11-05T14:30:00-05:00</fechaAutorizacion><ambiente>PRODUCCIÓN</ambiente><comprobante>${comprobante}</comprobante><mensajes>${mensajes}</mensajes></autorizacion>`;

console.log('Pruebas sin red\n');
let r = interpretarRespuesta(clave, sobre(aut('AUTORIZADO', `<![CDATA[${factura}]]>`)));
check('AUTORIZADO con CDATA', r.ok && r.comprobanteXml.startsWith('<?xml') && r.autorizacionXml.includes('<estado>AUTORIZADO</estado>'));

const escapado = factura.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
r = interpretarRespuesta(clave, sobre(aut('AUTORIZADO', escapado)));
check('AUTORIZADO con entidades escapadas', r.ok && r.comprobanteXml.includes('<factura'));

r = interpretarRespuesta(clave, sobre(aut('NO AUTORIZADO', '', '') + aut('AUTORIZADO', `<![CDATA[${factura}]]>`), 2));
check('Varios intentos: toma el AUTORIZADO', r.ok);

r = interpretarRespuesta(
  clave,
  sobre(aut('NO AUTORIZADO', '', '<mensaje><identificador>45</identificador><mensaje>ERROR SECUENCIAL REGISTRADO</mensaje><informacionAdicional>Ya existe</informacionAdicional><tipo>ERROR</tipo></mensaje>'))
);
check('NO AUTORIZADO con mensajes anidados', !r.ok && r.error === 'NO_AUTORIZADO' && r.mensajesSri?.[0]?.identificador === '45', !r.ok ? r.mensaje : '');

r = interpretarRespuesta(clave, sobre('', 0));
check('numeroComprobantes 0 → NO_EXISTE', !r.ok && r.error === 'NO_EXISTE');

r = interpretarRespuesta(clave, '<soap:Envelope><soap:Body><soap:Fault><faultstring>Servicio no disponible</faultstring></soap:Fault></soap:Body></soap:Envelope>');
check('SOAP Fault → SRI_ERROR (transitorio)', !r.ok && r.error === 'SRI_ERROR');

r = interpretarRespuesta(clave, sobre(aut('AUTORIZADO', `<![CDATA[${factura.replace(clave, '1'.repeat(49))}]]>`)));
check('XML de otra clave → rechazado', !r.ok && r.error === 'SRI_ERROR');

r = await consultarAutorizacion('123');
check('Clave corta → CLAVE_INVALIDA sin consultar', !r.ok && r.error === 'CLAVE_INVALIDA' && r.intentos === 0);
r = await consultarAutorizacion(clave.slice(0, 48) + ((+clave[48] + 1) % 10));
check('Dígito verificador incorrecto → CLAVE_INVALIDA', !r.ok && r.error === 'CLAVE_INVALIDA');

// Reintentos: 2 fallas de red y luego éxito
let llamadas = 0;
const fetchFalso = (async () => {
  llamadas++;
  if (llamadas <= 2) throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNRESET' } });
  return new Response(sobre(aut('AUTORIZADO', `<![CDATA[${factura}]]>`)), { status: 200 });
}) as typeof fetch;
r = await consultarAutorizacion(clave, { fetchImpl: fetchFalso, esperaBaseMs: 10 });
check('Reintenta errores de red y luego obtiene el XML', r.ok && r.intentos === 3, `(intentos: ${r.intentos})`);

// No reintenta errores definitivos
llamadas = 0;
const fetchNoExiste = (async () => (llamadas++, new Response(sobre('', 0), { status: 200 }))) as typeof fetch;
r = await consultarAutorizacion(clave, { fetchImpl: fetchNoExiste, esperaBaseMs: 10 });
check('NO_EXISTE no se reintenta', !r.ok && r.error === 'NO_EXISTE' && llamadas === 1);

// Timeout
const fetchLento = ((_u: unknown, init?: RequestInit) =>
  new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as typeof fetch;
r = await consultarAutorizacion(clave, { fetchImpl: fetchLento, timeoutMs: 100, reintentos: 1, esperaBaseMs: 10 });
check('Timeout → TIMEOUT tras reintentar', !r.ok && r.error === 'TIMEOUT' && r.intentos === 2);

// Lote: concurrencia, duplicados dentro del lote y progreso
let maxSimultaneas = 0, activas = 0, progresos = 0;
const fetchContador = (async () => {
  activas++; maxSimultaneas = Math.max(maxSimultaneas, activas);
  await new Promise(res => setTimeout(res, 30));
  activas--;
  return new Response(sobre('', 0), { status: 200 });
}) as typeof fetch;
const lote = Array.from({ length: 8 }, (_, i) => conDv('0511202601' + '1791234567001' + '2' + '001001' + String(100 + i).padStart(9, '0') + '12345678' + '1'));
const resumen = await procesarLote([...lote, lote[0]], { fetchImpl: fetchContador, pausaMs: 0, onResultado: () => void progresos++ });
check('Lote: sin repetir, máximo 3 simultáneas, progreso por clave', resumen.total === 8 && maxSimultaneas <= 3 && progresos === 8, `(máx simultáneas: ${maxSimultaneas})`);

// ---------------------------------------------------------------- consulta real de control
console.log('\nConsulta real al SRI de producción (clave de prueba que no existe)\n');
r = await consultarAutorizacion(clave, { reintentos: 1 });
check('El SRI responde y la respuesta se interpreta', !r.ok && (r.error === 'NO_EXISTE' || r.error === 'NO_AUTORIZADO'), !r.ok ? `${r.error}: ${r.mensaje}` : '');

console.log(fallas ? rojo(`\n${fallas} prueba(s) fallaron`) : verde('\nTodas las pruebas pasaron'));
process.exitCode = fallas ? 1 : 0;
}
