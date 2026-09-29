import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Lesson, LessonSection, LessonBlock } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Plus, Save, ArrowLeft, ArrowRight, Eye, EyeOff, X, CheckCircle, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Subcomponents
import LessonOutline from './LessonOutline';
import BlockEditor from './BlockEditor';
import LessonSettings from './LessonSettings';
import DraftRecoveryDialog from './DraftRecoveryDialog';
import PublishLessonDialog from './PublishLessonDialog';

// Utilities
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { LessonDraftManager, LessonDraft } from '@/lib/draftManager';
import { useIsMobileLayout } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { List, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import LessonSummaryPanel from './LessonSummaryPanel';

// Save status type
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export default function LessonEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [previewMode, setPreviewMode] = useState(false);

    // Data State
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [sections, setSections] = useState<LessonSection[]>([]);
    const [blocks, setBlocks] = useState<LessonBlock[]>([]);

    // UI State
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    // Draft management
    const [draftManager, setDraftManager] = useState<LessonDraftManager | null>(null);
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<LessonDraft | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const isMobile = useIsMobileLayout();

    // Auto-save timers
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
    const draftSaveTimer = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdates = useRef<Map<string, Partial<LessonBlock>>>(new Map());

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (id) fetchLessonData();
    }, [id]);

    // Initialize draft manager when lesson ID is available
    useEffect(() => {
        if (id) {
            const manager = new LessonDraftManager(id);
            setDraftManager(manager);

            // Cleanup expired drafts on mount
            LessonDraftManager.cleanupExpiredDrafts();
        }
    }, [id]);

    // Check for existing draft after lesson data is loaded
    useEffect(() => {
        if (!lesson || !draftManager) return;

        const draft = draftManager.loadDraft();
        if (draft && draftManager.isDraftNewer(lesson.created_at || lesson.updated_at || new Date().toISOString())) {
            setPendingDraft(draft);
            setShowDraftDialog(true);
        }
    }, [lesson, draftManager]);

    // Update hasUnsavedChanges when saveStatus changes
    useEffect(() => {
        setHasUnsavedChanges(saveStatus === 'unsaved' || saveStatus === 'error');
    }, [saveStatus]);

    // Setup unsaved changes protection
    useUnsavedChanges({
        hasUnsavedChanges,
        message: t(
            'لديك تغييرات غير محفوظة. هل أنت متأكد من المغادرة؟',
            'You have unsaved changes. Are you sure you want to leave?'
        ),
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
            if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
        };
    }, []);

    const fetchLessonData = async () => {
        setLoading(true);
        try {
            const { data: lessonDataResult, error: lessonError } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', id!)
                .single();

            if (lessonError) throw lessonError;
            if (!lessonDataResult) throw new Error('Lesson not found');
            const lessonResult = lessonDataResult as Lesson;

            // Check teacher access - teachers can only edit their own lessons
            if (profile?.role === 'teacher' && lessonResult.created_by !== profile.id) {
                toast.error(t('ليس لديك صلاحية لتعديل هذا الدرس', 'You do not have permission to edit this lesson'));
                navigate('/teacher/lessons');
                return;
            }

            setLesson(lessonResult);

            const { data: sectionsData, error: sectionsError} = await supabase
                .from('lesson_sections')
                .select('*')
                .eq('lesson_id', id!)
                .order('sort_order');

            if (sectionsError) throw sectionsError;
            setSections((sectionsData as LessonSection[]) || []);

            const { data: blocksData, error: blocksError } = await supabase
                .from('lesson_blocks')
                .select('*')
                .eq('lesson_id', id!)
                .order('sort_order');

            if (blocksError) throw blocksError;
            setBlocks((blocksData as LessonBlock[]) || []);

            if (sectionsData && sectionsData.length > 0) {
                setActiveSectionId((sectionsData as any)[0].id);
            }
        } catch (error) {
            console.error('Error fetching lesson:', error);
            toast.error(t('خطأ في تحميل الدرس', 'Error loading lesson'));
        } finally {
            setLoading(false);
        }
    };

    // ─── Draft management ───────────────────────────────────────────────

    const saveDraftToLocalStorage = useCallback(() => {
        if (!draftManager || !lesson) return;

        if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);

        draftSaveTimer.current = setTimeout(() => {
            draftManager.saveDraft({
                blocks,
                sections,
                lesson: {
                    title_ar: lesson.title_ar,
                    title_en: lesson.title_en,
                    duration_minutes: lesson.duration_minutes,
                    video_url: lesson.video_url,
                    is_published: lesson.is_published,
                    is_paid: lesson.is_paid,
                },
            });
        }, 3000); // 3 second debounce for localStorage
    }, [draftManager, blocks, sections, lesson]);

    // Trigger draft save when data changes
    useEffect(() => {
        if (saveStatus === 'unsaved') {
            saveDraftToLocalStorage();
        }
    }, [saveStatus, saveDraftToLocalStorage]);

    // Draft recovery handlers
    const handleRestoreDraft = useCallback(() => {
        if (!pendingDraft) return;

        setBlocks(pendingDraft.blocks);
        setSections(pendingDraft.sections);
        if (pendingDraft.lesson && lesson) {
            setLesson({ ...lesson, ...pendingDraft.lesson });
        }

        setShowDraftDialog(false);
        setPendingDraft(null);
        setSaveStatus('unsaved'); // Mark as unsaved to trigger save
        toast.success(t('تم استعادة المسودة', 'Draft restored'));
    }, [pendingDraft, lesson, t]);

    const handleDiscardDraft = useCallback(() => {
        if (draftManager) {
            draftManager.clearDraft();
        }
        setShowDraftDialog(false);
        setPendingDraft(null);
        toast.info(t('تم تجاهل المسودة', 'Draft discarded'));
    }, [draftManager, t]);

    // ─── Auto-save logic ────────────────────────────────────────────────

    const scheduleSave = useCallback(() => {
        setSaveStatus('unsaved');
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            flushPendingUpdates();
        }, 2000);
    }, []);

    const flushPendingUpdates = async () => {
        if (pendingUpdates.current.size === 0) return;

        setSaveStatus('saving');
        const updates = Array.from(pendingUpdates.current.entries());
        pendingUpdates.current.clear();

        try {
            for (const [blockId, data] of updates) {
                const { error } = await supabase.from('lesson_blocks').update(data as any).eq('id', blockId);
                if (error) throw error;
            }
            setSaveStatus('saved');
            setHasUnsavedChanges(false);

            // Clear draft on successful save
            if (draftManager) {
                draftManager.clearDraft();
            }
        } catch (error) {
            console.error('Auto-save error:', error);
            setSaveStatus('error');
            toast.error(t('فشل في الحفظ التلقائي', 'Auto-save failed'));
        }
    };

    // ─── Section handlers ───────────────────────────────────────────────

    const handleSectionReorder = async (newSections: LessonSection[]) => {
        setSections(newSections);
        const updates = newSections.map((s, index) => ({
            id: s.id,
            sort_order: index,
            lesson_id: s.lesson_id,
            title_ar: s.title_ar,
        }));

        try {
            const { error } = await supabase.from('lesson_sections').upsert(updates as any);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل في حفظ الترتيب', 'Failed to save order'));
            fetchLessonData();
        }
    };

    const handleCreateSection = async (title: string) => {
        if (!id) return;
        try {
            const { data, error } = await supabase.from('lesson_sections').insert({
                lesson_id: id,
                title_ar: title,
                sort_order: sections.length
            } as any).select().single();

            if (error) throw error;
            setSections([...sections, data as any]);
            setActiveSectionId((data as any).id);
            toast.success(t('تم إنشاء القسم', 'Section created'));
        } catch (error) {
            toast.error(t('فشل في إنشاء القسم', 'Failed to create section'));
        }
    };

    const handleUpdateSection = async (sectionId: string, title: string) => {
        setSections(sections.map(s => s.id === sectionId ? { ...s, title_ar: title } : s));
        try {
            const { error } = await supabase.from('lesson_sections').update({ title_ar: title } as any).eq('id', sectionId);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل في تحديث القسم', 'Failed to update section'));
        }
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف المحتوى بداخله.', 'Are you sure? Content inside will be deleted.'))) return;

        try {
            const { error } = await supabase.from('lesson_sections').delete().eq('id', sectionId);
            if (error) throw error;
            setSections(sections.filter(s => s.id !== sectionId));
            setBlocks(blocks.filter(b => b.section_id !== sectionId));
            if (activeSectionId === sectionId) setActiveSectionId(sections[0]?.id || null);
            toast.success(t('تم حذف القسم', 'Section deleted'));
        } catch (error) {
            toast.error(t('فشل في حذف القسم', 'Failed to delete section'));
        }
    };

    // ─── Block handlers ─────────────────────────────────────────────────

    const handleBlockReorder = async (newBlocks: LessonBlock[]) => {
        setBlocks(prevBlocks => {
            // Replace blocks for the active section, keep others
            const otherBlocks = prevBlocks.filter(b => {
                if (activeSectionId) return b.section_id !== activeSectionId;
                return b.section_id !== null;
            });
            return [...otherBlocks, ...newBlocks.map((b, i) => ({ ...b, sort_order: i }))];
        });

        const updates = newBlocks.map((b, index) => ({
            id: b.id,
            sort_order: index,
            lesson_id: b.lesson_id,
            type: b.type
        }));

        try {
            const { error } = await supabase.from('lesson_blocks').upsert(updates as any);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل في حفظ الترتيب', 'Failed to save order'));
            fetchLessonData();
        }
    };

    const handleCreateBlock = async (type: any) => {
        if (!id) return;
        try {
            const relevantBlocks = blocks.filter(b => b.section_id === activeSectionId || (!activeSectionId && !b.section_id));
            const maxOrder = relevantBlocks.length > 0 ? Math.max(...relevantBlocks.map(b => b.sort_order)) : -1;

            const { data, error } = await supabase.from('lesson_blocks').insert({
                lesson_id: id,
                section_id: activeSectionId || null,
                type: type,
                sort_order: maxOrder + 1,
                content_ar: '',
            } as any).select().single();

            if (error) throw error;
            setBlocks([...blocks, data as any]);
            toast.success(t('تم إضافة محتوى', 'Content added'));
        } catch (error) {
            toast.error(t('فشل في إضافة المحتوى', 'Failed to add content'));
        }
    };

    const handleUpdateBlock = async (blockId: string, data: Partial<LessonBlock>) => {
        // Optimistic update
        setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...data } : b));

        // Queue for auto-save
        const existing = pendingUpdates.current.get(blockId) || {};
        pendingUpdates.current.set(blockId, { ...existing, ...data });
        scheduleSave();
    };

    const handleDeleteBlock = async (blockId: string) => {
        if (!confirm(t('هل أنت متأكد؟', 'Are you sure?'))) return;

        try {
            const { error } = await supabase.from('lesson_blocks').delete().eq('id', blockId);
            if (error) throw error;
            setBlocks(blocks.filter(b => b.id !== blockId));
            toast.success(t('تم الحذف', 'Deleted'));
        } catch (error) {
            toast.error(t('فشل الحذف', 'Failed to delete'));
        }
    };

    const handlePublishLesson = async (settings: { is_published: boolean; is_paid: boolean; is_free_preview: boolean }) => {
        if (!lesson) return;

        try {
            const { error } = await supabase
                .from('lessons')
                .update({
                    ...settings,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', lesson.id);

            if (error) throw error;

            setLesson({ ...lesson, ...settings });
            toast.success(t('تم تحديث حالة الدرس بنجاح', 'Lesson status updated successfully'));
        } catch (error) {
            console.error('Error publishing lesson:', error);
            toast.error(t('فشل في تحديث حالة الدرس', 'Failed to update lesson status'));
            throw error;
        }
    };

    // ─── Save status indicator ──────────────────────────────────────────

    const SaveStatusIndicator = () => {
        const statusConfig = {
            saved: {
                icon: Cloud,
                text: t('محفوظ', 'Saved'),
                color: 'text-green-500',
                bgColor: 'bg-green-50 dark:bg-green-950/30'
            },
            saving: {
                icon: Loader2,
                text: t('جاري الحفظ...', 'Saving...'),
                color: 'text-blue-500',
                bgColor: 'bg-blue-50 dark:bg-blue-950/30'
            },
            unsaved: {
                icon: CloudOff,
                text: t('تغييرات غير محفوظة', 'Unsaved'),
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-50 dark:bg-yellow-950/30'
            },
            error: {
                icon: AlertCircle,
                text: t('فشل الحفظ', 'Save failed'),
                color: 'text-red-500',
                bgColor: 'bg-red-50 dark:bg-red-950/30'
            },
        };

        const cfg = statusConfig[saveStatus];
        const Icon = cfg.icon;

        return (
            <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
                cfg.color,
                cfg.bgColor
            )}>
                <Icon className={cn("w-3.5 h-3.5", saveStatus === 'saving' && "animate-spin")} />
                <span className="font-medium">{cfg.text}</span>
                {saveStatus === 'error' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-xs"
                        onClick={flushPendingUpdates}
                    >
                        {t('إعادة المحاولة', 'Retry')}
                    </Button>
                )}
            </div>
        );
    };

    // ─── Filtered blocks for current section ────────────────────────────

    const filteredBlocks = blocks.filter(b =>
        b.section_id === activeSectionId || (!activeSectionId && !b.section_id)
    );

    // ─── Loading / Not Found ────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!lesson) {
        return <div className="p-8 text-center">{t('الدرس غير موجود', 'Lesson not found')}</div>;
    }

    return (
        <>
            <DraftRecoveryDialog
                draft={pendingDraft}
                open={showDraftDialog}
                onRestore={handleRestoreDraft}
                onDiscard={handleDiscardDraft}
            />

            <PublishLessonDialog
                open={isPublishDialogOpen}
                onOpenChange={setIsPublishDialogOpen}
                lesson={lesson}
                sections={sections}
                blocks={blocks}
                onPublish={handlePublishLesson}
            />

            <div className="flex bg-background overflow-hidden relative h-full">
            {/* Left Sidebar: Outline (Fixed width on desktop, hidden on mobile) */}
            <div className="hidden lg:flex w-64 border-e border-border bg-card flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-semibold text-sm">{t('محتوى الدرس', 'Lesson Content')}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <LessonOutline
                        sections={sections}
                        blocks={blocks}
                        activeSectionId={activeSectionId}
                        onSelectSection={setActiveSectionId}
                        onReorder={handleSectionReorder}
                        onCreateSection={handleCreateSection}
                        onUpdateSection={handleUpdateSection}
                        onDeleteSection={handleDeleteSection}
                    />
                </div>
            </div>

            {/* Main Content: Block Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Toolbar */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                            {direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        </Button>
                        <h1 className="font-medium text-sm truncate max-w-[300px]">{lesson.title_ar}</h1>
                        <SaveStatusIndicator />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Mobile Outline Trigger */}
                        <div className="lg:hidden">
                            <Sheet open={isOutlineOpen} onOpenChange={setIsOutlineOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                        <List className="w-5 h-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side={direction === 'rtl' ? 'right' : 'left'} className="w-72 p-0">
                                    <SheetHeader className="p-4 border-b">
                                        <SheetTitle className="text-sm font-semibold">{t('محتوى الدرس', 'Lesson Content')}</SheetTitle>
                                    </SheetHeader>
                                    <div className="flex-1 overflow-y-auto p-2">
                                        <LessonOutline
                                            sections={sections}
                                            blocks={blocks}
                                            activeSectionId={activeSectionId}
                                            onSelectSection={(id) => {
                                                setActiveSectionId(id);
                                                setIsOutlineOpen(false);
                                            }}
                                            onReorder={handleSectionReorder}
                                            onCreateSection={handleCreateSection}
                                            onUpdateSection={handleUpdateSection}
                                            onDeleteSection={handleDeleteSection}
                                        />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* AI summary ("الملخص الذكي"). A Sheet, matching the
                            Outline and Settings panels rather than inventing a
                            third pattern. Unsaved block edits are flushed first
                            so the generator reads the lesson as it now stands. */}
                        <Sheet
                            open={isSummaryOpen}
                            onOpenChange={async (open) => {
                                if (open) await flushPendingUpdates();
                                setIsSummaryOpen(open);
                            }}
                        >
                            <SheetTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1.5 h-9 md:h-8">
                                    <Sparkles className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                    <span className="hidden md:inline">{t('الملخص الذكي', 'AI summary')}</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side={direction === 'rtl' ? 'left' : 'right'}
                                className="w-full sm:max-w-2xl p-0 flex flex-col"
                            >
                                <SheetHeader className="p-4 border-b shrink-0">
                                    <SheetTitle className="text-sm font-semibold">
                                        {t('الملخص الذكي', 'AI summary')}
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <LessonSummaryPanel
                                        lessonId={lesson.id}
                                        lesson={lesson}
                                        sections={sections}
                                        blocks={blocks}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>

                        <Button
                            size="sm"
                            variant={previewMode ? "default" : "outline"}
                            onClick={() => setPreviewMode(!previewMode)}
                            className="gap-1.5 h-9 md:h-8"
                        >
                            {previewMode ? <EyeOff className="w-4 h-4 md:w-3.5 md:h-3.5" /> : <Eye className="w-4 h-4 md:w-3.5 md:h-3.5" />}
                            <span className="hidden md:inline">{previewMode ? t('تحرير', 'Edit') : t('معاينة', 'Preview')}</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => setIsPublishDialogOpen(true)}
                            className="gap-1.5 h-9 md:h-8"
                        >
                            <CheckCircle className="w-4 h-4 md:w-3.5 md:h-3.5" />
                            <span className="hidden md:inline">{t('إنهاء ونشر', 'Finalize & Publish')}</span>
                        </Button>

                        {/* Mobile Settings Trigger */}
                        <div className="lg:hidden">
                            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                        <SettingsIcon className="w-5 h-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-80 p-0">
                                    <SheetHeader className="p-4 border-b">
                                        <SheetTitle className="text-sm font-semibold">{t('إعدادات الدرس', 'Lesson Settings')}</SheetTitle>
                                    </SheetHeader>
                                    <div className="p-4 overflow-y-auto h-full">
                                        <LessonSettings
                                            lesson={lesson}
                                            onUpdate={async (updates) => {
                                                const { error } = await supabase.from('lessons').update(updates as any).eq('id', lesson.id);
                                                if (error) {
                                                    console.error(error);
                                                    toast.error(t('فشل التحديث', 'Update failed'));
                                                } else {
                                                    setLesson({ ...lesson, ...updates });
                                                }
                                            }}
                                        />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>

                {/* Editor Canvas */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-3xl mx-auto min-h-[500px]">
                        {previewMode ? (
                            <PreviewRenderer blocks={filteredBlocks} sections={sections} activeSectionId={activeSectionId} />
                        ) : (
                            <>
                                <BlockEditor
                                    blocks={filteredBlocks}
                                    onReorder={handleBlockReorder}
                                    onCreateBlock={handleCreateBlock}
                                    onUpdateBlock={handleUpdateBlock}
                                    onDeleteBlock={handleDeleteBlock}
                                />

                                {filteredBlocks.length === 0 && (
                                    <div className="border border-dashed border-border rounded-lg p-6 md:p-12 text-center">
                                        <p className="text-muted-foreground text-sm mb-4">
                                            {t('لا يوجد محتوى في هذا القسم', 'No content in this section')}
                                        </p>
                                        <Button variant="secondary" onClick={() => handleCreateBlock('rich_text')}>
                                            <Plus className="w-4 h-4 me-2" />
                                            {t('إضافة نص', 'Add Text')}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Settings (Fixed width on desktop, hidden on mobile) */}
            <div className="hidden lg:flex w-80 border-s border-border bg-card flex-col">
                <div className="p-4 border-b border-border">
                    <h2 className="font-semibold text-sm">{t('إعدادات الدرس', 'Lesson Settings')}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <LessonSettings
                        lesson={lesson}
                        onUpdate={async (updates) => {
                            const { error } = await supabase.from('lessons').update(updates as any).eq('id', lesson.id);
                            if (error) {
                                console.error(error);
                                toast.error(t('فشل التحديث', 'Update failed'));
                            } else {
                                setLesson({ ...lesson, ...updates });
                            }
                        }}
                    />
                </div>
            </div>
        </div>
        </>
    );
}

// ─── Preview Renderer ───────────────────────────────────────────────────────

function PreviewRenderer({
    blocks,
    sections,
    activeSectionId
}: {
    blocks: LessonBlock[];
    sections: LessonSection[];
    activeSectionId: string | null;
}) {
    const { t } = useLanguage();
    const activeSection = sections.find(s => s.id === activeSectionId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-6">
                <Badge variant="secondary" className="gap-1">
                    <Eye className="w-3 h-3" />
                    {t('وضع المعاينة', 'Preview Mode')}
                </Badge>
            </div>

            {activeSection && (
                <h2 className="text-xl font-bold border-b border-border pb-2">
                    {t(activeSection.title_ar, activeSection.title_en || activeSection.title_ar)}
                </h2>
            )}

            {blocks.filter(b => b.is_published !== false).map(block => (
                <PreviewBlock key={block.id} block={block} />
            ))}

            {blocks.filter(b => b.is_published !== false).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    {t('لا يوجد محتوى منشور للمعاينة', 'No published content to preview')}
                </div>
            )}
        </div>
    );
}

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
                    <p className="whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'tip':
            return (
                <div className="bg-blue-50 dark:bg-blue-950/30 border-s-4 border-blue-500 p-4 rounded-e-md">
                    <p className="text-blue-600 font-semibold text-sm mb-1">{t('نصيحة', 'Tip')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'warning':
            return (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border-s-4 border-yellow-500 p-4 rounded-e-md">
                    <p className="text-yellow-600 font-semibold text-sm mb-1">{t('تنبيه', 'Warning')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'example':
            return (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border-s-4 border-emerald-500 p-4 rounded-e-md">
                    <p className="text-emerald-600 font-semibold text-sm mb-1">{t('مثال', 'Example')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'exercise':
            return (
                <div className="bg-orange-50 dark:bg-orange-950/30 border-s-4 border-orange-500 p-4 rounded-e-md">
                    <p className="text-orange-600 font-semibold text-sm mb-1">{t('تمرين', 'Exercise')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'equation':
            return (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    {(block.title_ar || block.title_en) && (
                        <p className="text-xs text-muted-foreground mb-2">{t(block.title_ar || '', block.title_en || '')}</p>
                    )}
                    <div className="text-center text-lg font-mono py-2">
                        {t(block.content_ar || '', block.content_en || block.content_ar || '')}
                    </div>
                </div>
            );
        case 'qa':
            return (
                <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                        <span className="text-pink-500 font-bold text-sm">Q:</span>
                        <p className="text-sm font-medium">{t(block.title_ar || '', block.title_en || '')}</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold text-sm">A:</span>
                        <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                    </div>
                </div>
            );
        case 'video': {
            const ytId = block.url ? getYoutubeId(block.url) : null;
            if (ytId) {
                return (
                    <div className="space-y-2">
                        {(block.title_ar || block.title_en) && (
                            <h3 className="text-sm font-semibold">{t(block.title_ar || '', block.title_en || '')}</h3>
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
                <div className="p-4 bg-secondary/20 rounded-lg">
                    <p className="text-blue-500 underline text-sm">{block.url}</p>
                </div>
            );
        }
        case 'image':
            return block.url ? (
                <div className="rounded-lg overflow-hidden">
                    <img src={block.url} alt="" className="max-w-full h-auto mx-auto rounded-lg shadow-sm" />
                </div>
            ) : null;
        case 'file':
            return (
                <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg border border-border">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-blue-500 text-xs font-bold">📎</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium">{t(block.title_ar || 'ملف مرفق', block.title_en || 'Attached File')}</p>
                        <p className="text-xs text-muted-foreground">{t('اضغط للتحميل', 'Click to download')}</p>
                    </div>
                </div>
            );
        case 'link':
            return (
                <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-500">🔗</span>
                    <div>
                        <p className="text-sm font-medium">{t(block.title_ar || '', block.title_en || block.url || '')}</p>
                        {(block.content_ar || block.content_en) && (
                            <p className="text-xs text-muted-foreground">{t(block.content_ar || '', block.content_en || '')}</p>
                        )}
                    </div>
                </div>
            );
        default:
            return null;
    }
}
