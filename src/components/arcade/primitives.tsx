// Shared building blocks for the arcade (green + white) public surfaces.
// Interactive states come from the .arc-* classes in src/index.css; colours
// come from the A tokens. Radius is always 0 and borders are always 2px.
import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { A, PIXEL_STRIP } from './theme';

type Variant = 'solid' | 'outline' | 'onDark';

// solid  -> electric green fill, deep green label. The primary action.
// outline-> surface fill, ink label. Secondary.
// onDark -> for use on a gradient or deep green band, where the border and
//           shadow must be light instead of dark to stay visible.
function variantStyle(v: Variant): React.CSSProperties {
  if (v === 'solid') {
    return { background: A.accent, color: A.onAccent, borderColor: A.line };
  }
  if (v === 'onDark') {
    return { background: A.accent, color: A.onAccent, borderColor: A.onInk };
  }
  return { background: A.surface, color: A.ink, borderColor: A.line };
}

const BASE =
  'arc-focus inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 font-black disabled:pointer-events-none';

const SIZES = {
  sm: 'px-5 py-2 text-[14px]',
  md: 'px-7 py-3.5 text-[15px]',
  lg: 'px-8 py-4 text-[16px]',
} as const;

/** Arcade-styled <button>. Use for real actions (submit, toggle). */
export const ArcadeButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: keyof typeof SIZES;
    loading?: boolean;
  }
>(function ArcadeButton(
  { variant = 'solid', size = 'md', loading, className = '', children, style, disabled, ...rest },
  ref,
) {
  const press = size === 'sm' ? 'arc-press-sm' : 'arc-press';
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${BASE} ${press} ${SIZES[size]} ${className}`}
      style={{
        ...variantStyle(variant),
        // onDark needs a light shadow to read against a dark band. Recolour it
        // through the custom property so .arc-press keeps control of the
        // hover and active states; an inline box-shadow would override them.
        ...(variant === 'onDark' ? ({ '--arc-press-color': A.onInk } as React.CSSProperties) : null),
        ...style,
      }}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

/** Arcade-styled router <Link> that looks like a button. Use for navigation. */
export function ArcadeLink({
  to,
  variant = 'solid',
  size = 'md',
  className = '',
  children,
  style,
  ...rest
}: {
  to: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
} & Omit<React.ComponentProps<typeof Link>, 'to' | 'style' | 'className'>) {
  const press = size === 'sm' ? 'arc-press-sm' : 'arc-press';
  return (
    <Link
      to={to}
      className={`${BASE} ${press} ${SIZES[size]} ${className}`}
      style={{
        ...variantStyle(variant),
        // See ArcadeButton: recolour via the custom property, never inline
        // box-shadow, or the hover and active states stop working.
        ...(variant === 'onDark' ? ({ '--arc-press-color': A.onInk } as React.CSSProperties) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Bordered panel with the hard shadow. `flat` drops the shadow. */
export function ArcadeCard({
  children,
  className = '',
  flat,
  fill,
  style,
}: {
  children: ReactNode;
  className?: string;
  flat?: boolean;
  fill?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: fill || A.surface,
        border: `2px solid ${A.line}`,
        boxShadow: flat ? 'none' : `6px 6px 0 var(--arc-shadow)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small mono chip. Used for stage names, counts and status markers. */
export function ArcadeChip({
  children,
  filled,
  className = '',
}: {
  children: ReactNode;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-2 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-[0.12em] ${className}`}
      style={{
        background: filled ? A.accent : 'transparent',
        color: filled ? A.onAccent : A.ink,
        borderColor: A.line,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Label + control + error, stacked. Label sits ABOVE the control and the
 * error BELOW it; error text uses the theme's semantic destructive token
 * rather than a green, because an error rendered in the brand green would
 * not read as an error.
 */
export function ArcadeField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-black" style={{ color: A.ink }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <span className="text-[12px] font-medium" style={{ color: A.inkSoft }}>
          {hint}
        </span>
      )}
      {error && (
        <span
          className="text-[12px] font-bold"
          style={{ color: 'hsl(var(--destructive))' }}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}

/** Loading placeholder shaped like the content it replaces. */
export function ArcadeSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse border-2 ${className}`}
      style={{ background: A.wash, borderColor: A.line }}
      aria-hidden
    />
  );
}

/** Composed empty state. Says how to populate, never just "no data". */
export function ArcadeEmpty({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-2 border-dashed p-8 text-center text-sm font-semibold"
      style={{ borderColor: A.line, color: A.inkSoft }}
    >
      {children}
    </div>
  );
}

/** Pixel checker divider. */
export function PixelDivider({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-[6px] w-full ${className}`}
      style={{ background: PIXEL_STRIP }}
      aria-hidden
    />
  );
}
