// The production landing page content, in the arcade (green + white) language.
//
// This holds the SECTIONS ONLY: no header, no footer, no preview chrome. The
// shared Header and Footer come from Layout, which is what `pages/Landing.tsx`
// wraps this in. Keeping the chrome out here is deliberate: the variant's own
// standalone nav had no mobile menu and no auth awareness, which is fine for a
// design preview and wrong for production.
//
// Single source of truth for the design. `pages/Landing.tsx` (route "/") and
// `landing/LandingV10.tsx` (the preview at /landing/10) both render this, so
// the two cannot drift apart.
//
// Art direction: radius 0, 2px borders, hard offset shadows, two colours only
// (white plus one green scale). Electric green is LIGHT, so text on it is
// always `onAccent`, never white.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData } from './useLandingData';
import { Reveal } from './useReveal';
import { ArrowLeft, ArrowRight, Award, Check, Gamepad2, Languages, Smartphone } from 'lucide-react';
import { A, hard, PIXEL_STRIP } from '@/components/arcade/theme';
import heroImage from '@/assets/hero-library.jpg';

// `level` and `onLevel` name the level-marking role, which uses the same
// accent green. `ink` is TEXT, `line` is BORDER, `band` is a deep-green FILL.
const C = {
  ...A,
  level: A.accent,
  onLevel: A.onAccent,
};

const GRAD = A.grad;

