// Variant 5 — Conversion-focused.
// Value prop + trust stats + strong CTAs + stages/subjects grid + social proof.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData, BRAND } from './useLandingData';
import VariantSwitcher from './VariantSwitcher';
import logo from '@/assets/logo.png';

export default function LandingV5() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const tt = (o: any, base: string) => (language === 'ar' ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);

  const steps = [
    { icon: '📝', ar: 'أنشئ حسابك', en: 'Create account', dar: 'سجّل مجاناً واختر مرحلتك الدراسية.', den: 'Sign up free and pick your stage.' },
    { icon: '🎯', ar: 'اختر موادك', en: 'Choose courses', dar: 'تصفّح المواد واشترك في ما يناسبك.', den: 'Browse and enroll in what fits you.' },
    { icon: '🏆', ar: 'تعلّم واحصل على شهادة', en: 'Learn & earn a certificate', dar: 'أكمل الدروس واحصل على شهادتك.', den: 'Finish lessons and get certified.' },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ color: BRAND.navy }}>
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
            <span className="font-extrabold">{t('ورق أكاديمي', 'Waraq Academy')}</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <button onClick={toggleLanguage} className="opacity-70 hover:opacity-100">{language === 'ar' ? 'EN' : 'ع'}</button>
            <Link to="/login" className="opacity-70 hover:opacity-100">{t('دخول', 'Sign in')}</Link>
            <Link to="/register" className="rounded-lg px-4 py-2 text-white" style={{ background: BRAND.gold }}>{t('ابدأ مجاناً', 'Start free')}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold" style={{ background: '#FFF3DE', color: BRAND.gold }}>
          ⭐ {t('يثق بنا آلاف الطلاب', 'Trusted by thousands of students')}
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-[1.1] sm:text-6xl">
          {t('حسّن درجاتك مع أفضل ', 'Boost your grades with the best ')}
          <span style={{ color: BRAND.gold }}>{t('المعلّمين', 'teachers')}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg" style={{ color: '#5b6b7a' }}>
          {t('دروس واضحة، اختبارات تقيس تقدّمك، وشهادات معتمدة، كل ذلك في مكان واحد.', 'Clear lessons, quizzes that track progress, and certificates, all in one place.')}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/register" className="w-full rounded-xl px-8 py-4 text-base font-bold text-white sm:w-auto" style={{ background: BRAND.navy }}>
            {t('أنشئ حسابك مجاناً', 'Create free account')}
          </Link>
          <Link to="/subjects" className="w-full rounded-xl border-2 px-8 py-4 text-base font-bold sm:w-auto" style={{ borderColor: BRAND.navy }}>
            {t('تصفّح المواد', 'Browse courses')}
          </Link>
        </div>
        <p className="mt-4 text-sm" style={{ color: '#9aa5b1' }}>{t('بدون بطاقة ائتمان · إلغاء في أي وقت', 'No credit card · cancel anytime')}</p>
      </section>

      {/* Trust stats */}
      <section className="border-y" style={{ borderColor: 'rgba(30,58,95,0.08)', background: BRAND.surface }}>
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-6 py-8 text-center">
          {[
            { v: `${teachers.length || 12}+`, l: t('معلّم', 'teachers') },
            { v: `${subjects.length || 40}+`, l: t('مادة', 'courses') },
            { v: `${stages.length || 4}`, l: t('مراحل', 'stages') },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-black" style={{ color: BRAND.navy }}>{s.v}</p>
              <p className="text-sm" style={{ color: '#8b97a3' }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-black">{t('كيف تبدأ؟', 'How it works')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl border p-7 text-center" style={{ borderColor: 'rgba(30,58,95,0.1)' }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: '#FFF3DE' }}>{s.icon}</div>
              <p className="mb-1 text-xs font-bold" style={{ color: BRAND.gold }}>{t('الخطوة', 'Step')} {i + 1}</p>
              <h3 className="text-lg font-bold">{language === 'ar' ? s.ar : s.en}</h3>
              <p className="mt-2 text-sm" style={{ color: '#6b7885' }}>{language === 'ar' ? s.dar : s.den}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stages */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-8 text-center text-3xl font-black">{t('ابدأ من مرحلتك', 'Start from your stage')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(stages.length ? stages : [{}, {}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Link key={s.id || i} to={s.slug ? `/stages/${s.slug}` : '/stages'}
              className="rounded-xl border-2 p-5 text-center font-bold transition-colors hover:text-white" style={{ borderColor: BRAND.navy }}
              onMouseEnter={(e) => (e.currentTarget.style.background = BRAND.navy)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              {tt(s, 'title') || t('مرحلة', 'Stage')}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured subjects */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-black">{t('مواد شائعة', 'Popular courses')}</h2>
          <Link to="/subjects" className="text-sm font-bold" style={{ color: BRAND.gold }}>{t('الكل', 'View all')} →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(subjects.length ? subjects : [{}, {}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Link key={s.id || i} to="/subjects" className="overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg" style={{ borderColor: 'rgba(30,58,95,0.1)' }}>
              <div className="h-28" style={{ background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.gold})` }} />
              <div className="p-5">
                <p className="text-xs font-bold uppercase" style={{ color: BRAND.gold }}>{tt(s.stage, 'title') || t('مادة', 'Course')}</p>
                <h3 className="mt-1 font-bold leading-snug">{tt(s, 'title') || t('عنوان المادة', 'Course title')}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section style={{ background: BRAND.surface }}>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <div className="mb-4 text-3xl" style={{ color: BRAND.gold }}>★★★★★</div>
          <p className="text-2xl font-medium leading-relaxed">
            {t('"تحسّنت درجات ابني بشكل ملحوظ خلال شهرين فقط. المعلّمون رائعون والدروس واضحة."', '"My son\'s grades improved noticeably in just two months. Great teachers, clear lessons."')}
          </p>
          <p className="mt-6 font-bold">{t('رانية خليل · ولية أمر', 'Rania Khalil · Parent')}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-4xl font-black">{t('جاهز للبدء؟', 'Ready to start?')}</h2>
        <p className="mx-auto mt-4 max-w-md text-lg" style={{ color: '#5b6b7a' }}>{t('انضمّ اليوم وابدأ أول درس مجاناً.', 'Join today and start your first lesson free.')}</p>
        <Link to="/register" className="mt-8 inline-block rounded-xl px-10 py-4 text-base font-bold text-white" style={{ background: BRAND.navy }}>
          {t('أنشئ حسابك الآن', 'Create your account')}
        </Link>
      </section>

      <footer className="border-t py-8 text-center text-sm" style={{ borderColor: 'rgba(30,58,95,0.08)', color: '#9aa5b1' }}>
        © {t('ورق أكاديمي', 'Waraq Academy')}
      </footer>

      <VariantSwitcher />
    </div>
  );
}
