/**
 * Data layer for the AI summary feature ("AI summary" / "الملخص الذكي").
 *
 * Reads and writes `lesson_summaries`. Every write goes through adminDb's
 * verified helpers per the project convention; generation goes through the
 * `ai-assist` edge function, which is the only place that may set
 * `source_hash`, `model` and `generated_*`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate } from '@/lib/adminDb';
import { queryKeys } from '@/lib/queryKeys';
import { STALE_TIMES } from '@/lib/queryConfig';
import {
    hashLessonSource,
    rowColumnsFromForm,
    type LessonSource,
    type LessonSummary,
    type SummaryFormValues,
} from '@/lib/lessonSummary';

/** Bilingual message for a failure the user can act on. */
export interface SummaryError {
    ar: string;
    en: string;
}

/**
 * Map an edge-function failure code to something a teacher can read.
 *
 * The AI key is currently rejected by Groq in this project, so the generic
 * branch is the one most likely to fire in practice — it must not be a stack
 * trace. `ai-assist` returns HTTP 200 with `success:false` for most failures,
 * so the caller checks the body, not the transport error.
 */
export function summaryErrorMessage(code: string | undefined, raw: string | undefined): SummaryError {
    switch (code) {
        case 'NOT_LESSON_OWNER':
            return {
                ar: 'يمكنك إنشاء ملخص لدروس المواد التي تدرّسها فقط.',
                en: 'You can only generate a summary for lessons in subjects you teach.',
            };
        case 'LESSON_NOT_FOUND':
            return { ar: 'لم يتم العثور على الدرس.', en: 'Lesson not found.' };
        case 'LESSON_TOO_SHORT':
            return {
                ar: 'لا يحتوي هذا الدرس على محتوى مكتوب كافٍ لتلخيصه. أضف نصوصاً للدرس ثم حاول مرة أخرى.',
                en: 'This lesson does not have enough written content to summarise. Add some text blocks and try again.',
            };
        case 'SUMMARY_TRUNCATED':
            return {
                ar: 'الدرس طويل جداً وانقطع الملخص قبل اكتماله. جرّب تقسيم الدرس إلى أقسام أقصر.',
                en: 'The lesson is long and the summary was cut off before it finished. Try splitting it into shorter sections.',
            };
        case 'SUMMARY_EMPTY':
        case 'SUMMARY_MALFORMED':
            return {
                ar: 'لم يُرجع النموذج ملخصاً صالحاً. حاول مرة أخرى.',
                en: 'The AI model did not return a usable summary. Please try again.',
            };
        case 'AI_RATE_LIMIT':
            return {
                ar: 'تم تجاوز حد الاستخدام المجاني للذكاء الاصطناعي. انتظر دقيقة ثم حاول مرة أخرى.',
                en: 'The AI free-tier rate limit was reached. Wait about a minute and try again.',
            };
        case 'AI_DEADLINE':
            return {
                ar: 'خدمة الذكاء الاصطناعي مشغولة حالياً ولم يكتمل الملخص في الوقت المتاح. حاول مرة أخرى بعد قليل.',
                en: 'The AI service is busy and the summary did not finish in time. Please try again in a moment.',
            };
        case 'SAVE_FAILED':
            return {
                ar: 'تم إنشاء الملخص لكن تعذّر حفظه. حاول مرة أخرى.',
                en: 'The summary was generated but could not be saved. Please try again.',
            };
        default:
            return {
                ar: `تعذّر إنشاء الملخص. ${raw ?? ''}`.trim(),
                en: `Could not generate the summary. ${raw ?? ''}`.trim(),
            };
    }
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * The lesson's summary row, or null.
 *
 * RLS decides what comes back: the lesson's teacher and super_admin see every
 * status, a student sees an approved row only when the lesson is published and
 * either free-preview or purchased. There is no client-side status filter on
 * purpose — duplicating the rule here would let the two drift apart.
 */
export function useLessonSummary(lessonId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.lessons.summary(lessonId!),
        queryFn: async (): Promise<LessonSummary | null> => {
            const { data, error } = await supabase
                .from('lesson_summaries')
                .select('*')
                .eq('lesson_id', lessonId!)
                .maybeSingle();

            if (error) throw error;
            return (data as unknown as LessonSummary) ?? null;
        },
        enabled: !!lessonId,
        staleTime: STALE_TIMES.CONTENT,
        retry: false,
    });
}

