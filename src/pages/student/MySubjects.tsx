/**
 * MySubjects — Browse entitled subjects with progress tracking
 * + "Discover" tab showing locked subjects with CTAs
 * Uses RPC-backed hooks for secure server-side access filtering
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMySubjects, useDiscoverSubjects } from '@/hooks/useAcademyData';
import { Stage } from '@/types/database';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle,
    Lock,
    Sparkles,
    Search,
    GraduationCap,
} from 'lucide-react';

type Tab = 'my' | 'discover';

export default function MySubjects() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('my');
    const { data: mySubjects = [], isLoading: myLoading } = useMySubjects(profile?.id, profile?.student_stage);
    const { data: discoverSubjects = [], isLoading: discoverLoading } = useDiscoverSubjects(profile?.id);

    const loading = activeTab === 'my' ? myLoading : discoverLoading;
    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    // Group my subjects by stage
    const stageGroups = useMemo(() => {
        const stageMap = new Map<string, { stage: { title_ar: string; title_en?: string }; subjects: any[] }>();

        (mySubjects as any[]).forEach(s => {
            const stageKey = s.stage_id || '__no_stage__';
            if (!stageMap.has(stageKey)) {
                stageMap.set(stageKey, {
                    stage: s.stage || { title_ar: 'عام', title_en: 'General' },
                    subjects: [],
                });
            }
            stageMap.get(stageKey)!.subjects.push(s);
        });

        return stageMap;
    }, [mySubjects]);

    // These are the labels get_discover_subjects actually emits. The previous
    // set ('needs_subscription', 'needs_invite', 'wrong_stage') matched
    // nothing the function has ever returned, so every locked card fell
    // through to the generic "Locked".
    const getLockLabel = (reason: string) => {
        switch (reason) {
            case 'subscription_required': return t('يتطلب اشتراك', 'Subscription Required');
            case 'invite_required': return t('بدعوة فقط', 'Invite Only');
            case 'org_required': return t('عبر مؤسسة', 'Through an Organisation');
            case 'not_available': return t('غير متاح لك', 'Not Available');
            default: return t('مقفل', 'Locked');
        }
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('موادي الدراسية', 'My Subjects')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('تصفح المواد المتاحة وتابع تقدمك', 'Browse your subjects and track progress')}
                    </p>
                </div>
                {profile?.student_stage && (
                    <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>
                            {profile.student_stage === 'kindergarten' ? t('رياض الأطفال', 'Kindergarten')
                                : profile.student_stage === 'primary' ? t('ابتدائي', 'Primary')
                                : profile.student_stage === 'middle' ? t('متوسط', 'Middle')
                                : profile.student_stage === 'high' ? t('ثانوي', 'High School')
                                : profile.student_stage}
                        </span>
                    </div>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('my')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'my'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <BookOpen className="w-4 h-4 inline-block me-1.5 -mt-0.5" />
                    {t('موادي', 'My Subjects')}
                    {(mySubjects as any[]).length > 0 && (
                        <span className="ms-1.5 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                            {(mySubjects as any[]).length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('discover')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'discover'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Search className="w-4 h-4 inline-block me-1.5 -mt-0.5" />
                    {t('استكشف', 'Discover')}
                    {(discoverSubjects as any[]).length > 0 && (
                        <span className="ms-1.5 bg-amber-500/10 text-amber-600 text-xs px-1.5 py-0.5 rounded-full">
                            {(discoverSubjects as any[]).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {/* ── MY SUBJECTS TAB ─────────────────────────── */}
            {!loading && activeTab === 'my' && (
                <>
                    {Array.from(stageGroups.values()).map(({ stage, subjects: stageSubjects }, groupIdx) => (
                        <section key={groupIdx}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-lg font-semibold text-foreground">
                                    {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                </h2>
                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                    {stageSubjects.length} {t('مادة', 'subjects')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stageSubjects.map((subject: any) => {
                                    const isCompleted = subject.progress_percent === 100;
                                    const hasStarted = subject.progress_percent > 0;

                                    return (
                                        <Link
                                            key={subject.id}
                                            to={`/student/subjects/${subject.id}`}
                                            className="group bg-background border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-200"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-base">
                                                            {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                                        </h3>
                                                        {subject.entitlement_reason && subject.entitlement_reason !== 'stage' && subject.entitlement_reason !== 'public' && (
                                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                                {subject.entitlement_reason === 'assigned' ? t('مخصص', 'Assigned')
                                                                    : subject.entitlement_reason === 'subscription' ? t('اشتراك', 'Sub')
                                                                        : subject.entitlement_reason === 'invite' ? t('دعوة', 'Invite')
                                                                            : subject.entitlement_reason === 'organization' ? t('مؤسسة', 'Org')
                                                                                : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {subject.description_ar && (
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                            {t(subject.description_ar || '', subject.description_en || subject.description_ar || '')}
                                                        </p>
                                                    )}
                                                </div>
                                                {isCompleted && (
                                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ms-2" />
                                                )}
                                            </div>

                                            {/* Progress */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                                                    <span>{subject.completed_lessons}/{subject.total_lessons} {t('درس', 'lessons')}</span>
                                                    <span className="font-medium">{subject.progress_percent}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isCompleted
                                                            ? 'bg-green-500'
                                                            : hasStarted
                                                                ? 'bg-primary'
                                                                : 'bg-transparent'
                                                            }`}
                                                        style={{ width: `${subject.progress_percent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* CTA */}
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-xs font-medium text-primary">
                                                    {isCompleted
                                                        ? t('✓ مكتمل', '✓ Completed')
                                                        : hasStarted
                                                            ? t('متابعة', 'Continue')
                                                            : t('ابدأ', 'Start')}
                                                </span>
                                                <ChevronIcon className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    {/* Empty State */}
                    {(mySubjects as any[]).length === 0 && (
                        <div className="bg-background rounded-xl border border-border p-12 text-center">
                            {profile?.student_stage ? (
                                <>
                                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <h3 className="font-medium text-foreground mb-2">
                                        {t('لا توجد مواد متاحة لمرحلتك الآن', 'No subjects available for your stage yet')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {t('سيتم إضافة مواد لمرحلتك قريباً. استكشف المواد المتاحة في الوقت الحالي.', 'Subjects for your stage will be added soon. Explore available subjects in the meantime.')}
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('discover')}
                                        className="text-sm text-primary font-medium hover:underline"
                                    >
                                        {t('استكشف المواد المتاحة ←', 'Discover available subjects →')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <h3 className="font-medium text-foreground mb-2">
                                        {t('حدد مرحلتك الدراسية', 'Set your educational stage')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {t(
                                            'أكمل ملفك الشخصي وحدد مرحلتك الدراسية لعرض المواد المناسبة لك.',
                                            'Complete your profile and set your educational stage to see subjects tailored for you.'
                                        )}
                                    </p>
                                    <Link
                                        to="/student/profile"
                                        className="inline-block text-sm bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        {t('إكمال الملف الشخصي', 'Complete Profile')}
                                    </Link>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── DISCOVER TAB ─────────────────────────── */}
            {!loading && activeTab === 'discover' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(discoverSubjects as any[]).map((subject: any) => (
                            <div
                                key={subject.id}
                                className="relative bg-background border border-border rounded-xl p-5 opacity-80"
                            >
                                {/* Lock badge */}
                                <div className="absolute top-3 end-3">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
                                        <Lock className="w-3 h-3" />
                                        {getLockLabel(subject.lock_reason)}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0 pe-20">
                                    <h3 className="font-semibold text-foreground truncate text-base">
                                        {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                    </h3>
                                    {subject.stage_title_ar && (
                                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded mt-1 inline-block">
                                            {t(subject.stage_title_ar, subject.stage_title_en || subject.stage_title_ar)}
                                        </span>
                                    )}
                                    {subject.description_ar && (
                                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                            {t(subject.description_ar || '', subject.description_en || subject.description_ar || '')}
                                        </p>
                                    )}
                                </div>

                                {/* CTA */}
                                <div className="mt-4 pt-3 border-t border-border/50">
                                    {subject.lock_reason === 'subscription_required' && (
                                        <Link to="/student/marketplace" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            {t('تصفح المتجر', 'Browse Marketplace')}
                                        </Link>
                                    )}
                                    {subject.lock_reason === 'not_available' && (
                                        <span className="text-xs text-muted-foreground">
                                            {t('هذه المادة لمرحلة دراسية أخرى', 'This subject is for a different stage')}
                                        </span>
                                    )}
                                    {subject.lock_reason === 'invite_required' && (
                                        <span className="text-xs text-muted-foreground">
                                            {t('تواصل مع المعلم للحصول على دعوة', 'Contact your teacher for an invite')}
                                        </span>
                                    )}
                                    {subject.lock_reason === 'org_required' && (
                                        <span className="text-xs text-muted-foreground">
                                            {t('هذه المادة غير متاحة حالياً', 'This subject is not currently available')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {(discoverSubjects as any[]).length === 0 && (
                        <div className="bg-background rounded-xl border border-border p-12 text-center">
                            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <h3 className="font-medium text-foreground mb-2">
                                {t('لديك وصول لجميع المواد المتاحة!', 'You have access to all available subjects!')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {t('استمر في التعلم والتقدم', 'Keep learning and progressing')}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
