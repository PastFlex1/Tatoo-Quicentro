import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  ShieldCheck,
  CreditCard,
  Palette,
  Package,
  BookOpen,
  Edit2,
  Trash2,
  Lock,
  KeyRound,
  CheckCircle2,
  X,
  Phone,
  Mail,
  LogIn,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SystemRole, SystemUser, UserRole } from '../../types';
import { ADMIN_ROLE_ID, PERMISSION_MODULES } from '../../data/permissions';
import { NewUserModal } from './NewUserModal';
import { RoleEditorModal } from './RoleEditorModal';
import { Copy } from 'lucide-react';
import { UserSwitcherModal } from './UserSwitcherModal';

export const UsersView: React.FC = () => {
  const {
    users,
    currentUser,
    switchUser,
    deleteUser,
    updateUser,
    roles,
    getRole,
    can,
    addRole,
    updateRole,
    deleteRole,
  } = useStudio();

  // Pestaña activa del módulo
  const [view, setView] = useState<'users' | 'roles'>('users');
  // Editor de roles: role = editar, template = duplicar, ambos null = nuevo
  const [roleModal, setRoleModal] = useState<{ role: SystemRole | null; template: SystemRole | null } | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<SystemUser | null>(null);
  const [isSwitcherModalOpen, setIsSwitcherModalOpen] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<SystemUser | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch =
        user.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.cedula && user.cedula.includes(searchTerm));

      const matchRole = roleFilter === 'all' || user.rol === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalUsers = users.length;
    const admins = users.filter(u => u.rol === 'ADMIN').length;
    const cashiers = users.filter(u => u.rol === 'CAJERO_RECEPCION').length;
    const artistsAndWarehouse = users.filter(u => u.rol === 'ARTISTA' || u.rol === 'BODEGA').length;

    return { totalUsers, admins, cashiers, artistsAndWarehouse };
  }, [users]);

  const getRoleBadge = (rol: UserRole) => {
    const role = getRole(rol);
    const icon =
      rol === ADMIN_ROLE_ID
        ? ShieldCheck
        : rol === 'CAJERO_RECEPCION'
        ? CreditCard
        : rol === 'ARTISTA'
        ? Palette
        : rol === 'BODEGA'
        ? Package
        : rol === 'CONTADOR'
        ? BookOpen
        : Shield;
    return {
      label: role?.name || `${rol} (rol eliminado)`,
      icon,
      className: 'border',
      color: role?.color || '#64748B',
    };
  };

  const handleSaveRole = (data: { name: string; description: string; color: string; permissions: string[] }) => {
    if (!roleModal) return;
    if (roleModal.role) updateRole(roleModal.role.id, data);
    else addRole(data);
    setRoleModal(null);
    setSuccessNotice(roleModal.role ? `Rol "${data.name}" actualizado.` : `Rol "${data.name}" creado.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleDeleteRole = (role: SystemRole) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    const res = deleteRole(role.id);
    if (!res.ok) {
      setRoleError(res.error || 'No se pudo eliminar el rol.');
      setTimeout(() => setRoleError(null), 5000);
    }
  };

  const totalPermissions = PERMISSION_MODULES.reduce((acc, m) => acc + m.actions.length, 0);

  const handleQuickSwitch = (u: SystemUser) => {
    // Usuarios con PIN: abrir el modal para que se ingrese el PIN
    if (u.pin) {
      setSwitchTarget(u);
      setIsSwitcherModalOpen(true);
      return;
    }
    if (!switchUser(u.id)) return;
    setSuccessNotice(`Sesión cambiada a @${u.username} (${u.nombres} ${u.apellidos})`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleToggleStatus = (u: SystemUser) => {
    if (u.id === currentUser.id) {
      alert('No puedes desactivar el usuario con el que estás conectado actualmente.');
      return;
    }
    const newStatus = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    updateUser(u.id, { estado: newStatus });
  };

  const handleDeleteUser = (u: SystemUser) => {
    if (u.id === currentUser.id) {
      alert('No puedes eliminar el usuario con el que estás conectado actualmente.');
      return;
    }
    if (users.length <= 1) {
      alert('No se puede eliminar el único usuario del sistema.');
      return;
    }
    if (window.confirm(`¿Está seguro de eliminar al usuario @${u.username} (${u.nombres} ${u.apellidos})?`)) {
      deleteUser(u.id);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Toast Banner */}
      {successNotice && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center text-[#FF3366] shadow-[0_0_15px_rgba(255,51,102,0.15)]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Gestión de Usuarios, Roles & Permisos
              </h2>
              <p className="text-xs text-neutral-400">
                Control de perfiles de acceso para administradores, cajeros, recepcionistas, artistas y bodegueros
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSwitcherModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1C1C24] hover:bg-[#252530] text-neutral-300 hover:text-white text-xs font-bold border border-[#2B2B38] transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-[#FF3366]" />
            <span>Cambiar de Usuario</span>
          </button>

          {can('users.manage_roles') && (
            <button
              type="button"
              onClick={() => {
                setView('roles');
                setRoleModal({ role: null, template: null });
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1C1C24] hover:bg-[#252530] text-white text-xs font-bold border border-[#FF3366]/50 transition-all cursor-pointer whitespace-nowrap"
            >
              <Shield className="w-4 h-4 text-[#FF3366]" />
              <span>Nuevo Rol</span>
            </button>
          )}

          {can('users.create') && (
            <button
              type="button"
              onClick={() => {
                setUserToEdit(null);
                setIsNewModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF3366] text-white text-xs font-bold hover:bg-[#e02958] transition-all shadow-[0_0_20px_rgba(255,51,102,0.35)] active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Total Usuarios
            </div>
            <div className="text-xl font-black text-white font-mono mt-0.5">
              {kpis.totalUsers}
            </div>
          </div>
        </div>

        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Administradores
            </div>
            <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
              {kpis.admins}
            </div>
          </div>
        </div>

        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Caja & Recepción
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {kpis.cashiers}
            </div>
          </div>
        </div>

        <div className="bg-[#17171C] border border-[#24242F] p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Artistas & Bodega
            </div>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
              {kpis.artistsAndWarehouse}
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas: Usuarios | Roles y permisos */}
      <div className="flex gap-1 bg-[#17171C] border border-[#24242F] p-1 rounded-2xl w-full sm:w-fit">
        {[
          { id: 'users', label: `Usuarios (${users.length})` },
          { id: 'roles', label: `Roles y permisos (${roles.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id as 'users' | 'roles')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              view === t.id ? 'bg-[#FF3366] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'roles' && (
        <div className="space-y-3">
          {roleError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {roleError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {roles.map(r => {
              const isAdmin = r.id === ADMIN_ROLE_ID;
              const permCount = isAdmin ? totalPermissions : r.permissions.length;
              const modulesOn = PERMISSION_MODULES.filter(m => isAdmin || r.permissions.includes(`${m.id}.view`));
              const assigned = users.filter(u => u.rol === r.id).length;
              return (
                <div key={r.id} className="bg-[#17171C] border border-[#24242F] rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: r.color || '#64748B' }} />
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                          {r.name}
                          {isAdmin && <Lock className="w-3.5 h-3.5 text-amber-300" />}
                        </div>
                        <div className="text-[11px] text-neutral-400 line-clamp-2">{r.description || 'Sin descripción'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#252530] rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${(permCount / totalPermissions) * 100}%`, background: r.color || '#64748B' }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>
                      {permCount}/{totalPermissions} permisos · {modulesOn.length} módulos
                    </span>
                    <span>{assigned} usuario(s)</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate" title={modulesOn.map(m => m.label).join(', ')}>
                    {modulesOn.map(m => m.label).join(' · ') || 'Sin módulos'}
                  </div>
                  <div className="flex gap-1.5 mt-auto pt-1">
                    <button
                      onClick={() => setRoleModal({ role: r, template: null })}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#24242F] hover:bg-[#2F2F3D] text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isAdmin || !can('users.manage_roles') ? <Eye className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      {isAdmin || !can('users.manage_roles') ? 'Ver permisos' : 'Editar'}
                    </button>
                    {can('users.manage_roles') && (
                      <button
                        onClick={() => setRoleModal({ role: null, template: r })}
                        className="px-3 py-1.5 rounded-lg bg-[#24242F] hover:bg-[#2F2F3D] text-neutral-300 text-xs cursor-pointer"
                        title="Duplicar como nuevo rol"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {can('users.manage_roles') && !isAdmin && (
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="px-3 py-1.5 rounded-lg bg-[#24242F] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 text-xs cursor-pointer"
                        title="Eliminar rol"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {can('users.manage_roles') && (
              <button
                onClick={() => setRoleModal({ role: null, template: null })}
                className="border-2 border-dashed border-[#2B2B38] hover:border-[#FF3366]/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-white cursor-pointer min-h-[180px]"
              >
                <Plus className="w-6 h-6 text-[#FF3366]" />
                <span className="text-xs font-bold">Crear nuevo rol</span>
                <span className="text-[10px] text-neutral-500">Defina permisos por módulo y por acción</span>
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'users' && (
      <>
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#17171C] border border-[#24242F] p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nombre, Apellido, @usuario o Cédula..."
            className="w-full bg-[#121215] border border-[#24242F] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF3366] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[{ id: 'all', label: 'Todos' }, ...roles.map(r => ({ id: r.id, label: r.name }))].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                roleFilter === tab.id
                  ? 'bg-[#FF3366] text-white shadow-[0_0_12px_rgba(255,51,102,0.3)]'
                  : 'bg-[#121215] text-neutral-400 hover:text-white hover:bg-[#202027]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Users Table */}
      <div className="bg-[#17171C] border border-[#24242F] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#121215] text-neutral-400 font-bold border-b border-[#24242F] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Usuario & Credencial</th>
                <th className="py-3.5 px-4">Rol en el Estudio</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4">Permisos & Módulos</th>
                <th className="py-3.5 px-4 text-center">PIN</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24242F]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <Users className="w-10 h-10 mx-auto text-neutral-600 mb-2 opacity-50" />
                    <p className="font-semibold text-neutral-400">No se encontraron usuarios</p>
                    <p className="text-[11px] text-neutral-600 mt-1">
                      Intente ajustando los filtros de búsqueda o cree un nuevo usuario.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isCurrent = user.id === currentUser.id;
                  const roleBadge = getRoleBadge(user.rol);
                  const Icon = roleBadge.icon;
                  const userRole = getRole(user.rol);
                  const userPermCount = user.rol === ADMIN_ROLE_ID ? totalPermissions : userRole?.permissions.length || 0;
                  const userModules = PERMISSION_MODULES.filter(
                    m => user.rol === ADMIN_ROLE_ID || userRole?.permissions.includes(`${m.id}.view`)
                  );

                  return (
                    <tr key={user.id} className="hover:bg-[#1C1C24]/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#141419] border border-[#2B2B38] flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {user.nombres.slice(0, 1)}
                            {user.apellidos.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">
                                {user.nombres} {user.apellidos}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold text-[#FF3366] bg-[#FF3366]/15 px-1.5 py-0.5 rounded-md border border-[#FF3366]/30">
                                  SESIÓN ACTIVA
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              @{user.username} {user.cedula && `• CI: ${user.cedula}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${roleBadge.className}`}
                          style={{ color: roleBadge.color, background: `${roleBadge.color}22`, borderColor: `${roleBadge.color}55` }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <p className="text-neutral-300 font-medium">{user.email}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{user.telefono || 'Sin teléfono'}</p>
                      </td>

                      {/* Permissions preview */}
                      <td className="py-3 px-4">
                        <div className="text-neutral-300 font-medium">
                          {userModules.length} módulos · {userPermCount} permisos
                        </div>
                        <div className="text-[10px] text-neutral-500 truncate max-w-[200px]" title={userModules.map(m => m.label).join(', ')}>
                          {userModules.slice(0, 3).map(m => m.label).join(', ')}
                          {userModules.length > 3 ? '…' : ''}
                        </div>
                      </td>

                      {/* PIN */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-neutral-400 font-bold tracking-widest text-xs">
                          {user.pin ? '••••' : 'Ninguno'}
                        </span>
                      </td>

                      {/* State */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={!can('users.toggle_status')}
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            user.estado === 'ACTIVO'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-500/15 text-neutral-500 border border-neutral-500/30'
                          }`}
                        >
                          {user.estado}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Switch */}
                          {!isCurrent && user.estado === 'ACTIVO' && (
                            <button
                              type="button"
                              onClick={() => handleQuickSwitch(user)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title={`Acceder como @${user.username}`}
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Acceder</span>
                            </button>
                          )}

                          {/* Edit */}
                          {can('users.edit') && (
                          <button
                            type="button"
                            onClick={() => {
                              setUserToEdit(user);
                              setIsNewModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-[#24242F] hover:bg-[#2F2F3D] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                            title="Editar Datos & Rol"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          )}

                          {/* Delete */}
                          {!isCurrent && can('users.delete') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg bg-[#24242F] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Eliminar Usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      </>
      )}

      {roleModal && (
        <RoleEditorModal
          key={`${roleModal.role?.id || 'new'}-${roleModal.template?.id || ''}`}
          isOpen
          role={roleModal.role}
          readOnly={!can('users.manage_roles')}
          template={roleModal.template}
          existingNames={roles.filter(r => r.id !== roleModal.role?.id).map(r => r.name)}
          onClose={() => setRoleModal(null)}
          onSave={handleSaveRole}
        />
      )}

      {/* Modal 1: Nuevo / Editar Usuario */}
      <NewUserModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        userToEdit={userToEdit}
      />

      {/* Modal 2: Selector Rápido de Usuario */}
      <UserSwitcherModal
        isOpen={isSwitcherModalOpen}
        onClose={() => {
          setIsSwitcherModalOpen(false);
          setSwitchTarget(null);
        }}
        preselectedUser={switchTarget}
      />
    </div>
  );
};

