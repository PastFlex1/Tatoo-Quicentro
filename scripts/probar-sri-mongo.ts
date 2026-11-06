/**
 * Prueba de la Etapa 5: MongoDB, cola, control de duplicados y sincronización completa.
 * Usa la base `tatoo_quicentro_test` (se borra al inicio y al final). Simula las respuestas del SRI.
 *
 *   npm run sri:mongo
 */
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/tatoo_quicentro_test';
process.env.EMPRESA_RUC = '1792847102001';

const { getDb, cerrarMongo } = await import('../src/server/db/mongo.ts');
const { prepararBase, COL } = await import('../src/server/modules/sri/sri.model.ts');
const { encolarClaves, ejecutarSincronizacion, registrarComprobante, estadoSincronizacion } = await import('../src/server/modules/sri/sri.sync.ts');

const verde = (s: string) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s: string) => `\x1b[31m${s}\x1b[0m`;
const gris = (s: string) => `\x1b[90m${s}\x1b[0m`;
let fallas = 0;
const check = (nombre: string, cond: boolean, extra = '') => {
  console.log(`${cond ? verde('✔') : rojo('✘')} ${nombre}${extra ? `  ${gris(extra)}` : ''}`);
  if (!cond) fallas++;
};

const conDv = (base48: string) => {
  let f = 2, s = 0;
  for (let i = base48.length - 1; i >= 0; i--) { s += +base48[i] * f; f = f === 7 ? 2 : f + 1; }
  let d = 11 - (s % 11); if (d === 11) d = 0; if (d === 10) d = 1;
  return base48 + d;
};
const RUC_PROV = '1791234567001';
const clave = (fecha: string, tipo: string, sec: number) => conDv(fecha + tipo + RUC_PROV + '2' + '001002' + String(sec).padStart(9, '0') + '12345678' + '1');

const facturaXml = (k: string, comprador = '1792847102001') =>
  `<factura id="comprobante" version="2.1.0"><infoTributaria><ambiente>2</ambiente><tipoEmision>1</tipoEmision><razonSocial>DISTRIBUIDORA ANDINA S.A.</razonSocial><ruc>${RUC_PROV}</ruc><claveAcceso>${k}</claveAcceso><codDoc>01</codDoc><estab>${k.slice(24, 27)}</estab><ptoEmi>${k.slice(27, 30)}</ptoEmi><secuencial>${k.slice(30, 39)}</secuencial><dirMatriz>Quito</dirMatriz></infoTributaria><infoFactura><fechaEmision>${k.slice(0, 2)}/${k.slice(2, 4)}/${k.slice(4, 8)}</fechaEmision><tipoIdentificacionComprador>04</tipoIdentificacionComprador><razonSocialComprador>CLIENTE</razonSocialComprador><identificacionComprador>${comprador}</identificacionComprador><totalSinImpuestos>100.00</totalSinImpuestos><totalDescuento>0</totalDescuento><totalConImpuestos><totalImpuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><baseImponible>100.00</baseImponible><valor>15.00</valor></totalImpuesto></totalConImpuestos><propina>0</propina><importeTotal>115.00</importeTotal><moneda>DOLAR</moneda></infoFactura><detalles><detalle><codigoPrincipal>A1</codigoPrincipal><descripcion>Insumo</descripcion><cantidad>1</cantidad><precioUnitario>100</precioUnitario><descuento>0</descuento><precioTotalSinImpuesto>100.00</precioTotalSinImpuesto><impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><tarifa>15</tarifa><baseImponible>100</baseImponible><valor>15</valor></impuesto></impuestos></detalle></detalles></factura>`;

const retencionXml = (k: string) =>
  `<comprobanteRetencion id="comprobante" version="2.0.0"><infoTributaria><ambiente>2</ambiente><tipoEmision>1</tipoEmision><razonSocial>DISTRIBUIDORA ANDINA S.A.</razonSocial><ruc>${RUC_PROV}</ruc><claveAcceso>${k}</claveAcceso><codDoc>07</codDoc><estab>001</estab><ptoEmi>002</ptoEmi><secuencial>${k.slice(30, 39)}</secuencial><dirMatriz>Quito</dirMatriz></infoTributaria><infoCompRetencion><fechaEmision>${k.slice(0, 2)}/${k.slice(2, 4)}/${k.slice(4, 8)}</fechaEmision><tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido><razonSocialSujetoRetenido>DEVOLUTION INK</razonSocialSujetoRetenido><identificacionSujetoRetenido>1792847102001</identificacionSujetoRetenido><periodoFiscal>11/2026</periodoFiscal></infoCompRetencion><docsSustento><docSustento><codSustento>01</codSustento><codDocSustento>01</codDocSustento><numDocSustento>001001000000123</numDocSustento><fechaEmisionDocSustento>04/11/2026</fechaEmisionDocSustento><retenciones><retencion><codigo>1</codigo><codigoRetencion>3440</codigoRetencion><baseImponible>200</baseImponible><porcentajeRetener>2.75</porcentajeRetener><valorRetenido>5.50</valorRetenido></retencion></retenciones></docSustento></docsSustento></comprobanteRetencion>`;

