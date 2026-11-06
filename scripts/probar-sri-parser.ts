/**
 * Prueba de la Etapa 4: parser de comprobantes.
 *
 *   npm run sri:parser                       → pruebas con XML de ejemplo de los 6 tipos
 *   npm run sri:parser -- archivo.xml [...]  → analiza XML reales (p. ej. los de ./tmp-sri/) y muestra el resumen
 */
import fs from 'fs';
import { parsearComprobante } from '../src/server/modules/sri/sri.parser.ts';

const verde = (s: string) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s: string) => `\x1b[31m${s}\x1b[0m`;
const gris = (s: string) => `\x1b[90m${s}\x1b[0m`;
let fallas = 0;
const check = (nombre: string, cond: boolean, extra = '') => {
  console.log(`${cond ? verde('✔') : rojo('✘')} ${nombre}${extra ? `  ${gris(extra)}` : ''}`);
  if (!cond) fallas++;
};

const archivos = process.argv.slice(2).filter(a => a.toLowerCase().endsWith('.xml'));
const RUC_EMPRESA = process.env.EMPRESA_RUC || '1792847102001';

if (archivos.length) {
  for (const f of archivos) {
    const r = parsearComprobante(fs.readFileSync(f, 'utf8'), { rucEmpresa: RUC_EMPRESA });
    if (!r.ok) {
      console.log(`${rojo('✘')} ${f}: ${r.error}`);
      continue;
    }
    const c = r.comprobante;
    console.log(`${verde('✔')} ${f}`);
    console.log(`   ${c.tipoNombre} ${c.numero} · ${c.fechaEmision} · ${c.emisor.razonSocial} (${c.emisor.identificacion})`);
    console.log(`   Receptor: ${c.receptor.razonSocial} (${c.receptor.identificacion}) · para la empresa: ${r.esParaEmpresa}`);
    console.log(`   Totales: ${JSON.stringify(c.totales)}`);
    if (c.retenciones?.length) console.log(`   Retenciones: ${c.retenciones.map(x => `${x.impuesto} ${x.porcentaje}% = ${x.valorRetenido}`).join(' · ')}`);
    console.log(`   Detalles: ${c.detalles.length} · Formas de pago: ${c.formasPago.map(p => `${p.nombre} ${p.total}`).join(', ') || '—'}`);
    if (c.advertencias.length) console.log(`   ${rojo('Advertencias:')} ${c.advertencias.join(' | ')}`);
  }
} else {
  // ---------------------------------------------------------------- XML de ejemplo
  const conDv = (base48: string) => {
    let f = 2, s = 0;
    for (let i = base48.length - 1; i >= 0; i--) { s += +base48[i] * f; f = f === 7 ? 2 : f + 1; }
    let d = 11 - (s % 11); if (d === 11) d = 0; if (d === 10) d = 1;
    return base48 + d;
  };
  const RUC_PROV = '1791234567001';
  const clave = (tipo: string, sec: string) => conDv('05112026' + tipo + RUC_PROV + '2' + '001002' + sec + '12345678' + '1');
  const infoTrib = (k: string, tipo: string, sec: string) =>
    `<infoTributaria><ambiente>2</ambiente><tipoEmision>1</tipoEmision><razonSocial>DISTRIBUIDORA ANDINA S.A.</razonSocial><nombreComercial>ANDINA</nombreComercial><ruc>${RUC_PROV}</ruc><claveAcceso>${k}</claveAcceso><codDoc>${tipo}</codDoc><estab>001</estab><ptoEmi>002</ptoEmi><secuencial>${sec}</secuencial><dirMatriz>Av. Amazonas N24, Quito</dirMatriz><contribuyenteRimpe>CONTRIBUYENTE RÉGIMEN RIMPE</contribuyenteRimpe></infoTributaria>`;

  const kFac = clave('01', '000004521');
  const factura = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">${infoTrib(kFac, '01', '000004521')}
<infoFactura><fechaEmision>05/11/2026</fechaEmision><dirEstablecimiento>Quito</dirEstablecimiento><obligadoContabilidad>SI</obligadoContabilidad>
<tipoIdentificacionComprador>04</tipoIdentificacionComprador><razonSocialComprador>DEVOLUTION INK</razonSocialComprador><identificacionComprador>1792847102001</identificacionComprador>
<totalSinImpuestos>150.00</totalSinImpuestos><totalDescuento>5.00</totalDescuento>
<totalConImpuestos>
 <totalImpuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><baseImponible>100.00</baseImponible><tarifa>15</tarifa><valor>15.00</valor></totalImpuesto>
 <totalImpuesto><codigo>2</codigo><codigoPorcentaje>0</codigoPorcentaje><baseImponible>50.00</baseImponible><tarifa>0</tarifa><valor>0.00</valor></totalImpuesto>
</totalConImpuestos><propina>0.00</propina><importeTotal>165.00</importeTotal><moneda>DOLAR</moneda>
<pagos><pago><formaPago>20</formaPago><total>115.00</total><plazo>30</plazo><unidadTiempo>dias</unidadTiempo></pago><pago><formaPago>01</formaPago><total>50.00</total></pago></pagos>
</infoFactura>
<detalles>
 <detalle><codigoPrincipal>TIN-01</codigoPrincipal><descripcion>Tinta negra 8oz &amp; aplicador</descripcion><cantidad>4.000000</cantidad><precioUnitario>26.250000</precioUnitario><descuento>5.00</descuento><precioTotalSinImpuesto>100.00</precioTotalSinImpuesto>
  <impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><tarifa>15</tarifa><baseImponible>100.00</baseImponible><valor>15.00</valor></impuesto></impuestos></detalle>
 <detalle><codigoPrincipal>LIB-02</codigoPrincipal><descripcion>Libro técnico de tatuaje</descripcion><cantidad>1</cantidad><precioUnitario>50.00</precioUnitario><descuento>0</descuento><precioTotalSinImpuesto>50.00</precioTotalSinImpuesto>
  <impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>0</codigoPorcentaje><tarifa>0</tarifa><baseImponible>50.00</baseImponible><valor>0.00</valor></impuesto></impuestos></detalle>
</detalles>
<infoAdicional><campoAdicional nombre="Email">ventas@andina.ec</campoAdicional><campoAdicional nombre="Teléfono">022345678</campoAdicional></infoAdicional>
</factura>`;

  console.log('Factura (01)\n');
  let r = parsearComprobante(factura, { rucEmpresa: '1792847102001' });
  check('Se reconoce y extrae', r.ok, r.ok ? '' : r.error);
  if (r.ok) {
    const c = r.comprobante;
    check('Número, fecha y emisor', c.numero === '001-002-000004521' && c.fechaEmision === '2026-11-05' && c.emisor.razonSocial === 'DISTRIBUIDORA ANDINA S.A.' && c.emisor.regimen === 'CONTRIBUYENTE RÉGIMEN RIMPE');
    check('Bases desagregadas: 15 % = 100, 0 % = 50, IVA = 15, total = 165', c.totales.base15 === 100 && c.totales.base0 === 50 && c.totales.iva === 15 && c.totales.total === 165 && c.totales.descuento === 5);
    check('Formas de pago con plazo', c.formasPago.length === 2 && c.formasPago[0].nombre.startsWith('Otros con') && c.formasPago[0].plazo === 30);
    check('Detalles con impuestos y entidades (&amp;)', c.detalles.length === 2 && c.detalles[0].descripcion === 'Tinta negra 8oz & aplicador' && c.detalles[0].impuestos[0].tarifa === 15 && c.detalles[0].cantidad === 4);
    check('Secuencial y clave como texto (no números)', c.secuencial === '000004521' && c.claveAcceso === kFac);
    check('Información adicional', c.infoAdicional['Email'] === 'ventas@andina.ec');
    check('Comprador = empresa, sin advertencias', r.esParaEmpresa === true && c.advertencias.length === 0, c.advertencias.join(' | '));
  }

  // Envuelta en <autorizacion> (CDATA y escapada)
  const envolver = (x: string, estado = 'AUTORIZADO') =>
    `<?xml version="1.0" encoding="UTF-8"?><autorizacion><estado>${estado}</estado><numeroAutorizacion>${kFac}</numeroAutorizacion><fechaAutorizacion>2026-11-05T14:30:00-05:00</fechaAutorizacion><ambiente>PRODUCCIÓN</ambiente><comprobante><![CDATA[${x}]]></comprobante></autorizacion>`;
  r = parsearComprobante(envolver(factura));
  check('Envuelta en <autorizacion> con CDATA', r.ok && r.comprobante.autorizacion?.estado === 'AUTORIZADO' && r.comprobante.totales.total === 165);
  const escapada = `<autorizacion><estado>AUTORIZADO</estado><numeroAutorizacion>${kFac}</numeroAutorizacion><fechaAutorizacion>x</fechaAutorizacion><comprobante>${factura.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</comprobante></autorizacion>`;
  r = parsearComprobante(escapada);
  check('Envuelta con entidades escapadas', r.ok && r.comprobante.detalles[0]?.descripcion === 'Tinta negra 8oz & aplicador', r.ok ? '' : r.error);

  // ---------------------------------------------------------------- Liquidación de compra (03)
  const kLiq = clave('03', '000000077');
  const liquidacion = `<liquidacionCompra id="comprobante" version="1.1.0">${infoTrib(kLiq, '03', '000000077')}<infoLiquidacionCompra><fechaEmision>05/11/2026</fechaEmision><tipoIdentificacionProveedor>05</tipoIdentificacionProveedor><razonSocialProveedor>JUAN PEREZ</razonSocialProveedor><identificacionProveedor>1712345678</identificacionProveedor><totalSinImpuestos>40.00</totalSinImpuestos><totalDescuento>0</totalDescuento><totalConImpuestos><totalImpuesto><codigo>2</codigo><codigoPorcentaje>0</codigoPorcentaje><baseImponible>40.00</baseImponible><valor>0</valor></totalImpuesto></totalConImpuestos><importeTotal>40.00</importeTotal><moneda>DOLAR</moneda></infoLiquidacionCompra><detalles><detalle><codigoPrincipal>S1</codigoPrincipal><descripcion>Servicio de limpieza</descripcion><cantidad>1</cantidad><precioUnitario>40</precioUnitario><descuento>0</descuento><precioTotalSinImpuesto>40.00</precioTotalSinImpuesto><impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>0</codigoPorcentaje><tarifa>0</tarifa><baseImponible>40</baseImponible><valor>0</valor></impuesto></impuestos></detalle></detalles></liquidacionCompra>`;
  console.log('\nLiquidación de compra (03)\n');
  r = parsearComprobante(liquidacion);
  check('Proveedor persona natural y base 0 %', r.ok && r.comprobante.tipo === '03' && r.comprobante.receptor.identificacion === '1712345678' && r.comprobante.totales.base0 === 40, r.ok ? '' : r.error);

  // ---------------------------------------------------------------- Nota de crédito (04)
  const kNc = clave('04', '000000310');
  const nc = `<notaCredito id="comprobante" version="1.1.0">${infoTrib(kNc, '04', '000000310')}<infoNotaCredito><fechaEmision>06/11/2026</fechaEmision><tipoIdentificacionComprador>04</tipoIdentificacionComprador><razonSocialComprador>DEVOLUTION INK</razonSocialComprador><identificacionComprador>1792847102001</identificacionComprador><codDocModificado>01</codDocModificado><numDocModificado>001-002-000004521</numDocModificado><fechaEmisionDocSustento>05/11/2026</fechaEmisionDocSustento><totalSinImpuestos>20.00</totalSinImpuestos><valorModificacion>23.00</valorModificacion><moneda>DOLAR</moneda><totalConImpuestos><totalImpuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><baseImponible>20.00</baseImponible><valor>3.00</valor></totalImpuesto></totalConImpuestos><motivo>Devolución de 1 tinta defectuosa</motivo></infoNotaCredito><detalles><detalle><codigoInterno>TIN-01</codigoInterno><descripcion>Tinta negra 8oz</descripcion><cantidad>1</cantidad><precioUnitario>20</precioUnitario><descuento>0</descuento><precioTotalSinImpuesto>20.00</precioTotalSinImpuesto><impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><tarifa>15</tarifa><baseImponible>20</baseImponible><valor>3</valor></impuesto></impuestos></detalle></detalles></notaCredito>`;
  console.log('\nNota de crédito (04)\n');
  r = parsearComprobante(nc, { rucEmpresa: '1792847102001' });
  check('Documento modificado, motivo y total', r.ok && r.comprobante.documentoModificado?.numero === '001-002-000004521' && r.comprobante.documentoModificado.fechaEmision === '2026-11-05' && r.comprobante.motivo?.startsWith('Devolución') === true && r.comprobante.totales.total === 23 && r.comprobante.totales.base15 === 20, r.ok ? r.comprobante.advertencias.join('|') : r.error);
  check('Código interno como código principal', r.ok && r.comprobante.detalles[0].codigoPrincipal === 'TIN-01');

  // ---------------------------------------------------------------- Nota de débito (05)
  const kNd = clave('05', '000000011');
  const nd = `<notaDebito id="comprobante" version="1.0.0">${infoTrib(kNd, '05', '000000011')}<infoNotaDebito><fechaEmision>06/11/2026</fechaEmision><tipoIdentificacionComprador>04</tipoIdentificacionComprador><razonSocialComprador>DEVOLUTION INK</razonSocialComprador><identificacionComprador>1792847102001</identificacionComprador><codDocModificado>01</codDocModificado><numDocModificado>001-002-000004521</numDocModificado><fechaEmisionDocSustento>05/11/2026</fechaEmisionDocSustento><totalSinImpuestos>10.00</totalSinImpuestos><impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><tarifa>15</tarifa><baseImponible>10.00</baseImponible><valor>1.50</valor></impuesto></impuestos><valorTotal>11.50</valorTotal><pagos><pago><formaPago>20</formaPago><total>11.50</total></pago></pagos></infoNotaDebito><motivos><motivo><razon>Interés por mora</razon><valor>10.00</valor></motivo></motivos></notaDebito>`;
  console.log('\nNota de débito (05)\n');
  r = parsearComprobante(nd);
  check('Motivos, impuestos y total', r.ok && r.comprobante.motivos?.[0].razon === 'Interés por mora' && r.comprobante.totales.iva === 1.5 && r.comprobante.totales.total === 11.5 && r.comprobante.advertencias.length === 0, r.ok ? r.comprobante.advertencias.join('|') : r.error);

  // ---------------------------------------------------------------- Retención v2.0.0 (07)
  const kRet = clave('07', '000000999');
  const ret2 = `<comprobanteRetencion id="comprobante" version="2.0.0">${infoTrib(kRet, '07', '000000999')}<infoCompRetencion><fechaEmision>06/11/2026</fechaEmision><obligadoContabilidad>SI</obligadoContabilidad><tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido><parteRel>NO</parteRel><razonSocialSujetoRetenido>DEVOLUTION INK</razonSocialSujetoRetenido><identificacionSujetoRetenido>1792847102001</identificacionSujetoRetenido><periodoFiscal>11/2026</periodoFiscal></infoCompRetencion><docsSustento><docSustento><codSustento>01</codSustento><codDocSustento>01</codDocSustento><numDocSustento>001001000000123</numDocSustento><fechaEmisionDocSustento>04/11/2026</fechaEmisionDocSustento><totalSinImpuestos>200.00</totalSinImpuestos><importeTotal>230.00</importeTotal><retenciones><retencion><codigo>1</codigo><codigoRetencion>3440</codigoRetencion><baseImponible>200.00</baseImponible><porcentajeRetener>2.75</porcentajeRetener><valorRetenido>5.50</valorRetenido></retencion><retencion><codigo>2</codigo><codigoRetencion>1</codigoRetencion><baseImponible>30.00</baseImponible><porcentajeRetener>30</porcentajeRetener><valorRetenido>9.00</valorRetenido></retencion></retenciones></docSustento></docsSustento></comprobanteRetencion>`;
  console.log('\nComprobante de retención (07)\n');
  r = parsearComprobante(ret2, { rucEmpresa: '1792847102001' });
  check('v2.0.0: retenciones de renta e IVA con documento sustento', r.ok && r.comprobante.retenciones?.length === 2 && r.comprobante.retenciones[0].impuesto === 'Renta' && r.comprobante.retenciones[1].valorRetenido === 9 && r.comprobante.totalRetenido === 14.5 && r.comprobante.retenciones[0].docSustento?.numero === '001001000000123' && r.comprobante.periodoFiscal === '11/2026', r.ok ? '' : r.error);
  check('Sujeto retenido = empresa', r.ok && r.esParaEmpresa === true);

  const kRet1 = clave('07', '000000998');
  const ret1 = `<comprobanteRetencion id="comprobante" version="1.0.0">${infoTrib(kRet1, '07', '000000998')}<infoCompRetencion><fechaEmision>06/11/2026</fechaEmision><tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido><razonSocialSujetoRetenido>DEVOLUTION INK</razonSocialSujetoRetenido><identificacionSujetoRetenido>1792847102001</identificacionSujetoRetenido><periodoFiscal>11/2026</periodoFiscal></infoCompRetencion><impuestos><impuesto><codigo>1</codigo><codigoRetencion>312</codigoRetencion><baseImponible>100.00</baseImponible><porcentajeRetener>1.75</porcentajeRetener><valorRetenido>1.75</valorRetenido><codDocSustento>01</codDocSustento><numDocSustento>001001000000124</numDocSustento><fechaEmisionDocSustento>04/11/2026</fechaEmisionDocSustento></impuesto></impuestos></comprobanteRetencion>`;
  r = parsearComprobante(ret1);
  check('v1.0.0: lista de impuestos retenidos', r.ok && r.comprobante.retenciones?.length === 1 && r.comprobante.totalRetenido === 1.75 && r.comprobante.retenciones[0].docSustento?.numero === '001001000000124', r.ok ? '' : r.error);

  // ---------------------------------------------------------------- Guía de remisión (06)
  const kGuia = clave('06', '000000055');
  const guia = `<guiaRemision id="comprobante" version="1.1.0">${infoTrib(kGuia, '06', '000000055')}<infoGuiaRemision><dirPartida>Bodega Norte</dirPartida><razonSocialTransportista>TRANSPORTES RAPIDOS</razonSocialTransportista><tipoIdentificacionTransportista>04</tipoIdentificacionTransportista><rucTransportista>1790000000001</rucTransportista><fechaIniTransporte>05/11/2026</fechaIniTransporte><fechaFinTransporte>06/11/2026</fechaFinTransporte><placa>PBA1234</placa></infoGuiaRemision><destinatarios><destinatario><identificacionDestinatario>1792847102001</identificacionDestinatario><razonSocialDestinatario>DEVOLUTION INK</razonSocialDestinatario><dirDestinatario>CC Quicentro</dirDestinatario><motivoTraslado>Venta</motivoTraslado><codDocSustento>01</codDocSustento><numDocSustento>001-002-000004521</numDocSustento><fechaEmisionDocSustento>05/11/2026</fechaEmisionDocSustento><detalles><detalle><codigoInterno>TIN-01</codigoInterno><descripcion>Tinta negra 8oz</descripcion><cantidad>4</cantidad></detalle></detalles></destinatario></destinatarios></guiaRemision>`;
  console.log('\nGuía de remisión (06)\n');
  r = parsearComprobante(guia, { rucEmpresa: '1792847102001' });
  check('Transporte, destinatario y mercadería', r.ok && r.comprobante.transporte?.placa === 'PBA1234' && r.comprobante.destinatarios?.[0].detalles[0].cantidad === 4 && r.comprobante.fechaEmision === '2026-11-05' && r.esParaEmpresa === true, r.ok ? '' : r.error);

  // ---------------------------------------------------------------- errores y advertencias
  console.log('\nValidaciones\n');
  r = parsearComprobante('<factura><infoTributaria>');
  check('XML mal formado → error', !r.ok, !r.ok ? r.error : '');
  r = parsearComprobante('<pedido><id>1</id></pedido>');
  check('Raíz desconocida → error', !r.ok && r.error.includes('no reconocido'), !r.ok ? r.error : '');
  r = parsearComprobante(factura.replace('<codDoc>01</codDoc>', '<codDoc>01</codDoc>').replace(kFac, kNc));
  check('Tipo de la clave ≠ tipo del XML → error', !r.ok, !r.ok ? r.error : '');
  r = parsearComprobante(factura.replace(`<ruc>${RUC_PROV}</ruc>`, '<ruc>1790000000001</ruc>'));
  check('RUC del emisor ≠ clave → error', !r.ok, !r.ok ? r.error : '');
  r = parsearComprobante(factura, { claveEsperada: kNc });
  check('No es la clave esperada → error', !r.ok, !r.ok ? r.error : '');
  r = parsearComprobante(envolver(factura, 'NO AUTORIZADO'));
  check('<autorizacion> NO AUTORIZADO → error', !r.ok, !r.ok ? r.error : '');
  r = parsearComprobante(factura.replace('<importeTotal>165.00</importeTotal>', '<importeTotal>170.00</importeTotal>'));
  check('Total que no cuadra → advertencia (se acepta)', r.ok && r.comprobante.advertencias.some(a => a.includes('no cuadran')), r.ok ? r.comprobante.advertencias[0] : '');
  r = parsearComprobante(factura, { rucEmpresa: '0999999999001' });
  check('Comprador ≠ empresa → advertencia y esParaEmpresa = false', r.ok && r.esParaEmpresa === false);
  r = parsearComprobante('﻿' + factura);
  check('XML con BOM', r.ok);

  console.log(fallas ? rojo(`\n${fallas} prueba(s) fallaron`) : verde('\nTodas las pruebas pasaron'));
  process.exitCode = fallas ? 1 : 0;
}
