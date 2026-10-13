/**
 * Proves the teacher publish gate from a real teacher session.
 *
 * The teacher's own profile flag is flipped to pending for the duration and
 * ALWAYS restored in the finally block — a crashed run must not leave a real
 * teacher deactivated. The flip goes through run-sql.mjs because the teacher
 * cannot change their own is_active (and must not be able to).
 */
import { execFileSync } from 'child_process';
import { login } from './00-login.mjs';

const { sb, user } = await login();
const UID = user.id;

const sql = (q) =>
  execFileSync('node', ['.smoke/run-sql.mjs', '-q', q], { encoding: 'utf8' });

const setActive = (v) =>
  sql(`update public.profiles set is_active = ${v} where id = '${UID}'`);

let passed = 0;
let failed = 0;
const created = [];

function check(name, ok, detail = '') {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? '\n       ' + detail : '')); }
}

const draft = (extra) => ({
  title_ar: 'مادة اختبار البوابة',
  teacher_id: UID,
  slug: 'gate-test-' + Math.random().toString(36).slice(2, 9),
  sort_order: 0,
  ...extra,
});

try {
  console.log('\n=== pending teacher ===');
  setActive(false);

  const blocked = await sb.from('subjects').insert(draft({ is_active: true })).select('id');
  check(
    'publishing is refused while pending',
    !!blocked.error && String(blocked.error.message).includes('TEACHER_NOT_APPROVED'),
    blocked.error ? `got [${blocked.error.code}] ${blocked.error.message}` : 'INSERT SUCCEEDED — the gate is not in place',
  );

  const asDraft = await sb.from('subjects').insert(draft({ is_active: false })).select('id');
  check('creating a draft is still allowed while pending', !asDraft.error,
    asDraft.error ? `[${asDraft.error.code}] ${asDraft.error.message}` : '');
  if (asDraft.data?.[0]) created.push(asDraft.data[0].id);

  if (created.length) {
    const promote = await sb.from('subjects').update({ is_active: true }).eq('id', created[0]).select('id');
    check(
      'promoting a draft is refused while pending',
      !!promote.error && String(promote.error.message).includes('TEACHER_NOT_APPROVED'),
      promote.error ? `got [${promote.error.code}]` : 'UPDATE SUCCEEDED — the gate misses the update path',
    );
  }

  console.log('\n=== approved teacher ===');
  setActive(true);

  if (created.length) {
    const ok = await sb.from('subjects').update({ is_active: true }).eq('id', created[0]).select('id');
    check('publishing is allowed once approved', !ok.error,
      ok.error ? `[${ok.error.code}] ${ok.error.message}` : '');
  }

  const direct = await sb.from('subjects').insert(draft({ is_active: true })).select('id');
  check('creating a published subject is allowed once approved', !direct.error,
    direct.error ? `[${direct.error.code}] ${direct.error.message}` : '');
  if (direct.data?.[0]) created.push(direct.data[0].id);
} finally {
  // Restore the flag first: it matters more than the cleanup below.
  setActive(true);
  for (const id of created) {
    await sb.from('subjects').delete().eq('id', id);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
