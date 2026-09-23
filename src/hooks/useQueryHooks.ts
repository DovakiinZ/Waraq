import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

const STALE = {
  static: 10 * 60 * 1000,   // 10 min — stages, subjects (rarely change)
  medium: 5 * 60 * 1000,    // 5 min — lessons, quiz questions
  user: 2 * 60 * 1000,      // 2 min — progress, dashboard
  realtime: 60 * 1000,       // 1 min — messages contacts
};

// ─── Stages ──────────────────────────────────────────────

export function useStages() {
  return useQuery({
    queryKey: queryKeys.stages.all,
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
    staleTime: STALE.user,
  });
}

// ─── Subjects ────────────────────────────────────────────

export function useSubjects(stageId?: string) {
  return useQuery({
    queryKey: stageId
      ? queryKeys.subjects.byStage(stageId)
      : queryKeys.subjects.all,
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('*, stage:stages(*), lessons(id)')
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
    staleTime: STALE.user,
  });
}

// ─── Single Stage ────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a stage by EITHER its uuid or its slug.
 *
 * `/stages` links by uuid while the landing page links by slug (`/stages/primary`),
 * so matching on `id` alone made every slug URL render "stage not found".
 * Callers that need the real uuid (to filter subjects by `stage_id`) must use
 * the returned `stage.id`, not the route param.
 */
export function useStage(stageIdOrSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stages.detail(stageIdOrSlug!),
    queryFn: async () => {
      const column = UUID_RE.test(stageIdOrSlug!) ? 'id' : 'slug';
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq(column, stageIdOrSlug!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!stageIdOrSlug,
    staleTime: STALE.user,
  });
}

// ─── Lessons by Subject (with user progress) ─────────────

export function useLessons(subjectId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lessons.bySubject(subjectId!),
    queryFn: async () => {
      // Fetch subject with stage info
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*, stage:stages(*)')
        .eq('id', subjectId!)
        .single();

      if (subjectError || !subjectData) throw subjectError || new Error('Subject not found');

      // Fetch lessons
      let lessonsQuery = supabase
        .from('lessons')
        .select('*')
        .eq('subject_id', subjectId!);

      // If not userId provided (guest), only show published
      if (!userId) {
        lessonsQuery = lessonsQuery.eq('is_published', true);
      }

      const { data: lessonsData, error: lessonsError } = await lessonsQuery
        .order('sort_order', { ascending: true });

      if (lessonsError) throw lessonsError;
      const lessons = (lessonsData || []) as any[];

      // Fetch user progress if logged in
      let progressMap: Record<string, any> = {};
      if (userId && lessons.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId)
          .in('lesson_id', lessons.map((l: any) => l.id));

        (progressData || []).forEach((p: any) => {
          progressMap[p.lesson_id] = p;
        });
      }

      return {
        subject: subjectData,
        lessons: lessons.map((l: any) => ({
          ...l,
          progress: progressMap[l.id] || null,
        })),
      };
    },
    enabled: !!subjectId,
    staleTime: STALE.medium,
  });
}

// ─── Single Lesson (full detail with blocks) ─────────────

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lessons.detail(lessonId!),
    queryFn: async () => {
      if (!lessonId) return null;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId);
      if (!isUuid) {
        throw new Error('Invalid lesson ID format');
      }
      
      let query = supabase
        .from('lessons')
        .select(`
          *,
          subject:subjects(*, stage:stages(*)),
          sections:lesson_sections(*),
          blocks:lesson_blocks(*)
        `)
        .eq('id', lessonId);

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      const d = data as any;
      d.sections = (d.sections || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      d.blocks = (d.blocks || []).sort((a: any, b: any) => a.sort_order - b.sort_order);

      // Fetch quiz ID
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('id')
        .eq('lesson_id', d.id)
        .maybeSingle();

      // Fetch next lesson
      const { data: nextData } = await supabase
        .from('lessons')
        .select('*')
        .eq('subject_id', d.subject_id)
        .eq('is_published', true)
        .gt('sort_order', d.sort_order)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        lesson: d,
        quizId: quizData ? (quizData as any).id : null,
        nextLesson: nextData || null,
      };
    },
    enabled: !!lessonId,
    staleTime: STALE.medium,
    retry: false, // Don't retry on 404/PGRST116
  });
}

// ─── Student Progress (all lessons) ──────────────────────

