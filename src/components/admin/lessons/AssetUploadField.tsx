/**
 * The upload control used by the image / video / file lesson blocks.
 *
 * Upload is the primary action and pasting a URL is the fallback, which is
 * the opposite of how these blocks worked before — a teacher's content is
 * normally a photo or a PDF on the device in front of them, not something
 * they have already hosted somewhere.
 *
 * On a phone the image kind offers "Take photo" (an input with `capture`,
 * which opens the camera directly) alongside "Choose file". Desktop browsers
 * ignore `capture` and show a normal picker, so one component covers both.
 */
import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Upload, Camera, Link as LinkIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ASSET_RULES,
    LessonAssetKind,
    LessonUploadError,
    formatBytes,
    uploadLessonAsset,
} from '@/lib/lessonUploads';

interface AssetUploadFieldProps {
    kind: LessonAssetKind;
    url: string;
    onChange: (url: string) => void;
    lessonId?: string | null;
    teacherId?: string | null;
    /** Rendered under the controls, e.g. a preview. */
    children?: React.ReactNode;
    /** Placeholder for the URL fallback input. */
    urlPlaceholder?: string;
}

export default function AssetUploadField({
    kind,
    url,
    onChange,
    lessonId,
    teacherId,
    children,
    urlPlaceholder,
}: AssetUploadFieldProps) {
    const { t, language } = useLanguage();
    const [uploading, setUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [draftUrl, setDraftUrl] = useState(url);
    const [dragging, setDragging] = useState(false);
    const pickerRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    const rule = ASSET_RULES[kind];
    const canUpload = Boolean(lessonId && teacherId);

    const describeError = (err: unknown): { title: string; description?: string } => {
        if (err instanceof LessonUploadError) {
            switch (err.code) {
                case 'type':
                    return {
                        title: t('نوع الملف غير مدعوم', 'Unsupported file type'),
                        description: t(`المسموح: ${err.detail}`, `Allowed: ${err.detail}`),
                    };
                case 'size':
                    return {
                        title: t('حجم الملف كبير جداً', 'File is too large'),
                        description: t(`الحد الأقصى ${err.detail}`, `Maximum ${err.detail}`),
                    };
                case 'empty':
                    return { title: t('الملف فارغ', 'The file is empty') };
                default:
                    return {
                        title: t('فشل رفع الملف', 'Upload failed'),
                        description: err.detail,
                    };
            }
        }
        return {
            title: t('فشل رفع الملف', 'Upload failed'),
            description: err instanceof Error ? err.message : undefined,
        };
    };

    const handleFile = async (file: File | undefined | null) => {
        if (!file) return;
        if (!canUpload) {
            toast.error(t('احفظ الدرس أولاً قبل رفع الملفات', 'Save the lesson before uploading files'));
            return;
        }
        setUploading(true);
        try {
            const publicUrl = await uploadLessonAsset({
                file,
                kind,
                lessonId: lessonId!,
                teacherId: teacherId!,
            });
            onChange(publicUrl);
            setDraftUrl(publicUrl);
            toast.success(t('تم رفع الملف', 'File uploaded'));
        } catch (err) {
            const { title, description } = describeError(err);
            toast.error(title, { description });
        } finally {
            setUploading(false);
        }
    };

    const onPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        void handleFile(e.target.files?.[0]);
        e.target.value = '';
    };

    const commitUrl = () => {
        if (draftUrl !== url) onChange(draftUrl.trim());
    };

    const clear = () => {
        onChange('');
        setDraftUrl('');
    };

    return (
        <div className="space-y-2">
            <input
                ref={pickerRef}
                type="file"
                accept={rule.accept}
                onChange={onPicked}
                className="hidden"
            />
            {kind === 'image' && (
                <input
                    ref={cameraRef}
                    type="file"
                    accept={rule.accept}
                    capture="environment"
                    onChange={onPicked}
                    className="hidden"
                />
            )}

            {!url && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        void handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                        'rounded-md border-2 border-dashed p-4 text-center transition-colors',
                        dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                    )}
                >
                    {uploading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('جارٍ الرفع...', 'Uploading...')}
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => pickerRef.current?.click()}
                                >
                                    <Upload className="w-4 h-4 me-1.5" />
                                    {t('اختر ملفاً', 'Choose file')}
                                </Button>
                                {kind === 'image' && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => cameraRef.current?.click()}
                                    >
                                        <Camera className="w-4 h-4 me-1.5" />
                                        {t('التقط صورة', 'Take photo')}
                                    </Button>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                {t(
                                    `${rule.label} — حتى ${formatBytes(rule.maxBytes)}`,
                                    `${rule.label} — up to ${formatBytes(rule.maxBytes)}`,
                                )}
                            </p>
                            {!canUpload && (
                                <p className="text-[11px] text-amber-600 mt-1">
                                    {t('احفظ الدرس أولاً لتمكين الرفع', 'Save the lesson to enable uploads')}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}

            {url && (
                <div className="flex items-center gap-2">
                    <p className="flex-1 text-[11px] text-muted-foreground truncate" dir="ltr">
                        {url}
                    </p>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => pickerRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : t('استبدال', 'Replace')}
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={clear}
                        aria-label={t('إزالة الملف', 'Remove file')}
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}

            {children}

            {!showUrlInput && !url && (
                <button
                    type="button"
                    onClick={() => setShowUrlInput(true)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 inline-flex items-center gap-1"
                >
                    <LinkIcon className="w-3 h-3" />
                    {t('أو الصق رابطاً', 'Or paste a link')}
                </button>
            )}

            {(showUrlInput || url) && (
                <Input
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    onBlur={commitUrl}
                    placeholder={urlPlaceholder || 'https://...'}
                    dir="ltr"
                    className="h-8 text-xs"
                    lang={language}
                />
            )}
        </div>
    );
}
