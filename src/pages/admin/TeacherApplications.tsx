import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    UserPlus,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Mail,
    Phone,
    BookOpen,
    GraduationCap,
    Briefcase,
    FileText,
    User,
} from 'lucide-react';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

interface TeacherApplication {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    bio: string | null;
    profession: string | null;
    major: string | null;
    grades_taught: string | null;
    status: ApplicationStatus;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string | null;
}

type FilterTab = ApplicationStatus | 'all';

export default function TeacherApplications() {
    const { t, language } = useLanguage();
    const { user } = useAuth();

    const [activeFilter, setActiveFilter] = useState<FilterTab>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // ── Data fetching ──────────────────────────────────────────────
    const { data: applications, isLoading, refetch } = useQuery({
        queryKey: ['admin', 'teacher-applications'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('teacher_applications')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as TeacherApplication[];
        },
        staleTime: 60 * 1000,
    });

    // ── Derived counts & filtered list ─────────────────────────────
    const counts = useMemo(() => {
        const all = applications || [];
        return {
            all: all.length,
            pending: all.filter((a) => a.status === 'pending').length,
            approved: all.filter((a) => a.status === 'approved').length,
            rejected: all.filter((a) => a.status === 'rejected').length,
        };
    }, [applications]);

    const filteredApplications = useMemo(() => {
        if (!applications) return [];
        if (activeFilter === 'all') return applications;
        return applications.filter((a) => a.status === activeFilter);
    }, [applications, activeFilter]);

    // ── Grade labels ───────────────────────────────────────────────
    const formatGrades = (gradesStr: string | null): string => {
        if (!gradesStr) return '';
        const gradeLabels: Record<string, { ar: string; en: string }> = {
            kindergarten: { ar: 'تمهيدي', en: 'KG' },
            primary: { ar: 'ابتدائي', en: 'Primary' },
            middle: { ar: 'متوسط', en: 'Middle' },
            high: { ar: 'ثانوي', en: 'High' },
        };
        return gradesStr
            .split(',')
            .map((g) => {
                const label = gradeLabels[g.trim()];
                return label ? t(label.ar, label.en) : g.trim();
            })
            .join(' \u00b7 ');
    };

    // ── Actions ────────────────────────────────────────────────────
    const handleApprove = async (app: TeacherApplication) => {
        setProcessingId(app.id);
        try {
            // 1. Update application status
            const { error: updateError } = await supabase
                .from('teacher_applications')
                .update({
                    status: 'approved',
                    reviewed_by: user!.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', app.id);
            if (updateError) throw updateError;

            // 2. Activate the teacher's profile (created during registration with is_active: false)
            // Compare lowercased: profiles.email and teacher_applications.email
            // don't always agree on casing across clients, so a raw equality
            // check can silently return null here, leave is_active untouched,
            // and still toast success — a teacher who can never be approved.
            const { data: teacherProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', app.email.trim().toLowerCase())
                .eq('role', 'teacher')
                .maybeSingle();

            if (teacherProfile) {
                const { error: activateError } = await (supabase.from('profiles') as any)
                    .update({ is_active: true })
                    .eq('id', teacherProfile.id);
                if (activateError) {
                    console.error('Failed to activate profile:', activateError);
                }
            }

            toast.success(
                t(
                    'تم قبول الطلب وتفعيل حساب المعلم',
                    'Application approved and teacher account activated',
                ),
            );
            refetch();
        } catch (err: any) {
            toast.error(t('فشل في قبول الطلب', 'Failed to approve'), {
                description: err.message,
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (app: TeacherApplication) => {
        setProcessingId(app.id);
        try {
            const { error } = await supabase
                .from('teacher_applications')
                .update({
                    status: 'rejected',
                    reviewed_by: user!.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', app.id);
            if (error) throw error;

            toast.success(t('تم رفض الطلب', 'Application rejected'));
            refetch();
        } catch (err: any) {
            toast.error(t('فشل في رفض الطلب', 'Failed to reject'), {
                description: err.message,
            });
        } finally {
            setProcessingId(null);
        }
    };

    // ── Status badge helper ────────────────────────────────────────
    const statusBadge = (status: ApplicationStatus) => {
        const config: Record<
            ApplicationStatus,
            { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }
        > = {
            pending: {
                label: t('قيد الانتظار', 'Pending'),
                variant: 'secondary',
                icon: <Clock className="h-3 w-3" />,
            },
            approved: {
                label: t('مقبول', 'Approved'),
                variant: 'default',
                icon: <CheckCircle className="h-3 w-3" />,
            },
            rejected: {
                label: t('مرفوض', 'Rejected'),
                variant: 'destructive',
                icon: <XCircle className="h-3 w-3" />,
            },
        };
        const c = config[status];
        return (
            <Badge variant={c.variant} className="gap-1">
                {c.icon}
                {c.label}
            </Badge>
        );
    };

    // ── Card border color ──────────────────────────────────────────
    const cardBorder = (status: ApplicationStatus) => {
        switch (status) {
            case 'pending':
                return 'border-l-amber-400';
            case 'approved':
                return 'border-l-green-500';
            case 'rejected':
                return 'border-l-red-400';
        }
    };

    // ── Filter tabs config ─────────────────────────────────────────
    const filterTabs: { key: FilterTab; label: string; count: number }[] = [
        { key: 'pending', label: t('قيد الانتظار', 'Pending'), count: counts.pending },
        { key: 'approved', label: t('مقبول', 'Approved'), count: counts.approved },
        { key: 'rejected', label: t('مرفوض', 'Rejected'), count: counts.rejected },
        { key: 'all', label: t('الكل', 'All'), count: counts.all },
    ];

    // ── Info row component ─────────────────────────────────────────
    const InfoRow = ({
        icon,
        label,
        value,
    }: {
        icon: React.ReactNode;
        label: string;
        value: string | null | undefined;
    }) => {
        if (!value) return null;
        return (
            <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
                <div>
                    <span className="text-muted-foreground">{label}: </span>
                    <span className="text-foreground">{value}</span>
                </div>
            </div>
        );
    };

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserPlus className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold">
                        {t('طلبات المعلمين', 'Teacher Applications')}
                    </h1>
                    {counts.pending > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            {counts.pending} {t('معلق', 'pending')}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
                {filterTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            activeFilter === tab.key
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`ms-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs ${
                                activeFilter === tab.key
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted-foreground/10 text-muted-foreground'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredApplications.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-muted-foreground">
                        {t('لا توجد طلبات', 'No applications found')}
                    </p>
                </div>
            )}

            {/* Application Cards */}
            <div className="grid gap-4">
                {filteredApplications.map((app) => {
                    const isProcessing = processingId === app.id;

                    return (
                        <div
                            key={app.id}
                            className={`border-l-4 ${cardBorder(app.status)} bg-background border border-border rounded-xl p-5 transition-shadow hover:shadow-sm`}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">
                                            {app.full_name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(app.created_at).toLocaleDateString(
                                                language === 'ar' ? 'ar-SA' : 'en-US',
                                                { year: 'numeric', month: 'long', day: 'numeric' },
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {statusBadge(app.status)}
                            </div>

                            {/* Card Body */}
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                <InfoRow
                                    icon={<Mail className="h-4 w-4" />}
                                    label={t('البريد', 'Email')}
                                    value={app.email}
                                />
                                <InfoRow
                                    icon={<Phone className="h-4 w-4" />}
                                    label={t('الهاتف', 'Phone')}
                                    value={app.phone}
                                />
                                <InfoRow
                                    icon={<Briefcase className="h-4 w-4" />}
                                    label={t('المهنة', 'Profession')}
                                    value={app.profession}
                                />
                                <InfoRow
                                    icon={<GraduationCap className="h-4 w-4" />}
                                    label={t('التخصص', 'Major')}
                                    value={app.major}
                                />
                                <InfoRow
                                    icon={<BookOpen className="h-4 w-4" />}
                                    label={t('المراحل', 'Grades')}
                                    value={formatGrades(app.grades_taught)}
                                />
                            </div>

                            {/* Bio */}
                            {app.bio && (
                                <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-foreground/80">
                                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                        {t('نبذة', 'About')}
                                    </span>
                                    {app.bio}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {app.status === 'pending' && (
                                <div className="mt-4 flex gap-2 border-t pt-4">
                                    <Button
                                        size="sm"
                                        onClick={() => handleApprove(app)}
                                        disabled={isProcessing}
                                        className="gap-1.5"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4" />
                                        )}
                                        {t('قبول وتفعيل', 'Approve & Activate')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleReject(app)}
                                        disabled={isProcessing}
                                        className="gap-1.5"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <XCircle className="h-4 w-4" />
                                        )}
                                        {t('رفض', 'Reject')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