export function useStudentProgress(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.student.progress(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select(`
          *,
          lesson:lessons(
            *,
            subject:subjects(
              *,
              stage:stages(*)
            )
          )
        `)
        .eq('user_id', userId!)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: STALE.user,
  });
}

// ─── Quiz Questions ──────────────────────────────────────

export function useQuizQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quiz.questions(quizId!),
    queryFn: async () => {
      // Answer choices live in `quiz_options`; the question row has no
      // `options` / `correct_answer` column.
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*, quiz_options(*)')
        .eq('quiz_id', quizId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!quizId,
    staleTime: STALE.medium,
  });
}

// Quiz row itself — needed for passing_score when grading an attempt.
export function useQuizDetail(quizId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quiz.detail(quizId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
    staleTime: STALE.medium,
  });
}

// ─── Student Teachers ────────────────────────────────────

export function useStudentTeachers(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.student.teachers(userId!),
    queryFn: async () => {
      // Derive teachers from lesson progress (student studied their lessons)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson:lessons(created_by)')
        .eq('user_id', userId!);

      const teacherIdSet = new Set<string>();
      if (progressData) {
        progressData.forEach((p: any) => {
          if (p.lesson?.created_by) teacherIdSet.add(p.lesson.created_by);
        });
      }

      // If no progress yet, show all active teachers
      if (teacherIdSet.size === 0) {
        const { data: allTeachers } = await supabase
          .from('profiles')
          .select('*, lessons(count)')
          .eq('role', 'teacher')
          .eq('is_active', true);

        return (allTeachers || []).map((t: any) => ({
          ...t,
          lessons_count: t.lessons?.[0]?.count || 0,
        }));
      }

      const { data: teachersData } = await supabase
        .from('profiles')
        .select('*, lessons(count)')
        .in('id', Array.from(teacherIdSet))
        .eq('role', 'teacher')
        .eq('is_active', true);

      return (teachersData || []).map((t: any) => ({
        ...t,
        lessons_count: t.lessons?.[0]?.count || 0,
      }));
    },
    enabled: !!userId,
    staleTime: STALE.medium,
  });
}

// ─── Message Contacts ────────────────────────────────────

export function useMessageContacts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.contacts(userId!),
    queryFn: async () => {
      // Strategy: find teachers from two sources and merge
      const teacherIdSet = new Set<string>();

      // 1. Teachers from lesson progress (student studied their lessons)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson:lessons(created_by)')
        .eq('user_id', userId!);

      if (progressData) {
        progressData.forEach((p: any) => {
          if (p.lesson?.created_by) teacherIdSet.add(p.lesson.created_by);
        });
      }

      // 2. Teachers from existing message history (sent or received)
      const { data: sentMessages } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', userId!);

      const { data: receivedMessages } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', userId!);

      if (sentMessages) {
        sentMessages.forEach((m: any) => teacherIdSet.add(m.receiver_id));
      }
      if (receivedMessages) {
        receivedMessages.forEach((m: any) => teacherIdSet.add(m.sender_id));
      }

      // 3. If still empty, show all active teachers so student can initiate contact
      if (teacherIdSet.size === 0) {
        const { data: allTeachers } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'teacher')
          .eq('is_active', true);

        if (!allTeachers || allTeachers.length === 0) return [];

        return allTeachers.map((t: any) => ({ ...t, unread_count: 0 }));
      }

      const ids = Array.from(teacherIdSet);

      // Fetch teacher profiles (filter to actual teachers, not other students from messages)
      const { data: teachers } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids)
        .in('role', ['teacher', 'super_admin']);

      if (!teachers || teachers.length === 0) return [];

      // Get unread counts
      const contactsWithMeta = [];
      for (const teacher of (teachers || []) as any[]) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('sender_id', teacher.id)
          .eq('receiver_id', userId!)
          .is('read_at', null);

        contactsWithMeta.push({
          ...(teacher as any),
          unread_count: count || 0,
        });
      }

      return contactsWithMeta;
    },
    enabled: !!userId,
    staleTime: STALE.realtime,
  });
}

// ─── Teacher Message Contacts ────────────────────────────