const soap = (k: string, inner: string, n = 1) =>
  `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ns2:autorizacionComprobanteResponse xmlns:ns2="http://ec.gob.sri.ws.autorizacion"><RespuestaAutorizacionComprobante><claveAccesoConsultada>${k}</claveAccesoConsultada><numeroComprobantes>${n}</numeroComprobantes><autorizaciones>${inner}</autorizaciones></RespuestaAutorizacionComprobante></ns2:autorizacionComprobanteResponse></soap:Body></soap:Envelope>`;
const autorizado = (k: string, xml: string) =>
  soap(k, `<autorizacion><estado>AUTORIZADO</estado><numeroAutorizacion>${k}</numeroAutorizacion><fechaAutorizacion>2026-11-05T14:30:00-05:00</fechaAutorizacion><ambiente>PRODUCCIÓN</ambiente><comprobante><![CDATA[${xml}]]></comprobante><mensajes/></autorizacion>`);

// Claves de prueba
const A = clave('05112026', '01', 1), B = clave('05112026', '01', 2), C = clave('06112026', '01', 3);
const D_NO_EXISTE = clave('05112026', '01', 4);
const E_OTRO_RECEPTOR = clave('05112026', '01', 5);
const F_SRI_CAIDO = clave('05112026', '01', 6);
const G_RETENCION = clave('06112026', '07', 7);
const H_OCTUBRE = clave('15102026', '01', 8);

let llamadasSri = 0;
const sriFalso = (async (_url: unknown, init?: RequestInit) => {
  llamadasSri++;
  const k = /<claveAccesoComprobante>(\d{49})</.exec(String(init?.body))?.[1] ?? '';
  await new Promise(r => setTimeout(r, 5));
  if (k === D_NO_EXISTE) return new Response(soap(k, '', 0), { status: 200 });
  if (k === F_SRI_CAIDO) return new Response('Service Unavailable', { status: 503 });
  if (k === E_OTRO_RECEPTOR) return new Response(autorizado(k, facturaXml(k, '0999999999001')), { status: 200 });
  if (k === G_RETENCION) return new Response(autorizado(k, retencionXml(k)), { status: 200 });
  return new Response(autorizado(k, facturaXml(k)), { status: 200 });
}) as typeof fetch;

