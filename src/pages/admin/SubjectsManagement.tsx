import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete, devLog } from '@/lib/adminDb';
import { TranslationButton } from '@/components/admin/TranslationButton';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import type { Stage, Subject } from '@/types/database';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, ArrowRight, RefreshCw, AlertCircle, BookOpen, Search, Filter, X, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubjectWithJoins extends Subject {
    stage?: Stage | null;
    lessons?: { count: number }[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SubjectsManagement() {
    const { t } = useLanguage();
    const params = useParams<{ stageId?: string; levelId?: string }>();
    const stageId = params.stageId || params.levelId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Filters (for global view)
    const [filterStage, setFilterStage] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(!stageId);

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        stage_id: '',
        title_ar: '',
        title_en: '',
        description_ar: '',
        description_en: '',
        slug: '',
        sort_order: 0,
        is_active: true,
        access_type: 'stage' as string,
    });

    // Auto-translate AR → EN
    const { isTranslating: titleAutoTranslating } = useAutoTranslate(
        form.title_ar, 'ar', 'en',
        (text) => setForm(f => ({ ...f, title_en: text })),
        dialogOpen
    );
    const { isTranslating: descAutoTranslating } = useAutoTranslate(
        form.description_ar, 'ar', 'en',
        (text) => setForm(f => ({ ...f, description_en: text })),
        dialogOpen
    );

    // ─── Fetch Data via useQuery ─────────────────────────────────────────────

    const subjectsQueryKey = stageId ? ['admin', 'subjects', stageId] : ['admin', 'subjects'];

    const { data: queryData, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: subjectsQueryKey,
        queryFn: async () => {
            // Always fetch all stages for dropdown
            const { data: stagesData } = await supabase
                .from('stages')
                .select('*')
                .order('sort_order');

            let currentStage: Stage | null = null;

            // Build subjects query — always fetch with stage join + lesson count
            let query = supabase
                .from('subjects')
                .select('*, stage:stages(id, title_ar, title_en), lessons(count)')
                .order('sort_order', { ascending: true });

            // If stageId in URL, scope to that stage
            if (stageId) {
                query = query.eq('stage_id', stageId);

                // Also set the stage info
                const matchedStage = (stagesData as any[])?.find(s => s.id === stageId);
                if (matchedStage) {
                    currentStage = matchedStage as Stage;
                }
            }

            const { data: subjectsData, error: subjectsError } = await query;

            if (subjectsError) {
                devLog('Subjects fetch error', subjectsError);
                toast.error(t('فشل في تحميل المواد', 'Failed to load subjects'), { description: subjectsError.message });
                throw new Error(subjectsError.message);
            }

            devLog(`Loaded ${subjectsData?.length || 0} subjects`);

            return {
                allStages: (stagesData || []) as Stage[],
                stage: currentStage,
                subjects: (subjectsData as unknown as SubjectWithJoins[]) || [],
            };
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    const allStages = queryData?.allStages || [];
    const stage = queryData?.stage || null;
    const subjects = queryData?.subjects || [];
    const error = queryError ? (queryError instanceof Error ? queryError.message : 'Unknown error') : null;

    const invalidateSubjects = () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'subjects'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all }); // also invalidate student cache
        if (stageId) {
            queryClient.invalidateQueries({ queryKey: ['admin', 'subjects', stageId] });
            queryClient.invalidateQueries({ queryKey: queryKeys.subjects.byStage(stageId) });
        }
    };

    // ─── Filtered Subjects ──────────────────────────────────────────────────

    const filteredSubjects = subjects.filter(subject => {
        if (filterStage !== 'all' && subject.stage_id !== filterStage) return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchTitle = subject.title_ar?.toLowerCase().includes(q) || subject.title_en?.toLowerCase().includes(q);
            if (!matchTitle) return false;
        }
        return true;
    });

    const hasActiveFilters = filterStage !== 'all' || searchQuery.trim().length > 0;

    const clearFilters = () => {
        setFilterStage('all');
        setSearchQuery('');
    };

    // Get lesson count from join
    const getLessonCount = (subject: SubjectWithJoins) => {
        if (subject.lessons && subject.lessons.length > 0) {
            return subject.lessons[0]?.count || 0;
        }
        return 0;
    };

    // ─── CRUD Handlers ──────────────────────────────────────────────────────

    const handleAdd = () => {
        setEditingSubject(null);
        setForm({
            stage_id: stageId || '',
            title_ar: '',
            title_en: '',
            description_ar: '',
            description_en: '',
            slug: '',
            sort_order: subjects.length + 1,
            is_active: true,
            access_type: 'stage',
        });
        setDialogOpen(true);
    };

    const handleEdit = (subject: any) => {
        setEditingSubject(subject);
        setForm({
            stage_id: subject.stage_id || '',
            title_ar: subject.title_ar || '',
            title_en: subject.title_en || '',
            description_ar: subject.description_ar || '',
            description_en: subject.description_en || '',
            slug: subject.slug || '',
            sort_order: subject.sort_order || 0,
            is_active: !!subject.is_active,
            access_type: subject.access_type || 'stage',
        });
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const targetStageId = form.stage_id || stageId;
        // stage_id is required only for 'stage' access type
        if (!targetStageId && form.access_type === 'stage') {
            toast.error(t('الرجاء اختيار المرحلة', 'Please select a stage'));
            return;
        }
        if (!form.title_ar.trim()) {
            toast.error(t('الرجاء إدخال اسم المادة', 'Please enter subject name'));
            return;
        }

        setSubmitting(true);

        try {
            if (editingSubject) {
                const result = await verifiedUpdate(
                    'subjects',
                    editingSubject.id,
                    {
                        stage_id: targetStageId || null,
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        description_ar: form.description_ar || null,
                        description_en: form.description_en || null,
                        access_type: form.access_type,
                        sort_order: form.sort_order,
                        is_active: form.is_active,
                    },
                    {
                        successMessage: { ar: 'تم تحديث المادة بنجاح', en: 'Subject updated successfully' },
                        errorMessage: { ar: 'فشل في تحديث المادة', en: 'Failed to update subject' },
                    }
                );
                if (result.success) {
                    setDialogOpen(false);
                    invalidateSubjects();
                }
            } else {
                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');
                const result = await verifiedInsert(
                    'subjects',
                    {
                        stage_id: targetStageId || null,
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        description_ar: form.description_ar || null,
                        description_en: form.description_en || null,
                        slug,
                        access_type: form.access_type,
                        sort_order: form.sort_order,
                        is_active: form.is_active,
                    },
                    {
                        successMessage: { ar: 'تمت إضافة المادة بنجاح', en: 'Subject added successfully' },
                        errorMessage: { ar: 'فشل في إضافة المادة', en: 'Failed to add subject' },
                    }
                );
                if (result.success) {
                    setDialogOpen(false);
                    invalidateSubjects();
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            const result = await verifiedDelete(
                'subjects',
                deleteTarget.id,
                {
                    successMessage: { ar: 'تم حذف المادة بنجاح', en: 'Subject deleted successfully' },
                    errorMessage: { ar: 'فشل في حذف المادة', en: 'Failed to delete subject' },
                }
            );
            if (result.success) invalidateSubjects();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    const handleSubjectClick = (subject: Subject) => {
        navigate(`/admin/subjects/${subject.id}/lessons`);
    };

    // Quick toggle is_active
    const handleToggleSubjectActive = async (subject: Subject, e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = !subject.is_active;
        try {
            const result = await verifiedUpdate(
                'subjects',
                subject.id,
                { is_active: newValue },
                {
                    successMessage: newValue
                        ? { ar: 'تم تفعيل المادة', en: 'Subject activated' }
                        : { ar: 'تم إخفاء المادة', en: 'Subject hidden' },
                    errorMessage: { ar: 'فشل التحديث', en: 'Update failed' },
                }
            );
            if (result.success) invalidateSubjects();
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Breadcrumb — only when scoped to a stage */}
            {stageId && stage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <button
                        onClick={() => navigate('/admin/stages')}
                        className="hover:text-foreground transition-colors"
                    >
                        {t('المراحل', 'Stages')}
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-foreground">
                        {t(stage.title_ar, stage.title_en || stage.title_ar)}
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('المواد الدراسية', 'Subjects')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {stageId && stage
                            ? t(`المواد في مرحلة ${stage.title_ar}`, `Subjects in ${stage.title_en || stage.title_ar}`)
                            : t(`${filteredSubjects.length} مادة`, `${filteredSubjects.length} subjects`)
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!stageId && (
                        <Button
                            variant={showFilters ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="w-4 h-4 me-2" />
                            {t('فلاتر', 'Filters')}
                            {hasActiveFilters && (
                                <Badge variant="destructive" className="ms-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                    !
                                </Badge>
                            )}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleAdd}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة مادة', 'Add Subject')}
                    </Button>
                </div>
            </div>

            {/* Filter Bar — global view */}
            {!stageId && showFilters && (
                <div className="bg-background rounded-lg border border-border p-4 mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">{t('فلترة النتائج', 'Filter Results')}</h3>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                                <X className="w-3 h-3 me-1" />
                                {t('مسح الكل', 'Clear All')}
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('بحث بالاسم...', 'Search by name...')}
                                className="ps-9"
                            />
                        </div>

                        {/* Stage filter */}
                        <Select value={filterStage} onValueChange={setFilterStage}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('كل المراحل', 'All Stages')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('كل المراحل', 'All Stages')}</SelectItem>
                                {allStages.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{t(s.title_ar, s.title_en || s.title_ar)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-destructive">{t('حدث خطأ', 'An error occurred')}</p>
                            <p className="text-xs text-destructive/80">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-background rounded-lg border border-border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : filteredSubjects.length === 0 ? (
                    <div className="p-12 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {hasActiveFilters
                                ? t('لا توجد نتائج', 'No results found')
                                : t('لا توجد مواد', 'No subjects')
                            }
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {hasActiveFilters
                                ? t('حاول تغيير الفلاتر', 'Try changing the filters')
                                : t('ابدأ بإضافة أول مادة دراسية', 'Start by adding the first subject')
                            }
                        </p>
                        {hasActiveFilters ? (
                            <Button variant="outline" onClick={clearFilters}>
                                {t('مسح الفلاتر', 'Clear Filters')}
                            </Button>
                        ) : (
                            <Button onClick={handleAdd}>
                                <Plus className="w-4 h-4 me-2" />
                                {t('إضافة مادة', 'Add Subject')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>{t('اسم المادة', 'Subject Name')}</TableHead>
                                {!stageId && <TableHead>{t('المرحلة', 'Stage')}</TableHead>}
                                <TableHead>{t('الدروس', 'Lessons')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead className="w-[150px]">{t('الإجراءات', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubjects.map((subject, index) => (
                                <TableRow key={subject.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSubjectClick(subject)}>
                                    <TableCell className="text-muted-foreground">{subject.sort_order || index + 1}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-foreground">{subject.title_ar}</p>
                                            {subject.title_en && (
                                                <p className="text-sm text-muted-foreground">{subject.title_en}</p>
                                            )}
                                            {subject.description_ar && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{subject.description_ar}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    {!stageId && (
                                        <TableCell>
                                            <Badge variant="outline">{(subject as SubjectWithJoins).stage?.title_ar || '—'}</Badge>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-sm">{getLessonCount(subject)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={subject.is_active}
                                                onCheckedChange={() => { }}
                                                onClick={(e) => handleToggleSubjectActive(subject, e as any)}
                                                className="scale-75"
                                            />
                                            <span className={`text-xs font-medium ${subject.is_active ? 'text-green-600' : 'text-amber-600'}`}>
                                                {subject.is_active ? t('مفعّل', 'Active') : t('مخفي', 'Hidden')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px]">
                                            {subject.access_type === 'public' ? t('عام', 'Public')
                                                : subject.access_type === 'subscription' ? t('اشتراك', 'Sub')
                                                    : subject.access_type === 'invite_only' ? t('دعوة', 'Invite')
                                                        : subject.access_type === 'org_only' ? t('مؤسسة', 'Org')
                                                            : t('مرحلة', 'Stage')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)} title={t('تعديل', 'Edit')}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteTarget(subject)}
                                                className="text-destructive hover:text-destructive"
                                                title={t('حذف', 'Delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleSubjectClick(subject)} title={t('عرض الدروس', 'View Lessons')}>
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSubject
                                ? t('تعديل المادة', 'Edit Subject')
                                : t('إضافة مادة جديدة', 'Add New Subject')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        {/* Always show stage picker */}
                        <div className="space-y-2">
                            <Label>{t('المرحلة الدراسية', 'Educational Stage')} *</Label>
                            <Select
                                value={form.stage_id}
                                onValueChange={(value) => setForm({ ...form, stage_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('اختر مرحلة', 'Select Stage')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {allStages.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.title_ar}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Access Type */}
                        <div className="space-y-2">
                            <Label>{t('نوع الوصول', 'Access Type')}</Label>
                            <Select
                                value={form.access_type}
                                onValueChange={(value) => setForm({ ...form, access_type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stage">{t('حسب المرحلة', 'Stage-based')}</SelectItem>
                                    <SelectItem value="public">{t('عام للجميع', 'Public')}</SelectItem>
                                    <SelectItem value="subscription">{t('اشتراك', 'Subscription')}</SelectItem>
                                    <SelectItem value="invite_only">{t('بدعوة فقط', 'Invite Only')}</SelectItem>
                                    <SelectItem value="org_only">{t('مؤسسة فقط', 'Organization Only')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {t('يحدد من يستطيع رؤية هذه المادة', 'Controls who can see this subject')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title_ar">{t('الاسم بالعربية', 'Arabic Name')} *</Label>
                            <Input
                                id="title_ar"
                                value={form.title_ar}
                                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                                placeholder={t('مثال: الرياضيات', 'Example: Mathematics')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="title_en">{t('الاسم بالإنجليزية', 'English Name')}</Label>
                                <TranslationButton
                                    sourceText={form.title_ar}
                                    sourceLang="ar"
                                    targetLang="en"
                                    onTranslated={(text) => setForm({ ...form, title_en: text })}
                                    autoTranslating={titleAutoTranslating}
                                    label="Auto EN"
                                />
                            </div>
                            <Input
                                id="title_en"
                                value={form.title_en}
                                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                                placeholder="Example: Mathematics"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description_ar">{t('الوصف بالعربية', 'Arabic Description')}</Label>
                            <Input
                                id="description_ar"
                                value={form.description_ar}
                                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                                placeholder={t('وصف المادة...', 'Subject description...')}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="description_en">{t('الوصف بالإنجليزية', 'English Description')}</Label>
                                <TranslationButton
                                    sourceText={form.description_ar}
                                    sourceLang="ar"
                                    targetLang="en"
                                    onTranslated={(text) => setForm({ ...form, description_en: text })}
                                    autoTranslating={descAutoTranslating}
                                    label="Auto EN"
                                />
                            </div>
                            <Input
                                id="description_en"
                                value={form.description_en}
                                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                                placeholder="Subject description..."
                            />
                        </div>
                        {!editingSubject && (
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('المعرّف', 'Slug')}</Label>
                                <Input
                                    id="slug"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    placeholder="mathematics"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('سيتم إنشاؤه تلقائياً إذا تُرك فارغاً', 'Will be auto-generated if left empty')}
                                </p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="sort_order">{t('الترتيب', 'Sort Order')}</Label>
                            <Input
                                id="sort_order"
                                type="number"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">{t('مفعّل', 'Active')}</Label>
                            <Switch
                                id="is_active"
                                checked={form.is_active}
                                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حفظ', 'Save')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('تأكيد الحذف', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                `هل أنت متأكد من حذف المادة "${deleteTarget?.title_ar}"؟ سيتم حذف جميع الدروس المرتبطة بها.`,
                                `Are you sure you want to delete "${deleteTarget?.title_en || deleteTarget?.title_ar}"? All related lessons will be deleted.`
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حذف', 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
