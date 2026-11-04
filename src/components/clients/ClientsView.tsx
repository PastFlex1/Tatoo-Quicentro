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
import { ClientProfile, SaleRecord } from '../../types';
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
    addGalleryPhoto,
    formatMoney,
    addClient,
    updateClient,
    deleteClient,
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
          HORIZONTAL CLIENTS TABLE (DISEÑO HORIZONTAL TIPO TABLA)
          ========================================================================= */}
      <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
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

              <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2 border-b border-[#25252E] pb-2 shrink-0">
              <button
                onClick={() => setHistoryTab('sales')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  historyTab === 'medical'
                    ? 'bg-[#FF3366] text-white shadow-[0_0_8px_rgba(255,51,102,0.3)]'
                    : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Ficha Médica & Bioseguridad</span>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                <div>
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
                            <th className="py-2.5 px-3 whitespace-nowrap">Servicio / Trabajo</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Artista</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Pagado</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Forma de Pago</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Comprobante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222228]">
                          {sList.map(sale => (
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
                              <td className="py-2.5 px-3 whitespace-nowrap uppercase text-[10px] font-mono text-neutral-400">
                                {sale.paymentMethod}
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
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {historyTab === 'appointments' && (
                <div>
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
                            <th className="py-2.5 px-3 whitespace-nowrap">Servicio</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Artista</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Zona Corporal</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Seña / Anticipo</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222228]">
                          {aList.map(apt => (
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
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#252530] text-neutral-300">
                                  {apt.status}
                                </span>
                              </td>
                            </tr>
                          ))}
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
    </div>
  );
};