export function useTeacherMessageContacts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.contacts(userId!),
    queryFn: async () => {
      const contactIdSet = new Set<string>();

      // 1. Students from existing message history
      const { data: sentMessages } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', userId!);

      const { data: receivedMessages } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', userId!);

      if (sentMessages) {
        sentMessages.forEach((m: any) => contactIdSet.add(m.receiver_id));
      }
      if (receivedMessages) {
        receivedMessages.forEach((m: any) => contactIdSet.add(m.sender_id));
      }

      // 2. Students with progress on teacher's lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('created_by', userId!);

      if (lessons && lessons.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('user_id')
          .in('lesson_id', (lessons as any[]).map(l => l.id));

        if (progressData) {
          progressData.forEach((p: any) => contactIdSet.add(p.user_id));
        }
      }

      if (contactIdSet.size === 0) return [];

      const ids = Array.from(contactIdSet);

      // Fetch student profiles
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids)
        .eq('role', 'student');

      if (!students || students.length === 0) return [];

      // Get unread counts
      const contactsWithMeta = [];
      for (const student of (students || []) as any[]) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('sender_id', student.id)
          .eq('receiver_id', userId!)
          .is('read_at', null);

        contactsWithMeta.push({
          ...(student as any),
          unread_count: count || 0,
        });
      }

      return contactsWithMeta;
    },
    enabled: !!userId,
    staleTime: STALE.realtime,
  });
}

// ─── Homepage: Featured Content ──────────────────────────

/**
 * Subjects for the homepage.
 *
 * Curated first: anything an admin has switched on with `show_on_home` wins,
 * ordered by `home_order`. When nothing has been curated the homepage falls
 * back to active subjects instead of rendering an empty section, which is what
 * it did before (every subject currently has `show_on_home = false`, and the
 * admin subjects screen has no toggle to change that yet).
 *
 * The fallback is deliberately a fallback, not a merge: as soon as one subject
 * is featured, curation takes over completely.
 */
export function useFeaturedSubjects() {
  return useQuery({
    queryKey: queryKeys.homepage.featuredSubjects,
    queryFn: async () => {
      const columns = 'id, title_ar, title_en, stage_id, stage:stages(id, title_ar, title_en)';

      const { data, error } = await supabase
        .from('subjects')
        .select(columns)
        .eq('is_active', true)
        .eq('show_on_home', true)
        .order('home_order', { ascending: true })
        .limit(4);

      if (error) throw error;
      if (data && data.length > 0) return data;

      const { data: fallback, error: fallbackError } = await supabase
        .from('subjects')
        .select(columns)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(4);

      if (fallbackError) throw fallbackError;
      return fallback || [];
    },
    staleTime: STALE.user,
  });
}

export function useFeaturedLessons() {
  return useQuery({
    queryKey: queryKeys.homepage.featuredLessons,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, title_ar, title_en, summary_ar, summary_en, preview_video_url, duration_seconds,
          teacher:profiles!created_by(full_name),
          subject:subjects(title_ar, title_en, stage:stages(title_ar, title_en))
        `)
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .limit(4);

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.user,
  });
}

export function useFeaturedTeachers() {
  return useQuery({
    queryKey: queryKeys.homepage.featuredTeachers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio_ar, bio_en, social_links, home_order')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .eq('show_on_home', true)
        .order('home_order', { ascending: true })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.user,
  });
}

/**
 * Teachers for the public `/teachers` directory.
 *
 * `show_on_home` is the only visibility flag a teacher profile has, so it
 * governs the public directory too: switching it off in admin previously hid
 * the teacher from the homepage but left them listed here, which is not what
 * "hide this teacher" means to an admin. See the note in CLAUDE.md about
 * splitting this into a dedicated `is_listed` column later.
 */
export function useAllTeachers() {
  return useQuery({
    queryKey: ['all-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        // qualifications and phone were in this list but are NOT in the anon
        // column grant from migration 104, so the whole query failed with 42501
        // for logged-out visitors and /teachers looked empty unless you signed
        // in. phone is personal data and has no business on a public page
        // anyway. Instructors.tsx already renders qualifications conditionally,
        // so dropping it just hides that line.
        .select(`
          id,
          full_name,
          avatar_url,
          bio_ar,
          bio_en,
          social_links,
          is_active
        `)
        .eq('role', 'teacher')
        .eq('is_active', true)
        .eq('show_on_home', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.user,
  });
}

export function useHomeStages() {
  return useQuery({
    queryKey: [...queryKeys.stages.all, 'home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('id, slug, title_ar, title_en, description_ar, description_en')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.user,
  });
}

// ─── Course Content Sidebar ──────────────────────────────

export function useSidebarLessons(subjectId: string, userId: string) {
  return useQuery({
    queryKey: ['sidebar', subjectId, userId],
    queryFn: async () => {
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const lessons = (lessonsData || []) as any[];

      let progressMap: Record<string, any> = {};
      if (lessons.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId)
          .in('lesson_id', lessons.map((l: any) => l.id));

        (progressData || []).forEach((p: any) => {
          progressMap[p.lesson_id] = p;
        });
      }

      return lessons.map((l: any) => ({
        ...l,
        progress: progressMap[l.id] || null,
      }));
    },
    staleTime: STALE.user,
  });
}

// ─── Teacher Public Profile ──────────────────────────────

export function useTeacherProfile(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-profile', teacherId!],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', teacherId!)
        .eq('role', 'teacher')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
    staleTime: STALE.user,
  });
}

export function useTeacherPublicSubjects(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-public-subjects', teacherId],
    queryFn: async () => {
      // Get all published lessons by this teacher and their subjects
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
          subject_id,
          subject:subjects(
            id, 
            title_ar, 
            title_en,
            description_ar,
            description_en,
            stage:stages(id, title_ar, title_en)
          )
        `)
        .eq('created_by', teacherId!)
        .eq('is_published', true);

      if (error) throw error;

      // Group by subject and count lessons
      const subjectMap = new Map<string, any>();

      for (const lesson of (lessons || [])) {
        const anyLesson = lesson as any;
        if (!anyLesson.subject) continue;
        const subj = Array.isArray(anyLesson.subject) ? anyLesson.subject[0] : anyLesson.subject;
        if (!subj) continue;

        if (subjectMap.has(subj.id)) {
          subjectMap.get(subj.id).lessons_count++;
        } else {
          subjectMap.set(subj.id, {
            ...subj,
            lessons_count: 1
          });
        }
      }

      return Array.from(subjectMap.values());
    },
  });
}

