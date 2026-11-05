/**
 * Catálogo de permisos del sistema.
 *
 * Cada permiso es `modulo.accion`. El permiso `modulo.view` controla si el módulo aparece
 * en el menú; las demás acciones controlan cada botón u operación dentro del módulo.
 */
import { SystemRole } from '../types';

export interface PermissionAction {
  key: string; // ej. 'sales.credit_note'
  label: string;
  description?: string;
  /** Acciones sensibles se destacan en la matriz */
  sensitive?: boolean;
}

export interface PermissionModule {
  id: string; // = id del módulo / pestaña
  label: string;
  group: 'Operación' | 'Facturación' | 'Compras e Inventario' | 'Finanzas y Contabilidad' | 'Administración';
  actions: PermissionAction[];
}

const a = (module: string, action: string, label: string, sensitive = false, description?: string): PermissionAction => ({
  key: `${module}.${action}`,
  label,
  sensitive,
  description,
});

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    label: 'Tablero General',
    group: 'Operación',
    actions: [a('dashboard', 'view', 'Ver tablero'), a('dashboard', 'view_financials', 'Ver cifras financieras (ventas, márgenes)', true)],
  },
  {
    id: 'pos',
    label: 'Terminal POS / Cobro',
    group: 'Operación',
    actions: [
      a('pos', 'view', 'Abrir el POS'),
      a('pos', 'charge', 'Cobrar y emitir comprobantes'),
      a('pos', 'discount', 'Aplicar descuentos', true),
      a('pos', 'change_price', 'Modificar el precio de citas y productos', true),
      a('pos', 'change_commission', 'Modificar % de comisión en la venta', true),
      a('pos', 'change_tax', 'Cambiar tarifa de IVA', true),
    ],
  },
  {
    id: 'clients',
    label: 'Historial Clientes',
    group: 'Operación',
    actions: [
      a('clients', 'view', 'Ver clientes'),
      a('clients', 'create', 'Crear clientes'),
      a('clients', 'edit', 'Editar clientes'),
      a('clients', 'delete', 'Eliminar clientes', true),
      a('clients', 'view_medical', 'Ficha de salud, nómina de alergias y cartas de consentimiento', true),
      a('clients', 'export', 'Exportar datos de clientes', true),
    ],
  },
  {
    id: 'gallery',
    label: 'Galería de Fotos',
    group: 'Operación',
    actions: [a('gallery', 'view', 'Ver galería'), a('gallery', 'upload', 'Subir fotos'), a('gallery', 'delete', 'Eliminar fotos', true)],
  },
  {
    id: 'appointments',
    label: 'Agenda de Citas',
    group: 'Operación',
    actions: [
      a('appointments', 'view', 'Ver agenda'),
      a('appointments', 'view_all', 'Ver citas de todos los artistas'),
      a('appointments', 'create', 'Agendar citas'),
      a('appointments', 'edit', 'Cambiar estado de citas (confirmar, en cabina, completar)'),
      a('appointments', 'cancel', 'Cancelar, marcar no asistió o eliminar citas', true),
    ],
  },
  {
    id: 'proformas',
    label: 'Cotizaciones & Proformas',
    group: 'Facturación',
    actions: [
      a('proformas', 'view', 'Ver proformas'),
      a('proformas', 'create', 'Crear proformas'),
      a('proformas', 'delete', 'Eliminar proformas', true),
      a('proformas', 'convert', 'Convertir proforma en factura'),
    ],
  },
  {
    id: 'sales',
    label: 'Facturación & Comprobantes',
    group: 'Facturación',
    actions: [
      a('sales', 'view', 'Ver comprobantes'),
      a('sales', 'create', 'Registrar venta manual'),
      a('sales', 'print', 'Imprimir / reimprimir comprobantes'),
      a('sales', 'send_sri', 'Enviar / reintentar envío al SRI'),
      a('sales', 'view_xml', 'Ver y descargar XML'),
      a('sales', 'credit_note', 'Emitir notas de crédito (anular / devolver)', true),
      a('sales', 'void', 'Anular facturas a consumidor final y notas de venta', true, 'Revierte venta, comisión, caja e inventario'),
      a('sales', 'export', 'Exportar ventas (CSV)'),
    ],
  },
  {
    id: 'expenses',
    label: 'Gastos & Compras (SRI)',
    group: 'Compras e Inventario',
    actions: [
      a('expenses', 'view', 'Ver gastos'),
      a('expenses', 'create', 'Registrar gastos'),
      a('expenses', 'edit', 'Marcar comprobantes de gasto como autorizados'),
      a('expenses', 'delete', 'Eliminar gastos', true),
      a('expenses', 'import_xml', 'Importar XML de compras del SRI'),
    ],
  },
  {
    id: 'suppliers',
    label: 'Gestión Proveedores',
    group: 'Compras e Inventario',
    actions: [
      a('suppliers', 'view', 'Ver proveedores'),
      a('suppliers', 'create', 'Crear proveedores'),
      a('suppliers', 'edit', 'Editar proveedores'),
      a('suppliers', 'delete', 'Eliminar proveedores', true),
    ],
  },
  {
    id: 'purchase-orders',
    label: 'Órdenes de Compra',
    group: 'Compras e Inventario',
    actions: [
      a('purchase-orders', 'view', 'Ver órdenes de compra'),
      a('purchase-orders', 'create', 'Crear órdenes de compra'),
      a('purchase-orders', 'edit', 'Editar órdenes de compra'),
      a('purchase-orders', 'receive', 'Recibir mercadería (ingreso a bodega)'),
      a('purchase-orders', 'cancel', 'Anular órdenes de compra', true),
      a('purchase-orders', 'print', 'Imprimir órdenes de compra'),
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario & Joyería',
    group: 'Compras e Inventario',
    actions: [
      a('inventory', 'view', 'Ver inventario'),
      a('inventory', 'view_costs', 'Ver costos unitarios', true),
      a('inventory', 'create', 'Crear productos'),
      a('inventory', 'edit', 'Editar productos y precios'),
      a('inventory', 'delete', 'Eliminar productos', true),
      a('inventory', 'adjust_stock', 'Ajustar stock manualmente', true),
    ],
  },
  {
    id: 'kardex',
    label: 'Kardex de Insumos',
    group: 'Compras e Inventario',
    actions: [a('kardex', 'view', 'Ver kardex'), a('kardex', 'create_movement', 'Registrar movimientos de kardex', true)],
  },
  {
    id: 'artists',
    label: 'Liquidación Artistas',
    group: 'Finanzas y Contabilidad',
    actions: [
      a('artists', 'view', 'Ver liquidaciones'),
      a('artists', 'create', 'Registrar artistas'),
      a('artists', 'edit', 'Editar ficha de artistas'),
      a('artists', 'toggle_status', 'Activar / desactivar artistas'),
      a('artists', 'change_commission', 'Cambiar % de comisión', true),
      a('artists', 'advance', 'Registrar anticipos (pagos parciales)', true),
      a('artists', 'settle', 'Liquidar (pagar) comisiones', true),
      a('artists', 'print', 'Imprimir comprobantes de pago'),
    ],
  },
  {
    id: 'cash',
    label: 'Arqueo de Caja',
    group: 'Finanzas y Contabilidad',
    actions: [
      a('cash', 'view', 'Ver arqueo de caja'),
      a('cash', 'open', 'Abrir turno de caja'),
      a('cash', 'movement', 'Registrar ingresos / retiros / depósitos', true),
      a('cash', 'partial', 'Imprimir corte parcial (X)'),
      a('cash', 'close', 'Cerrar caja (Z)'),
      a('cash', 'history', 'Ver y reimprimir cierres anteriores'),
    ],
  },
  {
    id: 'ledger',
    label: 'Asientos & Libro Diario',
    group: 'Finanzas y Contabilidad',
    actions: [
      a('ledger', 'view', 'Ver libro diario, mayor y balances'),
      a('ledger', 'create_entry', 'Registrar asientos manuales', true),
      a('ledger', 'delete_entry', 'Eliminar asientos manuales', true),
      a('ledger', 'export', 'Exportar / imprimir contabilidad'),
    ],
  },
  {
    id: 'reports',
    label: 'Centro de Reportes',
    group: 'Finanzas y Contabilidad',
    actions: [
      a('reports', 'view', 'Ver reportes'),
      a('reports', 'export', 'Exportar / imprimir reportes'),
      a('reports', 'backup', 'Descargar copia de seguridad', true),
      a('reports', 'restore', 'Restaurar copia de seguridad', true, 'Reemplaza todos los datos del sistema'),
    ],
  },
  {
    id: 'users',
    label: 'Usuarios & Roles',
    group: 'Administración',
    actions: [
      a('users', 'view', 'Ver usuarios'),
      a('users', 'create', 'Crear usuarios'),
      a('users', 'edit', 'Editar usuarios'),
      a('users', 'toggle_status', 'Activar / desactivar usuarios', true),
      a('users', 'delete', 'Eliminar usuarios', true),
      a('users', 'manage_roles', 'Crear y editar roles y permisos', true),
    ],
  },
  {
    id: 'settings',
    label: 'Configuración',
    group: 'Administración',
    actions: [
      a('settings', 'view', 'Ver configuración'),
      a('settings', 'edit_company', 'Editar datos de la empresa', true),
      a('settings', 'edit_sri', 'Editar parámetros SRI y secuenciales', true),
      a('settings', 'signature', 'Cargar / cambiar firma electrónica', true),
    ],
  },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap(m => m.actions.map(x => x.key));

export const ADMIN_ROLE_ID = 'ADMIN';

const all = (modules: string[]) =>
  PERMISSION_MODULES.filter(m => modules.includes(m.id)).flatMap(m => m.actions.map(x => x.key));
const pick = (...keys: string[]) => keys;

/** Roles base del estudio (editables, excepto Administrador). */
export const DEFAULT_ROLES: SystemRole[] = [
  {
    id: ADMIN_ROLE_ID,
    name: 'Administrador',
    description: 'Acceso total al sistema. Este rol no se puede modificar ni eliminar.',
    color: '#FF3366',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'CAJERO_RECEPCION',
    name: 'Cajero / Recepción',
    description: 'POS, facturación, agenda, clientes y arqueo de caja.',
    color: '#10B981',
    permissions: [
      ...pick('dashboard.view'),
      ...pick('pos.view', 'pos.charge', 'pos.discount'),
      ...pick('clients.view', 'clients.create', 'clients.edit', 'clients.view_medical'),
      ...pick('gallery.view', 'gallery.upload'),
      ...pick('appointments.view', 'appointments.view_all', 'appointments.create', 'appointments.edit', 'appointments.cancel'),
      ...pick('proformas.view', 'proformas.create', 'proformas.convert'),
      ...pick('sales.view', 'sales.create', 'sales.print', 'sales.send_sri', 'sales.view_xml'),
      ...pick('cash.view', 'cash.open', 'cash.partial', 'cash.close'),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ARTISTA',
    name: 'Artista / Tatuador',
    description: 'Sus citas, clientes, portafolio y proformas.',
    color: '#A855F7',
    permissions: [
      ...pick('appointments.view', 'appointments.create', 'appointments.edit'),
      ...pick('clients.view', 'clients.create', 'clients.view_medical'),
      ...pick('gallery.view', 'gallery.upload'),
      ...pick('proformas.view', 'proformas.create'),
      ...pick('artists.view'),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'BODEGA',
    name: 'Bodega / Insumos',
    description: 'Inventario, kardex, proveedores y órdenes de compra.',
    color: '#F59E0B',
    permissions: [
      ...all(['inventory', 'kardex', 'suppliers']),
      ...pick('purchase-orders.view', 'purchase-orders.create', 'purchase-orders.edit', 'purchase-orders.receive', 'purchase-orders.print'),
      ...pick('expenses.view', 'expenses.create'),
    ].filter(k => k !== 'inventory.delete' && k !== 'suppliers.delete'),
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'CONTADOR',
    name: 'Contador',
    description: 'Consulta de ventas, gastos, caja, contabilidad y reportes.',
    color: '#3B82F6',
    permissions: [
      ...pick('dashboard.view', 'dashboard.view_financials'),
      ...pick('sales.view', 'sales.print', 'sales.view_xml', 'sales.export', 'sales.send_sri'),
      ...pick('expenses.view', 'expenses.create', 'expenses.edit', 'expenses.import_xml'),
      ...pick('suppliers.view', 'purchase-orders.view', 'purchase-orders.print'),
      ...pick('inventory.view', 'inventory.view_costs', 'kardex.view'),
      ...pick('artists.view', 'artists.print'),
      ...pick('cash.view', 'cash.history'),
      ...all(['ledger', 'reports']).filter(k => k !== 'reports.restore'),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/** Agrega automáticamente `modulo.view` cuando se concede cualquier acción del módulo. */
export function normalizePermissions(perms: string[]): string[] {
  const set = new Set(perms.filter(p => ALL_PERMISSIONS.includes(p)));
  PERMISSION_MODULES.forEach(m => {
    if (m.actions.some(x => x.key !== `${m.id}.view` && set.has(x.key))) set.add(`${m.id}.view`);
  });
  return ALL_PERMISSIONS.filter(p => set.has(p));
}
