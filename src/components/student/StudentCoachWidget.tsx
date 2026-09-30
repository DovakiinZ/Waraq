import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { analyzeStudentPerformance } from '@/lib/aiStudentCoachService';
import type { StudentCoachReport } from '@/types/database';
import { Loader2, Brain, TrendingUp, TrendingDown, Lightbulb, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentCoachWidget() {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const [report, setReport] = useState<StudentCoachReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;
        (async () => {
            try {
                const data = await analyzeStudentPerformance(profile.id);
                setReport(data);
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, [profile?.id]);

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="bg-gradient-to-br from-brand-mint/30 via-brand-paper to-brand-mint/20 dark:from-brand-green/20 dark:via-brand-deep/30 dark:to-brand-green/15 rounded-xl border border-brand-mint/60 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-mint/40 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-brand-green" />
                </div>
                <h3 className="text-sm font-bold text-brand-deep">
                    {t('اقتراحات لتحسين مستواك', 'Tips to Improve')}
                </h3>
            </div>

            {/* Motivational Message */}
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                <p className="text-sm text-brand-deep font-medium">{report.motivationalMessage}</p>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-3">
                {report.strengths.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-xs font-medium text-green-700">
                            <TrendingUp className="w-3 h-3" />
                            {t('نقاط القوة', 'Strengths')}
                        </div>
                        {report.strengths.slice(0, 3).map((s, i) => (
                            <p key={i} className="text-xs text-green-600 bg-green-50 rounded px-2 py-1">{s}</p>
                        ))}
                    </div>
                )}
                {report.weaknesses.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-xs font-medium text-orange-700">
                            <TrendingDown className="w-3 h-3" />
                            {t('يحتاج تحسين', 'Needs Work')}
                        </div>
                        {report.weaknesses.slice(0, 3).map((w, i) => (
                            <p key={i} className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">{w}</p>
                        ))}
                    </div>
                )}
            </div>

            {/* Suggested Lessons */}
            {report.suggestedLessons.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-brand-green">
                        <Lightbulb className="w-3 h-3" />
                        {t('دروس مقترحة', 'Suggested Lessons')}
                    </div>
                    <div className="space-y-1">
                        {report.suggestedLessons.slice(0, 3).map((l) => (
                            <Link
                                key={l.id}
                                to={`/student/lesson/${l.id}`}
                                className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 bg-background/60 rounded px-2 py-1.5 border border-border transition-colors"
                            >
                                <BookOpen className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{l.title}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
