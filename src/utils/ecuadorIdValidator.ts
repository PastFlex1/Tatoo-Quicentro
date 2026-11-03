/**
 * Algoritmo oficial de validación de identificaciones en Ecuador:
 * - Cédula de Identidad (10 dígitos, Módulo 10)
 * - RUC Persona Natural (10 dígitos de cédula + '001')
 * - RUC Sociedad Privada / Extranjeros (13 dígitos, 3er dígito 9, Módulo 11)
 * - RUC Institución Pública (13 dígitos, 3er dígito 6, Módulo 11)
 * - Consumidor Final (9999999999999)
 * - Pasaporte (3 a 20 caracteres alfanuméricos)
 */

export type EcuadorIdType = 
  | 'CEDULA' 
  | 'RUC_NATURAL' 
  | 'RUC_JURIDICO' 
  | 'RUC_PUBLICO' 
  | 'CONSUMIDOR_FINAL' 
  | 'PASAPORTE' 
  | 'INVALID';

export interface ValidationResult {
  isValid: boolean;
  type: EcuadorIdType;
  label: string;
  provinceCode?: string;
  provinceName?: string;
  errorMessage?: string;
}

const ECUADOR_PROVINCES: Record<string, string> = {
  '01': 'Azuay',
  '02': 'Bolívar',
  '03': 'Cañar',
  '04': 'Carchi',
  '05': 'Cotopaxi',
  '06': 'Chimborazo',
  '07': 'El Oro',
  '08': 'Esmeraldas',
  '09': 'Guayas',
  '10': 'Imbabura',
  '11': 'Loja',
  '12': 'Los Ríos',
  '13': 'Manabí',
  '14': 'Morona Santiago',
  '15': 'Napo',
  '16': 'Pastaza',
  '17': 'Pichincha',
  '18': 'Tungurahua',
  '19': 'Zamora Chinchipe',
  '20': 'Galápagos',
  '21': 'Sucumbíos',
  '22': 'Orellana',
  '23': 'Santo Domingo de los Tsáchilas',
  '24': 'Santa Elena',
  '30': 'Ecuatorianos en el Exterior',
};

/**
 * Valida una cédula ecuatoriana con el algoritmo Módulo 10
 */
export function validarCedula(cedula: string): boolean {
  const clean = (cedula || '').trim().replace(/\D/g, '');
  if (clean.length !== 10) return false;

  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  const tercerDigito = parseInt(clean[2], 10);
  if (tercerDigito >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(clean[i], 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }

  const digitoVerificadorCalculado = (10 - (suma % 10)) % 10;
  const digitoVerificadorReal = parseInt(clean[9], 10);

  return digitoVerificadorCalculado === digitoVerificadorReal;
}

/**
 * Valida un RUC de Sociedad Privada / Extranjera (Módulo 11 con tercer dígito 9)
 */
export function validarRucSociedadPrivada(ruc: string): boolean {
  const clean = (ruc || '').trim().replace(/\D/g, '');
  if (clean.length !== 13) return false;

  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  if (parseInt(clean[2], 10) !== 9) return false;
  if (clean.substring(10, 13) === '000') return false;

  const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    suma += parseInt(clean[i], 10) * coeficientes[i];
  }

  const residuo = suma % 11;
  const digitoVerificadorCalculado = residuo === 0 ? 0 : 11 - residuo;
  const digitoVerificadorReal = parseInt(clean[9], 10);

  return digitoVerificadorCalculado === digitoVerificadorReal;
}

/**
 * Valida un RUC de Institución Pública (Módulo 11 con tercer dígito 6)
 */
export function validarRucPublico(ruc: string): boolean {
  const clean = (ruc || '').trim().replace(/\D/g, '');
  if (clean.length !== 13) return false;

  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  if (parseInt(clean[2], 10) !== 6) return false;
  if (clean.substring(9, 13) === '0000') return false;

  const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < 8; i++) {
    suma += parseInt(clean[i], 10) * coeficientes[i];
  }

  const residuo = suma % 11;
  const digitoVerificadorCalculado = residuo === 0 ? 0 : 11 - residuo;
  const digitoVerificadorReal = parseInt(clean[8], 10);

  return digitoVerificadorCalculado === digitoVerificadorReal;
}

