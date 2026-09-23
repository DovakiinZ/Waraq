// Variant 4 — Premium Dark.
// Cinematic near-black navy hero with gold glow, glassy cards, aspirational.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData, BRAND } from './useLandingData';
import VariantSwitcher from './VariantSwitcher';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-library.jpg';

export default function LandingV4() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const tt = (o: any, base: string) => (language === 'ar' ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);

  return (
    <div className="min-h-screen" style={{ background: BRAND.navyDeep, color: '#fff' }}>
      {/* Hero block with glow */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-15%] h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: BRAND.gold, opacity: 0.18 }} />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(to bottom, transparent, black 40%, transparent)' }} />

        {/* Nav */}
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-10 w-10 object-contain" />
            <span className="text-lg font-bold">{t('ورق أكاديمي', 'Waraq Academy')}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-white/70">
            <Link to="/subjects" className="hidden hover:text-white sm:inline">{t('المواد', 'Courses')}</Link>
            <button onClick={toggleLanguage} className="hover:text-white">{language === 'ar' ? 'EN' : 'ع'}</button>
            <Link to="/login" className="rounded-full border border-white/20 px-5 py-2 text-white hover:bg-white/10">{t('دخول', 'Sign in')}</Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur" style={{ color: BRAND.goldLight }}>
            {t('✦ تجربة تعليمية استثنائية', '✦ An exceptional learning experience')}
          </span>
          <h1 className="mt-8 text-5xl font-black leading-[1.05] sm:text-7xl">
            {t('تعليم بمستوى', 'Learning at a')}<br />
            <span style={{ background: `linear-gradient(90deg, ${BRAND.goldLight}, #f0d998)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {t('يليق بطموحك', 'level worthy of you')}
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg text-white/60">
            {t('انضمّ إلى منصّة تجمع أفضل المعلّمين ومحتوى مصمّم بعناية لكل مرحلة دراسية.', 'Join a platform of top teachers and carefully crafted content for every stage.')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="rounded-full px-8 py-4 text-base font-bold text-[#131921] transition-transform hover:scale-105" style={{ background: BRAND.goldLight }}>
              {t('ابدأ الآن', 'Get started')}
            </Link>
            <Link to="/subjects" className="rounded-full border border-white/20 px-8 py-4 text-base font-bold hover:bg-white/10">
              {t('تصفّح المواد', 'Browse courses')}
            </Link>
          </div>
        </section>
      </div>

      {/* Stats strip */}
      <section className="border-y border-white/10">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-10 text-center">
          {[
            { v: `${stages.length || 4}`, l: t('مراحل دراسية', 'stages') },
            { v: `${teachers.length || 12}+`, l: t('معلّم خبير', 'expert teachers') },
            { v: `${subjects.length || 40}+`, l: t('مادة تعليمية', 'courses') },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-4xl font-black" style={{ color: BRAND.goldLight }}>{s.v}</p>
              <p className="mt-1 text-sm text-white/50">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stages — glass cards */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-3xl font-bold">{t('المراحل الدراسية', 'Study stages')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(stages.length ? stages : [{}, {}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Link key={s.id || i} to={s.slug ? `/stages/${s.slug}` : '/stages'}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors hover:border-white/25 hover:bg-white/[0.06]">
              <span className="text-3xl font-black tabular-nums" style={{ color: 'rgba(212,168,83,0.4)' }}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 text-xl font-bold">{tt(s, 'title') || t('مرحلة', 'Stage')}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-10 text-3xl font-bold">{t('مواد مميّزة', 'Featured courses')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(subjects.length ? subjects : [{}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Link key={s.id || i} to="/subjects" className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-6 hover:border-white/25">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">{tt(s.stage, 'title') || t('مادة', 'Course')}</p>
                <h3 className="mt-1 text-xl font-bold">{tt(s, 'title') || t('عنوان المادة', 'Course title')}</h3>
              </div>
              <span className="text-white/30 transition-colors group-hover:text-white" style={{ color: BRAND.goldLight }}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Teachers */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-10 text-3xl font-bold">{t('نخبة المعلّمين', 'Our teachers')}</h2>
        <div className="flex flex-wrap gap-8">
          {(teachers.length ? teachers : [{}, {}, {}, {}]).slice(0, 6).map((tc: any, i: number) => (
            <div key={tc.id || i} className="text-center">
              <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-white/10" style={{ background: '#1f2a38' }}>
                {tc.avatar_url ? <img src={tc.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-white/80">{tc.full_name || t('معلّم', 'Teacher')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <footer className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute left-1/2 bottom-[-40%] h-[400px] w-[400px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: BRAND.gold, opacity: 0.15 }} />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-4xl font-black sm:text-5xl">{t('ابدأ رحلتك اليوم', 'Begin your journey today')}</h2>
          <Link to="/register" className="mt-8 inline-block rounded-full px-10 py-4 text-base font-bold text-[#131921]" style={{ background: BRAND.goldLight }}>
            {t('أنشئ حسابك مجاناً', 'Create your free account')}
          </Link>
          <p className="mt-10 text-sm text-white/40">© {t('ورق أكاديمي', 'Waraq Academy')}</p>
        </div>
      </footer>

      <VariantSwitcher />
    </div>
  );
}
