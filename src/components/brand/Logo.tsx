// Waraq Academy brand mark and lockup.
//
// The mark is a leaf with a folded page corner: "ورق" means both book pages
// and tree leaves. The veins point upward to show progress through the school
// stages. Colours are the brand's own and are intentionally hard-coded here
// rather than themed, so the mark stays correct wherever it is placed.
//
// Pick `variant` by the BACKGROUND behind the mark, not by the page theme:
// "light" for light grounds, "dark" for deep green / gradient bands.
type MarkProps = { size?: number; variant?: 'light' | 'dark'; className?: string };

const COLORS = {
  light: { leaf: '#0B3B2C', fold: '#9FD3BE', vein: '#FFFFFF' },
  dark: { leaf: '#F7F2E8', fold: '#F4A340', vein: '#0B3B2C' },
};

export function LogoMark({ size = 40, variant = 'light', className }: MarkProps) {
  const c = COLORS[variant];
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="ورق أكاديمي"
    >
      <path
        d="M10 80 A70 70 0 0 1 80 10 L88 10 L110 32 L110 40 A70 70 0 0 1 40 110 L10 110 Z"
        fill={c.leaf}
      />
      <path d="M88 10 L88 32 L110 32 Z" fill={c.fold} />
      <g stroke={c.vein} strokeLinecap="round" fill="none">
        <path d="M24 96 L80 40" strokeWidth={7} />
        <path d="M42 78 L42 62 M42 78 L58 78 M60 60 L60 47 M60 60 L73 60" strokeWidth={5.5} />
      </g>
    </svg>
  );
}

type LogoProps = MarkProps & { showEnglish?: boolean; lang?: 'ar' | 'en' };

/**
 * Horizontal lockup: mark + name. Uses HTML text rather than SVG text so it
 * renders correctly in both RTL and LTR.
 *
 * Note on weights: IBM Plex Sans Arabic stops at 700, so `font-extrabold`
 * resolves to 700 for the Arabic name. Never add letter-spacing to the Arabic
 * text; it breaks the joined letterforms.
 */
export function Logo({
  size = 40,
  variant = 'light',
  showEnglish = false,
  lang = 'ar',
  className,
}: LogoProps) {
  const text = variant === 'dark' ? 'text-[#F7F2E8]' : 'text-[#0B3B2C]';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} variant={variant} />
      <span className={`flex flex-col leading-none ${text}`}>
        <span className="font-extrabold" style={{ fontSize: size * 0.5 }}>
          {lang === 'ar' ? 'ورق أكاديمي' : 'Waraq Academy'}
        </span>
        {showEnglish && lang === 'ar' && (
          <span dir="ltr" className="mt-1 text-[10px] font-semibold tracking-[3px] opacity-60">
            WARAQ ACADEMY
          </span>
        )}
      </span>
    </span>
  );
}
