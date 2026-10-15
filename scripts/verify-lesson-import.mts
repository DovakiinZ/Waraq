/**
 * Pins the behaviour of `parseLessonText`.
 *
 * Run: node --experimental-strip-types scripts/verify-lesson-import.mts
 *
 * Follows the same pattern as verify-lesson-hash.mts — the web project has no
 * test runner, so pure logic is pinned by a script that exits non-zero.
 *
 * The import module is pure and imports only a TYPE from '@/types/database',
 * which type-stripping erases, so it loads here with no bundler.
 */
import { parseLessonText, summariseBlocks, isArabicText } from '../src/lib/lessonImport.ts';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
        console.log(`  ok   ${name}`);
    } else {
        failures++;
        console.log(`  FAIL ${name}\n       expected ${e}\n       actual   ${a}`);
    }
}

console.log('language detection');
check('Arabic paragraph', isArabicText('الدرس الأول'), true);
check('English paragraph', isArabicText('Lesson one'), false);
check('digits only is not Arabic', isArabicText('12345'), false);

console.log('\nparagraph splitting');
check('empty input', parseLessonText(''), []);
check('whitespace only', parseLessonText('   \n\n  '), []);
check(
    'two paragraphs become two blocks',
    parseLessonText('First para.\n\nSecond para.').map(b => [b.type, b.content_en]),
    [['rich_text', 'First para.'], ['rich_text', 'Second para.']],
);
check(
    'a single newline keeps a bullet list in ONE block',
    parseLessonText('- one\n- two\n- three').length,
    1,
);
check(
    'Arabic text lands in content_ar, not content_en',
    parseLessonText('الجبر هو فرع من الرياضيات.')[0],
    { type: 'rich_text', content_ar: 'الجبر هو فرع من الرياضيات.' },
);

console.log('\ncallout markers');
check(
    'Arabic tip',
    parseLessonText('نصيحة: راجع الدرس قبل الامتحان')[0],
    { type: 'tip', content_ar: 'راجع الدرس قبل الامتحان' },
);
check(
    'English warning',
    parseLessonText('Warning: do not skip step two')[0],
    { type: 'warning', content_en: 'do not skip step two' },
);
check(
    'Arabic exercise',
    parseLessonText('تمرين: حل المعادلة التالية')[0],
    { type: 'exercise', content_ar: 'حل المعادلة التالية' },
);
check(
    'example with an en-dash separator',
    parseLessonText('Example – 2x + 3 = 7')[0],
    { type: 'example', content_en: '2x + 3 = 7' },
);
check(
    'a bare marker with no body stays plain text (false positive guard)',
    parseLessonText('Note:')[0].type,
    'rich_text',
);

console.log('\nmedia URLs on their own line');
check(
    'YouTube becomes a video block',
    parseLessonText('https://www.youtube.com/watch?v=dQw4w9WgXcQ')[0],
    { type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
);
check(
    'youtu.be short link too',
    parseLessonText('https://youtu.be/dQw4w9WgXcQ')[0].type,
    'video',
);
check(
    'an image extension becomes an image block',
    parseLessonText('https://example.com/diagram.png')[0],
    { type: 'image', url: 'https://example.com/diagram.png' },
);
check(
    'any other URL becomes a link block',
    parseLessonText('https://example.com/article')[0].type,
    'link',
);
check(
    'a URL inside a sentence is NOT turned into a media block',
    parseLessonText('See https://example.com/x.png for details')[0].type,
    'rich_text',
);

console.log('\nequations');
check(
    'display maths in $$',
    parseLessonText('$$ x^2 + y^2 = z^2 $$')[0],
    { type: 'equation', content_en: 'x^2 + y^2 = z^2' },
);
check(
    'display maths in \\[ \\]',
    parseLessonText('\\[ a + b \\]')[0].type,
    'equation',
);

console.log('\nQ&A pairing');
check(
    'Arabic question and answer become one qa block',
    parseLessonText('س: ما هو الجبر؟\nج: فرع من الرياضيات'),
    [{ type: 'qa', title_ar: 'ما هو الجبر؟', content_ar: 'فرع من الرياضيات' }],
);
check(
    'English Q/A',
    parseLessonText('Q: What is algebra?\nA: A branch of maths'),
    [{ type: 'qa', title_en: 'What is algebra?', content_en: 'A branch of maths' }],
);
check(
    'a question with no answer still yields a qa block',
    parseLessonText('Q: Open question?')[0],
    { type: 'qa', title_en: 'Open question?' },
);

console.log('\nheadings and paste artefacts');
check(
    'markdown heading keeps its text, drops the hashes',
    parseLessonText('## Chapter One')[0],
    { type: 'rich_text', content_en: 'Chapter One' },
);
check(
    'CRLF line endings split correctly',
    parseLessonText('One.\r\n\r\nTwo.').length,
    2,
);
check(
    'zero-width characters from a Word paste do not defeat a marker',
    parseLessonText('﻿Warning: careful')[0].type,
    'warning',
);
check(
    'trailing whitespace on each line is trimmed',
    parseLessonText('Line one.   \n\nLine two.   ')[1].content_en,
    'Line two.',
);

console.log('\nsummary');
check(
    'block type counts',
    summariseBlocks(parseLessonText(
        'Intro paragraph.\n\nTip: remember this\n\nhttps://youtu.be/dQw4w9WgXcQ\n\nAnother paragraph.',
    )),
    { rich_text: 2, tip: 1, video: 1 },
);

console.log('\nrealistic full paste');
const realistic = parseLessonText(`# الدرس الأول: المعادلات

المعادلة هي علاقة رياضية تحتوي على مجهول واحد أو أكثر.

نصيحة: ابدأ دائماً بتبسيط الطرفين

$$ 2x + 3 = 7 $$

تمرين: حل المعادلة 5x - 10 = 0

س: ما الفرق بين المعادلة والمتباينة؟
ج: المعادلة تستخدم علامة يساوي

https://youtu.be/dQw4w9WgXcQ`);
check(
    'a teacher\'s pasted notes produce the expected block sequence',
    realistic.map(b => b.type),
    ['rich_text', 'rich_text', 'tip', 'equation', 'exercise', 'qa', 'video'],
);
check('every Arabic block routed to content_ar / title_ar',
    realistic.filter(b => b.type !== 'video' && b.type !== 'equation')
        .every(b => Boolean(b.content_ar || b.title_ar)),
    true);

console.log(failures === 0
    ? '\nAll lesson-import checks passed.'
    : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
