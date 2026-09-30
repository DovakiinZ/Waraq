import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { useLesson } from '@/hooks/useQueryHooks';
import { Lesson, Subject, LessonSection, LessonBlock } from '@/types/database';
import { Loader2, ChevronRight, ChevronLeft, FileText, Download, CheckCircle, BrainCircuit, Video as VideoIcon, Image as ImageIcon, Lightbulb, AlertTriangle, ArrowRight, ArrowLeft, Trophy, PartyPopper, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LessonNotes from '@/components/student/LessonNotes';
import LessonComments from '@/components/student/LessonComments';
import RatingWidget from '@/components/student/RatingWidget';
import CourseContentSidebar from '@/components/student/CourseContentSidebar';
import { LessonContentRenderer } from '@/components/shared/LessonContentRenderer';
import LessonSummaryCard from '@/components/student/LessonSummaryCard';
import { LessonLocked } from '@/components/shared/LessonLocked';
import { isLessonContentWithheld } from '@/lib/lessonAccess';
import { computeProgress } from '@/lib/progressModel';
import QuizPlayer from './QuizPlayer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

interface LessonWithDetails extends Lesson {
    subject: Subject;
    sections: LessonSection[];
    blocks: LessonBlock[];
}

export default function LessonPlayer() {
    const { id } = useParams();
    const { t, direction } = useLanguage();
    const { settings } = useSettings();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const { data: lessonData, isLoading: loading } = useLesson(id);
    const lesson = (lessonData?.lesson || null) as LessonWithDetails | null;
    const quizId = lessonData?.quizId || null;
    const nextLesson = lessonData?.nextLesson || null;

    const currentVideoUrl = useMemo(() => {
        if (!lesson) return null;
        const videoBlock = lesson.blocks?.find(b => b.type === 'video' && b.is_published !== false);
        return videoBlock?.url || lesson.video_url || lesson.full_video_url || lesson.preview_video_url || null;
    }, [lesson]);

    const [activeTab, setActiveTab] = useState('overview');
    const [showCongrats, setShowCongrats] = useState(false);
    const [completing, setCompleting] = useState(false);

    // Smart scroll-based progress tracking
    const [seenBlockIds, setSeenBlockIds] = useState<Set<string>>(new Set());
    const [scrollProgress, setScrollProgress] = useState(0);
    // Wall-clock seconds on this lesson. The progress model caps the reported
    // percentage by this, so scrolling to the bottom instantly no longer
    // completes a lesson. Reset per lesson, not per mount of a tab.
    const openedAtRef = useRef<number>(Date.now());
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    useEffect(() => {
        openedAtRef.current = Date.now();
        setElapsedSeconds(0);
        const id = setInterval(
            () => setElapsedSeconds(Math.floor((Date.now() - openedAtRef.current) / 1000)),
            5000,
        );
        return () => clearInterval(id);
    }, [lesson?.id]);

    // Use the custom hook for progress
    const { progress, updateProgress, isCompleted } = useLessonProgress(lesson?.id || '');

    // The time cap can release while the student sits still, so recompute on
    // each tick rather than only when a new block scrolls into view.
    useEffect(() => {
        if (!lesson) return;
        const publishedBlocks = lesson.blocks?.filter(b => b.is_published !== false) ?? [];
        if (publishedBlocks.length === 0) return;
        const { percent } = computeProgress({
            blocks: publishedBlocks,
            seenIds: seenBlockIds,
            elapsedSeconds,
            durationMinutes: lesson.duration_minutes,
        });
        setScrollProgress(prev => Math.max(prev, percent));
    }, [elapsedSeconds, seenBlockIds, lesson]);

    // Sync scroll progress to database (debounced)
    const progressSyncRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (scrollProgress <= 0 || isCompleted) return;

        // Debounce DB writes — only save every 3 seconds
        if (progressSyncRef.current) clearTimeout(progressSyncRef.current);
        progressSyncRef.current = setTimeout(() => {
            updateProgress(scrollProgress, 0);
        }, 3000);

        return () => {
            if (progressSyncRef.current) clearTimeout(progressSyncRef.current);
        };
    }, [scrollProgress, isCompleted]);

    // Called by LessonContentRenderer when a block comes into view
    const handleBlockSeen = useCallback((blockId: string) => {
        setSeenBlockIds(prev => {
            if (prev.has(blockId)) return prev;
            const next = new Set(prev);
            next.add(blockId);

            // Weighted by how much there is to read, and capped by how long the
            // student has actually been here. See lib/progressModel.ts.
            if (lesson) {
                const publishedBlocks = lesson.blocks.filter(b => b.is_published !== false);
                const { percent } = computeProgress({
                    blocks: publishedBlocks,
                    seenIds: next,
                    elapsedSeconds: Math.floor((Date.now() - openedAtRef.current) / 1000),
                    durationMinutes: lesson.duration_minutes,
                });
                // Monotonic: scrolling back up must never lower the bar.
                setScrollProgress(prevPercent => Math.max(prevPercent, percent));
            }
            return next;
        });
    }, [lesson]);

    // Manual "Mark Complete" — always works
    const handleMarkComplete = async () => {
        if (!lesson || !profile?.id || completing) return;
        setCompleting(true);
        try {
            await updateProgress(100, 0);
            setShowCongrats(true);
            toast.success(t('تم إكمال الدرس بنجاح! 🎉', 'Lesson completed successfully! 🎉'));
            setTimeout(() => setShowCongrats(false), 5000);
        } catch (err) {
            console.error('Failed to mark complete:', err);
            toast.error(t('فشل تحديث التقدم. حاول مرة أخرى.', 'Failed to update progress. Try again.'));
        } finally {
            setCompleting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    if (!lesson) return <div className="p-8 text-center">{t('الدرس غير موجود', 'Lesson not found')}</div>;

    const youtubeId = currentVideoUrl ? getYoutubeId(currentVideoUrl) : null;
    const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
    const NextIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    const publishedBlocks = lesson.blocks?.filter(b => b.is_published !== false) || [];
    const resources = publishedBlocks.filter(b => ['file', 'link'].includes(b.type)) || [];
    const totalBlocks = publishedBlocks.length;
    const displayProgress = isCompleted ? 100 : scrollProgress;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Congratulations Overlay */}
            {showCongrats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-background rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                            <Trophy className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">
                            {t('أحسنت! 🎉', 'Well Done! 🎉')}
                        </h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            {t('أكملت هذا الدرس بنجاح', 'You have completed this lesson')}
                        </p>
                        {nextLesson ? (
                            <Link to={`/student/lesson/${nextLesson.id}`}>
                                <Button className="gap-2 w-full">
                                    {t('الدرس التالي', 'Next Lesson')}
                                    <NextIcon className="w-4 h-4" />
                                </Button>
                            </Link>
                        ) : (
                            <Link to={`/student/subjects/${lesson.subject_id}`}>
                                <Button className="gap-2 w-full">
                                    {t('العودة للمادة', 'Back to Subject')}
                                </Button>
                            </Link>
                        )}
                        <button
                            onClick={() => setShowCongrats(false)}
                            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t('إغلاق', 'Close')}
                        </button>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div className="bg-background border-b border-border sticky top-0 z-20 px-4 h-14 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                    <Link to={`/student/subjects/${lesson.subject_id}`}>
                        <div className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                            <BackIcon className="w-5 h-5" />
                            <span className="text-sm font-medium ms-1 hidden sm:inline">{t('العودة', 'Back')}</span>
                        </div>
                    </Link>
                    <div className="h-6 w-px bg-border" />
                    {/* Breadcrumb */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5 hidden sm:flex">
                            <Link to="/student" className="hover:text-foreground">{t('الرئيسية', 'Home')}</Link>
                            <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                            <Link to={`/student/subjects/${lesson.subject_id}`} className="hover:text-foreground truncate max-w-[120px]">
                                {t(lesson.subject?.title_ar || '', lesson.subject?.title_en || '')}
                            </Link>
                        </div>
                        <h1 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
                            {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                        </h1>
                    </div>
                </div>

                {/* Progress + Mark Complete */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Progress indicator */}
                    {totalBlocks > 0 && !isCompleted && (
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${displayProgress}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{displayProgress}%</span>
                        </div>
                    )}

                    {isCompleted ? (
                        <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {t('مكتمل', 'Completed')}
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleMarkComplete}
                            disabled={completing}
                            className="text-xs gap-1.5"
                        >
                            {completing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">{t('إكمال الدرس', 'Mark Complete')}</span>
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-y-auto bg-background">
                    {/* Video Container (Legacy or Hero Video) */}
                    {youtubeId && (
                        <div className="w-full bg-black aspect-video lg:max-h-[70vh] flex items-center justify-center shrink-0">
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
                                title="Video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="border-b border-border sticky top-0 bg-background z-10 px-4">
                        <div className="flex gap-6 overflow-x-auto">
                            {['overview', 'quiz', 'qa', 'notes', 'reviews'].map((tab) => {
                                if (tab === 'quiz' && !quizId) return null;
                                if (tab === 'qa' && settings['ui.enable_comments'] === false) return null;
                                if (tab === 'reviews' && settings['ui.enable_ratings'] === false) return null;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {tab === 'quiz' && (
                                            <div className="flex items-center gap-1.5">
                                                <span>{t('الاختبار', 'Quiz')}</span>
                                                {!isCompleted && <span className="text-[10px] bg-secondary px-1.5 rounded text-muted-foreground">{t('مغلق', 'Locked')}</span>}
                                            </div>
                                        )}
                                        {tab === 'qa' && settings['ui.enable_comments'] !== false && t('الأسئلة والنقاش', 'Q&A')}
                                        {tab === 'notes' && t('ملاحظاتي', 'Notes')}
                                        {tab === 'reviews' && settings['ui.enable_ratings'] !== false && t('التقييمات', 'Reviews')}
                                        {tab === 'overview' && t('الدرس', 'Lesson')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* AI summary — renders only when an approved one exists */}
                                <LessonSummaryCard lessonId={lesson.id} />

                                {/* Blocks Content Renderer */}
                                {isLessonContentWithheld(lesson) ? (
                                    /* RLS (migration 109) withheld the content — show the
                                       paywall rather than an empty tab. */
                                    <LessonLocked
                                        subjectId={lesson.subject_id}
                                        subjectTitle={t(lesson.subject?.title_ar, lesson.subject?.title_en)}
                                    />
                                ) : (lesson.blocks && lesson.blocks.length > 0) || (lesson.sections && lesson.sections.length > 0) ? (
                                    <LessonContentRenderer lesson={lesson} onBlockSeen={handleBlockSeen} seenBlockIds={seenBlockIds} />
                                ) : (
                                    /* Legacy Description Fallback */
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">{t('حول هذا الدرس', 'About this lesson')}</h2>
                                        <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                                            <p className="whitespace-pre-wrap">
                                                {t(lesson.summary_ar || '', lesson.summary_en || lesson.summary_ar || '')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {quizId && (
                                    <div className="bg-secondary/20 border border-border rounded-lg p-6">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-full ${isCompleted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                <BrainCircuit className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg mb-1">{t('اختبار الدرس', 'Lesson Quiz')}</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {isCompleted
                                                        ? t('يمكنك الآن إجراء الاختبار لتقييم فهمك للدرس.', 'You can now take the quiz to assess your understanding.')
                                                        : t('أكمل مشاهدة الدرس لفتح الاختبار.', 'Complete watching the lesson to unlock the quiz.')}
                                                </p>
                                                <Button
                                                    onClick={() => setActiveTab('quiz')}
                                                    disabled={!isCompleted}
                                                    variant={isCompleted ? 'default' : 'outline'}
                                                >
                                                    {t('بدء الاختبار', 'Start Quiz')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Resources (Legacy) */}
                                {resources.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            {t('المرفقات', 'Resources')}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {resources.map(res => (
                                                <a
                                                    key={res.id}
                                                    href={res.url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center p-3 bg-secondary/10 border border-border rounded-md hover:border-primary transition-colors group"
                                                >
                                                    {res.type === 'file' ? (
                                                        <Download className="w-4 h-4 text-primary shrink-0" />
                                                    ) : (
                                                        <FileText className="w-4 h-4 text-primary shrink-0" />
                                                    )}
                                                    <span className="mx-3 text-sm truncate">{t(res.title_ar || '', res.title_en || res.title_ar || '')}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Auto-mark complete prompt at bottom */}
                                {totalBlocks > 0 && !isCompleted && scrollProgress >= 80 && (
                                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mx-auto flex items-center justify-center mb-3">
                                            <Eye className="w-6 h-6 text-green-600" />
                                        </div>
                                        <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">
                                            {t('قرأت معظم الدرس!', 'You\'ve read most of the lesson!')}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {t(`شاهدت ${seenBlockIds.size} من ${totalBlocks} عنصر`, `Viewed ${seenBlockIds.size} of ${totalBlocks} items`)}
                                        </p>
                                        <Button onClick={handleMarkComplete} disabled={completing} className="gap-2">
                                            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            {t('إكمال الدرس', 'Mark Complete')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'quiz' && quizId && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {isCompleted ? (
                                    <QuizPlayer quizId={quizId} lessonId={lesson.id} />
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                        <BrainCircuit className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">{t('الاختبار مغلق', 'Quiz Locked')}</h3>
                                        <p className="text-muted-foreground">{t('يجب إكمال الدرس لفتح الاختبار', 'You must complete the lesson to unlock the quiz')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'qa' && <LessonComments lessonId={lesson.id} />}
                        {activeTab === 'notes' && <LessonNotes lessonId={lesson.id} currentTime={0} />}
                        {activeTab === 'reviews' && <RatingWidget lessonId={lesson.id} title={t('تقييم الدرس', 'Rate this Lesson')} />}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-96 border-s border-border bg-background lg:h-full overflow-hidden flex flex-col shrink-0">
                    <CourseContentSidebar
                        subjectId={lesson.subject_id}
                        currentLessonId={lesson.id}
                        userId={profile!.id}
                    />
                </div>
            </div>

            {/* Sticky Next Lesson Bar */}
            {nextLesson && !showCongrats && (
                <div className="sticky bottom-0 z-20 bg-background border-t border-border px-4 py-3 flex items-center justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{t('الدرس التالي', 'Next Lesson')}</p>
                        <p className="text-sm font-medium text-foreground truncate">
                            {t(nextLesson.title_ar, nextLesson.title_en || nextLesson.title_ar)}
                        </p>
                    </div>
                    <Link to={`/student/lesson/${nextLesson.id}`}>
                        <Button size="sm" className="gap-1.5 flex-shrink-0">
                            {t('التالي', 'Next')}
                            <NextIcon className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}

// ============================================
// LESSON CONTENT RENDERER (block-aware, with IntersectionObserver)
// ============================================


