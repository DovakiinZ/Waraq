/**
 * "Paste a lesson" — the fast path into an empty lesson.
 *
 * A teacher pastes the text of a lesson they already wrote (Word, a PDF, a
 * WhatsApp message, their own notes) and gets structured blocks in one step,
 * instead of choosing a type from eleven options for every paragraph.
 *
 * The preview is the whole point: the teacher sees exactly what will be
 * created before anything is written, so a wrong guess by the parser costs a
 * glance rather than a cleanup.
 */
import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2 } from 'lucide-react';
import { ImportedBlock, parseLessonText, summariseBlocks } from '@/lib/lessonImport';

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

interface ImportLessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (blocks: ImportedBlock[]) => Promise<void>;
}

export default function ImportLessonDialog({ open, onOpenChange, onImport }: ImportLessonDialogProps) {
    const { t } = useLanguage();
    const [text, setText] = useState('');
    const [importing, setImporting] = useState(false);

    const blocks = useMemo(() => parseLessonText(text), [text]);
    const counts = useMemo(() => summariseBlocks(blocks), [blocks]);

    const label = (type: string) => {
        const pair = TYPE_LABELS[type];
        return pair ? t(pair[0], pair[1]) : type;
    };

    const preview = (block: ImportedBlock) => {
        const body = block.content_ar || block.content_en || block.title_ar || block.title_en || block.url || '';
        return body.length > 90 ? `${body.slice(0, 90)}…` : body;
    };

    const handleImport = async () => {
        if (!blocks.length) return;
        setImporting(true);
        try {
            await onImport(blocks);
            setText('');
            onOpenChange(false);
        } finally {
            setImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        {t('لصق درس', 'Paste a lesson')}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            'الصق نص الدرس وسنقسّمه إلى محتوى جاهز. اكتب «نصيحة:» أو «تمرين:» أو «س:» في بداية السطر ليتحول إلى النوع المناسب.',
                            'Paste your lesson text and we will split it into content blocks. Start a line with "Tip:", "Exercise:" or "Q:" to turn it into that block type.',
                        )}
                    </DialogDescription>
                </DialogHeader>

                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t(
                        'الصق نص الدرس هنا...',
                        'Paste your lesson text here...',
                    )}
                    className="min-h-[160px] max-h-[220px] text-sm"
                />

                {blocks.length > 0 && (
                    <div className="flex-1 min-h-0 flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-muted-foreground me-1">
                                {t(`${blocks.length} عنصر`, `${blocks.length} blocks`)}
                            </span>
                            {Object.entries(counts).map(([type, n]) => (
                                <Badge key={type} variant="secondary" className="text-[10px]">
                                    {label(type)} × {n}
                                </Badge>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto border rounded-md divide-y">
                            {blocks.map((block, i) => (
                                <div key={i} className="p-2 flex items-start gap-2 text-xs">
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                        {label(block.type)}
                                    </Badge>
                                    <span
                                        className="flex-1 min-w-0 text-muted-foreground break-words"
                                        dir={block.content_ar || block.title_ar ? 'rtl' : 'ltr'}
                                    >
                                        {preview(block)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
                        {t('إلغاء', 'Cancel')}
                    </Button>
                    <Button onClick={handleImport} disabled={!blocks.length || importing}>
                        {importing && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                        {t(
                            `إضافة ${blocks.length} عنصر`,
                            `Add ${blocks.length} block${blocks.length === 1 ? '' : 's'}`,
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
