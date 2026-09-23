import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2, Megaphone, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    body: string;
    is_active: boolean;
    created_at: string;
    subject_id: string | null;
    subjects?: { title_ar: string; title_en: string } | null;
}

export default function TeacherAnnouncements() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Announcement | null>(null);
    const [form, setForm] = useState({ title: '', body: '', subject_id: '', is_active: true });

    // Fetch teacher's subjects
    const { data: subjects = [] } = useQuery({
        queryKey: ['teacher-subjects-simple', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('subjects')
                .select('id, title_ar, title_en')
                .eq('teacher_id', user!.id)
                .eq('is_active', true)
                .order('title_ar');
            return data || [];
        },
        enabled: !!user?.id,
    });

    // Fetch announcements
    const { data: announcements = [], isLoading } = useQuery({
        queryKey: ['teacher-announcements', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcements')
                .select('*, subjects(title_ar, title_en)')
                .eq('teacher_id', user!.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as Announcement[];
        },
        enabled: !!user?.id,
    });

    const openCreate = () => {
        setEditTarget(null);
        setForm({ title: '', body: '', subject_id: '', is_active: true });
        setDialogOpen(true);
    };

    const openEdit = (ann: Announcement) => {
        setEditTarget(ann);
        setForm({
            title: ann.title,
            body: ann.body,
            subject_id: ann.subject_id || '',
            is_active: ann.is_active,
        });
        setDialogOpen(true);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!form.title.trim() || !form.body.trim()) {
                throw new Error(t('العنوان والمحتوى مطلوبان', 'Title and body are required'));
            }

            const payload = {
                title: form.title.trim(),
                body: form.body.trim(),
                subject_id: form.subject_id || null,
                is_active: form.is_active,
                teacher_id: user!.id,
            };

            if (editTarget) {
                const { error } = await (supabase.from('announcements') as any)
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq('id', editTarget.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from('announcements') as any).insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(editTarget
                ? t('تم تحديث الإعلان', 'Announcement updated')
                : t('تم إنشاء الإعلان', 'Announcement created')
            );
            queryClient.invalidateQueries({ queryKey: ['teacher-announcements', user?.id] });
            setDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await (supabase.from('announcements') as any)
                .update({ is_active })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-announcements', user?.id] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(t('تم حذف الإعلان', 'Announcement deleted'));
            queryClient.invalidateQueries({ queryKey: ['teacher-announcements', user?.id] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-primary" />
                        {t('الإعلانات', 'Announcements')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('أنشئ إعلانات للطلاب المسجلين في موادك', 'Create announcements for students enrolled in your subjects')}
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 me-2" />
                    {t('إعلان جديد', 'New Announcement')}
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : announcements.length === 0 ? (
                <div className="text-center py-16 bg-background rounded-xl border border-border">
                    <Megaphone className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('لا توجد إعلانات', 'No announcements yet')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('أنشئ إعلانك الأول ليظهر للطلاب', 'Create your first announcement to reach students')}
                    </p>
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إنشاء إعلان', 'Create Announcement')}
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map((ann) => (
                        <div
                            key={ann.id}
                            className={`bg-background rounded-xl border p-5 transition-all ${ann.is_active ? 'border-border' : 'border-border/40 opacity-60'}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-foreground truncate">{ann.title}</h3>
                                        {ann.is_active ? (
                                            <Badge variant="default" className="text-[10px]">{t('نشط', 'Active')}</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px]">{t('مخفي', 'Hidden')}</Badge>
                                        )}
                                        {ann.subjects && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                {t(ann.subjects.title_ar, ann.subjects.title_en || ann.subjects.title_ar)}
                                            </Badge>
                                        )}
                                        {!ann.subject_id && (
                                            <Badge variant="outline" className="text-[10px]">
                                                {t('عام', 'General')}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{ann.body}</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">
                                        {new Date(ann.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => toggleActiveMutation.mutate({ id: ann.id, is_active: !ann.is_active })}
                                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                        title={ann.is_active ? t('إخفاء', 'Hide') : t('إظهار', 'Show')}
                                    >
                                        {ann.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => openEdit(ann)}
                                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteMutation.mutate(ann.id)}
                                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editTarget ? t('تعديل الإعلان', 'Edit Announcement') : t('إعلان جديد', 'New Announcement')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>{t('المادة (اختياري)', 'Subject (optional)')}</Label>
                            <Select
                                value={form.subject_id || 'all'}
                                onValueChange={(v) => setForm({ ...form, subject_id: v === 'all' ? '' : v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('لجميع الطلاب', 'For all students')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('عام - لجميع طلابي', 'General - All my students')}</SelectItem>
                                    {subjects.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {t(s.title_ar, s.title_en || s.title_ar)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('عنوان الإعلان', 'Announcement Title')} <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder={t('مثال: إشعار بالاختبار القادم', 'e.g. Upcoming quiz notice')}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('محتوى الإعلان', 'Announcement Body')} <span className="text-destructive">*</span></Label>
                            <Textarea
                                rows={4}
                                value={form.body}
                                onChange={(e) => setForm({ ...form, body: e.target.value })}
                                placeholder={t('اكتب تفاصيل الإعلان هنا...', 'Write announcement details here...')}
                            />
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <Label>{t('نشط (مرئي للطلاب)', 'Active (visible to students)')}</Label>
                            <Switch
                                checked={form.is_active}
                                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                                {editTarget ? t('تحديث', 'Update') : t('نشر', 'Publish')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
