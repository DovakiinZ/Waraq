import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStages } from '@/hooks/useQueryHooks';
import { Stage } from '@/types/database';
import { GraduationCap, BookMarked, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface StageWithSubjects extends Stage {
    subjects?: any[];
    subjects_count?: number;
}

export default function StudentStages() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const { data: allStages = [], isLoading: loading } = useStages();

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    // Filter stages to only show the student's own stage
    const stages = profile?.student_stage
        ? allStages.filter((s: any) => s.slug === profile.student_stage)
        : allStages;

    // Stage icons based on slug or sort order
    const getStageIcon = (stage: StageWithSubjects) => {
        const icons: Record<string, string> = {
            'kindergarten': '🎨',
            'تمهيدي': '🎨',
            'primary': '📚',
            'ابتدائي': '📚',
            'middle': '🎓',
            'متوسط': '🎓',
            'high': '🏫',
            'ثانوي': '🏫',
        };
        return icons[stage.slug] || icons[stage.title_ar] || '📖';
    };

    // Stage colors based on sort order
    const getStageColor = (index: number) => {
        const colors = [
            'from-emerald-500 to-teal-600',
            'from-brand-sky to-brand-green',
            'from-purple-500 to-pink-600',
        ];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('المراحل الدراسية', 'Academic Stages')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('اختر المرحلة الدراسية للوصول إلى المواد والدروس', 'Choose your academic stage to access subjects and lessons')}
                </p>
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stages.map((stage: any, index: number) => (
                    <Link
                        key={stage.id}
                        to={`/student/stages/${stage.id}`}
                        className="group relative overflow-hidden rounded-xl border border-border bg-background hover:shadow-lg transition-all duration-300"
                    >
                        {/* Gradient Header */}
                        <div className={`h-24 bg-gradient-to-r ${getStageColor(index)} flex items-center justify-center`}>
                            <span className="text-4xl">{getStageIcon(stage)}</span>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                {t(stage.title_ar, stage.title_en || stage.title_ar)}
                            </h3>

                            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                                <BookMarked className="w-4 h-4" />
                                <span>
                                    {stage.subjects_count || 0} {t('مادة', 'subjects')}
                                </span>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    {t('استكشف المواد', 'Explore subjects')}
                                </span>
                                <ChevronIcon className="w-4 h-4 text-primary group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {stages.length === 0 && !loading && (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد مراحل متاحة', 'No stages available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('سيتم إضافة المراحل الدراسية قريباً', 'Academic stages will be added soon')}
                    </p>
                </div>
            )}
        </div>
    );
}
