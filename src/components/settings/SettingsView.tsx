import React, { useState, useMemo } from 'react';
import {
  Save,
  CheckCircle,
  Building2,
  ShieldCheck,
  FileKey,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  UploadCloud,
  Check,
  Percent,
  MapPin,
  Phone,
  Mail,
  FileText,
  Lock,
  ExternalLink,
  Trash2,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { validateSriBusinessConfig } from '../../utils/sriBusinessConfig';
import { validarRucEcuatoriano } from '../../utils/cedulaValidator';
import { consultarRuc } from '../../services/sriService';
import { CompanyConfig, SriRegimenTributario, SriAmbiente } from '../../types';
import { ElectronicSignatureUploader } from './ElectronicSignatureUploader';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useStudio();

  // Tab State
  const [activeTab, setActiveTab] = useState<'sri_fiscal' | 'establishment' | 'signature' | 'pos_params' | 'validation_test'>('sri_fiscal');
  const [activeDocType, setActiveDocType] = useState<'factura' | 'nota_venta' | 'retencion'>('factura');

  // Datos Fiscales SRI (CompanyConfig)
  const [ruc, setRuc] = useState(settings.ruc || settings.taxId || '1792847102001');
  const [razonSocial, setRazonSocial] = useState(settings.razonSocial || 'DEVOLUTION INK TATTOO STUDIO S.A.S.');
  const [nombreComercial, setNombreComercial] = useState(settings.nombreComercial || settings.studioName || 'Devolution Ink Tattoo Studio');
  const [dirMatriz, setDirMatriz] = useState(settings.dirMatriz || settings.address || 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito, Ecuador');
  const [dirEstablecimiento, setDirEstablecimiento] = useState(settings.dirEstablecimiento || settings.address || 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Local 214, Quito, Ecuador');
  const [telefono, setTelefono] = useState(settings.telefono || settings.phone || '+593 99 123 4567');
  const [email, setEmail] = useState(settings.email || 'contacto@devolutionink.com');
  const [codigoEstablecimiento, setCodigoEstablecimiento] = useState(settings.codigoEstablecimiento || '001');
  const [puntoEmision, setPuntoEmision] = useState(settings.puntoEmision || '001');
  const [regimenTributario, setRegimenTributario] = useState<string>(settings.regimenTributario || 'RIMPE_EMPRENDEDOR');
  const [obligadoContabilidad, setObligadoContabilidad] = useState<'SI' | 'NO'>(settings.obligadoContabilidad || 'NO');
  const [agenteRetencion, setAgenteRetencion] = useState<'SI' | 'NO'>(settings.agenteRetencion === 'SI' ? 'SI' : 'NO');
  const [contribuyenteEspecial, setContribuyenteEspecial] = useState(settings.contribuyenteEspecial || '');
  const [ambiente, setAmbiente] = useState<SriAmbiente>(settings.ambiente || 'PRUEBAS');

  // Firma Electrónica (.p12 / .pfx)
  const [firmaElectronicaBase64, setFirmaElectronicaBase64] = useState<string | undefined>(settings.firmaElectronicaBase64);
  const [firmaElectronicaNombre, setFirmaElectronicaNombre] = useState<string | undefined>(settings.firmaElectronicaNombre);
  const [firmaElectronicaNombreArchivo, setFirmaElectronicaNombreArchivo] = useState<string | undefined>(settings.firmaElectronicaNombreArchivo || settings.firmaElectronicaNombre);
  const [firmaElectronicaTamanio, setFirmaElectronicaTamanio] = useState<number | undefined>(settings.firmaElectronicaTamanio);
  const [firmaElectronicaClave, setFirmaElectronicaClave] = useState(settings.firmaElectronicaClave || '');
  const [firmaElectronicaFechaCarga, setFirmaElectronicaFechaCarga] = useState<string | undefined>(settings.firmaElectronicaFechaCarga);
  const [firmaElectronicaEmisor, setFirmaElectronicaEmisor] = useState<string | undefined>(settings.firmaElectronicaEmisor || 'BANCO CENTRAL DEL ECUADOR (BCE)');
  const [firmaElectronicaValida, setFirmaElectronicaValida] = useState<boolean | undefined>(settings.firmaElectronicaValida ?? Boolean(settings.firmaElectronicaBase64));
  const [showSignaturePass, setShowSignaturePass] = useState(false);

  // Parámetros Generales del Estudio & POS
  const [website, setWebsite] = useState(settings.website || 'www.devolutionink.com');
  const [currency, setCurrency] = useState(settings.currency || '$');
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode || 'USD');
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(settings.defaultTaxRate ?? 15);
  const [defaultArtistCommission, setDefaultArtistCommission] = useState<number>(settings.defaultArtistCommission ?? 60);
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(settings.receiptFooterMessage || '');
  const [healthSanitaryRegistration, setHealthSanitaryRegistration] = useState(settings.healthSanitaryRegistration || 'REG-SAN-ARCSA-2026');

  // Estados de proceso
  const [isSaved, setIsSaved] = useState(false);
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [sriSearchNotice, setSriSearchNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Snapshot del estado actual para validar cumplimiento en tiempo real
  const currentCompanyConfig: CompanyConfig = useMemo(() => ({
    ruc: ruc.trim(),
    razonSocial: razonSocial.trim(),
    nombreComercial: nombreComercial.trim(),
    dirMatriz: dirMatriz.trim(),
    dirEstablecimiento: dirEstablecimiento.trim(),
    telefono: telefono.trim(),
    email: email.trim(),
    codigoEstablecimiento: codigoEstablecimiento.trim(),
    puntoEmision: puntoEmision.trim(),
    regimenTributario,
    obligadoContabilidad,
    agenteRetencion,
    contribuyenteEspecial: contribuyenteEspecial.trim() || undefined,
    ambiente,
    firmaElectronicaBase64,
    firmaElectronicaNombre: firmaElectronicaNombreArchivo || firmaElectronicaNombre,
    firmaElectronicaNombreArchivo,
    firmaElectronicaTamanio,
    firmaElectronicaClave: firmaElectronicaClave.trim(),
    firmaElectronicaFechaCarga,
    firmaElectronicaEmisor,
    firmaElectronicaValida,
  }), [
    ruc,
    razonSocial,
    nombreComercial,
    dirMatriz,
    dirEstablecimiento,
    telefono,
    email,
    codigoEstablecimiento,
    puntoEmision,
    regimenTributario,
    obligadoContabilidad,
    agenteRetencion,
    contribuyenteEspecial,
    ambiente,
    firmaElectronicaBase64,
    firmaElectronicaNombre,
    firmaElectronicaNombreArchivo,
    firmaElectronicaTamanio,
    firmaElectronicaClave,
    firmaElectronicaFechaCarga,
    firmaElectronicaEmisor,
    firmaElectronicaValida,
  ]);

  // Validación estricta de configuración
  const validation = useMemo(() => {
    return validateSriBusinessConfig(currentCompanyConfig, activeDocType);
  }, [currentCompanyConfig, activeDocType]);

  // Validación de RUC en tiempo real
  const rucValidation = useMemo(() => {
    return validarRucEcuatoriano(ruc);
  }, [ruc]);

  // Autocompletar datos del negocio desde el catastro del SRI
  const handleAutoFillFromSri = async () => {
    const cleanRuc = ruc.trim().replace(/\D/g, '');
    if (!cleanRuc) {
      setSriSearchNotice({ text: 'Ingresa primero el RUC del negocio de 13 dígitos.', type: 'error' });
      return;
    }

    setIsSearchingSri(true);
    setSriSearchNotice(null);

    try {
      const res = await consultarRuc(cleanRuc);
      if (res.found && res.nombre) {
        setRazonSocial(res.nombre);
        if (res.nombreComercial) {
          setNombreComercial(res.nombreComercial);
        }
        if (res.regimen) {
          const upperReg = res.regimen.toUpperCase();
          if (upperReg.includes('POPULAR')) {
            setRegimenTributario('RIMPE_NEGOCIO_POPULAR');
          } else if (upperReg.includes('EMPRENDEDOR')) {
            setRegimenTributario('RIMPE_EMPRENDEDOR');
          } else {
            setRegimenTributario('GENERAL');
          }
        }
        if (res.obligadoLlevarContabilidad) {
          setObligadoContabilidad(res.obligadoLlevarContabilidad === 'SI' ? 'SI' : 'NO');
        }
        if (res.agenteRetencion) {
          setAgenteRetencion(res.agenteRetencion === 'SI' ? 'SI' : 'NO');
        }
        setSriSearchNotice({
          text: `✓ Datos extraídos con éxito del SRI: ${res.nombre} (Estado: ${res.estado || 'ACTIVO'} · Régimen: ${res.regimen || 'GENERAL'})`,
          type: 'success',
        });
      } else {
        setSriSearchNotice({
          text: res.error || 'No se encontraron datos registrados para este RUC en el SRI.',
          type: 'error',
        });
      }
    } catch {
      setSriSearchNotice({
        text: 'Error de conexión al consultar el catastro del SRI.',
        type: 'error',
      });
    } finally {
      setIsSearchingSri(false);
    }
  };

  // Carga de archivo de firma electrónica (.p12 / .pfx)
  const handleFileSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.p12') && !file.name.toLowerCase().endsWith('.pfx')) {
      alert('El archivo de firma debe ser de formato .p12 o .pfx emitido por una entidad certificadora autorizada (BCE, Security Data, Consejo de la Judicatura, ANFAC, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setFirmaElectronicaBase64(base64);
      setFirmaElectronicaNombre(file.name);
      alert(`✓ Certificado "${file.name}" cargado en el sistema con éxito. No olvides ingresar la contraseña de la firma.`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    if (confirm('¿Deseas remover la firma electrónica actual? Para emitir facturas electrónicas válidas se requiere un certificado activo.')) {
      setFirmaElectronicaBase64(undefined);
      setFirmaElectronicaNombre(undefined);
      setFirmaElectronicaClave('');
    }
  };

  // Guardar configuración completa
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateSettings({
      // Compatibilidad con campos previos de StudioSettings
      studioName: nombreComercial.trim(),
      taxId: ruc.trim(),
      address: dirEstablecimiento.trim(),
      phone: telefono.trim(),
      email: email.trim(),
      website: website.trim(),
      currency: currency.trim() || '$',
      currencyCode: currencyCode.trim() || 'USD',
      defaultTaxRate,
      defaultArtistCommission,
      receiptFooterMessage: receiptFooterMessage.trim(),
      healthSanitaryRegistration: healthSanitaryRegistration.trim(),

      // Campos oficiales de CompanyConfig (SRI Ecuador)
      ruc: ruc.trim(),
      razonSocial: razonSocial.trim(),
      nombreComercial: nombreComercial.trim(),
      dirMatriz: dirMatriz.trim(),
      dirEstablecimiento: dirEstablecimiento.trim(),
      telefono: telefono.trim(),
      codigoEstablecimiento: codigoEstablecimiento.trim() || '001',
      puntoEmision: puntoEmision.trim() || '001',
      regimenTributario,
      obligadoContabilidad,
      agenteRetencion,
      contribuyenteEspecial: contribuyenteEspecial.trim() || undefined,
      ambiente,
      tipoEmision: 'NORMAL',
      firmaElectronicaBase64,
      firmaElectronicaNombre: firmaElectronicaNombreArchivo || firmaElectronicaNombre,
      firmaElectronicaNombreArchivo,
      firmaElectronicaTamanio,
      firmaElectronicaClave: firmaElectronicaClave.trim(),
      firmaElectronicaFechaCarga,
      firmaElectronicaEmisor,
      firmaElectronicaValida: Boolean(firmaElectronicaBase64),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FF3366]" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Configuración de Negocio & Facturación SRI
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366]">
              Ecuador 2026
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Administra la identidad legal, régimen tributario, certificado de firma electrónica (.p12) y parámetros del estudio en C.C. Quicentro Shopping.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(255,51,102,0.35)] shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Configuración</span>
        </button>
      </div>

      {/* SRI Compliance Diagnostic Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#17171C] border border-[#272730] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {validation.isValid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <h3 className="text-sm font-bold text-white">
                Diagnóstico de Cumplimiento SRI para {activeDocType === 'factura' ? 'Facturación Electrónica' : activeDocType === 'nota_venta' ? 'Notas de Venta RIMPE' : 'Retenciones'}
              </h3>
            </div>
            <p className="text-xs text-neutral-400">
              {validation.isValid
                ? '¡Excelente! Todos los requisitos fiscales están configurados para emitir comprobantes autorizados.'
                : `Faltan ${validation.missingFields.length} campos obligatorios para emitir comprobantes autorizados por el SRI.`}
            </p>
          </div>

          {/* Quick DocType Selector for validation preview */}
          <div className="flex items-center gap-1.5 p-1 bg-[#121215] border border-[#272730] rounded-xl self-start md:self-center">
            <button
              type="button"
              onClick={() => setActiveDocType('factura')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeDocType === 'factura'
                  ? 'bg-[#FF3366] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Factura
            </button>
            <button
              type="button"
              onClick={() => setActiveDocType('nota_venta')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeDocType === 'nota_venta'
                  ? 'bg-[#FF3366] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Nota Venta
            </button>
            <button
              type="button"
              onClick={() => setActiveDocType('retencion')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeDocType === 'retencion'
                  ? 'bg-[#FF3366] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Retención
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-300 font-semibold">
              Progreso: {validation.completedCount} de {validation.totalRequired} requisitos cumplidos
            </span>
            <span className={`font-bold ${
              validation.progressPercentage === 100
                ? 'text-emerald-400'
                : validation.progressPercentage >= 70
                ? 'text-blue-400'
                : 'text-amber-400'
            }`}>
              {validation.progressPercentage}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#121215] rounded-full overflow-hidden border border-[#272730]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                validation.progressPercentage === 100
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : validation.progressPercentage >= 70
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${validation.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Missing fields breakdown chips */}
        {!validation.isValid && validation.missingFields.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
            <span className="text-[11px] font-bold text-amber-300 block">
              Requisitos pendientes para {activeDocType}:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {validation.missingFields.map((f, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-200">
                  <span className="text-amber-400 font-bold">•</span>
                  <div>
                    <span className="font-semibold text-white">{f.label}:</span>{' '}
                    <span className="text-neutral-300 text-[10px]">{f.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#24242A] overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('sri_fiscal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'sri_fiscal'
              ? 'border-[#FF3366] text-[#FF3366]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Datos Fiscales SRI</span>
        </button>

        <button
          onClick={() => setActiveTab('establishment')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'establishment'
              ? 'border-[#FF3366] text-[#FF3366]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>2. Establecimiento & Emisión</span>
        </button>

        <button
          onClick={() => setActiveTab('signature')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'signature'
              ? 'border-[#FF3366] text-[#FF3366]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <FileKey className="w-4 h-4" />
          <span>3. Firma Electrónica (.p12)</span>
          {firmaElectronicaBase64 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pos_params')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'pos_params'
              ? 'border-[#FF3366] text-[#FF3366]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>4. Parámetros POS & Estudio</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: DATOS FISCALES SRI */}
        {/* ========================================================= */}
        {activeTab === 'sri_fiscal' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242A] pb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Identificación Tributaria del Contribuyente
                </h3>
                <p className="text-[11px] text-neutral-400">
                  RUC, razón social registrada y régimen aplicable ante el Servicio de Rentas Internas.
                </p>
              </div>

              {/* Botón Autocompletar desde SRI */}
              <button
                type="button"
                onClick={handleAutoFillFromSri}
                disabled={isSearchingSri || !ruc.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 self-start sm:self-center shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSearchingSri ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                <span>{isSearchingSri ? 'Consultando SRI...' : 'Autocompletar desde SRI'}</span>
              </button>
            </div>

            {/* Aviso de resultado de búsqueda SRI */}
            {sriSearchNotice && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                sriSearchNotice.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {sriSearchNotice.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{sriSearchNotice.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* RUC */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-neutral-300">RUC del Negocio *</label>
                  <span className={`text-[10px] font-mono ${rucValidation.isValid ? 'text-emerald-400' : 'text-neutral-400'}`}>
                    {rucValidation.isValid ? '✓ 13 dígitos válidos' : '13 dígitos'}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={13}
                  value={ruc}
                  onChange={e => setRuc(e.target.value)}
                  placeholder="1792847102001"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  {rucValidation.message || 'RUC registrado en el catastro del SRI.'}
                </span>
              </div>

              {/* Razón Social */}
              <div className="md:col-span-2">
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Razón Social (Nombre Legal) *
                </label>
                <input
                  type="text"
                  required
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  placeholder="DEVOLUTION INK TATTOO STUDIO S.A.S."
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              {/* Nombre Comercial */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Nombre Comercial (Marca o Local) *
                </label>
                <input
                  type="text"
                  required
                  value={nombreComercial}
                  onChange={e => setNombreComercial(e.target.value)}
                  placeholder="Devolution Ink Tattoo Studio"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              {/* Régimen Tributario */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Régimen Tributario SRI *
                </label>
                <select
                  value={regimenTributario}
                  onChange={e => setRegimenTributario(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 font-semibold"
                >
                  <option value="RIMPE_EMPRENDEDOR">CONTRIBUYENTE RÉGIMEN RIMPE (Emprendedor)</option>
                  <option value="RIMPE_NEGOCIO_POPULAR">CONTRIBUYENTE RÉGIMEN RIMPE (Negocio Popular)</option>
                  <option value="GENERAL">RÉGIMEN GENERAL</option>
                </select>
              </div>

              {/* Ambiente del SRI */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Ambiente del SRI *
                </label>
                <select
                  value={ambiente}
                  onChange={e => setAmbiente(e.target.value as SriAmbiente)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 font-mono"
                >
                  <option value="PRUEBAS">1 - PRUEBAS (Ambiente de Pruebas / Certificación)</option>
                  <option value="PRODUCCION">2 - PRODUCCIÓN (Emisión Legal en Vivo)</option>
                </select>
              </div>

              {/* Obligado a Llevar Contabilidad */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  ¿Obligado a Llevar Contabilidad?
                </label>
                <select
                  value={obligadoContabilidad}
                  onChange={e => setObligadoContabilidad(e.target.value as 'SI' | 'NO')}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>

              {/* Agente de Retención */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  ¿Agente de Retención?
                </label>
                <select
                  value={agenteRetencion}
                  onChange={e => setAgenteRetencion(e.target.value as 'SI' | 'NO')}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>

              {/* Contribuyente Especial */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Contribuyente Especial (N° Resolución)
                </label>
                <input
                  type="text"
                  value={contribuyenteEspecial}
                  onChange={e => setContribuyenteEspecial(e.target.value)}
                  placeholder="Dejar vacío si no aplica"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ESTABLECIMIENTO & PUNTOS DE EMISIÓN */}
        {/* ========================================================= */}
        {activeTab === 'establishment' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
            <div className="border-b border-[#24242A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Sucursales, Domicilio Fiscal y Canales de Contacto
              </h3>
              <p className="text-[11px] text-neutral-400">
                Direcciones físicas impresas en los comprobantes y códigos de serie de 3 dígitos (001-001).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Dirección Matriz */}
              <div className="md:col-span-2">
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Dirección Matriz (Según RUC) *
                </label>
                <input
                  type="text"
                  required
                  value={dirMatriz}
                  onChange={e => setDirMatriz(e.target.value)}
                  placeholder="Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito, Ecuador"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              {/* Dirección Establecimiento */}
              <div className="md:col-span-2">
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Dirección del Establecimiento / Local Comercial *
                </label>
                <input
                  type="text"
                  required
                  value={dirEstablecimiento}
                  onChange={e => setDirEstablecimiento(e.target.value)}
                  placeholder="C.C. Quicentro Shopping, Local 214, Quito, Ecuador"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              {/* Código Establecimiento */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Código de Establecimiento (3 dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={codigoEstablecimiento}
                  onChange={e => setCodigoEstablecimiento(e.target.value)}
                  placeholder="001"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Primer bloque de la serie de factura: ej. <strong>001</strong>-001-000000001
                </span>
              </div>

              {/* Punto de Emisión */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Punto de Emisión (3 dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={puntoEmision}
                  onChange={e => setPuntoEmision(e.target.value)}
                  placeholder="001"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Segundo bloque de la serie: ej. 001-<strong>001</strong>-000000001
                </span>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Teléfono de Contacto Fiscal *
                </label>
                <input
                  type="text"
                  required
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="+593 99 123 4567"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Correo Electrónico (Email Notificaciones) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contacto@devolutionink.com"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FIRMA ELECTRÓNICA (.P12) */}
        {/* ========================================================= */}
        {activeTab === 'signature' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
            <div className="border-b border-[#24242A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileKey className="w-4 h-4 text-[#FF3366]" />
                <span>Gestión de Firma Electrónica (.p12 / .pfx) SRI</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Certificado digital PKCS#12 requerido para la firma criptográfica XAdES-BES de Facturas, Notas de Crédito y Retenciones según normativa SRI del Ecuador.
              </p>
            </div>

            <ElectronicSignatureUploader
              company={currentCompanyConfig}
              onChangeSignature={(sig) => {
                if ('firmaElectronicaBase64' in sig) setFirmaElectronicaBase64(sig.firmaElectronicaBase64);
                if ('firmaElectronicaNombre' in sig) setFirmaElectronicaNombre(sig.firmaElectronicaNombre);
                if ('firmaElectronicaNombreArchivo' in sig) setFirmaElectronicaNombreArchivo(sig.firmaElectronicaNombreArchivo);
                if ('firmaElectronicaTamanio' in sig) setFirmaElectronicaTamanio(sig.firmaElectronicaTamanio);
                if ('firmaElectronicaClave' in sig) setFirmaElectronicaClave(sig.firmaElectronicaClave || '');
                if ('firmaElectronicaFechaCarga' in sig) setFirmaElectronicaFechaCarga(sig.firmaElectronicaFechaCarga);
                if ('firmaElectronicaEmisor' in sig) setFirmaElectronicaEmisor(sig.firmaElectronicaEmisor);
                if ('firmaElectronicaValida' in sig) setFirmaElectronicaValida(sig.firmaElectronicaValida);
              }}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PARÁMETROS POS & ESTUDIO */}
        {/* ========================================================= */}
        {activeTab === 'pos_params' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
            <div className="border-b border-[#24242A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Operación de Caja, Comisiones & Registros Sanitarios
              </h3>
              <p className="text-[11px] text-neutral-400">
                Parámetros predeterminados para el cálculo de IVA, comisiones de tatuadores y mensajes de ticket.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">Símbolo Moneda</label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  placeholder="$"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">Código ISO Moneda</label>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={e => setCurrencyCode(e.target.value)}
                  placeholder="USD"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Tarifa General IVA (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultTaxRate}
                  onChange={e => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  15% tarifa estándar vigente en Ecuador
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Comisión Base Artista (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultArtistCommission}
                  onChange={e => setDefaultArtistCommission(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Comisión sugerida para nuevos tatuadores
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Registro Sanitario Oficial (ARCSA / MSP)
                </label>
                <input
                  type="text"
                  value={healthSanitaryRegistration}
                  onChange={e => setHealthSanitaryRegistration(e.target.value)}
                  placeholder="REG-SAN-ARCSA-2026"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Sitio Web Oficial
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="www.devolutionink.com"
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>
            </div>

            {/* Mensaje al pie del ticket */}
            <div className="pt-2">
              <label className="block font-semibold text-neutral-300 mb-1.5 text-xs">
                Mensaje de Cuidados Sanitarios al Pie del Ticket / Comprobante
              </label>
              <textarea
                rows={3}
                value={receiptFooterMessage}
                onChange={e => setReceiptFooterMessage(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:border-[#FF3366]/60 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#18181D] border border-[#272730]">
          <div>
            {isSaved && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Configuración tributaria y comercial guardada exitosamente</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="justify-center px-6 py-2.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.35)] transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Toda la Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
};
