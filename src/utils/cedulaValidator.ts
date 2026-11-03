import { validarIdentificacionEcuador, validarCedula } from './ecuadorIdValidator';

export interface RucValidationResult {
  isValid: boolean;
  message?: string;
  type?: string;
  province?: string;
}

/**
 * Validador oficial de RUC ecuatoriano (13 dígitos)
 * Cumple con normativas del SRI de Ecuador para:
 * - Persona Natural (base cédula Módulo 10 + 001)
 * - Sociedad Privada / Extranjera (tercer dígito 9, Módulo 11 + 001)
 * - Institución Pública (tercer dígito 6, Módulo 11 + 0001)
 */
export function validarRucEcuatoriano(rawRuc: string): RucValidationResult {
  const clean = (rawRuc || '').trim().replace(/\D/g, '');

  if (!clean) {
    return {
      isValid: false,
      message: 'Ingresa el número de RUC de 13 dígitos.',
    };
  }

  if (clean.length !== 13) {
    return {
      isValid: false,
      message: `El RUC debe tener exactamente 13 dígitos (actualmente tiene ${clean.length}).`,
    };
  }

  const result = validarIdentificacionEcuador(clean);

  if (!result.isValid) {
    return {
      isValid: false,
      message: result.errorMessage || 'El RUC no cumple con el algoritmo verificador oficial del SRI.',
    };
  }

  return {
    isValid: true,
    message: result.label,
    type: result.type,
    province: result.provinceName,
  };
}

/**
 * Validador de Cédula Ecuatoriana (10 dígitos)
 */
export function validarCedulaEcuatoriana(rawCedula: string): { isValid: boolean; message?: string } {
  const clean = (rawCedula || '').trim().replace(/\D/g, '');
  if (!clean || clean.length !== 10) {
    return { isValid: false, message: 'La cédula debe tener exactamente 10 dígitos.' };
  }
  const isValid = validarCedula(clean);
  return {
    isValid,
    message: isValid ? 'Cédula válida' : 'La cédula no supera el dígito verificador Módulo 10.',
  };
}

