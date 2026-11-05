import React, { useState, useMemo, useRef } from 'react';
import { DEFAULT_SRI_API_URL } from '../../services/sriElectronicService';
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
  Image as ImageIcon,
  Globe,
  Hash,
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
  const [ruc, setRuc] = useState(settings.ruc || settings.taxId || '');
  const [razonSocial, setRazonSocial] = useState(settings.razonSocial || 'DEVOLUTION INK TATTOO STUDIO S.A.S.');
  const [nombreComercial, setNombreComercial] = useState(settings.nombreComercial || settings.studioName || 'Devolution Ink Tattoo Studio');
  const [dirMatriz, setDirMatriz] = useState(settings.dirMatriz || settings.address || 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito, Ecuador');
  const [dirEstablecimiento, setDirEstablecimiento] = useState(settings.dirEstablecimiento || settings.address || 'Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Local 214, Quito, Ecuador');
  const [pais, setPais] = useState(settings.pais || 'ECUADOR');
  const [provincia, setProvincia] = useState(settings.provincia || 'PICHINCHA');
  const [ciudad, setCiudad] = useState(settings.ciudad || 'QUITO');
  const [parroquia, setParroquia] = useState(settings.parroquia || 'IÑAQUITO');
  const [telefono, setTelefono] = useState(settings.telefono || settings.phone || '+593 99 123 4567');
  const [email, setEmail] = useState(settings.email || 'contacto@devolutionink.com');
  const [codigoEstablecimiento, setCodigoEstablecimiento] = useState(settings.codigoEstablecimiento || '001');
  const [puntoEmision, setPuntoEmision] = useState(settings.puntoEmision || '001');
  const [secuencialFactura, setSecuencialFactura] = useState(settings.secuencialFactura || '000000001');
  const [secuencialNotaVenta, setSecuencialNotaVenta] = useState(settings.secuencialNotaVenta || '000000001');
  const [regimenTributario, setRegimenTributario] = useState<string>(settings.regimenTributario || 'RIMPE_EMPRENDEDOR');
  const [obligadoContabilidad, setObligadoContabilidad] = useState<'SI' | 'NO'>(settings.obligadoContabilidad || 'NO');
  const [agenteRetencion, setAgenteRetencion] = useState<'SI' | 'NO'>(settings.agenteRetencion === 'SI' ? 'SI' : 'NO');
  const [contribuyenteEspecial, setContribuyenteEspecial] = useState(settings.contribuyenteEspecial || '');
  const [ambiente, setAmbiente] = useState<SriAmbiente>(settings.ambiente || 'PRUEBAS');
  const [sriApiUrl, setSriApiUrl] = useState(settings.sriApiUrl || DEFAULT_SRI_API_URL);

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
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(
    (!settings.defaultTaxRate || settings.defaultTaxRate === 8 || settings.defaultTaxRate === 12)
      ? 15
      : settings.defaultTaxRate
  );
  const [defaultArtistCommission, setDefaultArtistCommission] = useState<number>(
    (!settings.defaultArtistCommission || [50, 60, 65, 70].includes(settings.defaultArtistCommission))
      ? 80
      : settings.defaultArtistCommission
  );
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(settings.receiptFooterMessage || '');
  const [healthSanitaryRegistration, setHealthSanitaryRegistration] = useState(settings.healthSanitaryRegistration || 'REG-SAN-ARCSA-2026');

  // Logo Oficial de la Empresa (Base64 data URL o URL de imagen)
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

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
    pais: pais.trim().toUpperCase(),
    provincia: provincia.trim().toUpperCase(),
    ciudad: ciudad.trim().toUpperCase(),
    parroquia: parroquia.trim().toUpperCase(),
    telefono: telefono.trim(),
    email: email.trim(),
    codigoEstablecimiento: codigoEstablecimiento.trim(),
    puntoEmision: puntoEmision.trim(),
    secuencialFactura: (secuencialFactura.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9),
    secuencialNotaVenta: (secuencialNotaVenta.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9),
    regimenTributario,
    obligadoContabilidad,
    agenteRetencion,
    contribuyenteEspecial: contribuyenteEspecial.trim() || undefined,
    ambiente,
    sriApiUrl: sriApiUrl.trim() || DEFAULT_SRI_API_URL,
    logoUrl: logoUrl.trim() || undefined,
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
    pais,
    provincia,
    ciudad,
    parroquia,
    telefono,
    email,
    codigoEstablecimiento,
    puntoEmision,
    secuencialFactura,
    secuencialNotaVenta,
    regimenTributario,
    obligadoContabilidad,
    agenteRetencion,
    contribuyenteEspecial,
    ambiente,
    sriApiUrl,
    logoUrl,
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

  // Carga y procesamiento del logotipo de la empresa
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, JPEG, WEBP o SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2 MB para garantizar una impresión rápida y nítida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setLogoUrl(base64Data);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRestoreDefaultLogo = () => {
    const defaultSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80"><rect width="240" height="80" rx="12" fill="%23111115"/><text x="120" y="38" font-family="Arial,sans-serif" font-weight="900" font-size="20" fill="%23FF3366" text-anchor="middle" letter-spacing="2">DEVOLUTION INK</text><text x="120" y="58" font-family="Arial,sans-serif" font-weight="700" font-size="9" fill="%23A3A3A3" text-anchor="middle" letter-spacing="4">TATTOO STUDIO · QUITO</text></svg>`;
    setLogoUrl(defaultSvg);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  // Guardar configuración completa
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateSettings({
      // Compatibilidad con campos previos de StudioSettings
      studioName: nombreComercial.trim() || settings.studioName,
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
      logoUrl: logoUrl.trim() || undefined,

      // Campos oficiales de CompanyConfig (SRI Ecuador)
      ruc: ruc.trim(),
      razonSocial: razonSocial.trim(),
      nombreComercial: nombreComercial.trim(),
      dirMatriz: dirMatriz.trim(),
      dirEstablecimiento: dirEstablecimiento.trim(),
      pais: pais.trim().toUpperCase() || 'ECUADOR',
      provincia: provincia.trim().toUpperCase() || 'PICHINCHA',
      ciudad: ciudad.trim().toUpperCase() || 'QUITO',
      parroquia: parroquia.trim().toUpperCase() || 'IÑAQUITO',
      telefono: telefono.trim(),
      codigoEstablecimiento: (codigoEstablecimiento.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3),
      puntoEmision: (puntoEmision.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3),
      secuencialFactura: (secuencialFactura.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9),
      secuencialNotaVenta: (secuencialNotaVenta.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9),
      regimenTributario,
      obligadoContabilidad,
      agenteRetencion,
      contribuyenteEspecial: contribuyenteEspecial.trim() || undefined,
      ambiente,
      sriApiUrl: sriApiUrl.trim() || DEFAULT_SRI_API_URL,
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
          <span>1. Datos Fiscales & Logo</span>
          {logoUrl && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          )}
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
          <span>2. Establecimiento, Ubicación & Secuencial</span>
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

            {/* SECCIÓN OFICIAL DE LOGO DE LA EMPRESA */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#272730] flex flex-col md:flex-row items-center gap-5 shadow-inner">
              {/* Preview Box */}
              <div className="relative group shrink-0">
                <div className="w-44 h-28 rounded-xl border border-[#2B2B36] bg-[#18181D] flex items-center justify-center p-3 overflow-hidden shadow-inner relative">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo de la Empresa"
                      className="max-h-full max-w-full object-contain transition-all group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-center p-2 flex flex-col items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-neutral-500 mb-1" />
                      <span className="text-[10px] text-neutral-400 font-semibold block">Sin Logo</span>
                      <span className="text-[9px] text-neutral-600 block mt-0.5">Sube PNG, JPG o SVG</span>
                    </div>
                  )}
                </div>
                {logoUrl && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-md shadow-emerald-500/30 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>Activo</span>
                  </span>
                )}
              </div>

              {/* Controls & Description */}
              <div className="flex-1 space-y-2.5 text-xs text-neutral-300 w-full">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#FF3366]" />
                      <span>Logotipo de la Empresa / Estudio</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      Impresión Facturas & Tickets POS
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                    Este logotipo aparecerá automáticamente en la cabecera de las <strong>Facturas Oficiales A4 (RIDE SRI Ecuador)</strong>, en los <strong>Tickets Térmicos POS (80mm)</strong>, en las Cotizaciones / Proformas y reportes contables.
                  </p>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoFileUpload}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white font-bold transition-all shadow-md shadow-[#FF3366]/20 cursor-pointer text-xs"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{logoUrl ? 'Cambiar Logotipo' : 'Subir Logotipo'}</span>
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition-all cursor-pointer text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRestoreDefaultLogo}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18181D] hover:bg-[#222228] text-neutral-300 hover:text-white border border-[#282832] font-medium transition-all cursor-pointer text-xs"
                    title="Cargar insignia oficial vectorial de Devolution Ink"
                  >
                    <span>Emblema Oficial Devolution</span>
                  </button>
                </div>

                {/* Input de URL externa opcional */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-neutral-400 shrink-0 font-medium">O pegar URL de imagen:</span>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/logo-estudio.png"
                    className="flex-1 bg-[#101014] border border-[#26262F] focus:border-[#FF3366] rounded-lg px-2.5 py-1 text-[11px] text-white font-mono placeholder-neutral-600 outline-none"
                  />
                </div>
              </div>
            </div>

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

              {/* URL de la API Java de facturación electrónica */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  URL de la API de Facturación Electrónica (Java)
                </label>
                <input
                  type="url"
                  value={sriApiUrl}
                  onChange={e => setSriApiUrl(e.target.value)}
                  placeholder={DEFAULT_SRI_API_URL}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60 font-mono"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Servidor API-SRI que firma (XAdES-BES) y envía los comprobantes al SRI. Por defecto {DEFAULT_SRI_API_URL}.
                </p>
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
          <div className="space-y-6">
            {/* SECCIÓN 1: UBICACIÓN GEOGRÁFICA Y JURISDICCIÓN TERRITORIAL */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24242A] pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#FF3366]" />
                    <span>Ubicación Geográfica del Establecimiento</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Jurisdicción cantonal y provincial requerida para la emisión de comprobantes, RIDE A4 y tickets térmicos SRI.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FF3366]/15 border border-[#FF3366]/30 text-[#FF3366]">
                  Ecuador · SRI Requerido
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* País */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    País *
                  </label>
                  <input
                    type="text"
                    required
                    value={pais}
                    onChange={e => setPais(e.target.value.toUpperCase())}
                    placeholder="ECUADOR"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-semibold focus:border-[#FF3366]/60 uppercase tracking-wide"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    País de jurisdicción fiscal
                  </span>
                </div>

                {/* Provincia */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Provincia *
                  </label>
                  <input
                    type="text"
                    required
                    value={provincia}
                    onChange={e => setProvincia(e.target.value.toUpperCase())}
                    placeholder="PICHINCHA"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-semibold focus:border-[#FF3366]/60 uppercase tracking-wide"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Provincia según catastro RUC
                  </span>
                </div>

                {/* Ciudad / Cantón */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Ciudad / Cantón *
                  </label>
                  <input
                    type="text"
                    required
                    value={ciudad}
                    onChange={e => setCiudad(e.target.value.toUpperCase())}
                    placeholder="QUITO"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-semibold focus:border-[#FF3366]/60 uppercase tracking-wide"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Ciudad donde opera el estudio
                  </span>
                </div>

                {/* Parroquia */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Parroquia
                  </label>
                  <input
                    type="text"
                    value={parroquia}
                    onChange={e => setParroquia(e.target.value.toUpperCase())}
                    placeholder="IÑAQUITO"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-semibold focus:border-[#FF3366]/60 uppercase tracking-wide"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Parroquia urbana o rural
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DOMICILIO FISCAL Y CANALES DE CONTACTO */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
              <div className="border-b border-[#24242A] pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#FF3366]" />
                  <span>Domicilio Fiscal y Canales de Notificación</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Direcciones físicas exactas impresas en la cabecera de las facturas electrónicas y tickets POS.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Dirección Matriz */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Dirección Matriz (Según RUC SRI) *
                  </label>
                  <input
                    type="text"
                    required
                    value={dirMatriz}
                    onChange={e => setDirMatriz(e.target.value)}
                    placeholder="Av. Naciones Unidas y Av. 6 de Diciembre, C.C. Quicentro Shopping, Quito, Ecuador"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Dirección fiscal principal registrada ante el Servicio de Rentas Internas
                  </span>
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
                    placeholder="C.C. Quicentro Shopping, Local 214, Av. Naciones Unidas, Quito, Ecuador"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Ubicación física del estudio donde se presta el servicio y se entrega el ticket
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
                    Correo Electrónico (Notificaciones Comprobantes) *
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

            {/* SECCIÓN 3: SERIE Y NUMERACIÓN SECUENCIAL DE COMPROBANTES SRI */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24242A] pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[#FF3366]" />
                    <span>Serie y Numeración Secuencial de Facturación SRI</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Estructura oficial del comprobante: [Establecimiento: 3 dígitos] - [Punto Emisión: 3 dígitos] - [Secuencial: 9 dígitos].
                  </p>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono">
                  Formato: 001-001-000000001
                </span>
              </div>

              {/* Live Preview de la Próxima Factura */}
              <div className="p-4 rounded-xl bg-[#121215] border border-[#2B2B36] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-center md:justify-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF3366]" />
                    <span>Vista Previa de la Serie & Próxima Factura Oficial</span>
                  </span>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 font-mono">
                    <div className="px-3 py-1.5 rounded-lg bg-[#18181D] border border-neutral-700 text-center">
                      <span className="text-[9px] text-neutral-400 block uppercase font-sans">Establecimiento</span>
                      <span className="text-sm font-bold text-white">
                        {(codigoEstablecimiento.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3)}
                      </span>
                    </div>
                    <span className="text-neutral-500 font-bold text-lg">-</span>
                    <div className="px-3 py-1.5 rounded-lg bg-[#18181D] border border-neutral-700 text-center">
                      <span className="text-[9px] text-neutral-400 block uppercase font-sans">Pto. Emisión</span>
                      <span className="text-sm font-bold text-white">
                        {(puntoEmision.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3)}
                      </span>
                    </div>
                    <span className="text-neutral-500 font-bold text-lg">-</span>
                    <div className="px-4 py-1.5 rounded-lg bg-[#FF3366]/15 border border-[#FF3366]/40 text-center">
                      <span className="text-[9px] text-[#FF3366] block uppercase font-sans font-bold">Secuencial Activo</span>
                      <span className="text-base font-extrabold text-[#FF3366]">
                        {(secuencialFactura.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center md:text-right text-[11px] text-neutral-400 max-w-xs leading-relaxed bg-[#18181D] p-3 rounded-xl border border-[#24242C]">
                  <p>
                    <strong className="text-emerald-400">Próxima Factura:</strong>{' '}
                    <span className="font-mono font-bold text-white">
                      {(codigoEstablecimiento.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3)}-
                      {(puntoEmision.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3)}-
                      {(secuencialFactura.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9)}
                    </span>
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Cada vez que se emita una factura en el POS, el correlativo avanzará automáticamente +1.
                  </p>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Código Establecimiento */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Establecimiento (3 dígitos) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={codigoEstablecimiento}
                    onChange={e => setCodigoEstablecimiento(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    onBlur={() => setCodigoEstablecimiento(prev => (prev.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3))}
                    placeholder="001"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Primer bloque de la serie (ej. <strong>001</strong>)
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
                    onChange={e => setPuntoEmision(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    onBlur={() => setPuntoEmision(prev => (prev.replace(/\D/g, '') || '1').padStart(3, '0').slice(-3))}
                    placeholder="001"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Segundo bloque de la serie (ej. <strong>001</strong>)
                  </span>
                </div>

                {/* Secuencial Factura */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-neutral-300">
                      Secuencial Factura (9 dígitos) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setSecuencialFactura('000000001')}
                      className="text-[10px] text-[#FF3366] hover:underline font-mono"
                      title="Reiniciar a 000000001"
                    >
                      Reset 001
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    value={secuencialFactura}
                    onChange={e => setSecuencialFactura(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onBlur={() => setSecuencialFactura(prev => (prev.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9))}
                    placeholder="000000001"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-[#FF3366] font-mono focus:border-[#FF3366] text-center text-sm font-extrabold tracking-wider shadow-inner"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    9 dígitos numéricos: ej. <strong>000000001</strong>
                  </span>
                </div>

                {/* Secuencial Nota de Venta */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-neutral-300">
                      Secuencial Nota Venta (9 dígitos)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSecuencialNotaVenta('000000001')}
                      className="text-[10px] text-neutral-400 hover:text-white font-mono"
                      title="Reiniciar a 000000001"
                    >
                      Reset 001
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={9}
                    value={secuencialNotaVenta}
                    onChange={e => setSecuencialNotaVenta(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onBlur={() => setSecuencialNotaVenta(prev => (prev.replace(/\D/g, '') || '1').padStart(9, '0').slice(-9))}
                    placeholder="000000001"
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60 text-center text-sm font-bold"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Correlativo para notas de venta RIMPE
                  </span>
                </div>
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
                  80% para el artista / 20% retención del estudio
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
