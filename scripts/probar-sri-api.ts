/**
 * Prueba de la Etapa 6: endpoints Express del módulo (base `tatoo_quicentro_test`, SRI simulado).
 *
 *   npm run sri:api
 */
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/tatoo_quicentro_test';
process.env.EMPRESA_RUC = '1792847102001';

import http from 'http';
const { getDb, cerrarMongo } = await import('../src/server/db/mongo.ts');
const { sriMiddleware } = await import('../src/server/modules/sri/sri.routes.ts');
const { esIpLocal } = await import('../src/server/middleware/localOnly.ts');
const { manejarErrores } = await import('../src/server/modules/sri/sri.controller.ts');

const verde = (s: string) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s: string) => `\x1b[31m${s}\x1b[0m`;
const gris = (s: string) => `\x1b[90m${s}\x1b[0m`;
let fallas = 0;
const check = (nombre: string, cond: boolean, extra = '') => {
  console.log(`${cond ? verde('✔') : rojo('✘')} ${nombre}${extra ? `  ${gris(extra)}` : ''}`);
  if (!cond) fallas++;
};

// ---------------------------------------------------------------- SRI simulado (solo para *.sri.gob.ec)
const conDv = (b: string) => {
  let f = 2, s = 0;
  for (let i = b.length - 1; i >= 0; i--) { s += +b[i] * f; f = f === 7 ? 2 : f + 1; }
  let d = 11 - (s % 11); if (d === 11) d = 0; if (d === 10) d = 1;
  return b + d;
};
const RUC = '1791234567001';
const clave = (fecha: string, sec: number, ruc = RUC) => conDv(fecha + '01' + ruc + '2' + '001002' + String(sec).padStart(9, '0') + '12345678' + '1');
const factura = (k: string, total: number) =>
  `<factura id="comprobante" version="2.1.0"><infoTributaria><ambiente>2</ambiente><tipoEmision>1</tipoEmision><razonSocial>${k.slice(10, 23) === RUC ? 'DISTRIBUIDORA ANDINA S.A.' : 'FERRETERIA QUITO CIA. LTDA.'}</razonSocial><ruc>${k.slice(10, 23)}</ruc><claveAcceso>${k}</claveAcceso><codDoc>01</codDoc><estab>001</estab><ptoEmi>002</ptoEmi><secuencial>${k.slice(30, 39)}</secuencial><dirMatriz>Quito</dirMatriz></infoTributaria><infoFactura><fechaEmision>${k.slice(0, 2)}/${k.slice(2, 4)}/${k.slice(4, 8)}</fechaEmision><tipoIdentificacionComprador>04</tipoIdentificacionComprador><razonSocialComprador>DEVOLUTION INK</razonSocialComprador><identificacionComprador>1792847102001</identificacionComprador><totalSinImpuestos>${(total / 1.15).toFixed(2)}</totalSinImpuestos><totalDescuento>0</totalDescuento><totalConImpuestos><totalImpuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><baseImponible>${(total / 1.15).toFixed(2)}</baseImponible><valor>${(total - total / 1.15).toFixed(2)}</valor></totalImpuesto></totalConImpuestos><propina>0</propina><importeTotal>${total.toFixed(2)}</importeTotal><moneda>DOLAR</moneda></infoFactura><detalles><detalle><codigoPrincipal>X</codigoPrincipal><descripcion>Item</descripcion><cantidad>1</cantidad><precioUnitario>${(total / 1.15).toFixed(2)}</precioUnitario><descuento>0</descuento><precioTotalSinImpuesto>${(total / 1.15).toFixed(2)}</precioTotalSinImpuesto><impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><tarifa>15</tarifa><baseImponible>${(total / 1.15).toFixed(2)}</baseImponible><valor>${(total - total / 1.15).toFixed(2)}</valor></impuesto></impuestos></detalle></detalles></factura>`;
const K1 = clave('03112026', 1), K2 = clave('04112026', 2), K3 = clave('05112026', 3, '1790000000001'), K_NO = clave('05112026', 9);
const TOTALES: Record<string, number> = { [K1]: 115, [K2]: 230, [K3]: 57.5 };

const fetchReal = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: RequestInit) => {
  if (!String(url).includes('sri.gob.ec')) return fetchReal(url, init);
  const k = /<claveAccesoComprobante>(\d{49})</.exec(String(init?.body))?.[1] ?? '';
  await new Promise(r => setTimeout(r, 40));
  if (!TOTALES[k]) return new Response(`<soap:Envelope><soap:Body><RespuestaAutorizacionComprobante><numeroComprobantes>0</numeroComprobantes><autorizaciones/></RespuestaAutorizacionComprobante></soap:Body></soap:Envelope>`);
  return new Response(
    `<soap:Envelope><soap:Body><RespuestaAutorizacionComprobante><numeroComprobantes>1</numeroComprobantes><autorizaciones><autorizacion><estado>AUTORIZADO</estado><numeroAutorizacion>${k}</numeroAutorizacion><fechaAutorizacion>2026-11-05T10:00:00-05:00</fechaAutorizacion><ambiente>PRODUCCIÓN</ambiente><comprobante><![CDATA[${factura(k, TOTALES[k])}]]></comprobante></autorizacion></autorizaciones></RespuestaAutorizacionComprobante></soap:Body></soap:Envelope>`
  );
}) as typeof fetch;

