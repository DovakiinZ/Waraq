import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStage } from '@/hooks/useQueryHooks';
import { useMySubjects, useDiscoverSubjects } from '@/hooks/useAcademyData';
import { Subject } from '@/types/database';
import { BookOpen, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubjectWithLessons extends Subject {
    lessons_count?: number;
    entitlement_reason?: string;
    total_lessons?: number;
}

export default function StudentSubjects() {
    const { stageId } = useParams<{ stageId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();

    const { data: stage, isLoading: stageLoading } = useStage(stageId);
    const { data: mySubjects = [], isLoading: myLoading } = useMySubjects(profile?.id, profile?.student_stage);
    const { data: discoverSubjects = [], isLoading: discoverLoading } = useDiscoverSubjects(profile?.id);

    const loading = stageLoading || myLoading || discoverLoading;
    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;
    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    // Filter entitled subjects for this stage
    const entitledForStage = useMemo(() =>
        (mySubjects as any[]).filter(s => s.stage_id === stageId),
        [mySubjects, stageId]
    );

    // Filter locked subjects for this stage
    const lockedForStage = useMemo(() =>
        (discoverSubjects as any[]).filter(s => s.stage_id === stageId),
        [discoverSubjects, stageId]
    );

    // Subject icons
    const getSubjectIcon = (subject: SubjectWithLessons) => {
        const icons: Record<string, string> = {
            'arabic': '📝',
            'اللغة العربية': '📝',
            'math': '🔢',
            'الرياضيات': '🔢',
            'science': '🔬',
            'العلوم': '🔬',
            'english': '🇬🇧',
            'اللغة الإنجليزية': '🇬🇧',
            'physics': '⚛️',
            'الفيزياء': '⚛️',
            'chemistry': '🧪',
            'الكيمياء': '🧪',
            'biology': '🧬',
            'الأحياء': '🧬',
            'history': '📜',
            'التاريخ': '📜',
            'geography': '🌍',
            'الجغرافيا': '🌍',
            'pe': '⚽',
            'التربية البدنية': '⚽',
        };
        return icons[subject.title_en?.toLowerCase() || ''] || icons[subject.title_ar] || '📖';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!stage) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('المرحلة غير موجودة', 'Stage not found')}
                </h2>
                <Button variant="outline" onClick={() => navigate('/student/stages')}>
                    <BackIcon className="w-4 h-4 me-2" />
                    {t('العودة للمراحل', 'Back to stages')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-start gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/student/stages')}
                    className="shrink-0"
                >
                    <BackIcon className="w-4 h-4 me-1" />
                    {t('عودة', 'Back')}
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t(stage.title_ar, stage.title_en || stage.title_ar)}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('اختر المادة للوصول إلى الدروس', 'Choose a subject to access lessons')}
                    </p>
                </div>
            </div>

            {/* Entitled Subjects Grid */}
            {entitledForStage.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entitledForStage.map((subject: any) => (
                        <Link
                            key={subject.id}
                            to={`/student/subjects/${subject.id}`}
                            className="group flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all"
                        >
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                                {getSubjectIcon(subject)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                    {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {subject.total_lessons || 0} {t('درس', 'lessons')}
                                </p>
                            </div>
                            <ChevronIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </Link>
                    ))}
                </div>
            )}

            {/* Locked Subjects */}
            {lockedForStage.length > 0 && (
                <>
                    {entitledForStage.length > 0 && (
                        <div className="flex items-center gap-2 mt-6">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                {t('مواد مقفلة في هذه المرحلة', 'Locked subjects in this stage')}
                            </span>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lockedForStage.map((subject: any) => (
                            <div
                                key={subject.id}
                                className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-border/50 opacity-60"
                            >
                                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl shrink-0">
                                    <Lock className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-foreground truncate">
                                        {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                    </h3>
                                    <p className="text-xs text-amber-600 mt-0.5">
                                        {subject.lock_reason === 'subscription_required'
                                            ? t('يتطلب اشتراك', 'Subscription required')
                                            : subject.lock_reason === 'invite_required'
                                                ? t('بدعوة فقط', 'Invite only')
                                                : t('غير متاح', 'Not available')
                                        }
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Empty State */}
            {entitledForStage.length === 0 && lockedForStage.length === 0 && (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد مواد متاحة', 'No subjects available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('سيتم إضافة المواد قريباً', 'Subjects will be added soon')}
                    </p>
                </div>
            )}
        </div>
    );
}
