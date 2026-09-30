/**
 * How much of a lesson a student has actually got through.
 *
 * The old model was `blocksSeen / totalBlocks`, which is wrong in three ways
 * that students notice:
 *
 *   1. Every block counted the same. A one-line tip counted as much as six
 *      paragraphs of text, so skimming a lesson whose first block is a long
 *      explanation and whose next four are one-liners showed 80% after almost
 *      no reading.
 *   2. A one-block lesson went 0% -> 100% the instant it rendered. Nothing was
 *      read, and the lesson was marked complete.
 *   3. Nothing looked at time. Flicking to the bottom of a ten-minute lesson
 *      in two seconds completed it.
 *
 * This module fixes all three: blocks are weighted by how much there is to
 * read, and the reported percentage is capped by how long the student has
 * actually been on the page. Both halves are pure functions so they can be
 * reasoned about without a browser.
 */

import type { LessonBlock } from '@/types/database';

/** Average adult reading speed is ~200-250 wpm; school-age Arabic readers are
 *  slower, and this is a floor rather than a target, so we assume a brisk
 *  300 wpm. Over-estimating speed is the safe direction: it makes the time
 *  gate lenient, so the gate only ever catches obvious skipping. */
const WORDS_PER_MINUTE = 300;

/** Nobody reads a block in under this, no matter how short. */
const MIN_SECONDS_PER_BLOCK = 3;

/** A media block is worth this many words of dwell. A video or image needs
 *  some attention but we cannot measure playback from the block itself. */
const MEDIA_EQUIVALENT_WORDS = 40;

const MEDIA_TYPES = new Set(['image', 'video', 'file', 'link']);

function words(text: string | null | undefined): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * How much this block contributes, in "words of effort".
 *
 * Clamped at both ends: a heading-only block still counts for something, and
 * one enormous block cannot swamp the whole lesson so that reading it alone
 * shows 95%.
 */
export function blockWeight(block: Pick<LessonBlock, 'type' | 'title_ar' | 'title_en' | 'content_ar' | 'content_en'>): number {
    if (MEDIA_TYPES.has(block.type)) return MEDIA_EQUIVALENT_WORDS;

    // Count the language with more text — a lesson may be authored in either.
    const body = Math.max(words(block.content_ar), words(block.content_en));
    const heading = Math.max(words(block.title_ar), words(block.title_en));
    const total = body + heading;

    const MIN = 10;   // a one-liner is still a thing to read
    const MAX = 400;  // one wall of text must not drown the rest of the lesson
    return Math.min(MAX, Math.max(MIN, total));
}

export interface ProgressInput {
    /** Published blocks only, in display order. */
    blocks: Array<Pick<LessonBlock, 'id' | 'type' | 'title_ar' | 'title_en' | 'content_ar' | 'content_en'>>;
    /** Ids the viewport has dwelled on. */
    seenIds: Set<string>;
    /** Seconds since the lesson opened. */
    elapsedSeconds: number;
    /** Teacher-declared duration, when set. Trusted over the word count. */
    durationMinutes?: number | null;
}

export interface ProgressResult {
    /** 0-100, already time-capped. Safe to display and to store. */
    percent: number;
    /** What the content alone would say, before the time cap. */
    contentPercent: number;
    /** The ceiling the dwell time currently allows. */
    timeCapPercent: number;
    /** True when the time gate is what is holding the number back. */
    gatedByTime: boolean;
    /** Seconds of reading this lesson is reckoned to need. */
    expectedSeconds: number;
}

/**
 * The minimum time a lesson is reckoned to take.
 *
 * Prefers the teacher's own `duration_minutes` when they set one — they know
 * the lesson better than a word count does — and otherwise estimates from the
 * text. Only 60% of the estimate is required, so a fast reader is not punished;
 * the gate exists to catch "scrolled to the bottom instantly", not to force
 * anyone to sit still.
 */
export function expectedSeconds(input: Pick<ProgressInput, 'blocks' | 'durationMinutes'>): number {
    if (input.durationMinutes && input.durationMinutes > 0) {
        return Math.round(input.durationMinutes * 60 * 0.6);
    }
    const totalWords = input.blocks.reduce((sum, b) => sum + blockWeight(b), 0);
    const readingSeconds = (totalWords / WORDS_PER_MINUTE) * 60;
    const floor = input.blocks.length * MIN_SECONDS_PER_BLOCK;
    return Math.round(Math.max(readingSeconds * 0.6, floor));
}

/**
 * Weighted, time-gated progress.
 *
 * `percent` never exceeds what the elapsed time justifies, so the number
 * climbing is always evidence of something. It is also monotonic per call —
 * the caller keeps the max — because a student scrolling back up must not see
 * their progress fall.
 */
export function computeProgress(input: ProgressInput): ProgressResult {
    const { blocks, seenIds, elapsedSeconds } = input;

    if (blocks.length === 0) {
        return { percent: 0, contentPercent: 0, timeCapPercent: 0, gatedByTime: false, expectedSeconds: 0 };
    }

    let total = 0;
    let seen = 0;
    for (const b of blocks) {
        const w = blockWeight(b);
        total += w;
        if (seenIds.has(b.id)) seen += w;
    }

    const contentPercent = total > 0 ? Math.round((seen / total) * 100) : 0;

    const needed = expectedSeconds(input);
    // Before any time has passed the cap is 0, so a lesson cannot render at
    // 100%. It rises linearly and is never the binding constraint once the
    // student has genuinely been there.
    const timeCapPercent = needed <= 0 ? 100 : Math.min(100, Math.round((elapsedSeconds / needed) * 100));

    const percent = Math.min(contentPercent, timeCapPercent);

    return {
        percent,
        contentPercent,
        timeCapPercent,
        gatedByTime: timeCapPercent < contentPercent,
        expectedSeconds: needed,
    };
}
