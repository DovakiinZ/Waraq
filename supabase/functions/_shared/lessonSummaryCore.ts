/**
 * Shared core for the AI summary feature ("AI summary" / "الملخص الذكي").
 *
 * ONE module, imported by BOTH runtimes:
 *   - the browser bundle, via the `@shared` Vite alias (src/lib/lessonSummary.ts)
 *   - the `ai-assist` edge function, via `../_shared/lessonSummaryCore.ts`
 *
 * That is only possible because this file is dependency-free and uses nothing
 * outside the intersection of Deno and the DOM:
 *
 *   - NO `Deno.*`, no `npm:`/`https://` imports, no node builtins.
 *   - NO `zod` — the Zod schemas live in src/lib/lessonSummary.ts, which is
 *     browser-only. This file exports plain predicate validators instead, so
 *     the edge function can check the model's output without a dependency.
 *   - `crypto.subtle` and `TextEncoder` are globals in both runtimes.
 *
 * If you add an import to this file, you have broken one of the two callers.
 * The hash must agree byte-for-byte across runtimes or every teacher sees a
 * permanent "lesson changed since this summary" warning.
 * `scripts/verify-lesson-hash.mts` pins that format against
 * a frozen fixture — run it after touching anything below:
 *   node --experimental-strip-types scripts/verify-lesson-hash.mts
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** A lesson content block, narrowed to the fields the summary cares about. */
export interface HashableBlock {
  id: string;
  section_id: string | null;
  type: string;
  title_ar?: string | null;
  title_en?: string | null;
  content_ar?: string | null;
  content_en?: string | null;
  url?: string | null;
  sort_order?: number | null;
  is_published?: boolean | null;
}

/** A lesson section. NOTE: lesson_sections has no `is_published` column. */
export interface HashableSection {
  id: string;
  title_ar?: string | null;
  title_en?: string | null;
  sort_order?: number | null;
}

export interface HashableLesson {
  title_ar?: string | null;
  title_en?: string | null;
  objectives_ar?: string | null;
  objectives_en?: string | null;
}

export interface LessonSource {
  lesson: HashableLesson;
  sections: HashableSection[];
  blocks: HashableBlock[];
}

/** One slide of the generated deck. */
export interface SummarySlide {
  title: string;
  bullets: string[];
}

/** The generator's output for a single language. */
export interface SummaryPayload {
  summary: string;
  key_points: string[];
  slides: SummarySlide[];
}

export type SummaryStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

// ─── Canonicalisation ────────────────────────────────────────────────────────

/**
 * Block types whose payload is a media URL rather than prose. Their URL is
 * deliberately dropped: the model must never see it (it would invent captions
 * from filenames) and a re-upload that changes only the URL must not invalidate
 * an otherwise-identical summary. Their titles still carry meaning, so those
 * are kept.
 */
const MEDIA_TYPES = new Set(['image', 'video', 'file', 'link']);

