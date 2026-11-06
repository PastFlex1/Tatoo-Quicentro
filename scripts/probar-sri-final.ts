/**
 * Prueba de la Etapa 8: cifrado, correo (sin buzón real), programador automático y flujo completo.
 * Base `tatoo_quicentro_test` (se borra) · SRI simulado.
 *
 *   npm run sri:final
 */
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/tatoo_quicentro_test';
process.env.EMPRESA_RUC = '1792847102001';
process.env.SRI_PROGRAMADOR = '0';
delete process.env.SRI_SECRET_KEY;

import http from 'http';
const { cifrar, descifrar } = await import('../src/server/security/cifrado.ts');
const { procesarMensaje } = await import('../src/server/modules/sri/sources/imap.source.ts');
const { estaEnHorario, tocaEjecutar, revisar } = await import('../src/server/modules/sri/sri.scheduler.ts');
const { getDb, cerrarMongo } = await import('../src/server/db/mongo.ts');
const { sriMiddleware } = await import('../src/server/modules/sri/sri.routes.ts');
const { COL } = await import('../src/server/modules/sri/sri.model.ts');

const verde = (s: string) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s: string) => `\x1b[31m${s}\x1b[0m`;
const gris = (s: string) => `\x1b[90m${s}\x1b[0m`;
let fallas = 0;
const check = (nombre: string, cond: boolean, extra = '') => {
  console.log(`${cond ? verde('✔') : rojo('✘')} ${nombre}${extra ? `  ${gris(extra)}` : ''}`);
  if (!cond) fallas++;
};

// ---------------------------------------------------------------- cifrado
console.log('Cifrado de credenciales\n');
let err = '';
try { cifrar('x'); } catch (e: any) { err = e.message; }
check('Sin SRI_SECRET_KEY no se guarda la contraseña', err.includes('SRI_SECRET_KEY'), err);
process.env.SRI_SECRET_KEY = 'clave-de-prueba-larga-1234567890';
const c1 = cifrar('MiContraseña-Gmail_123');
const c2 = cifrar('MiContraseña-Gmail_123');
check('Cifra y descifra (AES-256-GCM)', descifrar(c1) === 'MiContraseña-Gmail_123');
check('El texto cifrado no contiene la contraseña y cambia en cada cifrado', !c1.includes('Gmail') && c1 !== c2);
const alterado = c1.slice(0, -4) + (c1.endsWith('AAAA') ? 'BBBB' : 'AAAA');
err = '';
try { descifrar(alterado); } catch (e: any) { err = e.message; }
check('Un dato alterado se detecta', err.includes('No se pudo descifrar'));
process.env.SRI_SECRET_KEY = 'otra-clave-distinta-0987654321';
err = '';
try { descifrar(c1); } catch (e: any) { err = e.message; }
check('Con otra SRI_SECRET_KEY no se puede leer', err.includes('No se pudo descifrar'));
process.env.SRI_SECRET_KEY = 'clave-de-prueba-larga-1234567890';

// ---------------------------------------------------------------- correos (sin buzón real)
const conDv = (b: string) => {
  let f = 2, s = 0;
  for (let i = b.length - 1; i >= 0; i--) { s += +b[i] * f; f = f === 7 ? 2 : f + 1; }
  let d = 11 - (s % 11); if (d === 11) d = 0; if (d === 10) d = 1;
  return b + d;
};
const RUC = '1791234567001';
const clave = (sec: number) => conDv('05112026' + '01' + RUC + '2' + '001002' + String(sec).padStart(9, '0') + '12345678' + '1');
const factura = (k: string) =>
  `<factura id="comprobante" version="2.1.0"><infoTributaria><ambiente>2</ambiente><tipoEmision>1</tipoEmision><razonSocial>DISTRIBUIDORA ANDINA S.A.</razonSocial><ruc>${RUC}</ruc><claveAcceso>${k}</claveAcceso><codDoc>01</codDoc><estab>001</estab><ptoEmi>002</ptoEmi><secuencial>${k.slice(30, 39)}</secuencial><dirMatriz>Quito</dirMatriz></infoTributaria><infoFactura><fechaEmision>05/11/2026</fechaEmision><tipoIdentificacionComprador>04</tipoIdentificacionComprador><razonSocialComprador>DEVOLUTION INK</razonSocialComprador><identificacionComprador>1792847102001</identificacionComprador><totalSinImpuestos>100.00</totalSinImpuestos><totalDescuento>0</totalDescuento><totalConImpuestos><totalImpuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><baseImponible>100.00</baseImponible><valor>15.00</valor></totalImpuesto></totalConImpuestos><propina>0</propina><importeTotal>115.00</importeTotal><moneda>DOLAR</moneda></infoFactura><detalles><detalle><codigoPrincipal>A</codigoPrincipal><descripcion>Tinta</descripcion><cantidad>1</cantidad><precioUnitario>100</precioUnitario><descuento>0</descuento><precioTotalSinImpuesto>100</precioTotalSinImpuesto><impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><tarifa>15</tarifa><baseImponible>100</baseImponible><valor>15</valor></impuesto></impuestos></detalle></detalles></factura>`;
