import { ServiceCategory, StudioService, StudioSettings } from '../types';

/** Servicios base con los que arranca el catálogo (el precio se define en la sección Servicios). */
export const DEFAULT_SERVICE_CATALOG: StudioService[] = [
  { id: 'svc-tattoo-session', name: 'Tatuaje por sesión', category: 'tattoo', description: 'Tatuaje personalizado (sesión)', price: 0, taxRate: 15, hours: 3, active: true },
  { id: 'svc-tattoo-small', name: 'Tatuaje pequeño', category: 'tattoo', description: 'Tatuaje pequeño / minimalista', price: 0, taxRate: 15, hours: 1, active: true },
  { id: 'svc-touch-up', name: 'Retoque', category: 'tattoo', description: 'Retoque de tatuaje', price: 0, taxRate: 15, hours: 1, active: true },
  { id: 'svc-piercing', name: 'Perforación', category: 'piercing', description: 'Perforación (piercing)', price: 0, taxRate: 15, active: true },
  { id: 'svc-jewel-change', name: 'Cambio de joya', category: 'piercing', description: 'Cambio / colocación de joya', price: 0, taxRate: 15, active: true },
  { id: 'svc-other', name: 'Otro servicio', category: 'other', description: 'Servicio del estudio', price: 0, taxRate: 15, active: true },
];

export const getServiceCatalog = (settings: Pick<StudioSettings, 'serviceCatalog'>): StudioService[] =>
  settings.serviceCatalog ?? DEFAULT_SERVICE_CATALOG;

export const SERVICE_CATEGORY_LABELS: Partial<Record<ServiceCategory, string>> = {
  tattoo: 'Tatuaje',
  piercing: 'Piercing',
  other: 'Otro servicio',
};

export const serviceCategoryLabel = (c: ServiceCategory) => SERVICE_CATEGORY_LABELS[c] || 'Servicio';
