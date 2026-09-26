import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
    Award, Loader2, Users, CheckCircle, Clock, AlertCircle,
    BookMarked, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

interface Subject {
    id: string;
    title_ar: string;
    title_en?: string;
    certificate_enabled?: boolean;
}

interface EligibleStudent {
    user_id: string;
    full_name: string;
    email: string;
    progress_percent: number;
}

function useTeacherSubjectsWithCertStatus(userId: string | undefined) {
    return useQuery({
        queryKey: ['teacher-subjects-cert', userId],
        queryFn: async () => {
            // Get subjects teacher manages
            const { data: subjectData, error } = await supabase
                .from('subjects')
                .select('id, title_ar, title_en')
                .eq('teacher_id', userId!);
            if (error) throw error;

            const subjects = subjectData || [];

            // Get certificate_rules for each subject
            const subjectIds = subjects.map(s => s.id);
            if (subjectIds.length === 0) return [];

            const { data: rules } = await supabase
                .from('certificate_rules')
                .select('subject_id, enabled')
                .in('subject_id', subjectIds);

            const ruleMap = new Map((rules || []).map(r => [r.subject_id, r.enabled]));

            return subjects.map(s => ({
                ...s,
                certificate_enabled: ruleMap.get(s.id) ?? false,
            })) as Subject[];
        },
        enabled: !!userId,
    });
}

function useEligibleStudents(subjectId: string | null) {
    return useQuery({
        queryKey: ['eligible-students', subjectId],
        queryFn: async () => {
            if (!subjectId) return [];

            // Get total published lessons
            const { count: totalLessons } = await supabase
                .from('lessons')
                .select('id', { count: 'exact', head: true })
                .eq('subject_id', subjectId)
                .eq('is_published', true);

            if (!totalLessons) return [];

            // Get per-student progress
            const { data: progressRows } = await supabase
                .from('lesson_progress')
                .select('user_id, completed_at, lessons!inner(subject_id)')
                .eq('lessons.subject_id', subjectId)
                .not('completed_at', 'is', null);

            if (!progressRows) return [];

            // Aggregate completions per user
            const userCompletions: Record<string, number> = {};
            for (const row of progressRows) {
                userCompletions[row.user_id] = (userCompletions[row.user_id] || 0) + 1;
            }

            // Filter fully completed (100%)
            const eligibleIds = Object.entries(userCompletions)
                .filter(([, c]) => c >= totalLessons)
                .map(([uid]) => uid);

            if (eligibleIds.length === 0) return [];

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', eligibleIds);

            return (profiles || []).map(p => ({
                user_id: p.id,
                full_name: p.full_name || p.email || 'Student',
                email: p.email || '',
                progress_percent: 100,
            })) as EligibleStudent[];
        },
        enabled: !!subjectId,
    });
}

