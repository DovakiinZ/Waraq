// Variant 1 — Bold Editorial.
// Oversized expressive headline, asymmetric magazine grid, editorial numbering.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData, BRAND } from './useLandingData';
import VariantSwitcher from './VariantSwitcher';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-library.jpg';

export default function LandingV1() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const tt = (o: any, base: string) => (language === 'ar' ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);

  return (
    <div className="min-h-screen" style={{ background: BRAND.ivory, color: BRAND.navy }}>
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-10 w-10 object-contain" />
          <span className="text-lg font-black tracking-tight">{t('أكاديمية أيمن', 'Ayman Academy')}</span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-semibold">
          <Link to="/stages" className="hidden hover:opacity-60 sm:inline">{t('المراحل', 'Stages')}</Link>
          <Link to="/subjects" className="hidden hover:opacity-60 sm:inline">{t('المواد', 'Courses')}</Link>
          <button onClick={toggleLanguage} className="hover:opacity-60">{language === 'ar' ? 'EN' : 'ع'}</button>
          <Link to="/login" className="rounded-full px-5 py-2 text-white" style={{ background: BRAND.navy }}>
            {t('دخول', 'Sign in')}
          </Link>
        </nav>
      </header>

      {/* Hero — asymmetric */}
      <section className="mx-auto grid max-w-6xl items-end gap-8 px-6 pb-16 pt-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <span className="mb-6 inline-block text-sm font-bold uppercase tracking-[0.25em]" style={{ color: BRAND.gold }}>
            {t('منصّة تعليمية عربية', 'Arabic learning platform')}
          </span>
          <h1 className="text-[13vw] font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
            {t('تعلّم', 'Learn')}<br />
            <span style={{ color: BRAND.gold }}>{t('بلا حدود', 'without limits')}</span>
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed" style={{ color: '#5b6b7a' }}>
            {t(
              'دروس ومواد مدرسية يقدّمها أفضل المعلّمين، مصمّمة لكل مرحلة دراسية.',
              'School courses from top teachers, crafted for every stage of study.',
            )}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/register" className="rounded-full px-8 py-4 text-base font-bold text-white transition-transform hover:scale-105" style={{ background: BRAND.navy }}>
              {t('ابدأ الآن', 'Get started')}
            </Link>
            <Link to="/subjects" className="text-base font-bold underline-offset-4 hover:underline">
              {t('تصفّح المواد ←', 'Browse courses ←')}
            </Link>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] rotate-3" style={{ background: BRAND.gold, opacity: 0.15 }} />
            <img src={heroImage} alt="" className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl" />
            <div className="absolute -bottom-5 start-6 rounded-2xl bg-white px-5 py-3 shadow-xl">
              <p className="text-3xl font-black">{teachers.length || '12'}+</p>
              <p className="text-xs font-semibold" style={{ color: '#8b97a3' }}>{t('معلّم خبير', 'expert teachers')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stages — editorial numbered list */}
      <section className="border-y" style={{ borderColor: 'rgba(30,58,95,0.1)' }}>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 flex items-end justify-between">
            <h2 className="text-4xl font-black">{t('المراحل الدراسية', 'Study stages')}</h2>
            <Link to="/stages" className="text-sm font-bold" style={{ color: BRAND.gold }}>{t('الكل', 'All')} →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(30,58,95,0.1)' }}>
            {(stages.length ? stages : [{}, {}, {}]).slice(0, 5).map((s: any, i: number) => (
              <Link key={s.id || i} to={s.slug ? `/stages/${s.slug}` : '/stages'} className="group flex items-center gap-6 py-6 transition-colors hover:bg-black/[0.02]">
                <span className="text-2xl font-black tabular-nums" style={{ color: BRAND.gold }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-2xl font-bold group-hover:translate-x-2 transition-transform">
                  {tt(s, 'title') || t('مرحلة', 'Stage')}
                </span>
                <span className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: BRAND.navy }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured subjects — big cards */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-4xl font-black">{t('مواد مختارة', 'Featured courses')}</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {(subjects.length ? subjects : [{}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Link key={s.id || i} to="/subjects" className="group relative overflow-hidden rounded-3xl p-8 text-white transition-transform hover:-translate-y-1"
              style={{ background: i % 2 ? BRAND.gold : BRAND.navy }}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest opacity-70">{tt(s.stage, 'title') || t('مادة', 'Course')}</p>
              <h3 className="text-3xl font-black leading-tight">{tt(s, 'title') || t('عنوان المادة', 'Course title')}</h3>
              <span className="mt-8 inline-block text-sm font-bold opacity-0 transition-opacity group-hover:opacity-100">{t('اعرف أكثر', 'Explore')} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Teachers */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-10 text-4xl font-black">{t('معلّمونا', 'Our teachers')}</h2>
        <div className="flex flex-wrap gap-8">
          {(teachers.length ? teachers : [{}, {}, {}, {}]).slice(0, 6).map((tc: any, i: number) => (
            <div key={tc.id || i} className="text-center">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4" style={{ background: '#e8e2d5', ['--tw-ring-color' as any]: BRAND.gold }}>
                {tc.avatar_url ? <img src={tc.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <p className="mt-3 font-bold">{tc.full_name || t('معلّم', 'Teacher')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA / footer */}
      <footer className="text-white" style={{ background: BRAND.navy }}>
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="mx-auto max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
            {t('جاهز لبدء رحلتك التعليمية؟', 'Ready to start learning?')}
          </h2>
          <Link to="/register" className="mt-8 inline-block rounded-full px-10 py-4 text-base font-bold" style={{ background: BRAND.gold }}>
            {t('أنشئ حسابك مجاناً', 'Create your free account')}
          </Link>
          <p className="mt-10 text-sm text-white/50">© {t('أكاديمية أيمن', 'Ayman Academy')}</p>
        </div>
      </footer>

      <VariantSwitcher />
    </div>
  );
}
