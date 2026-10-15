import { useState } from 'react';
import { Lesson, LessonSection, LessonBlock } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, CheckCircle2, Globe, Lock, Coins, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { ISSUE_COPY, ReadinessIssue, checkLessonReadiness, hasBlockers } from '@/lib/lessonReadiness';

interface PublishLessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lesson: Lesson;
    sections: LessonSection[];
    blocks: LessonBlock[];
    onPublish: (settings: { is_published: boolean; is_paid: boolean; is_free_preview: boolean }) => Promise<void>;
}

export default function PublishLessonDialog({
    open,
    onOpenChange,
    lesson,
    sections,
    blocks,
    onPublish
}: PublishLessonDialogProps) {
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settings, setSettings] = useState({
        is_published: lesson.is_published,
        is_paid: lesson.is_paid,
        is_free_preview: lesson.is_free_preview || false,
    });

    const issues = checkLessonReadiness(lesson, blocks);
    // Blockers only matter when the teacher is actually making it visible.
    // Saving a draft with gaps is the normal way to work.
    const blocked = settings.is_published && hasBlockers(issues);

    const issueText = (issue: ReadinessIssue) => {
        const copy = ISSUE_COPY[issue.code];
        if (!copy) return issue.code;
        const [ar, en] = copy(issue.count ?? 0);
        return t(ar, en);
    };

    const handlePublish = async () => {
        if (blocked) return;
        setIsSubmitting(true);
        try {
            await onPublish(settings);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-border">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                        {t('مراجعة ونشر الدرس', 'Review & Publish Lesson')}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Side: Preview */}
                    <div className="flex-1 bg-muted/30 border-e border-border overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                                <Eye className="w-4 h-4" />
                                {t('معاينة المحتوى', 'Content Preview')}
                            </span>
                            <Badge variant="outline">{blocks.length} {t('كتلة', 'blocks')}</Badge>
                        </div>
                        <ScrollArea className="flex-1 p-6">
                            <div className="max-w-2xl mx-auto space-y-8">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold">{lesson.title_ar}</h1>
                                    {lesson.title_en && <p className="text-muted-foreground">{lesson.title_en}</p>}
                                </div>

                                {sections.map(section => {
                                    const sectionBlocks = blocks.filter(b => b.section_id === section.id);
                                    if (sectionBlocks.length === 0) return null;

                                    return (
                                        <div key={section.id} className="space-y-4">
                                            <h2 className="text-xl font-semibold border-b border-border pb-2">
                                                {section.title_ar}
                                            </h2>
                                            <div className="space-y-6">
                                                {sectionBlocks.map(block => (
                                                    <PreviewBlock key={block.id} block={block} />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Blocks without sections */}
                                {blocks.filter(b => !b.section_id).length > 0 && (
                                    <div className="space-y-6">
                                        {blocks.filter(b => !b.section_id).map(block => (
                                            <PreviewBlock key={block.id} block={block} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Side: Settings */}
                    <div className="w-80 p-6 space-y-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                                {t('إعدادات الظهور', 'Visibility Settings')}
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2 cursor-pointer">
                                            <Globe className="w-4 h-4 text-primary" />
                                            {t('نشر الآن', 'Publish Now')}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {t('جعل الدرس مرئياً للطلاب فوراً', 'Make lesson visible to students immediately')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.is_published}
                                        onCheckedChange={(val) => setSettings({ ...settings, is_published: val })}
                                    />
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2 cursor-pointer">
                                            <Lock className="w-4 h-4 text-amber-500" />
                                            {t('محتوى مدفوع', 'Paid Content')}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {t('يتطلب اشتراكاً نشطاً للمشاهدة', 'Requires active subscription to view')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.is_paid}
                                        onCheckedChange={(val) => setSettings({ ...settings, is_paid: val })}
                                    />
                                </div>

                                {settings.is_paid && (
                                    <div className="flex items-start justify-between gap-4 pt-2 border-t border-border mt-2">
                                        <div className="space-y-0.5">
                                            <Label className="flex items-center gap-2 cursor-pointer">
                                                <Coins className="w-4 h-4 text-emerald-500" />
                                                {t('معاينة مجانية', 'Free Preview')}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('السماح بمشاهدة مقتطفات مجاناً', 'Allow viewing snippets for free')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.is_free_preview}
                                            onCheckedChange={(val) => setSettings({ ...settings, is_free_preview: val })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Readiness checklist — blockers are what students
                            would actually see broken; warnings are the
                            teacher's call and never prevent publishing. */}
                        {issues.length > 0 && (
                            <div className="p-4 rounded-lg border space-y-2">
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
                                                {issueText(issue)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {blocked && (
                                    <p className="text-xs text-destructive pt-1">
                                        {t(
                                            'أصلح النقاط الحمراء أو احفظ الدرس كمسودة.',
                                            'Fix the items in red, or save the lesson as a draft.',
                                        )}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                            <p className="text-xs font-medium text-primary uppercase">
                                {t('ملخص الحالة', 'Status Summary')}
                            </p>
                            <p className="text-sm">
                                {settings.is_published ? (
                                    <span className="text-green-600 font-medium">● {t('سيتم النشر', 'Will be published')}</span>
                                ) : (
                                    <span className="text-muted-foreground">○ {t('سيبقى مسودة', 'Will stay as draft')}</span>
                                )}
                            </p>
                            <p className="text-sm">
                                {settings.is_paid ? (
                                    <span className="text-amber-600 font-medium">● {t('محتوى مدفوع', 'Paid content')}</span>
                                ) : (
                                    <span className="text-emerald-600 font-medium">● {t('محتوى مجاني', 'Free content')}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t border-border bg-muted/20 backdrop-blur flex items-center justify-between sm:justify-between px-6">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        {t('إلغاء', 'Cancel')}
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={isSubmitting || blocked}
                        className="min-w-[140px]"
                        title={blocked
                            ? t('أصلح النقاط الحمراء أولاً', 'Fix the items in red first')
                            : undefined}
                    >
                        {isSubmitting
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : settings.is_published
                                ? t('تأكيد ونشر الدرس', 'Confirm & Publish Lesson')
                                : t('حفظ كمسودة', 'Save as draft')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Internal PreviewBlock (copied/adapted from LessonEditor for dependency-free use)
// In a real project, this should be a shared component.
function PreviewBlock({ block }: { block: LessonBlock }) {
    const { t } = useLanguage();

    const getYoutubeId = (url: string) => {
        const match = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
        return (match && match[1].length === 11) ? match[1] : null;
    };

    switch (block.type) {
        case 'rich_text':
            return (
                <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'tip':
            return (
                <div className="bg-blue-50 dark:bg-blue-950/30 border-s-4 border-blue-500 p-3 rounded-e-md">
                    <p className="text-blue-600 font-semibold text-xs mb-1 uppercase tracking-tight">{t('نصيحة', 'Tip')}</p>
                    <p className="text-xs whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'warning':
            return (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border-s-4 border-yellow-500 p-3 rounded-e-md">
                    <p className="text-yellow-600 font-semibold text-xs mb-1 uppercase tracking-tight">{t('تنبيه', 'Warning')}</p>
                    <p className="text-xs whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'example':
            return (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border-s-4 border-emerald-500 p-3 rounded-e-md">
                    <p className="text-emerald-600 font-semibold text-xs mb-1 uppercase tracking-tight">{t('مثال', 'Example')}</p>
                    <p className="text-xs whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'exercise':
            return (
                <div className="bg-orange-50 dark:bg-orange-950/30 border-s-4 border-orange-500 p-3 rounded-e-md">
                    <p className="text-orange-600 font-semibold text-xs mb-1 uppercase tracking-tight">{t('تمرين', 'Exercise')}</p>
                    <p className="text-xs whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'equation':
            return (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                    {(block.title_ar || block.title_en) && (
                        <p className="text-[10px] text-muted-foreground mb-1">{t(block.title_ar || '', block.title_en || '')}</p>
                    )}
                    <div className="text-center text-base font-mono py-1">
                        {t(block.content_ar || '', block.content_en || block.content_ar || '')}
                    </div>
                </div>
            );
        case 'qa':
            return (
                <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                        <span className="text-pink-500 font-bold text-xs">Q:</span>
                        <p className="text-xs font-medium">{t(block.title_ar || '', block.title_en || '')}</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold text-xs">A:</span>
                        <p className="text-xs whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                    </div>
                </div>
            );
        case 'video': {
            const ytId = block.url ? getYoutubeId(block.url) : null;
            if (ytId) {
                return (
                    <div className="space-y-1.5">
                        {(block.title_ar || block.title_en) && (
                            <h3 className="text-xs font-semibold">{t(block.title_ar || '', block.title_en || '')}</h3>
                        )}
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <iframe width="100%" height="100%"
                                src={`https://www.youtube.com/embed/${ytId}`}
                                title="Preview" frameBorder="0" allowFullScreen
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                );
            }
            return (
                <div className="p-3 bg-secondary/20 rounded-lg">
                    <p className="text-blue-500 underline text-xs">{block.url}</p>
                </div>
            );
        }
        case 'image':
            return block.url ? (
                <div className="rounded-lg overflow-hidden border border-border">
                    <img src={block.url} alt="" className="max-w-full h-auto mx-auto" />
                </div>
            ) : null;
        case 'file':
            return (
                <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-blue-500 text-[10px] font-bold">📎</span>
                    </div>
                    <div>
                        <p className="text-xs font-medium">{t(block.title_ar || 'ملف مرفق', block.title_en || 'Attached File')}</p>
                        <p className="text-[10px] text-muted-foreground">{t('اضغط للتحميل', 'Click to download')}</p>
                    </div>
                </div>
            );
        case 'link':
            return (
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-500 text-sm">🔗</span>
                    <div>
                        <p className="text-xs font-medium">{t(block.title_ar || '', block.title_en || block.url || '')}</p>
                        {(block.content_ar || block.content_en) && (
                            <p className="text-[10px] text-muted-foreground">{t(block.content_ar || '', block.content_en || '')}</p>
                        )}
                    </div>
                </div>
            );
        default:
            return null;
    }
}
