import { CompanyConfig } from '../types';

export const INITIAL_COMPANY: CompanyConfig = {
  ruc: '1792345678001',
  razonSocial: 'CORPORACION CONTABLE & TRIBUTARIA DEL ECUADOR S.A.S.',
  nombreComercial: 'CORPCONTABLE ECUADOR',
  dirMatriz: 'Av. Amazonas N34-120 y Av. República, Edificio Las Cámaras, Piso 5, Quito - Ecuador',
  dirEstablecimiento: 'Av. Amazonas N34-120 y Av. República, Quito - Ecuador',
  pais: 'ECUADOR',
  provincia: 'PICHINCHA',
  ciudad: 'QUITO',
  parroquia: 'IÑAQUITO',
  codigoEstablecimiento: '001',
  puntoEmision: '001',
  secuencialFactura: '000000001',
  secuencialNotaVenta: '000000001',
  obligadoContabilidad: 'SI',
  regimenTributario: 'GENERAL',
  agenteRetencion: 'NAC-DNCRASC20-00000001',
  contribuyenteEspecial: '',
  ambiente: '1', // 1 = Pruebas, 2 = Producción
  tipoEmision: '1', // 1 = Normal
  email: 'tributacion@corpcontable.ec',
  telefono: '+593 2 298 7654',
  logoUrl: '',
  tarifaIvaPredeterminada: 15,
};

export const DEVOLUTION_INK_COMPANY: CompanyConfig = {
  ruc: '1792847102001',
  razonSocial: 'DEVOLUTION INK TATTOO STUDIO S.A.S.',
  nombreComercial: 'Devolution Ink Tattoo Studio',
  dirMatriz: 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito, Ecuador',
  dirEstablecimiento: 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Local 214, Quito, Ecuador',
  pais: 'ECUADOR',
  provincia: 'PICHINCHA',
  ciudad: 'QUITO',
  parroquia: 'IÑAQUITO',
  codigoEstablecimiento: '001',
  puntoEmision: '001',
  secuencialFactura: '000000001',
  secuencialNotaVenta: '000000001',
  obligadoContabilidad: 'NO',
  regimenTributario: 'RIMPE_EMPRENDEDOR',
  agenteRetencion: 'NO',
  contribuyenteEspecial: '',
  ambiente: '1',
  tipoEmision: '1',
  email: 'contacto@devolutionink.com',
  telefono: '+593 99 123 4567',
  logoUrl: '',
  tarifaIvaPredeterminada: 15,
};