const K_ADJ = clave(501), K_TEXTO = clave(502), K_HTML = clave(503);
const b64 = (s: string) => Buffer.from(s).toString('base64').replace(/.{76}/g, '$&\r\n');
const correo = [
  'From: "Distribuidora Andina" <facturacion@andina.ec>',
  'To: facturas@devolutionink.ec',
  `Subject: Factura electronica 001-002-000000501`,
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="LIMITE"',
  '',
  '--LIMITE',
  'Content-Type: multipart/alternative; boundary="ALT"',
  '',
  '--ALT',
  'Content-Type: text/plain; charset=utf-8',
  '',
  `Estimado cliente, adjuntamos su comprobante. Tambien le recordamos la factura con clave de acceso ${K_TEXTO}.`,
  '--ALT',
  'Content-Type: text/html; charset=utf-8',
  '',
  `<p>Clave de acceso: <b>${K_HTML}</b></p>`,
  '--ALT--',
  '--LIMITE',
  'Content-Type: application/xml; name="factura.xml"',
  'Content-Disposition: attachment; filename="001-002-000000501.xml"',
  'Content-Transfer-Encoding: base64',
  '',
  b64(`<?xml version="1.0" encoding="UTF-8"?><autorizacion><estado>AUTORIZADO</estado><numeroAutorizacion>${K_ADJ}</numeroAutorizacion><fechaAutorizacion>2026-11-05T10:00:00-05:00</fechaAutorizacion><comprobante><![CDATA[${factura(K_ADJ)}]]></comprobante></autorizacion>`),
  '--LIMITE',
  'Content-Type: application/pdf; name="RIDE.pdf"',
  'Content-Disposition: attachment; filename="RIDE.pdf"',
  'Content-Transfer-Encoding: base64',
  '',
  b64('%PDF-1.4 contenido simulado'),
  '--LIMITE--',
  '',
].join('\r\n');

console.log('\nCorreo: lectura de mensajes\n');
const m = await procesarMensaje(correo);
check('XML adjunto → su clave de acceso', m.claves.includes(K_ADJ) && m.xmls === 1);
check('Claves escritas en el texto y en el HTML', m.claves.includes(K_TEXTO) && m.claves.includes(K_HTML), `${m.claves.length} claves`);
check('El PDF del RIDE se ignora', m.ignorados === 1);
const sinNada = await procesarMensaje('From: a@b.c\r\nSubject: Hola\r\n\r\nSin comprobantes. Telefono 0991234567.');
check('Un correo sin comprobantes no genera claves', sinNada.claves.length === 0);

// ---------------------------------------------------------------- programador (funciones puras)
console.log('\nProgramador automático\n');
const ec = (hhmm: string) => new Date(`2026-11-06T${hhmm}:00-05:00`);
check('Dentro y fuera del horario 08:00–20:00', estaEnHorario(ec('08:00'), '08:00', '20:00') && estaEnHorario(ec('19:59'), '08:00', '20:00') && !estaEnHorario(ec('20:00'), '08:00', '20:00') && !estaEnHorario(ec('07:30'), '08:00', '20:00'));
check('Horario que cruza la medianoche (22:00–06:00)', estaEnHorario(ec('23:30'), '22:00', '06:00') && estaEnHorario(ec('05:00'), '22:00', '06:00') && !estaEnHorario(ec('12:00'), '22:00', '06:00'));
const cfg = { activa: true, cadaMinutos: 60, horaInicio: '08:00', horaFin: '20:00' };
check('Toca si nunca se ejecutó', tocaEjecutar(ec('10:00'), cfg, null));
check('No toca antes del intervalo; sí después', !tocaEjecutar(ec('10:30'), cfg, ec('10:00')) && tocaEjecutar(ec('11:00'), cfg, ec('10:00')));
check('Desactivada nunca toca', !tocaEjecutar(ec('10:00'), { ...cfg, activa: false }, null));
check('Fuera de horario no toca aunque haya pasado el intervalo', !tocaEjecutar(ec('21:00'), cfg, ec('10:00')));

// ---------------------------------------------------------------- integración (MongoDB + API + SRI simulado)
const VALIDAS: Record<string, true> = { [K_ADJ]: true, [K_TEXTO]: true };
const fetchReal = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: RequestInit) => {
  if (!String(url).includes('sri.gob.ec')) return fetchReal(url, init);
  const k = /<claveAccesoComprobante>(\d{49})</.exec(String(init?.body))?.[1] ?? '';
  if (!VALIDAS[k]) return new Response('<soap:Envelope><soap:Body><RespuestaAutorizacionComprobante><numeroComprobantes>0</numeroComprobantes></RespuestaAutorizacionComprobante></soap:Body></soap:Envelope>');
  return new Response(`<soap:Envelope><soap:Body><RespuestaAutorizacionComprobante><numeroComprobantes>1</numeroComprobantes><autorizaciones><autorizacion><estado>AUTORIZADO</estado><numeroAutorizacion>${k}</numeroAutorizacion><fechaAutorizacion>2026-11-05T10:00:00-05:00</fechaAutorizacion><ambiente>PRODUCCIÓN</ambiente><comprobante><![CDATA[${factura(k)}]]></comprobante></autorizacion></autorizaciones></RespuestaAutorizacionComprobante></soap:Body></soap:Envelope>`);
}) as typeof fetch;

