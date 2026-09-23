// Index that links to every landing-page design variant for easy comparison.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { VARIANTS, BRAND } from './useLandingData';
import logo from '@/assets/logo.png';

const DESCRIPTIONS: Record<string, { ar: string; en: string }> = {
  editorial: { ar: 'خط كبير معبّر وشبكة مجلة غير متماثلة.', en: 'Oversized expressive type, asymmetric magazine grid.' },
  minimal: { ar: 'مساحات بيضاء واسعة وفخامة هادئة.', en: 'Generous whitespace, quiet-luxury restraint.' },
  playful: { ar: 'أشكال دائرية ودّية ومناسبة للأطفال.', en: 'Rounded, friendly, kid-approachable.' },
  dark: { ar: 'واجهة داكنة سينمائية بلمسات ذهبية.', en: 'Cinematic dark hero with gold glow.' },
  convert: { ar: 'قيمة واضحة ودعوات قوية للتسجيل.', en: 'Clear value prop, strong CTAs, social proof.' },
  premium: { ar: 'سوق تعليمي فاخر بأسلوب Udemy مع بحث وبطاقات مواد.', en: 'Udemy-style marketplace with search, course cards, polish.' },
  thmanyah: { ar: 'تحريري داكن سينمائي بخط عربي جريء، مستوحى من ثمانية.', en: 'Dark cinematic Arabic editorial, bold type, Thmanyah-inspired.' },
  wijha: { ar: 'راقٍ فاتح بهوية خضراء ومساحات واسعة، مستوحى من وجهة.', en: 'Refined light design, green identity, airy, Wijha-inspired.' },
  colorful: { ar: 'تصميم تعليمي ملوّن مع أربع لوحات ألوان تبدّلها مباشرة.', en: 'Illustration-led edtech with four live-switchable palettes.' },
  arcade: { ar: 'أركيد بكسل بحواف حادة، أخضر وأبيض فقط، مستوحى من Young&&Yandex.', en: 'Pixel-arcade, hard edges, green and white only, Young&&Yandex-inspired.' },
};

export default function LandingIndex() {
  const { language, t, toggleLanguage } = useLanguage();

  return (
    <div className="min-h-screen" style={{ background: BRAND.ivory }}>
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Ayman Academy" className="h-11 w-11 rounded-xl object-contain" />
            <span className="text-lg font-bold" style={{ color: BRAND.navy }}>
              {t('أكاديمية أيمن', 'Ayman Academy')}
            </span>
          </div>
          <button
            onClick={toggleLanguage}
            className="rounded-full border px-4 py-1.5 text-sm font-medium"
            style={{ borderColor: BRAND.navy, color: BRAND.navy }}
          >
            {language === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>

        <h1 className="mb-3 text-4xl font-black" style={{ color: BRAND.navy }}>
          {t('اختر تصميم الصفحة الرئيسية', 'Choose a landing design')}
        </h1>
        <p className="mb-10 max-w-xl text-base" style={{ color: '#5b6b7a' }}>
          {t(
            `${VARIANTS.length} اتجاهات مختلفة لنفس المحتوى. تصفّحها واختر المفضّل لديك.`,
            `${VARIANTS.length} directions for the same content. Browse them and pick your favorite.`,
          )}
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {VARIANTS.map((v) => (
            <Link
              key={v.n}
              to={`/landing/${v.n}`}
              className="group relative overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
              style={{ borderColor: 'rgba(30,58,95,0.12)' }}
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black text-white"
                style={{ background: v.n % 2 ? BRAND.navy : BRAND.gold }}
              >
                {v.n}
              </div>
              <h3 className="mb-1 text-xl font-bold" style={{ color: BRAND.navy }}>
                {language === 'ar' ? v.ar : v.en}
              </h3>
              <p className="text-sm" style={{ color: '#6b7885' }}>
                {language === 'ar' ? DESCRIPTIONS[v.key].ar : DESCRIPTIONS[v.key].en}
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: BRAND.gold }}
              >
                {t('عرض', 'Preview')} →
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-sm" style={{ color: '#8b97a3' }}>
          {t('صفحتك الحالية على "/" لم تتغيّر.', 'Your current page at "/" is untouched.')}
        </p>
      </div>
    </div>
  );
}
