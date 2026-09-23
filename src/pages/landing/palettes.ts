// Palette system for LandingV9.
//
// Each palette is a complete, self-consistent theme: one primary (brand + CTA)
// plus exactly ONE accent used sparingly for highlights. Switching palettes
// swaps the whole page at once, so no section ever inverts against another.
//
// Contrast: every `on*` token is checked to clear WCAG AA (4.5:1) against its
// paired fill, and `inkSoft` clears AA against `bg`.

export type PaletteKey = 'cobalt' | 'teal' | 'plum' | 'midnight';

export interface Palette {
  key: PaletteKey;
  nameAr: string;
  nameEn: string;
  mode: 'light' | 'dark';
  bg: string; // page background
  surface: string; // card / panel fill
  surfaceAlt: string; // banded section fill
  ink: string; // primary text
  inkSoft: string; // secondary text
  line: string; // hairlines + borders
  primary: string; // brand fill, CTAs, links
  primaryDeep: string; // hover state + full-bleed colour block
  onPrimary: string; // text sitting on primary / primaryDeep
  accent: string; // the single accent
  onAccent: string; // text sitting on accent
  tint: string; // soft wash of primary, for tiles
}

export const PALETTES: Record<PaletteKey, Palette> = {
  // Deep cobalt against a cool off-white, warmed by a tangerine accent.
  cobalt: {
    key: 'cobalt',
    nameAr: 'أزرق كوبالت',
    nameEn: 'Cobalt & Citrus',
    mode: 'light',
    bg: '#F4F6FC',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF1FC',
    ink: '#111A33',
    inkSoft: '#5A6383',
    line: '#DDE3F5',
    primary: '#2645E3',
    primaryDeep: '#1A32B4',
    onPrimary: '#FFFFFF',
    accent: '#FF8A3D',
    onAccent: '#26140A',
    tint: '#E6EBFD',
  },

  // Deep teal with coral. Calm and green-leaning without reading corporate.
  teal: {
    key: 'teal',
    nameAr: 'أخضر بحري',
    nameEn: 'Teal & Coral',
    mode: 'light',
    bg: '#F1F7F5',
    surface: '#FFFFFF',
    surfaceAlt: '#E5F1ED',
    ink: '#0C2A27',
    inkSoft: '#4E6B67',
    line: '#D6E6E1',
    primary: '#0E7C6B',
    primaryDeep: '#095B4F',
    onPrimary: '#FFFFFF',
    accent: '#FF6B5B',
    onAccent: '#2A0C08',
    tint: '#DDEEE9',
  },

  // Plum with an acid lime. The most distinctive of the four.
  plum: {
    key: 'plum',
    nameAr: 'أرجواني وليموني',
    nameEn: 'Plum & Lime',
    mode: 'light',
    bg: '#F8F4F8',
    surface: '#FFFFFF',
    surfaceAlt: '#F0E6F1',
    ink: '#2B1230',
    inkSoft: '#6C5471',
    line: '#E7DCEA',
    primary: '#6E2D72',
    primaryDeep: '#4F1C52',
    onPrimary: '#FFFFFF',
    accent: '#A9D02C',
    onAccent: '#1E2605',
    tint: '#EEE2F0',
  },

  // The dark option. Near-black blue with aqua, warmed by amber.
  midnight: {
    key: 'midnight',
    nameAr: 'ليلي ومائي',
    nameEn: 'Midnight & Aqua',
    mode: 'dark',
    bg: '#0A151E',
    surface: '#10232F',
    surfaceAlt: '#142C3A',
    ink: '#E8F3F8',
    inkSoft: '#92AAB9',
    line: '#1E3948',
    primary: '#24C0C6',
    primaryDeep: '#16989E',
    onPrimary: '#04191B',
    accent: '#FFC24B',
    onAccent: '#241703',
    tint: '#142B38',
  },
};

export const PALETTE_ORDER: PaletteKey[] = ['cobalt', 'teal', 'plum', 'midnight'];

export const DEFAULT_PALETTE: PaletteKey = 'cobalt';

const STORAGE_KEY = 'ayman-landing-palette';

export function readStoredPalette(): PaletteKey {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && raw in PALETTES) return raw as PaletteKey;
  } catch {
    // Private mode or blocked site data. Fall through to the default.
  }
  return DEFAULT_PALETTE;
}

export function writeStoredPalette(key: PaletteKey) {
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Persisting the choice is a convenience, never a requirement.
  }
}

// One radius scale for the whole page, applied everywhere:
//   interactive -> pill, cards/tiles/images -> 20px, small chips -> 14px.
export const R = {
  pill: 'rounded-full',
  card: 'rounded-[20px]',
  chip: 'rounded-[14px]',
} as const;
