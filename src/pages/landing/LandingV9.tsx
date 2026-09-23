// Variant 9 - Illustration-led education landing, in the Pikbest edtech-template
// family: asymmetric split hero with floating info cards, tinted subject tiles,
// an icon-led process row and a full-bleed closing colour block.
//
// The point of this variant is COLOUR. It ships four complete palettes
// (see palettes.ts) that can be switched live in the browser, so the direction
// can be picked by eye rather than rebuilt. Navy + gold is deliberately absent.
//
// Dials: DESIGN_VARIANCE 7 / MOTION_INTENSITY 5 / VISUAL_DENSITY 4.
// One radius scale (pill for interactive, 20px cards, 14px chips), one accent
// per palette, one theme active at a time. RTL-first with logical properties.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData } from './useLandingData';
import { Reveal } from './useReveal';
import VariantSwitcher from './VariantSwitcher';
import PaletteSwitcher from './PaletteSwitcher';
import {
  PALETTES,
  R,
  readStoredPalette,
  writeStoredPalette,
  type PaletteKey,
} from './palettes';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Compass,
  CreditCard,
  GraduationCap,
  Languages,
  Layers,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-library.jpg';

export default function LandingV9() {
  const { language, t } = useLanguage();
  const { stages, teachers, subjects, loading } = useLandingData();
  const [paletteKey, setPaletteKey] = useState<PaletteKey>(() => readStoredPalette());
  const p = PALETTES[paletteKey];

  const choosePalette = (key: PaletteKey) => {
    setPaletteKey(key);
    writeStoredPalette(key);
  };

  // Bilingual field reader for DB rows that carry _ar / _en pairs.
  const tt = (o: any, base: string) =>
    language === 'ar' ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`];

  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;

  // Bento split: one lead tile, up to two beside it, then an evenly-dividing
  // tail row. Column counts are chosen so the grid never renders a hole.
  const lead = stages[0];
  const side = stages.slice(1, 3);
  const tail = stages.slice(3, 7);
  const tailCols =
    tail.length === 1 ? '' : tail.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  const initials = (name?: string) =>
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('');

  // ── Shared atoms ────────────────────────────────────────────

  const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <span
      className="text-[11px] font-bold uppercase tracking-[0.2em]"
      style={{ color: p.primary }}
    >
      {children}
    </span>
  );

  const PrimaryCta = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      className={`${R.pill} inline-flex items-center gap-2 whitespace-nowrap px-7 py-3.5 text-[15px] font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]`}
      style={{
        background: p.primary,
        color: p.onPrimary,
        boxShadow: `0 10px 26px ${p.primary}45`,
      }}
    >
      {children}
      <Arrow className="h-4 w-4" />
    </Link>
  );

  const GhostCta = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      className={`${R.pill} inline-flex items-center gap-2 whitespace-nowrap border-2 px-7 py-3.5 text-[15px] font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]`}
      style={{ borderColor: p.primary, color: p.primary, background: 'transparent' }}
    >
      {children}
    </Link>
  );

  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div
      className={`${R.card} animate-pulse ${className}`}
      style={{ background: p.tint }}
      aria-hidden
    />
  );

  const EmptyNote = ({ children }: { children: React.ReactNode }) => (
    <div
      className={`${R.card} border border-dashed p-8 text-center text-sm`}
      style={{ borderColor: p.line, color: p.inkSoft }}
    >
      {children}
    </div>
  );

  return (
    <div
      className="min-h-[100dvh] font-arabic"
      style={{ background: p.bg, color: p.ink }}
    >
      {/* ── Navigation. One line at desktop, 68px tall. ───────── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          borderColor: p.line,
          background: p.mode === 'dark' ? `${p.bg}E6` : `${p.surface}E6`,
        }}
      >
        <nav className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-6 px-5 lg:px-8">
          <Link to="/landing/9" className="flex shrink-0 items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl object-contain" />
            <span className="text-[17px] font-extrabold tracking-tight">
              {t('ورق أكاديمي', 'Waraq Academy')}
            </span>
          </Link>

          <div className="mx-auto hidden items-center gap-7 lg:flex">
            {[
              { to: '/stages', ar: 'المراحل', en: 'Stages' },
              { to: '/marketplace', ar: 'المواد', en: 'Courses' },
              { to: '/teachers', ar: 'المعلّمون', en: 'Teachers' },
              { to: '/plans', ar: 'الخطط', en: 'Plans' },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-[15px] font-semibold transition-colors"
                style={{ color: p.inkSoft }}
                onMouseEnter={(e) => (e.currentTarget.style.color = p.primary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = p.inkSoft)}
              >
                {language === 'ar' ? l.ar : l.en}
              </Link>
            ))}
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-2 lg:ms-0">
            <LangToggle p={p} />
            <Link
              to="/login"
              className="hidden text-[15px] font-semibold sm:block"
              style={{ color: p.ink }}
            >
              {t('دخول', 'Log in')}
            </Link>
            <Link
              to="/register"
              className={`${R.pill} px-5 py-2.5 text-[14px] font-bold transition-transform hover:-translate-y-0.5 active:scale-[0.98]`}
              style={{ background: p.primary, color: p.onPrimary }}
            >
              {t('ابدأ الآن', 'Get started')}
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero. Asymmetric split, copy leading, photo trailing. ── */}
      <section className="relative overflow-hidden">
        {/* Soft primary wash behind the hero, no neon glow. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(90% 120% at 85% 0%, ${p.tint} 0%, transparent 62%)`,
          }}
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-[1280px] gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div>
            <Eyebrow>{t('منصة تعليمية عربية', 'Arabic learning platform')}</Eyebrow>

            <h1 className="mt-5 text-[38px] font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[58px]">
              {t('دروس مدرسية يشرحها', 'School subjects, taught')}
              <br />
              <span style={{ color: p.primary }}>
                {t('معلّمون تثق بهم', 'by teachers you trust')}
              </span>
            </h1>

            <p
              className="mt-6 max-w-[52ch] text-[17px] leading-relaxed"
              style={{ color: p.inkSoft }}
            >
              {t(
                'اختر مرحلتك الدراسية، تابع الدروس بالفيديو والتمارين، وراقب تقدّمك خطوة بخطوة.',
                'Pick your grade, follow video lessons and exercises, and track your progress step by step.',
              )}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <PrimaryCta to="/register">{t('ابدأ الآن', 'Get started')}</PrimaryCta>
              <GhostCta to="/marketplace">{t('تصفّح المواد', 'Browse courses')}</GhostCta>
            </div>
          </div>

          {/* Hero visual. Real photograph from the repo, framed, with two
              floating cards carrying live data (stage count) and a real
              platform capability. */}
          <div className="relative">
            <div
              className={`${R.card} relative overflow-hidden`}
              style={{ boxShadow: `0 26px 70px ${p.ink}22` }}
            >
              <img
                src={heroImage}
                alt={t(
                  'طلاب يدرسون في مكتبة',
                  'Students studying in a library',
                )}
                className="aspect-[4/3.2] w-full object-cover"
                loading="eager"
              />
            </div>

            {!loading && stages.length > 0 && (
              <div
                className={`${R.chip} absolute -bottom-5 start-4 flex items-center gap-3 border p-3.5 ps-4 sm:start-6`}
                style={{
                  background: p.surface,
                  borderColor: p.line,
                  boxShadow: `0 14px 34px ${p.ink}1F`,
                }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: p.tint, color: p.primary }}
                >
                  <Layers className="h-5 w-5" />
                </span>
                <span className="leading-tight">
                  <span className="block text-xl font-extrabold">{stages.length}</span>
                  <span className="block text-[12px] font-medium" style={{ color: p.inkSoft }}>
                    {t('مراحل دراسية', 'Stages')}
                  </span>
                </span>
              </div>
            )}

            <div
              className={`${R.chip} absolute -top-4 end-3 flex items-center gap-2 border px-3.5 py-2.5 sm:end-5`}
              style={{
                background: p.surface,
                borderColor: p.line,
                boxShadow: `0 14px 34px ${p.ink}1F`,
              }}
            >
              <Award className="h-[18px] w-[18px]" style={{ color: p.accent }} />
              <span className="text-[13px] font-bold">
                {t('شهادات إتمام', 'Completion certificates')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value band. Three real platform capabilities, no numbers. ── */}
      <section
        className="border-y"
        style={{ background: p.surfaceAlt, borderColor: p.line }}
      >
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-12 sm:grid-cols-3 lg:px-8">
          {[
            {
              icon: Languages,
              ar: 'عربي وإنجليزي',
              en: 'Arabic and English',
              dAr: 'كل درس متاح باللغتين مع دعم كامل للكتابة من اليمين.',
              dEn: 'Every lesson in both languages, with full right-to-left support.',
            },
            {
              icon: Smartphone,
              ar: 'على أي جهاز',
              en: 'On any device',
              dAr: 'تابع من الجوال أو الحاسب، ويحفظ التقدّم تلقائياً.',
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: i === 2 ? p.accent : p.primary,
                    color: i === 2 ? p.onAccent : p.onPrimary,
                  }}
                >
                  <item.icon className="h-[22px] w-[22px]" />
                </span>
                <span>
                  <span className="block text-[16px] font-bold">
                    {language === 'ar' ? item.ar : item.en}
                  </span>
                  <span
                    className="mt-1 block text-[14px] leading-relaxed"
                    style={{ color: p.inkSoft }}
                  >
                    {language === 'ar' ? item.dAr : item.dEn}
                  </span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Stages bento. Mixed tile sizes, exact cell count. ───── */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
        <Reveal>
          <Eyebrow>{t('المراحل الدراسية', 'Stages')}</Eyebrow>
          <h2 className="mt-4 max-w-[22ch] text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
            {t('ابدأ من مرحلتك الحالية', 'Start from the grade you are in')}
          </h2>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed" style={{ color: p.inkSoft }}>
            {t(
              'كل مرحلة تحتوي موادها الدراسية مرتّبة بالترتيب الذي يدرس به الطالب في مدرسته.',
              'Each stage holds its subjects, ordered the way a student meets them at school.',
            )}
          </p>
        </Reveal>

        {loading ? (
          <div className="mt-10 grid gap-4 md:grid-cols-3 md:auto-rows-[minmax(160px,1fr)]">
            <Skeleton className="md:col-span-2 md:row-span-2 h-72 md:h-auto" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
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
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3 md:auto-rows-[minmax(160px,1fr)]">
              {/* Lead tile carries the photograph. */}
              <Reveal className="md:col-span-2 md:row-span-2">
                <Link
                  to={`/stages/${lead.slug || lead.id}`}
                  className={`${R.card} group relative block h-full min-h-[280px] overflow-hidden`}
                >
                  <img
                    src={heroImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <span
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to top, ${p.primaryDeep}F2 0%, ${p.primaryDeep}99 45%, ${p.primaryDeep}33 100%)`,
                    }}
                  />
                  <span className="absolute inset-x-0 bottom-0 p-7">
                    <span
                      className={`${R.pill} mb-3 inline-block px-3 py-1 text-[11px] font-bold`}
                      style={{ background: p.accent, color: p.onAccent }}
                    >
                      {t('الأكثر طلباً', 'Most requested')}
                    </span>
                    <span
                      className="block text-[26px] font-extrabold leading-tight sm:text-[32px]"
                      style={{ color: p.onPrimary }}
                    >
                      {tt(lead, 'title')}
                    </span>
                    {tt(lead, 'description') && (
                      <span
                        className="mt-2 block max-w-[46ch] text-[14px] leading-relaxed"
                        style={{ color: `${p.onPrimary}CC` }}
                      >
                        {tt(lead, 'description')}
                      </span>
                    )}
                  </span>
                </Link>
              </Reveal>

              {side.map((s: any, i: number) => (
                <Reveal key={s.id} delay={(i + 1) * 90}>
                  <StageTile stage={s} p={p} tt={tt} Arrow={Arrow} accent={i === 0} />
                </Reveal>
              ))}
            </div>

            {tail.length > 0 && (
              <div className={`mt-4 grid gap-4 ${tailCols}`}>
                {tail.map((s: any, i: number) => (
                  <Reveal key={s.id} delay={i * 80}>
                    <StageTile stage={s} p={p} tt={tt} Arrow={Arrow} accent={false} />
                  </Reveal>
                ))}
              </div>
            )}

            <div className="mt-8">
              <GhostCta to="/stages">{t('كل المراحل', 'All stages')}</GhostCta>
            </div>
          </>
        )}
      </section>

      {/* ── How it works. Icon path, verb labels, no step numbering. ── */}
      <section style={{ background: p.surfaceAlt }}>
        <div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-24">
          <Reveal>
            <h2 className="max-w-[20ch] text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
              {t('ثلاث خطوات حتى أول درس', 'Three moves to your first lesson')}
            </h2>
          </Reveal>

          <div className="relative mt-14">
            {/* Connector behind the icons, desktop only. */}
            <div
              className="absolute inset-x-[16%] top-8 hidden h-[2px] md:block"
              style={{
                background: `linear-gradient(90deg, ${p.primary}00, ${p.primary}66, ${p.primary}00)`,
              }}
              aria-hidden
            />
            <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  icon: Compass,
                  ar: 'اختر مرحلتك',
                  en: 'Pick your stage',
                  dAr: 'حدّد صفّك الدراسي لترى المواد التي تناسبه فقط.',
                  dEn: 'Set your grade and see only the subjects that fit it.',
                },
                {
                  icon: CreditCard,
                  ar: 'اشترك في المادة',
                  en: 'Subscribe to a subject',
                  dAr: 'ادفع للمعلّم مباشرة، ويُفتح لك المحتوى بعد التأكيد.',
                  dEn: 'Pay the teacher directly. Content opens once they confirm.',
                },
                {
                  icon: GraduationCap,
                  ar: 'ابدأ التعلّم',
                  en: 'Start learning',
                  dAr: 'دروس وتمارين واختبارات قصيرة، وتقدّمك محفوظ دائماً.',
                  dEn: 'Lessons, exercises and short quizzes, with progress always saved.',
                },
              ].map((step, i) => (
                <Reveal key={step.en} delay={i * 110}>
                  <div className="text-center md:text-start">
                    <span
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full md:mx-0"
                      style={{
                        background: p.surface,
                        color: p.primary,
                        border: `2px solid ${p.primary}`,
                        boxShadow: `0 10px 26px ${p.primary}26`,
                      }}
                    >
                      <step.icon className="h-7 w-7" />
                    </span>
                    <h3 className="mt-5 text-[20px] font-extrabold">
                      {language === 'ar' ? step.ar : step.en}
                    </h3>
                    <p
                      className="mx-auto mt-2 max-w-[34ch] text-[15px] leading-relaxed md:mx-0"
                      style={{ color: p.inkSoft }}
                    >
                      {language === 'ar' ? step.dAr : step.dEn}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured subjects. Horizontal scroll-snap rail. ────── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <h2 className="max-w-[24ch] text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
                {t('مواد مختارة لهذا الفصل', 'Picked subjects this term')}
              </h2>
              <GhostCta to="/marketplace">{t('تصفّح المواد', 'Browse courses')}</GhostCta>
            </div>
          </Reveal>
        </div>

        <div
          className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [&::-webkit-scrollbar]:hidden lg:px-8"
          style={{ scrollbarWidth: 'none' }}
        >
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-[280px] shrink-0 sm:w-[320px]" />
            ))
          ) : subjects.length === 0 ? (
            <div className="mx-auto w-full max-w-[1280px] px-0">
              <EmptyNote>
                {t(
                  'لا توجد مواد معروضة على الصفحة الرئيسية بعد.',
                  'No subjects are featured on the homepage yet.',
                )}
              </EmptyNote>
            </div>
          ) : (
            <>
              {subjects.map((s: any, i: number) => (
                <Link
                  key={s.id}
                  to={`/course/${s.id}`}
                  className={`${R.card} group w-[280px] shrink-0 snap-start overflow-hidden border transition-all hover:-translate-y-1 sm:w-[320px]`}
                  style={{
                    background: p.surface,
                    borderColor: p.line,
                    boxShadow: `0 8px 24px ${p.ink}0F`,
                  }}
                >
                  {/* Gradient plate instead of a stock photo, so the rail
                      stays on-palette. Alternating primary / accent lean. */}
                  <span
                    className="relative flex h-36 items-center justify-center"
                    style={{
                      background:
                        i % 3 === 1
                          ? `linear-gradient(135deg, ${p.accent} 0%, ${p.primary} 130%)`
                          : `linear-gradient(135deg, ${p.primary} 0%, ${p.primaryDeep} 100%)`,
                    }}
                  >
                    <BookOpen
                      className="h-11 w-11 transition-transform duration-500 group-hover:scale-110"
                      style={{ color: i % 3 === 1 ? p.onAccent : p.onPrimary, opacity: 0.9 }}
                    />
                  </span>
                  <span className="block p-5">
                    {s.stage && (
                      <span
                        className={`${R.pill} inline-block px-2.5 py-1 text-[11px] font-bold`}
                        style={{ background: p.tint, color: p.primary }}
                      >
                        {tt(s.stage, 'title')}
                      </span>
                    )}
                    <span className="mt-3 block text-[18px] font-extrabold leading-snug">
                      {tt(s, 'title')}
                    </span>
                    <span
                      className="mt-3 flex items-center gap-1.5 text-[13px] font-bold"
                      style={{ color: p.primary }}
                    >
                      {t('تفاصيل المادة', 'Course details')}
                      <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              ))}
              <span className="w-1 shrink-0" aria-hidden />
            </>
          )}
        </div>
      </section>

      {/* ── Teachers. Staggered offsets, real names from the DB. ── */}
      <section
        className="border-y py-20 lg:py-28"
        style={{ background: p.surfaceAlt, borderColor: p.line }}
      >
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <h2 className="max-w-[26ch] text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
              {t('المعلّمون الذين يشرحون المواد', 'The teachers behind the lessons')}
            </h2>
          </Reveal>

          {loading ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-52" />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <div className="mt-12">
              <EmptyNote>
                {t(
                  'لم يُعرض أي معلّم على الصفحة الرئيسية بعد.',
                  'No teachers are featured on the homepage yet.',
                )}
              </EmptyNote>
            </div>
          ) : (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.slice(0, 6).map((teacher: any, i: number) => (
                <Reveal
                  key={teacher.id}
                  delay={i * 90}
                  className={i % 3 === 1 ? 'lg:mt-10' : i % 3 === 2 ? 'lg:mt-5' : ''}
                >
                  <Link
                    to={`/t/${teacher.id}`}
                    className={`${R.card} group flex h-full flex-col border p-6 transition-all hover:-translate-y-1`}
                    style={{
                      background: p.surface,
                      borderColor: p.line,
                      boxShadow: `0 8px 24px ${p.ink}0F`,
                    }}
                  >
                    <span className="flex items-center gap-4">
                      {teacher.avatar_url ? (
                        <img
                          src={teacher.avatar_url}
                          alt=""
                          className="h-14 w-14 rounded-full object-cover"
                          style={{ border: `2px solid ${p.line}` }}
                        />
                      ) : (
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-full text-[17px] font-extrabold"
                          style={{ background: p.tint, color: p.primary }}
                        >
                          {initials(teacher.full_name)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[17px] font-extrabold">
                          {teacher.full_name}
                        </span>
                        <span
                          className="mt-0.5 block text-[13px] font-semibold"
                          style={{ color: p.primary }}
                        >
                          {t('معلّم', 'Teacher')}
                        </span>
                      </span>
                    </span>
                    {tt(teacher, 'bio') && (
                      <span
                        className="mt-4 line-clamp-3 text-[14px] leading-relaxed"
                        style={{ color: p.inkSoft }}
                      >
                        {tt(teacher, 'bio')}
                      </span>
                    )}
                    <span
                      className="mt-auto flex items-center gap-1.5 pt-5 text-[13px] font-bold"
                      style={{ color: p.ink }}
                    >
                      {t('الملف الشخصي', 'View profile')}
                      <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Teach with us. Panel beside a plain benefit list. ──── */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal>
            <div
              className={`${R.card} p-9 lg:p-11`}
              style={{ background: p.tint, border: `1px solid ${p.line}` }}
            >
              <Sparkles className="h-8 w-8" style={{ color: p.primary }} />
              <h2 className="mt-5 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
                {t('تشرح مادة مدرسية؟', 'Do you teach a school subject?')}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed" style={{ color: p.inkSoft }}>
                {t(
                  'أنشئ موادك على المنصة، وحدّد سعرك، واستلم المدفوعات من طلابك مباشرة.',
                  'Publish your subjects, set your own price, and take payment from students directly.',
                )}
              </p>
              <div className="mt-8">
                <PrimaryCta to="/apply/teacher">{t('قدّم كمعلّم', 'Teach with us')}</PrimaryCta>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ul className="space-y-7">
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
                  dAr: 'ملف شخصي عام ومواد معروضة في سوق المنصة أمام طلاب مرحلتك.',
                  dEn: 'A public profile and subjects listed in the marketplace for students in your stage.',
                },
              ].map((b) => (
                <li key={b.en} className="flex gap-4">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: p.primary, color: p.onPrimary }}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block text-[17px] font-bold">
                      {language === 'ar' ? b.ar : b.en}
                    </span>
                    <span
                      className="mt-1.5 block text-[15px] leading-relaxed"
                      style={{ color: p.inkSoft }}
                    >
                      {language === 'ar' ? b.dAr : b.dEn}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Closing colour block. ─────────────────────────────── */}
      <section style={{ background: p.primaryDeep }}>
        <div className="mx-auto max-w-[900px] px-5 py-20 text-center lg:py-24">
          <Reveal>
            <h2
              className="text-[32px] font-extrabold leading-tight tracking-tight sm:text-[44px]"
              style={{ color: p.onPrimary }}
            >
              {t('مرحلتك الدراسية جاهزة', 'Your grade is ready to go')}
            </h2>
            <p
              className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed"
              style={{ color: `${p.onPrimary}CC` }}
            >
              {t(
                'أنشئ حساباً، اختر مرحلتك، وابدأ بأول درس اليوم.',
                'Create an account, choose your stage, and open your first lesson today.',
              )}
            </p>
            <div className="mt-9 flex justify-center">
              <Link
                to="/register"
                className={`${R.pill} inline-flex items-center gap-2 whitespace-nowrap px-8 py-4 text-[16px] font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]`}
                style={{ background: p.accent, color: p.onAccent }}
              >
                {t('ابدأ الآن', 'Get started')}
                <Arrow className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer. ───────────────────────────────────────────── */}
      <footer style={{ background: p.surface, borderTop: `1px solid ${p.line}` }}>
        <div className="mx-auto max-w-[1280px] px-5 py-14 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="" className="h-9 w-9 rounded-xl object-contain" />
                <span className="text-[16px] font-extrabold">
                  {t('ورق أكاديمي', 'Waraq Academy')}
                </span>
              </div>
              <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed" style={{ color: p.inkSoft }}>
                {t(
                  'مواد مدرسية يشرحها معلّمون، لطلاب المراحل الدراسية.',
                  'School subjects taught by real teachers, for students at every stage.',
                )}
              </p>
            </div>

            {[
              {
                head: { ar: 'تعلّم', en: 'Learn' },
                links: [
                  { to: '/stages', ar: 'المراحل', en: 'Stages' },
                  { to: '/marketplace', ar: 'المواد', en: 'Courses' },
                  { to: '/plans', ar: 'الخطط', en: 'Plans' },
                ],
              },
              {
                head: { ar: 'المنصة', en: 'Platform' },
                links: [
                  { to: '/teachers', ar: 'المعلّمون', en: 'Teachers' },
                  { to: '/apply/teacher', ar: 'انضم كمعلّم', en: 'Teach with us' },
                  { to: '/login', ar: 'دخول', en: 'Log in' },
                ],
              },
              {
                head: { ar: 'قانوني', en: 'Legal' },
                links: [
                  { to: '/terms', ar: 'الشروط', en: 'Terms' },
                  { to: '/privacy', ar: 'الخصوصية', en: 'Privacy' },
                  { to: '/refund-policy', ar: 'الاسترجاع', en: 'Refunds' },
                  { to: '/certificate-policy', ar: 'الشهادات', en: 'Certificates' },
                ],
              },
            ].map((col) => (
              <div key={col.head.en}>
                <h3 className="text-[14px] font-extrabold">
                  {language === 'ar' ? col.head.ar : col.head.en}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="text-[14px] font-medium transition-colors"
                        style={{ color: p.inkSoft }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = p.primary)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = p.inkSoft)}
                      >
                        {language === 'ar' ? l.ar : l.en}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="mt-12 border-t pt-6 text-[13px]"
            style={{ borderColor: p.line, color: p.inkSoft }}
          >
            {t(
              'جميع الحقوق محفوظة لورق أكاديمي.',
              'All rights reserved, Waraq Academy.',
            )}
          </div>
        </div>
      </footer>

      <PaletteSwitcher value={paletteKey} onChange={choosePalette} palette={p} />
      <VariantSwitcher />
    </div>
  );
}

// ── Stage tile used by the bento's side and tail cells. ───────

function StageTile({
  stage,
  p,
  tt,
  Arrow,
  accent,
}: {
  stage: any;
  p: (typeof PALETTES)[PaletteKey];
  tt: (o: any, base: string) => string;
  Arrow: React.ComponentType<{ className?: string }>;
  accent: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Link
      to={`/stages/${stage.slug || stage.id}`}
      className={`${R.card} group relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden p-6 transition-all hover:-translate-y-1`}
      style={{
        background: accent
          ? `linear-gradient(140deg, ${p.accent}2E 0%, ${p.tint} 70%)`
          : p.surface,
        border: `1px solid ${p.line}`,
        boxShadow: `0 8px 24px ${p.ink}0F`,
      }}
    >
      {/* Dotted plate for texture, kept behind the content. */}
      <span
        className="pointer-events-none absolute -end-6 -top-6 h-28 w-28 rounded-full opacity-[0.18]"
        style={{ background: accent ? p.accent : p.primary }}
        aria-hidden
      />
      <span
        className="relative flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          background: accent ? p.accent : p.tint,
          color: accent ? p.onAccent : p.primary,
        }}
      >
        <Layers className="h-5 w-5" />
      </span>
      <span className="relative mt-5 block">
        <span className="block text-[19px] font-extrabold leading-snug">
          {tt(stage, 'title')}
        </span>
        <span
          className="mt-2 flex items-center gap-1.5 text-[13px] font-bold"
          style={{ color: p.primary }}
        >
          {t('المواد', 'Subjects')}
          <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}

// ── Language toggle, matched to the active palette. ──────────

function LangToggle({ p }: { p: (typeof PALETTES)[PaletteKey] }) {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`${R.pill} border px-3 py-2 text-[13px] font-bold transition-colors`}
      style={{ borderColor: p.line, color: p.ink, background: 'transparent' }}
    >
      {language === 'ar' ? 'EN' : 'ع'}
    </button>
  );
}
