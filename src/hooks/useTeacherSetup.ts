// The teacher setup checklist, derived rather than stored. Four rows, each
// read from data that already exists; a stored checklist would be a second
// source of truth that drifts from the first.
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface SetupRow {
    key: string;
    ar: string;
    en: string;
    done: boolean;
    to?: string;
}

export function useTeacherSetup() {
    const { user, profile } = useAuth();

    const { data: application, isLoading: isFetching, isError } = useQuery({
        queryKey: ['teacher', user?.id, 'application', profile?.email],
        enabled: !!profile?.email,
        queryFn: async () => {
            const { data } = await supabase
                .from('teacher_applications')
                .select('grades_taught')
                .eq('email', profile!.email)
                .maybeSingle();
            return data;
        },
    });

    // A failed lookup must take the same path as a pending one — the
    // checklist hides rather than showing a wrong "not done" for a row it
    // couldn't actually check.
    const isLoading = isFetching || isError;

    const rows: SetupRow[] = [
        {
            key: 'identity',
            ar: 'الاسم والبريد',
            en: 'Name and email',
            done: !!profile?.full_name && !!profile?.email,
        },
        {
            key: 'stages',
            ar: 'المراحل التي تُدرّسها',
            en: 'Stages you teach',
            done: !!application?.grades_taught,
            to: '/teacher/profile',
        },
        {
            key: 'bio',
            ar: 'نبذة عنك — تظهر في ملفك العام',
            en: 'A short bio — shown on your public profile',
            done: !!profile?.bio_ar,
            to: '/teacher/profile',
        },
        {
            key: 'shamcash',
            ar: 'حساب شام كاش لاستلام المدفوعات',
            en: 'Sham Cash account for receiving payments',
            done: !!profile?.shamcash_account_name && !!profile?.shamcash_account_number,
            to: '/teacher/profile',
        },
    ];

    return {
        rows,
        doneCount: rows.filter((r) => r.done).length,
        total: rows.length,
        isLoading,
    };
}
