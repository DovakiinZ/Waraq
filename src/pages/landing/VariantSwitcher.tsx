// Floating switcher shown on every landing variant so you can hop 1..5
// while previewing on localhost. Not part of any final design.
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { VARIANTS } from './useLandingData';

export default function VariantSwitcher() {
  const { language } = useLanguage();
  const { pathname } = useLocation();
  const current = Number(pathname.split('/').pop());

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-3xl border border-white/20 bg-black/80 px-2 py-1.5 shadow-2xl backdrop-blur sm:rounded-full">
      <span className="px-2 text-[11px] font-medium text-white/50 hidden sm:inline">
        {language === 'ar' ? 'تصميم' : 'Design'}
      </span>
      {VARIANTS.map((v) => (
        <Link
          key={v.n}
          to={`/landing/${v.n}`}
          title={language === 'ar' ? v.ar : v.en}
          className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold transition-colors ${
            current === v.n
              ? 'bg-[#AE944F] text-white'
              : 'text-white/70 hover:bg-white/10'
          }`}
        >
          {v.n}
        </Link>
      ))}
      <Link
        to="/landing"
        className="ms-1 flex h-8 items-center rounded-full px-3 text-[11px] font-medium text-white/70 hover:bg-white/10"
      >
        {language === 'ar' ? 'الكل' : 'All'}
      </Link>
    </div>
  );
}
