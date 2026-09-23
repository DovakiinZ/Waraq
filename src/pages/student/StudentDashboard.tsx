/**
 * StudentDashboard — Rich, informative student dashboard
 *
 * Sections:
 * 1. Welcome + Continue Learning (hero card)
 * 2. My Subjects with progress bars
 * 3. Recent Lessons
 * 4. Progress Summary stats
 */

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useQueryHooks';
import { useMySubjects } from '@/hooks/useAcademyData';
import {
    BookOpen,
    Play,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    TrendingUp,
    BookMarked,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function StudentDashboard() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const { data: allProgress = [], isLoading: progressLoading } = useStudentProgress(profile?.id);
    const { data: allSubjects = [], isLoading: subjectsLoading } = useMySubjects(profile?.id, profile?.student_stage);

    const loading = progressLoading || subjectsLoading;
    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    const { continueItem, subjectProgress, recentLessons, stats } = useMemo(() => {
        const progressItems = Array.isArray(allProgress) ? (allProgress as any[]) : [];

        // Continue Learning — most recent incomplete
        const lastIncomplete = progressItems.find(
            (p: any) => !p.completed_at && p.progress_percent > 0 && p.lesson
        );
        const continueItem = lastIncomplete ? {
            progress: lastIncomplete,
            lesson: lastIncomplete.lesson,
            videoUrl: lastIncomplete.lesson?.video_url ||
                lastIncomplete.lesson?.full_video_url ||
                lastIncomplete.lesson?.preview_video_url,
        } : null;

        // Recent lessons (last 5 with lesson data)
        const recentLessons = progressItems
            .filter((p: any) => p.lesson)
            .slice(0, 5)
            .map((p: any) => ({ lesson: p.lesson, progress: p }));

        // Compute per-subject progress
        const completedIds = new Set(
            progressItems.filter((p: any) => p.completed_at).map((p: any) => p.lesson_id)
        );

        const spList = (Array.isArray(allSubjects) ? (allSubjects as any[]) : [])
            .map(s => {
                const lessonIds: string[] = (Array.isArray(s.lessons) ? (s.lessons as any[]) : []).map((l: any) => l.id);
                const total = lessonIds.length;
                const completed = lessonIds.filter((id: string) => completedIds.has(id)).length;
                return {
                    subject: { ...s, lessons: undefined },
                    totalLessons: total,
                    completedLessons: completed,
                    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
                };
            })
            .filter(s => s.totalLessons > 0);

        const completedCount = progressItems.filter((p: any) => p.completed_at).length;
        const inProgressCount = progressItems.filter((p: any) => !p.completed_at && p.progress_percent > 0).length;

        return {
            continueItem,
            subjectProgress: spList,
            recentLessons,
            stats: {
                completed: completedCount,
                inProgress: inProgressCount,
                totalSubjects: spList.length,
            },
        };
    }, [allProgress, allSubjects]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* ===== WELCOME + CONTINUE LEARNING ===== */}
            {continueItem ? (
                <section className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border border-primary/10 rounded-2xl overflow-hidden">
                    <div className="p-6 lg:p-8">
                        <p className="text-sm text-muted-foreground mb-1">
                            {t(`مرحباً ${profile?.full_name?.split(' ')[0] || ''}!`, `Hi ${profile?.full_name?.split(' ')[0] || ''}!`)}
                        </p>
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            {t('أكمل ما بدأته', 'Continue where you left off')}
                        </h2>

                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Thumbnail */}
                            {continueItem.videoUrl && (
                                <Link
                                    to={`/student/lesson/${continueItem.lesson.id}`}
                                    className="relative aspect-video sm:w-64 bg-black rounded-xl overflow-hidden flex-shrink-0 group"
                                >
                                    {getYoutubeId(continueItem.videoUrl) ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${getYoutubeId(continueItem.videoUrl)}/mqdefault.jpg`}
                                            alt=""
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                                            <Play className="w-10 h-10 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <Play className="w-5 h-5 text-primary-foreground fill-current ms-0.5" />
                                        </div>
                                    </div>
                                    {/* Progress bar at bottom */}
                                    <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${continueItem.progress.progress_percent}%` }}
                                        />
                                    </div>
                                </Link>
                            )}

                            {/* Info */}
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                <p className="text-xs text-muted-foreground mb-1">
                                    {t(
                                        continueItem.lesson.subject?.title_ar || '',
                                        continueItem.lesson.subject?.title_en || continueItem.lesson.subject?.title_ar || ''
                                    )}
                                    {' • '}
                                    {t(
                                        continueItem.lesson.subject?.stage?.title_ar || '',
                                        continueItem.lesson.subject?.stage?.title_en || ''
                                    )}
                                </p>
                                <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                                    {t(continueItem.lesson.title_ar, continueItem.lesson.title_en || continueItem.lesson.title_ar)}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {Math.floor(continueItem.progress.last_position_seconds / 60)} {t('دقيقة', 'min')}
                                    </span>
                                    <span>{continueItem.progress.progress_percent}% {t('مكتمل', 'done')}</span>
                                </div>
                                <Link to={`/student/lesson/${continueItem.lesson.id}`}>
                                    <Button size="lg" className="gap-2">
                                        <Play className="w-4 h-4 fill-current" />
                                        {t('متابعة المشاهدة', 'Resume')}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                /* Welcome banner for new students */
                <section className="bg-gradient-to-br from-primary/8 to-primary/2 rounded-2xl p-8 lg:p-12 text-center border border-primary/10">
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
                        {t(
                            `مرحباً ${profile?.full_name?.split(' ')[0] || ''} في ورق أكاديمي!`,
                            `Welcome ${profile?.full_name?.split(' ')[0] || ''} to Waraq Academy!`
                        )}
                    </h1>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        {t('ابدأ رحلتك التعليمية الآن باستعراض المواد المتاحة في المتجر', 'Start your learning journey by browsing available subjects in the marketplace')}
                    </p>
                    <Link to="/student/marketplace">
                        <Button size="lg" className="px-8">{t('تصفح المتجر', 'Browse Marketplace')}</Button>
                    </Link>
                </section>
            )}

            {/* ===== STATS SUMMARY ===== */}
            <section className="grid grid-cols-3 gap-4">
                <div className="bg-background border border-border rounded-xl p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center mb-2">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">{t('دروس مكتملة', 'Completed')}</p>
                </div>
                <div className="bg-background border border-border rounded-xl p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">{t('قيد التقدم', 'In Progress')}</p>
                </div>
                <div className="bg-background border border-border rounded-xl p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 mx-auto flex items-center justify-center mb-2">
                        <BookMarked className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalSubjects}</p>
                    <p className="text-xs text-muted-foreground">{t('مواد', 'Subjects')}</p>
                </div>
            </section>

            {/* ===== MY SUBJECTS (top 6) ===== */}
            {subjectProgress.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-foreground">{t('موادي', 'My Subjects')}</h2>
                        <Link to="/student/subjects" className="text-sm text-primary hover:underline flex items-center gap-1">
                            {t('عرض الكل', 'View All')}
                            <ChevronIcon className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjectProgress.slice(0, 6).map((sp: any) => {
                            const isComplete = sp.percent === 100;
                            return (
                                <Link
                                    key={sp.subject.id}
                                    to={`/student/subjects/${sp.subject.id}`}
                                    className="group bg-background border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate text-sm">
                                            {t(sp.subject.title_ar, sp.subject.title_en || sp.subject.title_ar)}
                                        </h3>
                                        {isComplete && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                    </div>
                                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-1.5">
                                        <div
                                            className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                                            style={{ width: `${sp.percent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>{sp.completedLessons}/{sp.totalLessons} {t('درس', 'lessons')}</span>
                                        <span className="font-medium">{sp.percent}%</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ===== RECENT LESSONS ===== */}
            {recentLessons.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-foreground mb-4">{t('آخر الدروس', 'Recent Lessons')}</h2>
                    <div className="space-y-2">
                        {recentLessons.map(({ lesson, progress }: any) => {
                            const isCompleted = !!progress.completed_at;
                            return (
                                <Link
                                    key={lesson.id}
                                    to={`/student/lesson/${lesson.id}`}
                                    className="flex items-center gap-4 p-3 bg-background border border-border rounded-lg hover:border-primary/40 transition-colors group"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                                        {isCompleted ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                                                <Play className="w-2.5 h-2.5 text-primary fill-current ms-px" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                            {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {t(lesson.subject?.title_ar || '', lesson.subject?.title_en || '')}
                                        </p>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex-shrink-0">
                                        {isCompleted ? (
                                            <span className="text-green-600">{t('مكتمل', 'Done')}</span>
                                        ) : (
                                            <span>{progress.progress_percent}%</span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
