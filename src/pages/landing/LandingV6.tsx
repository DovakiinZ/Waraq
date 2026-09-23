// Variant 6 - Premium EdTech marketplace (Udemy / modern-SaaS inspired).
// Light theme locked · navy/gold brand · one accent (gold) · AR + EN.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLandingData, BRAND } from './useLandingData';
import { Reveal } from './useReveal';
import VariantSwitcher from './VariantSwitcher';
import {
  Search, Star, Users, GraduationCap, BookOpen, ShieldCheck,
  PlayCircle, Award, ArrowLeft, ArrowRight, Check,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-library.jpg';

// Realistic fallbacks (real school subjects + locale-appropriate names), used
// only until live "show_on_home" content is set in Supabase.
const FALLBACK_COURSES = [
  { title_ar: 'الرياضيات للصف التاسع', title_en: 'Grade 9 Mathematics', stage: 'المرحلة المتوسطة', rating: 4.8, students: 1240, price: 60000 },
  { title_ar: 'الفيزياء للبكالوريا', title_en: 'Physics for Baccalaureate', stage: 'المرحلة الثانوية', rating: 4.9, students: 980, price: 75000 },
  { title_ar: 'قواعد اللغة العربية', title_en: 'Arabic Grammar', stage: 'المرحلة الابتدائية', rating: 4.7, students: 2150, price: 0 },
  { title_ar: 'الكيمياء العضوية', title_en: 'Organic Chemistry', stage: 'المرحلة الثانوية', rating: 4.6, students: 640, price: 70000 },
];
const FALLBACK_TEACHERS = ['أ. ريم الحلبي', 'أ. عمر الديب', 'أ. سلمى قاسم', 'أ. يوسف مرعي', 'أ. لينا عبود'];
const TESTIMONIALS = [
  { q_ar: 'تحسّنت درجات ابنتي في الرياضيات خلال شهرين. الشرح واضح والاختبارات مفيدة جداً.', q_en: 'My daughter\'s math grades improved in two months. Clear explanations, genuinely useful quizzes.', n_ar: 'رانية خليل', n_en: 'Rania Khalil', r_ar: 'ولية أمر', r_en: 'Parent' },
  { q_ar: 'أخيراً منصّة عربية بمحتوى مرتّب. أدرس في أي وقت ومن أي مكان.', q_en: 'Finally an Arabic platform with organized content. I study anytime, anywhere.', n_ar: 'كرم الأحمد', n_en: 'Karam Al-Ahmad', r_ar: 'طالب ثانوي', r_en: 'High-school student' },
];

export default function LandingV6() {
  const { language, t, toggleLanguage } = useLanguage();
  const { stages, teachers, subjects } = useLandingData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const isAr = language === 'ar';
  const Fwd = isAr ? ArrowLeft : ArrowRight;
  const tt = (o: any, base: string) => (isAr ? o?.[`${base}_ar`] : o?.[`${base}_en`] || o?.[`${base}_ar`]);

  const courses = subjects.length
    ? subjects.map((s: any, i: number) => ({
        title_ar: s.title_ar, title_en: s.title_en, stage: tt(s.stage, 'title'),
        rating: FALLBACK_COURSES[i % 4].rating, students: FALLBACK_COURSES[i % 4].students,
        price: s.price_amount ?? FALLBACK_COURSES[i % 4].price,
      }))
    : FALLBACK_COURSES;
  const teacherNames = teachers.length ? teachers.map((x: any) => x.full_name).filter(Boolean) : FALLBACK_TEACHERS;

  const price = (p: number) =>
    !p ? t('مجاني', 'Free') : `${Number(p).toLocaleString('en-US')} ${t('ل.س', 'SYP')}`;

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); navigate('/subjects'); };

  return (
    <div className="min-h-screen bg-white antialiased" style={{ color: BRAND.navy }}>
      {/* ── Nav ───────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
            <span className="text-[17px] font-extrabold tracking-tight">{t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold text-slate-600 md:flex">
            <Link to="/stages" className="hover:text-[color:var(--nv)] transition-colors" style={{ ['--nv' as any]: BRAND.navy }}>{t('المراحل', 'Stages')}</Link>
            <Link to="/subjects" className="hover:opacity-70">{t('المواد', 'Courses')}</Link>
            <Link to="/apply/teacher" className="hover:opacity-70">{t('علّم معنا', 'Teach')}</Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <button onClick={toggleLanguage} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
              {isAr ? 'EN' : 'ع'}
            </button>
            <Link to="/login" className="hidden rounded-lg px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:block">{t('دخول', 'Sign in')}</Link>
            <Link to="/register" className="rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform active:scale-95" style={{ background: BRAND.navy }}>
              {t('ابدأ مجاناً', 'Start free')}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero (asymmetric split) ───────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 end-[-10%] h-[420px] w-[420px] rounded-full blur-3xl" style={{ background: BRAND.gold, opacity: 0.1 }} />
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-2 lg:px-8 lg:pt-20">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-bold" style={{ background: '#FBF4E4', color: BRAND.gold }}>
              <Star className="h-3.5 w-3.5 fill-current" /> {t('منصّة التعلّم المدرسي الأولى', 'The #1 school-learning platform')}
            </span>
            <h1 className="mt-6 text-[2.6rem] font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {t('تعلّم من أفضل المعلّمين،', 'Learn from the best teachers,')}
              <br />
              <span style={{ color: BRAND.gold }}>{t('في مادّتك ومرحلتك.', 'in your subject and stage.')}</span>
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-slate-500">
              {t('دروس مصوّرة، اختبارات ذكية، وشهادات معتمدة لكل المراحل الدراسية.', 'Video lessons, smart quizzes, and certificates for every school stage.')}
            </p>

            {/* Search (marketplace signature) */}
            <form onSubmit={onSearch} className="mt-8 flex max-w-md items-center rounded-2xl border bg-white p-1.5 shadow-lg shadow-slate-200/60" style={{ borderColor: 'rgba(30,58,95,0.1)' }}>
              <Search className="mx-3 h-5 w-5 shrink-0 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('ابحث عن مادة أو معلّم…', 'Search a course or teacher…')}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
              />
              <button type="submit" className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: BRAND.gold }}>
                {t('ابحث', 'Search')}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" style={{ color: BRAND.gold }} /> {t('أول درس مجاناً', 'First lesson free')}</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" style={{ color: BRAND.gold }} /> {t('بدون بطاقة', 'No card needed')}</span>
            </div>
          </Reveal>

          {/* Hero visual + floating cards */}
          <Reveal delay={120} className="relative">
            <div className="relative">
              <img src={heroImage} alt={t('طلاب يتعلّمون', 'Students learning')} className="aspect-[4/3] w-full rounded-[1.75rem] object-cover shadow-2xl shadow-slate-300/50" />
              <div className="absolute -bottom-6 start-[-8%] flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: '#EAF0F7' }}>
                  <Award className="h-6 w-6" style={{ color: BRAND.navy }} />
                </div>
                <div>
                  <p className="text-sm font-extrabold leading-tight">{t('شهادة معتمدة', 'Verified certificate')}</p>
                  <p className="text-xs text-slate-500">{t('عند إتمام المادة', 'on course completion')}</p>
                </div>
              </div>
              <div className="absolute -top-5 end-[-6%] flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-xl">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <img key={i} src={`https://picsum.photos/seed/aymanstudent${i}/60/60`} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-extrabold leading-tight">{(1200 + teacherNames.length).toLocaleString('en-US')}+</p>
                  <p className="text-[11px] text-slate-500">{t('طالب نشط', 'active students')}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Trust stat bar ────────────────── */}
      <section className="border-y" style={{ borderColor: 'rgba(30,58,95,0.07)', background: BRAND.surface }}>
        <div className="mx-auto grid max-w-[1000px] grid-cols-2 gap-6 px-5 py-9 md:grid-cols-4">
          {[
            { icon: Users, v: `${(teacherNames.length * 100 + 1100).toLocaleString('en-US')}+`, l: t('طالب', 'students') },
            { icon: GraduationCap, v: `${teacherNames.length || 12}+`, l: t('معلّم خبير', 'expert teachers') },
            { icon: BookOpen, v: `${(subjects.length || 40)}+`, l: t('مادة تعليمية', 'courses') },
            { icon: Star, v: '4.8/5', l: t('متوسط التقييم', 'avg. rating') },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: '#FFFFFF' }}>
                <s.icon className="h-5 w-5" style={{ color: BRAND.gold }} />
              </div>
              <div>
                <p className="text-xl font-black leading-none">{s.v}</p>
                <p className="mt-1 text-[13px] text-slate-500">{s.l}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Browse by stage (tile grid) ───── */}
      <section className="mx-auto max-w-[1200px] px-5 py-20 lg:px-8">
        <Reveal>
          <div className="mb-9 flex items-end justify-between">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t('تصفّح حسب المرحلة', 'Browse by stage')}</h2>
            <Link to="/stages" className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: BRAND.gold }}>
              {t('كل المراحل', 'All stages')} <Fwd className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(stages.length ? stages : [{}, {}, {}, {}]).slice(0, 4).map((s: any, i: number) => (
            <Reveal key={s.id || i} delay={i * 70}>
              <Link to={s.slug ? `/stages/${s.slug}` : '/stages'}
                className="group relative block overflow-hidden rounded-2xl">
                <img src={`https://picsum.photos/seed/aymanstage${i}/600/400`} alt="" className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(19,25,33,0.85), rgba(19,25,33,0.15))' }} />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-lg font-extrabold">{tt(s, 'title') || t('مرحلة دراسية', 'Study stage')}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold opacity-80">{t('استكشف', 'Explore')} <Fwd className="h-3.5 w-3.5" /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Popular courses (course cards) ── */}
      <section style={{ background: BRAND.surface }}>
        <div className="mx-auto max-w-[1200px] px-5 py-20 lg:px-8">
          <Reveal>
            <h2 className="mb-2 text-3xl font-black tracking-tight sm:text-4xl">{t('المواد الأكثر رواجاً', 'Most popular courses')}</h2>
            <p className="mb-9 text-[17px] text-slate-500">{t('اختارها آلاف الطلاب هذا الفصل.', 'Chosen by thousands of students this term.')}</p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.slice(0, 4).map((c: any, i: number) => (
              <Reveal key={i} delay={i * 70}>
                <Link to="/subjects" className="group block overflow-hidden rounded-2xl border bg-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
                  <div className="relative">
                    <img src={`https://picsum.photos/seed/aymancourse${i}/600/360`} alt="" className="h-36 w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100" style={{ background: 'rgba(19,25,33,0.35)' }}>
                      <PlayCircle className="h-11 w-11 text-white" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: BRAND.gold }}>{c.stage || t('مادة', 'Course')}</p>
                    <h3 className="mt-1 line-clamp-2 min-h-[2.6rem] text-[15px] font-extrabold leading-snug">{isAr ? c.title_ar : c.title_en || c.title_ar}</h3>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-slate-500">
                      <Star className="h-3.5 w-3.5 fill-current" style={{ color: BRAND.gold }} />
                      <span className="font-bold text-slate-700">{c.rating}</span>
                      <span>· {c.students.toLocaleString('en-US')} {t('طالب', 'students')}</span>
                    </div>
                    <p className="mt-3 text-base font-black" style={{ color: BRAND.navy }}>{price(c.price)}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value / feature split (asymmetric) ── */}
      <section className="mx-auto max-w-[1200px] items-center gap-14 px-5 py-24 lg:grid lg:grid-cols-2 lg:px-8">
        <Reveal className="relative">
          <img src="https://picsum.photos/seed/aymanlearn/800/900" alt="" className="aspect-[4/5] w-full rounded-[1.75rem] object-cover shadow-xl" />
        </Reveal>
        <Reveal delay={100} className="mt-10 lg:mt-0">
          <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{t('كل ما يحتاجه طالبك للتفوّق', 'Everything your student needs to excel')}</h2>
          <div className="mt-8 space-y-6">
            {[
              { icon: PlayCircle, ar: 'دروس مصوّرة واضحة', en: 'Clear video lessons', dar: 'شرح مبسّط لكل درس مع أمثلة تطبيقية.', den: 'Simple explanations with worked examples.' },
              { icon: ShieldCheck, ar: 'اختبارات تقيس التقدّم', en: 'Quizzes that track progress', dar: 'تعرف مستوى طالبك أولاً بأول.', den: 'Know exactly where your student stands.' },
              { icon: Award, ar: 'شهادات معتمدة', en: 'Verified certificates', dar: 'تحفيز حقيقي عند إتمام كل مادة.', den: 'Real motivation on every completion.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: '#FBF4E4' }}>
                  <f.icon className="h-6 w-6" style={{ color: BRAND.gold }} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">{isAr ? f.ar : f.en}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-500">{isAr ? f.dar : f.den}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── How it works (process row) ────── */}
      <section style={{ background: BRAND.navy }} className="text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20 lg:px-8">
          <Reveal><h2 className="mb-12 text-center text-3xl font-black tracking-tight sm:text-4xl">{t('ابدأ في ثلاث خطوات', 'Get started in three steps')}</h2></Reveal>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { ar: 'أنشئ حسابك', en: 'Create your account', dar: 'سجّل مجاناً واختر مرحلتك الدراسية.', den: 'Sign up free and pick your stage.' },
              { ar: 'اختر موادك', en: 'Choose your courses', dar: 'تصفّح المواد واشترك في ما يناسبك.', den: 'Browse and enroll in what fits.' },
              { ar: 'تعلّم واحصل على شهادة', en: 'Learn and get certified', dar: 'أكمل الدروس واحصل على شهادتك.', den: 'Finish lessons and earn your certificate.' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 90} className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black" style={{ background: BRAND.gold }}>{i + 1}</div>
                <h3 className="mt-5 text-xl font-extrabold">{isAr ? s.ar : s.en}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/60">{isAr ? s.dar : s.den}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instructors ───────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-20 lg:px-8">
        <Reveal>
          <div className="mb-9 flex items-end justify-between">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t('تعلّم على يد نخبة', 'Learn from top instructors')}</h2>
            <Link to="/subjects" className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: BRAND.gold }}>{t('كل المعلّمين', 'All teachers')} <Fwd className="h-4 w-4" /></Link>
          </div>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teacherNames.slice(0, 4).map((name: string, i: number) => {
            const avatar = teachers[i]?.avatar_url;
            return (
              <Reveal key={i} delay={i * 70}>
                <div className="rounded-2xl border p-5 text-center transition-shadow hover:shadow-lg" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-full ring-4" style={{ ['--tw-ring-color' as any]: '#FBF4E4' }}>
                    <img src={avatar || `https://picsum.photos/seed/aymanteacher${i}/120/120`} alt={name} className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-3 font-extrabold">{name}</p>
                  <p className="text-[13px] text-slate-500">{t('معلّم معتمد', 'Verified teacher')}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[13px]">
                    <Star className="h-3.5 w-3.5 fill-current" style={{ color: BRAND.gold }} />
                    <span className="font-bold">{[4.9, 4.8, 4.7, 4.9][i % 4]}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Testimonials ──────────────────── */}
      <section style={{ background: BRAND.surface }}>
        <div className="mx-auto max-w-[1000px] px-5 py-20 lg:px-8">
          <Reveal><h2 className="mb-10 text-center text-3xl font-black tracking-tight sm:text-4xl">{t('ماذا يقول طلابنا وأولياء الأمور', 'What students and parents say')}</h2></Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {TESTIMONIALS.map((tm, i) => (
              <Reveal key={i} delay={i * 90}>
                <figure className="h-full rounded-2xl border bg-white p-7" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
                  <div className="flex gap-0.5" style={{ color: BRAND.gold }}>
                    {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-4 w-4 fill-current" />)}
                  </div>
                  <blockquote className="mt-4 text-[17px] font-medium leading-relaxed">{isAr ? tm.q_ar : tm.q_en}</blockquote>
                  <figcaption className="mt-5 text-sm">
                    <span className="font-extrabold">{isAr ? tm.n_ar : tm.n_en}</span>
                    <span className="text-slate-500"> · {isAr ? tm.r_ar : tm.r_en}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: BRAND.navyDeep }}>
        <div className="pointer-events-none absolute left-1/2 top-[-30%] h-[380px] w-[380px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: BRAND.gold, opacity: 0.16 }} />
        <div className="relative mx-auto max-w-[820px] px-5 py-24 text-center text-white">
          <Reveal>
            <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">{t('ابدأ رحلة التفوّق اليوم', 'Start the journey to top grades today')}</h2>
            <p className="mx-auto mt-5 max-w-md text-lg text-white/60">{t('انضمّ مجاناً وابدأ أول درس الآن.', 'Join free and start your first lesson now.')}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register" className="w-full rounded-xl px-8 py-4 text-base font-bold text-[#131921] transition-transform active:scale-95 sm:w-auto" style={{ background: BRAND.goldLight }}>
                {t('أنشئ حسابك مجاناً', 'Create your free account')}
              </Link>
              <Link to="/subjects" className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-bold hover:bg-white/10 sm:w-auto">
                {t('تصفّح المواد', 'Browse courses')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ────────────────────────── */}
      <footer className="border-t" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-7 w-7 object-contain" />
            <span className="font-bold" style={{ color: BRAND.navy }}>{t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/legal/terms" className="hover:text-slate-800">{t('الشروط', 'Terms')}</Link>
            <Link to="/legal/privacy" className="hover:text-slate-800">{t('الخصوصية', 'Privacy')}</Link>
            <span>© {t('أكاديمية أيمن', 'Ayman Academy')}</span>
          </div>
        </div>
      </footer>

      <VariantSwitcher />
    </div>
  );
}
