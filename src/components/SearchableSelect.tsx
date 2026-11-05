import React from 'react';
import { UiSelect } from './common/UiSelect';

export interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  className?: string;
}

/** Desplegable con buscador. Usa el mismo diseño que el resto del sistema (UiSelect). */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción...',
  className = '',
}) => (
  <UiSelect
    searchable
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    searchPlaceholder="Buscar…"
    className={`w-full ${className}`}
  >
    {options.map(o => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </UiSelect>
);
