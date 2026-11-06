/**
 * Genera src/styles/light-theme.css: el MODO CLARO del sistema.
 *
 * Todo el diseño está escrito con colores oscuros fijos (bg-[#121215], text-white, …). En vez de
 * agregar `dark:` a cada uno de los ~1.400 usos, este script recorre src/, encuentra cada clase de
 * color oscuro y genera su equivalente claro, que se aplica cuando <html> NO tiene la clase `dark`.
 *
 * Ejecutar después de agregar colores nuevos:   npm run theme:light
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(SRC, 'styles', 'light-theme.css');

// ------------------------------------------------------------------ utilidades de color
const hexToRgb = hex => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
};
const rgbToHsl = ([r, g, b]) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
};
const hsl = (h, s, l) => `hsl(${h.toFixed(0)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;

/** Un color es "superficie oscura" si es muy oscuro y poco saturado (no toca el rosa de la marca). */
const isDarkSurface = hex => {
  const [, s, l] = rgbToHsl(hexToRgb(hex));
  return l < 30 && (s < 35 || l < 14);
};

/**
 * Oscuro → claro, conservando la jerarquía visual:
 *   fondo de página / inputs (muy oscuros)  → gris muy claro
 *   tarjetas y paneles                      → blanco
 *   hover, botones secundarios y bordes     → grises progresivamente más marcados
 */
const lightFor = hex => {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  let nl;
  if (l < 9) nl = 96.5;
  else if (l < 13) nl = 100;
  else nl = Math.max(78, 100 - (l - 11) * 1.6);
  return hsl(h, Math.min(s, 18), nl);
};

// ------------------------------------------------------------------ escaneo de clases
const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(tsx?|jsx?)$/.test(e.name) ? [p] : [];
  });

const TOKEN = /(?<![\w-])((?:[a-z-]+:)*)(!?)(bg|border|divide|from|via|to|ring|outline)-\[#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\](?:\/(\d{1,3}))?(?![\w\]-])/g;
const tokens = new Map();
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(TOKEN)) tokens.set(m[0], m);
}

