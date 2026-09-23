// Variant 8 - Wijha-inspired. Refined premium, sage-green identity.
// Light theme, generous whitespace, strong type hierarchy, moderate radius.
// Primary: deep sage green. Secondary accent: gold. Restrained motion.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData } from './useLandingData';
import { Reveal } from './useReveal';
import VariantSwitcher from './VariantSwitcher';
import { ArrowLeft, ArrowRight, Check, Star } from 'lucide-react';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-library.jpg';

const W = {
  bg: '#F6F5F0',        // warm off-white
  surface: '#FFFFFF',
  tint: '#E9EFEB',      // light sage tint
  green: '#1E3A32',     // deep forest primary
  greenMid: '#3F5D51',  // sage
  ink: '#16261F',
  mut: '#5E6B63',
  gold: '#AE944F',      // secondary accent
  line: 'rgba(30,58,50,0.12)',
};

const FALLBACK_COURSES = [
  { ar: 'الرياضيات للصف التاسع', en: 'Grade 9 Mathematics', tag: 'المرحلة المتوسطة', rating: 4.8 },
  { ar: 'الفيزياء للبكالوريا', en: 'Physics for Baccalaureate', tag: 'المرحلة الثانوية', rating: 4.9 },
  { ar: 'قواعد اللغة العربية', en: 'Arabic Grammar', tag: 'المرحلة الابتدائية', rating: 4.7 },
];
const FALLBACK_TEACHERS = ['أ. ريم الحلبي', 'أ. عمر الديب', 'أ. سلمى قاسم', 'أ. يوسف مرعي'];

