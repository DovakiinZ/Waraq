/**
 * /student/lesson/:id/summary — the printable AI summary ("الملخص الذكي").
 *
 * A standalone page, deliberately NOT nested under StudentLayout: the sidebar
 * and bottom nav would land on the paper.
 *
 * Printing is `window.print()` on real text. No html-to-image, no jsPDF —
 * rasterising would give an unselectable, unsearchable image of Arabic text.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Presentation, Printer } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useLesson } from '@/hooks/useQueryHooks';
import { useLessonSummary } from '@/hooks/useLessonSummary';
import { payloadFromRow, resolveDisplayLang } from '@/lib/lessonSummary';
import { Button } from '@/components/ui/button';
import { preparePrint } from '@/lib/printing';
import '@/styles/print.css';

export default function LessonSummaryPrint() {
    const { id } = useParams();
    const { t, language, direction } = useLanguage();
    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    const { data: lessonData, isLoading: lessonLoading } = useLesson(id);
    const { data: summary, isLoading: summaryLoading } = useLessonSummary(id);
    const [printing, setPrinting] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const lesson = lessonData?.lesson ?? null;
    const loading = lessonLoading || summaryLoading;

    // English falls back to Arabic — English is optional on approval, matching
    // the `t(ar, en || ar)` convention used across the platform.
    const displayLang = resolveDisplayLang(summary, language === 'en' ? 'en' : 'ar');
    const payload = useMemo(() => payloadFromRow(summary, displayLang), [summary, displayLang]);
    const dir = displayLang === 'ar' ? 'rtl' : 'ltr';

    // Portrait is the default @page box, so this page adds no body class —
    // only the slides route opts into landscape via `body.print-slides`.

    const handlePrint = async () => {
        setPrinting(true);
        try {
            await preparePrint(rootRef.current);
            window.print();
        } finally {
            setPrinting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!lesson) {
        return <Fallback message={t('تعذّر العثور على الدرس.', 'Lesson not found.')} />;
    }

    // RLS already decides this: a student only receives an approved row for a
    // lesson they may open, so an absent row means "nothing to show" rather
    // than "hidden". The teacher and super_admin receive drafts too, which is
    // what makes the editor's "Preview print" button work.
    if (!summary) {
        return (
            <Fallback
                message={t(
                    'لا يوجد ملخص معتمد لهذا الدرس بعد.',
                    'This lesson does not have an approved summary yet.'
                )}
                lessonId={id}
            />
        );
    }

    const isDraftPreview = summary.status !== 'approved';
    const subject = (lesson as { subject?: { title_ar?: string; title_en?: string } }).subject;
    const teacherName = (lesson as { teacher?: { full_name?: string } }).teacher?.full_name;
    const objectives = displayLang === 'ar'
        ? lesson.objectives_ar
        : (lesson.objectives_en || lesson.objectives_ar);

    return (
        <div className="min-h-screen bg-background">
            {/* Screen-only toolbar */}
            <div className="no-print border-b border-border bg-card">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                        <Link to={`/student/lesson/${id}`}>
                            <BackIcon className="w-4 h-4" />
                            {t('العودة للدرس', 'Back to lesson')}
                        </Link>
                    </Button>
                    <div className="ms-auto flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link to={`/student/lesson/${id}/slides`}>
                                <Presentation className="w-4 h-4" />
                                {t('عرض الشرائح', 'Slide view')}
                            </Link>
                        </Button>
                        <Button size="sm" onClick={handlePrint} disabled={printing} className="gap-1.5">
                            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            {t('طباعة / حفظ PDF', 'Print / Save PDF')}
                        </Button>
                    </div>
                </div>
            </div>

            {isDraftPreview && (
                <div className="no-print bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-500 text-yellow-900 dark:text-yellow-100 text-sm">
                    <div className="max-w-4xl mx-auto px-4 py-2">
                        {t(
                            'معاينة: هذا الملخص غير معتمد بعد ولا يراه الطلاب.',
                            'Preview: this summary is not approved yet and students cannot see it.'
                        )}
                    </div>
                </div>
            )}

            <div ref={rootRef} className="print-doc px-4 py-8" dir={dir} lang={displayLang}>
                {/* Document header. Carries lesson, subject and teacher — and
                    deliberately NO student name, id or progress: the sheet is
                    a study handout, not a record about a child. */}
                <header className="print-block border-b-2 border-foreground pb-4 mb-6 print-keep-color">
                    {/* Brand mark + wordmark. This sheet leaves the platform —
                        it gets printed, photographed and shared — so it has to
                        carry the academy on it. `print-keep-color` stops Chrome
                        dropping the mark's fill when printing. */}
                    <div className="flex items-center gap-2 mb-3 print-keep-color">
                        <img src="/brand/mark.svg" alt="" aria-hidden="true" className="h-8 w-8" />
                        <span className="font-bold text-base">{t('ورق أكاديمي', 'Waraq Academy')}</span>
                    </div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        {t('الملخص الذكي', 'AI summary')}
                    </p>
                    <h1 className="text-2xl font-bold leading-snug">
                        {displayLang === 'ar'
                            ? lesson.title_ar
                            : (lesson.title_en || lesson.title_ar)}
                    </h1>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                        {subject && (
                            <span>
                                {t('المادة', 'Subject')}:{' '}
                                {displayLang === 'ar'
                                    ? subject.title_ar
                                    : (subject.title_en || subject.title_ar)}
                            </span>
                        )}
                        {teacherName && <span>{t('المعلم', 'Teacher')}: {teacherName}</span>}
                    </div>
                </header>

                {objectives && (
                    <section className="print-block mb-6">
                        <h2 className="text-base font-bold mb-2">{t('أهداف الدرس', 'Lesson objectives')}</h2>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{objectives}</p>
                    </section>
                )}

                {payload.key_points.length > 0 && (
                    <section className="print-block mb-6 border border-foreground/30 p-4 print-keep-color">
                        <h2 className="text-base font-bold mb-2">{t('أهم النقاط', 'Key points')}</h2>
                        <ul className="space-y-1.5 text-sm">
                            {payload.key_points.map((point, i) => (
                                <li key={i} className="flex gap-2">
                                    <span aria-hidden="true">•</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {payload.summary && (
                    <section className="mb-6">
                        <h2 className="text-base font-bold mb-2">{t('الملخص', 'Summary')}</h2>
                        {/* The generator emits blank-line-separated paragraphs.
                            Split rather than whitespace-pre-wrap so each one is
                            its own break-inside:avoid block. */}
                        {payload.summary.split(/\n\s*\n/).map((para, i) => (
                            <p key={i} className="print-block text-sm leading-relaxed mb-3">
                                {para.trim()}
                            </p>
                        ))}
                    </section>
                )}

                {payload.slides.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold mb-3">{t('عناصر الدرس', 'Lesson outline')}</h2>
                        <div className="space-y-4">
                            {payload.slides.map((slide, i) => (
                                <div key={i} className="print-block">
                                    <h3 className="text-sm font-semibold mb-1">
                                        {i + 1}. {slide.title}
                                    </h3>
                                    <ul className="space-y-1 text-sm ps-5">
                                        {slide.bullets.map((bullet, j) => (
                                            <li key={j} className="list-disc">{bullet}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function Fallback({ message, lessonId }: { message: string; lessonId?: string }) {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-muted-foreground max-w-sm">{message}</p>
            {lessonId && (
                <Button asChild variant="outline" size="sm">
                    <Link to={`/student/lesson/${lessonId}`}>{t('العودة للدرس', 'Back to lesson')}</Link>
                </Button>
            )}
        </div>
    );
}
