/**
 * sriCalculations.ts
 * Utilidades de criptografía, codificación y cálculo para comprobantes y firma electrónica SRI Ecuador.
 */

export const ECUADOR_CERTIFIERS = [
  'BANCO CENTRAL DEL ECUADOR (BCE)',
  'SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL',
  'CONSEJO DE LA JUDICATURA (ICERT-EC)',
  'ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.',
  'UANATACA ECUADOR',
  'FAD FIRMA DIGITAL ECUADOR',
  'DATIL MEDIA S.A.',
  'OTRA ENTIDAD CERTIFICADORA ACREDITADA',
];

/**
 * Convierte un archivo File (como certificado .p12 o .pfx) a base64 limpio.
 */
export async function convertFileToBase64(
  file: File
): Promise<{ base64: string; size: number; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        base64: base64.trim(),
        size: file.size,
        name: file.name,
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Detecta automáticamente la entidad emisora autorizada del certificado en base al nombre del archivo.
 */
export function detectEcuadorianCertificateIssuer(fileName: string): string {
  const lower = (fileName || '').toLowerCase();

  if (lower.includes('bce') || lower.includes('central')) {
    return 'BANCO CENTRAL DEL ECUADOR (BCE)';
  }
  if (lower.includes('security') || lower.includes('secdata') || lower.includes('data')) {
    return 'SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL';
  }
  if (lower.includes('icert') || lower.includes('judicatura') || lower.includes('cj')) {
    return 'CONSEJO DE LA JUDICATURA (ICERT-EC)';
  }
  if (lower.includes('anfac')) {
    return 'ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.';
  }
  if (lower.includes('uanataca')) {
    return 'UANATACA ECUADOR';
  }
  if (lower.includes('fad') || lower.includes('fadigital')) {
    return 'FAD FIRMA DIGITAL ECUADOR';
  }
  if (lower.includes('datil')) {
    return 'DATIL MEDIA S.A.';
  }

  return 'BANCO CENTRAL DEL ECUADOR (BCE)';
}

/**
 * Algoritmo Módulo 11 para cálculo del dígito verificador de la Clave de Acceso SRI (49 dígitos).
 */
export function calculateSriModulo11(key48: string): number {
  const digits = key48.replace(/\D/g, '');
  if (digits.length !== 48) return 0;

  const weights = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  let weightIdx = 0;

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weights[weightIdx];
    weightIdx = (weightIdx + 1) % weights.length;
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;

  if (checkDigit === 11) return 0;
  if (checkDigit === 10) return 1;
  return checkDigit;
}

/**
 * Genera la Clave de Acceso oficial de 49 dígitos para comprobantes electrónicos SRI Ecuador.
 */
export function generateSriClaveAcceso(params: {
  fechaEmision: Date | string; // DDMMYYYY o Date
  tipoComprobante: '01' | '04' | '05' | '06' | '07'; // 01=Factura, 04=Nota Crédito, etc.
  ruc: string;
  ambiente: '1' | '2'; // 1=Pruebas, 2=Producción
  serie: string; // 6 dígitos (estab + ptoEmi, ej '001001')
  secuencial: string | number; // 9 dígitos
  codigoNumerico?: string; // 8 dígitos aleatorios
  tipoEmision?: '1'; // 1=Normal
}): string {
  let fechaStr = '';
  if (params.fechaEmision instanceof Date) {
    const d = String(params.fechaEmision.getDate()).padStart(2, '0');
    const m = String(params.fechaEmision.getMonth() + 1).padStart(2, '0');
    const y = String(params.fechaEmision.getFullYear());
    fechaStr = `${d}${m}${y}`;
  } else {
    // Si viene en formato YYYY-MM-DD
    const parts = params.fechaEmision.split('-');
    if (parts.length === 3) {
      fechaStr = `${parts[2].substring(0, 2)}${parts[1]}${parts[0]}`;
    } else {
      fechaStr = params.fechaEmision.replace(/\D/g, '').substring(0, 8);
    }
  }

  const tipoComp = params.tipoComprobante.padStart(2, '0');
  const cleanRuc = params.ruc.replace(/\D/g, '').padStart(13, '0').substring(0, 13);
  const amb = params.ambiente === '2' ? '2' : '1';
  const cleanSerie = params.serie.replace(/\D/g, '').padStart(6, '0').substring(0, 6);
  const cleanSec = String(params.secuencial).replace(/\D/g, '').padStart(9, '0').substring(0, 9);
  const codNum = (params.codigoNumerico || '12345678').replace(/\D/g, '').padStart(8, '0').substring(0, 8);
  const tipoEmi = params.tipoEmision || '1';

  const base48 = `${fechaStr}${tipoComp}${cleanRuc}${amb}${cleanSerie}${cleanSec}${codNum}${tipoEmi}`;
  const verificador = calculateSriModulo11(base48);

  return `${base48}${verificador}`;
}

