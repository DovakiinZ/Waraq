// The setup guide («ابدأ هنا») step rules, for teacher and student.
// Spec: docs/superpowers/specs/2026-11-21-setup-guide.md
//
// Pure: data in, steps out. Nothing about progress is stored anywhere — a step
// is done because the real data says so, so a task done on any page (or on
// the Android app) ticks the step here too. Keep this file free of React,
// Supabase and `@/` imports: scripts/verify-setup-progress.mts runs it under
// plain Node.

export type SetupStepState = 'done' | 'todo';

export interface SetupStep<K extends string = string> {
    key: K;
    state: SetupStepState;
    /** Sub-progress shown on the row, label-first ("…: 1 of 2"). */
    count?: { done: number; total: number };
    /** A number for the done summary ("Courses: 3"). */
    n?: number;
}

export const stepComplete = (s: SetupStep) => s.state === 'done';
export const completedCount = (steps: SetupStep[]) => steps.filter(stepComplete).length;
export const allComplete = (steps: SetupStep[]) => steps.length > 0 && steps.every(stepComplete);
export function nextStep<K extends string>(steps: SetupStep<K>[]): SetupStep<K> | null {
    return steps.find((s) => !stepComplete(s)) ?? null;
}
/** "Step N of M": the step being worked on, never past the end. */
export const currentNumber = (steps: SetupStep[]) => Math.min(completedCount(steps) + 1, steps.length);

const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

// ── Teacher ───────────────────────────────────────────────────────────────

export type TeacherStepKey = 'profile' | 'course' | 'lesson' | 'publish';

export interface TeacherSetupInput {
    profile: {
        bio_ar?: string | null;
        shamcash_account_name?: string | null;
        shamcash_account_number?: string | null;
    } | null;
    subjects: { id: string; is_active: boolean | null }[];
    lessons: { id: string; subject_id: string; is_published: boolean | null }[];
    /** Lesson ids that have at least one block. */
    lessonIdsWithBlocks: string[];
}

export function teacherSteps(input: TeacherSetupInput): SetupStep<TeacherStepKey>[] {
    const p = input.profile ?? {};
    const bio = filled(p.bio_ar);
    const shamcash = filled(p.shamcash_account_name) && filled(p.shamcash_account_number);
    const profileDone = (bio ? 1 : 0) + (shamcash ? 1 : 0);

    const mySubjectIds = new Set(input.subjects.map((s) => s.id));
    const withBlocks = new Set(input.lessonIdsWithBlocks);
    const lessonsWithContent = input.lessons.filter(
        (l) => mySubjectIds.has(l.subject_id) && withBlocks.has(l.id),
    ).length;

    const subjectsWithPublishedLesson = new Set(
        input.lessons.filter((l) => l.is_published === true).map((l) => l.subject_id),
    );
    const live = input.subjects.filter(
        (s) => s.is_active === true && subjectsWithPublishedLesson.has(s.id),
    ).length;

    return [
        { key: 'profile', state: profileDone === 2 ? 'done' : 'todo', count: { done: profileDone, total: 2 } },
        { key: 'course', state: input.subjects.length > 0 ? 'done' : 'todo', n: input.subjects.length },
        { key: 'lesson', state: lessonsWithContent > 0 ? 'done' : 'todo', n: lessonsWithContent },
        { key: 'publish', state: live > 0 ? 'done' : 'todo', n: live },
    ];
}

// ── Student ───────────────────────────────────────────────────────────────

export type StudentStepKey = 'choose' | 'start' | 'finish';

export interface StudentSetupInput {
    orders: { status: string | null }[];
    enrolledCount: number;
    progress: { lesson_id: string; completed_at: string | null; updated_at?: string | null }[];
}

export interface StudentSteps {
    steps: SetupStep<StudentStepKey>[];
    /** Step 1 is done only by an order the teacher hasn't confirmed yet. */
    waitingForPayment: boolean;
    /** The lesson to continue: the most recently touched one. */
    resumeLessonId: string | null;
}

const DEAD_ORDER = new Set(['rejected', 'cancelled']);

export function studentSteps(input: StudentSetupInput): StudentSteps {
    const liveOrders = input.orders.filter((o) => !DEAD_ORDER.has(o.status ?? ''));
    const started = input.progress.length > 0;
    const completed = input.progress.filter((p) => !!p.completed_at).length;
    const choose = liveOrders.length > 0 || input.enrolledCount > 0 || started;
    const waitingForPayment =
        choose &&
        input.enrolledCount === 0 &&
        !started &&
        liveOrders.length > 0 &&
        liveOrders.every((o) => o.status === 'pending_payment');

    const latest = [...input.progress].sort((a, b) =>
        (b.updated_at ?? '').localeCompare(a.updated_at ?? ''),
    )[0];

    return {
        steps: [
            { key: 'choose', state: choose ? 'done' : 'todo' },
            { key: 'start', state: started ? 'done' : 'todo' },
            { key: 'finish', state: completed > 0 ? 'done' : 'todo', n: completed },
        ],
        waitingForPayment,
        resumeLessonId: latest?.lesson_id ?? null,
    };
}
