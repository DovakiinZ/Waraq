import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { StudentStage } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Loader2, Search, Users, GraduationCap, BookOpen, Award,
    ChevronRight, Mail, Phone, Calendar, Sparkles, ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';

// student_stage is a text enum on profiles, not a FK into `stages`.
const STAGE_LABELS: Record<StudentStage, { ar: string; en: string }> = {
    kindergarten: { ar: 'تمهيدي', en: 'Kindergarten' },
    primary: { ar: 'ابتدائي', en: 'Primary' },
    middle: { ar: 'متوسط', en: 'Middle' },
    high: { ar: 'ثانوي', en: 'High' },
};

const GRADE_LABELS: Record<number, { ar: string; en: string }> = {
    0: { ar: 'التمهيدي', en: 'KG' },
    1: { ar: 'الصف الأول', en: 'Grade 1' },
    2: { ar: 'الصف الثاني', en: 'Grade 2' },
    3: { ar: 'الصف الثالث', en: 'Grade 3' },
    4: { ar: 'الصف الرابع', en: 'Grade 4' },
    5: { ar: 'الصف الخامس', en: 'Grade 5' },
    6: { ar: 'الصف السادس', en: 'Grade 6' },
    7: { ar: 'الصف السابع', en: 'Grade 7' },
    8: { ar: 'الصف الثامن', en: 'Grade 8' },
    9: { ar: 'الصف التاسع', en: 'Grade 9' },
    10: { ar: 'الصف العاشر', en: 'Grade 10' },
    11: { ar: 'الصف الحادي عشر', en: 'Grade 11' },
    12: { ar: 'الصف الثاني عشر', en: 'Grade 12' },
};

const GENDER_LABELS: Record<string, { ar: string; en: string }> = {
    male: { ar: 'ذكر', en: 'Male' },
    female: { ar: 'أنثى', en: 'Female' },
    unspecified: { ar: 'غير محدد', en: 'Unspecified' },
};

interface StudentRow {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
    student_stage?: StudentStage | null;
    grade?: number | null;
    gender?: string | null;
    phone?: string | null;
    is_active?: boolean | null;
    created_at?: string;
}

