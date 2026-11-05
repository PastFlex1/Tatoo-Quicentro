import React, { useState, useRef } from 'react';
import { escapeXml, signXml } from '../../services/sriElectronicService';
import {
  Key,
  UploadCloud,
  FileCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Lock,
  ShieldCheck,
  AlertCircle,
  FileCode,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { CompanyConfig } from '../../types';
import {
  convertFileToBase64,
  detectEcuadorianCertificateIssuer,
  ECUADOR_CERTIFIERS,
} from '../../utils/sriCalculations';
import { useAlertModal } from '../../context/AlertModalContext';
import { SearchableSelect } from '../SearchableSelect';

interface ElectronicSignatureUploaderProps {
  company: CompanyConfig;
  onChangeSignature: (signatureData: {
    firmaElectronicaBase64?: string;
    firmaElectronicaNombre?: string;
    firmaElectronicaNombreArchivo?: string;
    firmaElectronicaTamanio?: number;
    firmaElectronicaClave?: string;
    firmaElectronicaFechaCarga?: string;
    firmaElectronicaEmisor?: string;
    firmaElectronicaValida?: boolean;
  }) => void;
  compact?: boolean;
}

export const ElectronicSignatureUploader: React.FC<ElectronicSignatureUploaderProps> = ({
  company,
  onChangeSignature,
}) => {
  const { showAlert, showConfirm } = useAlertModal();
  const [isDragging, setIsDragging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBase64Text, setShowBase64Text] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Test sign modal
  const [testSignModalOpen, setTestSignModalOpen] = useState(false);
  const [testSignedXmlResult, setTestSignedXmlResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSignature = Boolean(company.firmaElectronicaBase64);

  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'p12' && ext !== 'pfx') {
      setErrorMessage(
        `Formato no soportado (.${ext}). La firma electrónica para el SRI de Ecuador debe ser un archivo en formato .P12 o .PFX (PKCS#12).`
      );
      return;
    }

    try {
      setIsProcessing(true);
      const { base64, size, name } = await convertFileToBase64(file);
      const issuer = detectEcuadorianCertificateIssuer(name);

      onChangeSignature({
        firmaElectronicaBase64: base64,
        firmaElectronicaNombre: name,
        firmaElectronicaNombreArchivo: name,
        firmaElectronicaTamanio: size,
        firmaElectronicaFechaCarga: new Date().toISOString().split('T')[0],
        firmaElectronicaEmisor: issuer,
        firmaElectronicaValida: true,
      });

      setSuccessMessage(
        `¡Firma "${name}" (${(size / 1024).toFixed(1)} KB) cargada y codificada en Base64 con éxito!`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage('Error al leer y convertir el archivo: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleCopyBase64 = () => {
    if (!company.firmaElectronicaBase64) return;
    navigator.clipboard.writeText(company.firmaElectronicaBase64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClearSignature = () => {
    showConfirm({
      title: 'Desvincular Firma Electrónica',
      message: '¿Estás seguro de que deseas desvincular el certificado digital (.p12) y su clave actual?',
      type: 'warning',
      confirmLabel: 'Sí, Desvincular',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        onChangeSignature({
          firmaElectronicaBase64: undefined,
          firmaElectronicaNombre: undefined,
          firmaElectronicaNombreArchivo: undefined,
          firmaElectronicaTamanio: undefined,
          firmaElectronicaClave: undefined,
          firmaElectronicaFechaCarga: undefined,
          firmaElectronicaEmisor: undefined,
          firmaElectronicaValida: false,
        });
        setSuccessMessage('Firma electrónica removida.');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
    });
  };

  // Prueba REAL: envía un XML de prueba a la API Java para firmarlo con el certificado cargado
  const [isTestingSign, setIsTestingSign] = useState(false);
  const handleTestXmlSign = async () => {
    if (!company.firmaElectronicaBase64) {
      showAlert({ title: 'Firma no cargada', message: 'Cargue primero el archivo .p12 / .pfx.', type: 'warning' });
      return;
    }
    if (!(company.firmaElectronicaClave || '').trim()) {
      showAlert({ title: 'Contraseña requerida', message: 'Ingrese la contraseña del certificado para probar la firma.', type: 'warning' });
      return;
    }
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">
  <infoTributaria>
    <ambiente>1</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escapeXml(company.razonSocial || 'PRUEBA')}</razonSocial>
    <ruc>${(company.ruc || '').replace(/\D/g, '')}</ruc>
  </infoTributaria>
</factura>`;
    setIsTestingSign(true);
    try {
      const signedXml = await signXml(sampleXml, company);
      setTestSignedXmlResult(signedXml);
      setTestSignModalOpen(true);
    } catch (err: any) {
      showAlert({
        title: 'No se pudo firmar',
        message: err?.message || 'La API de facturación electrónica no respondió.',
        type: 'error',
      });
    } finally {
      setIsTestingSign(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Main Upload / Management Area */}
      {!hasSignature ? (
        <div className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-[#2A2A38] hover:border-emerald-500 bg-[#121215]/60 hover:bg-emerald-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".p12,.pfx,application/x-pkcs12,application/pkcs12"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              {isProcessing ? (
                <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
              ) : (
                <UploadCloud className="w-7 h-7 text-emerald-400" />
              )}
            </div>

            <div className="space-y-1 max-w-md">
              <p className="text-sm font-bold text-white">
                Selecciona o arrastra aquí tu archivo <span className="text-emerald-400 font-mono">.p12</span> o{' '}
                <span className="text-emerald-400 font-mono">.pfx</span>
              </p>
              <p className="text-xs text-neutral-400">
                El certificado digital se almacena localmente de forma segura en Base64 para firmar facturas, compras y retenciones SRI con estándar XAdES-BES.
              </p>
            </div>

            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Explorar Archivo Digital (.p12 / .pfx)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Loaded Signature Card & Details */
        <div className="bg-[#18181D] rounded-2xl border border-emerald-500/40 p-4 sm:p-5 space-y-4 shadow-lg shadow-emerald-950/20">
          {/* Top File Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#24242A]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white font-mono">
                    {company.firmaElectronicaNombreArchivo || company.firmaElectronicaNombre || 'FIRMA_ELECTRONICA.p12'}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-md">
                    PKCS#12 (.p12) Activa
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span>
                    <strong className="text-neutral-300">Tamaño:</strong>{' '}
                    {company.firmaElectronicaTamanio
                      ? `${(company.firmaElectronicaTamanio / 1024).toFixed(1)} KB`
                      : 'N/A'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-neutral-300">Fecha Carga:</strong>{' '}
                    {company.firmaElectronicaFechaCarga || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleTestXmlSign}
                disabled={isTestingSign}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Firmar un XML de prueba con la API de facturación electrónica"
              >
                <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${isTestingSign ? 'animate-spin' : ''}`} />
                <span>{isTestingSign ? 'Firmando…' : 'Probar Firma (API)'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearSignature}
                className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Eliminar y cambiar firma"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cambiar</span>
              </button>
            </div>
          </div>

          {/* Configuration Inputs: Password & Issuer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Clave / Contraseña de la Firma */}
            <div>
              <label className="text-xs font-bold text-neutral-300 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Contraseña de la Firma Electrónica:</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-normal">Requerida para firmar XML · por seguridad no se guarda, se pide en cada sesión</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={company.firmaElectronicaClave || ''}
                  onChange={e =>
                    onChangeSignature({
                      firmaElectronicaClave: e.target.value,
                    })
                  }
                  placeholder="Ingresa la contraseña del archivo .p12..."
                  className="w-full pl-3 pr-10 py-2 bg-[#121215] rounded-xl border border-[#272730] font-mono text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Entidad Certificadora */}
            <div>
              <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Entidad de Certificación (Ecuador):</span>
              </label>
              <SearchableSelect
                value={company.firmaElectronicaEmisor || ECUADOR_CERTIFIERS[0]}
                onChange={(val) =>
                  onChangeSignature({
                    firmaElectronicaEmisor: val,
                  })
                }
                options={ECUADOR_CERTIFIERS.map(c => ({
                  value: c,
                  label: c,
                }))}
              />
            </div>
          </div>

          {/* Base64 Quick Action */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCopyBase64}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer bg-[#121215] hover:bg-[#202027] text-neutral-300 border border-[#272730] hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Cadena Base64'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBase64Text(!showBase64Text)}
              className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
            >
              {showBase64Text ? 'Ocultar código Base64' : 'Ver código Base64'}
            </button>
          </div>

          {showBase64Text && (
            <textarea
              readOnly
              rows={3}
              value={company.firmaElectronicaBase64}
              className="w-full p-2.5 bg-[#121215] border border-[#272730] rounded-xl font-mono text-[10px] text-emerald-400 break-all select-all focus:outline-none"
            />
          )}
        </div>
      )}

      {/* MODAL: resultado de la prueba de firma con la API */}
      {testSignModalOpen && testSignedXmlResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18181D] border border-[#272730] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">
                  Firma XAdES-BES realizada por la API correctamente
                </h3>
              </div>
              <button
                onClick={() => setTestSignModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold">
                    La API firmó el XML de prueba con tu certificado .p12 y la contraseña ingresada.
                  </p>
                  <p className="text-[11px] text-emerald-300/80">
                    Este XML es solo una prueba de firma; no se envió al SRI.
                  </p>
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-300 block mb-1">
                  XML Firmado (Resultado XAdES-BES):
                </label>
                <pre className="p-3 bg-[#121215] text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto max-h-72 border border-[#272730]">
                  {testSignedXmlResult}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-[#141418] border-t border-[#24242A] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(testSignedXmlResult);
                  showAlert({
                    title: 'Copiado',
                    message: '¡XML firmado conforme a XAdES-BES copiado exitosamente al portapapeles!',
                    type: 'success',
                  });
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar XML Firmado</span>
              </button>
              <button
                type="button"
                onClick={() => setTestSignModalOpen(false)}
                className="px-4 py-2 bg-[#272730] hover:bg-[#343440] text-neutral-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