function SubjectCertCard({ subject, userId }: { subject: Subject; userId: string }) {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState(false);
    const { data: eligible = [], isLoading: loadingStudents } = useEligibleStudents(expanded ? subject.id : null);

    // check existing certs for these students
    const { data: issuedCerts = [] } = useQuery({
        queryKey: ['issued-certs-for-subject', subject.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('certificates')
                .select('student_id, student_name, verification_code')
                .eq('subject_id', subject.id)
                .in('status', ['issued', 'pending_approval']);
            return data || [];
        },
        enabled: expanded,
    });

    const toggleCert = useMutation({
        mutationFn: async (enabled: boolean) => {
            // Upsert rule
            const { error } = await (supabase.from('certificate_rules') as any).upsert({
                subject_id: subject.id,
                enabled,
                rule_json: { type: 'progress', minPercent: 100 },
            }, { onConflict: 'subject_id' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-subjects-cert', userId] });
            toast.success(t('تم تحديث إعداد الشهادة', 'Certificate setting updated'));
        },
        onError: (err: any) => toast.error(err.message),
    });

    const issueCert = useMutation({
        mutationFn: async (studentId: string) => {
            const { data, error } = await supabase.rpc('issue_certificate', {
                p_student_id: studentId,
                p_subject_id: subject.id,
            });
            if (error) throw error;
            // The RPC returns errors inside the data object
            const result = data as any;
            if (result?.error) {
                throw new Error(result.error);
            }
            if (result?.status === 'already_exists') {
                throw new Error(t('الشهادة صدرت مسبقاً لهذا الطالب', 'Certificate already issued for this student'));
            }
            return result;
        },
        onSuccess: () => {
            toast.success(t('تم إصدار الشهادة بنجاح', 'Certificate issued successfully'));
            queryClient.invalidateQueries({ queryKey: ['issued-certs-for-subject', subject.id] });
        },
        onError: (err: any) => toast.error(t('فشل إصدار الشهادة', 'Failed to issue certificate') + ': ' + err.message),
    });

    return (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="p-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookMarked className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {subject.certificate_enabled
                                    ? t('الشهادة مفعّلة لهذه المادة', 'Certificate enabled for this subject')
                                    : t('الشهادة معطّلة', 'Certificate disabled')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Switch
                                checked={!!subject.certificate_enabled}
                                onCheckedChange={(v) => toggleCert.mutate(v)}
                                disabled={toggleCert.isPending}
                            />
                            <span className={`text-xs font-medium ${subject.certificate_enabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {subject.certificate_enabled ? t('مفعّلة', 'ON') : t('معطّلة', 'OFF')}
                            </span>
                        </label>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                            aria-label={expanded
                                ? t('إخفاء الطلاب المؤهلين', 'Hide eligible students')
                                : t('عرض الطلاب المؤهلين', 'Show eligible students')}
                            title={expanded
                                ? t('إخفاء الطلاب المؤهلين', 'Hide eligible students')
                                : t('عرض الطلاب المؤهلين', 'Show eligible students')}
                            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-border p-5">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t('الطلاب المؤهلون للحصول على الشهادة', 'Students Eligible for Certificate')}
                    </h4>

                    {loadingStudents ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (eligible as any[]).length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                            {t('لا يوجد طلاب مؤهلون بعد', 'No eligible students yet')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(eligible as any[]).map((student) => {
                                // Robust matching: by ID or by email
                                const issuedCert = (issuedCerts as any[]).find(c =>
                                    c.student_id === student.user_id
                                );
                                const hasIssued = !!issuedCert;
                                
                                return (
                                    <div key={student.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{student.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-2">
                                            {hasIssued ? (
                                                <>
                                                    <Badge variant="default" className="gap-1 h-8">
                                                        <CheckCircle className="w-3 h-3" />
                                                        {t('صدرت', 'Issued')}
                                                    </Badge>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => window.open(`/verify/${(issuedCert as any).verification_code}`, '_blank')}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    disabled={!subject.certificate_enabled || issueCert.isPending}
                                                    onClick={() => issueCert.mutate(student.user_id)}
                                                    className="gap-1.5 h-8 flex-1 sm:flex-none"
                                                >
                                                    {issueCert.isPending ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Award className="w-3.5 h-3.5" />
                                                    )}
                                                    {t('إصدار شهادة', 'Issue Certificate')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function TeacherCertificates() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { data: subjects = [], isLoading } = useTeacherSubjectsWithCertStatus(user?.id);

    const enabledCount = subjects.filter(s => s.certificate_enabled).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                    <Award className="w-6 h-6 text-primary" />
                    {t('إدارة الشهادات', 'Certificate Management')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('فعّل الشهادات لموادك واصدرها للطلاب المؤهلين', 'Enable certificates for your subjects and issue them to eligible students')}
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-background rounded-xl border border-border p-3 md:p-4 text-center">
                    <p className="text-xl md:text-2xl font-bold text-foreground">{subjects.length}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t('إجمالي المواد', 'Total Subjects')}</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 md:p-4 text-center">
                    <p className="text-xl md:text-2xl font-bold text-green-600">{enabledCount}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t('شهادة مفعّلة', 'Certs Enabled')}</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 md:p-4 text-center col-span-2 lg:col-span-1">
                    <p className="text-xl md:text-2xl font-bold text-muted-foreground">{subjects.length - enabledCount}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t('معطّلة', 'Disabled')}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : subjects.length === 0 ? (
                <div className="text-center py-16 bg-background rounded-xl border border-border">
                    <BookMarked className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('لا توجد مواد بعد', 'No subjects yet')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('ستظهر هنا موادك بعد أن يعيّنك المدير', 'Your subjects will appear here after the admin assigns you')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {subjects.map((subject) => (
                        <SubjectCertCard key={subject.id} subject={subject} userId={user!.id} />
                    ))}
                </div>
            )}
        </div>
    );
}