export default function LandingSections() {
  const { language, t } = useLanguage();
  const { stages, teachers, subjects, loading } = useLandingData();

  const tt = (o: any, base: string) =>
    language === 'ar' ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`];

  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;

  const initials = (name?: string) =>
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('');

  // ── Shared atoms ────────────────────────────────────────────

  const SolidCta = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      className="arc-focus arc-press inline-flex items-center gap-2 whitespace-nowrap border-2 px-7 py-3.5 text-[15px] font-black"
      style={{ background: C.accent, color: C.onAccent, borderColor: C.line }}
    >
      {children}
      <Arrow className="h-4 w-4" />
    </Link>
  );

  const OutlineCta = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      className="arc-focus arc-press inline-flex items-center gap-2 whitespace-nowrap border-2 px-7 py-3.5 text-[15px] font-black"
      style={{ background: C.surface, color: C.ink, borderColor: C.line }}
    >
      {children}
    </Link>
  );

  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div
      className={`animate-pulse border-2 ${className}`}
      style={{ background: C.surface, borderColor: C.line, opacity: 0.5 }}
      aria-hidden
    />
  );

  const EmptyNote = ({ children }: { children: React.ReactNode }) => (
    <div
      className="border-2 border-dashed p-8 text-center text-sm font-semibold"
      style={{ borderColor: C.line, color: C.inkSoft }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ background: C.bg, color: C.ink }}>
      {/* ── Hero. Poster type leading, photo in a tilted hard frame. ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1280px] gap-14 px-5 pb-20 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-24 lg:pt-20">
          <div>
            <span
              className="inline-flex items-center gap-2 border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ background: C.wash, color: C.ink, borderColor: C.line }}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              {t('تعلّم على مستويات', 'Learn in levels')}
            </span>

            <h1 className="mt-6 text-[42px] font-black leading-[1.05] tracking-tight sm:text-[58px] lg:text-[72px]">
              {t('ارفع مستواك', 'Level up in every')}
              <br />
              <span
                className="inline-block px-2"
                style={{ background: C.accent, color: C.onAccent }}
              >
                {t('في كل مادة', 'school subject')}
              </span>
            </h1>

            <p
              className="mt-7 max-w-[48ch] text-[17px] font-medium leading-relaxed"
              style={{ color: C.inkSoft }}
            >
              {t(
                'اختر مرحلتك، أكمل الدروس، واجمع شهاداتك مادة بعد مادة.',
                'Choose your stage, finish the lessons, and collect certificates subject by subject.',
              )}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <SolidCta to="/register">{t('ابدأ الآن', 'Get started')}</SolidCta>
              <OutlineCta to="/marketplace">{t('تصفّح المواد', 'Browse courses')}</OutlineCta>
            </div>
          </div>

          {/* Real photograph, hard-framed and tilted, with an accent plate behind. */}
          <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
            <div
              className="absolute inset-0 translate-x-3 translate-y-3 rotate-[3deg]"
              style={{ background: C.level, border: `2px solid ${C.line}` }}
              aria-hidden
            />
            <div
              className="relative -rotate-[2deg] overflow-hidden"
              style={{ border: `2px solid ${C.line}`, boxShadow: hard(6) }}
            >
              <img
                src={heroImage}
                alt={t('طلاب يدرسون في مكتبة', 'Students studying in a library')}
                className="aspect-[4/3.4] w-full object-cover"
                loading="eager"
              />
            </div>

            {/* stages.length is a real total. The featured teacher and subject
                queries are .limit()-capped, so their lengths are never shown
                as counts. */}
            {!loading && stages.length > 0 && (
              <div
                className="absolute -bottom-4 start-2 flex items-center gap-2 border-2 px-3 py-2"
                style={{
                  background: C.surface,
                  borderColor: C.line,
                  boxShadow: hard(3),
                }}
              >
                <span className="font-mono text-[20px] font-black" style={{ color: C.mid }}>
                  {stages.length}
                </span>
                <span className="text-[12px] font-bold">
                  {t('مستويات دراسية', 'Stages live')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-[6px] w-full" style={{ background: PIXEL_STRIP }} aria-hidden />
      </section>

      {/* ── Levels ladder. One tile per stage, exact cell count. ── */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8 lg:py-24">
        <Reveal>
          <h2 className="max-w-[24ch] text-[30px] font-black leading-tight tracking-tight sm:text-[42px]">
            {t('اختر مستواك وابدأ', 'Pick your level and go')}
          </h2>
          <p
            className="mt-4 max-w-[56ch] text-[16px] font-medium leading-relaxed"
            style={{ color: C.inkSoft }}
          >
            {t(
              'كل مرحلة دراسية تحتوي موادها كاملة، مرتّبة بنفس ترتيب المدرسة.',
              'Every stage holds its full set of subjects, in the same order school teaches them.',
            )}
          </p>
        </Reveal>

        {loading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="mt-10">
            <EmptyNote>
              {t(
                'لم تُضف مراحل دراسية بعد. أضفها من لوحة التحكم لتظهر هنا.',
                'No stages yet. Add them from the admin panel and they will appear here.',
              )}
            </EmptyNote>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map((s: any, i: number) => (
              <Reveal key={s.id} delay={i * 70}>
                <Link
                  to={`/stages/${s.slug || s.id}`}
                  className="arc-focus arc-press group flex h-full flex-col justify-between border-2 p-6"
                  style={{
                    background: i === 0 ? C.level : C.surface,
                    // The lead tile is filled with the accent, so its text has
                    // to switch to onAccent. The plain text token would put
                    // pale text on light green in dark mode.
                    color: i === 0 ? C.onLevel : C.ink,
                    borderColor: C.line,
                  }}
                >
                  <span
                    className="inline-flex w-fit items-center border-2 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-[0.14em]"
                    style={{
                      borderColor: i === 0 ? C.onLevel : C.line,
                      background: 'transparent',
                    }}
                  >
                    {t('مستوى', 'Level')} {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-6 block">
                    <span className="block text-[22px] font-black leading-snug">
                      {tt(s, 'title')}
                    </span>
                    {tt(s, 'description') && (
                      <span
                        className="mt-2 line-clamp-2 block text-[14px] font-medium leading-relaxed"
                        style={{ color: i === 0 ? C.onLevel : C.inkSoft }}
                      >
                        {tt(s, 'description')}
                      </span>
                    )}
                    <span className="mt-5 flex items-center gap-1.5 text-[13px] font-black">
                      {t('المواد', 'Subjects')}
                      <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ── Subjects. Asymmetric grid, first card oversized. ───── */}
      <section
        className="py-16 lg:py-24"
        style={{ background: C.wash, borderTop: `2px solid ${C.line}`, borderBottom: `2px solid ${C.line}` }}
      >
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <h2 className="max-w-[24ch] text-[30px] font-black leading-tight tracking-tight sm:text-[42px]">
                {t('مواد جاهزة للبدء', 'Subjects ready to run')}
              </h2>
              <OutlineCta to="/marketplace">{t('تصفّح المواد', 'Browse courses')}</OutlineCta>
            </div>
          </Reveal>

          {loading ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-56" />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <div className="mt-10">
              <EmptyNote>
                {t(
                  'لا توجد مواد معروضة على الصفحة الرئيسية بعد.',
                  'No subjects are featured on the homepage yet.',
                )}
              </EmptyNote>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((s: any, i: number) => (
                <Reveal
                  key={s.id}
                  delay={i * 80}
                  className={i === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}
                >
                  <Link
                    to={`/course/${s.id}`}
                    className="arc-focus arc-press group flex h-full flex-col justify-between border-2 p-6 lg:p-7"
                    style={{
                      background: i === 0 ? C.accent : C.surface,
                      color: i === 0 ? C.onAccent : C.ink,
                      borderColor: C.line,
                    }}
                  >
                    <span>
                      {s.stage && (
                        <span
                          className="inline-block border-2 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-[0.12em]"
                          style={{
                            borderColor: i === 0 ? C.onAccent : C.ink,
                            color: i === 0 ? C.onAccent : C.ink,
                          }}
                        >
                          {tt(s.stage, 'title')}
                        </span>
                      )}
                      <span
                        className={`mt-5 block font-black leading-snug ${
                          i === 0 ? 'text-[30px] sm:text-[38px]' : 'text-[21px]'
                        }`}
                      >
                        {tt(s, 'title')}
                      </span>
                    </span>
                    <span className="mt-8 flex items-center gap-1.5 text-[13px] font-black">
                      {t('تفاصيل المادة', 'Course details')}
                      <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── How it works. Big-type rows split by hard rules. ───── */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8 lg:py-24">
        <Reveal>
          <h2 className="max-w-[20ch] text-[30px] font-black leading-tight tracking-tight sm:text-[42px]">
            {t('ثلاث خطوات حتى أول درس', 'Three moves to your first lesson')}
          </h2>
        </Reveal>

        <div className="mt-12">
          {[
            {
              ar: 'اختر مرحلتك',
              en: 'Pick your stage',
              dAr: 'حدّد صفّك الدراسي لترى المواد التي تناسبه فقط، بلا تشويش.',
              dEn: 'Set your grade and see only the subjects that fit it, nothing else.',
            },
            {
              ar: 'اشترك في المادة',
              en: 'Subscribe to a subject',
              dAr: 'ادفع للمعلّم مباشرة، ويُفتح لك المحتوى بعد تأكيده للطلب.',
              dEn: 'Pay the teacher directly. Content opens once they confirm the order.',
            },
            {
              ar: 'ابدأ التعلّم',
              en: 'Start learning',
              dAr: 'دروس وتمارين واختبارات قصيرة، وتقدّمك محفوظ في كل مرة.',
              dEn: 'Lessons, exercises and short quizzes, with progress saved every time.',
            },
          ].map((step, i) => (
            <Reveal key={step.en} delay={i * 90}>
              <div
                className="grid gap-4 py-8 md:grid-cols-[1fr_1.2fr] md:items-baseline md:gap-10"
                style={{ borderTop: `2px solid ${C.line}` }}
              >
                <h3 className="text-[26px] font-black leading-tight tracking-tight sm:text-[32px]">
                  {language === 'ar' ? step.ar : step.en}
                </h3>
                <p
                  className="max-w-[54ch] text-[16px] font-medium leading-relaxed"
                  style={{ color: C.inkSoft }}
                >
                  {language === 'ar' ? step.dAr : step.dEn}
                </p>
              </div>
            </Reveal>
          ))}
          <div style={{ borderTop: `2px solid ${C.line}` }} />
        </div>
      </section>

      {/* ── What you get. Three real capabilities on a gradient band. ── */}
      <section
        style={{
          background: GRAD,
          borderTop: `2px solid ${C.line}`,
          borderBottom: `2px solid ${C.line}`,
        }}
      >
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-14 sm:grid-cols-3 lg:px-8">
          {[
            {
              icon: Languages,
              ar: 'عربي وإنجليزي',
              en: 'Arabic and English',
              dAr: 'كل درس متاح باللغتين مع دعم كامل للاتجاه من اليمين.',
              dEn: 'Every lesson in both languages, with full right-to-left support.',
            },
            {
              icon: Smartphone,
              ar: 'على أي جهاز',
              en: 'On any device',
              dAr: 'تابع من الجوال أو الحاسب، والتقدّم يُحفظ تلقائياً.',
              dEn: 'Study on phone or desktop. Progress saves automatically.',
            },
            {
              icon: Award,
              ar: 'شهادة عند الإتمام',
              en: 'Certificate on completion',
              dAr: 'شهادة قابلة للتحقق برمز فريد عند إكمال المادة.',
              dEn: 'A verifiable certificate with a unique code once you finish.',
            },
          ].map((item, i) => (
            <Reveal key={item.en} delay={i * 80}>
              <div className="flex gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center border-2"
                  style={{ background: C.accent, color: C.onAccent, borderColor: C.accent }}
                >
                  <item.icon className="h-[22px] w-[22px]" />
                </span>
                <span>
                  <span className="block text-[16px] font-black" style={{ color: C.onInk }}>
                    {language === 'ar' ? item.ar : item.en}
                  </span>
                  <span
                    className="mt-1 block text-[14px] font-medium leading-relaxed"
                    style={{ color: C.onInkMuted }}
                  >
                    {language === 'ar' ? item.dAr : item.dEn}
                  </span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Teachers. Bordered rows, real names from the DB. ───── */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8 lg:py-24">
        <Reveal>
          <h2 className="max-w-[26ch] text-[30px] font-black leading-tight tracking-tight sm:text-[42px]">
            {t('المعلّمون الذين يشرحون المواد', 'The teachers behind the lessons')}
          </h2>
        </Reveal>

        {loading ? (
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="mt-10">
            <EmptyNote>
              {t(
                'لم يُعرض أي معلّم على الصفحة الرئيسية بعد.',
                'No teachers are featured on the homepage yet.',
              )}
            </EmptyNote>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {teachers.slice(0, 6).map((teacher: any, i: number) => (
              <Reveal key={teacher.id} delay={i * 70}>
                <Link
                  to={`/t/${teacher.id}`}
                  className="arc-focus arc-press group flex h-full items-center gap-4 border-2 p-4"
                  style={{ background: C.surface, borderColor: C.line }}
                >
                  {teacher.avatar_url ? (
                    <img
                      src={teacher.avatar_url}
                      alt=""
                      className="h-14 w-14 shrink-0 object-cover"
                      style={{ border: `2px solid ${C.line}` }}
                    />
                  ) : (
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center text-[17px] font-black"
                      style={{ background: C.level, color: C.onLevel, border: `2px solid ${C.line}` }}
                    >
                      {initials(teacher.full_name)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-black">
                      {teacher.full_name}
                    </span>
                    {tt(teacher, 'bio') ? (
                      <span
                        className="mt-0.5 line-clamp-2 block text-[13px] font-medium leading-relaxed"
                        style={{ color: C.inkSoft }}
                      >
                        {tt(teacher, 'bio')}
                      </span>
                    ) : (
                      <span
                        className="mt-0.5 block text-[13px] font-bold"
                        style={{ color: C.mid }}
                      >
                        {t('معلّم', 'Teacher')}
                      </span>
                    )}
                  </span>
                  <Arrow
                    className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                    style={{ color: C.mid }}
                  />
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ── Teach with us. Deep green block, offset white panel. ── */}
      <section style={{ background: C.band, borderTop: `2px solid ${C.line}` }}>
        <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14">
            <Reveal>
              <h2
                className="text-[32px] font-black leading-tight tracking-tight sm:text-[44px]"
                style={{ color: C.onInk }}
              >
                {t('تشرح مادة مدرسية؟', 'Do you teach a school subject?')}
              </h2>
              <p
                className="mt-5 max-w-[48ch] text-[17px] font-medium leading-relaxed"
                style={{ color: C.onInkMuted }}
              >
                {t(
                  'أنشئ موادك على المنصة، وحدّد سعرك، واستلم المدفوعات من طلابك مباشرة.',
                  'Publish your subjects, set your own price, and take payment from students directly.',
                )}
              </p>
              <div className="mt-8">
                <OutlineCta to="/apply/teacher">{t('قدّم كمعلّم', 'Teach with us')}</OutlineCta>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <ul
                className="divide-y-2 border-2 p-6 sm:p-8"
                style={{ background: C.surface, borderColor: C.line, boxShadow: hard(7) }}
              >
                {[
                  {
                    ar: 'أدوات جاهزة لبناء الدروس',
                    en: 'Ready tools for building lessons',
                    dAr: 'محرّر دروس بالأقسام والفيديو والملفات والتمارين، ومنشئ اختبارات.',
                    dEn: 'A lesson editor with sections, video, files and exercises, plus a quiz builder.',
                  },
                  {
                    ar: 'أنت تحدّد السعر',
                    en: 'You set the price',
                    dAr: 'سعّر كل مادة كما تراه، وراجع الطلبات وأكّدها بنفسك.',
                    dEn: 'Price each subject as you see fit, then review and confirm orders yourself.',
                  },
                  {
                    ar: 'طلابك يجدونك',
                    en: 'Students find you',
                    dAr: 'ملف شخصي عام ومواد معروضة أمام طلاب مرحلتك في سوق المنصة.',
                    dEn: 'A public profile and subjects listed in the marketplace for students in your stage.',
                  },
                ].map((b, i) => (
                  <li
                    key={b.en}
                    className={`flex gap-4 ${i === 0 ? 'pb-5' : 'py-5 last:pb-0'}`}
                    style={{ borderColor: C.line }}
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center"
                      style={{ background: C.band, color: C.accent }}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span>
                      <span className="block text-[16px] font-black">
                        {language === 'ar' ? b.ar : b.en}
                      </span>
                      <span
                        className="mt-1 block text-[14px] font-medium leading-relaxed"
                        style={{ color: C.inkSoft }}
                      >
                        {language === 'ar' ? b.dAr : b.dEn}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Closing gradient block. ───────────────────────────── */}
      <section style={{ background: GRAD, borderTop: `2px solid ${C.line}` }}>
        <div className="mx-auto max-w-[900px] px-5 py-20 text-center lg:py-24">
          <Reveal>
            <h2
              className="text-[34px] font-black leading-[1.08] tracking-tight sm:text-[52px]"
              style={{ color: C.onInk }}
            >
              {t('مستواك الأول', 'Your first level')}
              <br />
              <span style={{ color: C.level }}>{t('في انتظارك', 'is waiting')}</span>
            </h2>
            <p
              className="mx-auto mt-6 max-w-[50ch] text-[17px] font-medium leading-relaxed"
              style={{ color: C.onInkMuted }}
            >
              {t(
                'أنشئ حساباً، اختر مرحلتك، وابدأ بأول درس اليوم.',
                'Create an account, choose your stage, and open your first lesson today.',
              )}
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                to="/register"
                className="arc-focus arc-press inline-flex items-center gap-2 whitespace-nowrap border-2 px-8 py-4 text-[16px] font-black"
                style={{
                  background: C.level,
                  color: C.onLevel,
                  borderColor: C.onInk,
                  // Light shadow so the button reads against the dark band.
                  // Set through the custom property, never inline box-shadow,
                  // or .arc-press loses its hover and active states.
                  ['--arc-press-color' as string]: C.onInk,
                }}
              >
                {t('ابدأ الآن', 'Get started')}
                <Arrow className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="h-[6px] w-full opacity-40" style={{ background: PIXEL_STRIP }} aria-hidden />
      </section>
    </div>
  );
}
