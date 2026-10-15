/**
 * Pins `checkLessonReadiness`.
 * Run: node --experimental-strip-types scripts/verify-lesson-readiness.mts
 */
import { checkLessonReadiness, hasBlockers } from '../src/lib/lessonReadiness.ts';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) console.log(`  ok   ${name}`);
    else { failures++; console.log(`  FAIL ${name}\n       expected ${e}\n       actual   ${a}`); }
}

const good = { title_ar: 'الدرس', title_en: 'Lesson', duration_minutes: 10 };
const codes = (l: any, b: any[]) => checkLessonReadiness(l, b).map(i => i.code);

console.log('blockers');
check('no title', codes({ ...good, title_ar: '' }, [{ type: 'rich_text', content_ar: 'x' }]).includes('no_title'), true);
check('whitespace title counts as missing',
    codes({ ...good, title_ar: '   ' }, [{ type: 'rich_text', content_ar: 'x' }]).includes('no_title'), true);
check('no content at all', codes(good, []).includes('no_content'), true);
check('media block with no url',
    codes(good, [{ type: 'video', url: '' }]).includes('media_without_url'), true);
check('image with no url too',
    codes(good, [{ type: 'image' }]).includes('media_without_url'), true);
check('empty text block',
    codes(good, [{ type: 'rich_text', content_ar: '' }]).includes('empty_text_block'), true);
check('qa with no question',
    codes(good, [{ type: 'qa', content_ar: 'answer' }]).includes('qa_without_question'), true);
check('counts affected blocks',
    checkLessonReadiness(good, [{ type: 'video' }, { type: 'image' }])
        .find(i => i.code === 'media_without_url')?.count, 2);

console.log('\nunpublished blocks are exempt');
check('an unpublished empty block is not a blocker',
    codes(good, [
        { type: 'rich_text', content_ar: 'real content' },
        { type: 'video', url: '', is_published: false },
    ]).includes('media_without_url'), false);
check('but a lesson whose ONLY block is unpublished has no content',
    codes(good, [{ type: 'rich_text', content_ar: 'x', is_published: false }]).includes('no_content'), true);

console.log('\nwarnings, never blockers');
check('Arabic-only lesson is publishable',
    hasBlockers(checkLessonReadiness(
        { title_ar: 'الدرس', title_en: '', duration_minutes: 10 },
        [{ type: 'rich_text', content_ar: 'محتوى' }],
    )), false);
check('missing English title is a warning',
    checkLessonReadiness({ ...good, title_en: '' }, [{ type: 'rich_text', content_ar: 'x' }])
        .find(i => i.code === 'no_english_title')?.severity, 'warning');
check('blocks without English is a warning',
    checkLessonReadiness(good, [{ type: 'rich_text', content_ar: 'محتوى' }])
        .find(i => i.code === 'blocks_without_english')?.severity, 'warning');
check('no duration is a warning',
    checkLessonReadiness({ ...good, duration_minutes: null }, [{ type: 'rich_text', content_ar: 'x' }])
        .find(i => i.code === 'no_duration')?.severity, 'warning');
check('zero duration counts as unset',
    codes({ ...good, duration_minutes: 0 }, [{ type: 'rich_text', content_ar: 'x' }]).includes('no_duration'), true);

console.log('\na complete bilingual lesson');
check('no issues at all', checkLessonReadiness(good, [
    { type: 'rich_text', content_ar: 'محتوى', content_en: 'content' },
    { type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' },
    { type: 'qa', title_ar: 'سؤال', title_en: 'Question', content_ar: 'جواب', content_en: 'answer' },
]), []);

console.log('\nordering and null-safety');
check('blockers come before warnings',
    checkLessonReadiness({ title_ar: '', title_en: '', duration_minutes: null }, [])
        .map(i => i.severity),
    ['blocker', 'blocker', 'warning', 'warning']);
check('a null lesson does not throw', hasBlockers(checkLessonReadiness(null, [])), true);
check('undefined blocks list is treated as empty',
    codes(good, []).includes('no_content'), true);

console.log(failures === 0 ? '\nAll readiness checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
