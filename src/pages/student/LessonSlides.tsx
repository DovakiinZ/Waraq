/**
 * /student/lesson/:id/slides — slide view of the approved AI summary.
 *
 * A separate route from /summary rather than a toggle, because `@page` is a
 * document-level box: this one is landscape, one slide per sheet, and the
 * handout is portrait. One route cannot be both.
 *
 * Navigation: arrow keys, Home/End, on-screen buttons, and swipe. Direction
 * flips in RTL — in Arabic, ArrowLeft advances.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, FileText, Loader2, Printer } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useLesson } from '@/hooks/useQueryHooks';
import { useLessonSummary } from '@/hooks/useLessonSummary';
import { payloadFromRow, resolveDisplayLang } from '@/lib/lessonSummary';
import { Button } from '@/components/ui/button';
import { preparePrint } from '@/lib/printing';
import '@/styles/print.css';

/** Ignore an accidental drag; a real swipe travels further than this. */
const SWIPE_THRESHOLD_PX = 50;

export default function LessonSlides() {
    const { id } = useParams();
    const { t, language, direction } = useLanguage();
    const isRtl = direction === 'rtl';
    const BackIcon = isRtl ? ArrowRight : ArrowLeft;

    const { data: lessonData, isLoading: lessonLoading } = useLesson(id);
    const { data: summary, isLoading: summaryLoading } = useLessonSummary(id);

    const [index, setIndex] = useState(0);
    const [printing, setPrinting] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const deckRef = useRef<HTMLDivElement>(null);

    const lesson = lessonData?.lesson ?? null;
    const loading = lessonLoading || summaryLoading;

    const displayLang = resolveDisplayLang(summary, language === 'en' ? 'en' : 'ar');
    const payload = useMemo(() => payloadFromRow(summary, displayLang), [summary, displayLang]);
    const slides = payload.slides;
    const dir = displayLang === 'ar' ? 'rtl' : 'ltr';
    const teacherName = (lesson as { teacher?: { full_name?: string } } | null)?.teacher?.full_name ?? '';

    // `body.print-slides` selects the landscape @page box.
    useEffect(() => {
        document.body.classList.add('print-slides');
        return () => document.body.classList.remove('print-slides');
    }, []);

    const go = useCallback(
        (delta: number) => {
            setIndex((current) => {
                const next = current + delta;
                if (next < 0) return 0;
                if (next > slides.length - 1) return Math.max(0, slides.length - 1);
                return next;
            });
        },
        [slides.length]
    );

    // Keyboard. In RTL the visual "next" is the LEFT arrow, so the mapping is
    // flipped — matching how the arrow buttons render.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    go(isRtl ? -1 : 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    go(isRtl ? 1 : -1);
                    break;
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    go(1);
                    break;
                case 'PageUp':
                    e.preventDefault();
                    go(-1);
                    break;
                case 'Home':
                    e.preventDefault();
                    setIndex(0);
                    break;
                case 'End':
                    e.preventDefault();
                    setIndex(Math.max(0, slides.length - 1));
                    break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go, isRtl, slides.length]);

    const handlePrint = async () => {
        setPrinting(true);
        try {
            await preparePrint(deckRef.current);
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

    if (!summary || slides.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-muted-foreground max-w-sm">
                    {t(
                        'لا توجد شرائح معتمدة لهذا الدرس بعد.',
                        'This lesson does not have approved slides yet.'
                    )}
                </p>
                <Button asChild variant="outline" size="sm">
                    <Link to={`/student/lesson/${id}`}>{t('العودة للدرس', 'Back to lesson')}</Link>
                </Button>
            </div>
        );
    }

    const current = slides[index];
    const atStart = index === 0;
    const atEnd = index === slides.length - 1;
    const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
    const NextIcon = isRtl ? ChevronLeft : ChevronRight;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Screen-only toolbar */}
            <div className="no-print border-b border-border bg-card">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                        <Link to={`/student/lesson/${id}`}>
                            <BackIcon className="w-4 h-4" />
                            {t('العودة للدرس', 'Back to lesson')}
                        </Link>
                    </Button>
                    <div className="ms-auto flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link to={`/student/lesson/${id}/summary`}>
                                <FileText className="w-4 h-4" />
                                {t('عرض الملخص', 'Document view')}
                            </Link>
                        </Button>
                        <Button size="sm" onClick={handlePrint} disabled={printing} className="gap-1.5">
                            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            {t('طباعة الشرائح', 'Print slides')}
                        </Button>
                    </div>
                </div>
            </div>

            {summary.status !== 'approved' && (
                <div className="no-print bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-500 text-yellow-900 dark:text-yellow-100 text-sm">
                    <div className="max-w-5xl mx-auto px-4 py-2">
                        {t(
                            'معاينة: هذه الشرائح غير معتمدة بعد ولا يراها الطلاب.',
                            'Preview: these slides are not approved yet and students cannot see them.'
                        )}
                    </div>
                </div>
            )}

            {/* ── On screen: one slide at a time ─────────────────────────── */}
            <div
                className="no-print flex-1 flex flex-col"
                dir={dir}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                    if (touchStartX.current === null) return;
                    const delta = e.changedTouches[0].clientX - touchStartX.current;
                    touchStartX.current = null;
                    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
                    // Swiping left moves forward in LTR and backward in RTL.
                    const forward = isRtl ? delta > 0 : delta < 0;
                    go(forward ? 1 : -1);
                }}
            >
                <section
                    className="flex-1 flex items-center justify-center p-6 md:p-12"
                    aria-roledescription="slide"
                    aria-label={t(
                        `شريحة ${index + 1} من ${slides.length}: ${current.title}`,
                        `Slide ${index + 1} of ${slides.length}: ${current.title}`
                    )}
                >
                    <div className="w-full max-w-3xl">
                        <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-10 leading-tight">
                            {current.title}
                        </h2>
                        <ul className="space-y-3 md:space-y-5">
                            {current.bullets.map((bullet, i) => (
                                <li key={i} className="flex gap-3 text-lg md:text-2xl leading-snug">
                                    <span className="text-primary shrink-0" aria-hidden="true">•</span>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Controls. aria-live announces the counter to a screen reader
                    as the deck advances. */}
                <div className="border-t border-border bg-card">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                        <Button
                            variant="outline" size="sm" onClick={() => go(-1)} disabled={atStart}
                            className="gap-1.5"
                            aria-label={t('الشريحة السابقة', 'Previous slide')}
                        >
                            <PrevIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('السابق', 'Previous')}</span>
                        </Button>

                        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                            {t(`${index + 1} من ${slides.length}`, `${index + 1} of ${slides.length}`)}
                        </p>

                        <Button
                            variant="outline" size="sm" onClick={() => go(1)} disabled={atEnd}
                            className="gap-1.5"
                            aria-label={t('الشريحة التالية', 'Next slide')}
                        >
                            <span className="hidden sm:inline">{t('التالي', 'Next')}</span>
                            <NextIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── On paper: every slide, one per sheet ───────────────────── */}
            <div ref={deckRef} className="hidden print:block" dir={dir} lang={displayLang}>
                {slides.map((slide, i) => (
                    <article key={i} className="print-slide">
                        {/* Printed slides get handed around on their own, so each
                            sheet carries the brand, the lesson and the teacher —
                            not just a slide number. */}
                        <div className="flex items-center justify-between mb-3 print-keep-color">
                            <div className="flex items-center gap-2">
                                <img src="/brand/mark.svg" alt="" aria-hidden="true" className="h-6 w-6" />
                                <span className="text-sm font-bold">{t('ورق أكاديمي', 'Waraq Academy')}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {t(`${i + 1} من ${slides.length}`, `${i + 1} of ${slides.length}`)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                            {displayLang === 'ar'
                                ? lesson?.title_ar
                                : (lesson?.title_en || lesson?.title_ar)}
                            {teacherName ? ` · ${teacherName}` : ''}
                        </p>
                        <h2 className="text-3xl font-bold mb-8 leading-tight">{slide.title}</h2>
                        <ul className="space-y-4">
                            {slide.bullets.map((bullet, j) => (
                                <li key={j} className="flex gap-3 text-xl leading-snug">
                                    <span aria-hidden="true">•</span>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </div>
    );
}
