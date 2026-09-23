// Arcade theme tokens: the green + white design language from LandingV10,
// shared by the public-facing surfaces (Header, Footer, Register, Login,
// Marketplace, Teacher Application).
//
// Every value is a `var(--arc-*)` reference resolved in src/index.css, which
// also carries the `.dark` overrides. That indirection is deliberate: the dark
// mode toggle lives in Header and flips a class on <html>, so reading the theme
// through CSS keeps every surface in sync without React state. Do NOT hard-code
// the hex values in components, and do NOT read them through useDarkMode (that
// hook holds per-instance state and would desync).
export const A = {
  bg: 'var(--arc-bg)', // page ground
  surface: 'var(--arc-surface)', // card / panel fill
  wash: 'var(--arc-wash)', // banded section fill
  ink: 'var(--arc-ink)', // primary TEXT colour
  inkSoft: 'var(--arc-ink-soft)', // secondary text
  mid: 'var(--arc-mid)', // small marks and icons on the ground
  line: 'var(--arc-line)', // border colour
  accent: 'var(--arc-accent)', // the only fill, electric green
  onAccent: 'var(--arc-on-accent)', // text on accent. never white
  onInk: 'var(--arc-on-ink)', // text on deep green / gradient
  onInkMuted: 'var(--arc-on-ink-muted)', // secondary text on deep green / gradient
  band: 'var(--arc-band)', // solid deep-green band FILL. not the same as ink,
  // which is a text colour and inverts in dark mode
  bandLine: 'var(--arc-band-line)', // hairline inside a band
  grad: 'var(--arc-grad)', // full-bleed band gradient
} as const;

// The arcade device: hard offset shadow, no blur. `n` is the offset in px.
export const hard = (n = 5) => `${n}px ${n}px 0 var(--arc-shadow)`;

// Pixel checker strip, used as a section divider.
export const PIXEL_STRIP =
  'repeating-linear-gradient(90deg, var(--arc-line) 0 10px, transparent 10px 20px)';

// One radius scale: zero. Sharp is the system. Exported so the intent is
// explicit at call sites rather than an unexplained absence of rounding.
export const RADIUS = '0px';