export default function StudentsManagement() {
    const { t, language, direction } = useLanguage();
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [selected, setSelected] = useState<StudentRow | null>(null);

    const dateLocale = language === 'ar' ? arLocale : enUS;

    const formatDate = (value?: string | null) => {
        if (!value) return '—';
        try {
            return format(new Date(value), 'PP', { locale: dateLocale });
        } catch {
            return value;
        }
    };

    const stageLabel = (stage?: StudentStage | null) =>
        stage && STAGE_LABELS[stage]
            ? t(STAGE_LABELS[stage].ar, STAGE_LABELS[stage].en)
            : t('غير محدد', 'Not set');

    const gradeLabel = (grade?: number | null) => {
        if (grade === null || grade === undefined) return t('غير محدد', 'Not set');
        const label = GRADE_LABELS[grade];
        return label ? t(label.ar, label.en) : String(grade);
    };

    // ── All students ─────────────────────────────────────────────────────
    const { data: students = [], isLoading } = useQuery({
        queryKey: ['admin', 'students'],
        queryFn: async (): Promise<StudentRow[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url, student_stage, grade, gender, phone, is_active, created_at')
                .eq('role', 'student')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as unknown as StudentRow[];
        },
    });

    // Enrollment counts for every student in one round trip, rather than a
    // query per row.
    const { data: enrollmentCounts = {} } = useQuery({
        queryKey: ['admin', 'students', 'enrollment-counts'],
        queryFn: async (): Promise<Record<string, number>> => {
            const { data, error } = await supabase
                .from('student_subjects')
                .select('student_id');

            if (error) throw error;
            const counts: Record<string, number> = {};
            for (const row of (data || []) as any[]) {
                counts[row.student_id] = (counts[row.student_id] || 0) + 1;
            }
            return counts;
        },
    });

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return students.filter((s) => {
            if (stageFilter !== 'all' && s.student_stage !== stageFilter) return false;
            if (!term) return true;
            return (
                (s.full_name || '').toLowerCase().includes(term) ||
                (s.email || '').toLowerCase().includes(term)
            );
        });
    }, [students, search, stageFilter]);

    const stageTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const s of students) {
            const key = s.student_stage || 'unset';
            totals[key] = (totals[key] || 0) + 1;
        }
        return totals;
    }, [students]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    {t('الطلاب', 'Students')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {t(
                        'كل الطلاب المسجلين، مراحلهم وصفوفهم وتفاصيلهم الكاملة',
                        'Every registered student, their stage and grade, and their full details'
                    )}
                </p>
            </div>

            {/* Stage summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl border bg-card">
                    <div className="text-2xl font-bold">{students.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {t('إجمالي الطلاب', 'Total students')}
                    </div>
                </div>
                {(Object.keys(STAGE_LABELS) as StudentStage[]).map((stage) => (
                    <div key={stage} className="p-4 rounded-xl border bg-card">
                        <div className="text-2xl font-bold">{stageTotals[stage] || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {stageLabel(stage)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('ابحث بالاسم أو البريد', 'Search by name or email')}
                        className="ps-9"
                    />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-full sm:w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('كل المراحل', 'All stages')}</SelectItem>
                        {(Object.keys(STAGE_LABELS) as StudentStage[]).map((stage) => (
                            <SelectItem key={stage} value={stage}>{stageLabel(stage)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="border rounded-xl bg-background overflow-hidden">
                {isLoading ? (
                    <div className="p-16 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                        <p className="text-muted-foreground text-sm">{t('جاري التحميل...', 'Loading...')}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                            {students.length === 0
                                ? t('لا يوجد طلاب بعد', 'No students yet')
                                : t('لا نتائج مطابقة', 'No matching results')}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('الطالب', 'Student')}</TableHead>
                                <TableHead>{t('المرحلة', 'Stage')}</TableHead>
                                <TableHead>{t('الصف', 'Grade')}</TableHead>
                                <TableHead>{t('المواد', 'Subjects')}</TableHead>
                                <TableHead>{t('تاريخ التسجيل', 'Joined')}</TableHead>
                                <TableHead className="w-[60px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((student) => (
                                <TableRow
                                    key={student.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => setSelected(student)}
                                >
                                    <TableCell>
                                        <div className="font-medium">
                                            {student.full_name || t('بدون اسم', 'Unnamed')}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{student.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{stageLabel(student.student_stage)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{gradeLabel(student.grade)}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{enrollmentCounts[student.id] || 0}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {formatDate(student.created_at)}
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight
                                            className={`w-4 h-4 text-muted-foreground ${direction === 'rtl' ? 'rotate-180' : ''}`}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <StudentDetailSheet
                student={selected}
                onClose={() => setSelected(null)}
                stageLabel={stageLabel}
                gradeLabel={gradeLabel}
                formatDate={formatDate}
            />
        </div>
    );
}

// ── Detail drawer ────────────────────────────────────────────────────────

interface DetailProps {
    student: StudentRow | null;
    onClose: () => void;
    stageLabel: (stage?: StudentStage | null) => string;
    gradeLabel: (grade?: number | null) => string;
    formatDate: (value?: string | null) => string;
}

function StudentDetailSheet({ student, onClose, stageLabel, gradeLabel, formatDate }: DetailProps) {
    const { t, language } = useLanguage();

    const { data: detail, isLoading } = useQuery({
        queryKey: ['admin', 'students', student?.id, 'detail'],
        enabled: !!student?.id,
        queryFn: async () => {
            const studentId = student!.id;

            const [enrollments, certificates, orders, level, progress] = await Promise.all([
                supabase
                    .from('student_subjects')
                    .select('id, created_at, subject:subjects(id, title_ar, title_en, teacher_id)')
                    .eq('student_id', studentId),
                supabase
                    .from('certificates')
                    .select('id, status, issued_at, subject:subjects(title_ar, title_en)')
                    .eq('student_id', studentId),
                supabase
                    .from('orders')
                    .select('id, status, amount, created_at, subject:subjects(title_ar, title_en)')
                    .eq('student_id', studentId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('student_levels')
                    .select('level, total_xp')
                    .eq('student_id', studentId)
                    .maybeSingle(),
                supabase
                    .from('lesson_progress')
                    .select('progress_percent, completed_at, updated_at')
                    .eq('user_id', studentId),
            ]);

            const progressRows = (progress.data || []) as any[];
            const completed = progressRows.filter((p) => p.completed_at).length;
            const lastActivity = progressRows
                .map((p) => p.updated_at)
                .filter(Boolean)
                .sort()
                .pop();

            return {
                enrollments: (enrollments.data || []) as any[],
                certificates: (certificates.data || []) as any[],
                orders: (orders.data || []) as any[],
                level: level.data as any,
                lessonsStarted: progressRows.length,
                lessonsCompleted: completed,
                lastActivity,
            };
        },
    });

    const title = (row: any) =>
        row ? (language === 'ar' ? row.title_ar : row.title_en || row.title_ar) : '—';

    return (
        <Sheet open={!!student} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
                <SheetHeader>
                    <SheetTitle>{student?.full_name || t('بدون اسم', 'Unnamed')}</SheetTitle>
                    <SheetDescription>{student?.email}</SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
                    <div className="space-y-6 pb-8">
                        {/* Where they belong */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-primary" />
                                {t('المرحلة والصف', 'Stage & Grade')}
                            </h3>
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                                <Field label={t('المرحلة', 'Stage')} value={stageLabel(student?.student_stage)} />
                                <Field label={t('الصف', 'Grade')} value={gradeLabel(student?.grade)} />
                                <Field
                                    label={t('الجنس', 'Gender')}
                                    value={
                                        student?.gender && GENDER_LABELS[student.gender]
                                            ? t(GENDER_LABELS[student.gender].ar, GENDER_LABELS[student.gender].en)
                                            : t('غير محدد', 'Not set')
                                    }
                                />
                                <Field
                                    label={t('الحالة', 'Status')}
                                    value={
                                        student?.is_active === false
                                            ? t('معطل', 'Disabled')
                                            : t('نشط', 'Active')
                                    }
                                />
                            </dl>
                        </section>

                        {/* Contact */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold">{t('بيانات الاتصال', 'Contact')}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="break-all">{student?.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span>{student?.phone || t('غير مسجل', 'Not provided')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span>
                                        {t('سجل في', 'Joined')} {formatDate(student?.created_at)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {isLoading ? (
                            <div className="py-10 text-center">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                            </div>
                        ) : (
                            <>
                                {/* Learning activity */}
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        {t('النشاط', 'Activity')}
                                    </h3>
                                    <dl className="grid grid-cols-2 gap-3 text-sm">
                                        <Field
                                            label={t('المستوى', 'Level')}
                                            value={detail?.level?.level ?? 1}
                                        />
                                        <Field
                                            label={t('النقاط', 'XP')}
                                            value={detail?.level?.total_xp ?? 0}
                                        />
                                        <Field
                                            label={t('دروس بدأها', 'Lessons started')}
                                            value={detail?.lessonsStarted ?? 0}
                                        />
                                        <Field
                                            label={t('دروس أكملها', 'Lessons completed')}
                                            value={detail?.lessonsCompleted ?? 0}
                                        />
                                        <Field
                                            label={t('آخر نشاط', 'Last activity')}
                                            value={formatDate(detail?.lastActivity)}
                                        />
                                    </dl>
                                </section>

                                {/* Enrolled subjects */}
                                <DetailList
                                    icon={<BookOpen className="w-4 h-4 text-primary" />}
                                    heading={`${t('المواد المسجلة', 'Enrolled subjects')} (${detail?.enrollments.length || 0})`}
                                    empty={t('لا توجد مواد', 'No subjects')}
                                    rows={detail?.enrollments || []}
                                    render={(row) => (
                                        <>
                                            <span className="font-medium">{title(row.subject)}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(row.created_at)}
                                            </span>
                                        </>
                                    )}
                                />

                                {/* Orders */}
                                <DetailList
                                    icon={<ShoppingCart className="w-4 h-4 text-primary" />}
                                    heading={`${t('الطلبات', 'Orders')} (${detail?.orders.length || 0})`}
                                    empty={t('لا توجد طلبات', 'No orders')}
                                    rows={detail?.orders || []}
                                    render={(row) => (
                                        <>
                                            <span className="font-medium">{title(row.subject)}</span>
                                            <span className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
                                                <span className="text-xs text-muted-foreground">{row.amount ?? '—'}</span>
                                            </span>
                                        </>
                                    )}
                                />

                                {/* Certificates */}
                                <DetailList
                                    icon={<Award className="w-4 h-4 text-primary" />}
                                    heading={`${t('الشهادات', 'Certificates')} (${detail?.certificates.length || 0})`}
                                    empty={t('لا توجد شهادات', 'No certificates')}
                                    rows={detail?.certificates || []}
                                    render={(row) => (
                                        <>
                                            <span className="font-medium">{title(row.subject)}</span>
                                            <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
                                        </>
                                    )}
                                />
                            </>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium mt-0.5">{value}</dd>
        </div>
    );
}

function DetailList({
    icon, heading, empty, rows, render,
}: {
    icon: React.ReactNode;
    heading: string;
    empty: string;
    rows: any[];
    render: (row: any) => React.ReactNode;
}) {
    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">{icon}{heading}</h3>
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{empty}</p>
            ) : (
                <div className="space-y-2">
                    {rows.map((row, i) => (
                        <div
                            key={row.id || i}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card text-sm"
                        >
                            {render(row)}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
