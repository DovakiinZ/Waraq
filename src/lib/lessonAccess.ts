/**
 * Reading an entitlement refusal off a lesson payload.
 *
 * Lives apart from `LessonLocked.tsx` so that file exports only a component
 * (react-refresh warns otherwise), and because both lesson views need it.
 */

/**
 * True when the lesson has no readable content — which, post-109, is how an
 * entitlement refusal arrives.
 *
 * Only treated as locked when the lesson is NOT a free preview: a free-preview
 * lesson that is genuinely empty is an authoring gap, not a paywall, and
 * showing a purchase CTA for it would be wrong.
 */
export function isLessonContentWithheld(lesson: {
    is_free_preview?: boolean | null;
    blocks?: unknown[] | null;
    sections?: unknown[] | null;
} | null | undefined): boolean {
    if (!lesson) return false;
    if (lesson.is_free_preview) return false;
    const hasBlocks = Array.isArray(lesson.blocks) && lesson.blocks.length > 0;
    const hasSections = Array.isArray(lesson.sections) && lesson.sections.length > 0;
    return !hasBlocks && !hasSections;
}
