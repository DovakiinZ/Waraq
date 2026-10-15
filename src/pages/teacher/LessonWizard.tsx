/**
 * Four-step lesson creation, replacing the two-field "create lesson" dialog
 * that dropped a teacher into an empty editor with eleven block types and no
 * indication of what to do next.
 *
 * Where → What → Content → Review. The content step is the reason the wizard
 * is worth having: pasting a lesson the teacher already wrote is the fast
 * path, and it is offered before they ever see a block editor.
 *
 * The lesson ROW is created when leaving step 2, not at the end, because
 * blocks and uploads both need a lesson_id. That is also exactly what the old
 * dialog did, so an abandoned wizard leaves the same unpublished draft it
 * always did — not a new kind of mess.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, ArrowRight, Check, Loader2, Wand2, FilePlus2,
    AlertCircle, AlertTriangle, BookOpen, Sparkles,
} from 'lucide-react';
import { ImportedBlock, parseLessonText, summariseBlocks } from '@/lib/lessonImport';
import { ISSUE_COPY, checkLessonReadiness, hasBlockers } from '@/lib/lessonReadiness';
import { isRlsDenial } from '@/lib/rlsError';
import type { LessonBlock } from '@/types/database';

/**
 * Writes go through an untyped handle.
 *
 * The project runs with `noImplicitAny: false` / `strictNullChecks: false` and
 * its generated Supabase row types do not match the live schema, so every
 * write site in this codebase casts. One narrow, named escape hatch here beats
 * scattering `as any` through the file.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const writeDb = supabase as any;

interface SubjectOption {
    id: string;
    title_ar: string;
    title_en?: string | null;
    is_active?: boolean | null;
}

const TYPE_LABELS: Record<string, [string, string]> = {
    rich_text: ['نص', 'Text'],
    tip: ['نصيحة', 'Tip'],
    warning: ['تنبيه', 'Warning'],
    example: ['مثال', 'Example'],
    exercise: ['تمرين', 'Exercise'],
    equation: ['معادلة', 'Equation'],
    qa: ['سؤال وجواب', 'Q&A'],
    video: ['فيديو', 'Video'],
    image: ['صورة', 'Image'],
    link: ['رابط', 'Link'],
    file: ['ملف', 'File'],
};

export default function LessonWizard() {
    const { t, direction } = useLanguage();
    const { user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const [step, setStep] = useState(0);
    const [busy, setBusy] = useState(false);

    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [subjectId, setSubjectId] = useState(params.get('subject') || '');

    const [titleAr, setTitleAr] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [duration, setDuration] = useState('');

    /** Set once the row exists; from then on step 2 updates instead of inserting. */
    const [lessonId, setLessonId] = useState<string | null>(null);

    const [pasteText, setPasteText] = useState('');
    const [createdBlocks, setCreatedBlocks] = useState<Partial<LessonBlock>[]>([]);

    const [settings, setSettings] = useState({
        is_published: false,
        is_paid: true,
        is_free_preview: false,
    });

    const Next = direction === 'rtl' ? ArrowLeft : ArrowRight;
    const Prev = direction === 'rtl' ? ArrowRight : ArrowLeft;

    const STEPS = [
        { ar: 'المادة', en: 'Course' },
        { ar: 'التفاصيل', en: 'Details' },
        { ar: 'المحتوى', en: 'Content' },
        { ar: 'المراجعة', en: 'Review' },
    ];

    useEffect(() => {
        (async () => {
            if (!user) return;
            // Only courses this teacher owns may receive a lesson — RLS rejects
            // anything else (migration 107), so offering one would produce a
            // wizard that fails at the last step. super_admin keeps the full list.
            let query = supabase
                .from('subjects')
                .select('id, title_ar, title_en, is_active')
                .order('title_ar');
            if (!isSuperAdmin) {
                query = query.eq('teacher_id', user.id);
            }
            const { data, error } = await query;
            if (error) {
                toast.error(t('تعذّر تحميل المواد', 'Could not load your courses'), {
                    description: error.message,
                });
            }
            const list = (data as SubjectOption[]) || [];
            setSubjects(list);
            // One course is the common case for a new teacher — preselect it
            // rather than asking a question with a single possible answer.
            if (list.length === 1 && !subjectId) setSubjectId(list[0].id);
            setLoadingSubjects(false);
        })();
    }, [user, isSuperAdmin]);  // eslint-disable-line react-hooks/exhaustive-deps

    const parsed = useMemo(() => parseLessonText(pasteText), [pasteText]);
    const counts = useMemo(() => summariseBlocks(parsed), [parsed]);

    const label = (type: string) => {
        const pair = TYPE_LABELS[type];
        return pair ? t(pair[0], pair[1]) : type;
    };

    const issues = useMemo(
        () => checkLessonReadiness(
            {
                title_ar: titleAr,
                title_en: titleEn,
                duration_minutes: duration ? parseInt(duration, 10) : null,
            },
            createdBlocks,
        ),
        [titleAr, titleEn, duration, createdBlocks],
    );
    const blocked = settings.is_published && hasBlockers(issues);

    const issueText = (code: string, count?: number) => {
        const copy = ISSUE_COPY[code];
        if (!copy) return code;
        const [ar, en] = copy(count ?? 0);
        return t(ar, en);
    };

    /** Create on first pass, update on a return visit. */
    const saveDetails = async (): Promise<boolean> => {
        const durationValue = duration ? parseInt(duration, 10) : null;
        setBusy(true);
        try {
            if (lessonId) {
                const { error } = await writeDb.from('lessons')
                    .update({
                        title_ar: titleAr.trim(),
                        title_en: titleEn.trim() || null,
                        duration_minutes: durationValue,
                    })
                    .eq('id', lessonId);
                if (error) throw error;
                return true;
            }

            const { count } = await supabase
                .from('lessons')
                .select('id', { count: 'exact', head: true })
                .eq('subject_id', subjectId);

            const slug = titleAr.trim().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\wء-ي-]/g, '');

            const { data, error } = await writeDb.from('lessons')
                .insert({
                    subject_id: subjectId,
                    title_ar: titleAr.trim(),
                    title_en: titleEn.trim() || null,
                    duration_minutes: durationValue,
                    slug,
                    created_by: user?.id,
                    sort_order: (count ?? 0) + 1,
                    is_paid: true,
                    is_published: false,
                })
                .select('id')
                .single();
            if (error) throw error;
            setLessonId(data.id);
            return true;
        } catch (err) {
            toast.error(
                isRlsDenial(err)
                    ? t(
                        'لا يمكنك إنشاء درس في هذه المادة. يمكنك التعديل في المواد التي تدرّسها فقط.',
                        'You cannot create a lesson in this course. You can only edit courses you teach.',
                    )
                    : t('تعذّر حفظ الدرس', 'Could not save the lesson'),
                { description: isRlsDenial(err) ? undefined : (err as Error)?.message },
            );
            return false;
        } finally {
            setBusy(false);
        }
    };

    /** Write the pasted blocks. Skipped entirely when the teacher starts blank. */
    const saveContent = async (): Promise<boolean> => {
        if (!lessonId) return false;
        if (!parsed.length) {
            setCreatedBlocks([]);
            return true;
        }
        setBusy(true);
        try {
            // Replace rather than append: stepping back and editing the paste
            // should not leave the first attempt behind.
            await supabase.from('lesson_blocks').delete().eq('lesson_id', lessonId);

            const rows = parsed.map((b: ImportedBlock, i) => ({
                lesson_id: lessonId,
                section_id: null,
                type: b.type,
                sort_order: i,
                content_ar: b.content_ar ?? '',
                content_en: b.content_en ?? null,
                title_ar: b.title_ar ?? null,
                title_en: b.title_en ?? null,
                url: b.url ?? null,
                is_published: true,
            }));

            const { data, error } = await writeDb.from('lesson_blocks')
                .insert(rows).select();
            if (error) throw error;
            setCreatedBlocks((data as Partial<LessonBlock>[]) || []);
            return true;
        } catch (err) {
            toast.error(t('تعذّر حفظ المحتوى', 'Could not save the content'), {
                description: (err as Error)?.message,
            });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const finish = async () => {
        if (!lessonId || blocked) return;
        setBusy(true);
        try {
            const { error } = await writeDb.from('lessons')
                .update({
                    is_published: settings.is_published,
                    is_paid: settings.is_paid,
                    is_free_preview: settings.is_free_preview,
                })
                .eq('id', lessonId);
            if (error) throw error;
            toast.success(
                settings.is_published
                    ? t('تم نشر الدرس', 'Lesson published')
                    : t('تم حفظ الدرس كمسودة', 'Lesson saved as a draft'),
            );
            navigate(`/teacher/lessons/${lessonId}`);
        } catch (err) {
            toast.error(t('تعذّر إنهاء الدرس', 'Could not finish the lesson'), {
                description: (err as Error)?.message,
            });
        } finally {
            setBusy(false);
        }
    };

    const canAdvance = () => {
        if (step === 0) return Boolean(subjectId);
        if (step === 1) return Boolean(titleAr.trim());
        return true;
    };

    const goNext = async () => {
        if (!canAdvance()) return;
        if (step === 1) {
            if (!(await saveDetails())) return;
        }
        if (step === 2) {
            if (!(await saveContent())) return;
        }
        setStep(s => Math.min(s + 1, 3));
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">{t('درس جديد', 'New lesson')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t(
                        'أربع خطوات قصيرة. يمكنك إكمال أي شيء لاحقاً من المحرّر.',
                        'Four short steps. Anything can be finished later in the editor.',
                    )}
                </p>
            </div>

            {/* Stepper */}
            <ol className="flex items-center gap-1.5" aria-label={t('خطوات الإنشاء', 'Creation steps')}>
                {STEPS.map((s, i) => {
                    const done = i < step;
                    const current = i === step;
                    return (
                        <li key={s.en} className="flex-1 flex items-center gap-1.5 min-w-0">
                            <div
                                className={cn(
                                    'flex items-center gap-2 min-w-0',
                                    current ? 'text-foreground' : done ? 'text-foreground/70' : 'text-muted-foreground',
                                )}
                                aria-current={current ? 'step' : undefined}
                            >
                                <span className={cn(
                                    'shrink-0 w-7 h-7 rounded-full border grid place-items-center text-xs font-semibold',
                                    current && 'border-primary bg-primary text-primary-foreground',
                                    done && 'border-primary/40 bg-primary/10',
                                )}>
                                    {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                                </span>
                                <span className="text-xs font-medium truncate hidden sm:inline">
                                    {t(s.ar, s.en)}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <span className={cn('h-px flex-1 min-w-2', done ? 'bg-primary/40' : 'bg-border')} />
                            )}
                        </li>
                    );
                })}
            </ol>

            {/* ── Step 1: which course ── */}
            {step === 0 && (
                <Card className="p-5 space-y-4">
                    <div className="space-y-1">
                        <h2 className="font-semibold">{t('في أي مادة؟', 'Which course?')}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t('اختر المادة التي ينتمي إليها هذا الدرس.', 'Pick the course this lesson belongs to.')}
                        </p>
                    </div>

                    {loadingSubjects ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('جارٍ التحميل...', 'Loading...')}
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="text-center py-8 space-y-3">
                            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                {t('لا توجد مواد بعد. أنشئ مادة أولاً.', 'No courses yet. Create a course first.')}
                            </p>
                            <Button variant="secondary" onClick={() => navigate('/teacher/subjects')}>
                                {t('إلى موادي', 'Go to my courses')}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {subjects.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSubjectId(s.id)}
                                    className={cn(
                                        'text-start p-3 rounded-lg border transition-colors',
                                        subjectId === s.id
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-accent/40',
                                    )}
                                    aria-pressed={subjectId === s.id}
                                >
                                    <span className="block font-medium text-sm">{s.title_ar}</span>
                                    {s.title_en && (
                                        <span className="block text-xs text-muted-foreground">{s.title_en}</span>
                                    )}
                                    {s.is_active === false && (
                                        <Badge variant="outline" className="mt-1.5 text-[10px]">
                                            {t('غير منشورة', 'Unpublished')}
                                        </Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* ── Step 2: title and duration ── */}
            {step === 1 && (
                <Card className="p-5 space-y-4">
                    <div className="space-y-1">
                        <h2 className="font-semibold">{t('ما عنوان الدرس؟', 'What is the lesson called?')}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t('العنوان العربي وحده كافٍ للبدء.', 'The Arabic title alone is enough to start.')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="w-title-ar">
                            {t('عنوان الدرس (عربي)', 'Lesson title (Arabic)')} *
                        </Label>
                        <Input
                            id="w-title-ar"
                            value={titleAr}
                            onChange={e => setTitleAr(e.target.value)}
                            dir="rtl"
                            autoFocus
                            placeholder={t('مثال: المعادلات من الدرجة الأولى', 'e.g. First-degree equations')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="w-title-en">
                            {t('عنوان الدرس (إنجليزي)', 'Lesson title (English)')}
                            <span className="text-muted-foreground font-normal ms-1">
                                {t('— اختياري', '— optional')}
                            </span>
                        </Label>
                        <Input
                            id="w-title-en"
                            value={titleEn}
                            onChange={e => setTitleEn(e.target.value)}
                            dir="ltr"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="w-duration">
                            {t('مدة الدرس بالدقائق', 'Lesson length in minutes')}
                            <span className="text-muted-foreground font-normal ms-1">
                                {t('— اختياري', '— optional')}
                            </span>
                        </Label>
                        <Input
                            id="w-duration"
                            type="number"
                            min="1"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            dir="ltr"
                            className="max-w-[140px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'تُستخدم لحساب تقدّم الطالب بدقّة أكبر.',
                                'Used to measure student progress more accurately.',
                            )}
                        </p>
                    </div>
                </Card>
            )}

            {/* ── Step 3: content ── */}
            {step === 2 && (
                <Card className="p-5 space-y-4">
                    <div className="space-y-1">
                        <h2 className="font-semibold">{t('أضف المحتوى', 'Add the content')}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'إن كان الدرس مكتوباً عندك، الصقه هنا وسنقسّمه تلقائياً. أو ابدأ فارغاً وابنِه في المحرّر.',
                                'If the lesson is already written, paste it and we will split it up. Or start blank and build it in the editor.',
                            )}
                        </p>
                    </div>

                    <Textarea
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder={t('الصق نص الدرس هنا...', 'Paste your lesson text here...')}
                        className="min-h-[180px] text-sm"
                    />

                    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                        {t(
                            'ابدأ السطر بـ «نصيحة:» أو «تنبيه:» أو «مثال:» أو «تمرين:» أو «س:» ليتحوّل إلى النوع المناسب. ورابط يوتيوب أو صورة في سطر مستقلّ يصير عنصر وسائط.',
                            'Start a line with "Tip:", "Warning:", "Example:", "Exercise:" or "Q:" to turn it into that block type. A YouTube or image link on its own line becomes a media block.',
                        )}
                    </div>

                    {parsed.length > 0 ? (
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-muted-foreground me-1">
                                    {t(`${parsed.length} عنصر`, `${parsed.length} blocks`)}
                                </span>
                                {Object.entries(counts).map(([type, n]) => (
                                    <Badge key={type} variant="secondary" className="text-[10px]">
                                        {label(type)} × {n}
                                    </Badge>
                                ))}
                            </div>
                            <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
                                {parsed.map((b, i) => (
                                    <div key={i} className="p-2 flex items-start gap-2 text-xs">
                                        <Badge variant="outline" className="shrink-0 text-[10px]">
                                            {label(b.type)}
                                        </Badge>
                                        <span
                                            className="flex-1 min-w-0 text-muted-foreground break-words"
                                            dir={b.content_ar || b.title_ar ? 'rtl' : 'ltr'}
                                        >
                                            {(b.content_ar || b.content_en || b.title_ar || b.title_en || b.url || '')
                                                .slice(0, 90)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-dashed p-4">
                            <FilePlus2 className="w-4 h-4 shrink-0" />
                            {t(
                                'لا بأس — تابع وستبني الدرس عنصراً بعنصر في المحرّر.',
                                'That is fine — continue and build the lesson block by block in the editor.',
                            )}
                        </div>
                    )}
                </Card>
            )}

            {/* ── Step 4: review and publish ── */}
            {step === 3 && (
                <Card className="p-5 space-y-5">
                    <div className="space-y-1">
                        <h2 className="font-semibold">{t('المراجعة والنشر', 'Review and publish')}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'يمكنك النشر الآن أو حفظه كمسودة وإكماله لاحقاً.',
                                'Publish now, or save it as a draft and finish later.',
                            )}
                        </p>
                    </div>

                    <div className="rounded-lg border p-4 space-y-2">
                        <p className="font-medium text-sm">{titleAr}</p>
                        {titleEn && <p className="text-xs text-muted-foreground">{titleEn}</p>}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            <Badge variant="secondary" className="text-[10px]">
                                {t(`${createdBlocks.length} عنصر`, `${createdBlocks.length} blocks`)}
                            </Badge>
                            {duration && (
                                <Badge variant="secondary" className="text-[10px]">
                                    {t(`${duration} دقيقة`, `${duration} min`)}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {issues.length > 0 && (
                        <div className="rounded-lg border p-4 space-y-2">
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                                {t('جاهزية الدرس', 'Lesson readiness')}
                            </p>
                            <ul className="space-y-1.5">
                                {issues.map((issue, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        {issue.severity === 'blocker' ? (
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                        )}
                                        <span className={issue.severity === 'blocker'
                                            ? 'text-destructive'
                                            : 'text-muted-foreground'}>
                                            {issueText(issue.code, issue.count)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <Label htmlFor="w-pub" className="text-sm">{t('نشر الآن', 'Publish now')}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('جعل الدرس مرئياً للطلاب', 'Make the lesson visible to students')}
                                </p>
                            </div>
                            <Switch
                                id="w-pub"
                                checked={settings.is_published}
                                onCheckedChange={v => setSettings(s => ({ ...s, is_published: v }))}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <Label htmlFor="w-free" className="text-sm">{t('معاينة مجانية', 'Free preview')}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('يفتح هذا الدرس لغير المشتركين', 'Opens this lesson to people who have not bought the course')}
                                </p>
                            </div>
                            <Switch
                                id="w-free"
                                checked={settings.is_free_preview}
                                onCheckedChange={v => setSettings(s => ({ ...s, is_free_preview: v }))}
                            />
                        </div>
                    </div>

                    {blocked && (
                        <p className="text-xs text-destructive">
                            {t(
                                'أصلح النقاط الحمراء في المحرّر، أو احفظه كمسودة الآن.',
                                'Fix the items in red in the editor, or save it as a draft for now.',
                            )}
                        </p>
                    )}
                </Card>
            )}

            {/* Footer navigation */}
            <div className="flex items-center justify-between gap-3">
                <Button
                    variant="ghost"
                    onClick={() => (step === 0 ? navigate('/teacher/lessons') : setStep(s => s - 1))}
                    disabled={busy}
                >
                    <Prev className="w-4 h-4 me-1.5" />
                    {step === 0 ? t('إلغاء', 'Cancel') : t('السابق', 'Back')}
                </Button>

                <div className="flex items-center gap-2">
                    {step === 3 && lessonId && (
                        <Button
                            variant="secondary"
                            onClick={() => navigate(`/teacher/lessons/${lessonId}`)}
                            disabled={busy}
                        >
                            {t('إلى المحرّر', 'Open the editor')}
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button onClick={goNext} disabled={!canAdvance() || busy}>
                            {busy && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
                            {step === 2 && parsed.length > 0 && !busy && <Wand2 className="w-4 h-4 me-1.5" />}
                            {step === 2 && parsed.length > 0
                                ? t(`أضف ${parsed.length} عنصر`, `Add ${parsed.length} blocks`)
                                : t('التالي', 'Next')}
                            {!busy && <Next className="w-4 h-4 ms-1.5" />}
                        </Button>
                    ) : (
                        <Button onClick={finish} disabled={busy || blocked}>
                            {busy
                                ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                                : <Sparkles className="w-4 h-4 me-1.5" />}
                            {settings.is_published
                                ? t('نشر الدرس', 'Publish lesson')
                                : t('حفظ كمسودة', 'Save as draft')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
