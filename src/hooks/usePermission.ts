import { useStudio } from '../context/StudioContext';
import { useAlertModal } from '../context/AlertModalContext';
import { PERMISSION_MODULES } from '../data/permissions';

const labelOf = (permission: string) => {
  for (const m of PERMISSION_MODULES) {
    const a = m.actions.find(x => x.key === permission);
    if (a) return `${m.label} → ${a.label}`;
  }
  return permission;
};

/**
 * Control de permisos en la interfaz.
 *  - `can(p)`   → true/false, para ocultar o deshabilitar botones.
 *  - `guard(p)` → igual que `can`, pero si no hay permiso muestra un aviso. Se usa al inicio
 *                 de cada acción para que no pueda ejecutarse por otra vía.
 */
export function usePermission() {
  const { can, currentRole } = useStudio();
  const { showAlert } = useAlertModal();

  const guard = (permission: string): boolean => {
    if (can(permission)) return true;
    showAlert({
      title: 'Acción no permitida',
      message: `Su rol (${currentRole?.name || 'sin rol'}) no tiene el permiso: ${labelOf(permission)}. Solicítelo a un administrador.`,
      type: 'warning',
    });
    return false;
  };

  /** Props para un botón: lo deshabilita y explica por qué si falta el permiso. */
  const gate = (permission: string) =>
    can(permission) ? {} : { disabled: true, title: `Sin permiso: ${labelOf(permission)}`, 'aria-disabled': true };

  return { can, guard, gate };
}
