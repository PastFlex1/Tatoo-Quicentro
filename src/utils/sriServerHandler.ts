/**
 * SRI & Registro Civil Backend Handler
 * Implementa la lógica oficial de consulta para RUC, Cédula y Pasaporte del SRI del Ecuador.
 */

export interface SriConsultarResult {
  success: boolean;
  found: boolean;
  identificacion?: string;
  documento?: string;
  nombre?: string;
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
  transaccionesInexistente?: string;
  informacionFechas?: any;
  representantesLegales?: any[];
  representanteLegalNombre?: string;
  representanteLegalId?: string;
  fechaConsulta?: string;
  error?: string;
  message?: string;
  source?: string;
}

export async function consultarIdentificacionSriBackend(rawId: string): Promise<SriConsultarResult> {
  const cleanDigits = (rawId || '').trim().replace(/\D/g, '');
  const cleanId = (rawId || '').trim();

  if (!cleanId) {
    return { success: false, found: false, error: 'Número de identificación requerido.' };
  }

  const isCedula = cleanDigits.length === 10;
  const isRuc = cleanDigits.length === 13;
  const tipo = isCedula ? 'C' : isRuc ? 'R' : 'P';
  const targetId = isCedula || isRuc ? cleanDigits : cleanId.toUpperCase();

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };

  let foundName = '';
  let foundTipoPersona: string | null = null;
  let foundRucData: any = null;
  let source = 'SRI_CATASTRO';

  // 1. Intentar endpoint oficial de Persona del SRI
  try {
    const personaUrl = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/Persona/obtenerPorTipoIdentificacion?numeroIdentificacion=${encodeURIComponent(targetId)}&tipoIdentificacion=${tipo}`;
    const resPersona = await fetch(personaUrl, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (resPersona.status === 200) {
      const pData = await resPersona.json();
      if (pData && pData.nombreCompleto) {
        foundName = pData.nombreCompleto.trim();
        foundTipoPersona = pData.tipoPersona || null;
        source = 'SRI_PERSONA';
      }
    }
  } catch {
    // Continuar al siguiente nivel
  }

  // 2. Intentar Catastro RUC consolidado del SRI
  if (!foundName) {
    try {
      const rucNum = isCedula ? `${targetId}001` : targetId;
      const rucUrl = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?ruc=${encodeURIComponent(rucNum)}`;
      const resRuc = await fetch(rucUrl, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (resRuc.status === 200) {
        const list = await resRuc.json();
        const record = Array.isArray(list) ? list[0] : list;
        if (record && record.razonSocial) {
          foundName = record.razonSocial.trim();
          foundTipoPersona = record.tipoContribuyente || null;
          foundRucData = record;
          source = 'SRI_CATASTRO';
        }
      }
    } catch {
      // Continuar al siguiente nivel
    }
  }

  // 3. SRI Móvil por Identificación
  if (!foundName) {
    try {
      const deudasUrl = `https://srienlinea.sri.gob.ec/movil-servicios/api/v1.0/deudas/porIdentificacion/${encodeURIComponent(targetId)}`;
      const resDeudas = await fetch(deudasUrl, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

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
    } catch {
      // Continuar al siguiente nivel
    }
  }

  // 4. Fallback Registro Civil SECAP (para Cédulas)
  if (!foundName && isCedula) {
    try {
      const secapRes = await fetch('https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: new URLSearchParams({ documento: targetId, tipo: '1' }),
        signal: AbortSignal.timeout(4000),
      });

      if (secapRes.ok) {
        const text = await secapRes.text();
        if (text && !text.trim().startsWith('<')) {
          try {
            const secapData = JSON.parse(text);
            if (secapData?.nombreCompleto) {
              foundName = secapData.nombreCompleto.trim();
              source = 'REGISTRO_CIVIL';
            } else if (secapData?.nombre) {
              foundName = secapData.nombre.trim();
              source = 'REGISTRO_CIVIL';
            } else if (secapData?.nombres && secapData?.apellidos) {
              foundName = `${secapData.apellidos} ${secapData.nombres}`.trim();
              source = 'REGISTRO_CIVIL';
            }
          } catch {}
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
    error: `No se encontraron datos en el SRI ni Registro Civil para la identificación ${targetId}.`,
    message: `No se encontraron datos para la identificación ingresada (${targetId}).`,
  };
}

export async function consultarRucSriBackend(rawRuc: string): Promise<SriConsultarResult> {
  let ruc = (rawRuc || '').trim().replace(/\D/g, '');
  if (!ruc) {
    return { success: false, found: false, error: 'Número de RUC o Cédula requerido' };
  }

  if (ruc.length === 10) {
    ruc = `${ruc}001`;
  }

  if (ruc.length !== 13) {
    return { success: false, found: false, error: 'El RUC debe tener 13 dígitos o cédula 10 dígitos.' };
  }

  const sriUrl = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?ruc=${encodeURIComponent(ruc)}`;

  try {
    const sriResponse = await fetch(sriUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!sriResponse || sriResponse.status === 204 || !sriResponse.ok) {
      // Fallback a consultarIdentificacionSriBackend
      const fallback = await consultarIdentificacionSriBackend(ruc);
      if (fallback.found) {
        return {
          ...fallback,
          success: true,
          found: true,
          identificacion: ruc,
          source: fallback.source || 'SRI_PERSONA',
        };
      }
      return { success: false, found: false, error: `RUC ${ruc} no registrado o sin actividad en el catastro del SRI.` };
    }

    const rawText = await sriResponse.text();
    if (!rawText || !rawText.trim() || rawText.trim().startsWith('<')) {
      const fallback = await consultarIdentificacionSriBackend(ruc);
      if (fallback.found) return fallback;
      return { success: false, found: false, error: `No se encontraron datos registrados en el SRI para el RUC ${ruc}` };
    }

    let rawData: any = null;
    try {
      rawData = JSON.parse(rawText);
    } catch {
      return { success: false, found: false, error: `Respuesta no válida del SRI para el RUC ${ruc}` };
    }

    let record: any = null;
    if (Array.isArray(rawData) && rawData.length > 0) {
      record = rawData[0];
    } else if (rawData && typeof rawData === 'object' && rawData.numeroRuc) {
      record = rawData;
    }

    if (!record || !record.numeroRuc) {
      const fallback = await consultarIdentificacionSriBackend(ruc);
      if (fallback.found) return fallback;
      return { success: false, found: false, error: `No se encontraron datos registrados en el SRI para el RUC ${ruc}` };
    }

    const estadoSRI = record.estadoContribuyenteRuc || record.estado || 'ACTIVO';
    const repLegal = Array.isArray(record.representantesLegales) && record.representantesLegales.length > 0
      ? record.representantesLegales[0]
      : null;

    return {
      success: true,
      found: true,
      identificacion: record.numeroRuc,
      documento: record.numeroRuc,
      nombre: record.razonSocial ? record.razonSocial.trim() : '',
      nombreCompleto: record.razonSocial ? record.razonSocial.trim() : '',
      razonSocial: record.razonSocial ? record.razonSocial.trim() : '',
      nombreComercial: record.nombreComercial && record.nombreComercial.trim() !== (record.razonSocial ? record.razonSocial.trim() : '')
        ? record.nombreComercial.trim()
        : '',
      estado: estadoSRI,
      estadoContribuyenteRuc: estadoSRI,
      tipoPersona: record.tipoContribuyente || record.tipo || '',
      tipoContribuyente: record.tipoContribuyente || record.tipo || '',
      actividadEconomicaPrincipal: record.actividadEconomicaPrincipal || '',
      regimen: record.regimen || 'GENERAL',
      categoria: record.categoria || null,
      obligadoLlevarContabilidad: record.obligadoLlevarContabilidad || 'NO',
      agenteRetencion: record.agenteRetencion || 'NO',
      contribuyenteEspecial: record.contribuyenteEspecial || 'NO',
      contribuyenteFantasma: record.contribuyenteFantasma || 'NO',
      transaccionesInexistente: record.transaccionesInexistente || 'NO',
      informacionFechas: record.informacionFechasContribuyente || null,
      representantesLegales: record.representantesLegales || [],
      representanteLegalNombre: repLegal?.nombre || '',
      representanteLegalId: repLegal?.identificacion || '',
      fechaConsulta: new Date().toISOString(),
      source: 'SRI_CATASTRO',
    };
  } catch (error: any) {
    const fallback = await consultarIdentificacionSriBackend(ruc);
    if (fallback.found) return fallback;
    return { success: false, found: false, error: error.message || 'Error al consultar el catastro del SRI' };
  }
}

