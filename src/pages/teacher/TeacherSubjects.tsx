import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { TranslationButton } from '@/components/admin/TranslationButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    BookOpen,
    Users,
    ClipboardList,
    Video,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Search,
    Megaphone,
    UserPlus,
    Mail,
    Send,
    Plus,
    Pencil,
    DollarSign,
    ImagePlus,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────

interface StageOption {
    id: string;
    title_ar: string;
    title_en: string | null;
}

interface TeacherSubject {
    id: string;
    title_ar: string;
    title_en: string | null;
    stage: { title_ar: string; title_en: string | null } | null;
    lessons_count: number;
    published_count: number;
}

interface SubjectStudent {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    last_activity: string | null;
}

interface SubjectQuiz {
    id: string;
    lesson_title_ar: string;
    lesson_title_en: string | null;
    is_enabled: boolean;
    passing_score: number;
}

interface SubjectLesson {
    id: string;
    title_ar: string;
    title_en: string | null;
    is_published: boolean;
    sort_order: number;
}

// ─── Hooks ──────────────────────────────────────────────────

function useTeacherSubjects(userId: string | undefined) {
    return useQuery({
        queryKey: ['teacher', userId, 'subjects'],
        queryFn: async () => {
            // 1. Fetch subjects explicitly assigned to this teacher
            const { data: assignedSubjects, error: subjectsErr } = await supabase
                .from('subjects')
                .select('id, title_ar, title_en, stage:stages(title_ar, title_en)')
                .eq('teacher_id', userId!);

            if (subjectsErr) throw subjectsErr;

            // 2. Fetch all lessons by this teacher to catch legacy subjects or contributions
            const { data: lessons, error: lessonsErr } = await supabase
                .from('lessons')
                .select('id, subject_id, is_published, subject:subjects(id, title_ar, title_en, stage:stages(title_ar, title_en))')
                .eq('created_by', userId!);

            if (lessonsErr) throw lessonsErr;

            const subjectMap = new Map<string, TeacherSubject>();

            // Initialize map with assigned subjects
            for (const subj of (assignedSubjects || [])) {
                subjectMap.set(subj.id, {
                    id: subj.id,
                    title_ar: subj.title_ar,
                    title_en: (subj as any).title_en,
                    stage: (subj as any).stage,
                    lessons_count: 0,
                    published_count: 0,
                });
            }

            // Update counts and add subjects from lessons
            for (const lesson of (lessons || [])) {
                const subj = (lesson as any).subject;
                if (!subj) continue;
                
                const existing = subjectMap.get(subj.id);
                if (existing) {
                    existing.lessons_count++;
                    if ((lesson as any).is_published) existing.published_count++;
                } else {
                    subjectMap.set(subj.id, {
                        id: subj.id,
                        title_ar: subj.title_ar,
                        title_en: subj.title_en,
                        stage: subj.stage,
                        lessons_count: 1,
                        published_count: (lesson as any).is_published ? 1 : 0,
                    });
                }
            }

            return Array.from(subjectMap.values());
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}

function useSubjectDetail(subjectId: string | undefined, teacherId: string | undefined) {
    return useQuery({
        queryKey: ['teacher', teacherId, 'subject-detail', subjectId],
        queryFn: async () => {
            // Fetch lessons by this teacher in this subject
            const { data: lessons, error: lessonsErr } = await supabase
                .from('lessons')
                .select('id, title_ar, title_en, is_published, is_free_preview, sort_order')
                .eq('subject_id', subjectId!)
                .eq('created_by', teacherId!)
                .order('sort_order', { ascending: true });

            if (lessonsErr) throw lessonsErr;

            const lessonIds = ((lessons as any) || []).map((l: any) => l.id);

            // Fetch quizzes for these lessons
            let quizzes: SubjectQuiz[] = [];
            if (lessonIds.length > 0) {
                const { data: quizData } = await supabase
                    .from('quizzes')
                    .select('id, lesson_id, is_enabled, passing_score')
                    .in('lesson_id', lessonIds);

                const lessonMap = new Map(((lessons as any) || []).map((l: any) => [l.id, l]));
                quizzes = (quizData || []).map((q: any) => {
                    const lesson = lessonMap.get(q.lesson_id) as any;
                    return {
                        id: q.id,
                        lesson_title_ar: lesson?.title_ar || '',
                        lesson_title_en: lesson?.title_en || null,
                        is_enabled: q.is_enabled,
                        passing_score: q.passing_score,
                    };
                });
            }

            // Fetch students with progress on these lessons
            let students: SubjectStudent[] = [];
            if (lessonIds.length > 0) {
                const { data: progressData } = await supabase
                    .from('lesson_progress')
                    .select('user_id, updated_at')
                    .in('lesson_id', lessonIds);

                const uniqueUserIds = [...new Set(((progressData as any) || []).map((p: any) => p.user_id))];

                if (uniqueUserIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, email, avatar_url')
                        .in('id', uniqueUserIds as string[])
                        .eq('role', 'student');

                    // Get latest activity per student
                    const activityMap = new Map<string, string>();
                    for (const p of ((progressData as any) || [])) {
                        const current = activityMap.get(p.user_id);
                        if (!current || (p.updated_at && p.updated_at > current)) {
                            activityMap.set(p.user_id, p.updated_at);
                        }
                    }

                    students = ((profiles as any) || []).map((p: any) => ({
                        id: p.id,
                        full_name: p.full_name,
                        email: p.email,
                        avatar_url: p.avatar_url || null,
                        last_activity: activityMap.get(p.id) || null,
                    }));
                }
            }

            return {
                lessons: (lessons || []) as SubjectLesson[],
                quizzes,
                students,
            };
        },
        enabled: !!subjectId && !!teacherId,
        staleTime: 2 * 60 * 1000,
    });
}

function useStages() {
    return useQuery({
        queryKey: ['stages'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stages')
                .select('id, title_ar, title_en')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return (data || []) as StageOption[];
        },
        staleTime: 10 * 60 * 1000,
    });
}

// ─── Component ──────────────────────────────────────────────

export default function TeacherSubjects() {
    const { t, direction } = useLanguage();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedSubject, setSelectedSubject] = useState<TeacherSubject | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
    const [inviting, setInviting] = useState(false);
    const [announcementOpen, setAnnouncementOpen] = useState(false);
    const [announcementText, setAnnouncementText] = useState('');
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    // Create/Edit subject dialog
    const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
    const [creatingSubject, setCreatingSubject] = useState(false);
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [subjectForm, setSubjectForm] = useState({
        title_ar: '',
        title_en: '',
        description_ar: '',
        description_en: '',
        stage_id: '',
        is_paid: false,
        price_amount: '',
        price_currency: 'SYP',
        cover_image_url: '',
    });
    const [uploadingCover, setUploadingCover] = useState(false);

    const { data: subjects = [], isLoading } = useTeacherSubjects(user?.id);
    const { data: detail, isLoading: detailLoading } = useSubjectDetail(
        selectedSubject?.id,
        user?.id
    );
    const { data: stages = [] } = useStages();

    // Auto-translate: AR → EN when dialog is open
    const { isTranslating: titleTranslating } = useAutoTranslate(
        subjectForm.title_ar, 'ar', 'en',
        (text) => setSubjectForm(f => ({ ...f, title_en: text })),
        createSubjectOpen
    );
    const { isTranslating: descTranslating } = useAutoTranslate(
        subjectForm.description_ar, 'ar', 'en',
        (text) => setSubjectForm(f => ({ ...f, description_en: text })),
        createSubjectOpen
    );

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return subjects;
        const q = searchQuery.toLowerCase();
        return subjects.filter(s =>
            s.title_ar.toLowerCase().includes(q) ||
            s.title_en?.toLowerCase().includes(q)
        );
    }, [subjects, searchQuery]);

    const handleInviteStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteForm.name.trim() || !inviteForm.email.trim() || !selectedSubject) return;

        setInviting(true);
        try {
            // Send message/notification to the student
            const { data: studentProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', inviteForm.email.trim())
                .eq('role', 'student')
                .single();

            if (!studentProfile) {
                toast.error(t(
                    'لم يتم العثور على طالب بهذا البريد الإلكتروني',
                    'No student found with this email'
                ));
                return;
            }

            // Send an invite message
            await supabase.from('messages').insert({
                sender_id: user?.id,
                receiver_id: studentProfile.id,
                content: t(
                    `مرحباً ${inviteForm.name}، أنت مدعو للانضمام إلى مادة "${selectedSubject.title_ar}".`,
                    `Hello ${inviteForm.name}, you are invited to join the subject "${selectedSubject.title_en || selectedSubject.title_ar}".`
                ),
            } as any);

            toast.success(t('تم إرسال الدعوة بنجاح', 'Invitation sent successfully'));
            setInviteOpen(false);
            setInviteForm({ name: '', email: '' });
        } catch {
            toast.error(t('فشل في إرسال الدعوة', 'Failed to send invitation'));
        } finally {
            setInviting(false);
        }
    };

    const handleSendAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcementText.trim() || !selectedSubject || !detail?.students.length) return;

        setSendingAnnouncement(true);
        try {
            const messages = detail.students.map(student => ({
                sender_id: user?.id,
                receiver_id: student.id,
                content: announcementText.trim(),
            }));

            const { error } = await supabase.from('messages').insert(messages as any);
            if (error) throw error;

            toast.success(t(
                `تم إرسال الإعلان إلى ${detail.students.length} طالب`,
                `Announcement sent to ${detail.students.length} students`
            ));
            setAnnouncementOpen(false);
            setAnnouncementText('');
        } catch {
            toast.error(t('فشل في إرسال الإعلان', 'Failed to send announcement'));
        } finally {
            setSendingAnnouncement(false);
        }
    };

    const resetSubjectForm = () => {
        setSubjectForm({ title_ar: '', title_en: '', description_ar: '', description_en: '', stage_id: '', is_paid: false, price_amount: '', price_currency: 'SYP', cover_image_url: '' });
        setEditingSubjectId(null);
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error(t('يرجى اختيار صورة JPG أو PNG أو WebP', 'Please select a JPG, PNG, or WebP image'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'Image must be under 5MB'));
            return;
        }

        setUploadingCover(true);
        try {
            const ext = file.name.split('.').pop();
            const filePath = `subjects/${user.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('public').upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
            setSubjectForm(f => ({ ...f, cover_image_url: urlData.publicUrl }));
            toast.success(t('تم رفع الصورة', 'Image uploaded'));
        } catch (err: any) {
            toast.error(t('فشل رفع الصورة', 'Failed to upload image'), { description: err.message });
        } finally {
            setUploadingCover(false);
            e.target.value = '';
        }
    };

    const openEditSubject = async (subjectId: string) => {
        const { data } = await supabase.from('subjects').select('*').eq('id', subjectId).single();
        if (data) {
            setSubjectForm({
                title_ar: data.title_ar || '',
                title_en: (data as any).title_en || '',
                description_ar: (data as any).description_ar || '',
                description_en: (data as any).description_en || '',
                stage_id: (data as any).stage_id || '',
                is_paid: !!(data as any).is_paid,
                price_amount: (data as any).price_amount ? String((data as any).price_amount) : '',
                price_currency: (data as any).price_currency || 'SYP',
                cover_image_url: (data as any).cover_image_url || '',
            });
            setEditingSubjectId(subjectId);
            setCreateSubjectOpen(true);
        }
    };

    const handleCreateSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectForm.title_ar.trim()) {
            toast.error(t('العنوان بالعربية مطلوب', 'Arabic title is required'));
            return;
        }

        setCreatingSubject(true);
        try {
            const payload: any = {
                title_ar: subjectForm.title_ar.trim(),
                title_en: subjectForm.title_en.trim() || null,
                description_ar: subjectForm.description_ar.trim() || null,
                description_en: subjectForm.description_en.trim() || null,
                stage_id: subjectForm.stage_id || null,
                is_paid: subjectForm.is_paid,
                price_amount: subjectForm.is_paid && subjectForm.price_amount ? Number(subjectForm.price_amount) : 0,
                price_currency: subjectForm.price_currency || 'SYP',
                cover_image_url: subjectForm.cover_image_url.trim() || null,
            };

            if (editingSubjectId) {
                // Update existing
                const { error } = await (supabase.from('subjects') as any)
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq('id', editingSubjectId);
                if (error) throw error;
                toast.success(t('تم تحديث المادة بنجاح', 'Subject updated successfully'));
            } else {
                // Create new
                const slugText = subjectForm.title_en || subjectForm.title_ar;
                const slug = slugText
                    .toLowerCase()
                    .replace(/[^\u0621-\u064A0-9a-zA-Z]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                const { error } = await supabase.from('subjects').insert({
                    ...payload,
                    teacher_id: user?.id,
                    slug: `${slug}-${Math.random().toString(36).substring(2, 7)}`,
                    is_active: true,
                    sort_order: 0,
                } as any);
                if (error) throw error;
                toast.success(t('تم إنشاء المادة بنجاح', 'Subject created successfully'));
            }

            queryClient.invalidateQueries({ queryKey: ['teacher', user?.id, 'subjects'] });
            setCreateSubjectOpen(false);
            resetSubjectForm();
        } catch (err: any) {
            toast.error(t(editingSubjectId ? 'فشل في تحديث المادة' : 'فشل في إنشاء المادة', editingSubjectId ? 'Failed to update subject' : 'Failed to create subject'), {
                description: err.message,
            });
        } finally {
            setCreatingSubject(false);
        }
    };

    // ─── Subject Detail View ─────────────────────────────────

    if (selectedSubject) {
        return (
            <div>
                {/* Back button + title */}
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSubject(null)}
                    >
                        {direction === 'rtl'
                            ? <ChevronRight className="w-5 h-5" />
                            : <ChevronLeft className="w-5 h-5" />
                        }
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">
                            {t(selectedSubject.title_ar, selectedSubject.title_en || selectedSubject.title_ar)}
                        </h1>
                        {selectedSubject.stage && (
                            <p className="text-sm text-muted-foreground">
                                {t(selectedSubject.stage.title_ar, selectedSubject.stage.title_en || selectedSubject.stage.title_ar)}
                            </p>
                        )}
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <Button size="sm" variant="outline" onClick={() => openEditSubject(selectedSubject.id)}>
                        <Pencil className="w-4 h-4 me-2" />
                        {t('تعديل المادة', 'Edit Subject')}
                    </Button>
                    <Button size="sm" asChild>
                        <Link to="/teacher/lessons">
                            <Video className="w-4 h-4 me-2" />
                            {t('إضافة درس مسجل', 'Add Recorded Lesson')}
                        </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                        <Link to="/teacher/quizzes">
                            <ClipboardList className="w-4 h-4 me-2" />
                            {t('الاختبارات', 'Quizzes')}
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAnnouncementOpen(true)}
                        disabled={!detail?.students.length}
                    >
                        <Megaphone className="w-4 h-4 me-2" />
                        {t('إرسال إعلان', 'Send Announcement')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                        <UserPlus className="w-4 h-4 me-2" />
                        {t('دعوة طالب', 'Invite Student')}
                    </Button>
                </div>

                {detailLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-5">
                        {/* Lessons column */}
                        <div className="bg-background rounded-lg border border-border p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Video className="w-4 h-4 text-primary" />
                                <h3 className="font-medium text-foreground">
                                    {t('الدروس', 'Lessons')}
                                </h3>
                                <Badge variant="secondary" className="ms-auto">
                                    {detail?.lessons.length || 0}
                                </Badge>
                            </div>
                            {detail?.lessons.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {t('لا توجد دروس بعد', 'No lessons yet')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {detail?.lessons.map((lesson) => (
                                        <div
                                            key={lesson.id}
                                            className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/50 gap-2"
                                        >
                                            <span className="text-sm text-foreground truncate flex-1">
                                                {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button
                                                    onClick={async () => {
                                                        const newVal = !(lesson as any).is_free_preview;
                                                        await (supabase.from('lessons') as any)
                                                            .update({ is_free_preview: newVal })
                                                            .eq('id', lesson.id);
                                                        queryClient.invalidateQueries({ queryKey: ['teacher', user?.id, 'subject-detail'] });
                                                        toast.success(newVal
                                                            ? t('تم تعيين الدرس كمعاينة مجانية', 'Lesson set as free preview')
                                                            : t('تم إزالة المعاينة المجانية', 'Free preview removed'));
                                                    }}
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                                                        (lesson as any).is_free_preview
                                                            ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
                                                            : 'bg-muted text-muted-foreground border-border hover:border-green-300 hover:text-green-600'
                                                    }`}
                                                    title={t('تبديل المعاينة المجانية', 'Toggle free preview')}
                                                >
                                                    {(lesson as any).is_free_preview ? t('مجاني', 'Free') : t('مدفوع', 'Paid')}
                                                </button>
                                                <Badge variant={lesson.is_published ? 'default' : 'secondary'} className="text-[10px]">
                                                    {lesson.is_published ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Students column */}
                        <div className="bg-background rounded-lg border border-border p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-4 h-4 text-primary" />
                                <h3 className="font-medium text-foreground">
                                    {t('الطلاب', 'Students')}
                                </h3>
                                <Badge variant="secondary" className="ms-auto">
                                    {detail?.students.length || 0}
                                </Badge>
                            </div>
                            {detail?.students.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {t('لا يوجد طلاب بعد', 'No students yet')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {detail?.students.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/50"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {student.avatar_url ? (
                                                    <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-foreground truncate">
                                                    {student.full_name || student.email}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {student.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quizzes column */}
                        <div className="bg-background rounded-lg border border-border p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardList className="w-4 h-4 text-primary" />
                                <h3 className="font-medium text-foreground">
                                    {t('الاختبارات', 'Quizzes')}
                                </h3>
                                <Badge variant="secondary" className="ms-auto">
                                    {detail?.quizzes.length || 0}
                                </Badge>
                            </div>
                            {detail?.quizzes.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {t('لا توجد اختبارات بعد', 'No quizzes yet')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {detail?.quizzes.map((quiz) => (
                                        <div
                                            key={quiz.id}
                                            className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/50"
                                        >
                                            <span className="text-sm text-foreground truncate">
                                                {t(quiz.lesson_title_ar, quiz.lesson_title_en || quiz.lesson_title_ar)}
                                            </span>
                                            <Badge variant={quiz.is_enabled ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
                                                {quiz.is_enabled ? t('مفعّل', 'Active') : t('معطّل', 'Disabled')}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Invite Student Dialog */}
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {t('دعوة طالب', 'Invite Student')}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleInviteStudent} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>{t('اسم الطالب', 'Student Name')} *</Label>
                                <Input
                                    value={inviteForm.name}
                                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                    placeholder={t('أدخل اسم الطالب', 'Enter student name')}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('البريد الإلكتروني', 'Email')} *</Label>
                                <Input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    placeholder={t('أدخل البريد الإلكتروني', 'Enter email address')}
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    `سيتم إرسال دعوة للطالب للانضمام إلى مادة "${selectedSubject.title_ar}"`,
                                    `An invitation will be sent to join "${selectedSubject.title_en || selectedSubject.title_ar}"`
                                )}
                            </p>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button type="submit" className="flex-1" disabled={inviting || !inviteForm.name.trim() || !inviteForm.email.trim()}>
                                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <Mail className="w-4 h-4 me-2" />
                                            {t('إرسال الدعوة', 'Send Invite')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Send Announcement Dialog */}
                <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {t('إرسال إعلان', 'Send Announcement')}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSendAnnouncement} className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">
                                {t(
                                    `سيتم إرسال هذا الإعلان إلى ${detail?.students.length || 0} طالب في مادة "${selectedSubject.title_ar}"`,
                                    `This announcement will be sent to ${detail?.students.length || 0} students in "${selectedSubject.title_en || selectedSubject.title_ar}"`
                                )}
                            </p>
                            <div className="space-y-2">
                                <Label>{t('نص الإعلان', 'Announcement Text')} *</Label>
                                <Textarea
                                    value={announcementText}
                                    onChange={(e) => setAnnouncementText(e.target.value)}
                                    placeholder={t('اكتب إعلانك هنا...', 'Write your announcement here...')}
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setAnnouncementOpen(false)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button type="submit" className="flex-1" disabled={sendingAnnouncement || !announcementText.trim()}>
                                    {sendingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <Send className="w-4 h-4 me-2" />
                                            {t('إرسال', 'Send')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            {/* Create/Edit Subject Dialog */}
            <Dialog open={createSubjectOpen} onOpenChange={(open) => { setCreateSubjectOpen(open); if (!open) resetSubjectForm(); }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingSubjectId ? t('تعديل المادة', 'Edit Subject') : t('إنشاء مادة جديدة', 'Create New Subject')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubject} className="space-y-4 mt-2">
                        {/* Cover Image */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <ImagePlus className="w-4 h-4" />
                                {t('صورة الغلاف', 'Cover Image')}
                            </Label>
                            {subjectForm.cover_image_url ? (
                                <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-muted">
                                    <img src={subjectForm.cover_image_url} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setSubjectForm(f => ({ ...f, cover_image_url: '' }))}
                                        className="absolute top-2 end-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 cursor-pointer transition-colors aspect-[16/9]">
                                    {uploadingCover ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    ) : (
                                        <>
                                            <ImagePlus className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                            <span className="text-xs text-muted-foreground">{t('اضغط لرفع صورة الغلاف', 'Click to upload cover image')}</span>
                                            <span className="text-[10px] text-muted-foreground/50 mt-1">JPG, PNG, WebP — {t('حتى 5 ميجابايت', 'up to 5MB')}</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} disabled={uploadingCover} />
                                </label>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('العنوان بالعربية', 'Arabic Title')} <span className="text-destructive">*</span></Label>
                            <Input dir="rtl" value={subjectForm.title_ar} onChange={(e) => setSubjectForm({ ...subjectForm, title_ar: e.target.value })} placeholder={t('مثال: الرياضيات', 'e.g. Mathematics')} required />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t('العنوان بالإنجليزية', 'English Title')}</Label>
                                <TranslationButton sourceText={subjectForm.title_ar} sourceLang="ar" targetLang="en" onTranslated={(text) => setSubjectForm(f => ({ ...f, title_en: text }))} autoTranslating={titleTranslating} />
                            </div>
                            <Input dir="ltr" value={subjectForm.title_en} onChange={(e) => setSubjectForm({ ...subjectForm, title_en: e.target.value })} placeholder="e.g. Mathematics" />
                        </div>
                        {stages.length > 0 && (
                            <div className="space-y-2">
                                <Label>{t('المرحلة الدراسية', 'Stage')}</Label>
                                <Select value={subjectForm.stage_id} onValueChange={(v) => setSubjectForm({ ...subjectForm, stage_id: v })}>
                                    <SelectTrigger><SelectValue placeholder={t('اختر المرحلة (اختياري)', 'Select stage (optional)')} /></SelectTrigger>
                                    <SelectContent>
                                        {stages.map((stage) => (<SelectItem key={stage.id} value={stage.id}>{t(stage.title_ar, stage.title_en || stage.title_ar)}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>{t('الوصف بالعربية', 'Arabic Description')}</Label>
                            <Textarea dir="rtl" rows={2} value={subjectForm.description_ar} onChange={(e) => setSubjectForm({ ...subjectForm, description_ar: e.target.value })} placeholder={t('وصف مختصر للمادة...', 'Brief subject description...')} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t('الوصف بالإنجليزية', 'English Description')}</Label>
                                <TranslationButton sourceText={subjectForm.description_ar} sourceLang="ar" targetLang="en" onTranslated={(text) => setSubjectForm(f => ({ ...f, description_en: text }))} autoTranslating={descTranslating} />
                            </div>
                            <Textarea dir="ltr" rows={2} value={subjectForm.description_en} onChange={(e) => setSubjectForm({ ...subjectForm, description_en: e.target.value })} placeholder="Brief subject description..." />
                        </div>
                        <div className="border-t border-border pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2"><DollarSign className="w-4 h-4" />{t('مادة مدفوعة', 'Paid Subject')}</Label>
                                <Switch checked={subjectForm.is_paid} onCheckedChange={(checked) => setSubjectForm({ ...subjectForm, is_paid: checked })} />
                            </div>
                            {subjectForm.is_paid && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>{t('السعر', 'Price')} *</Label>
                                        <Input type="number" min="0" dir="ltr" value={subjectForm.price_amount} onChange={(e) => setSubjectForm({ ...subjectForm, price_amount: e.target.value })} placeholder="25000" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('العملة', 'Currency')}</Label>
                                        <Select value={subjectForm.price_currency} onValueChange={(v) => setSubjectForm({ ...subjectForm, price_currency: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SYP">{t('ليرة سورية', 'SYP')}</SelectItem>
                                                <SelectItem value="USD">{t('دولار', 'USD')}</SelectItem>
                                                <SelectItem value="SAR">{t('ريال سعودي', 'SAR')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => { setCreateSubjectOpen(false); resetSubjectForm(); }}>{t('إلغاء', 'Cancel')}</Button>
                            <Button type="submit" className="flex-1" disabled={creatingSubject || !subjectForm.title_ar.trim()}>
                                {creatingSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>{editingSubjectId ? <Pencil className="w-4 h-4 me-2" /> : <Plus className="w-4 h-4 me-2" />}{editingSubjectId ? t('حفظ التغييرات', 'Save Changes') : t('إنشاء', 'Create')}</>)}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            </div>
        );
    }

    // ─── Subjects List View ──────────────────────────────────

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('موادي', 'My Subjects')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t(
                            `${subjects.length} مادة تدرسها`,
                            `${subjects.length} subjects you teach`
                        )}
                    </p>
                </div>
                <Button onClick={() => setCreateSubjectOpen(true)}>
                    <Plus className="w-4 h-4 me-2" />
                    {t('مادة جديدة', 'New Subject')}
                </Button>
            </div>

            {/* Search */}
            {subjects.length > 3 && (
                <div className="mb-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('بحث في المواد...', 'Search subjects...')}
                            className="ps-9"
                        />
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="bg-background rounded-lg border border-border p-12 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {searchQuery
                            ? t('لا توجد نتائج', 'No results found')
                            : t('لا توجد مواد بعد', 'No subjects yet')
                        }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery
                            ? t('حاول تغيير البحث', 'Try a different search')
                            : t('ابدأ بإنشاء دروس في مادة لتظهر هنا', 'Start by creating lessons in a subject to see it here')
                        }
                    </p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubjects.map((subject) => (
                        <button
                            key={subject.id}
                            onClick={() => setSelectedSubject(subject)}
                            className="bg-background rounded-lg border border-border p-5 text-start hover:border-primary/30 transition-colors group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <ChevronIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            {subject.stage && (
                                <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] text-muted-foreground rounded mb-2">
                                    {t(subject.stage.title_ar, subject.stage.title_en || subject.stage.title_ar)}
                                </span>
                            )}
                            <h3 className="text-base font-medium text-foreground mb-3">
                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Video className="w-3.5 h-3.5" />
                                    {subject.lessons_count} {t('درس', 'lessons')}
                                </span>
                                <span className="flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {subject.published_count} {t('منشور', 'published')}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Create/Edit Subject Dialog */}
            <Dialog open={createSubjectOpen} onOpenChange={(open) => { setCreateSubjectOpen(open); if (!open) resetSubjectForm(); }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingSubjectId ? t('تعديل المادة', 'Edit Subject') : t('إنشاء مادة جديدة', 'Create New Subject')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubject} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>{t('العنوان بالعربية', 'Arabic Title')} <span className="text-destructive">*</span></Label>
                            <Input
                                dir="rtl"
                                value={subjectForm.title_ar}
                                onChange={(e) => setSubjectForm({ ...subjectForm, title_ar: e.target.value })}
                                placeholder={t('مثال: الرياضيات', 'e.g. Mathematics')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t('العنوان بالإنجليزية', 'English Title')}</Label>
                                <TranslationButton
                                    sourceText={subjectForm.title_ar}
                                    sourceLang="ar" targetLang="en"
                                    onTranslated={(text) => setSubjectForm(f => ({ ...f, title_en: text }))}
                                    autoTranslating={titleTranslating}
                                />
                            </div>
                            <Input
                                dir="ltr"
                                value={subjectForm.title_en}
                                onChange={(e) => setSubjectForm({ ...subjectForm, title_en: e.target.value })}
                                placeholder="e.g. Mathematics"
                            />
                        </div>
                        {stages.length > 0 && (
                            <div className="space-y-2">
                                <Label>{t('المرحلة الدراسية', 'Stage')}</Label>
                                <Select
                                    value={subjectForm.stage_id}
                                    onValueChange={(v) => setSubjectForm({ ...subjectForm, stage_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر المرحلة (اختياري)', 'Select stage (optional)')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map((stage) => (
                                            <SelectItem key={stage.id} value={stage.id}>
                                                {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>{t('الوصف بالعربية', 'Arabic Description')}</Label>
                            <Textarea
                                dir="rtl"
                                rows={2}
                                value={subjectForm.description_ar}
                                onChange={(e) => setSubjectForm({ ...subjectForm, description_ar: e.target.value })}
                                placeholder={t('وصف مختصر للمادة...', 'Brief subject description...')}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t('الوصف بالإنجليزية', 'English Description')}</Label>
                                <TranslationButton
                                    sourceText={subjectForm.description_ar}
                                    sourceLang="ar" targetLang="en"
                                    onTranslated={(text) => setSubjectForm(f => ({ ...f, description_en: text }))}
                                    autoTranslating={descTranslating}
                                />
                            </div>
                            <Textarea
                                dir="ltr"
                                rows={2}
                                value={subjectForm.description_en}
                                onChange={(e) => setSubjectForm({ ...subjectForm, description_en: e.target.value })}
                                placeholder="Brief subject description..."
                            />
                        </div>
                        {/* Pricing */}
                        <div className="border-t border-border pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    {t('مادة مدفوعة', 'Paid Subject')}
                                </Label>
                                <Switch
                                    checked={subjectForm.is_paid}
                                    onCheckedChange={(checked) => setSubjectForm({ ...subjectForm, is_paid: checked })}
                                />
                            </div>
                            {subjectForm.is_paid && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>{t('السعر', 'Price')} *</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            dir="ltr"
                                            value={subjectForm.price_amount}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, price_amount: e.target.value })}
                                            placeholder="25000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('العملة', 'Currency')}</Label>
                                        <Select
                                            value={subjectForm.price_currency}
                                            onValueChange={(v) => setSubjectForm({ ...subjectForm, price_currency: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SYP">{t('ليرة سورية', 'SYP')}</SelectItem>
                                                <SelectItem value="USD">{t('دولار', 'USD')}</SelectItem>
                                                <SelectItem value="SAR">{t('ريال سعودي', 'SAR')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => { setCreateSubjectOpen(false); resetSubjectForm(); }}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={creatingSubject || !subjectForm.title_ar.trim()}>
                                {creatingSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>
                                        {editingSubjectId ? <Pencil className="w-4 h-4 me-2" /> : <Plus className="w-4 h-4 me-2" />}
                                        {editingSubjectId ? t('حفظ التغييرات', 'Save Changes') : t('إنشاء', 'Create')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
