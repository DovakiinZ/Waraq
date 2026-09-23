/**
 * PublicMarketplace - course marketplace (public, no auth needed).
 * Layout: left sidebar filters + main content (banner, stage tabs, course grid).
 *
 * Styled in the arcade (green + white) language to match the landing page:
 * sharp edges, 2px borders, hard offset shadows, one green scale. The previous
 * version rotated six unrelated hues (violet, emerald, amber, rose, cyan,
 * fuchsia) for card thumbnails; that is replaced by the single green system.
 *
 * All data fetching, filtering and derived values are unchanged.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';
import Layout from '@/components/layout/Layout';
import { A, PIXEL_STRIP } from '@/components/arcade/theme';
import {
    ArcadeButton,
    ArcadeEmpty,
    ArcadeLink,
    ArcadeSkeleton,
} from '@/components/arcade/primitives';
import {
    BookOpen, Clock, Search, Play, Star,
    ChevronDown, ChevronUp, SlidersHorizontal, X, GraduationCap, Check,
} from 'lucide-react';

export default function PublicMarketplace() {
    const { t, language, direction } = useLanguage();
    const { isAuthenticated, role } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [categoriesExpanded, setCategoriesExpanded] = useState(true);

    const formatPrice = (amount?: number | null, currency?: string | null) => {
        if (!amount || amount === 0) return t('مجاني', 'Free');
        return `${amount.toLocaleString()} ${currency || 'SYP'}`;
    };

    const getCourseLink = (subjectId: string) => {
        if (isAuthenticated && role === 'student') return `/student/course/${subjectId}`;
        return `/course/${subjectId}`;
    };

    // ── Data ─────────────────────────────────────
    const { data: subjects = [], isLoading } = useQuery({
        queryKey: ['public-marketplace'],
        queryFn: async () => {
            const { data: subjectsData, error } = await supabase
                .from('subjects')
                .select('id, title_ar, title_en, description_ar, description_en, stage_id, teacher_id, cover_image_url, is_paid, price_amount, price_currency, sort_order, is_active, stage:stages(id, title_ar, title_en, slug)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;

            const subjects = (subjectsData || []) as any[];
            const teacherIds = [...new Set(subjects.map(s => s.teacher_id).filter(Boolean))];
            const teacherMap = new Map();
            if (teacherIds.length > 0) {
                const { data: teachersData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', teacherIds);
                const teachers = (teachersData || []) as any[];
                teachers.forEach(t => teacherMap.set(t.id, t));
            }

            const subjectIds = subjects.map(s => s.id);
            const lessonCountMap = new Map();
            if (subjectIds.length > 0) {
                const { data: lessonsData } = await supabase.from('lessons').select('subject_id, duration_minutes').in('subject_id', subjectIds).eq('is_published', true);
                const lessons = (lessonsData || []) as any[];
                lessons.forEach(l => {
                    const prev = lessonCountMap.get(l.subject_id) || { count: 0, duration: 0 };
                    lessonCountMap.set(l.subject_id, { count: prev.count + 1, duration: prev.duration + (l.duration_minutes || 0) });
                });
            }

            // Ratings: aggregate lesson ratings per subject
            const ratingMap = new Map<string, { avg: number; count: number }>();
            if (subjectIds.length > 0) {
                // Get all lesson IDs for these subjects
                const { data: subjectLessonsData } = await supabase.from('lessons').select('id, subject_id').in('subject_id', subjectIds).eq('is_published', true);
                const subjectLessons = (subjectLessonsData || []) as any[];
                const lessonIds = subjectLessons.map(l => l.id);
                const lessonToSubject = new Map(subjectLessons.map(l => [l.id, l.subject_id]));

                if (lessonIds.length > 0) {
                    const { data: ratingsData } = await supabase.from('ratings').select('entity_id, stars').eq('entity_type', 'lesson').in('entity_id', lessonIds);
                    const ratings = (ratingsData || []) as any[];
                    // Also check for direct subject ratings
                    const { data: subjectRatingsData } = await supabase.from('ratings').select('entity_id, stars').eq('entity_type', 'subject').in('entity_id', subjectIds);
                    const subjectRatings = (subjectRatingsData || []) as any[];

                    const grouped = new Map<string, number[]>();
                    // Aggregate lesson ratings to their subject
                    ratings.forEach(r => {
                        const sid = lessonToSubject.get(r.entity_id);
                        if (sid) { const arr = grouped.get(sid) || []; arr.push(r.stars); grouped.set(sid, arr); }
                    });
                    // Add direct subject ratings
                    subjectRatings.forEach(r => {
                        const arr = grouped.get(r.entity_id) || []; arr.push(r.stars); grouped.set(r.entity_id, arr);
                    });
                    grouped.forEach((stars, id) => {
                        ratingMap.set(id, { avg: Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10, count: stars.length });
                    });
                }
            }

            return subjects.map(s => ({
                ...s,
                teacher: s.teacher_id ? teacherMap.get(s.teacher_id) : null,
                lesson_count: lessonCountMap.get(s.id)?.count || 0,
                total_duration: lessonCountMap.get(s.id)?.duration || 0,
                avg_rating: ratingMap.get(s.id)?.avg || 0,
                rating_count: ratingMap.get(s.id)?.count || 0,
            }));
        },
        staleTime: STALE_TIMES.SEMI_STATIC,
    });

    // Stage options for tabs + sidebar
    const stageOptions = useMemo(() => {
        const map = new Map<string, any>();
        subjects.forEach((s: any) => { if (s.stage && !map.has(s.stage.id)) map.set(s.stage.id, s.stage); });
        return Array.from(map.values());
    }, [subjects]);

    // Unique teacher names for category filter
    const teacherNames = useMemo(() => {
        const names = new Map<string, string>();
        subjects.forEach((s: any) => { if (s.teacher) names.set(s.teacher.id, s.teacher.full_name); });
        return Array.from(names.entries()); // [id, name]
    }, [subjects]);

    // Filtered
    const filtered = useMemo(() => {
        let list = [...subjects];
        if (stageFilter !== 'all') list = list.filter((s: any) => s.stage?.id === stageFilter);
        if (selectedCategories.size > 0) list = list.filter((s: any) => s.teacher && selectedCategories.has(s.teacher.id));
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter((s: any) => s.title_ar?.toLowerCase().includes(q) || s.title_en?.toLowerCase().includes(q) || s.teacher?.full_name?.toLowerCase().includes(q));
        }
        return list;
    }, [subjects, stageFilter, selectedCategories, searchQuery]);

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Duration formatter
    const fmtDuration = (mins: number) => {
        if (mins < 60) return `${mins}${t('د', 'm')}`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}${t('س', 'h')} ${m.toString().padStart(2, '0')}${t('د', 'm')}` : `${h}${t('س', 'h')}`;
    };

    const hasActiveFilters = stageFilter !== 'all' || selectedCategories.size > 0 || !!searchQuery;

    // Square arcade checkbox. Replaces the shadcn Checkbox, which is themed
    // off --primary (navy) and would not match.
    const ArcCheckbox = ({ checked }: { checked: boolean }) => (
        <span
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2"
            style={{
                background: checked ? A.accent : A.surface,
                borderColor: A.line,
                color: A.onAccent,
            }}
            aria-hidden
        >
            {checked && <Check className="h-3 w-3" strokeWidth={4} />}
        </span>
    );

    // ── Sidebar Content ──────────────────────────
    const SidebarContent = () => (
        <div className="space-y-7">
            <div className="relative">
                <Search
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 start-3"
                    style={{ color: A.inkSoft }}
                />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('ابحث عن مادة', 'Search courses')}
                    aria-label={t('ابحث عن مادة', 'Search courses')}
                    className="arc-input ps-10"
                />
            </div>

            {/* Stages */}
            {stageOptions.length > 0 && (
                <div>
                    <button
                        onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                        className="arc-focus mb-3 flex w-full items-center justify-between text-[13px] font-black"
                        style={{ color: A.ink }}
                        aria-expanded={categoriesExpanded}
                    >
                        {t('المراحل الدراسية', 'Stages')}
                        {categoriesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {categoriesExpanded && (
                        <div className="space-y-1.5">
                            {stageOptions.map((stage: any) => {
                                const count = subjects.filter((s: any) => s.stage?.id === stage.id).length;
                                const isActive = stageFilter === stage.id;
                                return (
                                    <button
                                        key={stage.id}
                                        onClick={() => setStageFilter(isActive ? 'all' : stage.id)}
                                        className="arc-focus flex w-full items-center justify-between border-2 px-2.5 py-2 text-[13px] font-bold transition-colors"
                                        style={{
                                            background: isActive ? A.accent : 'transparent',
                                            color: isActive ? A.onAccent : A.ink,
                                            borderColor: isActive ? A.line : 'transparent',
                                        }}
                                        aria-pressed={isActive}
                                    >
                                        <span className="flex items-center gap-2 text-start">
                                            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                                            {language === 'ar' ? stage.title_ar : stage.title_en || stage.title_ar}
                                        </span>
                                        <span className="font-mono text-[11px]">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Teachers */}
            {teacherNames.length > 0 && (
                <div>
                    <h3 className="mb-3 text-[13px] font-black" style={{ color: A.ink }}>
                        {t('المعلّمون', 'Teachers')}
                    </h3>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                        {teacherNames.map(([id, name]) => (
                            <label
                                key={id}
                                className="flex cursor-pointer items-center gap-2.5 py-0.5 text-[13px] font-semibold"
                                style={{ color: A.ink }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.has(id)}
                                    onChange={() => toggleCategory(id)}
                                    className="sr-only"
                                />
                                <ArcCheckbox checked={selectedCategories.has(id)} />
                                <span>{name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {hasActiveFilters && (
                <button
                    onClick={() => { setStageFilter('all'); setSelectedCategories(new Set()); setSearchQuery(''); }}
                    className="arc-focus flex items-center gap-1.5 text-[12px] font-bold"
                    style={{ color: A.mid }}
                >
                    <X className="h-3.5 w-3.5" />
                    {t('مسح الفلاتر', 'Clear filters')}
                </button>
            )}
        </div>
    );

    return (
        <Layout>
            <div dir={direction}>
                <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
                    {/* Mobile filter toggle */}
                    <div className="mb-5 lg:hidden">
                        <ArcadeButton
                            variant="outline"
                            size="sm"
                            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {t('الفلاتر', 'Filters')}
                        </ArcadeButton>
                    </div>

                    <div className="flex gap-7">
                        {/* ── LEFT SIDEBAR ─────────────── */}
                        <aside className="hidden w-64 flex-shrink-0 lg:block">
                            <div
                                className="sticky top-24 border-2 p-5"
                                style={{
                                    background: A.surface,
                                    borderColor: A.line,
                                    boxShadow: `6px 6px 0 var(--arc-shadow)`,
                                }}
                            >
                                <SidebarContent />
                            </div>
                        </aside>

                        {/* Mobile sidebar overlay */}
                        {mobileSidebarOpen && (
                            <div
                                className="fixed inset-0 z-50 bg-black/60 lg:hidden"
                                onClick={() => setMobileSidebarOpen(false)}
                            >
                                <div
                                    className="absolute bottom-0 top-0 w-[300px] overflow-y-auto p-5 start-0"
                                    style={{ background: A.surface, borderInlineEnd: `2px solid ${A.line}` }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="mb-5 flex items-center justify-between">
                                        <h2 className="text-[16px] font-black" style={{ color: A.ink }}>
                                            {t('الفلاتر', 'Filters')}
                                        </h2>
                                        <button
                                            onClick={() => setMobileSidebarOpen(false)}
                                            className="arc-focus flex h-9 w-9 items-center justify-center border-2"
                                            style={{ borderColor: A.line, color: A.ink }}
                                            aria-label={t('إغلاق', 'Close')}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <SidebarContent />
                                </div>
                            </div>
                        )}

                        {/* ── MAIN CONTENT ─────────────── */}
                        <main className="min-w-0 flex-1">
                            {/* Banner */}
                            <div
                                className="relative mb-7 overflow-hidden border-2 p-8 md:p-10"
                                style={{
                                    background: A.grad,
                                    borderColor: A.line,
                                    boxShadow: `6px 6px 0 var(--arc-shadow)`,
                                }}
                            >
                                {/* Dot plate for texture. CSS gradient, not an asset. */}
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-[0.16]"
                                    style={{
                                        backgroundImage: `radial-gradient(${A.onInk} 1px, transparent 1px)`,
                                        backgroundSize: '18px 18px',
                                    }}
                                    aria-hidden
                                />
                                <div className="relative z-10 max-w-xl">
                                    <h1
                                        className="text-[28px] font-black leading-tight tracking-tight md:text-[36px]"
                                        style={{ color: A.onInk }}
                                    >
                                        {t('اختر المادة المناسبة لمستواك', 'Find the course that fits your level')}
                                    </h1>
                                    <p
                                        className="mt-4 max-w-[52ch] text-[15px] font-medium leading-relaxed"
                                        style={{ color: A.onInkMuted }}
                                    >
                                        {t(
                                            'تصفّح المواد المتاحة واشترك في ما يناسبك مع معلّمين تثق بهم.',
                                            'Browse the available subjects and subscribe with teachers you trust.',
                                        )}
                                    </p>
                                    {!isAuthenticated && (
                                        <div className="mt-7">
                                            <ArcadeLink to="/register" variant="onDark">
                                                {t('ابدأ الآن', 'Get started')}
                                            </ArcadeLink>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stage tabs */}
                            <div
                                className="mb-6 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none' }}
                            >
                                <button
                                    onClick={() => setStageFilter('all')}
                                    className="arc-focus flex-shrink-0 whitespace-nowrap border-2 px-4 py-2 text-[13px] font-black transition-colors"
                                    style={{
                                        background: stageFilter === 'all' ? A.accent : A.surface,
                                        color: stageFilter === 'all' ? A.onAccent : A.ink,
                                        borderColor: A.line,
                                    }}
                                    aria-pressed={stageFilter === 'all'}
                                >
                                    {t('الكل', 'All')}
                                </button>
                                {stageOptions.map((stage: any) => (
                                    <button
                                        key={stage.id}
                                        onClick={() => setStageFilter(stage.id)}
                                        className="arc-focus flex-shrink-0 whitespace-nowrap border-2 px-4 py-2 text-[13px] font-black transition-colors"
                                        style={{
                                            background: stageFilter === stage.id ? A.accent : A.surface,
                                            color: stageFilter === stage.id ? A.onAccent : A.ink,
                                            borderColor: A.line,
                                        }}
                                        aria-pressed={stageFilter === stage.id}
                                    >
                                        {language === 'ar' ? stage.title_ar : stage.title_en || stage.title_ar}
                                    </button>
                                ))}
                            </div>

                            {/* Section header */}
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <h2 className="text-[22px] font-black tracking-tight" style={{ color: A.ink }}>
                                    {t('المواد المتاحة', 'Available courses')}
                                </h2>
                                <span
                                    className="shrink-0 font-mono text-[13px] font-bold"
                                    style={{ color: A.inkSoft }}
                                >
                                    {filtered.length} {t('مادة', 'courses')}
                                </span>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <ArcadeSkeleton key={i} className="h-[320px]" />
                                    ))}
                                </div>
                            ) : filtered.length === 0 ? (
                                <ArcadeEmpty>
                                    <BookOpen
                                        className="mx-auto mb-3 h-10 w-10"
                                        style={{ color: A.inkSoft }}
                                    />
                                    {hasActiveFilters
                                        ? t(
                                            'لا توجد مواد تطابق الفلاتر. جرّب مسح الفلاتر أو تغيير المرحلة.',
                                            'No courses match these filters. Try clearing them or picking another stage.',
                                        )
                                        : t(
                                            'لا توجد مواد متاحة حالياً. تُضاف المواد من لوحة المعلّم.',
                                            'No courses available yet. Teachers add subjects from their dashboard.',
                                        )}
                                </ArcadeEmpty>
                            ) : (
                                /* ── COURSE GRID ── */
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                    {filtered.map((subject: any, idx: number) => {
                                        const isFree = !subject.price_amount || subject.price_amount === 0;
                                        const hasCover = !!subject.cover_image_url;
                                        // Every third card leans on the accent so the grid has
                                        // rhythm without introducing a second hue.
                                        const accentLean = idx % 3 === 1;

                                        return (
                                            <div
                                                key={subject.id}
                                                className="arc-press group flex flex-col overflow-hidden border-2"
                                                style={{
                                                    background: A.surface,
                                                    borderColor: A.line,
                                                }}
                                            >
                                                {/* Thumbnail */}
                                                <Link
                                                    to={getCourseLink(subject.id)}
                                                    className="arc-focus relative block aspect-[16/9] overflow-hidden"
                                                    style={{ borderBottom: `2px solid ${A.line}` }}
                                                >
                                                    {hasCover ? (
                                                        <img
                                                            src={subject.cover_image_url}
                                                            alt=""
                                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="flex h-full w-full items-center justify-center"
                                                            style={{
                                                                background: accentLean ? A.accent : A.grad,
                                                            }}
                                                        >
                                                            <BookOpen
                                                                className="h-10 w-10"
                                                                style={{
                                                                    color: accentLean ? A.onAccent : A.onInk,
                                                                    opacity: 0.75,
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    {/* Play affordance on hover */}
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                                        <span
                                                            className="flex h-12 w-12 items-center justify-center border-2"
                                                            style={{
                                                                background: A.accent,
                                                                color: A.onAccent,
                                                                borderColor: A.line,
                                                            }}
                                                        >
                                                            <Play className="h-5 w-5" />
                                                        </span>
                                                    </div>
                                                    {subject.stage && (
                                                        <span
                                                            className="absolute top-2.5 border-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.1em] start-2.5"
                                                            style={{
                                                                background: A.surface,
                                                                color: A.ink,
                                                                borderColor: A.line,
                                                            }}
                                                        >
                                                            {language === 'ar' ? subject.stage.title_ar : subject.stage.title_en || subject.stage.title_ar}
                                                        </span>
                                                    )}
                                                </Link>

                                                {/* Content */}
                                                <div className="flex flex-1 flex-col p-4">
                                                    <Link to={getCourseLink(subject.id)} className="arc-focus">
                                                        <h3
                                                            className="line-clamp-2 text-[16px] font-black leading-snug"
                                                            style={{ color: A.ink }}
                                                        >
                                                            {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                                        </h3>
                                                    </Link>

                                                    {subject.teacher && (
                                                        <Link
                                                            to={`/t/${subject.teacher.id}`}
                                                            className="arc-focus mt-1.5 block truncate text-[13px] font-semibold"
                                                            style={{ color: A.mid }}
                                                        >
                                                            {subject.teacher.full_name}
                                                        </Link>
                                                    )}

                                                    {/* Meta: lessons, duration, rating */}
                                                    <div
                                                        className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold"
                                                        style={{ color: A.inkSoft }}
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            <BookOpen className="h-3 w-3" />
                                                            {subject.lesson_count}
                                                        </span>
                                                        {subject.total_duration > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {fmtDuration(subject.total_duration)}
                                                            </span>
                                                        )}
                                                        {subject.avg_rating > 0 && (
                                                            <span
                                                                className="flex items-center gap-1"
                                                                style={{ color: A.mid }}
                                                            >
                                                                <Star
                                                                    className="h-3 w-3"
                                                                    style={{ fill: A.mid }}
                                                                />
                                                                {subject.avg_rating}
                                                                <span style={{ color: A.inkSoft }}>
                                                                    ({subject.rating_count})
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Price + details. The card's action goes to the
                                                        course page, the same destination as the title
                                                        and thumbnail, so nothing here promises an
                                                        enrolment the page cannot complete. */}
                                                    <div
                                                        className="mt-4 flex items-center justify-between gap-3 pt-3"
                                                        style={{ borderTop: `2px solid ${A.line}` }}
                                                    >
                                                        <span
                                                            className="text-[17px] font-black"
                                                            style={{ color: isFree ? A.mid : A.ink }}
                                                        >
                                                            {formatPrice(subject.price_amount, subject.price_currency)}
                                                        </span>
                                                        <Link
                                                            to={getCourseLink(subject.id)}
                                                            className="arc-focus flex items-center gap-1 text-[12px] font-black"
                                                            style={{ color: A.ink }}
                                                        >
                                                            {t('تفاصيل المادة', 'Course details')}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Closing CTA for guests */}
                            {!isAuthenticated && filtered.length > 0 && (
                                <div
                                    className="relative mt-12 overflow-hidden border-2 p-9 text-center"
                                    style={{
                                        background: A.grad,
                                        borderColor: A.line,
                                        boxShadow: `6px 6px 0 var(--arc-shadow)`,
                                    }}
                                >
                                    <h2
                                        className="text-[26px] font-black leading-tight tracking-tight sm:text-[32px]"
                                        style={{ color: A.onInk }}
                                    >
                                        {t('جاهز لبدء التعلّم؟', 'Ready to start learning?')}
                                    </h2>
                                    <p
                                        className="mx-auto mt-4 max-w-[48ch] text-[15px] font-medium leading-relaxed"
                                        style={{ color: A.onInkMuted }}
                                    >
                                        {t(
                                            'أنشئ حسابك واختر مرحلتك، ثم اشترك في المواد التي تحتاجها.',
                                            'Create an account, choose your stage, then subscribe to the subjects you need.',
                                        )}
                                    </p>
                                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                                        <ArcadeLink to="/register" variant="onDark">
                                            {t('ابدأ الآن', 'Get started')}
                                        </ArcadeLink>
                                        <Link
                                            to="/login"
                                            className="arc-focus inline-flex items-center px-2 text-[15px] font-black"
                                            style={{ color: A.onInk }}
                                        >
                                            {t('دخول', 'Log in')}
                                        </Link>
                                    </div>
                                    <div
                                        className="mt-9 h-[6px] w-full opacity-40"
                                        style={{ background: PIXEL_STRIP }}
                                        aria-hidden
                                    />
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
