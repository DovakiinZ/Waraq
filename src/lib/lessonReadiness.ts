/**
 * Publish-readiness checks for a lesson.
 *
 * The publish dialog used to be three toggles and a block count, so a lesson
 * with an empty video URL, or no content at all, published silently and
 * students met a blank page. These checks surface that before it ships.
 *
 * Two severities, and the distinction matters:
 *   - `blocker`  — students would see something broken. Publishing is refused.
 *   - `warning`  — worth knowing, but the teacher's call (no English copy, no
 *                  duration set). Never refused: Arabic-only is a legitimate
 *                  lesson on this platform, and most lessons are.
 *
 * Pure: no imports beyond types. `scripts/verify-lesson-readiness.mts` pins it.
 */
import type { LessonBlock } from '@/types/database';

export type IssueSeverity = 'blocker' | 'warning';

export interface ReadinessIssue {
    severity: IssueSeverity;
    /** Stable key so the UI can map to a bilingual message. */
    code: string;
    /** How many blocks are affected, when the issue is per-block. */
    count?: number;
}

/** Block types whose whole purpose is the `url` field. */
const URL_REQUIRED: string[] = ['video', 'image', 'file', 'link'];
/** Block types that carry prose and are empty without it. */
const TEXT_REQUIRED: string[] = [
    'rich_text', 'tip', 'warning', 'example', 'exercise', 'equation',
];

function hasText(block: Partial<LessonBlock>): boolean {
    return Boolean(
        (block.content_ar && String(block.content_ar).trim()) ||
        (block.content_en && String(block.content_en).trim()),
    );
}

export interface LessonForReadiness {
    title_ar?: string | null;
    title_en?: string | null;
    duration_minutes?: number | null;
}

/**
 * Evaluate a lesson. Returns issues ordered blockers-first so the UI can
 * render them in severity order without sorting.
 */
export function checkLessonReadiness(
    lesson: LessonForReadiness | null | undefined,
    blocks: Partial<LessonBlock>[],
): ReadinessIssue[] {
    const blockers: ReadinessIssue[] = [];
    const warnings: ReadinessIssue[] = [];

    if (!lesson?.title_ar || !String(lesson.title_ar).trim()) {
        blockers.push({ severity: 'blocker', code: 'no_title' });
    }

    // Only published blocks reach students, so an unpublished empty block is
    // not a problem — it is a draft the teacher chose to hide.
    const visible = blocks.filter(b => b.is_published !== false);

    if (visible.length === 0) {
        blockers.push({ severity: 'blocker', code: 'no_content' });
    }

    const missingUrl = visible.filter(
        b => URL_REQUIRED.includes(String(b.type)) && !(b.url && String(b.url).trim()),
    ).length;
    if (missingUrl > 0) {
        blockers.push({ severity: 'blocker', code: 'media_without_url', count: missingUrl });
    }

    const emptyText = visible.filter(
        b => TEXT_REQUIRED.includes(String(b.type)) && !hasText(b),
    ).length;
    if (emptyText > 0) {
        blockers.push({ severity: 'blocker', code: 'empty_text_block', count: emptyText });
    }

    // A Q&A with no question is broken; one with no answer is merely odd.
    const qaNoQuestion = visible.filter(
        b => String(b.type) === 'qa'
            && !((b.title_ar && String(b.title_ar).trim()) || (b.title_en && String(b.title_en).trim())),
    ).length;
    if (qaNoQuestion > 0) {
        blockers.push({ severity: 'blocker', code: 'qa_without_question', count: qaNoQuestion });
    }

    // ── Warnings ──
    if (!lesson?.title_en || !String(lesson.title_en).trim()) {
        warnings.push({ severity: 'warning', code: 'no_english_title' });
    }

    const arabicOnly = visible.filter(
        b => TEXT_REQUIRED.includes(String(b.type))
            && b.content_ar && String(b.content_ar).trim()
            && !(b.content_en && String(b.content_en).trim()),
    ).length;
    if (arabicOnly > 0) {
        warnings.push({ severity: 'warning', code: 'blocks_without_english', count: arabicOnly });
    }

    if (!lesson?.duration_minutes || lesson.duration_minutes <= 0) {
        // Progress is time-gated against duration_minutes when set, and falls
        // back to a word-count estimate otherwise (see lib/progressModel.ts),
        // so an unset duration makes progress less accurate, not broken.
        warnings.push({ severity: 'warning', code: 'no_duration' });
    }

    return [...blockers, ...warnings];
}

export function hasBlockers(issues: ReadinessIssue[]): boolean {
    return issues.some(i => i.severity === 'blocker');
}
