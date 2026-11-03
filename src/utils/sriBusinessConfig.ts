import { CompanyConfig } from '../types';
import { validarRucEcuatoriano } from './cedulaValidator';

export interface SriConfigValidationResult {
  isValid: boolean;
  missingFields: { field: string; label: string; description: string }[];
  completedCount: number;
  totalRequired: number;
  progressPercentage: number;
}

/**
 * Valida de forma estricta que la configuración del SRI esté 100% completa antes de permitir facturar.
 */
export function validateSriBusinessConfig(
  config: CompanyConfig | null | undefined,
  docType: 'factura' | 'nota_venta' | 'retencion' = 'factura'
): SriConfigValidationResult {
  const missing: { field: string; label: string; description: string }[] = [];

  if (!config) {
    return {
      isValid: false,
      missingFields: [{ field: 'all', label: 'Configuración no encontrada', description: 'Debes configurar los datos de tu negocio en Configuración SRI.' }],
      completedCount: 0,
      totalRequired: (docType === 'factura' || docType === 'retencion') ? 12 : 10,
      progressPercentage: 0
    };
  }

  // Si config tiene propiedades de StudioSettings (compatibilidad)
  const rucValue = config.ruc || (config as any).taxId || '';
  const cleanRuc = (rucValue || '').trim().replace(/\D/g, '');

  // 1. RUC (Obligatorio 13 dígitos y algoritmo SRI)
  if (!cleanRuc) {
    missing.push({
      field: 'ruc',
      label: 'RUC del Negocio',
      description: 'Ingresa el número de RUC de 13 dígitos del contribuyente.'
    });
  } else if (cleanRuc.length !== 13) {
    missing.push({
      field: 'ruc',
      label: 'RUC Incompleto',
      description: `El RUC debe tener exactamente 13 dígitos (actualmente tiene ${cleanRuc.length}).`
    });
  } else {
    const rucValidation = validarRucEcuatoriano(cleanRuc);
    if (!rucValidation.isValid) {
      missing.push({
        field: 'ruc',
        label: 'RUC Inválido',
        description: rucValidation.message || 'El RUC no cumple con el algoritmo verificador oficial del SRI.'
      });
    }
  }

  // 2. Razón Social (Legal)
  const razonSocial = (config.razonSocial || (config as any).studioName || '').trim();
  if (!razonSocial) {
    missing.push({
      field: 'razonSocial',
      label: 'Razón Social',
      description: 'Nombre o razón social legal registrada en el SRI.'
    });
  }

  // 3. Nombre Comercial (Marca o Local)
  const nombreComercial = (config.nombreComercial || (config as any).studioName || '').trim();
  if (!nombreComercial) {
    missing.push({
      field: 'nombreComercial',
      label: 'Nombre Comercial',
      description: 'Nombre comercial o de fantasía del restaurante/local.'
    });
  }

  // 4. Dirección Matriz
  const dirMatriz = (config.dirMatriz || (config as any).address || '').trim();
  if (!dirMatriz) {
    missing.push({
      field: 'dirMatriz',
      label: 'Dirección Matriz',
      description: 'Dirección de la casa matriz según el RUC.'
    });
  }

  // 5. Dirección de Establecimiento / Sucursal
  const dirEstablecimiento = (config.dirEstablecimiento || (config as any).address || '').trim();
  if (!dirEstablecimiento) {
    missing.push({
      field: 'dirEstablecimiento',
      label: 'Dirección del Establecimiento',
      description: 'Dirección física del punto de venta o local.'
    });
  }

  // 6. Teléfono de Contacto
  const cleanPhone = (config.telefono || (config as any).phone || '').trim();
  if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 7) {
    missing.push({
      field: 'telefono',
      label: 'Teléfono de Contacto',
      description: 'Número de teléfono o celular del negocio.'
    });
  }

  // 7. Correo Electrónico (Email fiscal)
  const email = (config.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    missing.push({
      field: 'email',
      label: 'Correo Electrónico (Email)',
      description: 'Correo electrónico válido para notificaciones y facturación.'
    });
  }

  // 8. Establecimiento (3 dígitos)
  const estab = (config.codigoEstablecimiento || '001').replace(/\D/g, '');
  if (!estab || estab.length !== 3) {
    missing.push({
      field: 'codigoEstablecimiento',
      label: 'Código de Establecimiento',
      description: 'Código de 3 dígitos asignado por el SRI (ej: 001).'
    });
  }

  // 9. Punto de Emisión (3 dígitos)
  const ptoEmi = (config.puntoEmision || '001').replace(/\D/g, '');
  if (!ptoEmi || ptoEmi.length !== 3) {
    missing.push({
      field: 'puntoEmision',
      label: 'Punto de Emisión',
      description: 'Punto de emisión de 3 dígitos del punto de cobro (ej: 001).'
    });
  }

  // 10. Régimen Tributario
  if (!config.regimenTributario) {
    missing.push({
      field: 'regimenTributario',
      label: 'Régimen Tributario',
      description: 'Selecciona RIMPE Emprendedor, RIMPE Negocio Popular o Régimen General.'
    });
  }

  // 11. Firma Electrónica (.p12 / .pfx) para Factura Electrónica SRI
  if (docType === 'factura' || docType === 'retencion') {
    const hasSignatureFile = Boolean(config.firmaElectronicaBase64);
    const hasSignaturePass = Boolean((config.firmaElectronicaClave || '').trim());

    if (!hasSignatureFile) {
      missing.push({
        field: 'firmaElectronicaBase64',
        label: 'Archivo de Firma Electrónica (.p12 / .pfx)',
        description: 'Debes cargar el archivo de firma electrónica para emitir documentos electrónicos autorizados.'
      });
    }

    if (!hasSignaturePass) {
      missing.push({
        field: 'firmaElectronicaClave',
        label: 'Contraseña de la Firma Electrónica',
        description: 'Ingresa la clave de tu certificado de firma electrónica .p12.'
      });
    }
  }

  const totalRequired = (docType === 'factura' || docType === 'retencion') ? 12 : 10;
  const missingCount = missing.length;
  const completedCount = Math.max(0, totalRequired - missingCount);
  const progressPercentage = Math.round((completedCount / totalRequired) * 100);

  return {
    isValid: missingCount === 0,
    missingFields: missing,
    completedCount,
    totalRequired,
    progressPercentage
  };
}

