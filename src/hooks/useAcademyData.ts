/**
 * Centralized React Query hooks for Waraq Academy data.
 *
 * Each hook wraps a Supabase query with per-resource stale policies.
 * Data is served from cache instantly on refresh, with background
 * revalidation only when stale.
 *
 * Query keys are scoped with userId where relevant to prevent
 * cross-user data leaking.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';

// ── Stages ──────────────────────────────────

export function useStages() {
    return useQuery({
        queryKey: ['stages'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stages')
                .select('*, subjects(id)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return (data || []).map((s: any) => ({
                ...s,
                subjects_count: s.subjects?.length || 0,
            }));
        },
        staleTime: STALE_TIMES.STATIC,
    });
}

// ── Subjects ──────────────────────────────────

export function useSubjects(stageId?: string) {
    return useQuery({
        queryKey: ['subjects', stageId ?? 'all'],
        queryFn: async () => {
            let query = supabase
                .from('subjects')
                .select('*, stage:stages(title_ar, title_en), lessons(id)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (stageId) {
                query = query.eq('stage_id', stageId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []).map((s: any) => ({
                ...s,
                lessons_count: s.lessons?.length || 0,
            }));
        },
        staleTime: STALE_TIMES.STATIC,
    });
}

// ── Single Subject Detail ───────────────────

export function useSubjectDetail(subjectId?: string) {
    return useQuery<any>({
        queryKey: ['subject', subjectId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select('*, stage:stages(*)')
                .eq('id', subjectId!)
                .single();

            if (error) throw error;
            return data as any;
        },
        enabled: !!subjectId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

// ── Lessons for a Subject (with user progress) ──

export function useSubjectLessons(subjectId?: string, userId?: string) {
    return useQuery({
        queryKey: ['subject-lessons', subjectId, userId],
        queryFn: async () => {
            // Fetch lessons
            const { data: lessons, error: lessonsErr } = await supabase
                .from('lessons')
                .select('*')
                .eq('subject_id', subjectId!)
                .eq('is_published', true)
                .order('sort_order', { ascending: true });

            if (lessonsErr) throw lessonsErr;
            const lessonsList = lessons || [];

            if (lessonsList.length === 0 || !userId) {
                return { lessons: lessonsList, progress: [] };
            }

            // Fetch progress
            const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('*')
                .eq('user_id', userId)
                .in('lesson_id', lessonsList.map((l: any) => l.id));

            return {
                lessons: lessonsList,
                progress: progressData || [],
            };
        },
        enabled: !!subjectId,
        staleTime: STALE_TIMES.DYNAMIC,
    });
}

// ── Student Dashboard Aggregate ─────────────

export function useStudentDashboard(userId?: string) {
    return useQuery({
        queryKey: ['student-dashboard', userId],
        queryFn: async () => {
            // Recent progress
            const { data: recentProgress } = await supabase
                .from('lesson_progress')
                .select('*, lesson:lessons(*, subject:subjects(*))')
                .eq('user_id', userId!)
                .order('updated_at', { ascending: false })
                .limit(10);

            // Enrolled subjects (has progress)
            const { data: allProgress } = await supabase
                .from('lesson_progress')
                .select('lesson_id, completed_at, lessons!inner(subject_id)')
                .eq('user_id', userId!);

            // Subjects list
            const { data: subjects } = await supabase
                .from('subjects')
                .select('*, stage:stages(title_ar, title_en)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            return {
                recentProgress: recentProgress || [],
                allProgress: allProgress || [],
                subjects: subjects || [],
            };
        },
        enabled: !!userId,
        staleTime: STALE_TIMES.DYNAMIC,
    });
}

// ── Teachers for a Student ──────────────────

export function useStudentTeachers(userId?: string) {
    return useQuery({
        queryKey: ['student-teachers', userId],
        queryFn: async () => {
            const { data, error } = await (supabase
                .rpc as any)('get_student_teachers', { student_uuid: userId! });

            if (error) throw error;

            if (!data || data.length === 0) return [];

            const teacherIds = (data as any[]).map((r: any) => r.teacher_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio_en, bio_ar')
                .in('id', teacherIds);

            return profiles || [];
        },
        enabled: !!userId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

// ── Lesson Teachers (by subject) ────────────

export function useSubjectTeachers(subjectId?: string) {
    return useQuery({
        queryKey: ['subject-teachers', subjectId],
        queryFn: async () => {
            // Get distinct teacher IDs from lessons in this subject
            const { data: lessons } = await supabase
                .from('lessons')
                .select('created_by')
                .eq('subject_id', subjectId!)
                .eq('is_published', true);

            const teacherIds = Array.from(
                new Set((lessons || []).map((l: any) => l.created_by).filter(Boolean))
            );

            if (teacherIds.length === 0) return [];

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio_en, bio_ar')
                .in('id', teacherIds);

            return profiles || [];
        },
        enabled: !!subjectId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

// ── My Subjects (entitled subjects with progress) ──

export function useMySubjects(userId?: string, studentStage?: string | null) {
    return useQuery({
        queryKey: ['my-subjects', userId, studentStage],
        queryFn: async () => {
            // Try the secure RPC first — returns entitled subjects with priority ordering
            let entitledData: any[] | null = null;
            try {
                const { data, error } = await (supabase
                    .rpc as any)('get_student_subjects', { p_student_id: userId! });
                if (!error) entitledData = data;
            } catch {
                // RPC unavailable — fall through to direct query
            }

            // Fallback: direct query by the student's stage slug when RPC is
            // unavailable or returns nothing but the student has a stage set.
            if ((!entitledData || entitledData.length === 0) && studentStage) {
                const { data: stageRow } = await supabase
                    .from('stages')
                    .select('id, title_ar, title_en')
                    .eq('slug', studentStage)
                    .eq('is_active', true)
                    .maybeSingle();

                if (stageRow) {
                    const { data: directSubjects } = await supabase
                        .from('subjects')
                        .select('*, stage:stages(title_ar, title_en)')
                        .eq('stage_id', stageRow.id)
                        .eq('is_active', true)
                        .order('sort_order', { ascending: true });

                    entitledData = (directSubjects || []).map((s: any) => ({
                        ...s,
                        entitlement_reason: 'stage',
                        stage_title_ar: stageRow.title_ar,
                        stage_title_en: stageRow.title_en,
                    }));
                }
            }

            if (!entitledData || entitledData.length === 0) return [];

            const subjectIds = (entitledData as any[]).map((s: any) => s.id);

            // Fetch lesson IDs for entitled subjects
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('id, subject_id')
                .in('subject_id', subjectIds)
                .eq('is_published', true);

            // Fetch progress for this user
            const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('lesson_id, completed_at')
                .eq('user_id', userId!);

            const completedIds = new Set(
                ((progressData || []) as any[]).filter(p => p.completed_at).map(p => p.lesson_id)
            );

            // Group lessons by subject
            const lessonsBySubject = new Map<string, string[]>();
            for (const l of (lessonsData || []) as any[]) {
                const ids = lessonsBySubject.get(l.subject_id) || [];
                ids.push(l.id);
                lessonsBySubject.set(l.subject_id, ids);
            }

            return (entitledData as any[]).map(s => {
                const lessonIds = lessonsBySubject.get(s.id) || [];
                const totalLessons = lessonIds.length;
                const completedLessons = lessonIds.filter(id => completedIds.has(id)).length;
                const progressPercent = totalLessons > 0
                    ? Math.round((completedLessons / totalLessons) * 100)
                    : 0;

                return {
                    ...s,
                    stage: s.stage_title_ar ? {
                        title_ar: s.stage_title_ar,
                        title_en: s.stage_title_en,
                    } : undefined,
                    total_lessons: totalLessons,
                    completed_lessons: completedLessons,
                    progress_percent: progressPercent,
                };
            });
        },
        enabled: !!userId,
        staleTime: STALE_TIMES.DYNAMIC,
    });
}

// ── Entitled Subjects (alias for useMySubjects) ──

export const useEntitledSubjects = useMySubjects;

// ── Discover Subjects (locked subjects for "Discover" tab) ──

export function useDiscoverSubjects(userId?: string) {
    return useQuery({
        queryKey: ['discover-subjects', userId],
        queryFn: async () => {
            try {
                const { data, error } = await (supabase
                    .rpc as any)('get_discover_subjects', { p_student_id: userId! });
                if (error) return [] as any[];
                return (data || []) as any[];
            } catch {
                return [] as any[];
            }
        },
        enabled: !!userId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

// ── Check Subject Access (guard for subject detail pages) ──

export function useCheckSubjectAccess(userId?: string, subjectId?: string) {
    return useQuery({
        queryKey: ['check-subject-access', userId, subjectId],
        queryFn: async () => {
            const { data, error } = await (supabase
                .rpc as any)('check_subject_access', {
                    p_student_id: userId!,
                    p_subject_id: subjectId!,
                });

            if (error) throw error;
            // RPC returns TABLE → array; take first row
            const row = Array.isArray(data) ? data[0] : data;
            return (row || { has_access: false, reason: 'no_access' }) as { has_access: boolean; reason: string; access_type?: string };
        },
        enabled: !!userId && !!subjectId,
        staleTime: STALE_TIMES.DYNAMIC,
    });
}