/** Collapse whitespace so cosmetic reflows do not invalidate a summary. */
function norm(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Numeric-then-id ordering. Never `localeCompare` — its result depends on the
 * host's ICU data and locale, which differ between Deno and a browser, and
 * would silently desync the hash.
 */
function bySortOrder<T extends { sort_order?: number | null; id: string }>(a: T, b: T): number {
  const ao = a.sort_order ?? 0;
  const bo = b.sort_order ?? 0;
  if (ao !== bo) return ao - bo;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Render the lesson as one deterministic string.
 *
 * This is BOTH the model's input and the input to `sourceHash`, on purpose:
 * the hash then means exactly "the text the summary was generated from", so a
 * stale-hash warning fires if and only if the summary could actually be out of
 * date. Reordering blocks changes it; fixing a typo in an unpublished block
 * does not, because unpublished blocks are excluded.
 */
export function buildLessonSource(src: LessonSource): string {
  const lines: string[] = [];

  lines.push(`LESSON_TITLE_AR: ${norm(src.lesson.title_ar)}`);
  lines.push(`LESSON_TITLE_EN: ${norm(src.lesson.title_en)}`);

  const objAr = norm(src.lesson.objectives_ar);
  const objEn = norm(src.lesson.objectives_en);
  if (objAr) lines.push(`OBJECTIVES_AR: ${objAr}`);
  if (objEn) lines.push(`OBJECTIVES_EN: ${objEn}`);

  const published = src.blocks.filter((b) => b.is_published !== false);

  const renderBlock = (b: HashableBlock): void => {
    const titleAr = norm(b.title_ar);
    const titleEn = norm(b.title_en);
    const contentAr = norm(b.content_ar);
    const contentEn = norm(b.content_en);

    // A media block with no title contributes nothing but noise.
    if (MEDIA_TYPES.has(b.type) && !titleAr && !titleEn) return;

    lines.push(`BLOCK ${b.type}`);
    if (titleAr) lines.push(`  TITLE_AR: ${titleAr}`);
    if (titleEn) lines.push(`  TITLE_EN: ${titleEn}`);
    if (!MEDIA_TYPES.has(b.type)) {
      // `equation` content is literal characters, not rendered maths — the
      // renderer shows it verbatim in a mono font, so it is passed through
      // unchanged and the model is told to reproduce it exactly.
      if (contentAr) lines.push(`  CONTENT_AR: ${contentAr}`);
      if (contentEn) lines.push(`  CONTENT_EN: ${contentEn}`);
    }
  };

  // Unsectioned blocks first — the same order LessonContentRenderer uses.
  const unsectioned = published.filter((b) => !b.section_id).sort(bySortOrder);
  if (unsectioned.length) {
    lines.push('SECTION: (none)');
    unsectioned.forEach(renderBlock);
  }

  for (const section of [...src.sections].sort(bySortOrder)) {
    const blocks = published.filter((b) => b.section_id === section.id).sort(bySortOrder);
    if (!blocks.length) continue;
    lines.push(`SECTION_AR: ${norm(section.title_ar)}`);
    const sectionEn = norm(section.title_en);
    if (sectionEn) lines.push(`SECTION_EN: ${sectionEn}`);
    blocks.forEach(renderBlock);
  }

  return lines.join('\n');
}

/** SHA-256 of the canonical source text, lowercase hex. */
export async function sourceHash(canonicalText: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalText);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convenience: canonicalise and hash in one step. */
export async function hashLessonSource(src: LessonSource): Promise<string> {
  return sourceHash(buildLessonSource(src));
}

// ─── Dependency-free validation (edge-function side) ─────────────────────────

/** Upper bounds, enforced on both sides so a runaway generation cannot bloat a row. */
export const SUMMARY_LIMITS = {
  summaryMaxChars: 4000,
  keyPointsMax: 12,
  keyPointMaxChars: 400,
  slidesMax: 20,
  slideTitleMaxChars: 200,
  bulletsPerSlideMax: 8,
  bulletMaxChars: 400,
} as const;

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

/**
 * Structural check for one language's payload. Returns an error string, or
 * null when valid. Mirrors the Zod schema in src/lib/lessonSummary.ts — keep
 * the two in step.
 */
export function validateSummaryPayload(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'payload is not an object';
  const p = value as Record<string, unknown>;

  if (!isNonEmptyString(p.summary, SUMMARY_LIMITS.summaryMaxChars)) {
    return 'summary must be a non-empty string within the length limit';
  }

  if (!Array.isArray(p.key_points) || p.key_points.length === 0) {
    return 'key_points must be a non-empty array';
  }
  if (p.key_points.length > SUMMARY_LIMITS.keyPointsMax) {
    return `key_points must hold at most ${SUMMARY_LIMITS.keyPointsMax} items`;
  }
  for (const point of p.key_points) {
    if (!isNonEmptyString(point, SUMMARY_LIMITS.keyPointMaxChars)) {
      return 'every key point must be a non-empty string within the length limit';
    }
  }

  if (!Array.isArray(p.slides) || p.slides.length === 0) {
    return 'slides must be a non-empty array';
  }
  if (p.slides.length > SUMMARY_LIMITS.slidesMax) {
    return `slides must hold at most ${SUMMARY_LIMITS.slidesMax} items`;
  }
  for (const slide of p.slides) {
    if (typeof slide !== 'object' || slide === null) return 'every slide must be an object';
    const s = slide as Record<string, unknown>;
    if (!isNonEmptyString(s.title, SUMMARY_LIMITS.slideTitleMaxChars)) {
      return 'every slide needs a non-empty title within the length limit';
    }
    if (!Array.isArray(s.bullets) || s.bullets.length === 0) {
      return 'every slide needs a non-empty bullets array';
    }
    if (s.bullets.length > SUMMARY_LIMITS.bulletsPerSlideMax) {
      return `a slide may hold at most ${SUMMARY_LIMITS.bulletsPerSlideMax} bullets`;
    }
    for (const bullet of s.bullets) {
      if (!isNonEmptyString(bullet, SUMMARY_LIMITS.bulletMaxChars)) {
        return 'every bullet must be a non-empty string within the length limit';
      }
    }
  }

  return null;
}

// ─── Prompting ───────────────────────────────────────────────────────────────

/**
 * The JSON Schema handed to Groq as `response_format.json_schema` with
 * `strict: true`. Strict mode requires every property listed in `required`
 * and `additionalProperties: false` on every object — see
 * https://console.groq.com/docs/structured-outputs
 */
export const SUMMARY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'key_points', 'slides'],
  properties: {
    summary: {
      type: 'string',
      description: 'A flowing prose summary of the lesson, 3 to 6 short paragraphs.',
    },
    key_points: {
      type: 'array',
      description: 'The main takeaways, one short sentence each.',
      items: { type: 'string' },
    },
    slides: {
      type: 'array',
      description: 'A presentable outline of the lesson, one entry per slide.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'bullets'],
        properties: {
          title: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

export interface PromptContext {
  language: 'ar' | 'en';
  /** Stage title, e.g. "المرحلة الابتدائية" — sets the reading level. */
  stage?: string | null;
  /** Subject title, for topical framing only. */
  subject?: string | null;
}

/**
 * System prompt for the summary generator. Deliberately separate from
 * ai-assist's global SYSTEM_PROMPT: that one forbids markdown and assumes a
 * free-text reply, neither of which applies to a strict-JSON generation.
 */
export function buildSummarySystemPrompt(ctx: PromptContext): string {
  const audience = ctx.stage
    ? `The students are at this educational stage: ${ctx.stage}. Pitch the vocabulary and sentence length to that age.`
    : 'The students are school-age. Keep the vocabulary and sentence length simple.';

  const languageRule =
    ctx.language === 'ar'
      ? [
          'Write EVERY string in Arabic.',
          'Use natural Modern Standard Arabic (فصحى معاصرة) — not dialect, and not a word-for-word translation from English.',
          'Keep technical terms in the form the lesson itself uses.',
        ].join(' ')
      : 'Write EVERY string in clear, plain English.';

  return [
    'You summarise a single school lesson for a bilingual Arabic/English learning platform.',
    '',
    'ABSOLUTE RULES:',
    '1. Use ONLY the lesson content supplied in the user message. Add no fact, example, date, name or definition that is not already there.',
    '2. If the lesson does not cover something, leave it out. Never fill a gap from your own knowledge.',
    '3. Reproduce any equation or formula exactly as written. Do not convert notation, do not "correct" it, do not render it.',
    '4. Never invent a source, citation or link.',
    '5. Output JSON only, matching the supplied schema exactly. No prose outside the JSON.',
    '',
    `AUDIENCE: ${audience}`,
    `LANGUAGE: ${languageRule}`,
    '',
    'SHAPE:',
    '- `summary`: flowing prose, 3 to 6 short paragraphs separated by a blank line. Plain text — no markdown, no headings, no bullet characters.',
    '- `key_points`: 3 to 8 takeaways, one short sentence each.',
    '- `slides`: 4 to 10 slides that walk through the lesson in its own order. Each slide has a short title and 2 to 5 bullets. A bullet is a phrase, not a paragraph.',
  ].join('\n');
}

export function buildSummaryUserPrompt(canonicalText: string, ctx: PromptContext): string {
  const subjectLine = ctx.subject ? `Subject: ${ctx.subject}\n` : '';
  return `${subjectLine}Summarise the lesson below. Remember: everything you write must come from this text and nothing else.

--- BEGIN LESSON CONTENT ---
${canonicalText}
--- END LESSON CONTENT ---`;
}