export default function LandingV8() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const isAr = language === 'ar';
  const Fwd = isAr ? ArrowLeft : ArrowRight;
  const tt = (o: any, base: string) => (isAr ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);

  const courses = subjects.length
    ? subjects.map((s: any, i: number) => ({ ar: s.title_ar, en: s.title_en, tag: tt(s.stage, 'title') || FALLBACK_COURSES[i % 3].tag, rating: FALLBACK_COURSES[i % 3].rating }))
    : FALLBACK_COURSES;
  const teacherNames = teachers.length ? teachers.map((x: any) => x.full_name).filter(Boolean) : FALLBACK_TEACHERS;

  return (
    <div className="min-h-screen antialiased" style={{ background: W.bg, color: W.ink }}>
      {/* ── Nav ─────────────────────────── */}
      <header className="sticky top-0 z-40 border-b" style={{ borderColor: W.line, background: 'rgba(246,245,240,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
            <span className="text-[17px] font-bold tracking-tight" style={{ color: W.green }}>{t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
          <nav className="hidden items-center gap-8 text-[15px] font-semibold md:flex" style={{ color: W.greenMid }}>
            <Link to="/stages" className="hover:opacity-70">{t('المراحل', 'Stages')}</Link>
            <Link to="/subjects" className="hover:opacity-70">{t('المواد', 'Courses')}</Link>
            <Link to="/apply/teacher" className="hover:opacity-70">{t('علّم معنا', 'Teach')}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggleLanguage} className="rounded-lg px-3 py-2 text-sm font-bold" style={{ color: W.greenMid }}>{isAr ? 'EN' : 'ع'}</button>
            <Link to="/register" className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95" style={{ background: W.green }}>
              {t('ابدأ الآن', 'Get started')}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero (airy split) ───────────── */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pt-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.22em]" style={{ color: W.gold }}>
            {t('منصّة التعلّم المدرسي', 'School learning platform')}
          </span>
          <h1 className="mt-6 text-[2.7rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]" style={{ color: W.green }}>
            {t('تجربة تعليمية', 'A learning experience')}<br />
            {t('مصمّمة ', 'designed ')}<span style={{ color: W.gold }}>{t('بإتقان', 'with care')}</span>.
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed" style={{ color: W.mut }}>
            {t('نجمع الاستراتيجية والمحتوى والتقنية لنقدّم لطالبك أفضل تجربة تعلّم لكل مرحلة.', 'We bring strategy, content, and technology together for the best learning experience at every stage.')}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link to="/register" className="rounded-full px-8 py-4 text-base font-bold text-white transition-transform active:scale-95" style={{ background: W.green }}>
              {t('أنشئ حسابك مجاناً', 'Create free account')}
            </Link>
            <Link to="/subjects" className="inline-flex items-center gap-1.5 text-base font-bold" style={{ color: W.green }}>
              {t('تصفّح المواد', 'Browse courses')} <Fwd className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm" style={{ color: W.mut }}>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" style={{ color: W.gold }} /> {t('أول درس مجاناً', 'First lesson free')}</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" style={{ color: W.gold }} /> {t('بدون بطاقة', 'No card needed')}</span>
          </div>
        </Reveal>

        <Reveal delay={120} className="relative">
          <img src={heroImage} alt="" className="aspect-[5/6] w-full rounded-[2rem] object-cover shadow-xl" />
          <div className="absolute -bottom-6 start-[-6%] rounded-2xl border p-4 shadow-lg" style={{ background: W.surface, borderColor: W.line }}>
            <div className="flex items-center gap-1 text-sm" style={{ color: W.gold }}>
              {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-1.5 text-sm font-bold" style={{ color: W.green }}>{t('4.8 من 5 · تقييم الطلاب', '4.8 / 5 · student rating')}</p>
          </div>
        </Reveal>
      </section>

      {/* ── Trust strip ─────────────────── */}
      <section className="border-y" style={{ borderColor: W.line, background: W.tint }}>
        <div className="mx-auto grid max-w-[1000px] grid-cols-2 gap-8 px-5 py-10 text-center md:grid-cols-4">
          {[
            { v: `${(teacherNames.length * 100 + 1100).toLocaleString('en-US')}+`, l: t('طالب', 'students') },
            { v: `${teacherNames.length || 12}+`, l: t('معلّم خبير', 'expert teachers') },
            { v: `${subjects.length || 40}+`, l: t('مادة', 'courses') },
            { v: '4.8/5', l: t('التقييم', 'rating') },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-bold" style={{ color: W.green }}>{s.v}</p>
              <p className="mt-1 text-sm" style={{ color: W.mut }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Approach (editorial statement + points) ── */}
      <section className="mx-auto max-w-[1200px] items-start gap-16 px-5 py-24 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-[2.6rem]" style={{ color: W.green }}>
            {t('نهج متكامل للتعلّم', 'An integrated approach to learning')}
          </h2>
          <p className="mt-5 max-w-sm text-[17px] leading-relaxed" style={{ color: W.mut }}>
            {t('كل عنصر في المنصّة مصمّم بعناية ليخدم تقدّم طالبك.', 'Every part of the platform is crafted to serve your student\'s progress.')}
          </p>
        </Reveal>
        <Reveal delay={100} className="mt-10 divide-y lg:mt-0">
          {[
            { ar: 'محتوى مصمّم بعناية', en: 'Carefully crafted content', dar: 'دروس مصوّرة ومكتوبة بمعايير عالية لكل مادة.', den: 'Video and written lessons built to a high standard.' },
            { ar: 'تقييم يقيس التقدّم', en: 'Assessment that measures progress', dar: 'اختبارات ذكية تكشف مواطن القوة والضعف.', den: 'Smart quizzes that reveal strengths and gaps.' },
            { ar: 'شهادات معتمدة', en: 'Verified certificates', dar: 'اعتماد رسمي عند إتمام كل مادة.', den: 'Formal recognition on every completion.' },
          ].map((f, i) => (
            <div key={i} className="flex gap-5 py-6" style={{ borderColor: W.line }}>
              <span className="text-xl font-bold tabular-nums" style={{ color: W.gold }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-xl font-bold" style={{ color: W.green }}>{isAr ? f.ar : f.en}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: W.mut }}>{isAr ? f.dar : f.den}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── Programs by stage (media tiles) ── */}
      <section style={{ background: W.surface }} className="border-y" >
        <div className="mx-auto max-w-[1200px] px-5 py-24 lg:px-8" style={{ borderColor: W.line }}>
          <Reveal>
            <div className="mb-10 flex items-end justify-between">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: W.green }}>{t('برامج لكل مرحلة', 'Programs for every stage')}</h2>
              <Link to="/stages" className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: W.gold }}>{t('الكل', 'All')} <Fwd className="h-4 w-4" /></Link>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(stages.length ? stages : [{}, {}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
              <Reveal key={s.id || i} delay={i * 70}>
                <Link to={s.slug ? `/stages/${s.slug}` : '/stages'} className="group block overflow-hidden rounded-2xl border" style={{ borderColor: W.line }}>
                  <div className="overflow-hidden">
                    <img src={`https://picsum.photos/seed/wijhastage${i}/500/340`} alt="" className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4" style={{ background: W.surface }}>
                    <p className="text-[15px] font-bold" style={{ color: W.green }}>{tt(s, 'title') || t('مرحلة دراسية', 'Study stage')}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: W.gold }}>{t('استكشف', 'Explore')} <Fwd className="h-3.5 w-3.5" /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured courses ────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 lg:px-8">
        <Reveal><h2 className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: W.green }}>{t('مواد مختارة', 'Selected courses')}</h2></Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {courses.slice(0, 3).map((c: any, i: number) => (
            <Reveal key={i} delay={i * 90}>
              <Link to="/subjects" className="group block overflow-hidden rounded-3xl border transition-shadow hover:shadow-lg" style={{ borderColor: W.line, background: W.surface }}>
                <img src={`https://picsum.photos/seed/wijhacourse${i}/700/440`} alt="" className="h-44 w-full object-cover" />
                <div className="p-6">
                  <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: W.gold }}>{c.tag}</p>
                  <h3 className="mt-1.5 text-xl font-bold leading-snug" style={{ color: W.green }}>{isAr ? c.ar : c.en || c.ar}</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-[13px]" style={{ color: W.mut }}>
                    <Star className="h-3.5 w-3.5 fill-current" style={{ color: W.gold }} />
                    <span className="font-bold" style={{ color: W.ink }}>{c.rating}</span>
                    <span>· {t('معلّم معتمد', 'verified teacher')}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Big-number process ──────────── */}
      <section style={{ background: W.green }} className="text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-24 lg:px-8">
          <Reveal><h2 className="mb-14 text-3xl font-bold tracking-tight sm:text-4xl">{t('كيف تبدأ', 'How to begin')}</h2></Reveal>
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
            {[
              { ar: 'أنشئ حسابك', en: 'Create your account', dar: 'سجّل مجاناً واختر مرحلتك الدراسية.', den: 'Sign up free and pick your stage.' },
              { ar: 'اختر موادك', en: 'Choose your courses', dar: 'تصفّح المواد واشترك في ما يناسبك.', den: 'Browse and enroll in what fits.' },
              { ar: 'تعلّم واحصل على شهادة', en: 'Learn and get certified', dar: 'أكمل الدروس واحصل على شهادتك.', den: 'Finish lessons and earn a certificate.' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 90}>
                <p className="text-6xl font-bold" style={{ color: W.gold }}>{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-5 text-2xl font-bold">{isAr ? s.ar : s.en}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/60">{isAr ? s.dar : s.den}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial (large single quote) ── */}
      <section className="mx-auto max-w-[900px] px-5 py-24 text-center lg:px-8">
        <Reveal>
          <div className="flex justify-center gap-1" style={{ color: W.gold }}>
            {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-5 w-5 fill-current" />)}
          </div>
          <blockquote className="mt-6 text-2xl font-medium leading-relaxed sm:text-[1.9rem]" style={{ color: W.green }}>
            {t('"أخيراً منصّة عربية بمحتوى مرتّب ومعلّمين متميّزين. تحسّن مستوى ابني بشكل واضح."', '"Finally an Arabic platform with organized content and excellent teachers. My son\'s level clearly improved."')}
          </blockquote>
          <p className="mt-6 text-[15px] font-bold" style={{ color: W.ink }}>{t('رانية خليل', 'Rania Khalil')} <span className="font-normal" style={{ color: W.mut }}>· {t('ولية أمر', 'Parent')}</span></p>
        </Reveal>
      </section>

      {/* ── CTA ─────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-24 lg:px-8">
        <Reveal>
          <div className="rounded-[2rem] px-8 py-20 text-center" style={{ background: W.tint }}>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl" style={{ color: W.green }}>{t('ابدأ تجربتك اليوم', 'Start your experience today')}</h2>
            <p className="mx-auto mt-5 max-w-md text-lg" style={{ color: W.mut }}>{t('انضمّ مجاناً وابدأ أول درس الآن.', 'Join free and start your first lesson now.')}</p>
            <Link to="/register" className="mt-9 inline-block rounded-full px-10 py-4 text-base font-bold text-white transition-transform active:scale-95" style={{ background: W.green }}>
              {t('أنشئ حسابك مجاناً', 'Create your free account')}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────── */}
      <footer className="border-t" style={{ borderColor: W.line }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 py-9 text-sm sm:flex-row lg:px-8" style={{ color: W.mut }}>
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-7 w-7 object-contain" />
            <span className="font-bold" style={{ color: W.green }}>{t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/legal/terms" className="hover:opacity-70">{t('الشروط', 'Terms')}</Link>
            <Link to="/legal/privacy" className="hover:opacity-70">{t('الخصوصية', 'Privacy')}</Link>
            <span>© {t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
        </div>
      </footer>

      <VariantSwitcher />
    </div>
  );
}
