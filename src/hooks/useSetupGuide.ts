// Data for the setup guide («ابدأ هنا»). Fetches only what the pure rules in
// src/lib/setupProgress.ts need. staleTime 0 on purpose: the guide is visited
// right after the user did a task on another page, and a cached "not done"
// would contradict what they just did.
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { studentSteps, teacherSteps } from '@/lib/setupProgress';

export function useTeacherSetupGuide() {
    const { user, profile } = useAuth();
    const uid = user?.id;

    const query = useQuery({
        queryKey: ['setup-guide', 'teacher', uid],
        enabled: !!uid,
        staleTime: 0,
        queryFn: async () => {
            const { data: subjects, error: sErr } = await supabase
                .from('subjects')
                .select('id, is_active, title_ar, title_en')
                .eq('teacher_id', uid!);
            if (sErr) throw sErr;
            const subjectIds = (subjects ?? []).map((s) => s.id);

            let lessons: { id: string; subject_id: string; is_published: boolean | null }[] = [];
            let lessonIdsWithBlocks: string[] = [];
            if (subjectIds.length) {
                const { data: l, error: lErr } = await supabase
                    .from('lessons')
                    .select('id, subject_id, is_published')
                    .in('subject_id', subjectIds);
                if (lErr) throw lErr;
                lessons = (l ?? []) as typeof lessons;

                if (lessons.length) {
                    const { data: b, error: bErr } = await supabase
                        .from('lesson_blocks')
                        .select('lesson_id')
                        .in('lesson_id', lessons.map((x) => x.id))
                        .limit(2000);
                    if (bErr) throw bErr;
                    lessonIdsWithBlocks = [...new Set((b ?? []).map((x: { lesson_id: string }) => x.lesson_id))];
                }
            }
            return { subjects: subjects ?? [], lessons, lessonIdsWithBlocks };
        },
    });

    const steps = query.data
        ? teacherSteps({
              profile: profile ?? null,
              subjects: query.data.subjects,
              lessons: query.data.lessons,
              lessonIdsWithBlocks: query.data.lessonIdsWithBlocks,
          })
        : [];

    return {
        steps,
        subjects: query.data?.subjects ?? [],
        isPending: profile?.is_active === false,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useStudentSetupGuide() {
    const { user } = useAuth();
    const uid = user?.id;

    const query = useQuery({
        queryKey: ['setup-guide', 'student', uid],
        enabled: !!uid,
        staleTime: 0,
        queryFn: async () => {
            const [orders, enrolled, progress] = await Promise.all([
                supabase.from('orders').select('status').eq('student_id', uid!),
                supabase.from('student_subjects').select('subject_id', { count: 'exact', head: true }).eq('student_id', uid!),
                supabase
                    .from('lesson_progress')
                    .select('lesson_id, completed_at, updated_at')
                    .eq('user_id', uid!)
                    .order('updated_at', { ascending: false })
                    .limit(200),
            ]);
            if (orders.error) throw orders.error;
            if (enrolled.error) throw enrolled.error;
            if (progress.error) throw progress.error;
            return studentSteps({
                orders: (orders.data ?? []) as { status: string | null }[],
                enrolledCount: enrolled.count ?? 0,
                progress: (progress.data ?? []) as { lesson_id: string; completed_at: string | null; updated_at: string | null }[],
            });
        },
    });

    return {
        steps: query.data?.steps ?? [],
        waitingForPayment: query.data?.waitingForPayment ?? false,
        resumeLessonId: query.data?.resumeLessonId ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
