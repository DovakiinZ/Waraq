// Variant 3 — Playful / Kid-friendly.
// Rounded shapes, warm soft palette, emoji accents, bouncy hovers, blobs.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData, BRAND } from './useLandingData';
import VariantSwitcher from './VariantSwitcher';
import logo from '@/assets/logo.png';

const EMOJIS = ['📚', '🔬', '🧮', '🌍', '🎨', '⭐'];

export default function LandingV3() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const tt = (o: any, base: string) => (language === 'ar' ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: '#FFF9F0', color: BRAND.navy }}>
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="" className="h-11 w-11 rounded-2xl object-contain" />
          <span className="text-lg font-extrabold">{t('أكاديمية أيمن', 'Ayman Academy')}</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <button onClick={toggleLanguage} className="rounded-full bg-white px-4 py-2 shadow-sm">{language === 'ar' ? 'EN' : 'ع'}</button>
          <Link to="/register" className="rounded-full px-5 py-2.5 text-white shadow-lg" style={{ background: BRAND.gold }}>
            {t('انضم إلينا', 'Join us')}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 py-16 text-center">
        <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full" style={{ background: BRAND.gold, opacity: 0.15 }} />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-52 w-52 rounded-full" style={{ background: BRAND.navy, opacity: 0.08 }} />
        <span className="inline-block rounded-full bg-white px-5 py-2 text-sm font-extrabold shadow-sm">
          🎉 {t('تعلُّم ممتع لكل طالب', 'Fun learning for every student')}
        </span>
        <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-black leading-[1.05] sm:text-7xl">
          {t('التعلّم يصير ', 'Make learning ')}
          <span className="relative inline-block" style={{ color: BRAND.gold }}>
            {t('متعة!', 'fun!')}
            <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 200 12" fill="none">
              <path d="M2 9C50 3 150 3 198 9" stroke={BRAND.gold} strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg font-medium" style={{ color: '#6b7885' }}>
          {t('دروس مصوّرة، اختبارات ممتعة، وشهادات تحفّز طفلك على التعلّم كل يوم.', 'Video lessons, fun quizzes, and certificates that keep kids learning every day.')}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register" className="rounded-full px-8 py-4 text-base font-extrabold text-white shadow-xl transition-transform hover:-translate-y-1 active:translate-y-0" style={{ background: BRAND.navy }}>
            {t('ابدأ المغامرة 🚀', 'Start the adventure 🚀')}
          </Link>
          <Link to="/subjects" className="rounded-full bg-white px-8 py-4 text-base font-extrabold shadow-md">
            {t('شاهد المواد', 'See courses')}
          </Link>
        </div>
      </section>

      {/* Stages — colorful bubbles */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="mb-8 text-center text-3xl font-black">{t('اختر مرحلتك', 'Pick your stage')}</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {(stages.length ? stages : [{}, {}, {}, {}]).slice(0, 6).map((s: any, i: number) => (
            <Link key={s.id || i} to={s.slug ? `/stages/${s.slug}` : '/stages'}
              className="flex items-center gap-3 rounded-full bg-white px-6 py-4 text-lg font-extrabold shadow-md transition-transform hover:-translate-y-1 hover:rotate-1">
              <span className="text-2xl">{EMOJIS[i % EMOJIS.length]}</span>
              {tt(s, 'title') || t('مرحلة', 'Stage')}
            </Link>
          ))}
        </div>
      </section>

      {/* Subjects — chunky cards */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="mb-8 text-center text-3xl font-black">{t('مواد يحبّها الطلاب', 'Courses kids love')}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(subjects.length ? subjects : [{}, {}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Link key={s.id || i} to="/subjects" className="rounded-3xl bg-white p-6 shadow-md transition-transform hover:-translate-y-2">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ background: '#FFF3DE' }}>{EMOJIS[i % EMOJIS.length]}</div>
              <p className="text-xs font-bold uppercase" style={{ color: BRAND.gold }}>{tt(s.stage, 'title') || t('مادة', 'Course')}</p>
              <h3 className="mt-1 text-lg font-extrabold leading-snug">{tt(s, 'title') || t('عنوان المادة', 'Course title')}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Teachers */}
      <section className="mx-auto max-w-6xl px-6 py-14 text-center">
        <h2 className="mb-8 text-3xl font-black">{t('معلّمون ودودون 🤗', 'Friendly teachers 🤗')}</h2>
        <div className="flex flex-wrap justify-center gap-6">
          {(teachers.length ? teachers : [{}, {}, {}, {}]).slice(0, 6).map((tc: any, i: number) => (
            <div key={tc.id || i} className="rounded-3xl bg-white p-4 shadow-md">
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl" style={{ background: '#FFF3DE' }}>
                {tc.avatar_url ? <img src={tc.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl">🧑‍🏫</div>}
              </div>
              <p className="mt-2 text-sm font-extrabold">{tc.full_name || t('معلّم', 'Teacher')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-[2.5rem] px-8 py-14 text-center text-white shadow-2xl" style={{ background: BRAND.navy }}>
          <h2 className="text-4xl font-black">{t('هيّا نبدأ التعلّم! 🎈', "Let's start learning! 🎈")}</h2>
          <Link to="/register" className="mt-8 inline-block rounded-full px-10 py-4 text-lg font-extrabold" style={{ background: BRAND.gold }}>
            {t('سجّل مجاناً', 'Sign up free')}
          </Link>
        </div>
        <p className="mt-8 text-center text-sm font-semibold" style={{ color: '#9aa5b1' }}>© {t('أكاديمية أيمن', 'Ayman Academy')}</p>
      </section>

      <VariantSwitcher />
    </div>
  );
}
