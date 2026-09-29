/**
 * Teacher-facing editor for the AI summary ("AI summary" / "الملخص الذكي").
 *
 * Generate a draft from the lesson's own content, edit it in AR/EN tabs,
 * preview it exactly as a student will see it, then approve or reject.
 *
 * Nothing here touches `lessons.summary_ar` / `lessons.summary_en` — that is a
 * different, teacher-written blurb edited from the lesson settings form.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import {
    AlertCircle, Check, Loader2, Plus, Presentation, Printer, RefreshCw,
    Sparkles, Trash2, X,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { LessonBlock, LessonSection } from '@/types/database';
import {
    isSummaryStale, payloadFromRow, summaryFormSchema,
    type LessonSource, type SummaryFormValues,
} from '@/lib/lessonSummary';
import {
    useGenerateLessonSummary, useLessonSourceHash, useLessonSummary,
    useReviewLessonSummary, useSaveLessonSummary, type SummaryError,
} from '@/hooks/useLessonSummary';

interface LessonSummaryPanelProps {
    lessonId: string;
    lesson: {
        title_ar?: string | null;
        title_en?: string | null;
        objectives_ar?: string | null;
        objectives_en?: string | null;
    };
    sections: LessonSection[];
    blocks: LessonBlock[];
}

const EMPTY_PAYLOAD = { summary: '', key_points: [], slides: [] };

export default function LessonSummaryPanel({
    lessonId, lesson, sections, blocks,
}: LessonSummaryPanelProps) {
    const { t, language } = useLanguage();
    const { profile } = useAuth();

    const { data: row, isLoading } = useLessonSummary(lessonId);

    // Hash the lesson exactly as the generator did, so "changed since" is real.
    const source: LessonSource = useMemo(
        () => ({ lesson, sections: sections as never, blocks: blocks as never }),
        [lesson, sections, blocks]
    );
    const { data: currentHash } = useLessonSourceHash(lessonId, source);

    const generate = useGenerateLessonSummary(lessonId);
    const save = useSaveLessonSummary(lessonId);
    const review = useReviewLessonSummary(lessonId);

    const [genError, setGenError] = useState<SummaryError | null>(null);
    const [confirmRegenerate, setConfirmRegenerate] = useState(false);

    const form = useForm<SummaryFormValues>({
        resolver: zodResolver(summaryFormSchema),
        defaultValues: { ar: EMPTY_PAYLOAD, en: EMPTY_PAYLOAD },
    });

    // Reload the form whenever the stored row changes (generate, approve,
    // reject). `reset` rather than setValue so the dirty flag clears too.
    useEffect(() => {
        form.reset({
            ar: payloadFromRow(row, 'ar'),
            en: payloadFromRow(row, 'en'),
        });
    }, [row, form]);

    const isStale = isSummaryStale(row, currentHash);
    const isDirty = form.formState.isDirty;
    const busy = generate.isPending || save.isPending || review.isPending;

    const runGenerate = async () => {
        setGenError(null);
        const result = await generate.mutateAsync();
        if (!result.success && result.error) {
            setGenError(result.error);
            return;
        }
        toast.success(t('تم إنشاء مسودة الملخص', 'Draft summary generated'));
    };

    const handleGenerateClick = () => {
        // Regenerating discards the current text. Only warn when there is
        // something to lose — unsaved edits, or an approved summary students
        // are currently reading.
        if (isDirty || row?.status === 'approved' || (row && row.status !== 'rejected')) {
            setConfirmRegenerate(true);
            return;
        }
        void runGenerate();
    };

    const onSave = form.handleSubmit(async (values) => {
        try {
            await save.mutateAsync({
                id: row?.id,
                values,
                status: row?.status ?? 'draft',
                reviewerId: profile?.id,
            });
            toast.success(
                row?.status === 'approved'
                    ? t('تم حفظ التعديلات ولا يزال الملخص معتمداً', 'Saved — the summary stays approved')
                    : t('تم حفظ الملخص', 'Summary saved')
            );
        } catch (err) {
            toast.error(t('فشل حفظ الملخص', 'Failed to save the summary'), {
                description: err instanceof Error ? err.message : undefined,
            });
        }
    });

    const setStatus = async (status: 'approved' | 'rejected') => {
        if (!row?.id) return;
        try {
            await review.mutateAsync({ id: row.id, status, reviewerId: profile?.id });
            toast.success(
                status === 'approved'
                    ? t('تم اعتماد الملخص وأصبح مرئياً للطلاب', 'Approved — students can now see it')
                    : t('تم رفض الملخص', 'Summary rejected')
            );
        } catch (err) {
            toast.error(t('فشل تحديث الحالة', 'Failed to update the status'), {
                description: err instanceof Error ? err.message : undefined,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <Header
                status={row?.status}
                generatedAt={row?.generated_at}
                model={row?.model}
            />

            {isStale && (
                <Notice tone="warning" icon={AlertCircle}>
                    <p className="font-medium">
                        {t('تغيّر الدرس بعد إنشاء هذا الملخص', 'The lesson changed after this summary was generated')}
                    </p>
                    <p className="opacity-90">
                        {t(
                            'قد لا يعكس الملخص المحتوى الحالي. راجعه يدوياً أو أعد إنشاءه عندما تكون جاهزاً — لن يُعاد إنشاؤه تلقائياً.',
                            'It may no longer match the lesson. Review it by hand, or regenerate when you are ready — it is never regenerated automatically.'
                        )}
                    </p>
                </Notice>
            )}

            {genError && (
                <Notice tone="error" icon={AlertCircle}>
                    <p>{t(genError.ar, genError.en)}</p>
                </Notice>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handleGenerateClick} disabled={busy} className="gap-1.5">
                    {generate.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : row ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    {row
                        ? t('إعادة إنشاء الملخص', 'Regenerate summary')
                        : t('إنشاء ملخص ذكي', 'Generate AI summary')}
                </Button>

                {row && (
                    <>
                        <Button size="sm" variant="outline" onClick={onSave} disabled={busy || !isDirty} className="gap-1.5">
                            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('حفظ التعديلات', 'Save edits')}
                        </Button>

                        {row.status !== 'approved' && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => setStatus('approved')}
                                disabled={busy || isDirty}
                                title={isDirty ? t('احفظ التعديلات أولاً', 'Save your edits first') : undefined}
                                className="gap-1.5"
                            >
                                <Check className="w-4 h-4" />
                                {t('اعتماد', 'Approve')}
                            </Button>
                        )}

                        {row.status !== 'rejected' && (
                            <Button size="sm" variant="ghost" onClick={() => setStatus('rejected')} disabled={busy} className="gap-1.5 text-destructive">
                                <X className="w-4 h-4" />
                                {t('رفض', 'Reject')}
                            </Button>
                        )}

                        {/* Preview the student pages before approving. Both routes
                            let the lesson's editor through regardless of status. */}
                        <div className="ms-auto flex items-center gap-2">
                            <Button asChild size="sm" variant="ghost" className="gap-1.5">
                                <Link to={`/student/lesson/${lessonId}/summary`} target="_blank" rel="noreferrer">
                                    <Printer className="w-4 h-4" />
                                    {t('معاينة الطباعة', 'Preview print')}
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="gap-1.5">
                                <Link to={`/student/lesson/${lessonId}/slides`} target="_blank" rel="noreferrer">
                                    <Presentation className="w-4 h-4" />
                                    {t('معاينة الشرائح', 'Preview slides')}
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {!row && !generate.isPending && (
                <div className="border border-dashed border-border rounded-lg p-8 text-center">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                        {t('لا يوجد ملخص ذكي بعد', 'No AI summary yet')}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {t(
                            'سيُنشأ الملخص من محتوى هذا الدرس فقط. راجعه واعتمده قبل أن يظهر للطلاب.',
                            'The summary is written from this lesson’s content only. Review and approve it before students can see it.'
                        )}
                    </p>
                </div>
            )}

            {row && (
                <Tabs defaultValue={language === 'en' ? 'en' : 'ar'} className="w-full">
                    <TabsList>
                        <TabsTrigger value="ar">{t('العربية', 'Arabic')}</TabsTrigger>
                        <TabsTrigger value="en">{t('الإنجليزية', 'English')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ar" className="pt-4">
                        <LanguageFields control={form.control} lang="ar" dir="rtl" />
                    </TabsContent>
                    <TabsContent value="en" className="pt-4">
                        <p className="text-xs text-muted-foreground mb-4">
                            {t(
                                'الإنجليزية اختيارية. إذا تركتها فارغة سيظهر النص العربي للطلاب.',
                                'English is optional. Left empty, students see the Arabic text.'
                            )}
                        </p>
                        <LanguageFields control={form.control} lang="en" dir="ltr" />
                    </TabsContent>
                </Tabs>
            )}

            <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('إعادة إنشاء الملخص؟', 'Regenerate the summary?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isDirty
                                ? t(
                                    'لديك تعديلات غير محفوظة سيتم استبدالها بالكامل بنص جديد من الذكاء الاصطناعي.',
                                    'You have unsaved edits. They will be completely replaced by newly generated text.'
                                )
                                : row?.status === 'approved'
                                    ? t(
                                        'هذا الملخص معتمد ويراه الطلاب الآن. ستُستبدل نسخته الحالية بمسودة جديدة تحتاج اعتماداً من جديد.',
                                        'This summary is approved and students can see it now. It will be replaced by a new draft that needs approving again.'
                                    )
                                    : t(
                                        'سيتم استبدال النص الحالي بالكامل بنص جديد.',
                                        'The current text will be completely replaced.'
                                    )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void runGenerate()}>
                            {t('إعادة الإنشاء', 'Regenerate')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({
    status, generatedAt, model,
}: { status?: string; generatedAt?: string | null; model?: string | null }) {
    const { t, language } = useLanguage();

    // `pending_review` is in the DB constraint but no UI writes it — the
    // teacher is the reviewer, so the flow is draft -> approved. Rendered
    // anyway so a hand-set row is never a blank badge.
    const label: Record<string, { ar: string; en: string; className: string }> = {
        draft: { ar: 'مسودة', en: 'Draft', className: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200' },
        pending_review: { ar: 'قيد المراجعة', en: 'Pending review', className: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200' },
        approved: { ar: 'معتمد', en: 'Approved', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' },
        rejected: { ar: 'مرفوض', en: 'Rejected', className: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200' },
    };
    const badge = status ? label[status] : null;

    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {t('الملخص الذكي', 'AI summary')}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                    {t(
                        'يراه الطلاب بعد اعتماده فقط. مصدره محتوى هذا الدرس وحده.',
                        'Students see it only after you approve it. It is written from this lesson’s content alone.'
                    )}
                </p>
            </div>
            <div className="text-end shrink-0">
                {badge && (
                    <Badge variant="secondary" className={cn('font-medium', badge.className)}>
                        {t(badge.ar, badge.en)}
                    </Badge>
                )}
                {generatedAt && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                        {new Date(generatedAt).toLocaleDateString(language === 'ar' ? 'ar' : 'en-GB', {
                            year: 'numeric', month: 'short', day: 'numeric',
                        })}
                        {model ? ` · ${model}` : ''}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Notice ──────────────────────────────────────────────────────────────────

function Notice({
    tone, icon: Icon, children,
}: { tone: 'warning' | 'error'; icon: typeof AlertCircle; children: React.ReactNode }) {
    return (
        <div
            className={cn(
                'flex items-start gap-2.5 p-3 rounded-md border-s-4 text-sm',
                tone === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500 text-yellow-900 dark:text-yellow-100'
                    // Errors use the semantic destructive token, the one
                    // deliberate non-brand colour — an error in green would not
                    // read as an error.
                    : 'bg-destructive/10 border-destructive text-destructive'
            )}
            role={tone === 'error' ? 'alert' : 'status'}
        >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-0.5">{children}</div>
        </div>
    );
}

// ─── Per-language fields ─────────────────────────────────────────────────────

function LanguageFields({
    control, lang, dir,
}: { control: Control<SummaryFormValues>; lang: 'ar' | 'en'; dir: 'rtl' | 'ltr' }) {
    const { t } = useLanguage();

    return (
        <div className="space-y-6" dir={dir}>
            <div className="space-y-2">
                <Label>{t('الملخص', 'Summary')}</Label>
                <Controller
                    control={control}
                    name={`${lang}.summary` as const}
                    render={({ field, fieldState }) => (
                        <>
                            <Textarea
                                {...field}
                                value={field.value ?? ''}
                                rows={8}
                                dir={dir}
                                placeholder={t('نص الملخص…', 'Summary text…')}
                            />
                            <FieldError message={fieldState.error?.message} />
                        </>
                    )}
                />
            </div>

            <KeyPointsField control={control} lang={lang} dir={dir} />
            <SlidesField control={control} lang={lang} dir={dir} />
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    const { t } = useLanguage();
    if (!message) return null;
    // Zod's built-in messages are English-only; show a single bilingual line
    // rather than leaking "String must contain at least 1 character(s)".
    return (
        <p className="text-xs text-destructive mt-1">
            {t('هذا الحقل مطلوب أو تجاوز الحد المسموح.', 'This field is required or exceeds the allowed length.')}
        </p>
    );
}

function KeyPointsField({
    control, lang, dir,
}: { control: Control<SummaryFormValues>; lang: 'ar' | 'en'; dir: 'rtl' | 'ltr' }) {
    const { t } = useLanguage();
    const { fields, append, remove } = useFieldArray({
        control,
        // RHF cannot type a template-literal path into a nested array of
        // primitives; the runtime path is correct.
        name: `${lang}.key_points` as never,
    });

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>{t('أهم النقاط', 'Key points')}</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => append('' as never)} className="gap-1 h-7">
                    <Plus className="w-3.5 h-3.5" />
                    {t('إضافة', 'Add')}
                </Button>
            </div>
            {fields.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('لا توجد نقاط.', 'No key points.')}</p>
            )}
            <div className="space-y-2">
                {fields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2">
                        <Controller
                            control={control}
                            name={`${lang}.key_points.${i}` as const}
                            render={({ field }) => (
                                <Input {...field} value={field.value ?? ''} dir={dir} className="flex-1" />
                            )}
                        />
                        <Button
                            type="button" size="icon" variant="ghost"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => remove(i)}
                            aria-label={t('حذف النقطة', 'Remove key point')}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SlidesField({
    control, lang, dir,
}: { control: Control<SummaryFormValues>; lang: 'ar' | 'en'; dir: 'rtl' | 'ltr' }) {
    const { t } = useLanguage();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `${lang}.slides` as never,
    });

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>{t('الشرائح', 'Slides')}</Label>
                <Button
                    type="button" size="sm" variant="ghost" className="gap-1 h-7"
                    onClick={() => append({ title: '', bullets: [''] } as never)}
                >
                    <Plus className="w-3.5 h-3.5" />
                    {t('شريحة', 'Slide')}
                </Button>
            </div>
            {fields.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('لا توجد شرائح.', 'No slides.')}</p>
            )}
            <div className="space-y-3">
                {fields.map((f, i) => (
                    <div key={f.id} className="border border-border rounded-md p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-6 shrink-0">{i + 1}</span>
                            <Controller
                                control={control}
                                name={`${lang}.slides.${i}.title` as const}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        value={field.value ?? ''}
                                        dir={dir}
                                        className="flex-1 font-medium"
                                        placeholder={t('عنوان الشريحة', 'Slide title')}
                                    />
                                )}
                            />
                            <Button
                                type="button" size="icon" variant="ghost"
                                className="h-8 w-8 text-destructive shrink-0"
                                onClick={() => remove(i)}
                                aria-label={t('حذف الشريحة', 'Remove slide')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <SlideBullets control={control} lang={lang} index={i} dir={dir} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SlideBullets({
    control, lang, index, dir,
}: { control: Control<SummaryFormValues>; lang: 'ar' | 'en'; index: number; dir: 'rtl' | 'ltr' }) {
    const { t } = useLanguage();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `${lang}.slides.${index}.bullets` as never,
    });

    return (
        <div className="ps-8 space-y-1.5">
            {fields.map((f, j) => (
                <div key={f.id} className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs shrink-0">•</span>
                    <Controller
                        control={control}
                        name={`${lang}.slides.${index}.bullets.${j}` as const}
                        render={({ field }) => (
                            <Input {...field} value={field.value ?? ''} dir={dir} className="flex-1 h-8 text-sm" />
                        )}
                    />
                    <Button
                        type="button" size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={() => remove(j)}
                        aria-label={t('حذف النقطة', 'Remove bullet')}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            ))}
            <Button
                type="button" size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                onClick={() => append('' as never)}
            >
                <Plus className="w-3 h-3" />
                {t('نقطة', 'Bullet')}
            </Button>
        </div>
    );
}
