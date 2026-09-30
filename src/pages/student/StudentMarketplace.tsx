/**
 * StudentMarketplace — Udemy-style course marketplace
 * Browse tab: cover image cards with stats, price, enroll
 * Orders tab: track purchase status
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    ShoppingCart,
    Store,
    Package,
    BookOpen,
    User,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Search,
    Trash2,
    GraduationCap,
    Play,
    Star,
} from 'lucide-react';

type Tab = 'browse' | 'orders';

// Gradient placeholders when no cover image
const GRADIENTS = [
    'from-brand-green/80 to-brand-deep/80',
    'from-emerald-600/80 to-teal-900/80',
    'from-amber-600/80 to-orange-900/80',
    'from-rose-600/80 to-pink-900/80',
    'from-cyan-600/80 to-blue-900/80',
    'from-fuchsia-600/80 to-purple-900/80',
];

export default function StudentMarketplace() {
    const { t, language, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();
    // 'browse' is also where the floating cart bar lives, which is where the
    // header cart button sends people.
    const [activeTab, setActiveTab] = useState<Tab>('browse');
    const [searchQuery, setSearchQuery] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');

    // The cart lives in CartContext now, so it survives leaving this page,
    // signing in, and a reload — and the header button can show its count.
    const { items: cart, add, remove, has: isInCart, clear: clearCart } = useCart();

    const addToCart = useCallback((subjectId: string) => {
        add(subjectId);
        toast.success(t('تمت الإضافة للسلة', 'Added to cart'));
    }, [add, t]);

    const removeFromCart = useCallback((subjectId: string) => remove(subjectId), [remove]);

    // ── Helpers ──────────────────────────────────
    const formatPrice = useCallback((amount?: number | null, currency?: string | null) => {
        if (!amount || amount === 0) return t('مجاني', 'Free');
        return `${amount.toLocaleString()} ${currency || 'SYP'}`;
    }, [t]);

    const getStatusConfig = useCallback((status: string) => {
        switch (status) {
            case 'pending_payment': return { label: t('بانتظار الدفع', 'Pending Payment'), color: 'bg-amber-500/10 text-amber-500', icon: Clock };
            case 'paid': return { label: t('تم الدفع', 'Paid'), color: 'bg-green-500/10 text-green-500', icon: CheckCircle };
            case 'rejected': return { label: t('مرفوض', 'Rejected'), color: 'bg-red-500/10 text-red-500', icon: XCircle };
            case 'cancelled': return { label: t('ملغي', 'Cancelled'), color: 'bg-gray-500/10 text-gray-400', icon: XCircle };
            default: return { label: status, color: 'bg-gray-500/10 text-gray-400', icon: Clock };
        }
    }, [t]);

    // ── Data: Marketplace subjects ───────────────
    const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
        queryKey: ['marketplace', 'subjects', profile?.student_stage],
        queryFn: async () => {
            let stageId: string | null = null;
            if (profile?.student_stage) {
                const { data: stageRow } = await supabase.from('stages').select('id').eq('slug', profile.student_stage).eq('is_active', true).maybeSingle();
                stageId = stageRow?.id || null;
            }

            let query = supabase.from('subjects').select('id, title_ar, title_en, description_ar, description_en, stage_id, teacher_id, cover_image_url, is_paid, price_amount, price_currency, sort_order, is_active, stage:stages(id, title_ar, title_en, slug)').eq('is_active', true);
            if (stageId) query = query.eq('stage_id', stageId);

            const { data: subjectsData, error } = await query.order('sort_order', { ascending: true });
            if (error) throw error;

            const teacherIds = [...new Set((subjectsData || []).map(s => s.teacher_id).filter(Boolean))];
            const teacherMap = new Map();
            if (teacherIds.length > 0) {
                const { data: teachers } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', teacherIds);
                (teachers || []).forEach(t => teacherMap.set(t.id, t));
            }

            const subjectIds = (subjectsData || []).map(s => s.id);
            const lessonCountMap = new Map();
            if (subjectIds.length > 0) {
                const { data: lessons } = await supabase.from('lessons').select('subject_id, duration_minutes').in('subject_id', subjectIds).eq('is_published', true);
                (lessons || []).forEach(l => {
                    const prev = lessonCountMap.get(l.subject_id) || { count: 0, duration: 0 };
                    lessonCountMap.set(l.subject_id, { count: prev.count + 1, duration: prev.duration + (l.duration_minutes || 0) });
                });
            }

            // Ratings: aggregate lesson ratings per subject
            const ratingMap = new Map<string, { avg: number; count: number }>();
            if (subjectIds.length > 0) {
                const lessonSubjectMap = new Map<string, string>();
                const { data: subLessons } = await supabase.from('lessons').select('id, subject_id').in('subject_id', subjectIds).eq('is_published', true);
                const lessonIds = (subLessons || []).map(l => { lessonSubjectMap.set(l.id, l.subject_id); return l.id; });

                const grouped = new Map<string, number[]>();
                if (lessonIds.length > 0) {
                    const { data: lessonRatings } = await supabase.from('ratings').select('entity_id, stars').eq('entity_type', 'lesson').in('entity_id', lessonIds);
                    (lessonRatings || []).forEach(r => { const sid = lessonSubjectMap.get(r.entity_id); if (sid) { const a = grouped.get(sid) || []; a.push(r.stars); grouped.set(sid, a); } });
                }
                const { data: subjectRatings } = await supabase.from('ratings').select('entity_id, stars').eq('entity_type', 'subject').in('entity_id', subjectIds);
                (subjectRatings || []).forEach(r => { const a = grouped.get(r.entity_id) || []; a.push(r.stars); grouped.set(r.entity_id, a); });
                grouped.forEach((stars, id) => { ratingMap.set(id, { avg: Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10, count: stars.length }); });
            }

            return (subjectsData || []).map(s => ({
                ...s,
                teacher: s.teacher_id ? teacherMap.get(s.teacher_id) : null,
                lesson_count: lessonCountMap.get(s.id)?.count || 0,
                total_duration: lessonCountMap.get(s.id)?.duration || 0,
                avg_rating: ratingMap.get(s.id)?.avg || 0,
                rating_count: ratingMap.get(s.id)?.count || 0,
            }));
        },
        enabled: !!profile?.id,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });

    // ── Data: Orders ─────────────────────────────
    const { data: myOrders = [], isLoading: ordersLoading } = useQuery({
        queryKey: ['orders', 'student', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('orders').select('*, subject:subjects(id, title_ar, title_en, cover_image_url, stage:stages(title_ar, title_en))').eq('student_id', profile!.id).order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.id,
        staleTime: STALE_TIMES.DYNAMIC,
    });

    // ── Data: Access ─────────────────────────────
    const { data: myAccessibleSubjectIds = [] } = useQuery({
        queryKey: ['student-subjects', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('student_subjects').select('subject_id').eq('student_id', profile!.id).eq('status', 'active');
            if (error) throw error;
            return (data || []).map(d => d.subject_id);
        },
        enabled: !!profile?.id,
    });

    const myAccessibleSubjects = useMemo(() => new Set(Array.isArray(myAccessibleSubjectIds) ? myAccessibleSubjectIds : []), [myAccessibleSubjectIds]);

    const orderedSubjectIds = useMemo(() => {
        const arr = Array.isArray(myOrders) ? myOrders : [];
        return new Set(arr.filter((o: any) => o.status === 'pending_payment' || o.status === 'paid').map((o: any) => o.subject_id));
    }, [myOrders]);

    // ── Stage filter tabs ────────────────────────
    const stageOptions = useMemo(() => {
        const stageMap = new Map<string, { id: string; title_ar: string; title_en: string | null; slug: string }>();
        subjects.forEach((s: any) => {
            if (s.stage && !stageMap.has(s.stage.id)) stageMap.set(s.stage.id, s.stage);
        });
        return Array.from(stageMap.values());
    }, [subjects]);

    // ── Filtered subjects ────────────────────────
    const filteredSubjects = useMemo(() => {
        let list = subjects.filter((s: any) => !myAccessibleSubjects.has(s.id) && !orderedSubjectIds.has(s.id));
        if (stageFilter !== 'all') {
            list = list.filter((s: any) => s.stage?.id === stageFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter((s: any) =>
                s.title_ar?.toLowerCase().includes(q) ||
                s.title_en?.toLowerCase().includes(q) ||
                s.teacher?.full_name?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [subjects, myAccessibleSubjects, orderedSubjectIds, searchQuery, stageFilter]);

    // ── Cart total ───────────────────────────────
    const cartTotal = useMemo(() => subjects.filter((s: any) => cart.includes(s.id)).reduce((sum: number, s: any) => sum + (s.price_amount || 0), 0), [subjects, cart]);
    const cartCurrency = useMemo(() => { const c = subjects.find((s: any) => cart.includes(s.id)); return c?.price_currency || 'SYP'; }, [subjects, cart]);

    // ── Render ───────────────────────────────────
    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Store className="h-6 w-6 text-primary" />
                    {t('المتجر', 'Marketplace')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {t('اكتشف المواد الدراسية واشترك فيها', 'Discover courses and enroll')}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-6 w-fit">
                <button
                    className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'browse' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('browse')}
                >
                    <Store className="h-4 w-4 inline-block me-1.5 -mt-0.5" />
                    {t('تصفح', 'Browse')}
                </button>
                <button
                    className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'orders' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('orders')}
                >
                    <Package className="h-4 w-4 inline-block me-1.5 -mt-0.5" />
                    {t('طلباتي', 'My Orders')}
                    {myOrders.length > 0 && <span className="ms-1.5 bg-primary/20 text-primary text-xs px-1.5 rounded-full">{myOrders.length}</span>}
                </button>
            </div>

            {/* ── BROWSE TAB ──────────────────────── */}
            {activeTab === 'browse' && (
                <>
                    {/* Search + Stage Filters */}
                    <div className="space-y-4 mb-6">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('ابحث عن مادة أو معلم...', 'Search course or teacher...')}
                                className="w-full ps-9 pe-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                            />
                        </div>

                        {/* Stage filter pills */}
                        {stageOptions.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                <button
                                    onClick={() => setStageFilter('all')}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${stageFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                >
                                    {t('الكل', 'All')}
                                </button>
                                {stageOptions.map(stage => (
                                    <button
                                        key={stage.id}
                                        onClick={() => setStageFilter(stage.id)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${stageFilter === stage.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                    >
                                        {language === 'ar' ? stage.title_ar : stage.title_en || stage.title_ar}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Results count */}
                    {!subjectsLoading && (
                        <p className="text-sm text-muted-foreground mb-4">
                            {t(`${filteredSubjects.length} مادة متاحة`, `${filteredSubjects.length} courses available`)}
                        </p>
                    )}

                    {/* Loading */}
                    {subjectsLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : filteredSubjects.length === 0 ? (
                        <div className="text-center py-20">
                            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-muted-foreground">
                                {searchQuery ? t('لا توجد نتائج', 'No results found') : t('لا توجد مواد متاحة حالياً', 'No courses available yet')}
                            </p>
                        </div>
                    ) : (
                        /* ── COURSE CARDS GRID ── */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredSubjects.map((subject: any, idx: number) => {
                                const inCart = isInCart(subject.id);
                                const isFree = !subject.price_amount || subject.price_amount === 0;
                                const gradient = GRADIENTS[idx % GRADIENTS.length];
                                const hasCover = !!subject.cover_image_url;

                                return (
                                    <div key={subject.id} className="group bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                                        {/* Cover Image / Gradient */}
                                        <Link to={`/student/course/${subject.id}`} className="block relative aspect-[16/9] overflow-hidden">
                                            {hasCover ? (
                                                <img
                                                    src={subject.cover_image_url}
                                                    alt=""
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                                                    <BookOpen className="w-12 h-12 text-white/30" />
                                                </div>
                                            )}
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-white/0 group-hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                    <Play className="w-5 h-5 text-white ms-0.5" />
                                                </div>
                                            </div>
                                            {/* Stage badge */}
                                            {subject.stage && (
                                                <span className="absolute top-3 start-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-md">
                                                    {language === 'ar' ? subject.stage.title_ar : subject.stage.title_en || subject.stage.title_ar}
                                                </span>
                                            )}
                                        </Link>

                                        {/* Content */}
                                        <div className="p-4">
                                            {/* Title */}
                                            <Link to={`/student/course/${subject.id}`}>
                                                <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                    {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                                </h3>
                                            </Link>

                                            {/* Teacher */}
                                            {subject.teacher && (
                                                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                                                    <User className="w-3 h-3" />
                                                    {subject.teacher.full_name}
                                                </p>
                                            )}

                                            {/* Stats row */}
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" />
                                                    {subject.lesson_count}
                                                </span>
                                                {subject.total_duration > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {subject.total_duration >= 60
                                                            ? `${Math.floor(subject.total_duration / 60)}${t('س', 'h')} ${subject.total_duration % 60}${t('د', 'm')}`
                                                            : `${subject.total_duration}${t('د', 'm')}`
                                                        }
                                                    </span>
                                                )}
                                                {subject.avg_rating > 0 && (
                                                    <span className="flex items-center gap-1 text-amber-500">
                                                        <Star className="w-3 h-3 fill-amber-500" />
                                                        {subject.avg_rating}
                                                        <span className="text-muted-foreground">({subject.rating_count})</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Divider */}
                                            <div className="border-t border-border pt-3 flex items-center justify-between">
                                                {/* Price */}
                                                <span className={`text-lg font-bold ${isFree ? 'text-green-500' : 'text-foreground'}`}>
                                                    {formatPrice(subject.price_amount, subject.price_currency)}
                                                </span>

                                                {/* Action */}
                                                {inCart ? (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="text-xs h-8"
                                                        onClick={() => removeFromCart(subject.id)}
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5 me-1" />
                                                        {t('في السلة', 'In Cart')}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="text-xs h-8"
                                                        onClick={() => addToCart(subject.id)}
                                                    >
                                                        {t('سجّل الآن', 'Enrol now')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── ORDERS TAB ──────────────────────── */}
            {activeTab === 'orders' && (
                <>
                    {ordersLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : myOrders.length === 0 ? (
                        <div className="text-center py-20">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-muted-foreground">{t('لم تقم بأي طلبات بعد', "You haven't placed any orders yet")}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myOrders.map((order: any) => {
                                const status = getStatusConfig(order.status);
                                const StatusIcon = status.icon;
                                return (
                                    <div key={order.id} className="bg-background border border-border rounded-xl p-4 flex items-center gap-4">
                                        {/* Mini cover */}
                                        <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                            {order.subject?.cover_image_url ? (
                                                <img src={order.subject.cover_image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                                                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm truncate">
                                                {order.subject ? t(order.subject.title_ar, order.subject.title_en || order.subject.title_ar) : t('مادة محذوفة', 'Deleted')}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-sm font-semibold">{formatPrice(order.amount, order.currency)}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(order.created_at).toLocaleDateString(direction === 'rtl' ? 'ar-SY' : 'en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${status.color}`}>
                                            <StatusIcon className="h-3.5 w-3.5" />
                                            {status.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── FLOATING CART BAR ───────────────── */}
            {cart.length > 0 && activeTab === 'browse' && (
                <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 shadow-2xl z-50">
                    <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                                <span className="absolute -top-1.5 -end-1.5 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                                    {cart.length}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold">{cartTotal.toLocaleString()} {cartCurrency}</span>
                                <span className="text-muted-foreground ms-1.5">({cart.length} {t('مادة', 'items')})</span>
                            </div>
                            <button onClick={clearCart} className="text-muted-foreground hover:text-destructive transition-colors p-1" title={t('إفراغ السلة', 'Clear cart')}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <Button asChild size="sm">
                            <Link to="/student/checkout">{t('إتمام الشراء', 'Checkout')}</Link>
                        </Button>
                    </div>
                    <div className="pb-[env(safe-area-inset-bottom)]" />
                </div>
            )}
        </div>
    );
}