// ─── Teacher Showcase Landing Data ───────────────────────

export function useTeacherShowcaseData(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-showcase', teacherId],
    queryFn: async () => {
      // 1. Fetch Teacher Profile
      //
      // Columns are listed explicitly and must stay that way. Migration 104
      // replaced anon's blanket SELECT on profiles with a column-level grant,
      // and under a column grant `select('*')` fails outright with 42501 rather
      // than returning the permitted subset. That turned every logged-out visit
      // to /t/:id into "Teacher not found".
      //
      // Only add columns here that are in the anon grant list in migration 104.
      // qualifications, phone, email, grade and the shamcash_* columns are NOT,
      // and adding any of them breaks this page for logged-out visitors again.
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select(
          'id, full_name, avatar_url, bio_ar, bio_en, role, is_active, social_links, expertise_tags_ar, expertise_tags_en, home_order, show_on_home, created_at',
        )
        .eq('id', teacherId!)
        .eq('role', 'teacher')
        .single();
        
      if (profileErr || !profile) throw profileErr || new Error('Teacher not found');

      // 2. Fetch Public Lessons & Subjects taught by the teacher
      const { data: lessons, error: lessonsErr } = await supabase
        .from('lessons')
        .select(`
          id,
          title_ar,
          title_en,
          duration_minutes,
          duration_seconds,
          is_paid,
          preview_video_url,
          subject_id,
          subject:subjects(
            id, 
            title_ar, 
            title_en,
            description_ar,
            description_en,
            teaser_ar,
            teaser_en,
            stage:stages(id, title_ar, title_en)
          )
        `)
        .eq('created_by', teacherId!)
        .eq('is_published', true);

      // 3. Calculate Stats & Fetch Reviews
      let totalStudents = 0;
      let totalReviews = 0;
      let averageRating = 0;
      let reviews: any[] = [];

      const lessonIds = (lessons || []).map((l: any) => l.id);

      if (lessonIds.length > 0) {
        // Students: distinct user_id in lesson_progress
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('user_id')
          .in('lesson_id', lessonIds);
        
        if (progressData) {
          const uniqueStudents = new Set(progressData.map((p: any) => p.user_id));
          totalStudents = uniqueStudents.size;
        }

        // Ratings & Reviews
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select(`
            id,
            stars,
            comment,
            created_at,
            user:profiles(full_name, avatar_url),
            lesson:lessons(id, title_ar, title_en)
          `)
          .eq('entity_type', 'lesson')
          .in('entity_id', lessonIds)
          //.not('comment', 'is', null) - supabase js syntax issue, fetch all and filter in memory
          .order('created_at', { ascending: false });

        const allRatings = (ratingsData as any[]) || [];
        if (allRatings.length > 0) {
          totalReviews = allRatings.length;
          averageRating = allRatings.reduce((acc, curr) => acc + curr.stars, 0) / allRatings.length;
          // Only show top recent ones with comments for testimonials
          reviews = allRatings.filter(r => r.comment && r.comment.trim() !== '').slice(0, 6);
        }
      }

      // Group subjects (Course equivalents)
      const subjectMap = new Map<string, any>();
      for (const lesson of (lessons || [])) {
        const anyLesson = lesson as any;
        if (!anyLesson.subject) continue;
        const subj = Array.isArray(anyLesson.subject) ? anyLesson.subject[0] : anyLesson.subject;
        if (!subj) continue;

        if (!subjectMap.has(subj.id)) {
          subjectMap.set(subj.id, {
            ...subj,
            lessons_count: 0,
            total_duration_seconds: 0
          });
        }
        
        const mapEntry = subjectMap.get(subj.id);
        mapEntry.lessons_count++;
        // Calculate estimated duration
        const durationSecs = anyLesson.duration_seconds || (anyLesson.duration_minutes ? anyLesson.duration_minutes * 60 : 0);
        mapEntry.total_duration_seconds += durationSecs;
      }

      return {
        profile,
        courses: Array.from(subjectMap.values()),
        stats: {
          totalStudents,
          totalCourses: subjectMap.size,
          averageRating: Number(averageRating.toFixed(1)),
          totalReviews
        },
        reviews
      };
    },
    enabled: !!teacherId,
    staleTime: STALE.user,
  });
}
// ─── Teacher Feedback ────────────────────────────────────

