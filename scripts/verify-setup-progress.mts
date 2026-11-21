/**
 * Pins the setup guide step rules (src/lib/setupProgress.ts).
 * Run: node --experimental-strip-types scripts/verify-setup-progress.mts
 */
import {
    teacherSteps, studentSteps, completedCount, allComplete, nextStep, currentNumber,
} from '../src/lib/setupProgress.ts';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) console.log(`  ok   ${name}`);
    else { failures++; console.log(`  FAIL ${name}\n       expected ${e}\n       actual   ${a}`); }
}
const states = (s: { key: string; state: string }[]) => s.map((x) => `${x.key}:${x.state}`).join(' ');

console.log('teacher');
const empty = { profile: {}, subjects: [], lessons: [], lessonIdsWithBlocks: [] };
const t0 = teacherSteps(empty);
check('new teacher: nothing done', states(t0), 'profile:todo course:todo lesson:todo publish:todo');
check('new teacher: step 1 of 4', currentNumber(t0), 1);
check('new teacher: next is profile', nextStep(t0)?.key, 'profile');
check('null profile is safe', teacherSteps({ ...empty, profile: null })[0].state, 'todo');

check('bio only: profile 1 of 2',
    teacherSteps({ ...empty, profile: { bio_ar: 'معلم رياضيات' } })[0].count, { done: 1, total: 2 });
check('whitespace bio does not count',
    teacherSteps({ ...empty, profile: { bio_ar: '   ' } })[0].count, { done: 0, total: 2 });
check('Sham Cash needs name AND number',
    teacherSteps({ ...empty, profile: { bio_ar: 'x', shamcash_account_name: 'أحمد' } })[0].state, 'todo');
check('bio + Sham Cash: profile done',
    teacherSteps({ ...empty, profile: { bio_ar: 'x', shamcash_account_name: 'أحمد', shamcash_account_number: '123' } })[0].state, 'done');

const draftCourse = { ...empty, subjects: [{ id: 's1', is_active: false }] };
check('a draft course completes "course"', teacherSteps(draftCourse)[1], { key: 'course', state: 'done', n: 1 });

const emptyLesson = { ...draftCourse, lessons: [{ id: 'l1', subject_id: 's1', is_published: false }] };
check('a lesson with no blocks does not count', teacherSteps(emptyLesson)[2].state, 'todo');
check('a lesson with blocks counts',
    teacherSteps({ ...emptyLesson, lessonIdsWithBlocks: ['l1'] })[2], { key: 'lesson', state: 'done', n: 1 });
check('a lesson in someone else\'s subject does not count',
    teacherSteps({ ...emptyLesson, lessons: [{ id: 'l9', subject_id: 'other', is_published: true }], lessonIdsWithBlocks: ['l9'] })[2].state, 'todo');

const liveNoLesson = { ...empty, subjects: [{ id: 's1', is_active: true }], lessons: [{ id: 'l1', subject_id: 's1', is_published: false }], lessonIdsWithBlocks: ['l1'] };
check('published course with no published lesson: not live', teacherSteps(liveNoLesson)[3].state, 'todo');
check('published lesson in a hidden course: not live',
    teacherSteps({ ...liveNoLesson, subjects: [{ id: 's1', is_active: false }], lessons: [{ id: 'l1', subject_id: 's1', is_published: true }] })[3].state, 'todo');
const all = {
    profile: { bio_ar: 'x', shamcash_account_name: 'a', shamcash_account_number: '1' },
    subjects: [{ id: 's1', is_active: true }],
    lessons: [{ id: 'l1', subject_id: 's1', is_published: true }],
    lessonIdsWithBlocks: ['l1'],
};
const tAll = teacherSteps(all);
check('everything: all complete', allComplete(tAll), true);
check('everything: 4 of 4', completedCount(tAll), 4);
check('counter never passes the end', currentNumber(tAll), 4);
check('nothing next when complete', nextStep(tAll), null);
check('order-independent: later step done, earlier not → next is earlier',
    nextStep(teacherSteps({ ...all, profile: {} }))?.key, 'profile');

console.log('student');
const s0 = studentSteps({ orders: [], enrolledCount: 0, progress: [] });
check('new student: nothing done', states(s0.steps), 'choose:todo start:todo finish:todo');
check('new student: 1 of 3', currentNumber(s0.steps), 1);
check('new student: no resume lesson', s0.resumeLessonId, null);

const pend = studentSteps({ orders: [{ status: 'pending_payment' }], enrolledCount: 0, progress: [] });
check('pending order completes "choose"', pend.steps[0].state, 'done');
check('pending order only: waiting for payment', pend.waitingForPayment, true);
check('rejected order does not count',
    studentSteps({ orders: [{ status: 'rejected' }], enrolledCount: 0, progress: [] }).steps[0].state, 'todo');
check('cancelled order does not count',
    studentSteps({ orders: [{ status: 'cancelled' }], enrolledCount: 0, progress: [] }).steps[0].state, 'todo');
check('paid order: not waiting',
    studentSteps({ orders: [{ status: 'paid' }, { status: 'pending_payment' }], enrolledCount: 1, progress: [] }).waitingForPayment, false);
check('enrolment alone completes "choose"',
    studentSteps({ orders: [], enrolledCount: 1, progress: [] }).steps[0].state, 'done');

const started = studentSteps({ orders: [], enrolledCount: 0, progress: [
    { lesson_id: 'a', completed_at: null, updated_at: '2026-11-20T10:00:00Z' },
    { lesson_id: 'b', completed_at: null, updated_at: '2026-11-21T09:00:00Z' },
] });
check('a free lesson opened completes choose + start', states(started.steps), 'choose:done start:done finish:todo');
check('started but pending order: not "waiting"', started.waitingForPayment, false);
check('resume = most recently touched', started.resumeLessonId, 'b');
const fin = studentSteps({ orders: [], enrolledCount: 1, progress: [{ lesson_id: 'a', completed_at: '2026-11-21T10:00:00Z' }] });
check('a completed lesson finishes the guide', allComplete(fin.steps), true);
check('completed count', fin.steps[2].n, 1);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
