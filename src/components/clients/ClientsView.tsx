import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ReceiptText,
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
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ClientProfile, SaleRecord } from '../../types';

interface ClientsViewProps {
  onOpenReceipt: (sale: SaleRecord) => void;
  onSelectClientForPos?: (client: ClientProfile) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onOpenReceipt, onSelectClientForPos }) => {
  const {
    clients,
    sales,
    appointments,
    formatMoney,
    addClient,
    updateClient,
    deleteClient,
    setActiveTab,
  } = useStudio();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [activeTabSub, setActiveTabSub] = useState<'sales' | 'appointments' | 'medical' | 'body_map'>('sales');

  // Modal State for New/Edit Client
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

  // Unified dynamic clients list (includes registered clients + discovers any client names in sales/appointments)
  const unifiedClients = useMemo(() => {
    const list: ClientProfile[] = [...clients];

    // Look for any client in sales not yet in clients list
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

    // Look for any client in appointments not yet in list
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

  // Filter clients
  const filteredClients = useMemo(() => {
    return unifiedClients.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.dni && c.dni.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.instagram && c.instagram.toLowerCase().includes(q));

      const matchesTag =
        selectedTagFilter === 'all' ||
        (c.tags && c.tags.some(t => t.toLowerCase() === selectedTagFilter.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  }, [unifiedClients, searchTerm, selectedTagFilter]);

  // Selected Client Object
  const currentClient = useMemo(() => {
    if (!selectedClientId) return filteredClients[0] || unifiedClients[0] || null;
    return unifiedClients.find(c => c.id === selectedClientId) || filteredClients[0] || unifiedClients[0] || null;
  }, [selectedClientId, unifiedClients, filteredClients]);

  // Client's complete sales history
  const clientSales = useMemo(() => {
    if (!currentClient) return [];
    const clientNameNorm = currentClient.name.trim().toLowerCase();
    return sales
      .filter(s => {
        const nameMatch = s.clientName && s.clientName.trim().toLowerCase() === clientNameNorm;
        const phoneMatch = currentClient.phone && s.clientPhone && s.clientPhone === currentClient.phone;
        const dniMatch = currentClient.dni && s.clientDni && s.clientDni.toLowerCase() === currentClient.dni.toLowerCase();
        return nameMatch || phoneMatch || dniMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentClient, sales]);

  // Client's complete appointments history
  const clientAppointments = useMemo(() => {
    if (!currentClient) return [];
    const clientNameNorm = currentClient.name.trim().toLowerCase();
    return appointments
      .filter(a => {
        const nameMatch = a.clientName && a.clientName.trim().toLowerCase() === clientNameNorm;
        const phoneMatch = currentClient.phone && a.clientPhone && a.clientPhone === currentClient.phone;
        return nameMatch || phoneMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentClient, appointments]);

  // Aggregate stats for current client
  const clientStats = useMemo(() => {
    const totalSpent = clientSales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? s.total : 0), 0);
    const totalHours = clientSales.reduce((acc, s) => acc + (s.hours || 0), 0);
    const totalVisits = clientSales.length;
    const avgTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;

    // Favorite artist
    const artistCounts: { [name: string]: number } = {};
    clientSales.forEach(s => {
      artistCounts[s.artistName] = (artistCounts[s.artistName] || 0) + 1;
    });
    clientAppointments.forEach(a => {
      artistCounts[a.artistName] = (artistCounts[a.artistName] || 0) + 1;
    });

    let favArtist = 'Sin registro';
    let maxCount = 0;
    Object.entries(artistCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favArtist = name;
      }
    });

    // Body placements worked on
    const bodyZones = new Set<string>();
    clientAppointments.forEach(a => {
      if (a.bodyPlacement) bodyZones.add(a.bodyPlacement);
    });
    clientSales.forEach(s => {
      if (s.serviceName) {
        const lower = s.serviceName.toLowerCase();
        if (lower.includes('antebrazo')) bodyZones.add('Antebrazo');
        if (lower.includes('espalda')) bodyZones.add('Espalda');
        if (lower.includes('nostril') || lower.includes('nariz')) bodyZones.add('Nostril / Nariz');
        if (lower.includes('helix') || lower.includes('oreja') || lower.includes('cartílago')) bodyZones.add('Helix / Oreja');
        if (lower.includes('costillas')) bodyZones.add('Costillas');
        if (lower.includes('muslo') || lower.includes('pierna')) bodyZones.add('Muslo / Pierna');
        if (lower.includes('brazo')) bodyZones.add('Brazo');
      }
    });

    return {
      totalSpent,
      totalHours,
      totalVisits,
      avgTicket,
      favArtist,
      bodyZones: Array.from(bodyZones),
      lastVisitDate: clientSales[0]?.date || clientAppointments[0]?.date || null,
    };
  }, [clientSales, clientAppointments]);

  // Handlers for modal
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
    setIsModalOpen(true);
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
    };

    if (editingClient) {
      updateClient(editingClient.id, clientData);
    } else {
      const created = addClient(clientData);
      setSelectedClientId(created.id);
    }

    setIsModalOpen(false);
  };

  const handleDeleteClient = (client: ClientProfile) => {
    if (confirm(`¿Eliminar la ficha del cliente "${client.name}"? Los tickets y citas históricas se conservarán.`)) {
      deleteClient(client.id);
      if (selectedClientId === client.id) {
        setSelectedClientId('');
      }
    }
  };

  const handleCobrarEnPos = () => {
    if (currentClient && onSelectClientForPos) {
      onSelectClientForPos(currentClient);
    }
    setActiveTab('pos');
  };

  const handleExportClientDossier = () => {
    if (!currentClient) return;
    const lines = [
      `"EXPEDIENTE CLÍNICO & HISTORIAL DE CLIENTE - ${currentClient.name.toUpperCase()}"`,
      `"Generado: ${new Date().toLocaleString('es-ES')}"`,
      `"Teléfono: ${currentClient.phone || 'N/A'}"`,
      `"DNI / Cédula: ${currentClient.dni || 'N/A'}"`,
      `"Email: ${currentClient.email || 'N/A'}"`,
      `"Instagram: ${currentClient.instagram || 'N/A'}"`,
      `"Ficha Consentimiento Firmada: ${currentClient.consentSigned ? 'SÍ' : 'NO'}"`,
      `"Alergias: ${currentClient.allergies || 'Ninguna registrada'}"`,
      `"Condiciones Médicas: ${currentClient.medicalConditions || 'Ninguna'}"`,
      `"Notas de Cicatrización: ${currentClient.skinNotes || 'N/A'}"`,
      '""',
      '"RESUMEN EN EL NEGOCIO"',
      `"Total Facturado (LTV)","${formatMoney(clientStats.totalSpent)}"`,
      `"Total Sesiones Realizadas","${clientStats.totalVisits}"`,
      `"Horas Tatuadas Acumuladas","${clientStats.totalHours} hrs"`,
      `"Artista Habitual","${clientStats.favArtist}"`,
      '""',
      '"HISTORIAL DE FACTURAS Y SERVICIOS"',
      '"Factura","Fecha","Servicio","Artista","Horas","Total Pagado","Método Pago","Ficha Sanitaria"',
      ...clientSales.map(s =>
        `"${s.invoiceNumber}","${s.date}","${s.serviceName.replace(/"/g, '""')}","${s.artistName}","${s.hours || 0}","${s.total.toFixed(2)}","${s.paymentMethod}","${s.consentFormSigned ? 'SÍ' : 'NO'}"`
      ),
      '""',
      '"HISTORIAL DE CITAS Y AGENDAMIENTO"',
      '"ID Cita","Fecha","Horario","Servicio","Artista","Zona Cuerpo","Seña","Estado"',
      ...clientAppointments.map(a =>
        `"${a.id}","${a.date}","${a.startTime}-${a.endTime}","${a.serviceName.replace(/"/g, '""')}","${a.artistName}","${a.bodyPlacement || 'N/A'}","${a.depositAmount}","${a.status}"`
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expediente_${currentClient.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Historial del Cliente & Expediente en el Negocio
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400">
            Registro 360° de visitas, facturas previas, citas agendadas, ficha médica/alergias y mapa corporal.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_14px_rgba(255,51,102,0.35)]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Cliente / Ficha</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: Client Directory (4 / 12) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-3.5">
          {/* Search & Tag Filter */}
          <div className="p-3.5 rounded-2xl bg-[#18181D] border border-[#272730] space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, DNI o email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#FF3366]/60"
              />
              <Search className="w-4 h-4 text-[#FF3366] absolute right-3 top-2.5" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'vip', label: 'VIP' },
                { id: 'coleccionista', label: 'Coleccionista' },
                { id: 'piercing', label: 'Piercing' },
                { id: 'frecuente', label: 'Frecuente' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTagFilter(t.id)}
                  className={`px-2.5 py-1 text-[10px] rounded-full font-semibold transition-all whitespace-nowrap shrink-0 ${
                    selectedTagFilter === t.id
                      ? 'bg-[#FF3366] text-white shadow-[0_0_6px_rgba(255,51,102,0.4)]'
                      : 'bg-[#121215] text-neutral-400 hover:text-white border border-[#272730]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Client List Cards */}
          <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-[#23232B]">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No se encontraron clientes con el criterio de búsqueda.
              </div>
            ) : (
              filteredClients.map(client => {
                const isSelected = currentClient?.id === client.id || currentClient?.name === client.name;
                const clientPurchasesCount = sales.filter(s => s.clientName && s.clientName.trim().toLowerCase() === client.name.trim().toLowerCase()).length;
                const clientAptsCount = appointments.filter(a => a.clientName && a.clientName.trim().toLowerCase() === client.name.trim().toLowerCase()).length;

                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full p-3.5 text-left transition-all flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#FF3366]/10 border-l-4 border-l-[#FF3366]'
                        : 'hover:bg-[#1C1C24]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                          {client.name}
                        </span>
                        {client.consentSigned ? (
                          <span title="Consentimiento firmado" className="inline-flex">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </span>
                        ) : (
                          <span title="Sin consentimiento firmado" className="inline-flex">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 font-mono truncate">
                        {client.phone || client.dni || client.email || 'Sin contacto directo'}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {client.tags?.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#121215] border border-[#2B2B36] text-neutral-300 font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-bold text-[#FF3366] block">
                        {clientPurchasesCount} ventas
                      </span>
                      {clientAptsCount > 0 && (
                        <span className="text-[9px] font-mono text-neutral-400 block mt-0.5">
                          {clientAptsCount} citas
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Full Client Dossier / Expediente (8 / 12) */}
        {currentClient ? (
          <div className="lg:col-span-8 xl:col-span-8 space-y-4 sm:space-y-5">
            {/* Profile Overview Card */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] font-bold text-lg flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(255,51,102,0.25)]">
                    {currentClient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-white truncate">
                        {currentClient.name}
                      </h2>
                      {currentClient.tags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FF3366]/15 border border-[#FF3366]/30 text-[#FF3366]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 flex-wrap font-mono">
                      {currentClient.phone && (
                        <span className="flex items-center gap-1 text-neutral-300">
                          <Phone className="w-3 h-3 text-[#FF3366]" />
                          {currentClient.phone}
                        </span>
                      )}
                      {currentClient.dni && <span>DNI: {currentClient.dni}</span>}
                      {currentClient.email && (
                        <span className="flex items-center gap-1 text-neutral-300">
                          <Mail className="w-3 h-3 text-[#FF3366]" />
                          {currentClient.email}
                        </span>
                      )}
                      {currentClient.instagram && (
                        <span className="text-[#FF3366] font-medium">{currentClient.instagram}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCobrarEnPos}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(255,51,102,0.3)]"
                    title="Cobrar en terminal POS"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cobrar en POS</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(currentClient)}
                    className="p-2 rounded-full bg-[#121215] border border-[#272730] text-neutral-300 hover:text-white hover:border-[#FF3366] transition-colors"
                    title="Editar ficha del cliente"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleExportClientDossier}
                    className="p-2 rounded-full bg-[#121215] border border-[#272730] text-neutral-300 hover:text-white hover:border-[#FF3366] transition-colors"
                    title="Exportar expediente en CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FF3366]" />
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-full bg-[#121215] border border-[#272730] text-neutral-300 hover:text-white hover:border-[#FF3366] transition-colors"
                    title="Imprimir ficha del cliente"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#FF3366]" />
                  </button>

                  <button
                    onClick={() => handleDeleteClient(currentClient)}
                    className="p-2 rounded-full bg-[#121215] border border-[#272730] text-neutral-400 hover:text-[#FF3366] transition-colors"
                    title="Eliminar de catálogo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* KPI Strip of Client in the Studio */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#121215] border border-[#26262F]">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Total Invertido en Estudio</span>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                    {formatMoney(clientStats.totalSpent)}
                  </div>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    Ticket Prom: {formatMoney(clientStats.avgTicket)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#121215] border border-[#26262F]">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Sesiones Realizadas</span>
                  <div className="text-base sm:text-lg font-bold font-mono text-white">
                    {clientStats.totalVisits} visitas
                  </div>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    {clientAppointments.length} citas en agenda
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#121215] border border-[#26262F]">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Horas Tatuadas</span>
                  <div className="text-base sm:text-lg font-bold font-mono text-[#FF3366]">
                    {clientStats.totalHours} hrs
                  </div>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">En cabinas</span>
                </div>

                <div className="p-3 rounded-xl bg-[#121215] border border-[#26262F]">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Artista Habitual</span>
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {clientStats.favArtist}
                  </div>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    Ficha Sanitaria:{' '}
                    <strong className={currentClient.consentSigned ? 'text-emerald-400' : 'text-amber-400'}>
                      {currentClient.consentSigned ? 'Al día' : 'Pendiente'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Dossier Tabs Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#24242A]">
              {[
                { id: 'sales', label: `Historial de Facturas & Ventas (${clientSales.length})`, icon: ReceiptText },
                { id: 'appointments', label: `Citas & Agendamiento (${clientAppointments.length})`, icon: Calendar },
                { id: 'medical', label: 'Ficha Sanitaria, Alergias & Piel', icon: HeartPulse },
                { id: 'body_map', label: `Zonas Corporales (${clientStats.bodyZones.length})`, icon: Sparkles },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTabSub === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabSub(tab.id as any)}
                    className={`flex items-center gap-2 py-2 px-3.5 rounded-full text-xs transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_10px_rgba(255,51,102,0.35)]'
                        : 'bg-[#18181D] text-neutral-400 hover:text-white border border-[#272730]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT 1: HISTORIAL DE VENTAS Y PAGOS */}
            {activeTabSub === 'sales' && (
              <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden">
                <div className="p-4 border-b border-[#24242B] flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Registro de Pagos y Facturación del Cliente
                  </span>
                  <span className="text-xs font-mono font-bold text-[#FF3366]">
                    Total: {formatMoney(clientStats.totalSpent)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                        <th className="py-3 px-4 whitespace-nowrap">Factura</th>
                        <th className="py-3 px-4 whitespace-nowrap">Fecha</th>
                        <th className="py-3 px-4">Servicio Realizado</th>
                        <th className="py-3 px-4 whitespace-nowrap">Artista</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">Horas</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Importe</th>
                        <th className="py-3 px-4 whitespace-nowrap">Método</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">Ficha</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222228]">
                      {clientSales.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-neutral-500">
                            Aún no hay compras o servicios facturados a nombre de este cliente.
                            <button
                              onClick={handleCobrarEnPos}
                              className="text-[#FF3366] ml-2 font-semibold hover:underline"
                            >
                              + Cobrar primera sesión en POS
                            </button>
                          </td>
                        </tr>
                      ) : (
                        clientSales.map(sale => (
                          <tr key={sale.id} className="hover:bg-[#1E1E25] transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#FF3366] whitespace-nowrap">
                              {sale.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                              {new Date(sale.date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-4 min-w-[200px]">
                              <div className="font-semibold text-white">{sale.serviceName}</div>
                              {sale.notes && (
                                <div className="text-[10px] text-neutral-400 truncate max-w-[280px]">
                                  {sale.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">{sale.artistName}</td>
                            <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                              {sale.hours ? `${sale.hours}h` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                              {formatMoney(sale.total)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#121215] border border-[#272730] uppercase font-mono text-neutral-300">
                                {sale.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {sale.consentFormSigned ? (
                                <span className="inline-flex text-emerald-400" title="Consentimiento firmado">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex text-neutral-600" title="Sin ficha médica">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => onOpenReceipt(sale)}
                                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#282834] transition-colors"
                                title="Ver recibo e imprimir ticket"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: HISTORIAL DE CITAS Y AGENDAMIENTO */}
            {activeTabSub === 'appointments' && (
              <div className="rounded-2xl bg-[#18181D] border border-[#272730] overflow-hidden space-y-3">
                <div className="p-4 border-b border-[#24242B] flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Historial de Citas, Horarios y Anticipos
                  </span>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="text-xs text-[#FF3366] font-semibold hover:underline"
                  >
                    Abrir Agenda Completa →
                  </button>
                </div>

                <div className="divide-y divide-[#23232B]">
                  {clientAppointments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-neutral-500">
                      No hay citas registradas para este cliente.
                    </div>
                  ) : (
                    clientAppointments.map(apt => (
                      <div key={apt.id} className="p-4 hover:bg-[#1C1C24] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">
                              {apt.date} · {apt.startTime} - {apt.endTime}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                apt.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : apt.status === 'in_progress'
                                  ? 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {apt.status === 'completed'
                                ? 'Finalizada'
                                : apt.status === 'in_progress'
                                ? 'En Cabina'
                                : 'Programada'}
                            </span>
                          </div>

                          <div className="font-semibold text-white text-sm">{apt.serviceName}</div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2 flex-wrap">
                            <span>Artista: <strong className="text-neutral-200">{apt.artistName}</strong></span>
                            {apt.bodyPlacement && <span>· Zona: <strong className="text-neutral-200">{apt.bodyPlacement}</strong></span>}
                            {apt.sizeApprox && <span>· Tamaño: {apt.sizeApprox}</span>}
                          </div>
                          {apt.notes && <div className="text-[11px] text-neutral-400 italic">“{apt.notes}”</div>}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-white text-sm">
                            {formatMoney(apt.estimatedPrice)}
                          </div>
                          {apt.depositAmount > 0 && (
                            <span className="text-[10px] font-mono text-emerald-400 block">
                              Seña: {formatMoney(apt.depositAmount)} ({apt.depositPaid ? 'Pagada' : 'Pendiente'})
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: FICHA SANITARIA, ALERGIAS Y CONDICIONES */}
            {activeTabSub === 'medical' && (
              <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
                <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-[#FF3366]" />
                    <span>Ficha Sanitaria & Antecedentes Médicos para Cabina</span>
                  </h3>
                  <button
                    onClick={() => handleOpenEditModal(currentClient)}
                    className="text-xs text-[#FF3366] font-semibold hover:underline"
                  >
                    Modificar Ficha →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#121215] border border-[#272730] space-y-1.5">
                    <span className="text-[11px] font-bold text-[#FF3366] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Alergias Conocidas
                    </span>
                    <p className="text-neutral-200 font-medium">
                      {currentClient.allergies || 'Sin alergias registradas por el cliente.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121215] border border-[#272730] space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      Condiciones Médicas / Medicación
                    </span>
                    <p className="text-neutral-200 font-medium">
                      {currentClient.medicalConditions || 'Sin enfermedades ni medicación que afecte el procedimiento.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121215] border border-[#272730] space-y-1.5">
                    <span className="text-[11px] font-bold text-neutral-300">Tipo de Piel & Cicatrización</span>
                    <p className="text-neutral-200">
                      {currentClient.skinNotes || 'Piel normal. Tolera films protectores tipo Dermalize o Saniderm.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121215] border border-[#272730] space-y-1.5">
                    <span className="text-[11px] font-bold text-neutral-300">Contacto de Emergencia & Datos Clínicos</span>
                    <p className="text-neutral-200">
                      {currentClient.emergencyContact || 'No especificado.'}
                    </p>
                    <div className="text-[10px] text-neutral-400 pt-1">
                      Grupo Sanguíneo: <strong className="text-white">{currentClient.bloodType || 'N/D'}</strong> · Nacimiento: <strong className="text-white">{currentClient.birthDate || 'N/D'}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">Documento de Consentimiento Informado</span>
                    <span className="text-[11px] text-neutral-400">
                      Ficha firmada requerida por la normativa sanitaria de body art.
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    currentClient.consentSigned
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  }`}>
                    {currentClient.consentSigned ? 'Firmado y Válido' : 'Pendiente de Firma'}
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: MAPA CORPORAL Y ZONAS */}
            {activeTabSub === 'body_map' && (
              <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
                <div className="border-b border-[#24242B] pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Mapa Corporal & Zonas Trabajadas en el Estudio
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Historial de áreas donde el cliente se ha tatuado o anillado
                  </p>
                </div>

                {clientStats.bodyZones.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    Aún no se han especificado ubicaciones corporales en las citas de este cliente.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {clientStats.bodyZones.map((zone, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#121215] border border-[#272730] flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#FF3366]/15 border border-[#FF3366]/30 text-[#FF3366] flex items-center justify-center font-bold text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white text-xs block truncate">{zone}</span>
                          <span className="text-[10px] text-neutral-400">Zona intervenida</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center rounded-2xl bg-[#18181D] border border-[#272730] text-neutral-500 text-xs">
            Selecciona un cliente de la lista para ver su expediente e historial completo.
          </div>
        )}
      </div>

      {/* MODAL: ALTA O EDICIÓN DE CLIENTE Y FICHA MÉDICA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-xl w-full shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {editingClient ? 'Editar Ficha y Expediente del Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mateo Morales"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">DNI / Cédula</label>
                  <input
                    type="text"
                    placeholder="Identificación"
                    value={formDni}
                    onChange={e => setFormDni(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+34 600 000 000"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Instagram (@handle)</label>
                  <input
                    type="text"
                    placeholder="@usuario"
                    value={formInstagram}
                    onChange={e => setFormInstagram(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#FF3366] mb-1">Alergias Conocidas</label>
                  <input
                    type="text"
                    placeholder="Látex, níquel, apósitos, antibióticos..."
                    value={formAllergies}
                    onChange={e => setFormAllergies(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-400 mb-1">Condiciones Médicas</label>
                  <input
                    type="text"
                    placeholder="Anticoagulantes, diabetes, queloides..."
                    value={formMedicalConditions}
                    onChange={e => setFormMedicalConditions(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Grupo Sanguíneo</label>
                  <input
                    type="text"
                    placeholder="Ej. O+, A-"
                    value={formBloodType}
                    onChange={e => setFormBloodType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Fecha Nacimiento</label>
                  <input
                    type="date"
                    value={formBirthDate}
                    onChange={e => setFormBirthDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Etiquetas (VIP, etc.)</label>
                  <input
                    type="text"
                    placeholder="VIP, Coleccionista..."
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Tipo de Piel & Notas de Cicatrización</label>
                <input
                  type="text"
                  placeholder="Ej. Piel sensible, tolera film adhesivo Dermalize, buena retención..."
                  value={formSkinNotes}
                  onChange={e => setFormSkinNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white"
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121215] border border-[#272730]">
                <input
                  type="checkbox"
                  id="modal-consent"
                  checked={formConsent}
                  onChange={e => setFormConsent(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF3366] bg-[#18181D] border-[#272730]"
                />
                <label htmlFor="modal-consent" className="text-xs text-neutral-300 cursor-pointer">
                  <span className="font-bold text-white">Consentimiento Informado Firmado</span> (Archivado en estudio)
                </label>
              </div>

              <div className="pt-4 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)]"
                >
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