export function useTeacherFeedback(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-feedback', teacherId!],
    queryFn: async () => {
      // 1. Fetch all lessons created by this teacher
      const { data: lessons, error: lessonsErr } = await (supabase
        .from('lessons')
        .select(`
          id, 
          title_ar, 
          title_en,
          subject:subjects(id, title_ar, title_en)
        `)
        .eq('created_by', teacherId!) as any);

      if (lessonsErr) throw lessonsErr;
      const lessonIds = (lessons || []).map(l => l.id);

      if (lessonIds.length === 0) {
        return {
          stats: { averageRating: 0, totalReviews: 0 },
          reviews: [],
          subjects: []
        };
      }

      // 2. Fetch all ratings for these lessons
      const { data: ratings, error: ratingsErr } = await supabase
        .from('ratings')
        .select(`
          *,
          user:profiles(full_name, avatar_url),
          lesson:lessons(id, title_ar, title_en)
        `)
        .eq('entity_type', 'lesson')
        .in('entity_id', lessonIds)
        .order('created_at', { ascending: false });

      if (ratingsErr) throw ratingsErr;

      // 3. Fetch certificates to get re-issue remarks (Historical feedback)
      const { data: certs, error: certErr } = await supabase
        .from('certificates')
        .select(`
          id,
          student_name,
          snapshot_json,
          created_at,
          lesson:lessons(id, title_ar, title_en)
        `)
        .in('lesson_id', lessonIds)
        .not('snapshot_json', 'is', null)
        .order('created_at', { ascending: false });

      if (certErr) throw certErr;

      const allRatings = (ratings || []) as any[];
      const allCerts = (certs || []) as any[];

      // Extract system remarks from certificates (where reissue_reason exists)
      const systemRemarks = allCerts
        .filter(c => c.snapshot_json?.reissue_reason)
        .map(c => ({
          id: `sys-${c.id}`,
          type: 'system',
          student_name: c.student_name,
          comment: c.snapshot_json.reissue_reason,
          created_at: c.created_at,
          lesson: c.lesson
        }));
      
      // Calculate Stats
      const totalReviews = allRatings.length;
      const averageRating = totalReviews > 0 
        ? allRatings.reduce((acc, curr) => acc + curr.stars, 0) / totalReviews
        : 0;

      // Group subjects with their lessons for the health panel integration
      const subjectMap = new Map<string, any>();
      (lessons || []).forEach((l: any) => {
        if (!l.subject) return;
        const s = l.subject as any;
        if (!subjectMap.has(s.id)) {
          subjectMap.set(s.id, {
            id: s.id,
            title_ar: s.title_ar,
            title_en: s.title_en,
          });
        }
      });

      return {
        stats: {
          averageRating: Number(averageRating.toFixed(1)),
          totalReviews
        },
        reviews: allRatings,
        systemRemarks,
        subjects: Array.from(subjectMap.values())
      };
    },
    enabled: !!teacherId,
    staleTime: STALE.medium
  });
}
