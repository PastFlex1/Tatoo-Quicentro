import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Receipt,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Printer,
  Tag,
  AlertTriangle,
  HeartPulse,
  Download,
  Eye,
  FileCheck,
  Building2,
  RefreshCw,
  CheckCircle2,
  Share2,
  FileText,
  DollarSign,
  UserCheck,
  Camera,
  Image as ImageIcon,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Appointment, ClientProfile, ProcedureConsentRecord, SaleRecord, ServiceCategory } from '../../types';
import { consultarIdentificacion } from '../../services/sriService';
import { validarIdentificacionEcuador } from '../../utils/ecuadorIdValidator';

interface ClientsViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
  onSelectClientForPos?: (client: ClientProfile) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onOpenReceipt, onSelectClientForPos }) => {
  const {
    clients,
    sales,
    appointments,
    galleryPhotos,
    artists,
    settings,
    addGalleryPhoto,
    formatMoney,
    addClient,
    updateClient,
    deleteClient,
    updateSale,
    updateAppointment,
    setActiveTab,
  } = useStudio();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [consentFilter, setConsentFilter] = useState<'all' | 'signed' | 'pending'>('all');

  // Modal 1: Visualizar Historial Completo del Cliente
  const [viewHistoryClient, setViewHistoryClient] = useState<ClientProfile | null>(null);
  const [historyTab, setHistoryTab] = useState<'sales' | 'appointments' | 'medical' | 'gallery'>('sales');
  const [isClientPhotoUploadOpen, setIsClientPhotoUploadOpen] = useState(false);
  const [clientPhotoTitle, setClientPhotoTitle] = useState('');
  const [clientPhotoCategory, setClientPhotoCategory] = useState<'tattoo' | 'piercing' | 'healed' | 'flash' | 'coverup'>('tattoo');
  const [clientPhotoArtistId, setClientPhotoArtistId] = useState('');
  const [clientPhotoPlacement, setClientPhotoPlacement] = useState('');
  const [clientPhotoStyle, setClientPhotoStyle] = useState('');
  const [clientPhotoIsHealed, setClientPhotoIsHealed] = useState(false);
  const [clientPhotoImagePreview, setClientPhotoImagePreview] = useState('');
  const [clientPhotoUrl, setClientPhotoUrl] = useState('');
  const clientPhotoFileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Consentimientos Firmados por Procedimiento (Subir y Visualizar)
  const [isConsentUploadModalOpen, setIsConsentUploadModalOpen] = useState(false);
  const [consentProcedureType, setConsentProcedureType] = useState<'sale' | 'appointment' | 'manual'>('sale');
  const [consentProcedureRefId, setConsentProcedureRefId] = useState<string>('');
  const [consentInvoiceOrRef, setConsentInvoiceOrRef] = useState<string>('');
  const [consentServiceName, setConsentServiceName] = useState<string>('');
  const [consentServiceCategory, setConsentServiceCategory] = useState<ServiceCategory>('tattoo');
  const [consentArtistName, setConsentArtistName] = useState<string>('');
  const [consentDate, setConsentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [consentBodyPlacement, setConsentBodyPlacement] = useState<string>('');
  const [consentNotes, setConsentNotes] = useState<string>('');
  const [consentFileDataUrl, setConsentFileDataUrl] = useState<string>('');
  const [consentFileName, setConsentFileName] = useState<string>('');
  const consentFileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Visualización / Impresión de Consentimiento Firmado
  const [viewingProcedureConsent, setViewingProcedureConsent] = useState<ProcedureConsentRecord | null>(null);

  // Modal 2: Crear / Editar Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDni, setFormDni] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formBloodType, setFormBloodType] = useState('');
  const [formAllergies, setFormAllergies] = useState('');
  const [formMedicalConditions, setFormMedicalConditions] = useState('');
  const [formSkinNotes, setFormSkinNotes] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formConsent, setFormConsent] = useState(true);
  const [formTags, setFormTags] = useState('Frecuente');

  // SRI Metadata in Form
  const [formTradeName, setFormTradeName] = useState('');
  const [formRegimen, setFormRegimen] = useState('');
  const [formTaxpayerType, setFormTaxpayerType] = useState('');
  const [formSriStatus, setFormSriStatus] = useState('');
  const [formSriVerified, setFormSriVerified] = useState(false);
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [sriMessage, setSriMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewHistoryClient(null);
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Unified dynamic clients list (includes registered clients + discovers client names in sales & appointments)
  const unifiedClients = useMemo(() => {
    const list: ClientProfile[] = [...clients];

    sales.forEach(s => {
      if (!s.clientName) return;
      const clean = s.clientName.trim();
      const exists = list.some(c => c.name.toLowerCase() === clean.toLowerCase());
      if (!exists) {
        list.push({
          id: `cli-dyn-${s.id}`,
          name: clean,
          phone: s.clientPhone,
          dni: s.clientDni,
          consentSigned: s.consentFormSigned,
          tags: ['Cliente POS'],
          createdAt: s.date,
        });
      }
    });

    appointments.forEach(a => {
      if (!a.clientName) return;
      const clean = a.clientName.trim();
      const exists = list.some(c => c.name.toLowerCase() === clean.toLowerCase());
      if (!exists) {
        list.push({
          id: `cli-dyn-${a.id}`,
          name: clean,
          phone: a.clientPhone,
          email: a.clientEmail,
          instagram: a.clientInstagram,
          consentSigned: a.consentSigned,
          tags: ['Agenda'],
          createdAt: a.createdAt,
        });
      }
    });

    return list;
  }, [clients, sales, appointments]);

  // Compute metrics for each client
  const clientsWithMetrics = useMemo(() => {
    return unifiedClients.map(client => {
      const clientNameNorm = client.name.trim().toLowerCase();

      // Matched sales
      const clientSales = sales
        .filter(s => {
          const nameMatch = s.clientName && s.clientName.trim().toLowerCase() === clientNameNorm;
          const phoneMatch = client.phone && s.clientPhone && s.clientPhone === client.phone;
          const dniMatch = client.dni && s.clientDni && s.clientDni.toLowerCase() === client.dni.toLowerCase();
          return nameMatch || phoneMatch || dniMatch;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Matched appointments
      const clientAppointments = appointments
        .filter(a => {
          const nameMatch = a.clientName && a.clientName.trim().toLowerCase() === clientNameNorm;
          const phoneMatch = client.phone && a.clientPhone && a.clientPhone === client.phone;
          return nameMatch || phoneMatch;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalSpent = clientSales.reduce(
        (acc, s) => acc + (s.status !== 'cancelled' ? s.total : 0),
        0
      );
      const totalVisits = clientSales.length;
      const totalHours = clientSales.reduce((acc, s) => acc + (s.hours || 0), 0);
      const lastVisitDate = clientSales[0]?.date || clientAppointments[0]?.date || client.createdAt || null;

      // Fav artist
      const artistCounts: { [name: string]: number } = {};
      clientSales.forEach(s => {
        if (s.artistName) artistCounts[s.artistName] = (artistCounts[s.artistName] || 0) + 1;
      });
      clientAppointments.forEach(a => {
        if (a.artistName) artistCounts[a.artistName] = (artistCounts[a.artistName] || 0) + 1;
      });

      let favArtist = 'Sin registro';
      let maxC = 0;
      Object.entries(artistCounts).forEach(([aName, c]) => {
        if (c > maxC) {
          maxC = c;
          favArtist = aName;
        }
      });

      return {
        client,
        clientSales,
        clientAppointments,
        totalSpent,
        totalVisits,
        totalHours,
        lastVisitDate,
        favArtist,
      };
    });
  }, [unifiedClients, sales, appointments]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clientsWithMetrics.filter(({ client }) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        client.name.toLowerCase().includes(q) ||
        (client.phone && client.phone.toLowerCase().includes(q)) ||
        (client.dni && client.dni.toLowerCase().includes(q)) ||
        (client.email && client.email.toLowerCase().includes(q)) ||
        (client.instagram && client.instagram.toLowerCase().includes(q));

      const matchesTag =
        selectedTagFilter === 'all' ||
        (client.tags && client.tags.some(t => t.toLowerCase() === selectedTagFilter.toLowerCase()));

      const matchesConsent =
        consentFilter === 'all' ||
        (consentFilter === 'signed' ? client.consentSigned : !client.consentSigned);

      return matchesSearch && matchesTag && matchesConsent;
    });
  }, [clientsWithMetrics, searchTerm, selectedTagFilter, consentFilter]);

  // Overall KPIs
  const totalClientsCount = unifiedClients.length;
  const totalStudioRevenue = clientsWithMetrics.reduce((acc, c) => acc + c.totalSpent, 0);
  const signedConsentCount = unifiedClients.filter(c => c.consentSigned).length;
  const sriVerifiedCount = unifiedClients.filter(c => c.sriVerified).length;

  // Handlers
  const handleOpenAddModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormDni('');
    setFormInstagram('');
    setFormBirthDate('');
    setFormBloodType('');
    setFormAllergies('');
    setFormMedicalConditions('');
    setFormSkinNotes('');
    setFormEmergencyContact('');
    setFormNotes('');
    setFormConsent(true);
    setFormTags('Nuevo');
    setFormTradeName('');
    setFormRegimen('');
    setFormTaxpayerType('');
    setFormSriStatus('');
    setFormSriVerified(false);
    setSriMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: ClientProfile) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone || '');
    setFormEmail(client.email || '');
    setFormDni(client.dni || '');
    setFormInstagram(client.instagram || '');
    setFormBirthDate(client.birthDate || '');
    setFormBloodType(client.bloodType || '');
    setFormAllergies(client.allergies || '');
    setFormMedicalConditions(client.medicalConditions || '');
    setFormSkinNotes(client.skinNotes || '');
    setFormEmergencyContact(client.emergencyContact || '');
    setFormNotes(client.notes || '');
    setFormConsent(client.consentSigned);
    setFormTags(client.tags?.join(', ') || 'Frecuente');
    setFormTradeName(client.tradeName || '');
    setFormRegimen(client.taxpayerRegime || '');
    setFormTaxpayerType(client.taxpayerType || '');
    setFormSriStatus(client.sriStatus || '');
    setFormSriVerified(client.sriVerified || false);
    setSriMessage(null);
    setIsModalOpen(true);
  };

  const handleDeleteClient = (client: ClientProfile) => {
    if (confirm(`¿Eliminar la ficha del cliente "${client.name}"? Los comprobantes y ventas previas se conservarán.`)) {
      deleteClient(client.id);
      if (viewHistoryClient?.id === client.id) {
        setViewHistoryClient(null);
      }
    }
  };

  // Real-time lookup with SRI / Registro Civil
  const handleLookupSri = async (dniValue?: string) => {
    const targetDni = (dniValue || formDni || '').trim();
    if (!targetDni) {
      setSriMessage({ text: 'Ingresa un número de cédula o RUC para consultar.', type: 'warning' });
      return;
    }

    setIsSearchingSri(true);
    setSriMessage(null);

    try {
      const res = await consultarIdentificacion(targetDni);
      if (res.found && res.nombre) {
        setFormName(res.nombre);
        if (res.nombreComercial) {
          setFormTradeName(res.nombreComercial);
        }
        if (res.regimen) {
          setFormRegimen(res.regimen);
        }
        if (res.tipoPersona || res.tipoContribuyente) {
          setFormTaxpayerType(res.tipoPersona || res.tipoContribuyente || '');
        }
        setFormSriStatus(res.estado || 'ACTIVO');
        setFormSriVerified(true);

        const sourceLabel =
          res.source === 'SRI_CATASTRO'
            ? 'Catastro SRI'
            : res.source === 'SRI_PERSONA'
            ? 'Persona SRI'
            : res.source === 'REGISTRO_CIVIL'
            ? 'Registro Civil'
            : 'SRI Móvil';

        setSriMessage({
          text: `✓ Identificación verificada (${sourceLabel}): ${res.nombre}${
            res.regimen ? ` • Régimen ${res.regimen}` : ''
          }`,
          type: 'success',
        });
      } else {
        setSriMessage({
          text: res.error || 'No se encontraron registros en el SRI ni Registro Civil para esta identificación.',
          type: 'error',
        });
      }
    } catch {
      setSriMessage({
        text: 'Error de conexión al consultar los servicios tributarios del SRI.',
        type: 'error',
      });
    } finally {
      setIsSearchingSri(false);
    }
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const parsedTags = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const clientData = {
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      dni: formDni.trim() || undefined,
      instagram: formInstagram.trim() || undefined,
      birthDate: formBirthDate || undefined,
      bloodType: formBloodType || undefined,
      allergies: formAllergies.trim() || undefined,
      medicalConditions: formMedicalConditions.trim() || undefined,
      skinNotes: formSkinNotes.trim() || undefined,
      emergencyContact: formEmergencyContact.trim() || undefined,
      notes: formNotes.trim() || undefined,
      consentSigned: formConsent,
      tags: parsedTags.length > 0 ? parsedTags : ['Frecuente'],
      tradeName: formTradeName.trim() || undefined,
      taxpayerRegime: formRegimen.trim() || undefined,
      taxpayerType: formTaxpayerType.trim() || undefined,
      sriStatus: formSriStatus || undefined,
      sriVerified: formSriVerified,
    };

    if (editingClient) {
      updateClient(editingClient.id, clientData);
    } else {
      addClient(clientData);
    }

    setIsModalOpen(false);
  };

  const handleCobrarEnPos = (client: ClientProfile) => {
    if (onSelectClientForPos) {
      onSelectClientForPos(client);
    }
    setActiveTab('pos');
  };

  const handleExportClientDossier = (client: ClientProfile, clientSales: SaleRecord[]) => {
    const lines = [
      `"EXPEDIENTE CLÍNICO & HISTORIAL DE CLIENTE - ${client.name.toUpperCase()}"`,
      `"Generado: ${new Date().toLocaleString('es-EC')}"`,
      `"Teléfono: ${client.phone || 'N/A'}"`,
      `"Cédula / RUC / Pasaporte: ${client.dni || 'N/A'}"`,
      `"Email: ${client.email || 'N/A'}"`,
      `"Instagram: ${client.instagram || 'N/A'}"`,
      `"Ficha Consentimiento Firmada: ${client.consentSigned ? 'SÍ' : 'NO'}"`,
      `"Alergias: ${client.allergies || 'Ninguna registrada'}"`,
      `"Condiciones Médicas: ${client.medicalConditions || 'Ninguna'}"`,
      `"Notas de Piel: ${client.skinNotes || 'N/A'}"`,
      '""',
      '"HISTORIAL DE FACTURAS Y SERVICIOS"',
      '"Factura","Fecha","Servicio","Artista","Total Pagado","Método Pago"',
      ...clientSales.map(
        s =>
          `"${s.invoiceNumber}","${s.date}","${s.serviceName.replace(/"/g, '""')}","${s.artistName}","${s.total.toFixed(2)}","${s.paymentMethod}"`
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expediente_${client.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppChat = (client: ClientProfile) => {
    const cleanPhone = (client.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${client.name}! Te saludamos de Devolution Ink Tattoo Studio.`);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  // =========================================================================
  // HANDLERS DE CONSENTIMIENTO FIRMADO POR PROCEDIMIENTO
  // =========================================================================
  const generateOfficialSignedConsentSvg = (params: {
    clientName: string;
    clientDni?: string;
    clientPhone?: string;
    serviceName: string;
    artistName: string;
    date: string;
    bodyPlacement?: string;
    invoiceOrRef?: string;
    allergies?: string;
    notes?: string;
  }) => {
    const studioTitle = (settings.studioName || 'DEVOLUTION INK TATTOO STUDIO').replace(/&/g, '&amp;');
    const cName = params.clientName.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const sName = params.serviceName.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const aName = params.artistName.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const zone = (params.bodyPlacement || 'Zona acordada en cabina').replace(/&/g, '&amp;');
    const ref = (params.invoiceOrRef || 'PROC-' + Date.now().toString().slice(-5)).replace(/&/g, '&amp;');
    const allergyTxt = (params.allergies || 'Ninguna alergia declarada').replace(/&/g, '&amp;');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1020" viewBox="0 0 800 1020">
      <rect width="800" height="1020" fill="#ffffff"/>
      <rect x="24" y="24" width="752" height="972" rx="14" fill="#ffffff" stroke="#18181D" stroke-width="2.5"/>
      <rect x="24" y="24" width="752" height="105" rx="14" fill="#141418"/>
      <text x="55" y="68" fill="#FF3366" font-family="Arial, sans-serif" font-size="22" font-weight="bold">${studioTitle}</text>
      <text x="55" y="94" fill="#E4E4E7" font-family="Arial, sans-serif" font-size="13" font-weight="bold">CONSENTIMIENTO INFORMADO &amp; FICHA DE BIOSEGURIDAD POR PROCEDIMIENTO</text>
      <text x="55" y="114" fill="#A1A1AA" font-family="Arial, sans-serif" font-size="11">Normativa Sanitaria ARCSA / MSP Ecuador • Ref: ${ref}</text>

      <rect x="55" y="152" width="690" height="135" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="72" y="178" fill="#0F172A" font-family="Arial, sans-serif" font-size="13" font-weight="bold">1. DATOS DEL PACIENTE / CLIENTE</text>
      <text x="72" y="204" fill="#334155" font-family="Arial, sans-serif" font-size="12">Nombre Completo: <tspan font-weight="bold" fill="#0F172A">${cName}</tspan></text>
      <text x="450" y="204" fill="#334155" font-family="Arial, sans-serif" font-size="12">Cédula / RUC / ID: <tspan font-weight="bold" fill="#0F172A">${params.clientDni || 'Registrado'}</tspan></text>
      <text x="72" y="232" fill="#334155" font-family="Arial, sans-serif" font-size="12">Teléfono: <tspan font-weight="bold" fill="#0F172A">${params.clientPhone || 'Registrado'}</tspan></text>
      <text x="450" y="232" fill="#334155" font-family="Arial, sans-serif" font-size="12">Fecha Procedimiento: <tspan font-weight="bold" fill="#0F172A">${params.date}</tspan></text>
      <text x="72" y="260" fill="#334155" font-family="Arial, sans-serif" font-size="12">Alergias / Condición Médica: <tspan font-weight="bold" fill="#B45309">${allergyTxt}</tspan></text>

      <rect x="55" y="305" width="690" height="120" rx="8" fill="#FFF1F2" stroke="#FECDD3" stroke-width="1.2"/>
      <text x="72" y="331" fill="#881337" font-family="Arial, sans-serif" font-size="13" font-weight="bold">2. DETALLE ESPECÍFICO DEL PROCEDIMIENTO AUTORIZADO</text>
      <text x="72" y="358" fill="#1E293B" font-family="Arial, sans-serif" font-size="12">Procedimiento / Trabajo: <tspan font-weight="bold" fill="#0F172A">${sName}</tspan></text>
      <text x="72" y="384" fill="#1E293B" font-family="Arial, sans-serif" font-size="12">Artista / Especialista Asignado: <tspan font-weight="bold" fill="#0F172A">${aName}</tspan></text>
      <text x="450" y="384" fill="#1E293B" font-family="Arial, sans-serif" font-size="12">Zona Corporal: <tspan font-weight="bold" fill="#0F172A">${zone}</tspan></text>
      <text x="72" y="408" fill="#475569" font-family="Arial, sans-serif" font-size="11">Materiales: Agujas/cartuchos estériles de uso único abiertos en presencia del cliente y pigmentos/joyería grado implante.</text>

      <text x="55" y="458" fill="#0F172A" font-family="Arial, sans-serif" font-size="13" font-weight="bold">3. DECLARACIÓN Y AUTORIZACIÓN DEL CLIENTE</text>
      <text x="55" y="484" fill="#334155" font-family="Arial, sans-serif" font-size="11.5">• Declaro ser mayor de edad y acudir libre y voluntariamente para la realización del procedimiento descrito.</text>
      <text x="55" y="508" fill="#334155" font-family="Arial, sans-serif" font-size="11.5">• Confirmo que he verificado el sellado estéril de agujas, cartuchos, joyería e insumos descartables en cabina.</text>
      <text x="55" y="532" fill="#334155" font-family="Arial, sans-serif" font-size="11.5">• He sido informado(a) de los cuidados posteriores (Aftercare) y asumo la responsabilidad de la higiene durante la curación.</text>
      <text x="55" y="556" fill="#334155" font-family="Arial, sans-serif" font-size="11.5">• Autorizo el diseño, ubicación anatómica, tamaño y ortografía revisada previamente en el esténcil / marcaje.</text>
      <text x="55" y="580" fill="#334155" font-family="Arial, sans-serif" font-size="11.5">• Eximo al estudio y al profesional de complicaciones derivadas del incumplimiento de las instrucciones post-operatorias.</text>

      <rect x="55" y="615" width="690" height="75" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
      <text x="72" y="638" fill="#475569" font-family="Arial, sans-serif" font-size="11" font-weight="bold">Observaciones Clínicas / Lote de Bioseguridad:</text>
      <text x="72" y="662" fill="#0F172A" font-family="Arial, sans-serif" font-size="11.5">${(params.notes || 'Esténcil aprobado por el cliente. Agujas estériles verificadas en cabina. Sin novedades médicas.').replace(/&/g, '&amp;')}</text>

      <rect x="55" y="725" width="320" height="160" rx="10" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"/>
      <text x="215" y="752" text-anchor="middle" fill="#166534" font-family="Arial, sans-serif" font-size="11" font-weight="bold">FIRMA DEL CLIENTE (CONFORME)</text>
      <path d="M 115 815 Q 155 770 190 815 T 265 795 Q 295 785 320 820" fill="none" stroke="#0F172A" stroke-width="2.8" stroke-linecap="round"/>
      <line x1="85" y1="840" x2="345" y2="840" stroke="#64748B" stroke-width="1"/>
      <text x="215" y="860" text-anchor="middle" fill="#0F172A" font-family="Arial, sans-serif" font-size="11" font-weight="bold">${cName}</text>
      <text x="215" y="876" text-anchor="middle" fill="#15803D" font-family="Arial, sans-serif" font-size="9.5" font-weight="bold">✓ CONSENTIMIENTO FIRMADO Y VALIDADO</text>

      <rect x="425" y="725" width="320" height="160" rx="10" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <text x="585" y="752" text-anchor="middle" fill="#334155" font-family="Arial, sans-serif" font-size="11" font-weight="bold">PROFESIONAL / ESTUDIO RESPONSABLE</text>
      <path d="M 510 815 C 540 780, 580 830, 620 795 L 660 815" fill="none" stroke="#334155" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="455" y1="840" x2="715" y2="840" stroke="#64748B" stroke-width="1"/>
      <text x="585" y="860" text-anchor="middle" fill="#0F172A" font-family="Arial, sans-serif" font-size="11" font-weight="bold">${aName}</text>
      <text x="585" y="876" text-anchor="middle" fill="#64748B" font-family="Arial, sans-serif" font-size="9.5">Registro de Cabina • ${studioTitle}</text>

      <text x="400" y="945" text-anchor="middle" fill="#64748B" font-family="Arial, sans-serif" font-size="10">Documento digitalizado y archivado en el Expediente Clínico 360° del Cliente • Fecha de archivo: ${new Date().toLocaleString('es-EC')}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const getProcedureConsentForSale = (client: ClientProfile, sale: SaleRecord): ProcedureConsentRecord | undefined => {
    const list = client.procedureConsents || [];
    const found = list.find(
      c =>
        (c.procedureType === 'sale' && c.procedureRefId === sale.id) ||
        (c.invoiceOrRefNumber && c.invoiceOrRefNumber === sale.invoiceNumber)
    );
    if (found) return found;
    if (sale.consentDocumentUrl) {
      return {
        id: `consent-sale-${sale.id}`,
        procedureType: 'sale',
        procedureRefId: sale.id,
        invoiceOrRefNumber: sale.invoiceNumber,
        serviceName: sale.serviceName,
        serviceCategory: sale.serviceCategory,
        artistName: sale.artistName,
        date: sale.date.split('T')[0],
        fileDataUrl: sale.consentDocumentUrl,
        fileName: sale.consentFileName || `Consentimiento_${sale.invoiceNumber}.png`,
        notes: sale.notes,
        uploadedAt: sale.consentSignedAt || sale.date,
      };
    }
    return undefined;
  };

  const getProcedureConsentForAppointment = (client: ClientProfile, apt: Appointment): ProcedureConsentRecord | undefined => {
    const list = client.procedureConsents || [];
    const found = list.find(c => c.procedureType === 'appointment' && c.procedureRefId === apt.id);
    if (found) return found;
    if (apt.consentDocumentUrl) {
      return {
        id: `consent-apt-${apt.id}`,
        procedureType: 'appointment',
        procedureRefId: apt.id,
        invoiceOrRefNumber: `CITA-${apt.date}`,
        serviceName: apt.serviceName,
        serviceCategory: apt.serviceCategory,
        artistName: apt.artistName,
        date: apt.date,
        bodyPlacement: apt.bodyPlacement,
        fileDataUrl: apt.consentDocumentUrl,
        fileName: apt.consentFileName || `Consentimiento_Cita_${apt.date}.png`,
        notes: apt.notes,
        uploadedAt: apt.consentSignedAt || apt.createdAt,
      };
    }
    return undefined;
  };

  const handleOpenConsentUploadForSale = (sale: SaleRecord, existingConsent?: ProcedureConsentRecord) => {
    setConsentProcedureType('sale');
    setConsentProcedureRefId(sale.id);
    setConsentInvoiceOrRef(sale.invoiceNumber);
    setConsentServiceName(sale.serviceName);
    setConsentServiceCategory(sale.serviceCategory);
    setConsentArtistName(sale.artistName);
    setConsentDate(sale.date.split('T')[0]);
    setConsentBodyPlacement(existingConsent?.bodyPlacement || '');
    setConsentNotes(existingConsent?.notes || sale.notes || '');
    setConsentFileDataUrl(existingConsent?.fileDataUrl || '');
    setConsentFileName(existingConsent?.fileName || '');
    setIsConsentUploadModalOpen(true);
  };

  const handleOpenConsentUploadForAppointment = (apt: Appointment, existingConsent?: ProcedureConsentRecord) => {
    setConsentProcedureType('appointment');
    setConsentProcedureRefId(apt.id);
    setConsentInvoiceOrRef(`CITA-${apt.date}`);
    setConsentServiceName(apt.serviceName);
    setConsentServiceCategory(apt.serviceCategory);
    setConsentArtistName(apt.artistName);
    setConsentDate(apt.date);
    setConsentBodyPlacement(existingConsent?.bodyPlacement || apt.bodyPlacement || '');
    setConsentNotes(existingConsent?.notes || apt.notes || '');
    setConsentFileDataUrl(existingConsent?.fileDataUrl || '');
    setConsentFileName(existingConsent?.fileName || '');
    setIsConsentUploadModalOpen(true);
  };

  const handleOpenManualConsentUpload = () => {
    setConsentProcedureType('manual');
    setConsentProcedureRefId('');
    setConsentInvoiceOrRef(`PROC-${new Date().toISOString().slice(0, 10)}`);
    setConsentServiceName('Tatuaje / Procedimiento en Cabina');
    setConsentServiceCategory('tattoo');
    setConsentArtistName(artists[0]?.name || 'Artista del Estudio');
    setConsentDate(new Date().toISOString().split('T')[0]);
    setConsentBodyPlacement('');
    setConsentNotes('');
    setConsentFileDataUrl('');
    setConsentFileName('');
    setIsConsentUploadModalOpen(true);
  };

  const handleSaveUploadedConsent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewHistoryClient) return;

    const finalDataUrl =
      consentFileDataUrl ||
      generateOfficialSignedConsentSvg({
        clientName: viewHistoryClient.name,
        clientDni: viewHistoryClient.dni,
        clientPhone: viewHistoryClient.phone,
        serviceName: consentServiceName.trim() || 'Procedimiento de Estudio',
        artistName: consentArtistName.trim() || 'Artista del Estudio',
        date: consentDate,
        bodyPlacement: consentBodyPlacement.trim() || undefined,
        invoiceOrRef: consentInvoiceOrRef.trim() || undefined,
        allergies: viewHistoryClient.allergies,
        notes: consentNotes.trim() || undefined,
      });

    const finalFileName =
      consentFileName ||
      `Consentimiento_Firmado_${viewHistoryClient.name.replace(/\s+/g, '_')}_${consentDate}.svg`;

    const nowIso = new Date().toISOString();

    const newConsentRecord: ProcedureConsentRecord = {
      id: `pcons-${Date.now()}`,
      procedureType: consentProcedureType,
      procedureRefId: consentProcedureRefId || undefined,
      invoiceOrRefNumber: consentInvoiceOrRef.trim() || undefined,
      serviceName: consentServiceName.trim() || 'Procedimiento de Estudio',
      serviceCategory: consentServiceCategory,
      artistName: consentArtistName.trim() || 'Artista del Estudio',
      date: consentDate,
      bodyPlacement: consentBodyPlacement.trim() || undefined,
      fileDataUrl: finalDataUrl,
      fileName: finalFileName,
      notes: consentNotes.trim() || undefined,
      uploadedAt: nowIso,
    };

    const existingList = viewHistoryClient.procedureConsents || [];
    // Si ya había un consentimiento para el mismo procedureRefId, lo reemplazamos; si no, lo agregamos al inicio
    const filteredPrev = consentProcedureRefId
      ? existingList.filter(
          c => !(c.procedureType === consentProcedureType && c.procedureRefId === consentProcedureRefId)
        )
      : existingList;

    const updatedConsents = [newConsentRecord, ...filteredPrev];

    // Si es un cliente dinámico (cli-dyn-...), primero lo persistimos o actualizamos en la base de clientes
    const existingRegistered = clients.find(
      c =>
        c.id === viewHistoryClient.id ||
        c.name.trim().toLowerCase() === viewHistoryClient.name.trim().toLowerCase()
    );

    if (existingRegistered) {
      updateClient(existingRegistered.id, {
        consentSigned: true,
        procedureConsents: updatedConsents,
      });
      setViewHistoryClient({
        ...existingRegistered,
        consentSigned: true,
        procedureConsents: updatedConsents,
      });
    } else {
      const created = addClient({
        name: viewHistoryClient.name,
        phone: viewHistoryClient.phone,
        email: viewHistoryClient.email,
        dni: viewHistoryClient.dni,
        instagram: viewHistoryClient.instagram,
        consentSigned: true,
        procedureConsents: updatedConsents,
        tags: viewHistoryClient.tags || ['Frecuente'],
      });
      setViewHistoryClient(created);
    }

    // Si está vinculado a una Factura/Venta o a una Cita, sincronizamos también ese registro
    if (consentProcedureType === 'sale' && consentProcedureRefId) {
      updateSale(consentProcedureRefId, {
        consentFormSigned: true,
        consentDocumentUrl: finalDataUrl,
        consentFileName: finalFileName,
        consentSignedAt: nowIso,
      });
    } else if (consentProcedureType === 'appointment' && consentProcedureRefId) {
      updateAppointment(consentProcedureRefId, {
        consentSigned: true,
        consentDocumentUrl: finalDataUrl,
        consentFileName: finalFileName,
        consentSignedAt: nowIso,
      });
    }

    setIsConsentUploadModalOpen(false);
  };

  const handleDeleteProcedureConsent = (consentId: string, procedureType?: string, procedureRefId?: string) => {
    if (!viewHistoryClient) return;
    if (!confirm('¿Deseas eliminar este documento de consentimiento firmado del procedimiento?')) return;

    const updatedConsents = (viewHistoryClient.procedureConsents || []).filter(c => c.id !== consentId);
    const existingRegistered = clients.find(
      c =>
        c.id === viewHistoryClient.id ||
        c.name.trim().toLowerCase() === viewHistoryClient.name.trim().toLowerCase()
    );

    if (existingRegistered) {
      updateClient(existingRegistered.id, {
        procedureConsents: updatedConsents,
      });
    }

    if (procedureType === 'sale' && procedureRefId) {
      updateSale(procedureRefId, {
        consentDocumentUrl: undefined,
        consentFileName: undefined,
      });
    } else if (procedureType === 'appointment' && procedureRefId) {
      updateAppointment(procedureRefId, {
        consentDocumentUrl: undefined,
        consentFileName: undefined,
      });
    }

    setViewHistoryClient({
      ...viewHistoryClient,
      procedureConsents: updatedConsents,
    });
    if (viewingProcedureConsent?.id === consentId) {
      setViewingProcedureConsent(null);
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase">
              Directorio & Historial de Clientes
            </h1>
            <p className="text-[11px] text-neutral-400">
              Gestión horizontal de cartera de clientes, visualización de expediente clínico, compras históricas y acciones rápidas.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_16px_rgba(255,51,102,0.35)] active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nuevo Cliente / Ficha</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Cartera Total</span>
            <Users className="w-3.5 h-3.5 text-[#FF3366]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono">
            {totalClientsCount}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            Clientes registrados en estudio
          </div>
        </div>

        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Facturación Cartera</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
            {formatMoney(totalStudioRevenue)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            Valor acumulado en sesiones
          </div>
        </div>

        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Fichas Sanitarias</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono">
            {signedConsentCount} <span className="text-xs font-normal text-neutral-400">/ {totalClientsCount}</span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            Consentimientos al día
          </div>
        </div>

        <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Verificados SRI</span>
            <Building2 className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-neutral-200 font-mono">
            {sriVerifiedCount}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            RUC / Catastro tributario
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18181D] border border-[#272730] rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, cédula, RUC, email o Instagram..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#121215] border border-[#272730] rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter: Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'vip', label: 'VIP' },
              { id: 'frecuente', label: 'Frecuente' },
              { id: 'piercing', label: 'Piercing' },
              { id: 'nuevo', label: 'Nuevo' },
            ].map(t => {
              const isActive = selectedTagFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTagFilter(t.id)}
                  className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                      : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Quick Filter: Consent */}
          <select
            value={consentFilter}
            onChange={e => setConsentFilter(e.target.value as any)}
            className="bg-[#121215] border border-[#272730] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF3366]/60 cursor-pointer"
          >
            <option value="all">Ficha Sanitaria: Todos</option>
            <option value="signed">✓ Firmados</option>
            <option value="pending">⚠ Pendientes</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          HORIZONTAL CLIENTS TABLE (DESKTOP) + RESPONSIVE CARDS (MOBILE/TABLET)
          ========================================================================= */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden shadow-xl">
        {/* MOBILE CLIENT CARDS VIEW (Visible en pantallas < md) */}
        <div className="md:hidden divide-y divide-[#24242B]">
          {filteredClients.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              No se encontraron clientes con los criterios de búsqueda seleccionados.
            </div>
          ) : (
            filteredClients.map(({ client, totalSpent, totalVisits, favArtist }) => (
              <div key={client.id} className="p-3.5 space-y-3 hover:bg-[#1C1C22] transition-colors">
                {/* Header: Avatar, Nombre, Tags, DNI y LTV */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/40 text-[#FF3366] font-bold text-xs flex items-center justify-center shrink-0">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs truncate">{client.name}</span>
                        {client.tags?.map((t, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                              t.toLowerCase() === 'vip'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30'
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-400 font-mono">
                        {client.dni ? (
                          <span>ID: {client.dni}</span>
                        ) : (
                          <span className="text-neutral-600 italic">Sin Cédula/RUC</span>
                        )}
                        {client.sriVerified && (
                          <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            ✓ SRI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LTV & Visitas */}
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      {formatMoney(totalSpent)}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono">{totalVisits} visitas</span>
                  </div>
                </div>

                {/* Contacto & Ficha Sanitaria */}
                <div className="flex items-center justify-between text-xs gap-2 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {client.phone && (
                      <button
                        type="button"
                        onClick={() => handleWhatsAppChat(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                        title="Abrir WhatsApp"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>{client.phone}</span>
                      </button>
                    )}
                    {client.consentSigned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Ficha OK</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Sin Ficha</span>
                      </span>
                    )}
                  </div>
                  {favArtist && favArtist !== 'Sin registro' && (
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3 h-3 text-[#FF3366]" />
                      <span className="truncate max-w-[90px]">{favArtist}</span>
                    </span>
                  )}
                </div>

                {/* Alerta de Alergias */}
                {client.allergies && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate"><strong>Alergias:</strong> {client.allergies}</span>
                  </div>
                )}

                {/* Barra de Acciones Móvil */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#24242B]">
                  <button
                    type="button"
                    onClick={() => {
                      setViewHistoryClient(client);
                      setHistoryTab('sales');
                    }}
                    className="py-1.5 px-2 rounded-xl bg-[#252530] hover:bg-[#323240] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Ver expediente clínico 360°"
                  >
                    <Eye className="w-3 h-3 text-[#FF3366]" />
                    <span>Ficha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(client)}
                    className="py-1.5 px-2 rounded-xl bg-[#121215] hover:bg-[#1E1E26] text-blue-300 border border-[#272730] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Editar ficha"
                  >
                    <Edit2 className="w-3 h-3 text-blue-400" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCobrarEnPos(client)}
                    className="py-1.5 px-2 rounded-xl bg-[#FF3366]/15 hover:bg-[#FF3366]/25 text-[#FF3366] border border-[#FF3366]/30 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Cobrar en Terminal POS"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteClient(client)}
                    className="py-1.5 px-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Borrar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TABLA HORIZONTAL (Visible en pantallas >= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                <th className="py-3.5 px-4 whitespace-nowrap">Cliente / Identificación</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Contacto & Redes</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ficha Sanitaria</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Invertido</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Sesiones</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Última Visita</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Artista Habitual</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    No se encontraron clientes con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                filteredClients.map(({ client, clientSales, totalSpent, totalVisits, lastVisitDate, favArtist }) => {
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-[#1E1E25] transition-colors"
                    >
                      {/* Cliente / Identificación */}
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/40 text-[#FF3366] font-bold text-xs flex items-center justify-center shrink-0">
                            {client.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs truncate">
                                {client.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {client.dni ? (
                                <span className="font-mono text-[10px] text-neutral-400 bg-[#121215] px-1.5 py-0.2 rounded border border-[#272730]">
                                  {client.dni}
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-600 italic">Sin Cédula/RUC</span>
                              )}
                              {client.sriVerified && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                  ✓ SRI
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contacto & Redes */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {client.phone ? (
                            <div className="flex items-center gap-1.5 text-neutral-200 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-[#FF3366]" />
                              <span>{client.phone}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-600 text-[10px] italic">Sin teléfono</span>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] truncate max-w-[170px]">
                              <Mail className="w-3 h-3 text-neutral-500" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.instagram && (
                            <div className="text-[10px] text-[#FF3366] font-medium">
                              {client.instagram}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ficha Sanitaria & Alergias */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {client.consentSigned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Consentimiento Firmado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <ShieldAlert className="w-3 h-3 text-amber-400" />
                              <span>Sin Ficha Firmada</span>
                            </span>
                          )}
                          {client.allergies ? (
                            <div className="text-[10px] text-amber-300 font-medium truncate max-w-[160px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{client.allergies}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-neutral-500">Sin alergias reportadas</div>
                          )}
                        </div>
                      </td>

                      {/* Total Invertido */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <span className="font-bold text-emerald-400 text-xs block">
                          {formatMoney(totalSpent)}
                        </span>
                        <span className="text-[9px] text-neutral-500 block">LTV Acumulado</span>
                      </td>

                      {/* Sesiones Realizadas */}
                      <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                        <span className="font-bold text-white px-2 py-0.5 bg-[#121215] rounded-md border border-[#272730]">
                          {totalVisits} visitas
                        </span>
                      </td>

                      {/* Última Visita */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-neutral-300">
                        {lastVisitDate ? (
                          <div>
                            <span>
                              {new Date(lastVisitDate).toLocaleDateString('es-EC', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-600 italic">Sin registros</span>
                        )}
                      </td>

                      {/* Artista Habitual */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-neutral-300">
                          <Sparkles className="w-3 h-3 text-[#FF3366]" />
                          <span className="font-medium">{favArtist}</span>
                        </div>
                      </td>

                      {/* ACCIONES HORIZONTALES: Visualizar Historial, Editar Cliente, Eliminar */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* ACCIÓN 1: Visualizar Historial */}
                          <button
                            onClick={() => {
                              setViewHistoryClient(client);
                              setHistoryTab('sales');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-[#121215] hover:bg-[#252530] text-neutral-200 hover:text-white border border-[#272730] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Ver expediente clínico, historial de compras, citas y comprobantes"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#FF3366]" />
                            <span>Visualizar Historial</span>
                          </button>

                          {/* ACCIÓN 2: Editar Cliente */}
                          <button
                            onClick={() => handleOpenEditModal(client)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#121215] hover:bg-[#252530] text-neutral-200 hover:text-white border border-[#272730] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Editar datos, contacto y ficha del cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Editar</span>
                          </button>

                          {/* Acción complementaria: WhatsApp */}
                          <button
                            onClick={() => handleWhatsAppChat(client)}
                            className="p-1.5 rounded-xl bg-[#121215] hover:bg-emerald-600/20 text-neutral-400 hover:text-emerald-400 border border-[#272730] transition-colors cursor-pointer"
                            title="Escribir por WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Acción complementaria: Cobrar en POS */}
                          <button
                            onClick={() => handleCobrarEnPos(client)}
                            className="p-1.5 rounded-xl bg-[#121215] hover:bg-[#FF3366]/20 text-neutral-400 hover:text-[#FF3366] border border-[#272730] transition-colors cursor-pointer"
                            title="Cargar cliente en Terminal POS para cobrar"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>

                          {/* ACCIÓN 3: Eliminar */}
                          <button
                            onClick={() => handleDeleteClient(client)}
                            className="p-1.5 rounded-xl bg-[#121215] hover:bg-red-500/20 text-neutral-500 hover:text-red-400 border border-[#272730] transition-colors cursor-pointer"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: VISUALIZAR HISTORIAL COMPLETO DEL CLIENTE (DOSSIER 360°)
          ========================================================================= */}
      {viewHistoryClient && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-4xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#25252E] pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] font-bold text-base flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,51,102,0.25)]">
                  {viewHistoryClient.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{viewHistoryClient.name}</span>
                    {viewHistoryClient.tags?.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FF3366]/15 border border-[#FF3366]/30 text-[#FF3366]"
                      >
                        {t}
                      </span>
                    ))}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5 font-mono flex-wrap">
                    {viewHistoryClient.phone && (
                      <span className="flex items-center gap-1 text-neutral-300">
                        <Phone className="w-3 h-3 text-[#FF3366]" />
                        {viewHistoryClient.phone}
                      </span>
                    )}
                    {viewHistoryClient.dni && (
                      <span className="text-neutral-300">ID: {viewHistoryClient.dni}</span>
                    )}
                    {viewHistoryClient.email && (
                      <span className="text-neutral-400">{viewHistoryClient.email}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenManualConsentUpload}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Subir o generar consentimiento firmado por procedimiento para este cliente"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Subir Consentimiento Firmado</span>
                </button>
                <button
                  onClick={() => {
                    const matched = clientsWithMetrics.find(c => c.client.id === viewHistoryClient.id);
                    handleExportClientDossier(viewHistoryClient, matched ? matched.clientSales : []);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#121215] hover:bg-[#252530] text-neutral-300 hover:text-white border border-[#272730] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Exportar historial a archivo CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={() => handleCobrarEnPos(viewHistoryClient)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,51,102,0.3)] cursor-pointer"
                  title="Cobrar en terminal POS"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Cobrar en POS</span>
                </button>
                <button
                  onClick={() => setViewHistoryClient(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick KPI Strip of selected client */}
            {(() => {
              const matched = clientsWithMetrics.find(c => c.client.id === viewHistoryClient.id);
              const totalSpent = matched ? matched.totalSpent : 0;
              const totalVisits = matched ? matched.totalVisits : 0;
              const totalHours = matched ? matched.totalHours : 0;
              const favArtist = matched ? matched.favArtist : 'Sin registro';

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs shrink-0">
                  <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <span className="text-[10px] text-neutral-400 block">Total Invertido (LTV)</span>
                    <span className="font-mono font-bold text-sm text-emerald-400 block mt-0.5">
                      {formatMoney(totalSpent)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <span className="text-[10px] text-neutral-400 block">Sesiones / Visitas</span>
                    <span className="font-mono font-bold text-sm text-white block mt-0.5">
                      {totalVisits} visitas
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <span className="text-[10px] text-neutral-400 block">Horas en Cabina</span>
                    <span className="font-mono font-bold text-sm text-[#FF3366] block mt-0.5">
                      {totalHours} hrs
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <span className="text-[10px] text-neutral-400 block">Artista Frecuente</span>
                    <span className="font-bold text-xs text-white block mt-0.5 truncate">
                      {favArtist}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Sub-Tabs: Ventas, Citas, Ficha Médica */}
            <div className="flex items-center gap-2 border-b border-[#25252E] pb-2.5 shrink-0 overflow-x-auto whitespace-nowrap no-scrollbar">
              <button
                onClick={() => setHistoryTab('sales')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  historyTab === 'sales'
                    ? 'bg-[#FF3366] text-white shadow-[0_0_8px_rgba(255,51,102,0.3)]'
                    : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Facturas & Comprobantes</span>
              </button>
              <button
                onClick={() => setHistoryTab('appointments')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  historyTab === 'appointments'
                    ? 'bg-[#FF3366] text-white shadow-[0_0_8px_rgba(255,51,102,0.3)]'
                    : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Citas & Agendamiento</span>
              </button>
              <button
                onClick={() => setHistoryTab('medical')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  historyTab === 'medical'
                    ? 'bg-[#FF3366] text-white shadow-[0_0_8px_rgba(255,51,102,0.3)]'
                    : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Ficha Médica & Consentimientos ({(viewHistoryClient.procedureConsents || []).length})</span>
              </button>

              {/* Tab 4: Galería de Fotos del Cliente */}
              {(() => {
                const cPhotos = galleryPhotos.filter(
                  p => (p.clientId && p.clientId === viewHistoryClient.id) ||
                       (p.clientName && p.clientName.toLowerCase().trim() === viewHistoryClient.name.toLowerCase().trim())
                );
                return (
                  <button
                    onClick={() => setHistoryTab('gallery')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      historyTab === 'gallery'
                        ? 'bg-[#FF3366] text-white shadow-[0_0_8px_rgba(255,51,102,0.3)]'
                        : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Galería de Fotos ({cPhotos.length})</span>
                  </button>
                );
              })()}
            </div>

            {/* Tab Contents */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {historyTab === 'sales' && (
                <div className="overflow-x-auto rounded-xl border border-[#24242B]">
                  {(() => {
                    const matched = clientsWithMetrics.find(c => c.client.id === viewHistoryClient.id);
                    const sList = matched ? matched.clientSales : [];

                    if (sList.length === 0) {
                      return (
                        <div className="py-12 text-center text-xs text-neutral-500">
                          Este cliente aún no registra facturas o compras registradas en el sistema.
                        </div>
                      );
                    }

                    return (
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-[#24242B] text-neutral-400 font-medium bg-[#121215]">
                            <th className="py-2.5 px-3 whitespace-nowrap">N° Factura</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Fecha</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Procedimiento / Trabajo</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Artista</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Pagado</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Consentimiento Firmado</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Comprobante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222228]">
                          {sList.map(sale => {
                            const procConsent = getProcedureConsentForSale(viewHistoryClient, sale);
                            return (
                              <tr key={sale.id} className="hover:bg-[#1A1A22] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                                  {sale.invoiceNumber}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap text-[11px]">
                                  {new Date(sale.date).toLocaleDateString('es-EC')}
                                </td>
                                <td className="py-2.5 px-3 text-neutral-200">
                                  {sale.serviceName}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-neutral-300 whitespace-nowrap">
                                  {sale.artistName}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                  {formatMoney(sale.total)}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {procConsent ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setViewingProcedureConsent(procConsent)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                        title="Ver o imprimir el consentimiento firmado subido para este procedimiento"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Ver Firmado</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenConsentUploadForSale(sale, procConsent)}
                                        className="p-1 rounded-lg bg-[#252530] hover:bg-[#323242] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                        title="Reemplazar o actualizar archivo de consentimiento firmado"
                                      >
                                        <UploadCloud className="w-3.5 h-3.5 text-[#FF3366]" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenConsentUploadForSale(sale)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-[#FF3366] text-amber-300 hover:text-white border border-amber-500/35 hover:border-[#FF3366] text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                                      title="Subir consentimiento ya firmado por el cliente para este procedimiento"
                                    >
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span>Subir Consentimiento</span>
                                    </button>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => onOpenReceipt(sale)}
                                    className="px-2.5 py-1 rounded-lg bg-[#252530] hover:bg-[#FF3366] hover:text-white text-neutral-300 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                    title="Ver ticket térmico o factura A4"
                                  >
                                    <FileCheck className="w-3 h-3" />
                                    <span>Ticket</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {historyTab === 'appointments' && (
                <div className="overflow-x-auto rounded-xl border border-[#24242B]">
                  {(() => {
                    const matched = clientsWithMetrics.find(c => c.client.id === viewHistoryClient.id);
                    const aList = matched ? matched.clientAppointments : [];

                    if (aList.length === 0) {
                      return (
                        <div className="py-12 text-center text-xs text-neutral-500">
                          No hay citas programadas para este cliente.
                        </div>
                      );
                    }

                    return (
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-[#24242B] text-neutral-400 font-medium bg-[#121215]">
                            <th className="py-2.5 px-3 whitespace-nowrap">Fecha / Horario</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Procedimiento / Servicio</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Artista</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Zona Corporal</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Seña / Anticipo</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Consentimiento Firmado</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222228]">
                          {aList.map(apt => {
                            const procConsent = getProcedureConsentForAppointment(viewHistoryClient, apt);
                            return (
                              <tr key={apt.id} className="hover:bg-[#1A1A22] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">
                                  {apt.date} ({apt.startTime} - {apt.endTime})
                                </td>
                                <td className="py-2.5 px-3 font-medium text-white">{apt.serviceName}</td>
                                <td className="py-2.5 px-3 text-neutral-300">{apt.artistName}</td>
                                <td className="py-2.5 px-3 text-neutral-400">{apt.bodyPlacement || '—'}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                                  {formatMoney(apt.depositAmount)}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {procConsent ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setViewingProcedureConsent(procConsent)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                        title="Ver o imprimir el consentimiento firmado subido para esta cita"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Ver Firmado</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenConsentUploadForAppointment(apt, procConsent)}
                                        className="p-1 rounded-lg bg-[#252530] hover:bg-[#323242] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                        title="Reemplazar o actualizar archivo de consentimiento firmado"
                                      >
                                        <UploadCloud className="w-3.5 h-3.5 text-[#FF3366]" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenConsentUploadForAppointment(apt)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-[#FF3366] text-amber-300 hover:text-white border border-amber-500/35 hover:border-[#FF3366] text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                                      title="Subir consentimiento ya firmado por el cliente para este procedimiento"
                                    >
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span>Subir Consentimiento</span>
                                    </button>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#252530] text-neutral-300">
                                    {apt.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {historyTab === 'medical' && (
                <div className="p-4 bg-[#121215] rounded-2xl border border-[#272730] space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-[#FF3366]" />
                      <span className="font-bold text-white text-sm">Ficha Médica & Bioseguridad Sanitaria</span>
                    </div>
                    {viewHistoryClient.consentSigned ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Consentimiento Sanitario Firmado</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Consentimiento Pendiente de Firma</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3 rounded-xl bg-[#17171C] border border-[#25252E] space-y-1">
                      <span className="text-[10px] text-neutral-400 font-semibold block">Alergias Conocidas:</span>
                      <p className="text-amber-300 font-medium">
                        {viewHistoryClient.allergies || 'Ninguna alergia registrada por el cliente.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#17171C] border border-[#25252E] space-y-1">
                      <span className="text-[10px] text-neutral-400 font-semibold block">Condiciones Médicas:</span>
                      <p className="text-neutral-200">
                        {viewHistoryClient.medicalConditions || 'Sin condiciones médicas preexistentes.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#17171C] border border-[#25252E] space-y-1">
                      <span className="text-[10px] text-neutral-400 font-semibold block">Tipo de Sangre & Nacimiento:</span>
                      <p className="text-neutral-200 font-mono">
                        Tipo: <strong className="text-white">{viewHistoryClient.bloodType || 'No especificado'}</strong> • Nacimiento:{' '}
                        {viewHistoryClient.birthDate || 'No registrado'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#17171C] border border-[#25252E] space-y-1">
                      <span className="text-[10px] text-neutral-400 font-semibold block">Contacto de Emergencia:</span>
                      <p className="text-neutral-200">
                        {viewHistoryClient.emergencyContact || 'Sin contacto de emergencia registrado.'}
                      </p>
                    </div>
                  </div>

                  {viewHistoryClient.notes && (
                    <div className="p-3 rounded-xl bg-[#17171C] border border-[#25252E]">
                      <span className="text-[10px] text-neutral-400 font-semibold block mb-0.5">Notas del Estudio:</span>
                      <p className="text-neutral-300 italic">{viewHistoryClient.notes}</p>
                    </div>
                  )}

                  {/* SECCIÓN: HISTORIAL DE CONSENTIMIENTOS FIRMADOS POR CADA PROCEDIMIENTO */}
                  <div className="pt-3 border-t border-[#24242B] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-white text-xs uppercase flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-400" />
                          <span>
                            Consentimientos Firmados por Procedimiento ({(viewHistoryClient.procedureConsents || []).length})
                          </span>
                        </span>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Archivo digital de hojas de consentimiento informado subidas y firmadas por el cliente en cada sesión.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenManualConsentUpload}
                        className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+ Subir Consentimiento Firmado</span>
                      </button>
                    </div>

                    {(viewHistoryClient.procedureConsents || []).length === 0 ? (
                      <div className="p-6 text-center rounded-xl bg-[#17171C] border border-[#25252E] space-y-2">
                        <FileText className="w-7 h-7 text-neutral-500 mx-auto" />
                        <p className="text-xs font-semibold text-neutral-300">
                          Aún no se han subido hojas de consentimiento firmadas por procedimiento
                        </p>
                        <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                          Puedes subir el consentimiento firmado desde la pestaña de Facturas, Citas o usando el botón superior para registrar el documento firmado de cada sesión.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenManualConsentUpload}
                          className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Subir Primer Consentimiento Firmado</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(viewHistoryClient.procedureConsents || []).map(cons => (
                          <div
                            key={cons.id}
                            className="p-3 rounded-xl bg-[#17171C] border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                  <span>FIRMADO</span>
                                </span>
                                {cons.invoiceOrRefNumber && (
                                  <span className="font-mono text-[10px] text-[#FF3366] font-bold">
                                    {cons.invoiceOrRefNumber}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-neutral-400">
                                  {cons.date}
                                </span>
                              </div>
                              <p className="font-bold text-white text-xs truncate">
                                {cons.serviceName}
                              </p>
                              <p className="text-[11px] text-neutral-400 truncate">
                                Artista: <strong className="text-neutral-200">{cons.artistName}</strong>
                                {cons.bodyPlacement ? ` • Zona: ${cons.bodyPlacement}` : ''}
                              </p>
                              <p className="text-[10px] text-neutral-500 font-mono truncate">
                                Archivo: {cons.fileName}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewingProcedureConsent(cons)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Visualizar e imprimir consentimiento firmado"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteProcedureConsent(cons.id, cons.procedureType, cons.procedureRefId)
                                }
                                className="p-1.5 rounded-lg bg-[#121215] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 border border-[#272730] transition-colors cursor-pointer"
                                title="Eliminar documento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: GALERÍA DE FOTOS DEL CLIENTE */}
              {historyTab === 'gallery' && (
                <div className="space-y-4">
                  {(() => {
                    const cPhotos = galleryPhotos.filter(
                      p => (p.clientId && p.clientId === viewHistoryClient.id) ||
                           (p.clientName && p.clientName.toLowerCase().trim() === viewHistoryClient.name.toLowerCase().trim())
                    );

                    return (
                      <>
                        {/* Header & Subir Foto */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#24242B]">
                          <div>
                            <h4 className="font-bold text-white text-xs uppercase flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-[#FF3366]" />
                              <span>Obras & Seguimiento Fotográfico ({cPhotos.length})</span>
                            </h4>
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              Tatuajes, perforaciones corporales y control de curación registrados para {viewHistoryClient.name}.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsClientPhotoUploadOpen(true);
                              setClientPhotoTitle('');
                              setClientPhotoPlacement('');
                              setClientPhotoStyle('');
                              setClientPhotoArtistId(artists[0]?.id || '');
                              setClientPhotoCategory('tattoo');
                              setClientPhotoIsHealed(false);
                              setClientPhotoImagePreview('');
                              setClientPhotoUrl('');
                            }}
                            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Subir Foto del Cliente</span>
                          </button>
                        </div>

                        {/* Formulario para subir foto directa al expediente del cliente */}
                        {isClientPhotoUploadOpen && (
                          <div className="p-4 bg-[#121215] border border-[#FF3366]/40 rounded-2xl space-y-3 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-[#24242A] pb-2">
                              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                <UploadCloud className="w-4 h-4 text-[#FF3366]" />
                                <span>Adjuntar Fotografía al Expediente de {viewHistoryClient.name}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsClientPhotoUploadOpen(false)}
                                className="text-neutral-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="sm:col-span-2">
                                <label className="block font-semibold text-neutral-300 mb-1">Título de la Obra *</label>
                                <input
                                  type="text"
                                  required
                                  value={clientPhotoTitle}
                                  onChange={e => setClientPhotoTitle(e.target.value)}
                                  placeholder={`Ej: Tatuaje Antebrazo - ${viewHistoryClient.name}, Piercing Hélice...`}
                                  className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366]"
                                />
                              </div>

                              <div>
                                <label className="block font-semibold text-neutral-300 mb-1">Categoría</label>
                                <select
                                  value={clientPhotoCategory}
                                  onChange={e => setClientPhotoCategory(e.target.value as any)}
                                  className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366] cursor-pointer"
                                >
                                  <option value="tattoo">Tatuaje</option>
                                  <option value="piercing">Piercing</option>
                                  <option value="healed">Cicatrizado (Healed)</option>
                                  <option value="coverup">Cover Up</option>
                                </select>
                              </div>

                              <div>
                                <label className="block font-semibold text-neutral-300 mb-1">Artista Autor</label>
                                <select
                                  value={clientPhotoArtistId}
                                  onChange={e => setClientPhotoArtistId(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366] cursor-pointer"
                                >
                                  {artists.map(art => (
                                    <option key={art.id} value={art.id}>{art.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block font-semibold text-neutral-300 mb-1">Zona Anatómica</label>
                                <input
                                  type="text"
                                  value={clientPhotoPlacement}
                                  onChange={e => setClientPhotoPlacement(e.target.value)}
                                  placeholder="Ej: Antebrazo, Costillas, Oreja..."
                                  className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366]"
                                />
                              </div>

                              <div>
                                <label className="block font-semibold text-neutral-300 mb-1">Estilo / Técnica</label>
                                <input
                                  type="text"
                                  value={clientPhotoStyle}
                                  onChange={e => setClientPhotoStyle(e.target.value)}
                                  placeholder="Ej: Blackwork, Neotradicional, Fineline..."
                                  className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366]"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block font-semibold text-neutral-300 mb-1">Imagen (Archivo o URL) *</label>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <input
                                    type="file"
                                    ref={clientPhotoFileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      const r = new FileReader();
                                      r.onload = () => {
                                        setClientPhotoImagePreview(r.result as string);
                                        setClientPhotoUrl('');
                                      };
                                      r.readAsDataURL(f);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => clientPhotoFileInputRef.current?.click()}
                                    className="px-3.5 py-1.5 bg-[#202028] hover:bg-[#2B2B36] border border-[#2A2A36] text-white font-semibold rounded-xl text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <UploadCloud className="w-3.5 h-3.5 text-[#FF3366]" />
                                    <span>Cargar Archivo</span>
                                  </button>
                                  <input
                                    type="url"
                                    value={clientPhotoUrl}
                                    onChange={e => {
                                      setClientPhotoUrl(e.target.value);
                                      setClientPhotoImagePreview('');
                                    }}
                                    placeholder="O pegar enlace URL..."
                                    className="flex-1 px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white outline-none text-[11px]"
                                  />
                                </div>
                                {(clientPhotoImagePreview || clientPhotoUrl) && (
                                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-[#2B2B36]">
                                    <img src={clientPhotoImagePreview || clientPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-[#24242A]">
                              <button
                                type="button"
                                onClick={() => setIsClientPhotoUploadOpen(false)}
                                className="px-3 py-1.5 text-neutral-400 hover:text-white text-xs cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const finalImg = clientPhotoImagePreview || clientPhotoUrl.trim();
                                  if (!finalImg) {
                                    alert('Por favor selecciona una foto o ingresa una URL.');
                                    return;
                                  }
                                  const artObj = artists.find(a => a.id === clientPhotoArtistId) || artists[0];
                                  addGalleryPhoto({
                                    title: clientPhotoTitle.trim() || `Obra para ${viewHistoryClient.name}`,
                                    imageUrl: finalImg,
                                    category: clientPhotoCategory,
                                    artistId: artObj?.id,
                                    artistName: artObj?.name || 'Artista',
                                    clientId: viewHistoryClient.id,
                                    clientName: viewHistoryClient.name,
                                    date: new Date().toISOString().split('T')[0],
                                    bodyPlacement: clientPhotoPlacement.trim() || undefined,
                                    style: clientPhotoStyle.trim() || undefined,
                                    isHealed: clientPhotoIsHealed || clientPhotoCategory === 'healed',
                                    tags: [viewHistoryClient.name, clientPhotoCategory],
                                    featured: true,
                                  });
                                  setIsClientPhotoUploadOpen(false);
                                }}
                                className="px-4 py-1.5 bg-[#FF3366] hover:bg-[#E62557] text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                              >
                                Guardar Foto
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Grilla de fotos del cliente */}
                        {cPhotos.length === 0 ? (
                          <div className="p-8 text-center bg-[#121215] rounded-2xl border border-[#272730] space-y-2">
                            <ImageIcon className="w-8 h-8 text-neutral-600 mx-auto" />
                            <p className="text-xs text-neutral-300 font-semibold">
                              No hay fotografías registradas aún para este cliente
                            </p>
                            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                              Captura o sube fotos del tatuaje terminado, de la sesión o del proceso de cicatrización para su expediente clínico.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsClientPhotoUploadOpen(true);
                                setClientPhotoTitle('');
                                setClientPhotoPlacement('');
                                setClientPhotoStyle('');
                                setClientPhotoArtistId(artists[0]?.id || '');
                                setClientPhotoCategory('tattoo');
                                setClientPhotoIsHealed(false);
                                setClientPhotoImagePreview('');
                                setClientPhotoUrl('');
                              }}
                              className="mt-2 px-3.5 py-1.5 rounded-xl bg-[#1A1A22] hover:bg-[#242430] border border-[#2B2B38] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#FF3366]" />
                              <span>Subir Primera Foto</span>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {cPhotos.map(photo => (
                              <div
                                key={photo.id}
                                className="group relative bg-[#121215] border border-[#272730] hover:border-[#FF3366]/50 rounded-xl overflow-hidden shadow-sm transition-all"
                              >
                                <div className="aspect-square bg-black overflow-hidden relative">
                                  <img
                                    src={photo.imageUrl}
                                    alt={photo.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                                  <div className="absolute top-2 left-2">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white backdrop-blur-xs uppercase border border-white/20">
                                      {photo.category}
                                    </span>
                                  </div>
                                  <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white">
                                    <p className="font-bold line-clamp-1">{photo.title}</p>
                                    <p className="text-[9px] text-neutral-400 font-mono">{photo.date}</p>
                                  </div>
                                </div>
                                <div className="p-2 flex items-center justify-between text-[10px] text-neutral-400">
                                  <span className="truncate">{photo.artistName}</span>
                                  {photo.bodyPlacement && (
                                    <span className="text-[#FF3366] font-mono shrink-0 ml-1 truncate max-w-[80px]">
                                      {photo.bodyPlacement}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="pt-3 border-t border-[#25252E] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewHistoryClient(null)}
                className="px-5 py-2 rounded-xl bg-[#252530] hover:bg-[#30303E] text-white font-semibold text-xs cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CREAR / EDITAR CLIENTE (CON CONSULTA SRI EN TIEMPO REAL)
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#FF3366]/15 text-[#FF3366]">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {editingClient ? 'Editar Ficha del Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              {/* Cédula / RUC con Verificación SRI */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Cédula / RUC (Ecuador)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. 1712345678 o 1790012345001"
                    value={formDni}
                    onChange={e => setFormDni(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleLookupSri()}
                    disabled={isSearchingSri}
                    className="px-4 py-2.5 rounded-xl bg-[#1C1C24] hover:bg-[#252530] text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSearchingSri ? 'animate-spin' : ''}`} />
                    <span>{isSearchingSri ? 'Consultando...' : 'Consultar SRI'}</span>
                  </button>
                </div>
                {sriMessage && (
                  <p
                    className={`text-[11px] mt-1.5 p-2 rounded-lg ${
                      sriMessage.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : sriMessage.type === 'warning'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-red-500/15 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {sriMessage.text}
                  </p>
                )}
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Nombres Completos / Razón Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Patricio Mendoza Silva"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                />
              </div>

              {/* Teléfono & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej. 0987654321"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="cliente@gmail.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
              </div>

              {/* Instagram & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Usuario Instagram</label>
                  <input
                    type="text"
                    placeholder="@usuario_tattoo"
                    value={formInstagram}
                    onChange={e => setFormInstagram(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Etiquetas (separadas por coma)</label>
                  <input
                    type="text"
                    placeholder="VIP, Coleccionista, Piercing"
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121215] border border-[#272730] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60 transition-colors"
                  />
                </div>
              </div>

              {/* Sección Médica */}
              <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#272730] space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-[#FF3366]" />
                  <span>Ficha Sanitaria & Bioseguridad</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-neutral-300 mb-1">Alergias Conocidas</label>
                    <input
                      type="text"
                      placeholder="Látex, pigmentos rojos, níquel..."
                      value={formAllergies}
                      onChange={e => setFormAllergies(e.target.value)}
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-300 mb-1">Tipo de Sangre</label>
                    <select
                      value={formBloodType}
                      onChange={e => setFormBloodType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60 cursor-pointer"
                    >
                      <option value="">No especificado</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Contacto de Emergencia</label>
                  <input
                    type="text"
                    placeholder="Nombre y teléfono de familiar"
                    value={formEmergencyContact}
                    onChange={e => setFormEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white focus:outline-hidden focus:border-[#FF3366]/60"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formConsent}
                      onChange={e => setFormConsent(e.target.checked)}
                      className="rounded accent-[#FF3366] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-neutral-200 font-medium text-xs">
                      Consentimiento informado y ficha sanitaria firmada digitalmente
                    </span>
                  </label>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                >
                  {editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: SUBIR / REGISTRAR CONSENTIMIENTO FIRMADO POR PROCEDIMIENTO
          ========================================================================= */}
      {isConsentUploadModalOpen && viewHistoryClient && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Subir Consentimiento Firmado por Procedimiento
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Cliente: <strong className="text-white">{viewHistoryClient.name}</strong>
                    {consentInvoiceOrRef ? ` • Ref: ${consentInvoiceOrRef}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConsentUploadModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUploadedConsent} className="space-y-3.5 text-xs">
              {/* Selector de Procedimiento (si existen facturas o citas del cliente) */}
              {(() => {
                const matched = clientsWithMetrics.find(c => c.client.id === viewHistoryClient.id);
                const clientSalesList = matched ? matched.clientSales : [];
                const clientAptsList = matched ? matched.clientAppointments : [];

                if (clientSalesList.length === 0 && clientAptsList.length === 0) return null;

                return (
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Vincular a Procedimiento del Cliente
                    </label>
                    <select
                      value={
                        consentProcedureRefId
                          ? `${consentProcedureType}:${consentProcedureRefId}`
                          : 'manual:'
                      }
                      onChange={e => {
                        const [type, refId] = e.target.value.split(':');
                        if (type === 'sale') {
                          const s = clientSalesList.find(x => x.id === refId);
                          if (s) {
                            setConsentProcedureType('sale');
                            setConsentProcedureRefId(s.id);
                            setConsentInvoiceOrRef(s.invoiceNumber);
                            setConsentServiceName(s.serviceName);
                            setConsentServiceCategory(s.serviceCategory);
                            setConsentArtistName(s.artistName);
                            setConsentDate(s.date.split('T')[0]);
                          }
                        } else if (type === 'appointment') {
                          const a = clientAptsList.find(x => x.id === refId);
                          if (a) {
                            setConsentProcedureType('appointment');
                            setConsentProcedureRefId(a.id);
                            setConsentInvoiceOrRef(`CITA-${a.date}`);
                            setConsentServiceName(a.serviceName);
                            setConsentServiceCategory(a.serviceCategory);
                            setConsentArtistName(a.artistName);
                            setConsentDate(a.date);
                            setConsentBodyPlacement(a.bodyPlacement || '');
                          }
                        } else {
                          setConsentProcedureType('manual');
                          setConsentProcedureRefId('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366] cursor-pointer"
                    >
                      <option value="manual:">-- Procedimiento Manual / Otro --</option>
                      {clientSalesList.length > 0 && (
                        <optgroup label="Facturas & Comprobantes realizados">
                          {clientSalesList.map(s => (
                            <option key={s.id} value={`sale:${s.id}`}>
                              {s.invoiceNumber} • {new Date(s.date).toLocaleDateString('es-EC')} • {s.serviceName} ({s.artistName})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {clientAptsList.length > 0 && (
                        <optgroup label="Citas Agendadas">
                          {clientAptsList.map(a => (
                            <option key={a.id} value={`appointment:${a.id}`}>
                              Cita {a.date} ({a.startTime}) • {a.serviceName} ({a.artistName})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Nombre del Procedimiento / Trabajo Realizado *
                  </label>
                  <input
                    type="text"
                    required
                    value={consentServiceName}
                    onChange={e => setConsentServiceName(e.target.value)}
                    placeholder="Ej. Tatuaje Realismo Sombras, Piercing Nostril Titanio..."
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Artista / Profesional Responsable *
                  </label>
                  <select
                    value={consentArtistName}
                    onChange={e => setConsentArtistName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366] cursor-pointer"
                  >
                    {artists.map(art => (
                      <option key={art.id} value={art.name}>
                        {art.name} ({art.role})
                      </option>
                    ))}
                    {!artists.some(a => a.name === consentArtistName) && consentArtistName && (
                      <option value={consentArtistName}>{consentArtistName}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Fecha del Procedimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={consentDate}
                    onChange={e => setConsentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono outline-none focus:border-[#FF3366]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Zona Corporal / Anatómica
                  </label>
                  <input
                    type="text"
                    value={consentBodyPlacement}
                    onChange={e => setConsentBodyPlacement(e.target.value)}
                    placeholder="Ej. Antebrazo exterior, Costillas, Oreja..."
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    N° Factura o Referencia
                  </label>
                  <input
                    type="text"
                    value={consentInvoiceOrRef}
                    onChange={e => setConsentInvoiceOrRef(e.target.value)}
                    placeholder="Ej. FAC-00124"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono outline-none focus:border-[#FF3366]"
                  />
                </div>
              </div>

              {/* Zona de Carga de Archivo Firmado (Imagen Escaneada / Foto / PDF o Generación Digital) */}
              <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#272730] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-[#FF3366]" />
                    <span>Archivo de Consentimiento Ya Firmado por el Cliente</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoSvg = generateOfficialSignedConsentSvg({
                        clientName: viewHistoryClient.name,
                        clientDni: viewHistoryClient.dni,
                        clientPhone: viewHistoryClient.phone,
                        serviceName: consentServiceName || 'Procedimiento en Cabina',
                        artistName: consentArtistName || artists[0]?.name || 'Artista',
                        date: consentDate,
                        bodyPlacement: consentBodyPlacement || undefined,
                        invoiceOrRef: consentInvoiceOrRef || undefined,
                        allergies: viewHistoryClient.allergies,
                        notes: consentNotes || undefined,
                      });
                      setConsentFileDataUrl(autoSvg);
                      setConsentFileName(
                        `Acta_Consentimiento_Firmado_${viewHistoryClient.name.replace(/\s+/g, '_')}_${consentDate}.svg`
                      );
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Generar Acta Firmada Digitalmente
                  </button>
                </div>

                <input
                  type="file"
                  ref={consentFileInputRef}
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setConsentFileDataUrl(reader.result as string);
                      setConsentFileName(f.name);
                    };
                    reader.readAsDataURL(f);
                  }}
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => consentFileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-[#202028] hover:bg-[#2B2B36] border border-[#323240] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <UploadCloud className="w-4 h-4 text-[#FF3366]" />
                    <span>Seleccionar Foto / Escaneo / PDF Firmado</span>
                  </button>
                  {consentFileName ? (
                    <div className="flex-1 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] truncate flex items-center justify-between gap-2">
                      <span className="truncate">✓ {consentFileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setConsentFileDataUrl('');
                          setConsentFileName('');
                        }}
                        className="text-neutral-400 hover:text-white shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-neutral-400">
                      Sube la foto/escaneo de la hoja firmada o genera el acta digital con 1 clic.
                    </span>
                  )}
                </div>

                {consentFileDataUrl && !consentFileDataUrl.startsWith('data:application/pdf') && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-[#2B2B36] bg-white max-h-56 overflow-y-auto p-2">
                    <img
                      src={consentFileDataUrl}
                      alt="Vista previa consentimiento firmado"
                      className="w-full h-auto object-contain mx-auto max-h-52"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Observaciones de Bioseguridad / Lote de Agujas y Pigmentos
                </label>
                <input
                  type="text"
                  value={consentNotes}
                  onChange={e => setConsentNotes(e.target.value)}
                  placeholder="Ej. Agujas Kwadron estériles verificadas por el cliente, sin reacciones adversas..."
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white outline-none focus:border-[#FF3366]"
                />
              </div>

              <div className="pt-3 border-t border-[#25252E] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConsentUploadModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Guardar Consentimiento Firmado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: VISUALIZAR E IMPRIMIR CONSENTIMIENTO FIRMADO DEL PROCEDIMIENTO
          ========================================================================= */}
      {viewingProcedureConsent && viewHistoryClient && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
            <div className="px-5 py-3.5 bg-[#121215] border-b border-[#25252E] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">
                      Consentimiento Firmado por Procedimiento
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ✓ FIRMADO POR EL CLIENTE
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {viewHistoryClient.name} • {viewingProcedureConsent.serviceName} ({viewingProcedureConsent.date})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={viewingProcedureConsent.fileDataUrl}
                  download={viewingProcedureConsent.fileName || `Consentimiento_${viewHistoryClient.name}.svg`}
                  className="px-3 py-1.5 rounded-xl bg-[#20202A] hover:bg-[#2B2B38] text-neutral-200 hover:text-white border border-[#2E2E3A] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span>Descargar</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProcedureConsent(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-neutral-900/70 space-y-4">
              {/* Resumen de Metadatos del Procedimiento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-[#121215] p-3 rounded-2xl border border-[#272730]">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Procedimiento</span>
                  <span className="font-bold text-white">{viewingProcedureConsent.serviceName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Artista Responsable</span>
                  <span className="font-bold text-neutral-200">{viewingProcedureConsent.artistName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Fecha / Ref</span>
                  <span className="font-mono font-bold text-[#FF3366]">
                    {viewingProcedureConsent.date}{' '}
                    {viewingProcedureConsent.invoiceOrRefNumber
                      ? `(${viewingProcedureConsent.invoiceOrRefNumber})`
                      : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Zona Anatómica</span>
                  <span className="font-semibold text-emerald-400">
                    {viewingProcedureConsent.bodyPlacement || 'Registrada en cabina'}
                  </span>
                </div>
              </div>

              {/* Documento Visual */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xl border border-neutral-300 flex items-center justify-center">
                {viewingProcedureConsent.fileDataUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    src={viewingProcedureConsent.fileDataUrl}
                    title={viewingProcedureConsent.fileName}
                    className="w-full h-[550px] rounded-lg"
                  />
                ) : (
                  <img
                    src={viewingProcedureConsent.fileDataUrl}
                    alt={viewingProcedureConsent.fileName}
                    className="max-w-full h-auto rounded-lg object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