const db = await getDb();
try {
  await db.dropDatabase();

  console.log('Base de datos\n');
  await prepararBase(db);
  await prepararBase(db); // idempotente
  const indices = (await db.collection(COL.comprobantes).indexes()).map(i => i.name);
  check('Colecciones e índices creados (2 veces sin error)', indices.includes('claveAcceso_unica') && indices.includes('busqueda_texto'), indices.join(', '));
  const unico = (await db.collection(COL.comprobantes).indexes()).find(i => i.name === 'claveAcceso_unica');
  check('Índice único por clave de acceso', unico?.unique === true);
  let codigo = 0;
  try {
    await db.collection(COL.comprobantes).insertOne({ claveAcceso: '123', tipo: '99' });
  } catch (e: any) {
    codigo = e.code;
  }
  check('La validación de esquema rechaza documentos mal formados', codigo === 121, `código ${codigo}`);

  console.log('\nCola de claves\n');
  const txt = `COMPROBANTE\tCLAVE_ACCESO\nFactura\t${A}\nFactura\t${B}\nFactura\t${A}\nFactura\t${C}\n${D_NO_EXISTE}\n${E_OTRO_RECEPTOR} ${F_SRI_CAIDO}\nRetención\t${G_RETENCION}\n${'1'.repeat(49)}\n${H_OCTUBRE}`;
  const enc = await encolarClaves(db, txt, 'TXT');
  check('Reporte TXT: 8 válidas (sin repetir) y 1 inválida', enc.recibidas === 8 && enc.encoladas === 8 && enc.invalidas.length === 1, JSON.stringify({ ...enc, invalidas: enc.invalidas.length }));
  const enc2 = await encolarClaves(db, [A, B], 'CLAVE');
  check('Volver a cargar las mismas claves no duplica la cola', enc2.encoladas === 0 && enc2.yaEnCola === 2);

  console.log('\nSincronización (rango 1–30 nov 2026)\n');
  const desde = new Date('2026-11-01T00:00:00-05:00');
  const hasta = new Date('2026-11-30T23:59:59-05:00');
  const [r1, r2] = await Promise.all([
    ejecutarSincronizacion(db, { desde, hasta, fetchImpl: sriFalso, esperaBaseMs: 5 }),
    new Promise(res => setTimeout(res, 20)).then(() => ejecutarSincronizacion(db, { desde, hasta, fetchImpl: sriFalso, esperaBaseMs: 5 })),
  ]);
  check('Candado: la segunda sincronización simultánea se rechaza', r1.ok && !r2.ok && 'ocupado' in r2);
  if (r1.ok) {
    const e = r1.ejecucion;
    check('Encontradas 7 (la de octubre queda fuera del rango)', e.encontrados === 7, `encontrados ${e.encontrados}`);
    check('Nuevos 4 (3 facturas + 1 retención)', e.nuevos === 4, `nuevos ${e.nuevos}`);
    check('Errores 3: no existe, otro receptor, SRI caído', e.errores === 3 && ['NO_EXISTE', 'OTRO_RECEPTOR', 'SRI_ERROR'].every(t => e.detalleErrores.some(d => d.tipo === t)), e.detalleErrores.map(d => d.tipo).join(', '));
    check('Bitácora completada con fecha de fin', e.estado === 'COMPLETADA' && !!e.fin);
  }
  const comp = db.collection(COL.comprobantes);
  check('4 comprobantes guardados', (await comp.countDocuments()) === 4);
  const docA: any = await comp.findOne({ claveAcceso: A });
  check('Documento completo: fechas como Date, XML original, bases y fuente', docA && docA.fechaEmision instanceof Date && docA.fechaAutorizacion instanceof Date && docA.xmlOriginal.includes('<autorizacion>') && docA.totales.base15 === 100 && docA.fuente === 'TXT' && docA.estadoProcesamiento === 'PENDIENTE_REVISION');
  const docG: any = await comp.findOne({ claveAcceso: G_RETENCION });
  check('La retención se guarda con sus retenciones', docG?.tipo === '07' && docG.totalRetenido === 5.5);

  const pend = db.collection(COL.pendientes);
  const f: any = await pend.findOne({ claveAcceso: F_SRI_CAIDO });
  check('SRI caído → sigue PENDIENTE con reintento programado', f?.estado === 'PENDIENTE' && f.intentos === 1 && f.proximoIntento > new Date(), `próximo intento ${f?.proximoIntento?.toISOString()}`);
  const d: any = await pend.findOne({ claveAcceso: D_NO_EXISTE });
  const eo: any = await pend.findOne({ claveAcceso: E_OTRO_RECEPTOR });
  check('No existe / otro receptor → FALLIDA sin reintento', d?.estado === 'FALLIDA' && eo?.estado === 'FALLIDA' && d.proximoIntento === null);
  check('Fuera de rango → sigue PENDIENTE sin consultar', (await pend.findOne({ claveAcceso: H_OCTUBRE }))?.estado === 'PENDIENTE');

  console.log('\nDuplicados\n');
  const llamadasAntes = llamadasSri;
  const r3 = await ejecutarSincronizacion(db, { desde, hasta, fetchImpl: sriFalso, esperaBaseMs: 5 });
  check('Segunda sincronización: no vuelve a consultar lo ya guardado ni lo que espera reintento', r3.ok && r3.ejecucion.encontrados === 0 && llamadasSri === llamadasAntes);
  const enc3 = await encolarClaves(db, [A, C], 'CLAVE');
  check('Cargar claves ya guardadas → "ya registradas", no entran a la cola', enc3.yaRegistradas === 2 && enc3.encoladas === 0);
  const dup = await registrarComprobante(db, { xml: docA.xmlOriginal, fuente: 'XML' });
  check('Registrar de nuevo el mismo XML → DUPLICADO (índice único)', dup.estado === 'DUPLICADO');
  check('Sigue habiendo 4 comprobantes', (await comp.countDocuments()) === 4);
  const reac = await encolarClaves(db, [D_NO_EXISTE], 'CLAVE');
  check('Una clave FALLIDA cargada de nuevo se reactiva', reac.reactivadas === 1);

  console.log('\nRecuperación\n');
  await db.collection(COL.configuracion).updateOne({ _id: 'principal' } as any, { $set: { candado: { idEjecucion: 'colgada', desde: new Date(Date.now() - 3600_000) } } });
  const r4 = await ejecutarSincronizacion(db, { fetchImpl: sriFalso, esperaBaseMs: 5 });
  check('Un candado de hace más de 30 min (corte de luz) no bloquea', r4.ok, r4.ok ? `encontrados ${r4.ejecucion.encontrados}` : '');
  check('Sin rango procesa también la de octubre', (await comp.countDocuments({ claveAcceso: H_OCTUBRE })) === 1);

  const est = await estadoSincronizacion(db);
  check('Estado: sin ejecución en curso, cola y última ejecución', est.enCurso === false && !!est.ultima && est.cola.pendientes === 1, JSON.stringify(est.cola));
} catch (err) {
  console.error(rojo('Error inesperado:'), err);
  fallas++;
} finally {
  await db.dropDatabase().catch(() => {});
  await cerrarMongo();
}

console.log(fallas ? rojo(`\n${fallas} prueba(s) fallaron`) : verde('\nTodas las pruebas pasaron (base de prueba eliminada)'));
process.exitCode = fallas ? 1 : 0;
