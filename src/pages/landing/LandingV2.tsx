// Variant 2 — Quiet Minimal.
// Generous whitespace, thin gold hairlines, small uppercase labels, restraint.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData, BRAND } from './useLandingData';
import VariantSwitcher from './VariantSwitcher';
import logo from '@/assets/logo.png';

export default function LandingV2() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const tt = (o: any, base: string) => (language === 'ar' ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);
  const Label = ({ children }: any) => (
    <span className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: BRAND.gold }}>{children}</span>
  );

  return (
    <div className="min-h-screen bg-white" style={{ color: BRAND.navy }}>
      {/* Nav */}
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="" className="h-8 w-8 object-contain opacity-90" />
          <span className="text-sm font-bold tracking-wide">{t('ورق أكاديمي', 'Waraq Academy')}</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <button onClick={toggleLanguage} className="opacity-60 hover:opacity-100">{language === 'ar' ? 'EN' : 'ع'}</button>
          <Link to="/login" className="font-medium opacity-60 hover:opacity-100">{t('دخول', 'Sign in')}</Link>
        </div>
      </header>

      {/* Hero — centered, airy */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
        <Label>{t('تعلُّم مدرسي راقٍ', 'Refined school learning')}</Label>
        <h1 className="mt-8 text-5xl font-light leading-[1.1] tracking-tight sm:text-6xl">
          {t('المعرفة،', 'Knowledge,')}<br />
          <span className="font-semibold">{t('ببساطة وإتقان.', 'made simple.')}</span>
        </h1>
        <p className="mx-auto mt-8 max-w-lg text-lg font-light leading-relaxed" style={{ color: '#6b7885' }}>
          {t(
            'مساحة هادئة للتعلّم، حيث يلتقي أفضل المعلّمين بالطلاب المتشوّقين للمعرفة.',
            'A calm space to learn, where the best teachers meet curious students.',
          )}
        </p>
        <div className="mt-12 flex items-center justify-center gap-8">
          <Link to="/register" className="rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND.navy }}>
            {t('ابدأ مجاناً', 'Start free')}
          </Link>
          <Link to="/subjects" className="text-sm font-semibold" style={{ color: BRAND.gold }}>
            {t('استكشف', 'Explore')} →
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6"><div className="h-px" style={{ background: 'rgba(174,148,79,0.3)' }} /></div>

      {/* Stages */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <Label>{t('المراحل', 'Stages')}</Label>
        <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {(stages.length ? stages : [{}, {}, {}, {}]).slice(0, 6).map((s: any, i: number) => (
            <Link key={s.id || i} to={s.slug ? `/stages/${s.slug}` : '/stages'} className="group flex items-baseline gap-4 border-b pb-4" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
              <span className="text-xs tabular-nums" style={{ color: BRAND.gold }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="text-xl font-light group-hover:font-normal">{tt(s, 'title') || t('مرحلة', 'Stage')}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <Label>{t('مواد مختارة', 'Selected courses')}</Label>
        <div className="mt-8 space-y-2">
          {(subjects.length ? subjects : [{}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Link key={s.id || i} to="/subjects" className="group flex items-center justify-between rounded-2xl px-5 py-5 transition-colors hover:bg-[#FAF8F5]">
              <div>
                <p className="text-[11px] uppercase tracking-widest" style={{ color: '#9aa5b1' }}>{tt(s.stage, 'title') || t('مادة', 'Course')}</p>
                <h3 className="text-lg font-medium">{tt(s, 'title') || t('عنوان المادة', 'Course title')}</h3>
              </div>
              <span className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: BRAND.gold }}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Teachers */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Label>{t('نخبة المعلّمين', 'Our teachers')}</Label>
        <div className="mt-10 flex flex-wrap justify-center gap-10">
          {(teachers.length ? teachers : [{}, {}, {}, {}]).slice(0, 5).map((tc: any, i: number) => (
            <div key={tc.id || i}>
              <div className="mx-auto h-16 w-16 overflow-hidden rounded-full" style={{ background: '#f0ece3' }}>
                {tc.avatar_url ? <img src={tc.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <p className="mt-3 text-sm font-light">{tc.full_name || t('معلّم', 'Teacher')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-light leading-snug sm:text-4xl">
          {t('ابدأ اليوم. ', 'Begin today. ')}
          <span className="font-semibold">{t('التعلّم يبدأ بخطوة.', 'Learning starts with one step.')}</span>
        </h2>
        <Link to="/register" className="mt-8 inline-block rounded-full px-9 py-3.5 text-sm font-semibold text-white" style={{ background: BRAND.navy }}>
          {t('أنشئ حسابك', 'Create account')}
        </Link>
      </section>

      <footer className="mx-auto max-w-4xl border-t px-6 py-8 text-center text-xs" style={{ borderColor: 'rgba(30,58,95,0.08)', color: '#9aa5b1' }}>
        © {t('ورق أكاديمي', 'Waraq Academy')}
      </footer>

      <VariantSwitcher />
    </div>
  );
}
