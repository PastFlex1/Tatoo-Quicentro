import { useEffect, useState } from 'react';

/** true mientras la media query se cumple (se actualiza al redimensionar). */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    // Respaldo: algunos navegadores/emuladores no disparan `change` al redimensionar
    window.addEventListener('resize', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, [query]);

  return matches;
}

/** Pantallas de 1366 px o menos: el POS usa el diseño de terminal de caja. */
export const POS_TERMINAL_QUERY = '(max-width: 1366px)';