// ------------------------------------------------------------------ CSS
const esc = cls => cls.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
const SCOPE = ':where(html:not(.dark))';
const MEDIA = { xs: '480px', sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };
const PSEUDO = { hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within', active: ':active', disabled: ':disabled' };

const rules = [];
for (const [cls, m] of [...tokens.entries()].sort()) {
  const [, prefixStr, , util, hex, alpha] = m;
  if (!isDarkSurface(`#${hex}`)) continue;
  const variants = prefixStr ? prefixStr.slice(0, -1).split(':') : [];
  let pseudo = '';
  let ancestor = '';
  let media = '';
  let skip = false;
  for (const v of variants) {
    if (PSEUDO[v]) pseudo += PSEUDO[v];
    else if (v === 'group-hover') ancestor = '.group:hover ';
    else if (MEDIA[v]) media = MEDIA[v];
    else skip = true;
  }
  if (skip) continue;

  const base = lightFor(`#${hex}`);
  const color = alpha ? `color-mix(in oklab, ${base} ${alpha}%, transparent)` : base;
  const sel = `${SCOPE} ${ancestor}.${esc(cls)}${pseudo}`;
  let decl;
  switch (util) {
    case 'bg': decl = `${sel} { background-color: ${color}; }`; break;
    case 'border': decl = `${sel} { border-color: ${color}; }`; break;
    case 'outline': decl = `${sel} { outline-color: ${color}; }`; break;
    case 'ring': decl = `${sel} { --tw-ring-color: ${color}; }`; break;
    case 'divide': decl = `${sel} > :not(:last-child) { border-color: ${color}; }`; break;
    case 'from': decl = `${sel} { --tw-gradient-from: ${color}; }`; break;
    case 'via': decl = `${sel} { --tw-gradient-via: ${color}; }`; break;
    case 'to': decl = `${sel} { --tw-gradient-to: ${color}; }`; break;
  }
  rules.push(media ? `@media (width >= ${media}) { ${decl} }` : decl);
}

const header = `/* ARCHIVO GENERADO por scripts/build-light-theme.mjs — no editar a mano (npm run theme:light). */
/* Modo claro: se aplica cuando <html> no tiene la clase .dark. ${rules.length} reglas de superficie. */
`;

// Texto: blancos y grises claros pasan a tonos oscuros legibles sobre fondo claro.
const textRules = `
  ${SCOPE} body, ${SCOPE} html { background-color: hsl(240 10% 96.5%); color: #18181b; }

  ${SCOPE} .text-white,
  ${SCOPE} .hover\\:text-white:hover,
  ${SCOPE} .group:hover .group-hover\\:text-white { color: #18181b; }
  ${SCOPE} .text-white\\/80 { color: rgb(24 24 27 / 0.8); }
  ${SCOPE} .text-zinc-100, ${SCOPE} .text-neutral-100 { color: var(--color-neutral-900); }
  ${SCOPE} .text-neutral-200, ${SCOPE} .hover\\:text-neutral-200:hover { color: var(--color-neutral-800); }
  ${SCOPE} .text-neutral-300 { color: var(--color-neutral-700); }
  ${SCOPE} .text-neutral-400, ${SCOPE} .hover\\:text-neutral-400:hover { color: var(--color-neutral-600); }
  ${SCOPE} .text-neutral-600 { color: var(--color-neutral-400); }
  ${SCOPE} .placeholder-neutral-600::placeholder { color: var(--color-neutral-400); }

  ${SCOPE} .bg-neutral-950 { background-color: hsl(240 10% 96.5%); }
  ${SCOPE} .bg-neutral-900 { background-color: var(--color-neutral-100); }
  ${SCOPE} .bg-neutral-800, ${SCOPE} .bg-neutral-800\\/80 { background-color: var(--color-neutral-200); }
  ${SCOPE} .hover\\:bg-neutral-700:hover { background-color: var(--color-neutral-300); }
  ${SCOPE} .border-neutral-700, ${SCOPE} .hover\\:border-neutral-700:hover { border-color: var(--color-neutral-300); }
  ${SCOPE} .border-neutral-800, ${SCOPE} .border-neutral-900 { border-color: var(--color-neutral-200); }
  ${SCOPE} .hover\\:bg-white\\/10:hover { background-color: rgb(0 0 0 / 0.05); }

  /* Texto de colores claros (pensado para fondo oscuro) → tonos más oscuros */
${['emerald', 'green', 'amber', 'yellow', 'orange', 'red', 'rose', 'pink', 'blue', 'sky', 'cyan', 'teal', 'indigo', 'violet', 'purple', 'fuchsia', 'lime']
  .map(c => `  ${SCOPE} .text-${c}-100, ${SCOPE} .text-${c}-200, ${SCOPE} .text-${c}-300 { color: var(--color-${c}-700); }\n  ${SCOPE} .text-${c}-400 { color: var(--color-${c}-600); }\n  ${SCOPE} [class*="text-${c}-100/"], ${SCOPE} [class*="text-${c}-200/"] { color: var(--color-${c}-800); }`)
  .join('\n')}

  /* Sobre fondos de color fuerte (botones rosados, verdes, rojos…) el texto sigue siendo blanco */
  ${SCOPE} :is(
    [class~="bg-[#FF3366]"], [class~="bg-[#E62557]"], [class~="bg-[#e02958]"], [class~="bg-[#ff3366]"],
    [class*="from-[#FF3366]"], [class*="bg-gradient-to"][class*="from-[#FF"],
    [class~="bg-emerald-500"], [class~="bg-emerald-600"], [class~="bg-red-500"], [class~="bg-red-600"],
    [class~="bg-rose-500"], [class~="bg-rose-600"], [class~="bg-blue-500"], [class~="bg-blue-600"],
    [class~="bg-amber-500"], [class~="bg-amber-600"], [class~="bg-black"], [class*="bg-black/"]
  ):is(.text-white, :has(> .text-white)),
  ${SCOPE} :is(
    [class~="bg-[#FF3366]"], [class~="bg-[#E62557]"], [class~="bg-[#e02958]"], [class*="from-[#FF3366]"],
    [class~="bg-emerald-500"], [class~="bg-emerald-600"], [class~="bg-red-500"], [class~="bg-red-600"],
    [class~="bg-rose-500"], [class~="bg-rose-600"], [class~="bg-blue-500"], [class~="bg-blue-600"],
    [class~="bg-amber-500"], [class~="bg-amber-600"]
  ) .text-white { color: #fff; }
`;

const misc = `
  /* Barras de desplazamiento */
  ${SCOPE} ::-webkit-scrollbar-thumb { background: #d4d4d8; }
  ${SCOPE} ::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
  ${SCOPE} .ui-scroll { scrollbar-color: #d4d4d8 transparent; }
  ${SCOPE} ::selection { color: #18181b; }
  ${SCOPE} input, ${SCOPE} textarea, ${SCOPE} select { color-scheme: light; }
  ${SCOPE} { color-scheme: light; }
`;

const css = `${header}
@layer utilities {
${rules.map(r => `  ${r}`).join('\n')}
${textRules}
${misc}
}
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, css);
console.log(`Modo claro generado: ${path.relative(ROOT, OUT)} (${rules.length} reglas de superficie, ${tokens.size} clases revisadas)`);
