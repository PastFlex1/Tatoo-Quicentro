/** Utilidades de la clave de acceso de 49 dígitos de los comprobantes electrónicos del SRI. */

/** Tipos de comprobante (posiciones 9-10 de la clave) */
export const TIPO_COMPROBANTE: Record<string, string> = {
  '01': 'Factura',
  '03': 'Liquidación de compra',
  '04': 'Nota de crédito',
  '05': 'Nota de débito',
  '06': 'Guía de remisión',
  '07': 'Comprobante de retención',
};

/** Devuelve null si la clave es válida, o el motivo del error (incluye el dígito verificador módulo 11). */
export function validarClaveAcceso(clave: string): string | null {
  if (!/^\d{49}$/.test(clave)) return 'La clave de acceso debe tener 49 dígitos.';
  const base = clave.slice(0, 48);
  let factor = 2;
  let suma = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    suma += Number(base[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 1;
  return dv === Number(clave[48]) ? null : 'La clave de acceso no es válida (dígito verificador incorrecto).';
}

/** Datos que se leen directamente de la clave, sin consultar al SRI */
export function describirClaveAcceso(clave: string) {
  return {
    fechaEmision: `${clave.slice(4, 8)}-${clave.slice(2, 4)}-${clave.slice(0, 2)}`,
    tipo: clave.slice(8, 10),
    tipoNombre: TIPO_COMPROBANTE[clave.slice(8, 10)] || `Tipo ${clave.slice(8, 10)}`,
    rucEmisor: clave.slice(10, 23),
    ambiente: clave[23] === '2' ? 'PRODUCCION' : 'PRUEBAS',
    numero: `${clave.slice(24, 27)}-${clave.slice(27, 30)}-${clave.slice(30, 39)}`,
  };
}

/**
 * Extrae las claves de acceso válidas (sin repetir) de cualquier texto: el reporte TXT de
 * "Comprobantes recibidos" de SRI en Línea, texto pegado o lo que envía un lector de códigos de barras.
 */
export function extraerClavesAcceso(texto: string): { validas: string[]; invalidas: string[] } {
  const encontradas = (texto.match(/(?<!\d)\d{49}(?!\d)/g) || []).filter((c, i, a) => a.indexOf(c) === i);
  const validas: string[] = [];
  const invalidas: string[] = [];
  for (const c of encontradas) (validarClaveAcceso(c) ? invalidas : validas).push(c);
  return { validas, invalidas };
}