// ---------------------------------------------------------------- servidor de prueba
const db = await getDb();
await db.dropDatabase();
const mw = sriMiddleware();
const server = http.createServer((req, res) => mw(req, res, () => ((res.statusCode = 404), res.end('fuera del módulo'))));
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const api = async (method: string, path: string, body?: unknown, tipo = 'application/json') => {
  const r = await fetchReal(base + path, { method, headers: body !== undefined ? { 'Content-Type': tipo } : {}, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  const texto = await r.text();
  let json: any = null;
  try { json = JSON.parse(texto); } catch { /* XML u otro */ }
  return { status: r.status, json, texto, headers: r.headers };
};
const esperarFin = async () => {
  for (let i = 0; i < 100; i++) {
    const e = await api('GET', '/api/sri/estado-sincronizacion');
    if (!e.json.enCurso) return e.json;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('La sincronización no terminó');
};

try {
  console.log('Validación de parámetros\n');
  check('Fecha mal escrita → 400', (await api('GET', '/api/sri/comprobantes-recibidos?desde=05/11/2026')).status === 400);
  check('desde > hasta → 400', (await api('GET', '/api/sri/comprobantes-recibidos?desde=2026-12-01&hasta=2026-11-01')).status === 400);
  const t = await api('GET', '/api/sri/comprobantes-recibidos?tipo=01,99');
  check('Tipo inexistente → 400 con mensaje claro', t.status === 400 && t.json.error.includes('99'), t.json?.error);
  check('porPagina fuera de rango → 400', (await api('GET', '/api/sri/comprobantes-recibidos?porPagina=1000')).status === 400);
  check('Clave mal formada en la ruta → 400', (await api('GET', '/api/sri/comprobantes-recibidos/123')).status === 400);
  check('JSON mal formado → 400', (await api('POST', '/api/sri/claves', '{malo', 'application/json')).status === 400);
  check('Sin claves → 400', (await api('POST', '/api/sri/claves', {})).status === 400);
  check('Método no permitido → 405', (await api('DELETE', '/api/sri/claves')).status === 405);
  check('Ruta fuera del módulo pasa de largo', (await api('GET', '/api/sri/ruc/1790012345001')).texto === 'fuera del módulo');

  console.log('\nCarga de claves y sincronización\n');
  const txt = `COMPROBANTE\tCLAVE_ACCESO\nFactura\t${K1}\nFactura\t${K2}\nFactura\t${K3}\nFactura\t${K_NO}\nFactura\t${K1}`;
  const c = await api('POST', '/api/sri/claves', txt, 'text/plain');
  check('POST /claves (TXT en text/plain) → 201: 4 en cola', c.status === 201 && c.json.encoladas === 4, JSON.stringify(c.json));
  const s1 = await api('POST', '/api/sri/sincronizar', { desde: '2026-11-01', hasta: '2026-11-30' });
  const s2 = await api('POST', '/api/sri/sincronizar', {});
  check('POST /sincronizar → 202 con id de ejecución', s1.status === 202 && !!s1.json.idEjecucion);
  check('Segunda sincronización simultánea → 409', s2.status === 409, s2.json?.error);
  const durante = await api('GET', '/api/sri/estado-sincronizacion');
  check('Estado durante la ejecución: enCurso y progreso', durante.json.enCurso === true && durante.json.actual?.encontrados === 4, `procesados ${durante.json.actual?.procesados}/${durante.json.actual?.encontrados}`);
  const fin = await esperarFin();
  check('Estado al terminar: 3 nuevos, 1 error', fin.ultima.estado === 'COMPLETADA' && fin.ultima.nuevos === 3 && fin.ultima.errores === 1, JSON.stringify({ nuevos: fin.ultima.nuevos, errores: fin.ultima.errores }));

  console.log('\nConsulta de comprobantes\n');
  const l = await api('GET', '/api/sri/comprobantes-recibidos?desde=2026-11-01&hasta=2026-11-30&porPagina=2');
  check('Listado paginado (2 por página, 3 en total, 2 páginas)', l.status === 200 && l.json.items.length === 2 && l.json.paginacion.total === 3 && l.json.paginacion.paginas === 2);
  check('Ordenado por fecha descendente', l.json.items[0].claveAcceso === K3);
  check('El listado no envía el XML', l.json.items.every((i: any) => i.xmlOriginal === undefined));
  check('Resumen del filtro: total 402.50 e IVA', l.json.resumen.total === 402.5 && l.json.resumen.comprobantes === 3 && l.json.resumen.porContabilizar === 3, JSON.stringify(l.json.resumen));
  const q = await api('GET', '/api/sri/comprobantes-recibidos?q=ferreteria');
  check('Búsqueda por proveedor (sin tildes/mayúsculas)', q.json.items.length === 1 && q.json.items[0].claveAcceso === K3);
  const qr = await api('GET', `/api/sri/comprobantes-recibidos?q=${RUC}`);
  check('Búsqueda por RUC', qr.json.items.length === 2);
  const fr = await api('GET', '/api/sri/comprobantes-recibidos?desde=2026-11-04&hasta=2026-11-04');
  check('Filtro por un solo día', fr.json.items.length === 1 && fr.json.items[0].claveAcceso === K2);
  const d = await api('GET', `/api/sri/comprobantes-recibidos/${K1}`);
  check('Detalle completo sin XML', d.status === 200 && d.json.detalles.length === 1 && d.json.xmlOriginal === undefined && d.json.totales.total === 115);
  const x = await api('GET', `/api/sri/comprobantes-recibidos/${K1}/xml?descargar=1`);
  check('XML original como descarga', x.status === 200 && x.headers.get('content-type')?.includes('xml') === true && x.headers.get('content-disposition')?.startsWith('attachment') === true && x.texto.includes('<autorizacion>'));
  check('Detalle inexistente → 404', (await api('GET', `/api/sri/comprobantes-recibidos/${K_NO}`)).status === 404);

  console.log('\nActualización\n');
  const p = await api('PATCH', `/api/sri/comprobantes-recibidos/${K1}`, { estadoProcesamiento: 'CONTABILIZADO', expenseId: 'exp-123' });
  check('PATCH marca contabilizado con el gasto', p.status === 200 && p.json.estadoProcesamiento === 'CONTABILIZADO' && p.json.expenseId === 'exp-123');
  check('PATCH con estado inválido → 400', (await api('PATCH', `/api/sri/comprobantes-recibidos/${K1}`, { estadoProcesamiento: 'BORRADO' })).status === 400);
  const pend = await api('GET', '/api/sri/comprobantes-recibidos?estado=PENDIENTE_REVISION');
  check('Filtro por estado', pend.json.paginacion.total === 2);

  console.log('\nCola, XML y configuración\n');
  const cf = await api('GET', '/api/sri/claves?estado=FALLIDA');
  check('Claves fallidas con su motivo', cf.json.items.length === 1 && cf.json.items[0].ultimoError.tipo === 'NO_EXISTE');
  const xs = await api('POST', '/api/sri/xml', { archivos: [{ nombre: 'f.xml', contenido: x.texto }, { nombre: 'roto.xml', contenido: '<nada/>' }] });
  check('POST /xml: el ya registrado no se duplica y el roto se informa', xs.status === 201 && xs.json.encolado.yaRegistradas === 1 && xs.json.errores.length === 1, JSON.stringify(xs.json));
  const a = await api('POST', '/api/sri/sincronizacion/automatica', { activa: true, cadaMinutos: 30, horaInicio: '08:00', horaFin: '19:00' });
  check('Configurar sincronización automática', a.status === 200 && a.json.activa === true && a.json.cadaMinutos === 30);
  check('Configuración inválida → 400', (await api('POST', '/api/sri/sincronizacion/automatica', { activa: true, cadaMinutos: 5 })).status === 400);
  const h = await api('GET', '/api/sri/sincronizaciones?limite=5');
  check('Historial de sincronizaciones', h.status === 200 && h.json.length >= 1);

  console.log('\nSeguridad y errores\n');
  check('Red local permitida (127.0.0.1, 192.168.x, 10.x, ::1)', ['127.0.0.1', '::ffff:192.168.1.20', '10.0.0.5', '::1', '172.20.1.1'].every(esIpLocal));
  check('IP pública bloqueada', !['8.8.8.8', '200.105.1.1', '172.32.0.1', undefined].some(ip => esIpLocal(ip as any)));
  let st = 0, body: any = null;
  const resFalsa: any = { status(s: number) { st = s; return this; }, json(b: any) { body = b; } };
  manejarErrores(Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:27017'), { name: 'MongoServerSelectionError' }), {} as any, resFalsa, () => {});
  check('MongoDB apagado → 503 con mensaje claro', st === 503 && body.error.includes('MongoDB'), body?.error);
} catch (err) {
  console.error(rojo('Error inesperado:'), err);
  fallas++;
} finally {
  server.close();
  await db.dropDatabase().catch(() => {});
  await cerrarMongo();
  globalThis.fetch = fetchReal;
}

console.log(fallas ? rojo(`\n${fallas} prueba(s) fallaron`) : verde('\nTodas las pruebas pasaron (base de prueba eliminada)'));
process.exitCode = fallas ? 1 : 0;
