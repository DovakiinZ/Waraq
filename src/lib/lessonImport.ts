/**
 * Turns pasted lesson text into draft content blocks.
 *
 * The slowest part of authoring was never typing — it was that a teacher with
 * a finished lesson in a Word document had to re-enter it one block at a
 * time, choosing a type from eleven options for each paragraph. This splits
 * a paste into blocks in one step.
 *
 * Deliberately NOT an AI call. It is instant, free, works offline, costs no
 * quota, and is deterministic enough to pin in a verification script — which
 * matters because the AI provider is the one part of this stack that is
 * currently unreliable (Gemini free-tier 429s, see CLAUDE.md). The teacher
 * can still run the existing per-block AI actions afterwards.
 *
 * Pure: no imports, no DOM, no network. `scripts/verify-lesson-import.mts`
 * pins the behaviour.
 */

import type { LessonBlockType } from '@/types/database';

export interface ImportedBlock {
    type: LessonBlockType;
    /** Arabic content, when the paragraph was detected as Arabic. */
    content_ar?: string;
    /** English content, when the paragraph was detected as Latin. */
    content_en?: string;
    title_ar?: string;
    title_en?: string;
    url?: string;
}

/** Arabic letter range — enough to tell an Arabic paragraph from a Latin one. */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isArabicText(text: string): boolean {
    return ARABIC.test(text);
}

/**
 * Callout markers. A paragraph opening with one of these becomes that block
 * type, with the marker stripped. Arabic and English both, because teachers
 * write their notes in either.
 */
const CALLOUT_MARKERS: { type: LessonBlockType; patterns: RegExp }[] = [
    { type: 'tip', patterns: /^(نصيحة|ملاحظة|tip|note)\s*[:：\-–]\s*/i },
    { type: 'warning', patterns: /^(تنبيه|تحذير|انتبه|warning|caution)\s*[:：\-–]\s*/i },
    { type: 'example', patterns: /^(مثال|example|e\.g\.)\s*[:：\-–]\s*/i },
    { type: 'exercise', patterns: /^(تمرين|نشاط|exercise|activity|practice)\s*[:：\-–]\s*/i },
];

/** A question line, for pairing into a Q&A block. */
const QUESTION_MARKER = /^(س|سؤال|q|question)\s*[:：\-–]\s*/i;
/** An answer line, the second half of a Q&A block. */
const ANSWER_MARKER = /^(ج|جواب|الجواب|a|answer)\s*[:：\-–]\s*/i;

/** `$$ … $$` or `\[ … \]`, the two ways teachers paste display maths. */
const EQUATION_WRAPPED = /^\s*(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])\s*$/;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i;
const YOUTUBE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}/i;
const BARE_URL = /^https?:\/\/\S+$/i;

/** Markdown-ish heading, which we keep as emphasised text rather than drop. */
const HEADING = /^#{1,6}\s+(.*)$/;

function assignText(block: ImportedBlock, text: string): ImportedBlock {
    if (isArabicText(text)) block.content_ar = text;
    else block.content_en = text;
    return block;
}

function assignTitle(block: ImportedBlock, text: string): ImportedBlock {
    if (isArabicText(text)) block.title_ar = text;
    else block.title_en = text;
    return block;
}

/**
 * Split pasted text into draft blocks.
 *
 * Paragraphs are separated by a blank line. A single newline inside a
 * paragraph is kept, so a bullet list pasted as consecutive lines stays one
 * block instead of exploding into one block per bullet.
 */
export function parseLessonText(raw: string): ImportedBlock[] {
    if (!raw || !raw.trim()) return [];

    const normalised = raw
        .replace(/\r\n?/g, '\n')
        // Zero-width and BOM characters ride along with Word/PDF pastes and
        // would otherwise defeat every marker regex below.
        .replace(/[\u200B-\u200D\uFEFF]/g, '');

    const paragraphs = normalised
        .split(/\n\s*\n+/)
        .map(p => p.replace(/[ \t]+$/gm, '').trim())
        .filter(Boolean);

    const blocks: ImportedBlock[] = [];

    for (const paragraph of paragraphs) {
        // ── A paragraph that is just a URL becomes the matching media block ──
        if (BARE_URL.test(paragraph)) {
            const url = paragraph.trim();
            if (YOUTUBE.test(url)) {
                blocks.push({ type: 'video', url });
            } else if (IMAGE_EXT.test(url)) {
                blocks.push({ type: 'image', url });
            } else {
                blocks.push({ type: 'link', url });
            }
            continue;
        }

        // ── Display maths ──
        const equation = paragraph.match(EQUATION_WRAPPED);
        if (equation) {
            const body = (equation[1] ?? equation[2] ?? '').trim();
            blocks.push(assignText({ type: 'equation' }, body));
            continue;
        }

        // ── Q&A: a question line, then the rest as the answer ──
        if (QUESTION_MARKER.test(paragraph)) {
            const lines = paragraph.split('\n');
            const question = lines[0].replace(QUESTION_MARKER, '').trim();
            const answer = lines
                .slice(1)
                .join('\n')
                .replace(ANSWER_MARKER, '')
                .trim();
            const block: ImportedBlock = { type: 'qa' };
            assignTitle(block, question);
            if (answer) assignText(block, answer);
            blocks.push(block);
            continue;
        }

        // ── Callouts (tip / warning / example / exercise) ──
        const callout = CALLOUT_MARKERS.find(m => m.patterns.test(paragraph));
        if (callout) {
            const body = paragraph.replace(callout.patterns, '').trim();
            // A marker with nothing after it is a false positive (a teacher
            // writing the word "Note:" as a heading), so keep it as text.
            if (body) {
                blocks.push(assignText({ type: callout.type }, body));
                continue;
            }
        }

        // ── Markdown heading: keep the text, drop the hashes ──
        const heading = paragraph.match(HEADING);
        if (heading) {
            blocks.push(assignText({ type: 'rich_text' }, heading[1].trim()));
            continue;
        }

        blocks.push(assignText({ type: 'rich_text' }, paragraph));
    }

    return blocks;
}

/** Counts per block type, for the import preview's summary line. */
export function summariseBlocks(blocks: ImportedBlock[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const b of blocks) counts[b.type] = (counts[b.type] || 0) + 1;
    return counts;
}
