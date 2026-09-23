import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeStages, useFeaturedTeachers } from '@/hooks/useQueryHooks';
import { supabase } from '@/lib/supabase';
import {
  GraduationCap,
  Users,
  BookOpen,
  Award,
  Globe,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  HeartHandshake,
  BadgeCheck,
  Sparkles,
  Play,
  UserPlus,
  ArrowUpRight,
  Menu,
  Loader2,
  User,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-library.jpg';

// ---------------------------------------------------------------------------
// Inject global keyframe animations & utility classes
// ---------------------------------------------------------------------------
const STYLE_ID = 'landing-preview-styles';

const globalCSS = `
@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -20px) scale(1.1); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-20px, 30px) scale(1.05); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(15px, 15px); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.45; }
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  pointer-events: none;
}
.orb-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #d4a853 0%, transparent 70%);
  animation: float1 20s ease-in-out infinite;
}
.orb-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #2563eb 0%, transparent 70%);
  animation: float2 25s ease-in-out infinite;
}
.orb-3 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
  animation: float3 18s ease-in-out infinite;
}
.glass {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
}
.glass-hover {
  transition: background 0.3s, border-color 0.3s, transform 0.3s;
}
.glass-hover:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-4px);
}
.noise::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
.gold-line {
  height: 3px;
  width: 60px;
  background: linear-gradient(90deg, #d4a853, transparent);
  border-radius: 999px;
}
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LandingPreview() {
  const { language, direction, toggleLanguage, t } = useLanguage();
  const { isAuthenticated, role } = useAuth();
  const { data: stages = [] } = useHomeStages();
  const { data: featuredTeachers = [] } = useFeaturedTeachers();

  // Inject styles once
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = globalCSS;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  // Determine dashboard link based on role
  const dashboardPath =
    role === 'super_admin'
      ? '/admin'
      : role === 'teacher'
        ? '/teacher'
        : '/student';

  // Chevron helper for direction-aware arrows
  const Arrow = language === 'ar' ? ChevronLeft : ChevronRight;

  // ----- fallback stages when DB is empty -----
  const fallbackStages = [
    {
      id: 'f1',
      slug: 'introductory',
      title_ar: 'كتاب تمهيدي',
      title_en: 'Introductory',
      description_ar: 'مرحلة تمهيدية لتأسيس القواعد الأساسية في القراءة والكتابة.',
      description_en: 'A foundational stage for building core reading and writing skills.',
    },
    {
      id: 'f2',
      slug: 'primary',
      title_ar: 'ابتدائي',
      title_en: 'Primary',
      description_ar: 'المرحلة الابتدائية بمناهج متكاملة وتفاعلية.',
      description_en: 'Primary stage with comprehensive and interactive curricula.',
    },
    {
      id: 'f3',
      slug: 'intermediate',
      title_ar: 'متوسط',
      title_en: 'Intermediate',
      description_ar: 'المرحلة المتوسطة لتعزيز المهارات الأكاديمية المتقدمة.',
      description_en: 'Intermediate stage to strengthen advanced academic skills.',
    },
  ];

  const displayStages = stages.length > 0 ? stages : fallbackStages;

  const stageIcons = [GraduationCap, BookOpen, Award];

  // =========================================================================
  return (
    <div
      className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden relative"
      dir={direction}
    >
      {/* ====================== NAVBAR ====================== */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/preview" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Waraq Academy" className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-tight hidden sm:inline">
              {t('ورق أكاديمي', 'Waraq Academy')}
            </span>
          </Link>

          {/* Center links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#hero" className="text-[#d4a853] hover:text-[#d4a853] transition">
              {t('الرئيسية', 'Home')}
            </a>
            <a href="#stages" className="hover:text-white transition">
              {t('المراحل', 'Stages')}
            </a>
            <a href="#features" className="hover:text-white transition">
              {t('المميزات', 'Features')}
            </a>
            <a href="#teach" className="hover:text-white transition">
              {t('انضم كمعلم', 'Teach')}
            </a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full glass glass-hover text-white/70 hover:text-white"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'ar' ? 'EN' : 'عربي'}
            </button>

            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="text-sm px-4 py-1.5 rounded-full bg-[#d4a853]/90 hover:bg-[#d4a853] text-[#0a0e1a] font-semibold transition"
              >
                {t('لوحة التحكم', 'Dashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-sm text-white/70 hover:text-white transition"
                >
                  {t('تسجيل الدخول', 'Sign In')}
                </Link>
                <Link
                  to="/register"
                  className="text-sm px-4 py-1.5 rounded-full bg-[#d4a853]/90 hover:bg-[#d4a853] text-[#0a0e1a] font-semibold transition"
                >
                  {t('إنشاء حساب', 'Register')}
                </Link>
              </>
            )}

            {/* Mobile menu placeholder */}
            <button className="md:hidden text-white/60 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ====================== HERO ====================== */}
      <section
        id="hero"
        className="relative min-h-[calc(100vh-64px)] mt-16 flex flex-col justify-center items-center"
      >
        {/* BG Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/40 via-[#0a0e1a]/70 to-[#0a0e1a]" />
        </div>

        {/* Orbs */}
        <div className="orb orb-1 -top-32 start-[-10%] z-[1]" />
        <div className="orb orb-2 top-1/3 end-[-8%] z-[1]" />
        <div className="orb orb-3 bottom-20 start-[15%] z-[1]" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-6">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-[#d4a853]">
            <Sparkles className="w-4 h-4" />
            {t('ورق أكاديمي التعليمية', 'Ayman Educational Academy')}
          </span>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            {t('تعليم يصنع', 'Education That Makes')}
            <br />
            <span className="bg-gradient-to-r from-[#d4a853] via-[#f0d68a] to-[#d4a853] bg-clip-text text-transparent">
              {t('الفرق', 'a Difference')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
            {t(
              'منصة تعليمية متكاملة تجمع بين أفضل المعلمين السوريين وطلاب يطمحون للتميز',
              "A comprehensive platform connecting Syria's best teachers with ambitious students"
            )}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <Link
              to={isAuthenticated ? dashboardPath : '/register'}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[#d4a853] to-[#c49a45] text-[#0a0e1a] font-bold text-base hover:shadow-lg hover:shadow-[#d4a853]/25 transition-all hover:scale-105"
            >
              <Play className="w-4 h-4" />
              {t('ابدأ التعلم', 'Start Learning')}
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full glass glass-hover font-semibold text-base text-white/90 hover:text-white"
            >
              <UserPlus className="w-4 h-4" />
              {t('انضم كمعلم', 'Teach With Us')}
            </Link>
          </div>
        </div>

        {/* Stats Row — overlaps into next section */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 mt-16 mb-[-48px]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Users,
                number: t('١٠٠٠+', '1,000+'),
                label: t('طالب مسجّل', 'Enrolled Students'),
              },
              {
                icon: BookOpen,
                number: t('٥٠+', '50+'),
                label: t('مادة تعليمية', 'Courses'),
              },
              {
                icon: GraduationCap,
                number: t('٣٠+', '30+'),
                label: t('معلم متميّز', 'Expert Teachers'),
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 flex items-center gap-4 glass-hover"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#d4a853]/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-[#d4a853]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.number}</p>
                  <p className="text-sm text-white/50">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== STAGES ====================== */}
      <section
        id="stages"
        className="relative py-32 noise"
        style={{
          background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1225 100%)',
        }}
      >
        <div className="orb orb-2 top-0 end-[-12%] opacity-20" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section heading */}
          <div className="text-center mb-16">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('المراحل الدراسية', 'Academic Stages')}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              {t(
                'اختر المرحلة المناسبة لك وابدأ رحلتك التعليمية',
                'Choose the right stage and begin your learning journey'
              )}
            </p>
          </div>

          {/* Stage Cards — Bento Layout: 3 stacked on one side, 1 tall card on the other */}
          {(() => {
            const smallCards = displayStages.slice(0, 3);
            const tallCard = displayStages[3] || null;

            const renderCard = (stage: any, i: number, tall = false) => {
              const Icon = stageIcons[i % stageIcons.length];
              const title = language === 'ar' ? stage.title_ar : stage.title_en;
              const desc = language === 'ar' ? stage.description_ar : stage.description_en;
              return (
                <div
                  key={stage.id}
                  className={`glass rounded-2xl glass-hover group relative overflow-hidden ${tall ? 'p-8 flex flex-col justify-center h-full' : 'p-6'}`}
                >
                  <div className="absolute -top-20 -end-20 w-40 h-40 rounded-full bg-[#d4a853]/0 group-hover:bg-[#d4a853]/10 transition-all duration-500 blur-3xl" />
                  <div className="relative z-10">
                    <div className={`${tall ? 'w-16 h-16 mb-8' : 'w-12 h-12 mb-4'} rounded-2xl bg-gradient-to-br from-[#d4a853]/20 to-[#d4a853]/5 flex items-center justify-center`}>
                      <Icon className={`${tall ? 'w-8 h-8' : 'w-6 h-6'} text-[#d4a853]`} />
                    </div>
                    <h3 className={`${tall ? 'text-2xl mb-4' : 'text-lg mb-2'} font-bold`}>{title}</h3>
                    <p className={`text-white/50 text-sm leading-relaxed ${tall ? 'mb-8' : 'mb-4'}`}>{desc}</p>
                    <Link
                      to={`/stages/${stage.slug || stage.id}`}
                      className="inline-flex items-center gap-1 text-[#d4a853] text-sm font-semibold group-hover:gap-2 transition-all"
                    >
                      {t('عرض المواد', 'View Subjects')}
                      <Arrow className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            };

            if (!tallCard) {
              // 3 or fewer stages — simple grid
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {smallCards.map((s, i) => renderCard(s, i))}
                </div>
              );
            }

            // 4 stages: bento — 3 stacked left, 1 tall right (or flipped for RTL)
            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 3 small cards stacked vertically — take 3 columns */}
                <div className="md:col-span-3 grid grid-cols-1 gap-6">
                  {smallCards.map((s, i) => renderCard(s, i))}
                </div>
                {/* Tall card — takes 1 column, stretches to match all 3 stacked cards */}
                <div className="md:col-span-1">
                  <div className="h-full">{renderCard(tallCard, 3, true)}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ====================== MEET OUR TEACHERS ====================== */}
      {featuredTeachers.length > 0 && (
        <section
          id="teachers"
          className="relative py-28 noise"
          style={{ background: 'linear-gradient(180deg, #0d1225 0%, #0a0e1a 100%)' }}
        >
          <div className="orb orb-3 top-[-10%] start-[-5%] opacity-15" />
          
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <div className="gold-line mx-auto mb-4" />
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                {t('نخبة معلميننا', 'Meet Our Teachers')}
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                {t(
                  'تعلم على يد أفضل الكفاءات التعليمية المتخصصة في المناهج السورية',
                  'Learn from the best specialized educational talents in Syrian curricula'
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredTeachers.map((teacher: any) => (
                <div key={teacher.id} className="glass rounded-3xl p-8 glass-hover group flex flex-col items-center text-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-b from-[#d4a853]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   
                   <div className="relative z-10 w-full flex flex-col items-center">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden mb-6 border-2 border-white/10 group-hover:border-[#d4a853]/30 transition-colors shadow-2xl">
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                            <User className="w-12 h-12 text-white/20" />
                          </div>
                        )}
                      </div>

                      <h3 className="text-xl font-bold mb-2 group-hover:text-[#d4a853] transition-colors">{teacher.full_name}</h3>
                      <p className="text-sm text-white/50 line-clamp-4 mb-6 overflow-hidden italic leading-relaxed">
                        "{t(teacher.bio_ar, teacher.bio_en || teacher.bio_ar) || t('معلم خبير في ورق أكاديمي', 'Expert teacher at Waraq Academy')}"
                      </p>

                      <Link 
                        to={`/t/${teacher.id}`}
                        className="mt-auto inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d4a853] py-2 px-6 rounded-full border border-[#d4a853]/20 hover:bg-[#d4a853] hover:text-[#0a0e1a] transition-all"
                      >
                        {t('عرض الملف', 'View Profile')}
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====================== MARKETPLACE PREVIEW ====================== */}
      <section
        className="relative py-28 noise"
        style={{ background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1225 100%)' }}
      >
        <div className="orb orb-2 top-[10%] end-[-5%] opacity-10" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('استكشف المواد الدراسية', 'Explore Our Courses')}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              {t(
                'تصفح المواد المتاحة واختر ما يناسبك. سجّل الآن وابدأ رحلتك التعليمية.',
                'Browse available courses and find what suits you. Sign up and start your learning journey.'
              )}
            </p>
          </div>

          {/* Subjects Grid */}
          {(() => {
            // Fetch subjects inline
            const [previewSubjects, setPreviewSubjects] = React.useState<any[]>([]);
            const [loadingSubjects, setLoadingSubjects] = React.useState(true);

            React.useEffect(() => {
              (async () => {
                try {
                  const { data: subjects } = await supabase
                    .from('subjects')
                    .select('*, stage:stages(id, title_ar, title_en)')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })
                    .limit(6);

                  if (subjects && subjects.length > 0) {
                    // Get teacher names
                    const teacherIds = [...new Set(subjects.map((s: any) => s.teacher_id).filter(Boolean))];
                    let teacherMap = new Map();
                    if (teacherIds.length > 0) {
                      const { data: teachers } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', teacherIds);
                      (teachers || []).forEach((t: any) => teacherMap.set(t.id, t));
                    }
                    setPreviewSubjects(subjects.map((s: any) => ({
                      ...s,
                      teacher: s.teacher_id ? teacherMap.get(s.teacher_id) : null,
                    })));
                  }
                } catch (e) {
                  console.error('Failed to load preview subjects', e);
                } finally {
                  setLoadingSubjects(false);
                }
              })();
            }, []);

            if (loadingSubjects) {
              return (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#d4a853]/50" />
                </div>
              );
            }

            if (previewSubjects.length === 0) {
              return (
                <div className="glass rounded-2xl p-12 text-center">
                  <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">{t('سيتم إضافة المواد قريباً', 'Courses coming soon')}</p>
                </div>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {previewSubjects.map((subject: any) => {
                    const isFree = !subject.price_amount || subject.price_amount === 0;
                    return (
                      <Link
                        key={subject.id}
                        to={`/course/${subject.id}`}
                        className="glass rounded-2xl p-6 glass-hover group relative overflow-hidden flex flex-col"
                      >
                        <div className="absolute -top-16 -end-16 w-32 h-32 rounded-full bg-[#d4a853]/0 group-hover:bg-[#d4a853]/8 transition-all duration-500 blur-3xl" />
                        <div className="relative z-10 flex-1 flex flex-col">
                          {/* Stage badge */}
                          {subject.stage && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#d4a853]/10 text-[#d4a853] px-2 py-1 rounded-full w-fit mb-4">
                              <GraduationCap className="w-3 h-3" />
                              {language === 'ar' ? subject.stage.title_ar : subject.stage.title_en || subject.stage.title_ar}
                            </span>
                          )}
                          {/* Title */}
                          <h3 className="text-lg font-bold mb-2 group-hover:text-[#d4a853] transition-colors">
                            {language === 'ar' ? subject.title_ar : subject.title_en || subject.title_ar}
                          </h3>
                          {/* Description */}
                          {subject.description_ar && (
                            <p className="text-white/40 text-sm line-clamp-2 mb-4">
                              {language === 'ar' ? subject.description_ar : subject.description_en || subject.description_ar}
                            </p>
                          )}
                          {/* Teacher */}
                          {subject.teacher && (
                            <p className="text-white/30 text-xs mb-4 flex items-center gap-1.5">
                              <User className="w-3 h-3" />
                              {subject.teacher.full_name}
                            </p>
                          )}

                          <div className="mt-auto" />

                          {/* Price + CTA */}
                          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                            <span className={`text-lg font-bold ${isFree ? 'text-green-400' : 'text-[#d4a853]'}`}>
                              {isFree ? t('مجاني', 'Free') : `${Number(subject.price_amount).toLocaleString()} ${subject.price_currency || 'SYP'}`}
                            </span>
                            <span className="text-xs text-white/30 group-hover:text-[#d4a853] transition-colors flex items-center gap-1">
                              {t('التفاصيل', 'Details')}
                              <Arrow className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* View all CTA */}
                <div className="text-center mt-10">
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#d4a853]/10 text-[#d4a853] font-semibold hover:bg-[#d4a853]/20 transition-all border border-[#d4a853]/20"
                  >
                    {t('عرض جميع المواد', 'Browse All Courses')}
                    <Arrow className="w-4 h-4" />
                  </Link>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* ====================== HOW IT WORKS ====================== */}
      <section
        className="relative py-28 noise"
        style={{
          background: 'linear-gradient(180deg, #0d1225 0%, #10162d 100%)',
        }}
      >
        <div className="orb orb-1 bottom-[-10%] start-[-8%] opacity-15" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('كيف تبدأ؟', 'How It Works')}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              {t(
                'ثلاث خطوات بسيطة تفصلك عن بداية رحلتك التعليمية',
                'Three simple steps to start your learning journey'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-[60px] inset-x-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#d4a853]/30 to-transparent" />

            {[
              {
                num: '01',
                title: t('أنشئ حسابك', 'Create Your Account'),
                desc: t(
                  'سجّل مجاناً واختر دورك كطالب أو معلم في ثوانٍ معدودة.',
                  'Sign up for free and choose your role as a student or teacher in seconds.'
                ),
              },
              {
                num: '02',
                title: t('اختر موادك', 'Choose Your Courses'),
                desc: t(
                  'تصفّح المراحل والمواد واختر ما يناسب مستواك واهتماماتك.',
                  'Browse stages and subjects to find what matches your level and interests.'
                ),
              },
              {
                num: '03',
                title: t('ابدأ التعلم', 'Start Learning'),
                desc: t(
                  'تعلّم بالسرعة التي تناسبك مع دروس تفاعلية واختبارات ذكية.',
                  'Learn at your own pace with interactive lessons and smart quizzes.'
                ),
              },
            ].map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Number circle */}
                <div className="mx-auto w-[72px] h-[72px] rounded-full glass flex items-center justify-center mb-6 relative z-10 border border-[#d4a853]/20 group-hover:border-[#d4a853]/50 transition-colors">
                  <span className="text-2xl font-extrabold bg-gradient-to-b from-[#d4a853] to-[#c49a45] bg-clip-text text-transparent">
                    {step.num}
                  </span>
                </div>
                <div className="glass rounded-2xl p-6 glass-hover">
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== FEATURES ====================== */}
      <section
        id="features"
        className="relative py-28 noise"
        style={{
          background: 'linear-gradient(180deg, #10162d 0%, #0d1225 100%)',
        }}
      >
        <div className="orb orb-3 top-[10%] end-[-5%] opacity-15" />
        <div className="orb orb-2 bottom-[5%] start-[-5%] opacity-10" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('لماذا ورق أكاديمي؟', 'Why Waraq Academy?')}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              {t(
                'نقدّم لك تجربة تعليمية فريدة بمعايير عالمية',
                'We offer a unique learning experience with world-class standards'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: t('محتوى موثوق', 'Trusted Content'),
                desc: t(
                  'جميع الدروس مُراجعة ومعتمدة من معلمين متخصصين.',
                  'All lessons are reviewed and approved by specialized educators.'
                ),
              },
              {
                icon: Award,
                title: t('جودة أكاديمية', 'Academic Quality'),
                desc: t(
                  'مناهج مصممة وفق أحدث المعايير التعليمية.',
                  'Curricula designed according to the latest educational standards.'
                ),
              },
              {
                icon: HeartHandshake,
                title: t('دعم مستمر', 'Continuous Support'),
                desc: t(
                  'فريق دعم جاهز لمساعدتك في كل خطوة من رحلتك.',
                  'A support team ready to help you at every step of your journey.'
                ),
              },
              {
                icon: BadgeCheck,
                title: t('شهادات معتمدة', 'Certified Certificates'),
                desc: t(
                  'احصل على شهادات إتمام معتمدة لتعزيز مسيرتك.',
                  'Earn accredited completion certificates to boost your career.'
                ),
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 glass-hover group relative overflow-hidden text-center"
              >
                {/* Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-[#d4a853]/5 to-transparent rounded-2xl" />

                <div className="relative z-10">
                  <div className="mx-auto w-14 h-14 rounded-2xl glass flex items-center justify-center mb-5 group-hover:border-[#d4a853]/20 transition-colors">
                    <feat.icon className="w-7 h-7 text-[#d4a853]" />
                  </div>
                  <h3 className="text-base font-bold mb-2">{feat.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== TEACH WITH US CTA ====================== */}
      <section
        id="teach"
        className="relative py-28 noise"
        style={{
          background:
            'linear-gradient(180deg, #0d1225 0%, #12132a 40%, #0d1225 100%)',
        }}
      >
        {/* Decorative gradient mesh */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#d4a853]/[0.06] blur-[120px]" />
        </div>

        <div className="orb orb-1 top-[-5%] end-[10%] opacity-10" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="glass rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
            {/* Inner glow */}
            <div className="absolute -top-24 start-1/2 -translate-x-1/2 w-96 h-48 bg-[#d4a853]/10 rounded-full blur-[80px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                {t(
                  'شارك خبرتك مع آلاف الطلاب',
                  'Share Your Expertise with Thousands'
                )}
              </h2>
              <p className="text-white/50 max-w-lg mx-auto mb-8 text-lg leading-relaxed">
                {t(
                  'انضم إلى فريق معلمي ورق أكاديمي وساهم في بناء مستقبل تعليمي أفضل.',
                  'Join Waraq Academy\'s teaching team and help build a better educational future.'
                )}
              </p>

              {/* Benefits */}
              <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm">
                {[
                  t('دخل مستمر', 'Steady Income'),
                  t('جمهور واسع', 'Large Audience'),
                  t('أدوات متقدمة', 'Advanced Tools'),
                ].map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-white/70"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
                    {item}
                  </span>
                ))}
              </div>

              <Link
                to="/apply/teacher"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-[#d4a853] to-[#c49a45] text-[#0a0e1a] font-bold text-lg hover:shadow-xl hover:shadow-[#d4a853]/20 transition-all hover:scale-105"
              >
                {t('سجّل كمعلم الآن', 'Register as a Teacher')}
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================== FOOTER ====================== */}
      <footer
        className="relative pt-16 pb-8"
        style={{ background: '#060912' }}
      >
        {/* Glass separator */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/preview" className="flex items-center gap-2 mb-4">
                <img src={logo} alt="Waraq Academy" className="h-8 w-auto" />
                <span className="font-bold">
                  {t('ورق أكاديمي', 'Waraq Academy')}
                </span>
              </Link>
              <p className="text-sm text-white/40 leading-relaxed">
                {t(
                  'منصة تعليمية سورية رائدة تهدف لتقديم تعليم عالي الجودة باللغة العربية.',
                  'A leading Syrian educational platform delivering high-quality Arabic-language education.'
                )}
              </p>
            </div>

            {/* Academy Links */}
            <div>
              <h4 className="text-sm font-semibold text-white/70 mb-4">
                {t('الأكاديمية', 'Academy')}
              </h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                <li>
                  <a href="#stages" className="hover:text-white/70 transition">
                    {t('المراحل الدراسية', 'Academic Stages')}
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white/70 transition">
                    {t('تسجيل الدخول', 'Sign In')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="hover:text-white/70 transition"
                  >
                    {t('إنشاء حساب', 'Register')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold text-white/70 mb-4">
                {t('الدعم', 'Support')}
              </h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                <li>
                  <a href="#" className="hover:text-white/70 transition">
                    {t('مركز المساعدة', 'Help Center')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white/70 transition">
                    {t('تواصل معنا', 'Contact Us')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white/70 transition">
                    {t('الأسئلة الشائعة', 'FAQ')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Policy */}
            <div>
              <h4 className="text-sm font-semibold text-white/70 mb-4">
                {t('السياسات', 'Policies')}
              </h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                <li>
                  <a href="#" className="hover:text-white/70 transition">
                    {t('سياسة الخصوصية', 'Privacy Policy')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white/70 transition">
                    {t('شروط الاستخدام', 'Terms of Use')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white/70 transition">
                    {t('سياسة الاسترجاع', 'Refund Policy')}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()}{' '}
              {t('ورق أكاديمي. جميع الحقوق محفوظة.', 'Waraq Academy. All rights reserved.')}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <span>{t('صنع بإتقان في سوريا', 'Crafted with care in Syria')}</span>
              <span className="text-[#d4a853]">&#9830;</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
