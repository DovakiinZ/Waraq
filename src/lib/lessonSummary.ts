/**
 * Browser-side half of the AI summary feature ("AI summary" / "الملخص الذكي").
 *
 * The hash, the canonicaliser and the prompts live in ONE shared module that
 * the `ai-assist` edge function imports too — see the header of
 * `supabase/functions/_shared/lessonSummaryCore.ts`. This file adds the things
 * only the browser needs: Zod schemas (the edge function must stay
 * dependency-free) and the row type.
 *
 * NOT `lessons.summary_ar` / `lessons.summary_en`. Those are a separate,
 * pre-existing, teacher-written blurb shown on course listings.
 */

import { z } from 'zod';
import {
    SUMMARY_LIMITS,
    type SummaryPayload,
    type SummarySlide,
    type SummaryStatus,
} from '@shared/lessonSummaryCore';

export {
    buildLessonSource,
    hashLessonSource,
    sourceHash,
    SUMMARY_LIMITS,
} from '@shared/lessonSummaryCore';
export type {
    HashableBlock,
    HashableSection,
    HashableLesson,
    LessonSource,
    SummaryPayload,
    SummarySlide,
    SummaryStatus,
} from '@shared/lessonSummaryCore';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

/**
 * Validates one language's generated payload. Mirrors
 * `validateSummaryPayload` in the shared core — keep the two in step.
 *
 * Applied to the model's output before anything is stored, and again as the
 * resolver for the teacher's edit form, so a human edit cannot save a shape
 * the student pages cannot render.
 */
export const slideSchema = z.object({
    title: z.string().trim().min(1).max(SUMMARY_LIMITS.slideTitleMaxChars),
    bullets: z
        .array(z.string().trim().min(1).max(SUMMARY_LIMITS.bulletMaxChars))
        .min(1)
        .max(SUMMARY_LIMITS.bulletsPerSlideMax),
});

export const summaryPayloadSchema = z.object({
    summary: z.string().trim().min(1).max(SUMMARY_LIMITS.summaryMaxChars),
    key_points: z
        .array(z.string().trim().min(1).max(SUMMARY_LIMITS.keyPointMaxChars))
        .min(1)
        .max(SUMMARY_LIMITS.keyPointsMax),
    slides: z.array(slideSchema).min(1).max(SUMMARY_LIMITS.slidesMax),
});

/**
 * The teacher's edit form. Arabic is required — it is the platform's primary
 * language and the student pages fall back to Arabic when English is absent
 * (the `t(ar, en || ar)` convention). English is optional for the same reason:
 * requiring it would block approval of an Arabic-only lesson.
 */
export const summaryFormSchema = z.object({
    ar: summaryPayloadSchema,
    en: summaryPayloadSchema.partial().optional(),
});

export type SummaryFormValues = z.infer<typeof summaryFormSchema>;

/** Both languages, as the generator returns them. */
export const generationResultSchema = z.object({
    ar: summaryPayloadSchema,
    en: summaryPayloadSchema,
});

// ─── Row type ────────────────────────────────────────────────────────────────

export interface LessonSummary {
    id: string;
    lesson_id: string;
    summary_ar: string | null;
    summary_en: string | null;
    slides_ar: SummarySlide[] | null;
    slides_en: SummarySlide[] | null;
    key_points_ar: string[] | null;
    key_points_en: string[] | null;
    status: SummaryStatus;
    source_hash: string | null;
    model: string | null;
    generated_at: string | null;
    generated_by: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_note: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Row <-> form mapping ────────────────────────────────────────────────────

/** Pull one language out of a stored row into the payload shape. */
export function payloadFromRow(
    row: LessonSummary | null | undefined,
    lang: 'ar' | 'en'
): SummaryPayload {
    if (!row) return { summary: '', key_points: [], slides: [] };
    return {
        summary: (lang === 'ar' ? row.summary_ar : row.summary_en) ?? '',
        key_points: (lang === 'ar' ? row.key_points_ar : row.key_points_en) ?? [],
        slides: (lang === 'ar' ? row.slides_ar : row.slides_en) ?? [],
    };
}

/** Flatten both languages back into the row's columns. */
export function rowColumnsFromForm(values: SummaryFormValues) {
    const en = values.en;
    const hasEn = !!(en?.summary?.trim() || en?.key_points?.length || en?.slides?.length);
    return {
        summary_ar: values.ar.summary,
        key_points_ar: values.ar.key_points,
        slides_ar: values.ar.slides,
        summary_en: hasEn ? (en?.summary ?? null) : null,
        key_points_en: hasEn ? (en?.key_points ?? []) : null,
        slides_en: hasEn ? (en?.slides ?? []) : null,
    };
}

/**
 * True when the lesson has changed since this summary was generated.
 *
 * Returns false when either hash is absent rather than guessing: a row with no
 * `source_hash` predates hashing, and warning on it would cry wolf.
 */
export function isSummaryStale(
    row: Pick<LessonSummary, 'source_hash'> | null | undefined,
    currentHash: string | null | undefined
): boolean {
    if (!row?.source_hash || !currentHash) return false;
    return row.source_hash !== currentHash;
}

/** Does this row hold anything a student could be shown in `lang`? */
export function hasContentFor(row: LessonSummary | null | undefined, lang: 'ar' | 'en'): boolean {
    const payload = payloadFromRow(row, lang);
    return !!payload.summary.trim() || payload.key_points.length > 0 || payload.slides.length > 0;
}

/**
 * The language a student page should render. English falls back to Arabic —
 * the same rule as `t(ar, en || ar)` everywhere else — because English is
 * optional on approval.
 */
export function resolveDisplayLang(
    row: LessonSummary | null | undefined,
    preferred: 'ar' | 'en'
): 'ar' | 'en' {
    if (preferred === 'en' && !hasContentFor(row, 'en')) return 'ar';
    return preferred;
}
