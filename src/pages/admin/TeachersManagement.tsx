import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete, devLog } from '@/lib/adminDb';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { Profile, TeacherInvite } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { UserPlus, Copy, Check, Loader2, MoreHorizontal, UserX, RefreshCw, AlertCircle, Trash2, Users, Beaker, Pencil, Home, Mail } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { TranslationButton } from '@/components/admin/TranslationButton';

export default function TeachersManagement() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const mountedRef = useRef(true);

    // Teachers & Invites state
    const [teachers, setTeachers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<TeacherInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite dialog state
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ full_name: '', email: '' });

    // Create teacher dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '',
        full_name: '',
        bio_ar: '',
        bio_en: '',
        show_on_home: false,
        home_order: 0,
        avatar_url: '',
        password: '',
    });

    // Edit teacher dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Profile | null>(null);
    const [editForm, setEditForm] = useState({
        full_name: '',
        bio_ar: '',
        bio_en: '',
        show_on_home: false,
        home_order: 0,
        social_links: {
            facebook: '',
            twitter: '',
            linkedin: '',
            instagram: '',
            website: ''
        } as Record<string, string>,
    });

    // Auto-translate hooks
    const { isTranslating: createBioTranslating } = useAutoTranslate(createForm.bio_ar, 'ar', 'en', (text) => setCreateForm(f => ({ ...f, bio_en: text })), createDialogOpen);
    const { isTranslating: editBioTranslating } = useAutoTranslate(editForm.bio_ar, 'ar', 'en', (text) => setEditForm(f => ({ ...f, bio_en: text })), editDialogOpen);

    // Password change state
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordTargetTeacher, setPasswordTargetTeacher] = useState<Profile | null>(null);
    const [newPassword, setNewPassword] = useState('');

    // Common UI state
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'teacher' | 'invite'; item: Profile | TeacherInvite } | null>(null);

    // Fetch data
    const fetchData = async () => {
        if (!mountedRef.current) return;

        setLoading(true);
        setError(null);
        const startTime = Date.now();
        devLog('Fetching teachers and invites...');

        try {
            const [teachersResult, invitesResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'teacher')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('teacher_invites')
                    .select('*')
                    .order('created_at', { ascending: false }),
            ]);

            if (!mountedRef.current) return;

            if (teachersResult.error) {
                devLog('Teachers fetch error', teachersResult.error);
                toast.error('فشل في تحميل المعلمين', { description: teachersResult.error.message });
            }
            if (invitesResult.error) {
                devLog('Invites fetch error', invitesResult.error);
                toast.error('فشل في تحميل الدعوات', { description: invitesResult.error.message });
            }

            setTeachers((teachersResult.data as Profile[]) || []);
            setInvites((invitesResult.data as TeacherInvite[]) || []);

            const duration = Date.now() - startTime;
            devLog(`Data loaded in ${duration}ms`, {
                teachers: teachersResult.data?.length || 0,
                invites: invitesResult.data?.length || 0
            });
        } catch (err) {
            if (!mountedRef.current) return;
            const message = err instanceof Error ? err.message : 'Unknown error';
            devLog('Fetch exception', err);
            setError(message);
            toast.error('حدث خطأ', { description: message });
            setTeachers([]);
            setInvites([]);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleRetry = () => {
        fetchData();
    };

    // --- Invite Handling ---
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            toast.error(t('خطأ في المصادقة', 'Authentication error'));
            return;
        }

        if (!inviteForm.full_name.trim() || !inviteForm.email.trim()) {
            toast.error(t('الرجاء ملء جميع الحقول', 'Please fill all fields'));
            return;
        }

        setSubmitting(true);

        try {
            const tokenHash = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const result = await verifiedInsert(
                'teacher_invites',
                {
                    full_name: inviteForm.full_name,
                    email: inviteForm.email,
                    token_hash: tokenHash,
                    created_by: user.id,
                    status: 'pending',
                    expires_at: expiresAt,
                },
                {
                    successMessage: { ar: 'تم إرسال الدعوة بنجاح', en: 'Invite sent successfully' },
                    errorMessage: { ar: 'فشل في إرسال الدعوة', en: 'Failed to send invite' },
                }
            );

            if (result.success) {
                setInviteDialogOpen(false);
                setInviteForm({ full_name: '', email: '' });
                fetchData();
                // Auto-copy invite link
                copyInviteLink(tokenHash);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('فشل في إرسال الدعوة', 'Failed to send invite'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            toast.error(t('خطأ في المصাদقة', 'Authentication error'));
            return;
        }

        if (!createForm.email.trim() || !createForm.full_name.trim()) {
            toast.error(t('الرجاء ملء الحقول المطلوبة', 'Please fill required fields'));
            return;
        }

        setSubmitting(true);

        try {
            const admin = getSupabaseAdmin();

            // 1. Create Auth User
            const { data: authData, error: authError } = await admin.auth.admin.createUser({
                email: createForm.email.trim(),
                password: createForm.password.trim() || crypto.randomUUID(),
                email_confirm: true,
                user_metadata: {
                    full_name: createForm.full_name.trim(),
                    role: 'teacher'
                }
            });

            if (authError) {
                if (authError.message.includes('already exists') || authError.message.includes('registered')) {
                    toast.error(t('هذا البريد مرتبط بحساب آخر بالفعل', 'Email already used by another account'));
                    setSubmitting(false);
                    return;
                }
                throw authError;
            }

            // Wait a moment for the DB trigger to create the profile row
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Update Profile with extra metadata
            const result = await verifiedUpdate(
                'profiles',
                authData.user.id,
                {
                    bio_ar: createForm.bio_ar.trim() || null,
                    bio_en: createForm.bio_en.trim() || null,
                    show_on_home: createForm.show_on_home,
                    home_order: createForm.home_order,
                    avatar_url: createForm.avatar_url.trim() || null,
                },
                {
                    successMessage: { ar: 'تم إنشاء المعلم بنجاح', en: 'Teacher created successfully' },
                    errorMessage: { ar: 'تم إنشاء الحساب ولكن فشل تحديث البيانات الإضافية', en: 'Account created but extra data update failed' },
                }
            );

            if (result.success) {
                setCreateDialogOpen(false);
                setCreateForm({
                    email: '',
                    full_name: '',
                    bio_ar: '',
                    bio_en: '',
                    show_on_home: false,
                    home_order: 0,
                    avatar_url: '',
                    password: '',
                });
                fetchData();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('فشل في إنشاء المعلم', 'Failed to create teacher'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    const copyInviteLink = (tokenHash: string) => {
        const link = `${window.location.origin}/invite/${tokenHash}`;
        navigator.clipboard.writeText(link);
        setCopied(tokenHash);
        toast.success(t('تم نسخ رابط الدعوة', 'Invite link copied'));
        setTimeout(() => setCopied(null), 2000);
    };

    const handleResendInvite = async (invite: TeacherInvite) => {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const result = await verifiedUpdate(
            'teacher_invites',
            invite.id,
            { expires_at: expiresAt },
            {
                successMessage: { ar: 'تم تجديد الدعوة بنجاح', en: 'Invite renewed successfully' },
                errorMessage: { ar: 'فشل في تجديد الدعوة', en: 'Failed to resend invite' },
            }
        );

        if (result.success) {
            fetchData();
        }
    };

    const handleOpenEditDialog = (teacher: Profile) => {
        setEditingTeacher(teacher);
        setEditForm({
            full_name: teacher.full_name || '',
            bio_ar: teacher.bio_ar || '',
            bio_en: teacher.bio_en || '',
            show_on_home: teacher.show_on_home || false,
            home_order: teacher.home_order || 0,
            social_links: (teacher as any).social_links || {
                facebook: '',
                twitter: '',
                linkedin: '',
                instagram: '',
                website: ''
            },
        });
        setEditDialogOpen(true);
    };

    const handleSaveTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher) return;

        if (!editForm.full_name.trim()) {
            toast.error(t('الرجاء إدخال الاسم', 'Please enter name'));
            return;
        }

        setSubmitting(true);

        try {
            const result = await verifiedUpdate(
                'profiles',
                editingTeacher.id,
                {
                    full_name: editForm.full_name,
                    bio_ar: editForm.bio_ar || null,
                    bio_en: editForm.bio_en || null,
                    show_on_home: editForm.show_on_home,
                    home_order: editForm.home_order,
                    social_links: editForm.social_links,
                },
                {
                    successMessage: { ar: 'تم تحديث بيانات المعلم', en: 'Teacher updated successfully' },
                    errorMessage: { ar: 'فشل في تحديث بيانات المعلم', en: 'Failed to update teacher' },
                }
            );

            if (result.success) {
                setEditDialogOpen(false);
                setEditingTeacher(null);
                fetchData();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendPasswordReset = async (teacher: Profile) => {
        if (!teacher.email) {
            toast.error(t('لا يوجد بريد إلكتروني لهذا المعلم', 'No email for this teacher'));
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(teacher.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            toast.success(t('تم إرسال رابط إعادة تعيين كلمة المرور', 'Password reset link sent'), {
                description: teacher.email
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('فشل في إرسال رابط إعادة التعيين', 'Failed to send reset link'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualPasswordChange = async () => {
        if (!passwordTargetTeacher || !newPassword) return;
        if (newPassword.length < 6) {
            toast.error(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
            return;
        }

        setSubmitting(true);
        try {
            const admin = getSupabaseAdmin();
            const { error: updateError } = await admin.auth.admin.updateUserById(passwordTargetTeacher.id, {
                password: newPassword
            });

            if (updateError) {
                // If user doesn't exist in Auth yet (shadow profile)
                if (updateError.message.toLowerCase().includes('not found') || (updateError as any).status === 404) {
                    devLog('User not found in auth, creating new auth account for shadow profile');
                    const { data: createData, error: createError } = await admin.auth.admin.createUser({
                        email: passwordTargetTeacher.email!,
                        password: newPassword,
                        email_confirm: true,
                        user_metadata: {
                            full_name: passwordTargetTeacher.full_name,
                            role: 'teacher'
                        }
                    });

                    if (createError) throw createError;

                    toast.success(t('تم إنشاء حساب المعلم وتعيين كلمة المرور', 'Teacher account created and password set'));
                    fetchData();
                } else {
                    throw updateError;
                }
            } else {
                toast.success(t('تم تغيير كلمة المرور بنجاح', 'Password changed successfully'));
            }

            setPasswordDialogOpen(false);
            setNewPassword('');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('فشل في تغيير كلمة المرور', 'Failed to change password'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    // --- Status Toggle ---
    const handleToggleStatus = async (teacher: Profile) => {
        const result = await verifiedUpdate(
            'profiles',
            teacher.id,
            { is_active: !teacher.is_active },
            {
                successMessage: teacher.is_active
                    ? { ar: 'تم تعطيل المعلم', en: 'Teacher disabled' }
                    : { ar: 'تم تفعيل المعلم', en: 'Teacher enabled' },
                errorMessage: { ar: 'فشل في تغيير الحالة', en: 'Failed to change status' },
            }
        );

        if (result.success) {
            fetchData();
        }
    };

    // --- Deletion ---
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            if (deleteTarget.type === 'invite') {
                const invite = deleteTarget.item as TeacherInvite;
                const result = await verifiedDelete(
                    'teacher_invites',
                    invite.id,
                    {
                        successMessage: { ar: 'تم حذف الدعوة', en: 'Invite deleted' },
                        errorMessage: { ar: 'فشل في حذف الدعوة', en: 'Failed to delete invite' },
                    }
                );

                if (result.success) {
                    fetchData();
                }
            } else {
                const teacher = deleteTarget.item as Profile;
                // For teachers, we soft-delete by setting is_active = false and clearing role
                const result = await verifiedUpdate(
                    'profiles',
                    teacher.id,
                    { is_active: false, role: 'student' },
                    {
                        successMessage: { ar: 'تم إزالة المعلم', en: 'Teacher removed' },
                        errorMessage: { ar: 'فشل في حذف المعلم', en: 'Failed to delete teacher' },
                    }
                );

                if (result.success) {
                    fetchData();
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    // Helpers
    const statusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'secondary',
            accepted: 'default',
            expired: 'destructive',
            revoked: 'outline',
        };
        const labels: Record<string, { ar: string; en: string }> = {
            pending: { ar: 'معلق', en: 'Pending' },
            accepted: { ar: 'مقبول', en: 'Accepted' },
            expired: { ar: 'منتهي', en: 'Expired' },
            revoked: { ar: 'ملغى', en: 'Revoked' },
        };
        return (
            <Badge variant={variants[status] || 'outline'}>
                {t(labels[status]?.ar || status, labels[status]?.en || status)}
            </Badge>
        );
    };

    const pendingInvites = invites.filter(i => i.status === 'pending');

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إدارة المعلمين', 'Teachers Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('إضافة وإدارة حسابات المعلمين', 'Add and manage teacher accounts')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                        <UserPlus className="w-4 h-4 me-2" />
                        {t('إنشاء معلم', 'Create Teacher')}
                    </Button>
                    <Button onClick={() => setInviteDialogOpen(true)}>
                        <UserPlus className="w-4 h-4 me-2" />
                        {t('دعوة معلم', 'Invite Teacher')}
                    </Button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-destructive">{t('حدث خطأ', 'An error occurred')}</p>
                            <p className="text-xs text-destructive/80">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRetry}>
                            <RefreshCw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-foreground mb-3">
                        {t('الدعوات المعلقة', 'Pending Invites')}
                    </h2>
                    <div className="bg-background rounded-lg border border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('الاسم', 'Name')}</TableHead>
                                    <TableHead>{t('البريد', 'Email')}</TableHead>
                                    <TableHead>{t('الحالة', 'Status')}</TableHead>
                                    <TableHead>{t('انتهاء', 'Expires')}</TableHead>
                                    <TableHead className="w-[100px]">{t('الإجراءات', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingInvites.map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell className="font-medium">{invite.full_name}</TableCell>
                                        <TableCell>{invite.email}</TableCell>
                                        <TableCell>{statusBadge(invite.status)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(invite.expires_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => copyInviteLink(invite.token_hash)}
                                                >
                                                    {copied === invite.token_hash ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleResendInvite(invite)}>
                                                            <RefreshCw className="w-4 h-4 me-2" />
                                                            {t('تجديد الدعوة', 'Resend Invite')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteTarget({ type: 'invite', item: invite })}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4 me-2" />
                                                            {t('حذف', 'Delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Teachers List */}
            <div>
                <h2 className="text-lg font-medium text-foreground mb-3">
                    {t('المعلمون', 'Teachers')}
                </h2>
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : teachers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                {t('لا يوجد معلمون حتى الآن', 'No teachers yet')}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('ابدأ بدعوة أول معلم للأكاديمية', 'Start by inviting the first teacher')}
                            </p>
                            <Button onClick={() => setInviteDialogOpen(true)}>
                                <UserPlus className="w-4 h-4 me-2" />
                                {t('دعوة معلم', 'Invite Teacher')}
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('الاسم', 'Name')}</TableHead>
                                    <TableHead>{t('البريد', 'Email')}</TableHead>
                                    <TableHead>{t('الصفحة الرئيسية', 'Home Page')}</TableHead>
                                    <TableHead>{t('الحالة', 'Status')}</TableHead>
                                    <TableHead>{t('تاريخ الانضمام', 'Joined')}</TableHead>
                                    <TableHead className="w-[100px]">{t('الإجراءات', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teachers.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{teacher.full_name || '-'}</p>
                                                {teacher.bio_ar && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{teacher.bio_ar}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{teacher.email}</TableCell>
                                        <TableCell>
                                            {teacher.show_on_home ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    <Home className="w-3 h-3 me-1" />
                                                    {teacher.home_order || 0}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                                                {teacher.is_active ? t('نشط', 'Active') : t('معطل', 'Disabled')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(teacher.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenEditDialog(teacher)}>
                                                        <Pencil className="w-4 h-4 me-2" />
                                                        {t('تعديل', 'Edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSendPasswordReset(teacher)} disabled={submitting}>
                                                        <Mail className="w-4 h-4 me-2" />
                                                        {t('إعادة تعيين كلمة المرور', 'Reset Password')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        setPasswordTargetTeacher(teacher);
                                                        setPasswordDialogOpen(true);
                                                    }}>
                                                        <RefreshCw className="w-4 h-4 me-2" />
                                                        {t('تغيير كلمة المرور يدوياً', 'Change Password Manually')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleToggleStatus(teacher)}>
                                                        <UserX className="w-4 h-4 me-2" />
                                                        {teacher.is_active ? t('تعطيل', 'Disable') : t('تفعيل', 'Enable')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteTarget({ type: 'teacher', item: teacher })}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4 me-2" />
                                                        {t('إزالة', 'Remove')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Create Teacher Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('إنشاء معلم جديد', 'Create New Teacher')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTeacher} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="create_email">{t('البريد الإلكتروني', 'Email')} *</Label>
                            <Input
                                id="create_email"
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create_name">{t('الاسم الكامل', 'Full Name')} *</Label>
                            <Input
                                id="create_name"
                                value={createForm.full_name}
                                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create_password">{t('كلمة المرور', 'Password')} ({t('اختياري', 'Optional')})</Label>
                            <Input
                                id="create_password"
                                type="password"
                                placeholder={t('أترك فارغاً للتوليد التلقائي', 'Leave empty for auto-generation')}
                                value={createForm.password}
                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create_bio_ar">{t('السيرة الذاتية بالعربية', 'Arabic Bio')}</Label>
                            <Textarea
                                id="create_bio_ar"
                                value={createForm.bio_ar}
                                onChange={(e) => setCreateForm({ ...createForm, bio_ar: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="create_bio_en">{t('السيرة الذاتية بالإنجليزية', 'English Bio')}</Label>
                                <TranslationButton sourceText={createForm.bio_ar} sourceLang="ar" targetLang="en"
                                    onTranslated={(text) => setCreateForm(f => ({ ...f, bio_en: text }))}
                                    autoTranslating={createBioTranslating} />
                            </div>
                            <Textarea
                                id="create_bio_en"
                                value={createForm.bio_en}
                                onChange={(e) => setCreateForm({ ...createForm, bio_en: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create_avatar">{t('رابط الصورة الشخصية', 'Avatar URL')}</Label>
                            <Input
                                id="create_avatar"
                                type="url"
                                value={createForm.avatar_url}
                                onChange={(e) => setCreateForm({ ...createForm, avatar_url: e.target.value })}
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="create_show_home">{t('عرض في الصفحة الرئيسية', 'Show on Home Page')}</Label>
                            <Switch
                                id="create_show_home"
                                checked={createForm.show_on_home}
                                onCheckedChange={(checked) => setCreateForm({ ...createForm, show_on_home: checked })}
                            />
                        </div>
                        {createForm.show_on_home && (
                            <div className="space-y-2">
                                <Label htmlFor="create_order">{t('ترتيب الظهور', 'Display Order')}</Label>
                                <Input
                                    id="create_order"
                                    type="number"
                                    value={createForm.home_order}
                                    onChange={(e) => setCreateForm({ ...createForm, home_order: parseInt(e.target.value) || 0 })}
                                    min={0}
                                />
                            </div>
                        )}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                            <p>{t('ملاحظة: سيتمكن المعلم من التسجيل في المنصة باستخدام البريد الإلكتروني المدخل.',
                                'Note: The teacher can register on the platform using the entered email.')}</p>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('إنشاء', 'Create')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Invite Teacher Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('دعوة معلم جديد', 'Invite New Teacher')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite_name">{t('الاسم الكامل', 'Full Name')} *</Label>
                            <Input
                                id="invite_name"
                                value={inviteForm.full_name}
                                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite_email">{t('البريد الإلكتروني', 'Email')} *</Label>
                            <Input
                                id="invite_email"
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setInviteDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('إرسال الدعوة', 'Send Invite')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Teacher Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('تعديل بيانات المعلم', 'Edit Teacher')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveTeacher} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_name">{t('الاسم الكامل', 'Full Name')} *</Label>
                            <Input
                                id="edit_name"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_bio_ar">{t('السيرة الذاتية بالعربية', 'Arabic Bio')}</Label>
                            <Textarea
                                id="edit_bio_ar"
                                value={editForm.bio_ar}
                                onChange={(e) => setEditForm({ ...editForm, bio_ar: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="edit_bio_en">{t('السيرة الذاتية بالإنجليزية', 'English Bio')}</Label>
                                <TranslationButton sourceText={editForm.bio_ar} sourceLang="ar" targetLang="en"
                                    onTranslated={(text) => setEditForm(f => ({ ...f, bio_en: text }))}
                                    autoTranslating={editBioTranslating} />
                            </div>
                            <Textarea
                                id="edit_bio_en"
                                value={editForm.bio_en}
                                onChange={(e) => setEditForm({ ...editForm, bio_en: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-medium mb-3">{t('الروابط الاجتماعية', 'Social Links')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('فيسبوك', 'Facebook')}</Label>
                                    <Input
                                        value={editForm.social_links.facebook}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            social_links: { ...editForm.social_links, facebook: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('تويتر', 'Twitter')}</Label>
                                    <Input
                                        value={editForm.social_links.twitter}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            social_links: { ...editForm.social_links, twitter: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('لينكد إن', 'LinkedIn')}</Label>
                                    <Input
                                        value={editForm.social_links.linkedin}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            social_links: { ...editForm.social_links, linkedin: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('إنستغرام', 'Instagram')}</Label>
                                    <Input
                                        value={editForm.social_links.instagram}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            social_links: { ...editForm.social_links, instagram: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t('الموقع الشخصي', 'Personal Website')}</Label>
                                    <Input
                                        value={editForm.social_links.website}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            social_links: { ...editForm.social_links, website: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show_on_home">{t('عرض في الصفحة الرئيسية', 'Show on Home Page')}</Label>
                            <Switch
                                id="show_on_home"
                                checked={editForm.show_on_home}
                                onCheckedChange={(checked) => setEditForm({ ...editForm, show_on_home: checked })}
                            />
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-medium mb-3">{t('إعدادات الصفحة الرئيسية', 'Homepage Settings')}</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show_on_home">{t('عرض في الصفحة الرئيسية', 'Show on Home Page')}</Label>
                                    <Switch
                                        id="show_on_home"
                                        checked={editForm.show_on_home}
                                        onCheckedChange={(checked) => setEditForm({ ...editForm, show_on_home: checked })}
                                    />
                                </div>
                                {editForm.show_on_home && (
                                    <div className="space-y-2">
                                        <Label htmlFor="home_order">{t('ترتيب الظهور', 'Display Order')}</Label>
                                        <Input
                                            id="home_order"
                                            type="number"
                                            value={editForm.home_order}
                                            onChange={(e) => setEditForm({ ...editForm, home_order: parseInt(e.target.value) || 0 })}
                                            min={0}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t('الأرقام الأصغر تظهر أولاً', 'Lower numbers appear first')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حفظ', 'Save')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manual Password Change Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('تغيير كلمة المرور يدوياً', 'Change Password Manually')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">{t('تحذير للمشرف', 'Admin Warning')}</p>
                                <p>{t('تغيير كلمة المرور سيؤدي إلى تحديث بيانات الدخول للمعلم فوراً.', 'Changing the password will update the teacher\'s login credentials immediately.')}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('المعلم', 'Teacher')}</Label>
                            <Input value={passwordTargetTeacher?.full_name || ''} disabled />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new_password">{t('كلمة المرور الجديدة', 'New Password')}</Label>
                            <Input
                                id="new_password"
                                type="password"
                                placeholder={t('أدخل 6 أحرف على الأقل', 'Enter at least 6 characters')}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setPasswordDialogOpen(false)}
                                disabled={submitting}
                            >
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button
                                onClick={handleManualPasswordChange}
                                disabled={submitting || newPassword.length < 6}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                        {t('جاري الحفظ...', 'Saving...')}
                                    </>
                                ) : (
                                    t('تحديث كلمة المرور', 'Update Password')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('تأكيد الحذف', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.type === 'invite'
                                ? t(
                                    `هل أنت متأكد من حذف دعوة "${(deleteTarget.item as TeacherInvite).full_name}"؟`,
                                    `Are you sure you want to delete the invite for "${(deleteTarget.item as TeacherInvite).full_name}"?`
                                )
                                : t(
                                    `هل أنت متأكد من إزالة المعلم "${(deleteTarget?.item as Profile)?.full_name || (deleteTarget?.item as Profile)?.email}"؟ سيتم تحويل الحساب إلى طالب.`,
                                    `Are you sure you want to remove "${(deleteTarget?.item as Profile)?.full_name || (deleteTarget?.item as Profile)?.email}"? The account will be converted to student.`
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
