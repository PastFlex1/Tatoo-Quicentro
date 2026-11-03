import { validarIdentificacionEcuador } from '../utils/ecuadorIdValidator';

export interface SriContribuyenteResult {
  success: boolean;
  found: boolean;
  identificacion: string;
  documento?: string;
  nombre: string;
  nombreCompleto?: string;
  razonSocial?: string;
  nombreComercial?: string;
  tipoPersona?: string | null;
  tipoContribuyente?: string;
  tipoIdentificacion?: 'CEDULA' | 'RUC' | 'PASAPORTE';
  estado?: string;
  estadoContribuyenteRuc?: string;
  regimen?: string;
  categoria?: string | null;
  actividadEconomicaPrincipal?: string;
  obligadoLlevarContabilidad?: string;
  agenteRetencion?: string;
  contribuyenteEspecial?: string;
  contribuyenteFantasma?: string;
  representanteLegalNombre?: string;
  representanteLegalId?: string;
  informacionFechas?: any;
  fechaConsulta?: string;
  error?: string;
  source?: 'SRI_CATASTRO' | 'SRI_PERSONA' | 'SRI_MOVIL' | 'REGISTRO_CIVIL' | 'LOCAL';
}

/**
 * Consulta un número de RUC (13 dígitos) o Cédula en el catastro del SRI
 */
