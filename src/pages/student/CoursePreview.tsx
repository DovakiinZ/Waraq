/**
 * CoursePreview — Udemy-style course detail page
 * Shows full course info before purchase: description, curriculum, teacher, price.
 * Accessible from marketplace. If already enrolled, redirects to lessons.
 */

import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Play,
    BookOpen,
    Clock,
    User,
    Star,
    Lock,
    ShoppingCart,
    CheckCircle,
    ArrowLeft,
    ArrowRight,
    Loader2,
    GraduationCap,
    FileText,
    Eye,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const CART_KEY = 'ayman-academy-cart';

function loadCart(): string[] {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveCart(items: string[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function CoursePreview() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const { t, language, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [cart, setCart] = useState<string[]>(loadCart);

    useEffect(() => { saveCart(cart); }, [cart]);

    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    // ── Fetch course data ─────────────────────────
    const { data: course, isLoading } = useQuery({
        queryKey: ['course-preview', subjectId],
        queryFn: async () => {
            // Subject + stage
            const { data: subject, error } = await supabase
                .from('subjects')
                .select('*, stage:stages(id, title_ar, title_en, slug)')
                .eq('id', subjectId!)
                .single();
            if (error) throw error;

            // Teacher profile
            let teacher = null;
            if (subject.teacher_id) {
                const { data: t } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, bio_ar, bio_en')
                    .eq('id', subject.teacher_id)
                    .single();
                teacher = t;
            }

            // Curriculum: titles + metadata only, via the public RPC (migration
            // 109). This page is shown to people who have NOT bought the course,
            // so it must not be able to fetch `video_url` — the RPC does not
            // return it. `preview_video_url` is returned; it is the trailer.
            const { data: lessons } = await supabase
                .rpc('get_public_curriculum', { p_subject_id: subjectId! });

            // Aggregate ratings: lesson ratings for this subject + direct subject ratings
            let avgRating = 0;
            let ratingCount = 0;
            const allStars: number[] = [];
            // Lesson ratings
            const lessonIds = (lessons || []).map(l => l.id);
            if (lessonIds.length > 0) {
                const { data: lessonRatings } = await supabase
                    .from('ratings')
                    .select('stars')
                    .eq('entity_type', 'lesson')
                    .in('entity_id', lessonIds);
                (lessonRatings || []).forEach(r => allStars.push(r.stars));
            }
            // Direct subject ratings
            const { data: subjectRatings } = await supabase
                .from('ratings')
                .select('stars')
                .eq('entity_type', 'subject')
                .eq('entity_id', subjectId!);
            (subjectRatings || []).forEach(r => allStars.push(r.stars));

            if (allStars.length > 0) {
                ratingCount = allStars.length;
                avgRating = Math.round((allStars.reduce((a, b) => a + b, 0) / allStars.length) * 10) / 10;
            }

            // Total duration
            const totalMinutes = (lessons || []).reduce((sum, l) => {
                if (l.duration_minutes) return sum + l.duration_minutes;
                if (l.duration_seconds) return sum + Math.floor(l.duration_seconds / 60);
                return sum;
            }, 0);

            return {
                ...subject,
                teacher,
                lessons: lessons || [],
                avgRating,
                ratingCount,
                totalMinutes,
            };
        },
        enabled: !!subjectId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });

    // ── Check enrollment status ───────────────────
    const { data: enrollmentStatus } = useQuery({
        queryKey: ['enrollment-status', profile?.id, subjectId],
        queryFn: async () => {
            // Check student_subjects
            const { data: access } = await supabase
                .from('student_subjects')
                .select('id')
                .eq('student_id', profile!.id)
                .eq('subject_id', subjectId!)
                .eq('status', 'active')
                .maybeSingle();

            if (access) return 'enrolled' as const;

            // Check pending order
            const { data: order } = await supabase
                .from('orders')
                .select('id, status')
                .eq('student_id', profile!.id)
                .eq('subject_id', subjectId!)
                .in('status', ['pending_payment', 'paid'])
                .maybeSingle();

            if (order?.status === 'paid') return 'enrolled' as const;
            if (order?.status === 'pending_payment') return 'pending' as const;

            return 'not_enrolled' as const;
        },
        enabled: !!profile?.id && !!subjectId,
        staleTime: STALE_TIMES.DYNAMIC,
    });

    // ── Cart actions ──────────────────────────────
    const inCart = cart.includes(subjectId || '');

    const addToCart = useCallback(() => {
        if (!subjectId) return;
        setCart(prev => {
            if (prev.includes(subjectId)) return prev;
            return [...prev, subjectId];
        });
        toast.success(t('تمت الإضافة للسلة', 'Added to cart'));
    }, [subjectId, t]);

    const removeFromCart = useCallback(() => {
        if (!subjectId) return;
        setCart(prev => prev.filter(id => id !== subjectId));
    }, [subjectId]);

    // ── Helpers ───────────────────────────────────
    const formatPrice = (amount?: number | null, currency?: string | null) => {
        if (!amount || amount === 0) return t('مجاني', 'Free');
        return `${amount.toLocaleString()} ${currency || 'SYP'}`;
    };

    const isFree = !course?.price_amount || course.price_amount === 0;
    const freePreviewLessons = useMemo(
        () => (course?.lessons || []).filter((l: any) => l.is_free_preview || !l.is_paid),
        [course?.lessons],
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">{t('المادة غير موجودة', 'Subject not found')}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    <BackIcon className="w-4 h-4 me-2" />{t('رجوع', 'Go back')}
                </Button>
            </div>
        );
    }

    return (
        <div className="pb-24">
            {/* ── Hero Section ─────────────────────── */}
            <section className="text-white rounded-2xl p-6 lg:p-10 mb-8 relative overflow-hidden">
                {/* Background */}
                {course.cover_image_url ? (
                    <>
                        <img src={course.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-primary/30" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20" />
                )}
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="relative z-10 flex items-center gap-1 text-white/70 hover:text-white text-sm mb-6 transition-colors"
                >
                    <BackIcon className="w-4 h-4" />
                    {t('عودة', 'Back')}
                </button>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div className="flex-1 min-w-0">
                        {/* Stage badge */}
                        {course.stage && (
                            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/90 text-xs px-3 py-1 rounded-full mb-4">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {t(course.stage.title_ar, course.stage.title_en || course.stage.title_ar)}
                            </span>
                        )}

                        {/* Title */}
                        <h1 className="text-2xl lg:text-3xl font-bold mb-3 leading-tight">
                            {t(course.title_ar, course.title_en || course.title_ar)}
                        </h1>

                        {/* Description */}
                        {(course.description_ar || course.description_en) && (
                            <p className="text-white/80 text-sm lg:text-base mb-4 line-clamp-3 max-w-2xl">
                                {t(course.description_ar || '', course.description_en || course.description_ar || '')}
                            </p>
                        )}

                        {/* Stats row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/70">
                            {course.avgRating > 0 && (
                                <span className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    <span className="text-yellow-400 font-semibold">{course.avgRating}</span>
                                    <span>({course.ratingCount} {t('تقييم', 'ratings')})</span>
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {course.lessons.length} {t('درس', 'lessons')}
                            </span>
                            {course.totalMinutes > 0 && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {course.totalMinutes} {t('دقيقة', 'min')}
                                </span>
                            )}
                        </div>

                        {/* Teacher */}
                        {course.teacher && (
                            <div className="flex items-center gap-2.5 mt-4">
                                {course.teacher.avatar_url ? (
                                    <img src={course.teacher.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <User className="w-4 h-4 text-white/70" />
                                    </div>
                                )}
                                <span className="text-sm text-white/90">{course.teacher.full_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Price + CTA card */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 lg:min-w-[260px] flex-shrink-0 border border-white/10">
                        <p className={`text-3xl font-bold mb-4 ${isFree ? 'text-green-400' : 'text-white'}`}>
                            {formatPrice(course.price_amount, course.price_currency)}
                        </p>

                        {enrollmentStatus === 'enrolled' ? (
                            <Button asChild className="w-full gap-2" size="lg">
                                <Link to={`/student/subjects/${subjectId}`}>
                                    <Play className="w-4 h-4 fill-current" />
                                    {t('الذهاب للمادة', 'Go to Course')}
                                </Link>
                            </Button>
                        ) : enrollmentStatus === 'pending' ? (
                            <Button disabled className="w-full gap-2" size="lg" variant="secondary">
                                <Clock className="w-4 h-4" />
                                {t('بانتظار تأكيد الدفع', 'Payment Pending')}
                            </Button>
                        ) : inCart ? (
                            <div className="space-y-2">
                                <Button asChild className="w-full gap-2" size="lg">
                                    <Link to="/student/checkout">
                                        <ShoppingCart className="w-4 h-4" />
                                        {t('إتمام الشراء', 'Go to Checkout')}
                                    </Link>
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full text-white/70 hover:text-white" onClick={removeFromCart}>
                                    {t('إزالة من السلة', 'Remove from Cart')}
                                </Button>
                            </div>
                        ) : (
                            <Button className="w-full gap-2" size="lg" onClick={addToCart}>
                                <ShoppingCart className="w-4 h-4" />
                                {isFree ? t('التسجيل مجاناً', 'Enroll for Free') : t('إضافة للسلة', 'Add to Cart')}
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {/* ── What You'll Learn ────────────────── */}
            {(course.teaser_ar || course.teaser_en || course.description_ar) && (
                <section className="bg-background border border-border rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        {t('ماذا ستتعلم', 'What You\'ll Learn')}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {t(
                            course.teaser_ar || course.description_ar || '',
                            course.teaser_en || course.description_en || course.teaser_ar || course.description_ar || '',
                        )}
                    </p>
                </section>
            )}

            {/* ── Course Content / Curriculum ──────── */}
            <section className="bg-background border border-border rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {t('محتوى المادة', 'Course Content')}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        {course.lessons.length} {t('درس', 'lessons')}
                        {course.totalMinutes > 0 && ` · ${course.totalMinutes} ${t('دقيقة', 'min')}`}
                    </span>
                </div>

                <div className="space-y-1">
                    {course.lessons.map((lesson: any, idx: number) => {
                        const isFreeLesson = lesson.is_free_preview || !lesson.is_paid;
                        const duration = lesson.duration_minutes || (lesson.duration_seconds ? Math.floor(lesson.duration_seconds / 60) : null);

                        return (
                            <div
                                key={lesson.id}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                    isFreeLesson
                                        ? 'hover:bg-primary/5 cursor-pointer'
                                        : 'opacity-75'
                                }`}
                                onClick={() => {
                                    if (isFreeLesson) {
                                        if (enrollmentStatus === 'enrolled') {
                                            navigate(`/student/lesson/${lesson.id}`);
                                        } else {
                                            navigate(`/lesson/${lesson.id}`);
                                        }
                                    }
                                }}
                            >
                                {/* Number / icon */}
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                    {isFreeLesson ? (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Title + meta */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">
                                            {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                        </span>
                                        {isFreeLesson && (
                                            <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
                                                <Eye className="w-3 h-3" />
                                                {t('معاينة مجانية', 'Free Preview')}
                                            </Badge>
                                        )}
                                    </div>
                                    {lesson.summary_ar && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                            {t(lesson.summary_ar, lesson.summary_en || lesson.summary_ar)}
                                        </p>
                                    )}
                                </div>

                                {/* Duration */}
                                {duration && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {duration} {t('د', 'm')}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {course.lessons.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        {t('سيتم إضافة الدروس قريباً', 'Lessons will be added soon')}
                    </p>
                )}
            </section>

            {/* ── About the Teacher ────────────────── */}
            {course.teacher && (
                <section className="bg-background border border-border rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        {t('عن المعلم', 'About the Teacher')}
                    </h2>
                    <div className="flex items-start gap-4">
                        {course.teacher.avatar_url ? (
                            <img src={course.teacher.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-7 h-7 text-primary" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h3 className="font-semibold text-base">{course.teacher.full_name}</h3>
                            {course.avgRating > 0 && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                    <span>{course.avgRating}</span>
                                    <span>({course.ratingCount} {t('تقييم', 'ratings')})</span>
                                </div>
                            )}
                            {(course.teacher.bio_ar || course.teacher.bio_en) && (
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                    {t(course.teacher.bio_ar || '', course.teacher.bio_en || course.teacher.bio_ar || '')}
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Sticky bottom CTA (mobile) ──────── */}
            {enrollmentStatus !== 'enrolled' && (
                <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border p-4 shadow-lg z-50 lg:hidden">
                    <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
                        <p className={`text-xl font-bold ${isFree ? 'text-green-600' : ''}`}>
                            {formatPrice(course.price_amount, course.price_currency)}
                        </p>
                        {enrollmentStatus === 'pending' ? (
                            <Button disabled size="sm" variant="secondary">
                                <Clock className="w-4 h-4 me-1.5" />
                                {t('بانتظار الدفع', 'Pending')}
                            </Button>
                        ) : inCart ? (
                            <Button asChild size="sm">
                                <Link to="/student/checkout">
                                    {t('إتمام الشراء', 'Checkout')}
                                </Link>
                            </Button>
                        ) : (
                            <Button size="sm" onClick={addToCart}>
                                <ShoppingCart className="w-4 h-4 me-1.5" />
                                {isFree ? t('سجل مجاناً', 'Enroll Free') : t('أضف للسلة', 'Add to Cart')}
                            </Button>
                        )}
                    </div>
                    <div className="pb-[env(safe-area-inset-bottom)]" />
                </div>
            )}
        </div>
    );
}