const db = await getDb();
await db.dropDatabase();
const mw = sriMiddleware();
const server = http.createServer((req, res) => mw(req, res, () => ((res.statusCode = 404), res.end())));
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const api = async (method: string, path: string, body?: unknown) => {
  const r = await fetchReal(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const esperarFin = async () => {
  for (let i = 0; i < 100; i++) {
    const e = await api('GET', '/api/sri/estado-sincronizacion');
    if (!e.json.enCurso) return e.json;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('no terminó');
};

try {
  console.log('\nConfiguración del correo por la API\n');
  const datos = { activo: true, host: 'imap.servidor-inexistente-prueba.invalid', puerto: 993, seguro: true, usuario: 'facturas@devolutionink.ec', contrasena: 'MiContraseña-Gmail_123', carpeta: 'INBOX', diasAtras: 30 };
  check('Host inválido → 400', (await api('PUT', '/api/sri/correo', { ...datos, host: 'no valido!' })).status === 400);
  const g = await api('PUT', '/api/sri/correo', datos);
  check('Guardar buzón → la API no devuelve la contraseña', g.status === 200 && g.json.correo.tieneContrasena === true && !JSON.stringify(g.json).includes('MiContraseña'));
  const enBase: any = await db.collection(COL.configuracion).findOne({ _id: 'principal' } as any);
  check('En MongoDB la contraseña está cifrada', enBase.correo.contrasenaCifrada.startsWith('v1:') && !JSON.stringify(enBase).includes('MiContraseña'));
  const p = await api('POST', '/api/sri/correo/probar', datos);
  check('Probar con un servidor inexistente → mensaje claro', p.status === 422 && /servidor de correo|no respondió/.test(p.json.error), p.json?.error);

  console.log('\nSINCRONIZAR SRI con el correo caído\n');
  await api('POST', '/api/sri/claves', { texto: `${K_ADJ}\n${clave(599)}`, fuente: 'TXT' });
  const s = await api('POST', '/api/sri/sincronizar', {});
  check('El error del correo no impide sincronizar la cola (202 + aviso)', s.status === 202 && !!s.json.correo.error, s.json?.correo?.error);
  const fin = await esperarFin();
  check('La cola se procesó: 1 nuevo, 1 no existe', fin.ultima.nuevos === 1 && fin.ultima.errores === 1);
  const c = await api('GET', '/api/sri/correo');
  check('El último error del correo queda visible', !!c.json.correo.ultimoError);

  console.log('\nSincronización automática\n');
  check('Programador desactivado → no hace nada', (await revisar()) === 'inactivo');
  await api('POST', '/api/sri/sincronizacion/automatica', { activa: true, cadaMinutos: 15, horaInicio: '00:00', horaFin: '00:00' });
  await api('POST', '/api/sri/claves', { claves: [K_TEXTO] });
  const r1 = await revisar();
  check('Primera revisión → ejecuta (lee correo + cola)', r1 === 'ejecutada', r1);
  const fin2 = await esperarFin();
  check('La ejecución automática trajo la clave pendiente', fin2.ultima.disparador === 'AUTOMATICA' && fin2.ultima.nuevos === 1);
  check('Revisión inmediata → aún no toca (intervalo de 15 min)', (await revisar()) === 'no_toca');
  check('A los 16 minutos → vuelve a tocar', (await revisar(new Date(Date.now() + 16 * 60000))) === 'ejecutada');
  await esperarFin();

  console.log('\nFlujo completo en la bandeja\n');
  const l = await api('GET', '/api/sri/comprobantes-recibidos');
  check('2 comprobantes en la bandeja, sin duplicados', l.json.paginacion.total === 2);
  const pa = await api('PATCH', `/api/sri/comprobantes-recibidos/${K_ADJ}`, { estadoProcesamiento: 'CONTABILIZADO', expenseId: 'exp-1' });
  check('Contabilizar marca el comprobante', pa.json.estadoProcesamiento === 'CONTABILIZADO');
  const h = await api('GET', '/api/sri/sincronizaciones');
  check('Historial: manual y automáticas registradas', h.json.length === 3 && h.json.filter((x: any) => x.disparador === 'AUTOMATICA').length === 2);
} catch (e) {
  console.error(rojo('Error inesperado:'), e);
  fallas++;
} finally {
  server.close();
  await db.dropDatabase().catch(() => {});
  await cerrarMongo();
  globalThis.fetch = fetchReal;
}

console.log(fallas ? rojo(`\n${fallas} prueba(s) fallaron`) : verde('\nTodas las pruebas pasaron (base de prueba eliminada)'));
process.exitCode = fallas ? 1 : 0;
