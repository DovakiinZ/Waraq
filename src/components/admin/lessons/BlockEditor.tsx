import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LessonBlock, LessonBlockType } from '@/types/database';
import AssetUploadField from './AssetUploadField';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import AIBlockAssistant from './AIBlockAssistant';
import {
    GripVertical, X, Type, Image as ImageIcon, Video, FileText,
    Link as LinkIcon, AlertTriangle, Lightbulb, Plus, Eye, EyeOff,
    BookOpen, PenLine, Sigma, HelpCircle, Beaker, Sparkles, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

/**
 * The lesson id the media blocks upload into. Passed by context rather than
 * threaded through SortableBlock -> BlockRenderer -> each block component,
 * which would mean editing eight signatures to deliver one string.
 */
const LessonAssetContext = createContext<{ lessonId?: string | null }>({});

/** lessonId + the signed-in teacher's uid, for AssetUploadField. */
function useLessonAssetTarget() {
    const { lessonId } = useContext(LessonAssetContext);
    const { profile } = useAuth();
    return { lessonId, teacherId: profile?.id ?? null };
}

interface BlockEditorProps {
    blocks: LessonBlock[];
    onReorder: (blocks: LessonBlock[]) => void;
    onCreateBlock: (type: LessonBlockType) => void;
    onUpdateBlock: (id: string, data: Partial<LessonBlock>) => void;
    onDeleteBlock: (id: string) => void;
    /** Required for media uploads; without it the blocks fall back to URL entry. */
    lessonId?: string | null;
    /** Opens the paste-a-lesson dialog. Omitted = button hidden. */
    onRequestImport?: () => void;
}

export default function BlockEditor({ blocks, onReorder, onCreateBlock, onUpdateBlock, onDeleteBlock, lessonId, onRequestImport }: BlockEditorProps) {
    const { t } = useLanguage();
    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = blocks.findIndex((b) => b.id === active.id);
            const newIndex = blocks.findIndex((b) => b.id === over?.id);
            onReorder(arrayMove(blocks, oldIndex, newIndex));
        }
    };

    return (
        <LessonAssetContext.Provider value={{ lessonId }}>
        <div className="space-y-6 pb-20">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {blocks.map((block) => (
                            <SortableBlock
                                key={block.id}
                                block={block}
                                onUpdate={onUpdateBlock}
                                onDelete={onDeleteBlock}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add Block Area */}
            <div className="flex flex-wrap justify-center items-center gap-2 mt-8 px-2">
                <AddBlockMenu onAdd={onCreateBlock} />
                {onRequestImport && (
                    <Button
                        variant="ghost"
                        onClick={onRequestImport}
                        className="gap-2 h-12 md:h-9 w-full md:w-auto"
                    >
                        <Wand2 className="w-5 h-5 md:w-4 md:h-4" />
                        {t('لصق درس', 'Paste a lesson')}
                    </Button>
                )}
            </div>
        </div>
        </LessonAssetContext.Provider>
    );
}

// ─── Block Type Config ──────────────────────────────────────────────────────

const BLOCK_TYPE_CONFIG: Record<LessonBlockType, { icon: any; label_ar: string; label_en: string; color: string }> = {
    rich_text: { icon: Type, label_ar: 'نص', label_en: 'Text', color: 'text-foreground' },
    video: { icon: Video, label_ar: 'فيديو', label_en: 'Video', color: 'text-red-500' },
    image: { icon: ImageIcon, label_ar: 'صورة', label_en: 'Image', color: 'text-green-500' },
    file: { icon: FileText, label_ar: 'ملف', label_en: 'File', color: 'text-blue-500' },
    link: { icon: LinkIcon, label_ar: 'رابط', label_en: 'Link', color: 'text-purple-500' },
    tip: { icon: Lightbulb, label_ar: 'نصيحة', label_en: 'Tip', color: 'text-blue-500' },
    warning: { icon: AlertTriangle, label_ar: 'تنبيه', label_en: 'Warning', color: 'text-yellow-500' },
    example: { icon: Beaker, label_ar: 'مثال', label_en: 'Example', color: 'text-emerald-500' },
    exercise: { icon: PenLine, label_ar: 'تمرين', label_en: 'Exercise', color: 'text-orange-500' },
    equation: { icon: Sigma, label_ar: 'معادلة', label_en: 'Equation', color: 'text-indigo-500' },
    qa: { icon: HelpCircle, label_ar: 'سؤال وجواب', label_en: 'Q&A', color: 'text-pink-500' },
};

// ─── Add Block Menu ─────────────────────────────────────────────────────────

function AddBlockMenu({ onAdd }: { onAdd: (type: LessonBlockType) => void }) {
    const { t } = useLanguage();

    const textTypes: LessonBlockType[] = ['rich_text', 'tip', 'warning', 'example', 'exercise'];
    const mediaTypes: LessonBlockType[] = ['video', 'image', 'file', 'link'];
    const advancedTypes: LessonBlockType[] = ['equation', 'qa'];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-dashed w-full md:w-auto h-12 md:h-9">
                    <Plus className="w-5 h-5 md:w-4 md:h-4" />
                    {t('إضافة محتوى', 'Add Content')}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t('نصوص', 'Text')}
                </DropdownMenuLabel>
                {textTypes.map(type => {
                    const cfg = BLOCK_TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                        <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
                            <Icon className={cn("w-4 h-4 me-2", cfg.color)} />
                            {t(cfg.label_ar, cfg.label_en)}
                        </DropdownMenuItem>
                    );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t('وسائط', 'Media')}
                </DropdownMenuLabel>
                {mediaTypes.map(type => {
                    const cfg = BLOCK_TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                        <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
                            <Icon className={cn("w-4 h-4 me-2", cfg.color)} />
                            {t(cfg.label_ar, cfg.label_en)}
                        </DropdownMenuItem>
                    );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t('متقدم', 'Advanced')}
                </DropdownMenuLabel>
                {advancedTypes.map(type => {
                    const cfg = BLOCK_TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                        <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
                            <Icon className={cn("w-4 h-4 me-2", cfg.color)} />
                            {t(cfg.label_ar, cfg.label_en)}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── Sortable Block Wrapper ─────────────────────────────────────────────────

function SortableBlock({
    block,
    onUpdate,
    onDelete
}: {
    block: LessonBlock;
    onUpdate: (id: string, data: Partial<LessonBlock>) => void;
    onDelete: (id: string) => void;
}) {
    const { t } = useLanguage();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
    const [lang, setLang] = useState<'ar' | 'en'>('ar');

    const cfg = BLOCK_TYPE_CONFIG[block.type] || BLOCK_TYPE_CONFIG.rich_text;
    const Icon = cfg.icon;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn(
            "group relative ps-10 pe-2 transition-all",
            !block.is_published && "opacity-60"
        )}>
            {/* Drag Handle */}
            <div 
                {...attributes} 
                {...listeners} 
                className={cn(
                    "absolute start-0 top-0 bottom-0 w-8 flex items-center justify-center hover:bg-accent cursor-grab transition-opacity z-10",
                    "md:opacity-0 md:group-hover:opacity-100" // Hide on desktop hover, show always on mobile
                )}
            >
                <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Block Content Wrapper */}
            <div className="min-h-[3rem] rounded-lg border border-transparent group-hover:border-border/50 bg-background transition-colors p-1 relative">
                {/* Block Header */}
                <div className="flex flex-wrap items-center justify-between px-2 py-1 mb-1 gap-2">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {t(cfg.label_ar, cfg.label_en)}
                        </span>
                    </div>
                    <div className={cn(
                        "flex items-center gap-2 transition-opacity",
                        "md:opacity-0 md:group-hover:opacity-100" // Hide on desktop hover, show always on mobile
                    )}>
                        {/* AR/EN tabs */}
                        <div className="flex bg-secondary rounded-md overflow-hidden me-1 h-8 md:h-7">
                            <button
                                onClick={() => setLang('ar')}
                                className={cn(
                                    "px-3 md:px-2 py-0.5 text-xs md:text-[10px] font-medium transition-colors",
                                    lang === 'ar' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >AR</button>
                            <button
                                onClick={() => setLang('en')}
                                className={cn(
                                    "px-3 md:px-2 py-0.5 text-xs md:text-[10px] font-medium transition-colors",
                                    lang === 'en' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >EN</button>
                        </div>
                        {/* Publish toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 md:h-7 md:w-7"
                            onClick={() => onUpdate(block.id, { is_published: !block.is_published })}
                            title={block.is_published ? t('إخفاء', 'Unpublish') : t('نشر', 'Publish')}
                        >
                            {block.is_published
                                ? <Eye className="w-4 h-4 md:w-3.5 md:h-3.5 text-green-500" />
                                : <EyeOff className="w-4 h-4 md:w-3.5 md:h-3.5 text-muted-foreground" />
                            }
                        </Button>
                        {/* Delete */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 md:h-7 md:w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(block.id)}
                        >
                            <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </Button>
                    </div>
                </div>

                <BlockRenderer block={block} updateBlock={onUpdate} lang={lang} />

                {/* AI Assistant */}
                <div className="px-2 py-1">
                    <AIBlockAssistant
                        block={block}
                        lang={lang}
                        onApply={(content) => {
                            const field = lang === 'ar' ? 'content_ar' : 'content_en';
                            onUpdate(block.id, { [field]: content });
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Block Renderer (routes to type-specific editor) ────────────────────────

function BlockRenderer({
    block,
    updateBlock,
    lang,
}: {
    block: LessonBlock;
    updateBlock: (id: string, data: Partial<LessonBlock>) => void;
    lang: 'ar' | 'en';
}) {
    switch (block.type) {
        case 'rich_text':
        case 'tip':
        case 'warning':
        case 'example':
        case 'exercise':
            return <TextContentBlock block={block} updateBlock={updateBlock} lang={lang} />;
        case 'video':
            return <VideoBlock block={block} updateBlock={updateBlock} lang={lang} />;
        case 'image':
            return <ImageBlock block={block} updateBlock={updateBlock} lang={lang} />;
        case 'file':
            return <FileBlock block={block} updateBlock={updateBlock} lang={lang} />;
        case 'link':
            return <LinkBlock block={block} updateBlock={updateBlock} lang={lang} />;
        case 'equation':
            return <EquationBlock block={block} updateBlock={updateBlock} lang={lang} />;
        case 'qa':
            return <QABlock block={block} updateBlock={updateBlock} lang={lang} />;
        default:
            return <div className="p-4 text-sm text-muted-foreground bg-accent/20 rounded">Unknown: {block.type}</div>;
    }
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function useBlockContent(block: LessonBlock, lang: 'ar' | 'en', updateBlock: (id: string, data: Partial<LessonBlock>) => void) {
    const contentField = lang === 'ar' ? 'content_ar' : 'content_en';
    const titleField = lang === 'ar' ? 'title_ar' : 'title_en';
    const [localContent, setLocalContent] = useState(block[contentField] || '');
    const [localTitle, setLocalTitle] = useState(block[titleField] || '');

    useEffect(() => {
        setLocalContent(block[contentField] || '');
        setLocalTitle(block[titleField] || '');
    }, [block[contentField], block[titleField], lang]);

    const commitContent = useCallback(() => {
        if (localContent !== (block[contentField] || '')) {
            updateBlock(block.id, { [contentField]: localContent });
        }
    }, [localContent, block, contentField, updateBlock]);

    const commitTitle = useCallback(() => {
        if (localTitle !== (block[titleField] || '')) {
            updateBlock(block.id, { [titleField]: localTitle });
        }
    }, [localTitle, block, titleField, updateBlock]);

    return { localContent, setLocalContent, commitContent, localTitle, setLocalTitle, commitTitle };
}

// ─── Text-based blocks (rich_text, tip, warning, example, exercise) ─────────

function TextContentBlock({ block, updateBlock, lang }: { block: LessonBlock; updateBlock: (id: string, data: Partial<LessonBlock>) => void; lang: 'ar' | 'en' }) {
    const { t } = useLanguage();
    const { localContent, setLocalContent, commitContent } = useBlockContent(block, lang, updateBlock);

    const styles: Record<string, string> = {
        'rich_text': '',
        'tip': 'bg-blue-50 dark:bg-blue-950/30 border-s-4 border-blue-500 p-4',
        'warning': 'bg-yellow-50 dark:bg-yellow-950/30 border-s-4 border-yellow-500 p-4',
        'example': 'bg-emerald-50 dark:bg-emerald-950/30 border-s-4 border-emerald-500 p-4',
        'exercise': 'bg-orange-50 dark:bg-orange-950/30 border-s-4 border-orange-500 p-4',
    };

    return (
        <div className={cn("relative rounded-md", styles[block.type] || '')}>
            <Textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onBlur={commitContent}
                placeholder={lang === 'ar' ? 'اكتب هنا...' : 'Type here...'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className={cn(
                    "min-h-[120px] resize-y border-none shadow-none focus-visible:ring-0 px-0 bg-transparent",
                    block.type === 'rich_text' ? "text-base" : "text-sm",
                    !localContent && "italic"
                )}
            />
        </div>
    );
}

// ─── Video Block ────────────────────────────────────────────────────────────

function VideoBlock({ block, updateBlock, lang }: { block: LessonBlock; updateBlock: (id: string, data: Partial<LessonBlock>) => void; lang: 'ar' | 'en' }) {
    const { t } = useLanguage();
    const { lessonId, teacherId } = useLessonAssetTarget();
    const { localTitle, setLocalTitle, commitTitle } = useBlockContent(block, lang, updateBlock);

    const url = block.url || '';

    const getYoutubeId = (urlStr: string) => {
        const match = urlStr.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
        return (match && match[1].length === 11) ? match[1] : null;
    };

    const ytId = url ? getYoutubeId(url) : null;
    // An uploaded clip is a direct file URL, so it plays in a <video>; a
    // YouTube link has to go through the iframe embed.
    const isDirectVideo = Boolean(url) && !ytId;

    return (
        <div className="p-3 space-y-2">
            <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={commitTitle}
                placeholder={lang === 'ar' ? 'عنوان الفيديو (اختياري)' : 'Video title (optional)'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="h-8 text-sm font-medium border-none shadow-none focus-visible:ring-1 bg-transparent"
            />
            <AssetUploadField
                kind="video"
                url={url}
                onChange={(next) => updateBlock(block.id, { url: next })}
                lessonId={lessonId}
                teacherId={teacherId}
                urlPlaceholder="https://youtube.com/..."
            >
                {ytId && (
                    <div className="aspect-video bg-black rounded-md overflow-hidden mt-1">
                        <iframe
                            width="100%" height="100%"
                            src={`https://www.youtube.com/embed/${ytId}`}
                            title={t('معاينة', 'Preview')} frameBorder="0" allowFullScreen
                            className="w-full h-full"
                        />
                    </div>
                )}
                {isDirectVideo && (
                    <video src={url} controls className="w-full max-h-48 rounded-md bg-black mt-1" />
                )}
            </AssetUploadField>
            <p className="text-[11px] text-muted-foreground">
                {t(
                    'للدروس الطويلة استخدم رابط يوتيوب — أسرع للطلاب وبدون حد للحجم.',
                    'For long lessons use a YouTube link — faster for students and no size limit.',
                )}
            </p>
        </div>
    );
}

// ─── Image Block ────────────────────────────────────────────────────────────

function ImageBlock({ block, updateBlock, lang }: { block: LessonBlock; updateBlock: (id: string, data: Partial<LessonBlock>) => void; lang: 'ar' | 'en' }) {
    const { t } = useLanguage();
    const { lessonId, teacherId } = useLessonAssetTarget();
    const { localTitle, setLocalTitle, commitTitle } = useBlockContent(block, lang, updateBlock);

    return (
        <div className="p-3 space-y-2">
            <AssetUploadField
                kind="image"
                url={block.url || ''}
                onChange={(url) => updateBlock(block.id, { url })}
                lessonId={lessonId}
                teacherId={teacherId}
                urlPlaceholder={lang === 'ar' ? 'رابط الصورة...' : 'Image URL...'}
            >
                {block.url && (
                    <div className="mt-1 rounded-md overflow-hidden bg-accent/10">
                        <img src={block.url} alt="" className="max-h-48 object-contain mx-auto" />
                    </div>
                )}
            </AssetUploadField>
            {/* Alt text doubles as the caption students see under the image. */}
            <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={commitTitle}
                placeholder={lang === 'ar' ? 'وصف الصورة (يظهر للطلاب)' : 'Image caption (shown to students)'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="h-8 text-xs"
            />
        </div>
    );
}

// ─── File Block ─────────────────────────────────────────────────────────────

function FileBlock({ block, updateBlock, lang }: { block: LessonBlock; updateBlock: (id: string, data: Partial<LessonBlock>) => void; lang: 'ar' | 'en' }) {
    const { t } = useLanguage();
    const { lessonId, teacherId } = useLessonAssetTarget();
    const { localTitle, setLocalTitle, commitTitle } = useBlockContent(block, lang, updateBlock);

    return (
        <div className="p-3 border rounded-md bg-card space-y-2">
            <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{t('ملف مرفق', 'Attached File')}</span>
            </div>
            <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={commitTitle}
                placeholder={lang === 'ar' ? 'اسم الملف' : 'File name'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="h-8 text-sm"
            />
            <AssetUploadField
                kind="file"
                url={block.url || ''}
                onChange={(url) => updateBlock(block.id, { url })}
                lessonId={lessonId}
                teacherId={teacherId}
            />
        </div>
    );
}

// ─── Link Block ─────────────────────────────────────────────────────────────

function LinkBlock({ block, updateBlock, lang }: { block: LessonBlock; updateBlock: (id: string, data: Partial<LessonBlock>) => void; lang: 'ar' | 'en' }) {
    const { t } = useLanguage();
    const [url, setUrl] = useState(block.url || '');
    const { localTitle, setLocalTitle, commitTitle, localContent, setLocalContent, commitContent } = useBlockContent(block, lang, updateBlock);

    useEffect(() => { setUrl(block.url || ''); }, [block.url]);

    const handleUrlBlur = () => {
        if (url !== block.url) updateBlock(block.id, { url });
    };

    return (
        <div className="p-3 border rounded-md bg-card space-y-2">
            <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">{t('رابط خارجي', 'External Link')}</span>
            </div>
            <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={commitTitle}
                placeholder={lang === 'ar' ? 'عنوان الرابط' : 'Link title'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="h-8 text-sm"
            />
            <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://..."
                className="h-8 text-xs"
            />
            <Textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onBlur={commitContent}
                placeholder={lang === 'ar' ? 'وصف الرابط (اختياري)' : 'Link description (optional)'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="min-h-[40px] resize-none text-xs"
            />
        </div>
    );
}

// ─── Equation Block ─────────────────────────────────────────────────────────

function EquationBlock({ block, updateBlock, lang }: { block: LessonBlock; updateBlock: (id: string, data: Partial<LessonBlock>) => void; lang: 'ar' | 'en' }) {
    const { t } = useLanguage();
    const { localContent, setLocalContent, commitContent, localTitle, setLocalTitle, commitTitle } = useBlockContent(block, lang, updateBlock);

    return (
        <div className="p-3 border rounded-md bg-indigo-50 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center gap-2 mb-1">
                <Sigma className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">{t('معادلة', 'Equation')}</span>
            </div>
            <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={commitTitle}
                placeholder={lang === 'ar' ? 'عنوان المعادلة' : 'Equation label'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="h-8 text-sm bg-transparent border-none shadow-none focus-visible:ring-1"
            />
            <Textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onBlur={commitContent}
                placeholder={lang === 'ar' ? 'اكتب المعادلة (LaTeX أو نص)' : 'Write your equation (LaTeX or text)'}
                dir="ltr"
                className="min-h-[60px] font-mono text-sm resize-none bg-white dark:bg-background"
            />
            {localContent && (
                <div className="bg-white dark:bg-background rounded px-4 py-3 text-center text-lg font-mono border border-border">
                    {localContent}
                </div>
            )}
        </div>
    );
}

// ─── Q&A Block ──────────────────────────────────────────────────────────────

function QABlock({ block, updateBlock, lang }: { block: LessonBlock; updateBlock: (id: string, data: Partial<LessonBlock>) => void; lang: 'ar' | 'en' }) {
    const { t } = useLanguage();
    const { localTitle, setLocalTitle, commitTitle, localContent, setLocalContent, commitContent } = useBlockContent(block, lang, updateBlock);

    return (
        <div className="p-3 border rounded-md bg-pink-50 dark:bg-pink-950/20 space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-medium">{t('سؤال وجواب', 'Q&A')}</span>
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('السؤال', 'Question')}</Label>
                <Input
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={commitTitle}
                    placeholder={lang === 'ar' ? 'اكتب السؤال هنا...' : 'Write the question...'}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    className="h-8 text-sm font-medium"
                />
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('الإجابة', 'Answer')}</Label>
                <Textarea
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    onBlur={commitContent}
                    placeholder={lang === 'ar' ? 'اكتب الإجابة هنا...' : 'Write the answer...'}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    className="min-h-[60px] resize-none text-sm"
                />
            </div>
        </div>
    );
}
