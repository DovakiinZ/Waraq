/**
 * Cross-runtime check for the AI-summary content hash.
 *
 *   node --experimental-strip-types scripts/verify-lesson-hash.mts
 *
 * `lessonSummaryCore.ts` is imported by two runtimes — the browser bundle and
 * the `ai-assist` Deno edge function — and they MUST agree byte-for-byte. If
 * they disagree, `source_hash` never matches the hash recomputed in the
 * browser and every teacher sees a permanent, false "lesson changed since this
 * summary" warning.
 *
 * This script pins the hash of a fixture lesson. It runs on Node, which shares
 * the same standard `crypto.subtle` and `TextEncoder` that Deno and browsers
 * expose, so a mismatch here means the canonicaliser changed — not that the
 * runtimes differ. Update EXPECTED_HASH only when you intended to change the
 * canonical format, and know that doing so invalidates every stored
 * `source_hash` in the database.
 */

import { buildLessonSource, hashLessonSource } from '../supabase/functions/_shared/lessonSummaryCore.ts';

const FIXTURE = {
  lesson: {
    title_ar: 'قانون أوم',
    title_en: "Ohm's Law",
    objectives_ar: 'أن يتعرف الطالب على العلاقة بين الجهد والتيار والمقاومة.',
    objectives_en: 'Understand the relationship between voltage, current and resistance.',
  },
  sections: [
    { id: 's2', title_ar: 'التطبيقات', title_en: 'Applications', sort_order: 2 },
    { id: 's1', title_ar: 'المقدمة', title_en: 'Introduction', sort_order: 1 },
  ],
  blocks: [
    {
      id: 'b3', section_id: 's2', type: 'example', sort_order: 1,
      title_ar: 'مثال', title_en: 'Example',
      content_ar: 'إذا كان الجهد 12 فولت والمقاومة 4 أوم فإن التيار 3 أمبير.',
      content_en: 'With 12 volts across 4 ohms, the current is 3 amperes.',
    },
    {
      id: 'b1', section_id: 's1', type: 'rich_text', sort_order: 1,
      content_ar: 'ينص قانون أوم على أن التيار يتناسب طردياً مع الجهد.',
      content_en: 'Ohm’s law states that current is directly proportional to voltage.',
    },
    {
      id: 'b2', section_id: 's1', type: 'equation', sort_order: 2,
      title_ar: 'الصيغة', content_ar: 'V = I × R',
    },
    // Media: URL must be dropped, title kept.
    {
      id: 'b4', section_id: 's2', type: 'image', sort_order: 2,
      title_ar: 'دائرة بسيطة', url: 'https://example.com/whatever.png',
    },
    // Unpublished: must be excluded entirely.
    {
      id: 'b5', section_id: 's1', type: 'rich_text', sort_order: 3,
      content_ar: 'مسودة لم تُنشر بعد.', is_published: false,
    },
    // Unsectioned: must come first.
    { id: 'b0', section_id: null, type: 'tip', sort_order: 1, content_ar: 'تذكر وحدات القياس.' },
  ],
};

const EXPECTED_HASH = '0451ca9a750c187ce7ae21b1a85ce8dd86593cd3f6530820e87e05999f40d68c';

const canonical = buildLessonSource(FIXTURE as never);
const hash = await hashLessonSource(FIXTURE as never);

console.log('--- canonical source ---');
console.log(canonical);
console.log('--- end ---\n');
console.log('sha256:', hash);

// Structural invariants that must hold regardless of the hash value.
const problems: string[] = [];
if (canonical.includes('example.com')) problems.push('media URL leaked into the canonical source');
if (canonical.includes('مسودة لم تُنشر')) problems.push('unpublished block was included');
if (!canonical.includes('V = I × R')) problems.push('equation content was altered or dropped');
if (!canonical.includes('دائرة بسيطة')) problems.push('media block title was dropped');
if (canonical.indexOf('تذكر وحدات القياس') > canonical.indexOf('المقدمة')) {
  problems.push('unsectioned blocks did not sort before sections');
}
if (canonical.indexOf('المقدمة') > canonical.indexOf('التطبيقات')) {
  problems.push('sections were not ordered by sort_order');
}
if (!canonical.includes('OBJECTIVES_AR')) problems.push('objectives were not included');

// Determinism: the same input must hash identically every time.
const again = await hashLessonSource(FIXTURE as never);
if (again !== hash) problems.push('hash is not deterministic across calls');

if (problems.length) {
  console.error('\nFAIL:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

if (EXPECTED_HASH !== '__FILL_ME__' && EXPECTED_HASH !== hash) {
  console.error(`\nFAIL: hash changed.\n  expected ${EXPECTED_HASH}\n  got      ${hash}`);
  console.error('  Every stored source_hash is now invalid. Intentional? Update EXPECTED_HASH.');
  process.exit(1);
}

console.log('\nOK: all structural invariants hold.');
if (EXPECTED_HASH === '__FILL_ME__') {
  console.log(`NOTE: pin the hash by setting EXPECTED_HASH = '${hash}'`);
}