export async function consultarRuc(rawRuc: string): Promise<SriContribuyenteResult> {
  const clean = (rawRuc || '').trim().replace(/\D/g, '');
  const ruc = clean.length === 10 ? `${clean}001` : clean;

  if (ruc.length !== 13) {
    return {
      success: false,
      found: false,
      identificacion: rawRuc,
      nombre: '',
      error: 'El RUC debe tener 13 dígitos numéricos o cédula de 10 dígitos.',
    };
  }

  // 1. Intentar endpoint de la API local de Vite o Express
  try {
    const res = await fetch(`/api/sri/ruc/${encodeURIComponent(ruc)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.found) {
        return {
          ...data,
          success: true,
          identificacion: ruc,
          nombre: data.razonSocial || data.nombre || data.nombreComercial || '',
          source: 'SRI_CATASTRO',
        };
      }
    }
  } catch {
    // Si la ruta local no responde, continuar al fallback
  }

  // 2. Intentar consulta unificada
  return consultarIdentificacion(ruc);
}

/**
 * Consulta unificada para Cédula (10 dígitos), RUC (13 dígitos) o Pasaporte
 * Implementa la lógica provista de 4 niveles:
 * 1. Persona SRI
 * 2. Catastro RUC SRI
 * 3. SRI Móvil Deudas
 * 4. Registro Civil SECAP
 */
export async function consultarIdentificacion(rawId: string): Promise<SriContribuyenteResult> {
  const cleanId = (rawId || '').trim();
  const cleanDigits = cleanId.replace(/\D/g, '');

  if (!cleanId) {
    return {
      success: false,
      found: false,
      identificacion: '',
      nombre: '',
      error: 'Número de identificación requerido.',
    };
  }

  // Si es Consumidor Final
  if (cleanDigits === '9999999999999' || cleanId === '9999999999999') {
    return {
      success: true,
      found: true,
      identificacion: '9999999999999',
      nombre: 'CONSUMIDOR FINAL',
      razonSocial: 'CONSUMIDOR FINAL',
      tipoIdentificacion: 'CEDULA',
      estado: 'ACTIVO',
      regimen: 'GENERAL',
      source: 'LOCAL',
    };
  }

  // 1. Intentar endpoint local (/api/sri/consultar-cedula o /api/cedula)
  try {
    const localUrl = `/api/sri/consultar-cedula/${encodeURIComponent(cleanDigits.length === 10 || cleanDigits.length === 13 ? cleanDigits : cleanId)}`;
    const res = await fetch(localUrl, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.found) {
        return {
          ...data,
          identificacion: cleanDigits || cleanId,
          nombre: data.razonSocial || data.nombre || data.nombreCompleto || '',
          source: data.source || 'SRI_CATASTRO',
        };
      }
    }
  } catch {
    // Fallback si la ruta dev no está disponible
  }

  // Fallback directo desde el cliente (en caso de que el proxy esté ausente y la red lo permita)
  const isCedula = cleanDigits.length === 10;
  const isRuc = cleanDigits.length === 13;
  const tipo = isCedula ? 'C' : isRuc ? 'R' : 'P';
  const targetId = isCedula || isRuc ? cleanDigits : cleanId.toUpperCase();

  const headers = {
    'Accept': 'application/json, text/plain, */*',
  };

  let foundName = '';
  let foundTipoPersona: string | null = null;
  let foundRucData: any = null;
  let source: SriContribuyenteResult['source'] = 'SRI_CATASTRO';

  // 1. Persona SRI
  try {
    const personaUrl = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/Persona/obtenerPorTipoIdentificacion?numeroIdentificacion=${encodeURIComponent(targetId)}&tipoIdentificacion=${tipo}`;
    const resPersona = await fetch(personaUrl, { headers });
    if (resPersona.status === 200) {
      const pData = await resPersona.json();
      if (pData?.nombreCompleto) {
        foundName = pData.nombreCompleto.trim();
        foundTipoPersona = pData.tipoPersona || null;
        source = 'SRI_PERSONA';
      }
    }
  } catch {}

  // 2. Catastro RUC consolidado
  if (!foundName) {
    try {
      const rucNum = isCedula ? `${targetId}001` : targetId;
      const rucUrl = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?ruc=${encodeURIComponent(rucNum)}`;
      const resRuc = await fetch(rucUrl, { headers });
      if (resRuc.status === 200) {
        const list = await resRuc.json();
        const record = Array.isArray(list) ? list[0] : list;
        if (record?.razonSocial) {
          foundName = record.razonSocial.trim();
          foundTipoPersona = record.tipoContribuyente || null;
          foundRucData = record;
          source = 'SRI_CATASTRO';
        }
      }
    } catch {}
  }

  // 3. SRI Móvil
  if (!foundName) {
    try {
      const deudasUrl = `https://srienlinea.sri.gob.ec/movil-servicios/api/v1.0/deudas/porIdentificacion/${encodeURIComponent(targetId)}`;
      const resDeudas = await fetch(deudasUrl, { headers });
      if (resDeudas.status === 200) {
        const deudasData = await resDeudas.json();
        if (deudasData) {
          let extractedName = '';
          if (deudasData.contribuyente && typeof deudasData.contribuyente === 'object') {
            extractedName = deudasData.contribuyente.razonSocial || deudasData.contribuyente.nombreComercial || deudasData.contribuyente.denominacion || '';
          } else if (typeof deudasData.contribuyente === 'string') {
            extractedName = deudasData.contribuyente;
          } else {
            extractedName = deudasData.nombreCompleto || deudasData.razonSocial || '';
          }
          if (extractedName && typeof extractedName === 'string') {
            foundName = extractedName.trim();
            source = 'SRI_MOVIL';
          }
        }
      }
    } catch {}
  }

  // 4. Registro Civil SECAP
  if (!foundName && isCedula) {
    try {
      const secapRes = await fetch('https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ documento: targetId, tipo: '1' }),
      });
      if (secapRes.ok) {
        const text = await secapRes.text();
        if (text && !text.trim().startsWith('<')) {
          const secapData = JSON.parse(text);
          if (secapData?.nombreCompleto) {
            foundName = secapData.nombreCompleto.trim();
            source = 'REGISTRO_CIVIL';
          } else if (secapData?.nombres && secapData?.apellidos) {
            foundName = `${secapData.apellidos} ${secapData.nombres}`.trim();
            source = 'REGISTRO_CIVIL';
          }
        }
      }
    } catch {}
  }

  if (foundName) {
    return {
      success: true,
      found: true,
      identificacion: targetId,
      documento: targetId,
      nombre: foundName,
      nombreCompleto: foundName,
      razonSocial: foundRucData?.razonSocial || foundName,
      nombreComercial: foundRucData?.nombreComercial || '',
      tipoPersona: foundTipoPersona,
      tipoIdentificacion: isCedula ? 'CEDULA' : isRuc ? 'RUC' : 'PASAPORTE',
      estado: foundRucData?.estadoContribuyenteRuc || 'ACTIVO',
      regimen: foundRucData?.regimen || 'GENERAL',
      categoria: foundRucData?.categoria || null,
      actividadEconomicaPrincipal: foundRucData?.actividadEconomicaPrincipal || '',
      obligadoLlevarContabilidad: foundRucData?.obligadoLlevarContabilidad || 'NO',
      agenteRetencion: foundRucData?.agenteRetencion || 'NO',
      contribuyenteEspecial: foundRucData?.contribuyenteEspecial || 'NO',
      fechaConsulta: new Date().toISOString(),
      source,
    };
  }

  return {
    success: false,
    found: false,
    identificacion: targetId,
    nombre: '',
    error: `No se encontraron datos registrados en el SRI ni Registro Civil para la identificación ${targetId}.`,
  };
}

