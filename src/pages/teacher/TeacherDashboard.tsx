import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    BookOpen, Video, Plus, BookMarked, ClipboardList, Loader2,
    Users, Award, MessageSquare, Megaphone, ChevronRight, ChevronLeft,
    AlertTriangle, CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function useTeacherDashboardData(userId: string | undefined) {
    return useQuery({
        queryKey: ['teacher', userId, 'dashboard'],
        queryFn: async () => {
            if (!userId) return null;

            // Lessons
            const { data: lessons } = await supabase
                .from('lessons')
                .select('id, subject_id, is_published')
                .eq('created_by', userId);

            const allLessons = lessons || [];
            const subjectIds = [...new Set(allLessons.map(l => l.subject_id).filter(Boolean))];
            const publishedCount = allLessons.filter(l => l.is_published).length;

            // Students with progress in this teacher's lessons (distinct, not row count)
            let studentCount = 0;
            if (allLessons.length > 0) {
                const { data: progressRows } = await supabase
                    .from('lesson_progress')
                    .select('user_id')
                    .in('lesson_id', allLessons.map(l => l.id))
                    .not('user_id', 'eq', userId);
                studentCount = new Set((progressRows || []).map(p => p.user_id)).size;
            }

            // Certificates issued
            let certsIssued = 0;
            if (subjectIds.length > 0) {
                const { count } = await supabase
                    .from('certificates')
                    .select('id', { count: 'exact', head: true })
                    .in('subject_id', subjectIds)
                    .eq('status', 'issued');
                certsIssued = count || 0;
            }

            // Quiz count
            let quizCount = 0;
            if (allLessons.length > 0) {
                const { count } = await supabase
                    .from('quizzes')
                    .select('id', { count: 'exact', head: true })
                    .in('lesson_id', allLessons.map(l => l.id));
                quizCount = count || 0;
            }

            // Recent announcements
            const { data: announcements } = await supabase
                .from('announcements')
                .select('id, title_ar, title_en, created_at')
                .eq('teacher_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(3);

            return {
                subjects: subjectIds.length,
                lessons: allLessons.length,
                publishedLessons: publishedCount,
                quizzes: quizCount,
                students: studentCount,
                certsIssued,
                announcements: announcements || [],
            };
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000,
    });
}

export default function TeacherDashboard() {
    const { t, direction } = useLanguage();
    const { profile, user } = useAuth();
    const { data: stats, isLoading: loading } = useTeacherDashboardData(user?.id);
    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    const statCards = [
        { label: { ar: 'موادي', en: 'My Subjects' }, value: stats?.subjects || 0, icon: BookMarked, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950' },
        { label: { ar: 'طلابي', en: 'My Students' }, value: stats?.students || 0, icon: Users, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950' },
        { label: { ar: 'دروس منشورة', en: 'Published' }, value: stats?.publishedLessons || 0, icon: Video, color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950' },
        { label: { ar: 'شهادات صادرة', en: 'Certs Issued' }, value: stats?.certsIssued || 0, icon: Award, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950' },
        { label: { ar: 'الاختبارات', en: 'Quizzes' }, value: stats?.quizzes || 0, icon: ClipboardList, color: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950' },
        { label: { ar: 'إجمالي الدروس', en: 'Total Lessons' }, value: stats?.lessons || 0, icon: BookOpen, color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950' },
    ];

    const quickActions = [
        { label: { ar: 'إنشاء درس جديد', en: 'Create New Lesson' }, to: '/teacher/lessons', icon: Plus },
        { label: { ar: 'عرض موادي', en: 'View My Subjects' }, to: '/teacher/subjects', icon: BookMarked },
        { label: { ar: 'الإعلانات', en: 'Announcements' }, to: '/teacher/announcements', icon: Megaphone },
        { label: { ar: 'إدارة الشهادات', en: 'Manage Certificates' }, to: '/teacher/certificates', icon: Award },
        { label: { ar: 'الرسائل', en: 'Messages' }, to: '/teacher/messages', icon: MessageSquare },
    ];

    const isPending = profile?.is_active === false;
    const p = profile as any;
    const missingShamCash = !p?.shamcash_account_name || !p?.shamcash_account_number;

    return (
        <div className="space-y-8">
            {/* Pending Approval Banner */}
            {isPending && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                            {t('حسابك قيد المراجعة', 'Your Account is Under Review')}
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            {t(
                                'طلبك قيد المراجعة من قبل الإدارة. يمكنك تعديل ملفك الشخصي أثناء الانتظار. ستتمكن من نشر المواد والدروس بعد الموافقة على طلبك.',
                                'Your application is being reviewed by the admin team. You can edit your profile while waiting. You\'ll be able to publish subjects and lessons once approved.'
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Missing Sham Cash Warning */}
            {!isPending && missingShamCash && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                            {t('بيانات شام كاش مطلوبة', 'Sham Cash Details Required')}
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            {t(
                                'يرجى إضافة بيانات حساب شام كاش الخاص بك لتتمكن من استلام المدفوعات من الطلاب.',
                                'Please add your Sham Cash account details to receive student payments.'
                            )}
                        </p>
                        <Link to="/teacher/profile">
                            <Button size="sm" variant="outline" className="mt-3 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30">
                                <CreditCard className="w-4 h-4" />
                                {t('إضافة بيانات شام كاش', 'Add Sham Cash Details')}
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Welcome */}
            <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-background rounded-2xl p-6 border border-primary/10">
                <h1 className="text-2xl font-bold text-foreground">
                    {t('مرحباً', 'Welcome back')}, {profile?.full_name?.split(' ')[0] || profile?.email} 👋
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('لوحة تحكم المعلم — نظرة عامة على نشاطك', 'Teacher Dashboard — Overview of your activity')}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map((stat) => (
                    <div key={stat.label.en} className="bg-background rounded-xl border border-border p-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value}
                                </p>
                                <p className="text-xs text-muted-foreground">{t(stat.label.ar, stat.label.en)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-background rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        {t('إجراءات سريعة', 'Quick Actions')}
                    </h2>
                    <div className="space-y-2">
                        {quickActions.map((action) => (
                            <Link
                                key={action.to}
                                to={action.to}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors group"
                            >
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <action.icon className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-foreground flex-1">
                                    {t(action.label.ar, action.label.en)}
                                </span>
                                <ChevronIcon className="w-4 h-4 text-muted-foreground/50" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Announcements */}
                <div className="bg-background rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-primary" />
                            {t('إعلاناتي الأخيرة', 'Recent Announcements')}
                        </h2>
                        <Link to="/teacher/announcements" className="text-sm text-primary hover:underline">
                            {t('عرض الكل', 'View All')}
                        </Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (stats?.announcements?.length ?? 0) === 0 ? (
                        <div className="text-center py-8">
                            <Megaphone className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                                {t('لا توجد إعلانات بعد', 'No announcements yet')}
                            </p>
                            <Button asChild variant="outline" size="sm" className="mt-3">
                                <Link to="/teacher/announcements">
                                    <Plus className="w-4 h-4 me-1" />
                                    {t('إنشاء إعلان', 'Create Announcement')}
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats?.announcements.map((ann: any) => (
                                <div key={ann.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground line-clamp-1">
                                            {t(ann.title_ar, ann.title_en || ann.title_ar)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(ann.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