/**
 * Validador principal unificado para identificaciones en Ecuador
 */
export function validarIdentificacionEcuador(rawId: string): ValidationResult {
  const cleanId = (rawId || '').trim();
  const cleanDigits = cleanId.replace(/\D/g, '');

  if (!cleanId) {
    return {
      isValid: false,
      type: 'INVALID',
      label: 'Identificación vacía',
      errorMessage: 'Ingresa un número de cédula, RUC o pasaporte.',
    };
  }

  // Consumidor Final
  if (cleanDigits === '9999999999999' || cleanId === '9999999999999') {
    return {
      isValid: true,
      type: 'CONSUMIDOR_FINAL',
      label: 'Consumidor Final',
    };
  }

  // Cédula (10 dígitos)
  if (cleanDigits.length === 10) {
    const provCode = cleanDigits.substring(0, 2);
    const provName = ECUADOR_PROVINCES[provCode] || 'Provincia no identificada';
    const isValid = validarCedula(cleanDigits);

    return {
      isValid,
      type: 'CEDULA',
      label: isValid ? `Cédula Ecuatoriana (${provName})` : 'Cédula Inválida (Dígito verificador incorrecto)',
      provinceCode: provCode,
      provinceName: provName,
      errorMessage: isValid ? undefined : 'El número de cédula no supera el algoritmo Módulo 10.',
    };
  }

  // RUC (13 dígitos)
  if (cleanDigits.length === 13) {
    const provCode = cleanDigits.substring(0, 2);
    const provName = ECUADOR_PROVINCES[provCode] || 'Provincia no identificada';
    const tercerDigito = parseInt(cleanDigits[2], 10);

    // Persona Natural: Cédula válida + '001' (o terminación en establecimiento > 000)
    if (tercerDigito < 6) {
      const cedulaBase = cleanDigits.substring(0, 10);
      const establecimiento = cleanDigits.substring(10, 13);
      const isCedulaValid = validarCedula(cedulaBase);
      const isEstablecimientoValid = establecimiento !== '000';
      const isValid = isCedulaValid && isEstablecimientoValid;

      return {
        isValid,
        type: 'RUC_NATURAL',
        label: isValid ? `RUC Persona Natural (${provName})` : 'RUC Persona Natural Inválido',
        provinceCode: provCode,
        provinceName: provName,
        errorMessage: isValid ? undefined : 'La base de cédula o el código de establecimiento no son válidos.',
      };
    }

    // Institución Pública: tercer dígito 6
    if (tercerDigito === 6) {
      const isValid = validarRucPublico(cleanDigits);
      return {
        isValid,
        type: 'RUC_PUBLICO',
        label: isValid ? `RUC Entidad Pública (${provName})` : 'RUC Entidad Pública Inválido',
        provinceCode: provCode,
        provinceName: provName,
        errorMessage: isValid ? undefined : 'El RUC público no supera el dígito verificador Módulo 11.',
      };
    }

    // Sociedad Privada / Extranjera: tercer dígito 9
    if (tercerDigito === 9) {
      const isValid = validarRucSociedadPrivada(cleanDigits);
      return {
        isValid,
        type: 'RUC_JURIDICO',
        label: isValid ? `RUC Sociedad / Jurídico (${provName})` : 'RUC Sociedad Inválido',
        provinceCode: provCode,
        provinceName: provName,
        errorMessage: isValid ? undefined : 'El RUC de sociedad no supera el dígito verificador Módulo 11.',
      };
    }

    return {
      isValid: false,
      type: 'INVALID',
      label: 'RUC no reconocido',
      errorMessage: 'El tercer dígito del RUC no corresponde a ningún tipo de contribuyente válido en Ecuador.',
    };
  }

  // Pasaporte / Identificación Extranjera
  if (/^[A-Za-z0-9]{3,20}$/.test(cleanId) && !/^\d+$/.test(cleanId)) {
    return {
      isValid: true,
      type: 'PASAPORTE',
      label: 'Pasaporte / Identificación Extranjera',
    };
  }

  return {
    isValid: false,
    type: 'INVALID',
    label: 'Formato Inválido',
    errorMessage: 'Ingresa 10 dígitos para Cédula, 13 dígitos para RUC o alfanumérico para Pasaporte.',
  };
}

