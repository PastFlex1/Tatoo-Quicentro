import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  FileText,
  DollarSign,
  Tag,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
  RefreshCw,
  Check,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Boxes,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Supplier, SupplierCategory } from '../../types';
import { consultarIdentificacion } from '../../services/sriService';
import { validarRucEcuatoriano } from '../../utils/cedulaValidator';

interface SuppliersViewProps {
  onOpenNewExpense?: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = () => {
  const {
    suppliers,
    expenses,
    inventory,
    formatMoney,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    setActiveTab,
  } = useStudio();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ACTIVO' | 'INACTIVO'>('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [formRuc, setFormRuc] = useState('');
  const [formRazonSocial, setFormRazonSocial] = useState('');
  const [formNombreComercial, setFormNombreComercial] = useState('');
  const [formCategoria, setFormCategoria] = useState<SupplierCategory>('insumos_tatuaje');
  const [formContactoNombre, setFormContactoNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formCiudad, setFormCiudad] = useState('QUITO');
  const [formDiasCredito, setFormDiasCredito] = useState<number>(15);
  const [formCupoCredito, setFormCupoCredito] = useState<number>(1500);
  const [formBancoNombre, setFormBancoNombre] = useState('Banco Pichincha');
  const [formBancoTipoCuenta, setFormBancoTipoCuenta] = useState<'CORRIENTE' | 'AHORROS'>('CORRIENTE');
  const [formBancoNumeroCuenta, setFormBancoNumeroCuenta] = useState('');
  const [formRetencionIva, setFormRetencionIva] = useState<number>(30);
  const [formRetencionRenta, setFormRetencionRenta] = useState<number>(1.75);
  const [formEstado, setFormEstado] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [formNotas, setFormNotas] = useState('');

  // SRI consultation state
  const [isSearchingSri, setIsSearchingSri] = useState(false);
  const [sriNotice, setSriNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setViewingSupplier(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute metrics per supplier (total purchases, matching items)
  const suppliersWithMetrics = useMemo(() => {
    return suppliers.map(sup => {
      const supRuc = sup.ruc.trim();
      const supNameClean = sup.razonSocial.toLowerCase().trim();
      const supTradeClean = (sup.nombreComercial || '').toLowerCase().trim();

      // Matching expenses
      const matchedExpenses = expenses.filter(exp => {
        if (exp.supplierRuc && exp.supplierRuc === supRuc) return true;
        const expSupClean = exp.supplier.toLowerCase().trim();
        return expSupClean.includes(supNameClean) || (supTradeClean && expSupClean.includes(supTradeClean));
      });

      const totalPurchases = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Matching inventory items
      const matchedItems = inventory.filter(item => {
        if (!item.supplier) return false;
        const itmSupClean = item.supplier.toLowerCase().trim();
        return itmSupClean.includes(supNameClean) || (supTradeClean && itmSupClean.includes(supTradeClean));
      });

      return {
        supplier: sup,
        totalPurchases,
        purchasesCount: matchedExpenses.length,
        itemsCount: matchedItems.length,
        matchedExpenses,
        matchedItems,
      };
    });
  }, [suppliers, expenses, inventory]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = suppliers.length;
    const activos = suppliers.filter(s => s.estado === 'ACTIVO').length;
    const totalComprado = suppliersWithMetrics.reduce((sum, s) => sum + s.totalPurchases, 0);
    const insumosVinculados = suppliersWithMetrics.reduce((sum, s) => sum + s.itemsCount, 0);

    return { total, activos, totalComprado, insumosVinculados };
  }, [suppliers, suppliersWithMetrics]);

  // Filtered List
  const filteredList = useMemo(() => {
    return suppliersWithMetrics.filter(({ supplier: s }) => {
      // Category filter
      if (filterCategory !== 'all' && s.categoria !== filterCategory) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && s.estado !== filterStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRuc = s.ruc.toLowerCase().includes(q);
        const matchesRazon = s.razonSocial.toLowerCase().includes(q);
        const matchesTrade = s.nombreComercial?.toLowerCase().includes(q) || false;
        const matchesContact = s.contactoNombre?.toLowerCase().includes(q) || false;
        const matchesPhone = s.telefono?.toLowerCase().includes(q) || false;
        const matchesCity = s.ciudad?.toLowerCase().includes(q) || false;

        if (!matchesRuc && !matchesRazon && !matchesTrade && !matchesContact && !matchesPhone && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [suppliersWithMetrics, filterCategory, filterStatus, searchQuery]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setFormRuc('');
    setFormRazonSocial('');
    setFormNombreComercial('');
    setFormCategoria('insumos_tatuaje');
    setFormContactoNombre('');
    setFormTelefono('');
    setFormEmail('');
    setFormDireccion('');
    setFormCiudad('QUITO');
    setFormDiasCredito(15);
    setFormCupoCredito(1500);
    setFormBancoNombre('Banco Pichincha');
    setFormBancoTipoCuenta('CORRIENTE');
    setFormBancoNumeroCuenta('');
    setFormRetencionIva(30);
    setFormRetencionRenta(1.75);
    setFormEstado('ACTIVO');
    setFormNotas('');
    setSriNotice(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormRuc(sup.ruc);
    setFormRazonSocial(sup.razonSocial);
    setFormNombreComercial(sup.nombreComercial || '');
    setFormCategoria(sup.categoria);
    setFormContactoNombre(sup.contactoNombre || '');
    setFormTelefono(sup.telefono || '');
    setFormEmail(sup.email || '');
    setFormDireccion(sup.direccion || '');
    setFormCiudad(sup.ciudad || 'QUITO');
    setFormDiasCredito(sup.diasCredito ?? 15);
    setFormCupoCredito(sup.cupoCredito ?? ((sup.diasCredito ?? 0) > 0 ? 1500 : 0));
    setFormBancoNombre(sup.bancoNombre || 'Banco Pichincha');
    setFormBancoTipoCuenta(sup.bancoTipoCuenta || 'CORRIENTE');
    setFormBancoNumeroCuenta(sup.bancoNumeroCuenta || '');
    setFormRetencionIva(sup.retencionIvaPorcentaje ?? 30);
    setFormRetencionRenta(sup.retencionRentaPorcentaje ?? 1.75);
    setFormEstado(sup.estado);
    setFormNotas(sup.notas || '');
    setSriNotice(null);
    setIsModalOpen(true);
  };

  // Consultar RUC en SRI
  const handleConsultarSri = async () => {
    const cleanRuc = formRuc.trim().replace(/\D/g, '');
    if (cleanRuc.length !== 13) {
      setSriNotice({ text: 'El RUC debe tener exactamente 13 dígitos numéricos.', type: 'error' });
      return;
    }

    const rucVal = validarRucEcuatoriano(cleanRuc);
    if (!rucVal.isValid) {
      setSriNotice({ text: rucVal.message || 'RUC inválido según algoritmo SRI.', type: 'error' });
      return;
    }

    setIsSearchingSri(true);
    setSriNotice(null);

    try {
      const data = await consultarIdentificacion(cleanRuc);
      if (data && (data.razonSocial || data.nombre)) {
        const legalName = (data.razonSocial || data.nombre || '').toUpperCase();
        setFormRazonSocial(legalName);
        if (data.nombreComercial) {
          setFormNombreComercial(data.nombreComercial.toUpperCase());
        }
        setSriNotice({
          text: `✓ RUC verificado en catastro SRI: ${legalName}`,
          type: 'success',
        });
      } else {
        setSriNotice({ text: 'RUC válido con estructura correcta en Ecuador.', type: 'success' });
      }
    } catch {
      setSriNotice({ text: 'Estructura de RUC válida (13 dígitos).', type: 'success' });
    } finally {
      setIsSearchingSri(false);
    }
  };

  // Save Supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanRuc = formRuc.trim().replace(/\D/g, '');
    if (cleanRuc.length !== 13) {
      alert('El RUC del proveedor debe contener exactamente 13 dígitos numéricos.');
      return;
    }

    if (!formRazonSocial.trim()) {
      alert('La Razón Social o Nombre Legal del proveedor es obligatoria.');
      return;
    }

    const payload = {
      ruc: cleanRuc,
      razonSocial: formRazonSocial.trim().toUpperCase(),
      nombreComercial: formNombreComercial.trim() || undefined,
      categoria: formCategoria,
      contactoNombre: formContactoNombre.trim() || undefined,
      telefono: formTelefono.trim() || undefined,
      email: formEmail.trim() || undefined,
      direccion: formDireccion.trim() || undefined,
      ciudad: formCiudad.trim().toUpperCase() || 'QUITO',
      diasCredito: formDiasCredito,
      cupoCredito: formDiasCredito > 0 ? Math.max(0, formCupoCredito) : 0,
      bancoNombre: formBancoNombre.trim() || undefined,
      bancoTipoCuenta: formBancoTipoCuenta,
      bancoNumeroCuenta: formBancoNumeroCuenta.trim() || undefined,
      retencionIvaPorcentaje: formRetencionIva,
      retencionRentaPorcentaje: formRetencionRenta,
      estado: formEstado,
      notas: formNotas.trim() || undefined,
    };

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, payload);
      alert(`✓ Proveedor "${payload.razonSocial}" actualizado con éxito.`);
    } else {
      addSupplier(payload);
      alert(`✓ Proveedor "${payload.razonSocial}" registrado exitosamente.`);
    }

    setIsModalOpen(false);
  };

  // Delete Supplier
  const handleDeleteSupplier = (sup: Supplier) => {
    if (confirm(`¿Estás seguro de eliminar al proveedor "${sup.razonSocial}"? Esta acción no se puede deshacer.`)) {
      deleteSupplier(sup.id);
      if (viewingSupplier?.id === sup.id) {
        setViewingSupplier(null);
      }
    }
  };

  const getCategoryBadge = (cat: SupplierCategory) => {
    switch (cat) {
      case 'insumos_tatuaje':
        return { label: 'Insumos Tatuaje', color: 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/30' };
      case 'joyeria_piercing':
        return { label: 'Joyería Piercing', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'bioseguridad':
        return { label: 'Bioseguridad', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'aftercare':
        return { label: 'Aftercare Vegano', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' };
      case 'alquiler':
        return { label: 'Arriendo Local', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'servicios':
        return { label: 'Servicios Básicos', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      default:
        return { label: 'Otros Gastos', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 space-y-5 max-w-7xl mx-auto animate-fadeIn">
      {/* =========================================================================
          HEADER & ACCIÓN PRINCIPAL
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase flex items-center gap-2">
                <span>Gestión de Proveedores & Distribuidores</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 normal-case">
                  Catálogo SRI
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Directorio oficial de proveedores de insumos de tatuaje, joyería estéril, material médico y servicios de C.C. Quicentro Shopping.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.3)] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Proveedor</span>
        </button>
      </div>

      {/* =========================================================================
          KPIS & RESUMEN DE COMPRAS
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#141417] border border-[#25252E]">
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Total Proveedores</span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">{kpis.total}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Catálogo registrado</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141417] border border-[#25252E]">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Proveedores Activos</span>
          <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">{kpis.activos}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Habilitados para compra</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141417] border border-[#25252E]">
          <span className="text-[10px] text-[#FF3366] uppercase font-semibold block">Compras / Gastos Totales</span>
          <span className="text-xl font-black text-[#FF3366] font-mono mt-0.5 block">{formatMoney(kpis.totalComprado)}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Histórico facturado</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141417] border border-[#25252E]">
          <span className="text-[10px] text-amber-300 uppercase font-semibold block">Insumos de Inventario</span>
          <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">{kpis.insumosVinculados}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Productos suministrados</span>
        </div>
      </div>

      {/* =========================================================================
          FILTROS Y BUSCADOR EN TIEMPO REAL
          ========================================================================= */}
      <div className="p-3.5 bg-[#141417] border border-[#24242A] rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por RUC, razón social, nombre comercial, contacto o ciudad..."
            className="w-full pl-9 pr-3 py-2 bg-[#1A1A20] border border-[#2B2B36] rounded-xl text-white placeholder-neutral-500 focus:border-[#FF3366] text-xs outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Categoría Selector */}
          <div className="flex items-center gap-1.5 bg-[#1A1A20] border border-[#2B2B36] px-3 py-1.5 rounded-xl">
            <Tag className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">Todas las Categorías</option>
              <option value="insumos_tatuaje">Insumos Tatuaje</option>
              <option value="joyeria_piercing">Joyería Piercing</option>
              <option value="bioseguridad">Bioseguridad</option>
              <option value="aftercare">Aftercare Vegano</option>
              <option value="alquiler">Arriendo / Alícuotas</option>
              <option value="servicios">Servicios Básicos</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          {/* Estado Selector */}
          <div className="flex items-center gap-1.5 bg-[#1A1A20] border border-[#2B2B36] px-3 py-1.5 rounded-xl">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="ACTIVO">Solo Activos</option>
              <option value="INACTIVO">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABLA HORIZONTAL MODERNA & TARJETAS MÓVILES DE PROVEEDORES
          ========================================================================= */}
      <div className="bg-[#141417] border border-[#24242A] rounded-2xl overflow-hidden shadow-xl">
        {/* Mobile Card List (md:hidden) */}
        <div className="md:hidden divide-y divide-[#202026]">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
              <p className="font-semibold text-white">No se encontraron proveedores</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                {searchQuery
                  ? `No hay proveedores que coincidan con "${searchQuery}".`
                  : 'No hay proveedores registrados con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            filteredList.map(({ supplier: sup, totalPurchases, purchasesCount, itemsCount }) => {
              const badge = getCategoryBadge(sup.categoria);
              return (
                <div key={`m-sup-${sup.id}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white text-xs block leading-snug">
                        {sup.nombreComercial || sup.razonSocial}
                      </span>
                      {sup.nombreComercial && (
                        <span className="text-[11px] text-neutral-400 block truncate max-w-xs">
                          {sup.razonSocial}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-neutral-300 bg-[#1A1A22] px-1.5 py-0.5 rounded border border-[#272730]">
                          {sup.ruc}
                        </span>
                        <span className="text-[10px] text-neutral-500">{sup.ciudad || 'Quito'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                          sup.estado === 'ACTIVO'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {sup.estado}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#1A1A20] p-2.5 rounded-xl border border-[#2B2B36] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Contacto:</span>
                      <span className="text-neutral-200 font-medium">{sup.contactoNombre || 'Ventas'}</span>
                    </div>
                    {sup.telefono && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400">Teléfono:</span>
                        <div className="flex items-center gap-2">
                          <a href={`tel:${sup.telefono}`} className="text-neutral-200 font-mono hover:underline">
                            {sup.telefono}
                          </a>
                          <a
                            href={`https://wa.me/593${sup.telefono.replace(/\D/g, '').replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    )}
                    {sup.bancoNombre && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#23232C]">
                        <span className="text-neutral-400">Transferencia:</span>
                        <span className="text-neutral-300 font-mono text-[10px] truncate max-w-[190px]">
                          {sup.bancoNombre} ({sup.bancoNumeroCuenta})
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#23232C]">
                      <span className="text-neutral-400">Condición Crédito:</span>
                      <span className="font-mono font-bold text-emerald-400 text-[10.5px]">
                        {(sup.diasCredito ?? 0) === 0
                          ? 'Contado ($0.00)'
                          : `${sup.diasCredito} días · Cupo: ${formatMoney(sup.cupoCredito ?? 0)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[9px] text-neutral-400 uppercase font-bold block">Compras Acumuladas</span>
                      <span className="font-mono font-bold text-white text-sm">{formatMoney(totalPurchases)}</span>
                      <span className="text-[10px] text-neutral-500 block">{purchasesCount} facturas · {itemsCount} insumos</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingSupplier(sup)}
                        className="p-2 rounded-xl bg-[#1A1A22] text-[#FF3366] border border-[#272730] hover:bg-[#252530] transition-colors cursor-pointer"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(sup)}
                        className="p-2 rounded-xl bg-[#1A1A22] text-blue-400 border border-[#272730] hover:bg-[#252530] transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(sup)}
                        className="p-2 rounded-xl bg-rose-500/10 text-[#FF3366] border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#24242A] bg-[#18181D] text-neutral-400 uppercase font-semibold text-[10px] tracking-wider whitespace-nowrap">
                <th className="py-3 px-4">RUC / SRI</th>
                <th className="py-3 px-4">Proveedor & Razón Social</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Contacto & Canales</th>
                <th className="py-3 px-4">Datos de Transferencia</th>
                <th className="py-3 px-4 text-center">Crédito</th>
                <th className="py-3 px-4 text-right">Compras Acumuladas</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202026]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
                    <p className="font-semibold text-white">No se encontraron proveedores</p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      {searchQuery
                        ? `No hay proveedores que coincidan con "${searchQuery}".`
                        : 'No hay proveedores registrados con los filtros seleccionados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map(({ supplier: sup, totalPurchases, purchasesCount, itemsCount, matchedExpenses, matchedItems }) => {
                  const badge = getCategoryBadge(sup.categoria);

                  return (
                    <tr
                      key={sup.id}
                      className="hover:bg-[#1A1A20] transition-colors group"
                    >
                      {/* RUC */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <span className="font-bold text-white bg-[#1A1A22] px-2 py-1 rounded-md border border-[#272730] inline-block">
                          {sup.ruc}
                        </span>
                        <span className="block text-[9.5px] text-neutral-500 mt-0.5">
                          {sup.ciudad || 'ECUADOR'}
                        </span>
                      </td>

                      {/* Razón Social & Nombre Comercial */}
                      <td className="py-3 px-4 min-w-[200px]">
                        <span className="font-bold text-white block text-xs group-hover:text-[#FF3366] transition-colors leading-snug">
                          {sup.razonSocial}
                        </span>
                        {sup.nombreComercial && (
                          <span className="text-[11px] text-[#FF3366] font-medium block mt-0.5">
                            {sup.nombreComercial}
                          </span>
                        )}
                        {sup.direccion && (
                          <span className="text-[10px] text-neutral-500 block truncate max-w-xs mt-0.5">
                            {sup.direccion}
                          </span>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${badge.color}`}>
                          {badge.label}
                        </span>
                        {itemsCount > 0 && (
                          <span className="block text-[10px] text-neutral-400 mt-1">
                            {itemsCount} {itemsCount === 1 ? 'insumo' : 'insumos'} en stock
                          </span>
                        )}
                      </td>

                      {/* Contacto & Canales */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-neutral-200 font-semibold block text-[11px]">
                          {sup.contactoNombre || 'Ventas Directas'}
                        </span>
                        {sup.telefono && (
                          <a
                            href={`tel:${sup.telefono}`}
                            className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-3 h-3 text-[#FF3366]" />
                            <span>{sup.telefono}</span>
                          </a>
                        )}
                        {sup.email && (
                          <span className="text-[10px] text-neutral-500 block truncate max-w-[150px]">
                            {sup.email}
                          </span>
                        )}
                      </td>

                      {/* Datos de Transferencia */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {sup.bancoNombre ? (
                          <div>
                            <span className="font-semibold text-white block text-[11px]">
                              {sup.bancoNombre}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                              {sup.bancoTipoCuenta === 'CORRIENTE' ? 'Cta. Cte.' : 'Cta. Ahorros'}: {sup.bancoNumeroCuenta || 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[10px] italic">No registrado</span>
                        )}
                      </td>

                      {/* Crédito */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {(sup.diasCredito ?? 0) === 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-800/80 border border-neutral-700 font-mono font-bold text-[10.5px] text-neutral-300">
                            Contado
                          </span>
                        ) : (
                          <div>
                            <span className="font-mono font-bold text-xs text-emerald-400 block">
                              {formatMoney(sup.cupoCredito ?? 0)}
                            </span>
                            <span className="inline-block text-[10px] font-mono font-semibold text-neutral-200 bg-[#1F1F27] px-1.5 py-0.2 rounded border border-[#2D2D3A] mt-0.5">
                              Plazo: {sup.diasCredito} días
                            </span>
                          </div>
                        )}
                        <span className="block text-[9.5px] text-neutral-500 mt-0.5">
                          Ret. IVA: {sup.retencionIvaPorcentaje ?? 30}%
                        </span>
                      </td>

                      {/* Compras Acumuladas */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono">
                        <span className="font-bold text-xs text-white block">
                          {formatMoney(totalPurchases)}
                        </span>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          {purchasesCount} {purchasesCount === 1 ? 'factura' : 'facturas'}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                            sup.estado === 'ACTIVO'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}
                        >
                          {sup.estado}
                        </span>
                      </td>

                      {/* Acciones Horizontales */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingSupplier(sup)}
                            className="p-1.5 rounded-lg bg-[#18181D] hover:bg-[#252530] text-neutral-300 hover:text-white border border-[#2B2B36] transition-all cursor-pointer"
                            title="Ver compras e insumos del proveedor"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#FF3366]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(sup)}
                            className="p-1.5 rounded-lg bg-[#18181D] hover:bg-[#252530] text-neutral-300 hover:text-white border border-[#2B2B36] transition-all cursor-pointer"
                            title="Editar proveedor"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(sup)}
                            className="p-1.5 rounded-lg bg-[#18181D] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-[#2B2B36] transition-all cursor-pointer"
                            title="Eliminar proveedor"
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
          MODAL 1: REGISTRAR / EDITAR PROVEEDOR (CON VALIDACIÓN SRI)
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 bg-[#141417] border-b border-[#25252E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366]">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {editingSupplier ? 'Editar Ficha de Proveedor' : 'Registrar Nuevo Proveedor'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Datos fiscales ecuatorianos según catastro del SRI y condiciones de pago.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSupplier} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
              {/* Sección 1: Identificación SRI */}
              <div className="p-3.5 bg-[#121215] border border-[#272730] rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#222228] pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FF3366]" />
                    <span>Identificación Fiscal del Proveedor (SRI Ecuador)</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">13 dígitos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* RUC Input with Search Button */}
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-neutral-300 mb-1">
                      RUC del Proveedor *
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        maxLength={13}
                        value={formRuc}
                        onChange={e => setFormRuc(e.target.value.replace(/\D/g, '').slice(0, 13))}
                        placeholder="1792345678001"
                        className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white font-mono focus:border-[#FF3366] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleConsultarSri}
                        disabled={isSearchingSri}
                        className="px-2.5 py-2 rounded-xl bg-[#22222A] hover:bg-[#2C2C36] text-white border border-[#2E2E38] shrink-0 transition-all cursor-pointer"
                        title="Consultar en SRI"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSearchingSri ? 'animate-spin text-[#FF3366]' : 'text-neutral-300'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Razón Social */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Razón Social (Nombre Legal Registrado en SRI) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formRazonSocial}
                      onChange={e => setFormRazonSocial(e.target.value)}
                      placeholder="KWADRON ECUADOR DISTRIBUCIONES S.A.S."
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white focus:border-[#FF3366] outline-none font-semibold uppercase"
                    />
                  </div>
                </div>

                {sriNotice && (
                  <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                    sriNotice.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {sriNotice.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{sriNotice.text}</span>
                  </div>
                )}
              </div>

              {/* Sección 2: Datos Comerciales & Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Nombre Comercial / Marca
                  </label>
                  <input
                    type="text"
                    value={formNombreComercial}
                    onChange={e => setFormNombreComercial(e.target.value)}
                    placeholder="Kwadron Ecuador Oficial"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Categoría de Insumos *
                  </label>
                  <select
                    value={formCategoria}
                    onChange={e => setFormCategoria(e.target.value as SupplierCategory)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none font-semibold cursor-pointer"
                  >
                    <option value="insumos_tatuaje">Insumos de Tatuaje (Agujas, Tintas, Grips)</option>
                    <option value="joyeria_piercing">Joyería de Piercing (Titanio ASTM F-136)</option>
                    <option value="bioseguridad">Bioseguridad & Material Médico</option>
                    <option value="aftercare">Aftercare / Curación Vegana</option>
                    <option value="alquiler">Alquiler Local & Alícuotas Quicentro</option>
                    <option value="servicios">Servicios Básicos (Luz, Internet, etc.)</option>
                    <option value="otros">Otros Gastos Generales</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Estado del Proveedor
                  </label>
                  <select
                    value={formEstado}
                    onChange={e => setFormEstado(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none font-semibold cursor-pointer"
                  >
                    <option value="ACTIVO">ACTIVO (Habilitado)</option>
                    <option value="INACTIVO">INACTIVO (Suspendido)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Persona de Contacto / Asesor
                  </label>
                  <input
                    type="text"
                    value={formContactoNombre}
                    onChange={e => setFormContactoNombre(e.target.value)}
                    placeholder="Sebastián Alarcón"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Teléfono / Celular de Pedidos
                  </label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={e => setFormTelefono(e.target.value)}
                    placeholder="+593 99 876 5432"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Correo Electrónico (Facturación)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="ventas@kwadronecuador.ec"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Dirección Física del Proveedor
                  </label>
                  <input
                    type="text"
                    value={formDireccion}
                    onChange={e => setFormDireccion(e.target.value)}
                    placeholder="Av. 10 de Agosto N31-140 y Mariana de Jesús"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Ciudad / Cantón
                  </label>
                  <input
                    type="text"
                    value={formCiudad}
                    onChange={e => setFormCiudad(e.target.value.toUpperCase())}
                    placeholder="QUITO"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none font-semibold uppercase"
                  />
                </div>
              </div>

              {/* Sección 3: Condiciones de Crédito Comercial & Cupo Asignado */}
              <div className="p-3.5 bg-[#121215] border border-[#272730] rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222228] pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Condiciones de Crédito Comercial (Días y Cantidad de Crédito)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    {formDiasCredito === 0
                      ? 'Modalidad: Pago de Contado'
                      : `Crédito: ${formDiasCredito} días · Cupo: ${formatMoney(formCupoCredito)}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Días de Crédito */}
                  <div className="p-3 bg-[#17171C] border border-[#2B2B36] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-neutral-200 text-xs">
                        Días de Crédito (Plazo de Pago)
                      </label>
                      <span className="text-[10px] text-neutral-400 font-mono">0 = Contado</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="180"
                        value={formDiasCredito}
                        onChange={e => {
                          const days = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setFormDiasCredito(days);
                          if (days === 0) {
                            setFormCupoCredito(0);
                          } else if (formCupoCredito === 0) {
                            setFormCupoCredito(1500);
                          }
                        }}
                        placeholder="Ej: 15, 30, 60"
                        className="w-full px-3 py-2 pr-14 bg-[#121215] border border-[#2B2B36] rounded-xl text-white font-mono font-bold text-sm focus:border-[#FF3366] outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-neutral-400 pointer-events-none">
                        días
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        { label: 'Contado (0d)', value: 0 },
                        { label: '15 días', value: 15 },
                        { label: '30 días', value: 30 },
                        { label: '45 días', value: 45 },
                        { label: '60 días', value: 60 },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setFormDiasCredito(opt.value);
                            if (opt.value === 0) {
                              setFormCupoCredito(0);
                            } else if (formCupoCredito === 0) {
                              setFormCupoCredito(1500);
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                            formDiasCredito === opt.value
                              ? 'bg-[#FF3366]/20 text-[#FF3366] border-[#FF3366]/40'
                              : 'bg-[#121215] text-neutral-400 border-[#25252E] hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cantidad / Cupo de Crédito ($ USD) */}
                  <div className="p-3 bg-[#17171C] border border-[#2B2B36] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-neutral-200 text-xs">
                        Cantidad / Cupo de Crédito ($ USD)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">Monto máximo</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-400 pointer-events-none">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        disabled={formDiasCredito === 0}
                        value={formDiasCredito === 0 ? 0 : formCupoCredito}
                        onChange={e => setFormCupoCredito(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="Ej: 1500.00"
                        className="w-full pl-7 pr-14 py-2 bg-[#121215] border border-[#2B2B36] rounded-xl text-emerald-400 font-mono font-bold text-sm focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-neutral-400 pointer-events-none">
                        USD
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[500, 1500, 2500, 3500, 5000].map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            if (formDiasCredito === 0) setFormDiasCredito(15);
                            setFormCupoCredito(amount);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                            formDiasCredito > 0 && formCupoCredito === amount
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-[#121215] text-neutral-400 border-[#25252E] hover:text-white'
                          }`}
                        >
                          ${amount.toLocaleString('en-US')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 4: Datos Bancarios & Retenciones SRI */}
              <div className="p-3.5 bg-[#121215] border border-[#272730] rounded-2xl space-y-3">
                <span className="font-bold text-white text-xs flex items-center gap-1.5 border-b border-[#222228] pb-2">
                  <CreditCard className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span>Datos Bancarios para Transferencias & Retenciones SRI</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Banco del Proveedor
                    </label>
                    <select
                      value={formBancoNombre}
                      onChange={e => setFormBancoNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white focus:border-[#FF3366] outline-none cursor-pointer"
                    >
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Banco Guayaquil">Banco Guayaquil</option>
                      <option value="Produbanco">Produbanco</option>
                      <option value="Banco del Pacífico">Banco del Pacífico</option>
                      <option value="Banco Bolivariano">Banco Bolivariano</option>
                      <option value="Banco Internacional">Banco Internacional</option>
                      <option value="Cooperativa JEP">Cooperativa JEP</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={formBancoTipoCuenta}
                      onChange={e => setFormBancoTipoCuenta(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white focus:border-[#FF3366] outline-none cursor-pointer"
                    >
                      <option value="CORRIENTE">Cuenta Corriente</option>
                      <option value="AHORROS">Cuenta de Ahorros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Número de Cuenta Bancaria
                    </label>
                    <input
                      type="text"
                      value={formBancoNumeroCuenta}
                      onChange={e => setFormBancoNumeroCuenta(e.target.value.replace(/\D/g, ''))}
                      placeholder="2100458923"
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white font-mono focus:border-[#FF3366] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-neutral-300 mb-1">
                      % Retención IVA Sugerida
                    </label>
                    <select
                      value={formRetencionIva}
                      onChange={e => setFormRetencionIva(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white font-mono focus:border-[#FF3366] outline-none cursor-pointer"
                    >
                      <option value="30">30% (Bienes / Insumos)</option>
                      <option value="70">70% (Servicios)</option>
                      <option value="100">100% (Honorarios / Liquidación)</option>
                      <option value="0">0% (Sin retención / Especial)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-neutral-300 mb-1">
                      % Retención Renta Sugerida
                    </label>
                    <select
                      value={formRetencionRenta}
                      onChange={e => setFormRetencionRenta(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#17171C] border border-[#2B2B36] rounded-xl text-white font-mono focus:border-[#FF3366] outline-none cursor-pointer"
                    >
                      <option value="1.75">1.75% (Transferencia Bienes Corporales)</option>
                      <option value="2.75">2.75% (Servicios Generales)</option>
                      <option value="8">8% (Arrendamiento Mercantil Inmuebles)</option>
                      <option value="10">10% (Honorarios Profesionales)</option>
                      <option value="0">0% (Exento)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Notas / Observaciones del Proveedor
                </label>
                <textarea
                  rows={2}
                  value={formNotas}
                  onChange={e => setFormNotas(e.target.value)}
                  placeholder="Detalles sobre tiempos de entrega en Quicentro, pedido mínimo, descuentos por volumen..."
                  className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none leading-relaxed"
                />
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                >
                  {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EXPEDIENTE / DOSSIER COMPLETO DEL PROVEEDOR
          ========================================================================= */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 bg-[#141417] border-b border-[#25252E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366]">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">
                      {viewingSupplier.razonSocial}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(viewingSupplier.categoria).color}`}>
                      {getCategoryBadge(viewingSupplier.categoria).label}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    RUC: <strong className="text-white font-mono">{viewingSupplier.ruc}</strong>
                    {viewingSupplier.nombreComercial && ` • ${viewingSupplier.nombreComercial}`}
                    {` • ${viewingSupplier.ciudad || 'QUITO'}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dossier Content */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs">
              {/* Resumen Comercial */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-[#121215] rounded-xl border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block font-semibold">Días de Crédito</span>
                  <span className="text-sm font-bold text-white block mt-0.5 font-mono">
                    {(viewingSupplier.diasCredito ?? 0) === 0 ? 'Pago de Contado' : `${viewingSupplier.diasCredito} días de plazo`}
                  </span>
                </div>

                <div className="p-3 bg-[#121215] rounded-xl border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block font-semibold">Cupo de Crédito ($)</span>
                  <span className="text-sm font-bold text-emerald-400 block mt-0.5 font-mono">
                    {(viewingSupplier.diasCredito ?? 0) === 0
                      ? '$0.00 (Contado)'
                      : formatMoney(viewingSupplier.cupoCredito ?? 0)}
                  </span>
                </div>

                <div className="p-3 bg-[#121215] rounded-xl border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block font-semibold">Retención IVA</span>
                  <span className="text-sm font-bold text-emerald-400 block mt-0.5 font-mono">
                    {viewingSupplier.retencionIvaPorcentaje ?? 30}%
                  </span>
                </div>

                <div className="p-3 bg-[#121215] rounded-xl border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block font-semibold">Retención Renta</span>
                  <span className="text-sm font-bold text-amber-300 block mt-0.5 font-mono">
                    {viewingSupplier.retencionRentaPorcentaje ?? 1.75}%
                  </span>
                </div>

                <div className="p-3 bg-[#121215] rounded-xl border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block font-semibold">Estado Operativo</span>
                  <span className="text-sm font-bold text-white block mt-0.5">
                    {viewingSupplier.estado}
                  </span>
                </div>
              </div>

              {/* Datos Bancarios y Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#121215] rounded-2xl border border-[#272730] space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5 border-b border-[#222228] pb-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#FF3366]" />
                    <span>Contacto y Notificaciones</span>
                  </span>
                  <div className="space-y-1 text-neutral-300">
                    <p>Asesor: <strong className="text-white">{viewingSupplier.contactoNombre || 'N/A'}</strong></p>
                    <p>Teléfono: <strong className="text-white font-mono">{viewingSupplier.telefono || 'N/A'}</strong></p>
                    <p>Email: <strong className="text-white">{viewingSupplier.email || 'N/A'}</strong></p>
                    <p>Dirección: <strong className="text-neutral-200">{viewingSupplier.direccion || 'Quito, Ecuador'}</strong></p>
                  </div>
                </div>

                <div className="p-4 bg-[#121215] rounded-2xl border border-[#272730] space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5 border-b border-[#222228] pb-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#FF3366]" />
                    <span>Datos Bancarios para Pagos</span>
                  </span>
                  <div className="space-y-1 text-neutral-300">
                    <p>Institución: <strong className="text-white">{viewingSupplier.bancoNombre || 'Banco Pichincha'}</strong></p>
                    <p>Tipo de Cuenta: <strong className="text-white">{viewingSupplier.bancoTipoCuenta || 'CORRIENTE'}</strong></p>
                    <p>Número de Cuenta: <strong className="text-[#FF3366] font-mono text-sm">{viewingSupplier.bancoNumeroCuenta || 'N/A'}</strong></p>
                    <p>Titular / Beneficiario: <strong className="text-neutral-200">{viewingSupplier.razonSocial}</strong></p>
                  </div>
                </div>
              </div>

              {/* Facturas de Compras / Gastos Asociados */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#24242A]">
                  <h4 className="font-bold text-white text-xs uppercase flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#FF3366]" />
                    <span>Historial de Compras & Facturas Registradas</span>
                  </h4>
                </div>

                {(() => {
                  const matchedExp = expenses.filter(exp => {
                    if (exp.supplierRuc && exp.supplierRuc === viewingSupplier.ruc) return true;
                    const expSup = exp.supplier.toLowerCase().trim();
                    const sName = viewingSupplier.razonSocial.toLowerCase().trim();
                    const sTrade = (viewingSupplier.nombreComercial || '').toLowerCase().trim();
                    return expSup.includes(sName) || (sTrade && expSup.includes(sTrade));
                  });

                  if (matchedExp.length === 0) {
                    return (
                      <div className="p-6 text-center bg-[#121215] rounded-xl border border-[#272730] mt-3 text-neutral-400">
                        <FileText className="w-7 h-7 mx-auto mb-1 opacity-50" />
                        <p className="font-semibold text-white">No hay facturas de compras registradas</p>
                        <p className="text-[11px] mt-0.5">Cuando registres un gasto con este proveedor, aparecerá aquí automáticamente.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 border border-[#272730] rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#18181D] text-neutral-400 uppercase text-[9.5px] border-b border-[#25252E]">
                            <th className="py-2.5 px-3">Fecha</th>
                            <th className="py-2.5 px-3">Descripción de Compra</th>
                            <th className="py-2.5 px-3">N° Factura</th>
                            <th className="py-2.5 px-3">Método Pago</th>
                            <th className="py-2.5 px-3 text-right">Total Facturado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202026]">
                          {matchedExp.map(exp => (
                            <tr key={exp.id} className="hover:bg-[#1A1A20]">
                              <td className="py-2.5 px-3 font-mono text-neutral-300">{exp.date.split('T')[0]}</td>
                              <td className="py-2.5 px-3 text-white font-medium">{exp.description}</td>
                              <td className="py-2.5 px-3 font-mono text-neutral-400">{exp.invoiceReference || 'S/N'}</td>
                              <td className="py-2.5 px-3 uppercase text-neutral-300 text-[10px]">
                                {exp.paymentMethod.replace('_', ' ')}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-white text-right">
                                {formatMoney(exp.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Insumos de Inventario Suministrados */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#24242A]">
                  <h4 className="font-bold text-white text-xs uppercase flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-400" />
                    <span>Insumos & Artículos Suministrados en Inventario</span>
                  </h4>
                </div>

                {(() => {
                  const matchedItems = inventory.filter(item => {
                    if (!item.supplier) return false;
                    const itmSup = item.supplier.toLowerCase().trim();
                    const sName = viewingSupplier.razonSocial.toLowerCase().trim();
                    const sTrade = (viewingSupplier.nombreComercial || '').toLowerCase().trim();
                    return itmSup.includes(sName) || (sTrade && itmSup.includes(sTrade));
                  });

                  if (matchedItems.length === 0) {
                    return (
                      <div className="p-6 text-center bg-[#121215] rounded-xl border border-[#272730] mt-3 text-neutral-400">
                        <Boxes className="w-7 h-7 mx-auto mb-1 opacity-50" />
                        <p className="font-semibold text-white">No hay insumos vinculados en inventario</p>
                        <p className="text-[11px] mt-0.5">En el módulo de Inventario puedes seleccionar este proveedor para sus artículos.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 border border-[#272730] rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#18181D] text-neutral-400 uppercase text-[9.5px] border-b border-[#25252E]">
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Artículo / Insumo</th>
                            <th className="py-2.5 px-3">Categoría</th>
                            <th className="py-2.5 px-3 text-center">Stock Actual</th>
                            <th className="py-2.5 px-3 text-right">Costo Unitario</th>
                            <th className="py-2.5 px-3 text-right">PVP Venta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202026]">
                          {matchedItems.map(item => (
                            <tr key={item.id} className="hover:bg-[#1A1A20]">
                              <td className="py-2.5 px-3 font-mono text-neutral-400">{item.sku || 'N/A'}</td>
                              <td className="py-2.5 px-3 font-bold text-white">{item.name}</td>
                              <td className="py-2.5 px-3 text-neutral-400 capitalize">{item.category}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-center text-emerald-400">
                                {item.currentStock} {item.unit}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-neutral-300 text-right">
                                {formatMoney(item.unitCost)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-white text-right">
                                {formatMoney(item.retailPrice || item.priceWithVat || item.unitCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 pb-4 px-6 border-t border-[#25252E] flex justify-between items-center bg-[#141417]">
              <button
                type="button"
                onClick={() => {
                  setViewingSupplier(null);
                  handleOpenEditModal(viewingSupplier);
                }}
                className="px-4 py-2 rounded-xl bg-[#202028] hover:bg-[#2B2B36] text-white font-semibold text-xs flex items-center gap-1.5 border border-[#2B2B38] cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Editar Ficha</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="px-5 py-2 rounded-xl bg-[#252530] hover:bg-[#30303E] text-white font-semibold text-xs cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
