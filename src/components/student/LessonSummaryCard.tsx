/**
 * The AI summary ("الملخص الذكي") as it appears inside the lesson player.
 *
 * Renders nothing unless an APPROVED summary came back. RLS is what decides
 * that — a student is only ever handed an approved row for a lesson they may
 * open — but the status is checked here too so the lesson's own teacher, who
 * does receive drafts, is not shown their unapproved draft in the student view
 * by accident. Their preview lives on the two dedicated routes instead.
 */

import { Link } from 'react-router-dom';
import { FileText, Presentation, Sparkles } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useLessonSummary } from '@/hooks/useLessonSummary';
import { payloadFromRow, resolveDisplayLang } from '@/lib/lessonSummary';
import { Button } from '@/components/ui/button';

export default function LessonSummaryCard({ lessonId }: { lessonId: string }) {
    const { t, language } = useLanguage();
    const { data: summary } = useLessonSummary(lessonId);

    if (!summary || summary.status !== 'approved') return null;

    const displayLang = resolveDisplayLang(summary, language === 'en' ? 'en' : 'ar');
    const payload = payloadFromRow(summary, displayLang);

    const hasBody = !!payload.summary.trim() || payload.key_points.length > 0;
    if (!hasBody) return null;

    return (
        <section
            className="border border-border rounded-lg p-4 md:p-5 bg-card"
            dir={displayLang === 'ar' ? 'rtl' : 'ltr'}
            lang={displayLang}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {t('الملخص الذكي', 'AI summary')}
                </h2>
            </div>

            {payload.key_points.length > 0 && (
                <ul className="space-y-1.5 mb-4">
                    {payload.key_points.map((point, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                            <span className="text-primary shrink-0" aria-hidden="true">•</span>
                            <span>{point}</span>
                        </li>
                    ))}
                </ul>
            )}

            {payload.summary && (
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                    {payload.summary.split(/\n\s*\n/).map((para, i) => (
                        <p key={i}>{para.trim()}</p>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to={`/student/lesson/${lessonId}/summary`}>
                        <FileText className="w-4 h-4" />
                        {t('نسخة للطباعة', 'Printable version')}
                    </Link>
                </Button>
                {payload.slides.length > 0 && (
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link to={`/student/lesson/${lessonId}/slides`}>
                            <Presentation className="w-4 h-4" />
                            {t('عرض كشرائح', 'View as slides')}
                        </Link>
                    </Button>
                )}
            </div>
        </section>
    );
}