/**
 * SHA-256 of the lesson's current content, for the stale-summary check.
 *
 * Uses the exact module the edge function used to produce `source_hash`, so
 * equality is meaningful. Returns null while the lesson is still loading.
 */
export function useLessonSourceHash(lessonId: string | undefined, source: LessonSource | null) {
    return useQuery({
        queryKey: [...queryKeys.lessons.summary(lessonId ?? 'none'), 'source-hash'],
        queryFn: async () => (source ? await hashLessonSource(source) : null),
        enabled: !!lessonId && !!source,
        staleTime: STALE_TIMES.CONTENT,
    });
}

// ─── Generate ────────────────────────────────────────────────────────────────

export interface GenerateResult {
    success: boolean;
    row?: LessonSummary;
    error?: SummaryError;
}

/**
 * Ask the edge function to generate a draft.
 *
 * Deliberately resolves with `{success:false, error}` rather than throwing, so
 * the panel can render a bilingual message inline instead of relying on a
 * toast that scrolls away while the teacher is reading a long form.
 */
export function useGenerateLessonSummary(lessonId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<GenerateResult> => {
            const { data, error } = await supabase.functions.invoke('ai-assist', {
                body: { action: 'generate_lesson_summary', lessonId },
            });

            // A transport-level failure (network, 401, 403). Note that most
            // ai-assist failures arrive as HTTP 200 with success:false instead.
            if (error) {
                return { success: false, error: summaryErrorMessage(undefined, error.message) };
            }
            if (!data?.success) {
                return { success: false, error: summaryErrorMessage(data?.code, data?.error) };
            }
            return { success: true, row: data.result as LessonSummary };
        },
        onSuccess: (result) => {
            if (result.success && lessonId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.lessons.summary(lessonId) });
            }
        },
    });
}

// ─── Write ───────────────────────────────────────────────────────────────────

interface SaveArgs {
    /** Existing row id, if any. Absent means the teacher is writing one by hand. */
    id?: string;
    values: SummaryFormValues;
    /**
     * Current status. Editing an APPROVED summary keeps it approved and just
     * refreshes reviewed_at — a teacher fixing a typo should not have to
     * re-approve, and the students' view should not blink out meanwhile.
     */
    status: LessonSummary['status'];
    reviewerId: string | undefined;
}

export function useSaveLessonSummary(lessonId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, values, status, reviewerId }: SaveArgs) => {
            const columns = rowColumnsFromForm(values);

            // Keep an approved summary approved across an edit, and stamp the
            // review so "last reviewed" reflects the edit that students got.
            const reviewFields =
                status === 'approved'
                    ? { reviewed_at: new Date().toISOString(), reviewed_by: reviewerId ?? null }
                    : {};

            if (id) {
                const result = await verifiedUpdate('lesson_summaries', id, {
                    ...columns,
                    ...reviewFields,
                });
                if (!result.success) throw new Error(result.error ?? 'Update failed');
                return result.data;
            }

            const result = await verifiedInsert('lesson_summaries', {
                lesson_id: lessonId!,
                ...columns,
                status,
                ...reviewFields,
            });
            if (!result.success) throw new Error(result.error ?? 'Insert failed');
            return result.data;
        },
        onSuccess: () => {
            if (lessonId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.lessons.summary(lessonId) });
            }
        },
    });
}

interface ReviewArgs {
    id: string;
    status: Extract<LessonSummary['status'], 'approved' | 'rejected' | 'draft'>;
    reviewerId: string | undefined;
    note?: string | null;
}

/**
 * Approve or reject.
 *
 * `pending_review` is intentionally not reachable from here — see the column
 * comment in migration 108. The teacher is the reviewer, so the flow is
 * draft → approved (or → rejected), with no queue in between.
 */
export function useReviewLessonSummary(lessonId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status, reviewerId, note }: ReviewArgs) => {
            const result = await verifiedUpdate('lesson_summaries', id, {
                status,
                reviewed_by: reviewerId ?? null,
                reviewed_at: new Date().toISOString(),
                review_note: note ?? null,
            });
            if (!result.success) throw new Error(result.error ?? 'Review failed');
            return result.data;
        },
        onSuccess: () => {
            if (lessonId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.lessons.summary(lessonId) });
            }
        },
    });
}
