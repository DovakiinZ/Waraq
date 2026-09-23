// Live palette picker for LandingV9, so the colour direction can be chosen
// in the browser instead of by rebuilding. Preview-only control, not part of
// the final design; drop this component when a palette is settled on.
import { useLanguage } from '@/contexts/LanguageContext';
import { PALETTES, PALETTE_ORDER, type Palette, type PaletteKey } from './palettes';

export default function PaletteSwitcher({
  value,
  onChange,
  palette: p,
}: {
  value: PaletteKey;
  onChange: (key: PaletteKey) => void;
  palette: Palette;
}) {
  const { t, language } = useLanguage();
  const active = PALETTES[value];

  return (
    <div
      className="fixed bottom-20 end-4 z-[100] flex flex-col gap-2 rounded-[20px] border p-3 shadow-2xl sm:bottom-4"
      style={{
        background: p.surface,
        borderColor: p.line,
        boxShadow: `0 18px 50px ${p.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(17,26,51,0.16)'}`,
      }}
    >
      <span className="text-[11px] font-semibold" style={{ color: p.inkSoft }}>
        {t('لوحة الألوان', 'Palette')}
      </span>

      <div className="flex items-center gap-1.5">
        {PALETTE_ORDER.map((key) => {
          const candidate = PALETTES[key];
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={selected}
              title={language === 'ar' ? candidate.nameAr : candidate.nameEn}
              className="relative h-9 w-9 rounded-full transition-transform hover:scale-110 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${candidate.primary} 0 55%, ${candidate.accent} 55% 100%)`,
                outline: selected ? `2px solid ${p.ink}` : `1px solid ${p.line}`,
                outlineOffset: selected ? '2px' : '0px',
              }}
            >
              <span className="sr-only">
                {language === 'ar' ? candidate.nameAr : candidate.nameEn}
              </span>
            </button>
          );
        })}
      </div>

      <span className="text-[11px] font-medium" style={{ color: p.ink }}>
        {language === 'ar' ? active.nameAr : active.nameEn}
      </span>
    </div>
  );
}
