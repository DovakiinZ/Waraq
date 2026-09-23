// Variant 7 - Thmanyah-inspired. Dark cinematic Arabic-editorial.
// Warm near-black, oversized bold Arabic display type, media-grid rhythm.
// Single accent: gold. Theme locked dark. RTL-first.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData } from './useLandingData';
import { Reveal } from './useReveal';
import VariantSwitcher from './VariantSwitcher';
import { ArrowLeft, ArrowRight, Play, Star } from 'lucide-react';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-library.jpg';

// Warm dark palette (Thmanyah-like) with the brand gold as the sole accent.
const D = {
  bg: '#12100B',
  surface: '#1B1811',
  surface2: '#241F16',
  line: 'rgba(245,241,232,0.10)',
  ink: '#F6F1E7',
  mut: '#A79C86',
  gold: '#C9A24B',
  goldSoft: '#E4C878',
};

const FALLBACK_COURSES = [
  { ar: 'الرياضيات للصف التاسع', en: 'Grade 9 Mathematics', tag: 'رياضيات', rating: 4.8 },
  { ar: 'الفيزياء للبكالوريا', en: 'Physics for Baccalaureate', tag: 'فيزياء', rating: 4.9 },
  { ar: 'قواعد اللغة العربية', en: 'Arabic Grammar', tag: 'لغة عربية', rating: 4.7 },
  { ar: 'الكيمياء العضوية', en: 'Organic Chemistry', tag: 'كيمياء', rating: 4.6 },
  { ar: 'الأحياء للثانوية', en: 'High-school Biology', tag: 'أحياء', rating: 4.8 },
  { ar: 'اللغة الإنجليزية', en: 'English Language', tag: 'إنجليزي', rating: 4.7 },
];
const FALLBACK_TEACHERS = ['أ. ريم الحلبي', 'أ. عمر الديب', 'أ. سلمى قاسم', 'أ. يوسف مرعي'];

export default function LandingV7() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const isAr = language === 'ar';
  const Fwd = isAr ? ArrowLeft : ArrowRight;
  const tt = (o: any, base: string) => (isAr ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);

  const courses = subjects.length
    ? subjects.map((s: any, i: number) => ({ ar: s.title_ar, en: s.title_en, tag: tt(s.stage, 'title') || FALLBACK_COURSES[i % 6].tag, rating: FALLBACK_COURSES[i % 6].rating }))
    : FALLBACK_COURSES;
  const teacherNames = teachers.length ? teachers.map((x: any) => x.full_name).filter(Boolean) : FALLBACK_TEACHERS;

  return (
    <div className="min-h-screen antialiased" style={{ background: D.bg, color: D.ink }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Nav ─────────────────────────── */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-[70px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
            <span className="text-[17px] font-black tracking-tight">{t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
          <nav className="hidden items-center gap-8 text-[15px] font-bold md:flex" style={{ color: D.mut }}>
            <Link to="/stages" className="hover:text-[color:var(--i)]" style={{ ['--i' as any]: D.ink }}>{t('المراحل', 'Stages')}</Link>
            <Link to="/subjects" className="hover:text-[color:var(--i)]" style={{ ['--i' as any]: D.ink }}>{t('المواد', 'Courses')}</Link>
            <Link to="/apply/teacher" className="hover:text-[color:var(--i)]" style={{ ['--i' as any]: D.ink }}>{t('علّم معنا', 'Teach')}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggleLanguage} className="rounded-lg px-3 py-2 text-sm font-black" style={{ color: D.mut }}>{isAr ? 'EN' : 'ع'}</button>
            <Link to="/register" className="rounded-lg px-4 py-2 text-sm font-black" style={{ background: D.gold, color: '#1A1608' }}>
              {t('ابدأ الآن', 'Get started')}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero (cinematic) ────────────── */}
      <section className="relative min-h-[92vh] w-full overflow-hidden">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${D.bg} 6%, rgba(18,16,11,0.55) 55%, rgba(18,16,11,0.75))` }} />
        <div className="relative mx-auto flex min-h-[92vh] max-w-[1240px] flex-col justify-end px-5 pb-20 pt-32 lg:px-8">
          <Reveal>
            <span className="text-[13px] font-black uppercase tracking-[0.35em]" style={{ color: D.gold }}>
              {t('منصّة المعرفة المدرسية', 'The school-knowledge platform')}
            </span>
            <h1 className="mt-6 max-w-4xl text-[15vw] font-black leading-[0.92] tracking-tight sm:text-7xl lg:text-[6.2rem]">
              {t('المعرفة', 'Knowledge')}<br />
              <span style={{ color: D.gold }}>{t('تُروى بإتقان', 'told with mastery')}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed" style={{ color: D.mut }}>
              {t('دروس ومواد مدرسية يقدّمها نخبة المعلّمين، بإنتاج يليق بشغف طالبك للمعرفة.', 'School courses from the finest teachers, produced to match your student\'s curiosity.')}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/register" className="rounded-full px-8 py-4 text-base font-black transition-transform active:scale-95" style={{ background: D.gold, color: '#1A1608' }}>
                {t('ابدأ رحلتك', 'Start your journey')}
              </Link>
              <Link to="/subjects" className="inline-flex items-center gap-2.5 rounded-full border px-7 py-4 text-base font-black" style={{ borderColor: D.line }}>
                <Play className="h-4 w-4 fill-current" /> {t('استكشف المواد', 'Explore courses')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Editorial feature grid ──────── */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 lg:px-8">
        <Reveal>
          <div className="mb-9 flex items-end justify-between border-b pb-5" style={{ borderColor: D.line }}>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t('مختارات المنصّة', 'Editor\'s picks')}</h2>
            <Link to="/subjects" className="inline-flex items-center gap-1.5 text-sm font-black" style={{ color: D.gold }}>{t('الكل', 'All')} <Fwd className="h-4 w-4" /></Link>
          </div>
        </Reveal>
        <div className="grid gap-5 lg:grid-cols-3">
          {/* large feature */}
          <Reveal className="lg:col-span-2">
            <Link to="/subjects" className="group relative block h-full min-h-[340px] overflow-hidden rounded-3xl">
              <img src="https://picsum.photos/seed/thmanyahfeat/1000/700" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,16,11,0.92), rgba(18,16,11,0.15))' }} />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <span className="text-[12px] font-black uppercase tracking-[0.2em]" style={{ color: D.goldSoft }}>{tt(stages[0], 'title') || t('المرحلة الثانوية', 'High school')}</span>
                <h3 className="mt-2 max-w-lg text-3xl font-black leading-tight">{tt(subjects[0], 'title') || t('سلسلة الفيزياء الكاملة', 'The complete physics series')}</h3>
              </div>
            </Link>
          </Reveal>
          {/* two stacked */}
          <div className="grid gap-5">
            {[1, 2].map((idx) => (
              <Reveal key={idx} delay={idx * 90}>
                <Link to="/subjects" className="group relative block min-h-[160px] overflow-hidden rounded-3xl">
                  <img src={`https://picsum.photos/seed/thmanyahside${idx}/600/400`} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,16,11,0.9), rgba(18,16,11,0.2))' }} />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: D.goldSoft }}>{tt(subjects[idx]?.stage, 'title') || FALLBACK_COURSES[idx].tag}</span>
                    <h3 className="mt-1 text-lg font-black leading-tight">{tt(subjects[idx], 'title') || (isAr ? FALLBACK_COURSES[idx].ar : FALLBACK_COURSES[idx].en)}</h3>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Typographic statement ───────── */}
      <section className="border-y" style={{ borderColor: D.line, background: D.surface }}>
        <div className="mx-auto max-w-[1000px] px-5 py-24 text-center lg:px-8">
          <Reveal>
            <p className="text-[7.5vw] font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              {t('نؤمن أنّ التعليم الجيّد ', 'We believe great learning ')}
              <span style={{ color: D.gold }}>{t('يستحق إنتاجاً جيّداً.', 'deserves great production.')}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Course rows (streaming style) ─ */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 lg:px-8">
        <Reveal>
          <h2 className="mb-8 text-3xl font-black tracking-tight sm:text-4xl">{t('مواد رائجة الآن', 'Trending now')}</h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 6).map((c: any, i: number) => (
            <Reveal key={i} delay={(i % 3) * 70}>
              <Link to="/subjects" className="group block overflow-hidden rounded-2xl border transition-colors" style={{ borderColor: D.line, background: D.surface }}>
                <div className="relative overflow-hidden">
                  <img src={`https://picsum.photos/seed/thmanyahcourse${i}/600/340`} alt="" className="h-40 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100" style={{ background: 'rgba(18,16,11,0.4)' }}>
                    <Play className="h-10 w-10 fill-current" style={{ color: D.goldSoft }} />
                  </span>
                </div>
                <div className="p-5">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: D.gold }}>{c.tag}</span>
                  <h3 className="mt-1.5 text-[17px] font-black leading-snug">{isAr ? c.ar : c.en || c.ar}</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-[13px]" style={{ color: D.mut }}>
                    <Star className="h-3.5 w-3.5 fill-current" style={{ color: D.gold }} />
                    <span className="font-black" style={{ color: D.ink }}>{c.rating}</span>
                    <span>· {t('معلّم معتمد', 'verified teacher')}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Browse by stage (media tiles) ─ */}
      <section className="mx-auto max-w-[1240px] px-5 pb-20 lg:px-8">
        <Reveal><h2 className="mb-8 text-3xl font-black tracking-tight sm:text-4xl">{t('تصفّح حسب المرحلة', 'Browse by stage')}</h2></Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(stages.length ? stages : [{}, {}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Reveal key={s.id || i} delay={i * 60}>
              <Link to={s.slug ? `/stages/${s.slug}` : '/stages'} className="group relative block overflow-hidden rounded-2xl">
                <img src={`https://picsum.photos/seed/thmanyahstage${i}/500/300`} alt="" className="h-32 w-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ opacity: 0.75 }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,16,11,0.85), rgba(18,16,11,0.25))' }} />
                <span className="absolute inset-x-0 bottom-0 p-4 text-lg font-black">{tt(s, 'title') || t('مرحلة دراسية', 'Study stage')}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Stats (minimal on dark) ─────── */}
      <section className="border-y" style={{ borderColor: D.line }}>
        <div className="mx-auto grid max-w-[1000px] grid-cols-3 gap-6 px-5 py-14 text-center lg:px-8">
          {[
            { v: `${teacherNames.length || 12}+`, l: t('معلّم خبير', 'expert teachers') },
            { v: `${(subjects.length || 40)}+`, l: t('مادة تعليمية', 'courses') },
            { v: '4.8', l: t('متوسط التقييم', 'avg. rating') },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-4xl font-black sm:text-5xl" style={{ color: D.goldSoft }}>{s.v}</p>
              <p className="mt-2 text-sm" style={{ color: D.mut }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Instructors ─────────────────── */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 lg:px-8">
        <Reveal><h2 className="mb-8 text-3xl font-black tracking-tight sm:text-4xl">{t('أصوات المعرفة', 'The voices behind the lessons')}</h2></Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teacherNames.slice(0, 4).map((name: string, i: number) => (
            <Reveal key={i} delay={i * 60}>
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: D.line, background: D.surface }}>
                <img src={teachers[i]?.avatar_url || `https://picsum.photos/seed/thmanyahteacher${i}/400/440`} alt={name} className="aspect-[4/5] w-full object-cover" style={{ opacity: 0.92 }} />
                <div className="p-4">
                  <p className="font-black">{name}</p>
                  <p className="text-[13px]" style={{ color: D.mut }}>{t('معلّم معتمد', 'Verified teacher')}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────── */}
      <section className="border-t" style={{ borderColor: D.line, background: D.surface }}>
        <div className="mx-auto max-w-[900px] px-5 py-24 text-center lg:px-8">
          <Reveal>
            <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">{t('ابدأ رحلة المعرفة', 'Begin the journey of knowledge')}</h2>
            <p className="mx-auto mt-5 max-w-md text-lg" style={{ color: D.mut }}>{t('انضمّ مجاناً وابدأ أول درس الآن.', 'Join free and start your first lesson now.')}</p>
            <Link to="/register" className="mt-9 inline-block rounded-full px-10 py-4 text-base font-black transition-transform active:scale-95" style={{ background: D.gold, color: '#1A1608' }}>
              {t('أنشئ حسابك مجاناً', 'Create your free account')}
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────── */}
      <footer style={{ background: D.bg }}>
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-5 py-9 text-sm sm:flex-row lg:px-8" style={{ color: D.mut }}>
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-7 w-7 object-contain" />
            <span className="font-black" style={{ color: D.ink }}>{t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/legal/terms" className="hover:text-[color:var(--i)]" style={{ ['--i' as any]: D.ink }}>{t('الشروط', 'Terms')}</Link>
            <Link to="/legal/privacy" className="hover:text-[color:var(--i)]" style={{ ['--i' as any]: D.ink }}>{t('الخصوصية', 'Privacy')}</Link>
            <span>© {t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
        </div>
      </footer>

      <VariantSwitcher />
    </div>
  );
}
