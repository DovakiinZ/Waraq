# Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A student answers one question before seeing courses, and a teacher is productive from the first minute with approval gating publishing rather than logging in — on both web and Android.

**Architecture:** Three independent layers. A database trigger makes `profiles.is_active` a real publish gate (trigger, not RLS policy, because Postgres ORs permissive policies). Both clients branch on the session Supabase already returns from `signUp`, which removes the email dead end and the forced re-login. The teacher's first run becomes a derived checklist inside the existing dashboard rather than a new blocking route.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + arcade primitives (web); Flutter + Riverpod + go_router (Android); Supabase Postgres + PostgREST; `.smoke/` node scripts for live-DB testing; `flutter test` for widget tests.

**Spec:** `docs/superpowers/specs/2026-10-13-onboarding-design.md`
**Mockups:** `https://claude.ai/code/artifact/9ad6ef35-f877-47ac-a287-ae603dfb6bbd`

## Global Constraints

- **Bilingual, always.** Every user-facing string goes through `t('عربي', 'English')` on web and `t('عربي', 'English')` from `languageProvider` on Flutter. No exceptions, including error text.
- **Never add letter-spacing to Arabic text.** IBM Plex Sans Arabic tops out at weight 700 — `font-black` and `font-extrabold` both resolve to 700.
- **Arcade rules.** Radius 0 everywhere, borders 2px. `A.ink` is a TEXT colour, `A.line` a BORDER colour, `A.band` a FILL — never substitute one for another or dark mode breaks. Text on `A.accent` is always `A.onAccent`, never white. Focus rings use `A.mid`, not `A.accent`. **Never set `boxShadow` inline on a `.arc-press` element** — inline styles beat the `:hover`/`:active` rules and the press effect dies silently; recolour via `--arc-press-color`.
- **Web imports use `@/`**, never relative paths beyond `./` in the same directory.
- **`supabase db push` is banned on this project** — the migrations folder still contains `100_clean_rewrite.sql`, which drops the public schema. Apply SQL only with `node .smoke/run-sql.mjs -f <file>` or `-q "<sql>"`.
- **Verify DB state against `pg_policy` / `pg_trigger` / `pg_get_functiondef`, never against a successful-looking run.** Migration 107's hotfix was recorded as applied and had not taken.
- **`npm run lint` does not pass and did not before this work** — 634 errors, 48 warnings, overwhelmingly `no-explicit-any` from the `supabase.from(...) as any` idiom. Do not treat a non-zero lint exit as a regression you caused and do not "fix lint" as a side quest. Keep new files clean; check touched files with `npx eslint <file>`. **`npx tsc -b` and `npm run build` are the real web gate.**
- **`src/index.css` is the source of truth for arcade hex values.** `ayman_academy_flutter/lib/brand/arcade.dart` mirrors it; if one changes, change both.
- **Do not rename anything in CLAUDE.md's "Deliberately NOT renamed" table** — the Dart package name, the `ayman-academy-auth` localStorage key, the persisted client keys, the Supabase identifiers. Renaming them breaks builds or signs every user out.
- **Git writes need explicit approval in this repo.** Commit steps are written out below, but the owner's standing rule is no commit or push unless asked. Ask once before the first commit of a session, then proceed.
- **Commit message trailer:**
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `supabase/migrations/113_teacher_publish_gate.sql` | the trigger that makes `is_active` a publish gate |
| `supabase/migrations/113_ROLLBACK.sql` | drops the trigger and its function |
| `.smoke/30-publish-gate.mjs` | proves the gate from a real teacher session |
| `.smoke/31-student-onboarding.mjs` | proves a student can set their own stage and no one else's |
| `src/lib/studentStages.ts` | one list of stages and grade options, shared by onboarding, the profile editor and the admin table |
| `ayman_academy_flutter/lib/shared/student_stages.dart` | the Dart counterpart, shared by onboarding, the profile editor, the marketplace strip and the teacher application |
| `src/components/teacher/SandboxBanner.tsx` | pending-review banner + derived setup checklist |
| `src/hooks/useTeacherSetup.ts` | computes the four checklist rows from the profile and the application row |
| `ayman_academy_flutter/lib/features/teacher/application/screens/teacher_application_screen.dart` | the Android teacher application form |
| `ayman_academy_flutter/lib/features/teacher/widgets/sandbox_banner.dart` | Android banner + checklist |
| `ayman_academy_flutter/test/screens/teacher_application_screen_test.dart` | widget tests for the above |

**Modified**

| Path | Change |
|---|---|
| `src/contexts/AuthContext.tsx:335-354` | `signUp` returns the session instead of discarding it |
| `src/pages/auth/Register.tsx` | drop confirm-password; branch on the session |
| `src/pages/student/StudentOnboarding.tsx` | rebuild in arcade, stage only, `dir={direction}` |
| `src/pages/student/StudentProfile.tsx` | gains stage / gender / grade editors |
| `src/pages/student/StudentMarketplace.tsx` | first-run stage strip |
| `src/pages/TeacherApplication.tsx` | trim three fields; drop `signOut()` |
| `src/pages/teacher/TeacherDashboard.tsx:108-150` | replace the amber banner and the standalone Sham Cash card with `SandboxBanner` |
| `src/pages/teacher/TeacherSubjects.tsx:259,484` | read `profile`; create as draft when pending; draft chip + locked publish control |
| `src/pages/admin/StudentsManagement.tsx` | read stage/grade labels from `studentStages.ts` |
| `ayman_academy_flutter/lib/features/auth/providers/auth_provider.dart:113-119` | `signUp` returns `Session?` |
| `ayman_academy_flutter/lib/features/auth/screens/register_screen.dart` | drop `_confirmController`; branch on the session; teacher link |
| `ayman_academy_flutter/lib/features/onboarding/screens/student_onboarding_screen.dart` | grade-range sublabels |
| `ayman_academy_flutter/lib/features/student/profile/screens/student_profile_screen.dart` | stage / gender / grade editors |
| `ayman_academy_flutter/lib/features/teacher/subjects/screens/course_editor_screen.dart:91` | force `is_active: false` when pending |
| `ayman_academy_flutter/lib/core/router/routes.dart` | `teacherApply` route constant |
| `ayman_academy_flutter/lib/core/router/router.dart` | register the route |
| `ayman_academy_flutter/test/support/harness.dart:104-114,130,133` | `FakeAuthRepository` can return a session, a profile and a user |

---

# Phase A — The publish gate

This phase is first because it is the only security-relevant change, and because every later client change depends on knowing the gate exists.

### Task 1: Migration 113 — the publish gate trigger

**Files:**
- Create: `supabase/migrations/113_teacher_publish_gate.sql`
- Create: `supabase/migrations/113_ROLLBACK.sql`
- Test: `.smoke/30-publish-gate.mjs`

**Interfaces:**
- Consumes: `public.is_super_admin()`, defined in `049_fix_profiles_rls.sql`.
- Produces: trigger `trg_teacher_publish_gate` on `public.subjects`, and function `public.enforce_teacher_publish_gate()`. The trigger raises SQLSTATE `23514` with a message beginning `TEACHER_NOT_APPROVED:`. **Both clients match on that prefix** — Task 2 and Task 3 depend on this exact string.

- [ ] **Step 1: Confirm the two dependencies actually exist live**

Do not trust the migration files. Run:

```bash
node .smoke/run-sql.mjs -q "select proname from pg_proc where proname = 'is_super_admin'"
node .smoke/run-sql.mjs -q "select tgname from pg_trigger where tgrelid = 'public.subjects'::regclass and not tgisinternal"
```

Expected: the first returns one row `is_super_admin`. The second lists the existing triggers on `subjects` — record them, and if any already touches `is_active`, stop and report rather than stacking a second gate.

**Gate `is_active`, not `is_published`.** `subjects` carries both columns and the names invite the wrong choice. Measured on the live database 2026-10-13: `is_published` is `false` on all 6 subjects while `is_active` is true on 5, and every `is_published` reference in both clients is on `lessons`, never on `subjects`. `subjects.is_published` is a dead column — nothing writes it and nothing reads it. `is_active` is what the marketplace filters on and therefore what publishing means.

Note also that `is_active` is `NOT NULL DEFAULT true`, so an INSERT that simply omits the column still arrives as published. The trigger reads `NEW.is_active` after defaults are applied, so it catches that case; a client-side check alone would not.

- [ ] **Step 2: Write the failing test**

Create `.smoke/30-publish-gate.mjs`:

```js
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
```

- [ ] **Step 3: Run it and watch it fail in the specific way that proves the bug**

Run: `node .smoke/30-publish-gate.mjs`

Expected: **`FAIL publishing is refused while pending — INSERT SUCCEEDED — the gate is not in place`**, and the same for the promote case. The two "approved teacher" checks pass. This is the defect, reproduced: a pending teacher can publish today.

- [ ] **Step 4: Write the migration**

Create `supabase/migrations/113_teacher_publish_gate.sql`:

```sql
-- 113_teacher_publish_gate.sql
--
-- `profiles.is_active` becomes a PUBLISH gate rather than a login gate: a
-- teacher builds freely from the first minute, but cannot make a subject
-- visible until an admin approves them.
--
-- Implemented as a TRIGGER, deliberately not an RLS policy. Postgres ORs
-- permissive policies together, which is how 104's profiles lockdown silently
-- failed and why 109 had to enumerate pg_policy instead of dropping by name.
-- A later permissive policy would quietly reopen a policy-based gate; it
-- cannot reopen a trigger.
--
-- Deactivating a teacher does NOT unpublish their existing subjects. The
-- trigger fires on write, not on read, so students who have paid keep their
-- access and pulling a live course stays an explicit admin action.

create or replace function public.enforce_teacher_publish_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_active boolean;
begin
  -- Only a row that ends up published is interesting.
  if coalesce(new.is_active, false) = false then
    return new;
  end if;

  -- Already published and staying published: not a transition, let it through.
  -- This is what keeps a deactivated teacher's live courses editable.
  if tg_op = 'UPDATE' and coalesce(old.is_active, false) = true then
    return new;
  end if;

  if public.is_super_admin() then
    return new;
  end if;

  select p.is_active into owner_active
    from public.profiles p
   where p.id = new.teacher_id;

  if coalesce(owner_active, false) = false then
    raise exception
      'TEACHER_NOT_APPROVED: a subject cannot be published until the teacher account is approved'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_teacher_publish_gate() from public, anon;

drop trigger if exists trg_teacher_publish_gate on public.subjects;
create trigger trg_teacher_publish_gate
  before insert or update of is_active on public.subjects
  for each row execute function public.enforce_teacher_publish_gate();
```

Create `supabase/migrations/113_ROLLBACK.sql`:

```sql
-- Reverses 113_teacher_publish_gate.sql.
drop trigger if exists trg_teacher_publish_gate on public.subjects;
drop function if exists public.enforce_teacher_publish_gate();
```

- [ ] **Step 5: Apply it**

Run: `node .smoke/run-sql.mjs -f supabase/migrations/113_teacher_publish_gate.sql`

Expected: no error output. A silent success is not proof — Step 6 is.

- [ ] **Step 6: Verify against the catalog, not against the run**

```bash
node .smoke/run-sql.mjs -q "select tgname, tgenabled from pg_trigger where tgrelid = 'public.subjects'::regclass and tgname = 'trg_teacher_publish_gate'"
node .smoke/run-sql.mjs -q "select pg_get_functiondef('public.enforce_teacher_publish_gate'::regproc)"
```

Expected: one trigger row with `tgenabled = 'O'`, and a function body containing `TEACHER_NOT_APPROVED` and `set search_path to public`.

- [ ] **Step 7: Run the test again**

Run: `node .smoke/30-publish-gate.mjs`

Expected: `5 passed, 0 failed`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/113_teacher_publish_gate.sql supabase/migrations/113_ROLLBACK.sql .smoke/30-publish-gate.mjs
git commit -m "$(cat <<'EOF'
feat(db): make is_active a publish gate for teachers

A teacher who has only applied could publish a paid course: no route guard
read profiles.is_active and TeacherSubjects created every subject active.
Migration 113 adds a BEFORE INSERT OR UPDATE trigger on subjects that refuses
to publish while the owning teacher is pending.

A trigger rather than an RLS policy on purpose — Postgres ORs permissive
policies, so a later policy could silently reopen a policy-based gate.

Deactivating a teacher does not unpublish existing subjects; the trigger fires
on write, so paying students keep access.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Web client honours the gate

**Files:**
- Modify: `src/pages/teacher/TeacherSubjects.tsx:259` (auth destructure), `:480-488` (insert payload), and the subject card render

**Interfaces:**
- Consumes: the `TEACHER_NOT_APPROVED:` message prefix from Task 1.
- Produces: nothing other tasks consume.

- [ ] **Step 1: Read `profile` from the auth context**

At `src/pages/teacher/TeacherSubjects.tsx:259`, change:

```tsx
const { user } = useAuth();
```

to:

```tsx
const { user, profile } = useAuth();
// A teacher pending approval builds freely but cannot publish. The database
// enforces this too (migration 113); this only keeps the UI honest.
const canPublish = profile?.is_active !== false;
```

- [ ] **Step 2: Create new subjects as drafts while pending**

In the create branch at `src/pages/teacher/TeacherSubjects.tsx:480-488`, change `is_active: true` to:

```tsx
                    is_active: canPublish,
```

- [ ] **Step 3: Translate the trigger's error instead of leaking Postgres**

In the same function's `catch (err: any)` block, before the existing `toast.error`, add:

```tsx
            if (String(err?.message || '').includes('TEACHER_NOT_APPROVED')) {
                toast.error(
                    t('النشر يُفتح بعد الموافقة', 'Publishing unlocks after approval'),
                    {
                        description: t(
                            'يمكنك إنشاء المادة كمسودة ومتابعة العمل عليها الآن.',
                            'You can create the subject as a draft and keep working on it now.',
                        ),
                    },
                );
                return;
            }
```

- [ ] **Step 4: Show the state on the card**

On each subject card in the list, next to the title, render the state and a publish control that explains itself when locked. Add:

```tsx
{subject.is_active ? (
    <ArcadeChip filled>{t('منشورة', 'Published')}</ArcadeChip>
) : (
    <ArcadeChip>{t('مسودة', 'Draft')}</ArcadeChip>
)}
```

and, below the card's actions:

```tsx
{!subject.is_active && !canPublish && (
    <p className="mt-2 text-[12px] font-medium" style={{ color: A.inkSoft }}>
        {t('النشر يُفتح بعد الموافقة', 'Publishing unlocks after approval')}
    </p>
)}
```

Import what this needs at the top of the file:

```tsx
import { A } from '@/components/arcade/theme';
import { ArcadeChip } from '@/components/arcade/primitives';
```

- [ ] **Step 5: Typecheck and build**

```bash
npx tsc -b
npx eslint src/pages/teacher/TeacherSubjects.tsx
npm run build
```

Expected: `tsc -b` silent, `eslint` on this file no worse than before your change (record the count first with `git stash` if unsure), `npm run build` succeeds.

- [ ] **Step 6: Verify in the browser as a pending teacher**

Flip the test teacher pending, reload `/teacher/subjects`, create a subject.

```bash
node .smoke/run-sql.mjs -q "update public.profiles set is_active = false where email = '<teacher email>'"
# ... exercise the UI ...
node .smoke/run-sql.mjs -q "update public.profiles set is_active = true where email = '<teacher email>'"
```

Expected: the subject is created, shows a «مسودة» chip and the "Publishing unlocks after approval" line, and no raw Postgres message ever appears. **Restore the flag before moving on.**

- [ ] **Step 7: Commit**

```bash
git add src/pages/teacher/TeacherSubjects.tsx
git commit -m "$(cat <<'EOF'
feat(teacher): create subjects as drafts while approval is pending

Creates with is_active: canPublish instead of an unconditional true, shows a
draft/published chip, and translates migration 113's TEACHER_NOT_APPROVED
error into the reason rather than leaking Postgres text.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Android client honours the gate

**Files:**
- Modify: `ayman_academy_flutter/lib/features/teacher/subjects/screens/course_editor_screen.dart:85-96`

**Interfaces:**
- Consumes: the `TEACHER_NOT_APPROVED:` prefix from Task 1; `authProvider` for the profile.

- [ ] **Step 1: Force draft when pending**

In `_save()`, the payload at `course_editor_screen.dart:85-96` sets `'is_active': _isActive`. Change it to respect approval:

```dart
      final pending = ref.read(authProvider).profile?.isActive == false;
      final payload = {
        // ... unchanged keys ...
        'is_active': pending ? false : _isActive,
        // ... unchanged keys ...
      };
```

- [ ] **Step 2: Disable the publish switch and say why**

Where `_isActive` is bound to its switch, pass `onChanged: pending ? null : (v) => setState(() => _isActive = v)` and render beneath it:

```dart
if (pending)
  Text(
    t('النشر يُفتح بعد الموافقة', 'Publishing unlocks after approval'),
    style: TextStyle(fontSize: 12, color: context.arc.inkSoft),
  ),
```

Hoist `final pending = ref.watch(authProvider).profile?.isActive == false;` into `build` so both the switch and this line read the same value.

- [ ] **Step 3: Translate the trigger error**

In `_save()`'s catch, before the generic handler:

```dart
      if (e.toString().contains('TEACHER_NOT_APPROVED')) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(t(
              'النشر يُفتح بعد الموافقة. حُفظت كمسودة.',
              'Publishing unlocks after approval. Saved as a draft.',
            )),
          ));
        }
        return;
      }
```

- [ ] **Step 4: Analyze and test**

```bash
cd ayman_academy_flutter
flutter analyze lib/features/teacher/subjects/screens/course_editor_screen.dart
flutter test
```

Expected: analyze clean for this file; the existing suite still green.

- [ ] **Step 5: Commit**

```bash
git add ayman_academy_flutter/lib/features/teacher/subjects/screens/course_editor_screen.dart
git commit -m "$(cat <<'EOF'
feat(flutter): respect the teacher publish gate in the course editor

Mirrors the web change: a pending teacher saves drafts, the publish switch is
disabled with its reason shown, and migration 113's error becomes a sentence
instead of a Postgres string.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase B — Student flow

### Task 4: Web signup returns the session and continues

**Files:**
- Modify: `src/contexts/AuthContext.tsx:335-354`, and the `AuthContextType` interface in the same file
- Modify: `src/pages/auth/Register.tsx`

**Interfaces:**
- Produces: `signUp(email, password, fullName) => Promise<{ error: AuthError | null; session: Session | null }>`. Task 5 mirrors this shape in Dart.

- [ ] **Step 1: Return the session from `signUp`**

`src/contexts/AuthContext.tsx:335-354` currently destructures only `{ error }` and throws `data` away. Replace the body:

```tsx
    const signUp = async (email: string, password: string, fullName: string) => {
        devLog('Sign up attempt', email);

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    // role: 'student', // Let DB default handle this to avoid trigger casting errors
                },
            },
        });

        if (signUpError) {
            devLog('Sign up error', signUpError.message);
        }

        // The session is the whole point: with email confirmation off Supabase
        // returns one immediately, so the caller can continue straight into
        // onboarding instead of bouncing through /login. With confirmation on
        // it is null, and the caller shows the "check your inbox" screen. That
        // makes the Supabase setting a config change, not a code change.
        return { error: signUpError, session: data?.session ?? null };
    };
```

Update the `signUp` entry on the context's TypeScript interface in the same file to match the new return type.

- [ ] **Step 2: Drop confirm-password from Register**

In `src/pages/auth/Register.tsx`: delete the `confirmPassword` state declaration, the entire `ArcadeField id="confirmPassword"` block, and the mismatch branch inside `validateForm`. The remaining validation is the name length and the 6-character password minimum.

- [ ] **Step 3: Branch on the session**

Replace the success handling inside `handleSubmit`:

```tsx
            const { error: signUpError, session } = await signUp(email, password, fullName);

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError(t('هذا البريد الإلكتروني مسجل بالفعل', 'This email is already registered'));
                } else if (signUpError.message.includes('Password')) {
                    setError(t('كلمة المرور ضعيفة جداً', 'Password is too weak'));
                } else {
                    setError(signUpError.message);
                }
                return;
            }

            if (session) {
                // Confirmation is off, so the account is already usable. Go
                // straight to the one question onboarding actually needs.
                toast.success(t('تم إنشاء الحساب', 'Account created'));
                navigate('/student/onboarding', { replace: true });
                return;
            }

            // Confirmation is on: the success card is now telling the truth.
            setSuccess(true);
```

Add the import and the hook:

```tsx
import { Link, useNavigate } from 'react-router-dom';
```

```tsx
    const navigate = useNavigate();
```

Keep the `success` state and its card — it is the correct screen for the confirmation-on branch and must not be deleted.

- [ ] **Step 4: Typecheck and build**

```bash
npx tsc -b
npx eslint src/contexts/AuthContext.tsx src/pages/auth/Register.tsx
npm run build
```

Expected: `tsc -b` silent. If it complains about the context interface, Step 1's interface update was missed.

- [ ] **Step 5: Verify both branches in the browser**

With confirmation off (today's configuration), register a throwaway student: expect no success card, no login screen, and a landing on `/student/onboarding` already signed in.

To exercise the other branch without touching the Supabase dashboard, temporarily `return { error: null, session: null }` from `signUp`, reload, and confirm the success card still renders and its "Go to sign in" link works. Revert that edit.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/AuthContext.tsx src/pages/auth/Register.tsx
git commit -m "$(cat <<'EOF'
fix(auth): stop promising a confirmation email that is never sent

Register told every new student to confirm an email, but Confirm email and the
Send Email hook are both disabled, so nothing arrived and the student was
stranded. signUp also discarded the session Supabase already returns, which is
the only reason the flow detoured through /login.

signUp now returns { error, session } and Register branches on it: session
present continues into onboarding, session null shows the inbox card — correct
if confirmation is ever switched on. Confirm-password is gone; the existing eye
toggle covers it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Android signup returns the session and continues

**Files:**
- Modify: `ayman_academy_flutter/test/support/harness.dart:104-114`
- Modify: `ayman_academy_flutter/lib/features/auth/providers/auth_provider.dart:113-119`
- Modify: `ayman_academy_flutter/lib/features/auth/screens/register_screen.dart`
- Test: `ayman_academy_flutter/test/screens/auth_screens_test.dart`

**Interfaces:**
- Consumes: `AuthRepository.signUp` already returns the full `sb.AuthResponse` (`auth_repository.dart:13-23`) — no repository change needed.
- Produces: `AuthNotifier.signUp(...) => Future<sb.Session?>`.

- [ ] **Step 1: Let the fake drive both branches**

In `ayman_academy_flutter/test/support/harness.dart`, add a field to `FakeAuthRepository` beside `signUpError`:

```dart
  /// Set to a session to simulate confirmation-off (Supabase returns a usable
  /// session immediately); leave null to simulate confirmation-on.
  sb.Session? signUpSession;
```

and return it from the fake's `signUp` (replacing the bare `return sb.AuthResponse();` at `:113`):

```dart
    return sb.AuthResponse(session: signUpSession);
```

- [ ] **Step 2: Write the failing tests**

Append to `ayman_academy_flutter/test/screens/auth_screens_test.dart`:

```dart
  testWidgets('register has no confirm-password field', (tester) async {
    await pumpRegister(tester);

    expect(find.text('الاسم الكامل'), findsOneWidget);
    expect(find.text('البريد الإلكتروني'), findsOneWidget);
    expect(find.text('كلمة المرور'), findsOneWidget);
    expect(find.text('تأكيد كلمة المرور'), findsNothing);
  });

  testWidgets('a session from signup skips the inbox screen', (tester) async {
    repo.signUpSession = sb.Session(
      accessToken: 'test-token',
      tokenType: 'bearer',
      user: sb.User(
        id: 'test-user',
        appMetadata: const {},
        userMetadata: const {},
        aud: 'authenticated',
        createdAt: DateTime.now().toIso8601String(),
      ),
    );

    await pumpRegister(tester);
    await submitRegisterForm(tester);

    // The inbox copy belongs to the confirmation-on branch only.
    expect(find.text('تحقّق من بريدك'), findsNothing);
  });

  testWidgets('no session shows the inbox screen', (tester) async {
    repo.signUpSession = null;

    await pumpRegister(tester);
    await submitRegisterForm(tester);

    expect(find.text('تحقّق من بريدك'), findsOneWidget);
  });
```

Add the two helpers near the top of the file's `main()`, alongside the existing pump helpers:

```dart
  Future<void> pumpRegister(WidgetTester tester, {bool dark = false}) async {
    await pumpScreen(
      tester,
      const RegisterScreen(),
      dark: dark,
      overrides: [
        ...onlineOverrides,
        authRepositoryProvider.overrideWithValue(repo),
      ],
    );
    await tester.pumpAndSettle();
  }

  Future<void> submitRegisterForm(WidgetTester tester) async {
    await tester.enterText(find.byKey(const Key('register_name')), 'أحمد الحسن');
    await tester.enterText(find.byKey(const Key('register_email')), 'a@example.com');
    await tester.enterText(find.byKey(const Key('register_password')), 'password123');
    await tester.tap(find.byKey(const Key('register_submit')));
    await tester.pumpAndSettle();
  }
```

Every key used here already exists in `register_screen.dart` — `register_name`, `register_email`, `register_password` and `register_submit` are all set on the real widgets. Find by key rather than by `byType(TextFormField).at(n)`: removing the confirm field shifts every positional index, and a positional finder would keep passing while testing the wrong box.

- [ ] **Step 3: Run the tests and watch them fail**

```bash
cd ayman_academy_flutter
flutter test test/screens/auth_screens_test.dart
```

Expected: the confirm-password test fails (`findsNothing` but one was found, since `_confirmController` still renders a field), and the session test fails because the screen always shows success copy.

- [ ] **Step 4: Return the session from the notifier**

`ayman_academy_flutter/lib/features/auth/providers/auth_provider.dart:113-119`:

```dart
  /// Returns the session Supabase handed back, or null when email
  /// confirmation is on and the account is not usable yet. The caller decides
  /// where to go next from that.
  Future<sb.Session?> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final response =
        await _repo.signUp(email: email, password: password, fullName: fullName);
    return response.session;
  }
```

- [ ] **Step 5: Drop confirm-password and branch in the screen**

In `ayman_academy_flutter/lib/features/auth/screens/register_screen.dart`:

- Delete `_confirmController` (`:22`), its `dispose()` line (`:34`), the `_obscureConfirm` state field, and the whole `ArcadeField` whose `TextFormField` carries `Key('register_confirm')` (the last field in `_buildForm`, including its `register_toggle_confirm` suffix button). Then change the preceding password field's `textInputAction` from `TextInputAction.next` to `TextInputAction.done` and give it `onFieldSubmitted: (_) => _loading ? null : _submit()`, since it is now the last field in the form.
- Replace `_submit()`'s body (`:38-54`):

```dart
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      final session = await ref.read(authProvider.notifier).signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        fullName: _nameController.text.trim(),
      );
      // A session means the account is usable now: the router's
      // `needsOnboarding` redirect takes the student to the stage screen on
      // its own, so there is nothing to navigate to here. No session means
      // confirmation is on and the inbox screen is the truthful next step.
      if (session == null) setState(() => _success = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
```

- Change the `_success` header copy so it matches the branch that now reaches it:

```dart
                  title: _success
                      ? t('تحقّق من بريدك', 'Check your email')
                      : t('إنشاء حساب', 'Create account'),
                  subtitle: _success
                      ? t('أكّد بريدك ثم سجّل الدخول', 'Confirm your email, then sign in')
                      : t('ابدأ رحلة التعلم مع ورق أكاديمي', 'Start your learning journey with Waraq'),
```

- Add the teacher route, mirroring the web's wash box. Put it at the top of `_buildForm`'s `Column`, just after the `_error` block:

```dart
          ArcadeCard(
            fill: arc.wash,
            flat: true,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    t('هل أنت معلّم؟', 'Are you a teacher?'),
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: arc.ink),
                  ),
                ),
                TextButton(
                  key: const Key('register_go_apply'),
                  onPressed: () => context.go(Routes.teacherApply),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(t('قدّم من هنا', 'Apply here')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
```

`arc` is already in scope — `_buildForm` opens with `final arc = context.arc;`. `context.go` matches what the two existing links in this file use (`register_go_login`, `register_success_login`); do not switch to `context.push`.

This needs `Routes.teacherApply`, which Task 12 Step 1 adds. **Do Task 12 Step 1 before this step** — it is a one-line constant — and leave the screen itself to Task 12.

- [ ] **Step 6: Run the tests again**

```bash
flutter test test/screens/auth_screens_test.dart
```

Expected: all three new tests pass, and the pre-existing tests in the file still pass.

- [ ] **Step 7: Full suite and analyze**

```bash
flutter analyze lib/features/auth
flutter test
```

Expected: analyze clean for `lib/features/auth`; whole suite green.

- [ ] **Step 8: Commit**

```bash
git add ayman_academy_flutter/lib/features/auth ayman_academy_flutter/test
git commit -m "$(cat <<'EOF'
fix(flutter): continue into onboarding when signup returns a session

Mirrors the web fix. AuthNotifier.signUp returns the session instead of void,
so the screen only shows the inbox message when confirmation is actually on.
Drops confirm-password and adds the teacher application link.

FakeAuthRepository gains signUpSession so both branches are testable.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Rebuild the web stage screen

**Files:**
- Create: `src/lib/studentStages.ts`
- Modify: `src/pages/student/StudentOnboarding.tsx` (full rewrite)

**Interfaces:**
- Produces:
  ```ts
  export type StageKey = 'kindergarten' | 'primary' | 'middle' | 'high';
  export const STAGES: { key: StageKey; ar: string; en: string; range: string; glyph: string; color: string }[];
  export const GRADE_OPTIONS: Record<StageKey, { value: number; ar: string; en: string }[]>;
  export const GENDERS: { value: 'male' | 'female' | 'unspecified'; ar: string; en: string }[];
  ```
  Tasks 8 and the admin table consume all three.

- [ ] **Step 1: Extract the shared lists**

Create `src/lib/studentStages.ts`. `GRADE_OPTIONS` is moved verbatim from `StudentOnboarding.tsx:28-50`; the stage colours are the darkened brand variants that clear 3:1, matching `app_colors.dart:157-160`.

```ts
// One list of stages, grades and genders, shared by student onboarding, the
// student profile editor and the admin students table. Three copies drifted
// apart before; keep this the only source.
import type { StudentStage } from '@/types/database';

export type StageKey = StudentStage;

export const STAGES: {
    key: StageKey;
    ar: string;
    en: string;
    /** Grade span, shown as a mono sublabel. Latin — needs dir="ltr". */
    range: string;
    /** The character on the colour square. Arabic-Indic numerals for the
     *  grade the stage starts at, so the squares read as a progression. */
    glyph: string;
    /** Full phrase, for running prose. `مواد ابتدائي` is clumsy Arabic;
     *  `مواد المرحلة الابتدائية` is not. Matches the Flutter labels. */
    arLong: string;
    enLong: string;
    color: string;
}[] = [
    { key: 'kindergarten', ar: 'تمهيدي', en: 'Kindergarten', range: 'KG', glyph: 'ت', arLong: 'رياض الأطفال', enLong: 'Kindergarten', color: '#D1563A' },
    { key: 'primary', ar: 'ابتدائي', en: 'Primary', range: 'Grades 1–6', glyph: '١', arLong: 'المرحلة الابتدائية', enLong: 'Primary', color: '#C0881F' },
    { key: 'middle', ar: 'متوسط', en: 'Middle', range: 'Grades 7–9', glyph: '٧', arLong: 'المرحلة الإعدادية', enLong: 'Middle school', color: '#2E7F9E' },
    { key: 'high', ar: 'ثانوي', en: 'High school', range: 'Grades 10–12', glyph: '١٠', arLong: 'المرحلة الثانوية', enLong: 'High school', color: '#17864F' },
];

export const GRADE_OPTIONS: Record<StageKey, { value: number; ar: string; en: string }[]> = {
    kindergarten: [{ value: 0, ar: 'التمهيدي (KG)', en: 'Kindergarten' }],
    primary: [
        { value: 1, ar: 'الصف الأول', en: '1st Grade' },
        { value: 2, ar: 'الصف الثاني', en: '2nd Grade' },
        { value: 3, ar: 'الصف الثالث', en: '3rd Grade' },
        { value: 4, ar: 'الصف الرابع', en: '4th Grade' },
        { value: 5, ar: 'الصف الخامس', en: '5th Grade' },
        { value: 6, ar: 'الصف السادس', en: '6th Grade' },
    ],
    middle: [
        { value: 7, ar: 'الصف السابع', en: '7th Grade' },
        { value: 8, ar: 'الصف الثامن', en: '8th Grade' },
        { value: 9, ar: 'الصف التاسع', en: '9th Grade' },
    ],
    high: [
        { value: 10, ar: 'الصف العاشر', en: '10th Grade' },
        { value: 11, ar: 'الصف الحادي عشر', en: '11th Grade' },
        { value: 12, ar: 'الصف الثاني عشر', en: '12th Grade' },
    ],
};

export const GENDERS: { value: 'male' | 'female' | 'unspecified'; ar: string; en: string }[] = [
    { value: 'male', ar: 'ذكر', en: 'Male' },
    { value: 'female', ar: 'أنثى', en: 'Female' },
    { value: 'unspecified', ar: 'غير محدد', en: 'Unspecified' },
];
```

- [ ] **Step 2: Check whether `verifiedUpdate` works for a student's own row**

The project rule is to use `adminDb` for mutations, but migration 104 restricted the profile policies and this has not been exercised from a student session. Find out before writing the screen around it:

```bash
node .smoke/run-sql.mjs -q "select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr, pg_get_expr(polwithcheck, polrelid) as check_expr from pg_policy where polrelid = 'public.profiles'::regclass"
```

Expected: a self-update policy permitting `id = auth.uid()`. **If no such policy exists, keep the raw `supabase.from('profiles').update(...)` call and add a comment saying why** — do not weaken a policy to satisfy a convention.

- [ ] **Step 3: Rewrite the screen**

Replace `src/pages/student/StudentOnboarding.tsx` entirely. Gender and grade are gone (Task 8 puts them on the profile), the pre-rebrand `logo.png` and `rounded-2xl` are gone, and `dir="rtl"` is replaced by the language-aware direction.

```tsx
// Student onboarding: one question, because `student_stage` is the only
// onboarding answer the system makes a decision from — the guard at
// RoleRoutes.tsx, `needsOnboarding` on Flutter, and every subject query's
// filter. Gender and grade live on the profile; nothing gates on them.
//
// Styled in the arcade language. This page previously used the pre-rebrand
// logo, rounded corners and a hard-coded dir="rtl" that ignored the language
// setting.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { A } from '@/components/arcade/theme';
import { ArcadeBrand, ArcadeButton, ArcadeCard } from '@/components/arcade/primitives';
import { STAGES, type StageKey } from '@/lib/studentStages';

export default function StudentOnboarding() {
    const { profile, refreshProfile } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();

    const [stage, setStage] = useState<StageKey | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    const onSubmit = async () => {
        if (!stage || !profile?.id) return;
        setSaving(true);
        setError('');
        try {
            const { error: updateError } = await (supabase.from('profiles') as any)
                .update({ student_stage: stage })
                .eq('id', profile.id);
            if (updateError) throw updateError;

            await refreshProfile();
            navigate('/student/marketplace', { replace: true });
        } catch (err: any) {
            // Inline and persistent, not a toast: the student cannot leave this
            // screen until it succeeds, so the message has to stay on screen.
            setError(t('فشل الحفظ — حاول مرة أخرى', 'Could not save — please try again'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            dir={direction}
            className="flex min-h-[100dvh] items-center justify-center p-5 font-arabic"
            style={{ background: A.bg }}
        >
            <div className="w-full max-w-[460px]">
                <ArcadeBrand size={36} className="mb-7" />

                <h1 className="text-[28px] font-black leading-tight tracking-tight" style={{ color: A.ink }}>
                    {profile?.full_name
                        ? t(`مرحبًا ${profile.full_name.split(' ')[0]}`, `Welcome, ${profile.full_name.split(' ')[0]}`)
                        : t('مرحبًا بك', 'Welcome')}
                </h1>
                <p className="mt-3 text-[15px] font-medium" style={{ color: A.inkSoft }}>
                    {t('اختر مرحلتك الدراسية لنُرتّب لك المواد.', 'Pick your stage and we will sort the subjects for you.')}
                </p>

                <div className="mt-7 flex flex-col gap-2.5">
                    {STAGES.map((s) => {
                        const selected = stage === s.key;
                        return (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => setStage(s.key)}
                                aria-pressed={selected}
                                className="arc-focus flex items-center gap-3 border-2 p-3 text-start"
                                style={{
                                    background: selected ? A.wash : A.surface,
                                    borderColor: A.line,
                                    boxShadow: selected ? `5px 5px 0 var(--arc-shadow)` : 'none',
                                }}
                            >
                                <span
                                    className="flex h-11 w-11 shrink-0 items-center justify-center border-2 text-[15px] font-black"
                                    style={{ background: s.color, borderColor: A.line, color: '#FFFFFF' }}
                                    aria-hidden
                                >
                                    {s.glyph}
                                </span>
                                <span className="flex-1">
                                    <span className="block text-[15px] font-black" style={{ color: A.ink }}>
                                        {t(s.ar, s.en)}
                                    </span>
                                    <span className="mt-0.5 block font-mono text-[11px]" style={{ color: A.inkSoft }}>
                                        {s.range}
                                    </span>
                                </span>
                                {selected && (
                                    <span
                                        className="flex h-6 w-6 shrink-0 items-center justify-center border-2"
                                        style={{ background: A.accent, borderColor: A.line, color: A.onAccent }}
                                    >
                                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div
                        className="mt-5 flex items-start gap-2.5 border-2 p-3"
                        style={{
                            borderColor: 'hsl(var(--destructive))',
                            background: 'hsl(var(--destructive) / 0.08)',
                        }}
                        role="alert"
                    >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'hsl(var(--destructive))' }} />
                        <p className="text-[13px] font-bold" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
                    </div>
                )}

                <ArcadeButton
                    type="button"
                    variant="solid"
                    className="mt-6 w-full"
                    onClick={onSubmit}
                    disabled={!stage}
                    loading={saving}
                >
                    {!saving && t('متابعة', 'Continue')}
                    {saving && t('جارٍ الحفظ', 'Saving')}
                    {!saving && <ArrowIcon className="h-4 w-4" />}
                </ArcadeButton>

                <p className="mt-4 text-center text-[13px] font-medium" style={{ color: A.inkSoft }}>
                    {t('يمكنك تغييرها لاحقًا من ملفك.', 'You can change this later from your profile.')}
                </p>
            </div>
        </div>
    );
}
```

Note the `boxShadow` here is on a plain `<button>`, **not** on a `.arc-press` element, so the inline-shadow prohibition does not apply. Do not add `arc-press` to these cards.

- [ ] **Step 4: Typecheck, lint, build**

```bash
npx tsc -b
npx eslint src/lib/studentStages.ts src/pages/student/StudentOnboarding.tsx
npm run build
```

Expected: `tsc -b` silent; `studentStages.ts` lint-clean (it is new — keep it so); build succeeds.

- [ ] **Step 5: Prove the stage write and the stage-filtered read from a real student session**

The spec calls for this as `.smoke/30-onboarding.mjs`; it lives in `.smoke/31-student-onboarding.mjs` so the numbering matches Task 1's gate test. It uses the **existing** test student documented in `.smoke/.env` (`STUDENT_EMAIL` / `STUDENT_PASSWORD` / `STUDENT_ID`) rather than signing up throwaway accounts — that student is valuable precisely because it owns nothing, and a smoke script that registers new users would litter the auth table on every run.

Create `.smoke/31-student-onboarding.mjs`:

```js
/**
 * The student onboarding data layer: can a student set their own stage, and
 * does the marketplace read come back filtered by it?
 *
 * Uses the existing test student from .smoke/.env — do not sign up throwaway
 * accounts here, they accumulate in auth.users with no way to reap them.
 * The student's original stage is restored in the finally block.
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { data: auth, error: authError } = await sb.auth.signInWithPassword({
  email: process.env.STUDENT_EMAIL,
  password: process.env.STUDENT_PASSWORD,
});
if (authError) { console.error('sign-in failed:', authError.message); process.exit(1); }
const UID = auth.user.id;

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? '\n       ' + detail : '')); }
};

const before = await sb.from('profiles').select('student_stage').eq('id', UID).single();
const originalStage = before.data?.student_stage ?? null;

try {
  const write = await sb.from('profiles').update({ student_stage: 'middle' }).eq('id', UID).select('student_stage');
  check('a student can set their own stage', !write.error && write.data?.[0]?.student_stage === 'middle',
    write.error ? `[${write.error.code}] ${write.error.message}` : `got ${JSON.stringify(write.data)}`);

  // This is the call the onboarding screen makes, and the one that decides
  // whether `verifiedUpdate` is usable in Task 6 Step 2.
  const readBack = await sb.from('profiles').select('student_stage, gender, grade').eq('id', UID).single();
  check('the stage reads back from the student session', readBack.data?.student_stage === 'middle',
    readBack.error ? `[${readBack.error.code}] ${readBack.error.message}` : '');

  const other = await sb.from('profiles').update({ student_stage: 'high' }).neq('id', UID).select('id');
  check('a student cannot set someone else\'s stage',
    !!other.error || (other.data?.length ?? 0) === 0,
    'UPDATE AFFECTED OTHER ROWS — the profiles policy is too wide');

  const discover = await sb.rpc('get_discover_subjects', { p_student_id: UID });
  check('the marketplace RPC answers for this student', !discover.error,
    discover.error ? `[${discover.error.code}] ${discover.error.message}` : `${discover.data?.length ?? 0} rows`);
} finally {
  await sb.from('profiles').update({ student_stage: originalStage }).eq('id', UID);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
```

Run: `node .smoke/31-student-onboarding.mjs`

Expected: `4 passed, 0 failed`. **If "a student can set their own stage" fails, Task 6 Step 2's policy check was wrong** — stop and resolve that before shipping the screen, because onboarding would be a dead end for every new student.

- [ ] **Step 6: Verify in the browser, both languages, both themes**

Register a throwaway student. Confirm: four stage cards with their colour squares and grade ranges, Continue disabled until one is tapped, the selected card lifts with a hard shadow, the heading greets by first name, English flips the whole page to LTR, and dark mode is legible.

- [ ] **Step 7: Commit**

```bash
git add src/lib/studentStages.ts src/pages/student/StudentOnboarding.tsx .smoke/31-student-onboarding.mjs
git commit -m "$(cat <<'EOF'
feat(student): one-question onboarding in the arcade language

student_stage is the only onboarding answer anything decides from, so gender
and grade move to the profile (verified: their only readers are an optional
certificate token and the admin table).

The page also never received the arcade rebrand — it still used the
pre-rebrand logo, rounded corners, and a hard-coded dir="rtl" that ignored the
language setting. Stage and grade lists are extracted to src/lib/studentStages.ts
so onboarding, the profile editor and the admin table share one source.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Android stage sublabels, and one shared stage list

**Files:**
- Create: `ayman_academy_flutter/lib/shared/student_stages.dart`
- Modify: `ayman_academy_flutter/lib/features/onboarding/screens/student_onboarding_screen.dart`
- Test: `ayman_academy_flutter/test/screens/onboarding_screen_test.dart`

**Interfaces:**
- Produces:
  ```dart
  class StageOption { final String key, ar, en, range; final IconData icon; final Color color; }
  const kStages = <StageOption>[ /* kindergarten, primary, middle, high */ ];
  ```
  **Tasks 8, 9 and 12 all consume `kStages`**, which is why the list moves out of the screen here rather than being copied three times.

- [ ] **Step 1: Write the failing test**

Append to `ayman_academy_flutter/test/screens/onboarding_screen_test.dart`:

```dart
  testWidgets('each stage shows its grade range', (tester) async {
    await pumpOnboarding(tester);

    expect(find.text('KG'), findsOneWidget);
    expect(find.text('Grades 1–6'), findsOneWidget);
    expect(find.text('Grades 7–9'), findsOneWidget);
    expect(find.text('Grades 10–12'), findsOneWidget);
  });
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd ayman_academy_flutter
flutter test test/screens/onboarding_screen_test.dart
```

Expected: fails — no such text exists yet.

- [ ] **Step 3: Lift the stage list into a shared file, with the range on it**

Tasks 9 and 12 both need this list too, so it moves out of the screen now rather than being copied three times. Create `ayman_academy_flutter/lib/shared/student_stages.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';

/// The educational stages, shared by onboarding, the profile editor, the
/// marketplace strip and the teacher application. Mirrors STAGES in
/// src/lib/studentStages.ts — change both together.
///
/// The colours are the brand's stage family (coral / sun / sky / green) in
/// their darkened variants, each of which clears 3:1 as an icon colour.
class StageOption {
  final String key;
  final String ar;
  final String en;

  /// Grade span, shown as a sublabel. Latin — needs TextDirection.ltr.
  final String range;

  final IconData icon;
  final Color color;

  const StageOption(this.key, this.ar, this.en, this.range, this.icon, this.color);
}

const kStages = <StageOption>[
  StageOption('kindergarten', 'رياض الأطفال', 'Kindergarten', 'KG',
      Icons.child_care_rounded, AppColors.stageKindergarten),
  StageOption('primary', 'المرحلة الابتدائية', 'Primary', 'Grades 1–6',
      Icons.auto_stories_rounded, AppColors.stagePrimary),
  StageOption('middle', 'المرحلة الإعدادية', 'Middle School', 'Grades 7–9',
      Icons.school_rounded, AppColors.stageMiddle),
  StageOption('high', 'المرحلة الثانوية', 'High School', 'Grades 10–12',
      Icons.workspace_premium_rounded, AppColors.stageSecondary),
];
```

Then in `student_onboarding_screen.dart`, delete the private `_StageOption` class and the `_stages` list, import the new file, and read `kStages` instead. `_StageTile`'s parameter type changes from `_StageOption` to `StageOption`; **every field name is identical, so its body needs no other change.**

Next, in `_StageTile`, replace the bare `Text(label)` with a two-line column. The range is a Latin string inside an RTL screen, so it needs its own direction or the dash migrates:

```dart
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                      color: arc.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    stage.range,
                    textDirection: TextDirection.ltr,
                    style: TextStyle(
                      fontSize: 11,
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: arc.inkSoft,
                    ),
                  ),
                ],
              ),
            ),
```

`FontFeature` needs `import 'dart:ui' show FontFeature;` at the top. `_StageTile` already receives the whole `stage` object, so reading `stage.range` needs no constructor change.

- [ ] **Step 4: Run the tests again**

```bash
flutter test test/screens/onboarding_screen_test.dart
```

Expected: the new test passes, and **the four existing stage-name tests still pass** — that is the proof the lift into `kStages` was faithful and did not change a single label.

- [ ] **Step 5: Commit**

```bash
git add ayman_academy_flutter/lib/shared/student_stages.dart ayman_academy_flutter/lib/features/onboarding ayman_academy_flutter/test/screens/onboarding_screen_test.dart
git commit -m "$(cat <<'EOF'
feat(flutter): share one stage list and show each stage's grade range

Parity with the web stage screen. The range is Latin text on an RTL screen, so
it carries its own TextDirection.ltr.

The stage list moves out of the onboarding screen into lib/shared/student_stages.dart
because the profile editor, the marketplace strip and the teacher application
all need it. The existing stage-name tests passing unchanged is the proof the
lift kept every label.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Stage, gender and grade on the profile

**Files:**
- Modify: `src/pages/student/StudentProfile.tsx`
- Modify: `src/pages/admin/StudentsManagement.tsx`
- Modify: `ayman_academy_flutter/lib/features/student/profile/screens/student_profile_screen.dart`

**Interfaces:**
- Consumes: `STAGES`, `GRADE_OPTIONS`, `GENDERS` from `src/lib/studentStages.ts` (Task 6).

- [ ] **Step 1: Add the three fields to the web profile**

`src/pages/student/StudentProfile.tsx` currently edits `full_name` alone (`:26`). Add state beside `fullName`:

```tsx
    const [stage, setStage] = useState<StageKey | null>((profile?.student_stage as StageKey) ?? null);
    const [gender, setGender] = useState(profile?.gender ?? 'unspecified');
    const [grade, setGrade] = useState<number | null>(profile?.grade ?? null);
```

Change the write in `handleSave` to carry all four, and surface a failure — the current call ignores its error entirely:

```tsx
        const { error } = await (supabase.from('profiles') as any)
            .update({
                full_name: fullName,
                student_stage: stage,
                gender,
                // Clearing the stage must clear the grade: a grade without a
                // stage is meaningless and would survive a stage change.
                grade: stage ? grade : null,
            })
            .eq('id', profile.id);

        if (error) {
            setIsSaving(false);
            toast.error(t('فشل الحفظ', 'Could not save'), { description: error.message });
            return;
        }
```

Imports to add:

```tsx
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STAGES, GRADE_OPTIONS, GENDERS, type StageKey } from '@/lib/studentStages';
```

Render the three controls below the existing full-name field. This page uses shadcn components rather than arcade primitives — it sits inside `StudentLayout`, which is not an arcade surface, so follow the page's existing idiom and do not mix the two:

```tsx
            <div className="space-y-2">
                <Label>{t('المرحلة الدراسية', 'School stage')}</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {STAGES.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            aria-pressed={stage === s.key}
                            onClick={() => {
                                setStage(s.key);
                                // A grade from the previous stage is invalid under
                                // the new one, so it goes with it.
                                setGrade(null);
                            }}
                            className={`rounded-md border-2 p-2.5 text-sm transition-colors ${
                                stage === s.key
                                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                                    : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                        >
                            {t(s.ar, s.en)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t('الجنس', 'Gender')}</Label>
                <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map((g) => (
                        <button
                            key={g.value}
                            type="button"
                            aria-pressed={gender === g.value}
                            onClick={() => setGender(g.value)}
                            className={`rounded-md border-2 p-2.5 text-sm transition-colors ${
                                gender === g.value
                                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                                    : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                        >
                            {t(g.ar, g.en)}
                        </button>
                    ))}
                </div>
            </div>

            {stage && (
                <div className="space-y-2">
                    <Label>{t('الصف الدراسي (اختياري)', 'Grade (optional)')}</Label>
                    <Select
                        value={grade?.toString() ?? ''}
                        onValueChange={(v) => setGrade(v ? parseInt(v, 10) : null)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('اختر الصف...', 'Select grade...')} />
                        </SelectTrigger>
                        <SelectContent>
                            {GRADE_OPTIONS[stage].map((g) => (
                                <SelectItem key={g.value} value={g.value.toString()}>
                                    {t(g.ar, g.en)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
```

- [ ] **Step 2: Point the admin table at the shared lists**

`src/pages/admin/StudentsManagement.tsx` has its own `stageLabel` / `gradeLabel` / `GENDER_LABELS`. Replace their bodies with lookups into `STAGES`, `GRADE_OPTIONS` and `GENDERS` so a label changes in one place. Keep the function names and signatures — the call sites at `:264`, `:266`, `:380`, `:381`, `:385-386` must not change.

- [ ] **Step 3: Mirror it on Android**

`ayman_academy_flutter/lib/shared/student_stages.dart` already exists from Task 7. Extend it with the grade and gender lists the profile editor needs — append to the same file so there stays exactly one source:

```dart
/// Grades per stage and the gender options. Mirrors GRADE_OPTIONS and GENDERS
/// in src/lib/studentStages.ts — change both together.
const kGradeOptions = <String, List<(int, String, String)>>{
  'kindergarten': [(0, 'التمهيدي', 'Kindergarten')],
  'primary': [
    (1, 'الصف الأول', '1st Grade'), (2, 'الصف الثاني', '2nd Grade'),
    (3, 'الصف الثالث', '3rd Grade'), (4, 'الصف الرابع', '4th Grade'),
    (5, 'الصف الخامس', '5th Grade'), (6, 'الصف السادس', '6th Grade'),
  ],
  'middle': [
    (7, 'الصف السابع', '7th Grade'), (8, 'الصف الثامن', '8th Grade'),
    (9, 'الصف التاسع', '9th Grade'),
  ],
  'high': [
    (10, 'الصف العاشر', '10th Grade'), (11, 'الصف الحادي عشر', '11th Grade'),
    (12, 'الصف الثاني عشر', '12th Grade'),
  ],
};

const kGenders = <(String, String, String)>[
  ('male', 'ذكر', 'Male'),
  ('female', 'أنثى', 'Female'),
  ('unspecified', 'غير محدد', 'Unspecified'),
];
```

Then add the three controls to `student_profile_screen.dart` (554 lines). Read it first and follow its existing field-and-save idiom rather than importing a new one. The three profile columns are `student_stage`, `gender` and `grade`; the `Profile` model exposes them as `studentStage`, `gender` and `grade`. Build the stage picker from `kStages`, the gender picker from `kGenders`, and the grade dropdown from `kGradeOptions[selectedStage]`, shown only when a stage is set. **Clear `grade` to null whenever the stage changes** — a grade from the previous stage is invalid under the new one. Put all three into the screen's existing update payload rather than adding a second write.

- [ ] **Step 4: Typecheck, build, analyze, test**

```bash
npx tsc -b
npx eslint src/pages/student/StudentProfile.tsx src/pages/admin/StudentsManagement.tsx
npm run build
cd ayman_academy_flutter && flutter analyze lib/features/student/profile && flutter test
```

Expected: all green; the Flutter suite unchanged.

- [ ] **Step 5: Verify round-trip on both clients**

Set a stage, gender and grade on the profile, save, reload the page, and confirm they persist. Then open `/admin/students` and confirm the same student's row shows the same three values — that is the check that proves the shared list is actually shared.

- [ ] **Step 6: Commit**

```bash
git add src/pages/student/StudentProfile.tsx src/pages/admin/StudentsManagement.tsx ayman_academy_flutter/lib/features/student/profile
git commit -m "$(cat <<'EOF'
feat(student): edit stage, gender and grade from the profile

Where the two questions dropped from onboarding now live. Also fixes the
profile save silently swallowing its error, and points the admin students
table at the same label lists so they cannot drift.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: First-run stage strip

**Files:**
- Modify: `src/pages/student/StudentMarketplace.tsx`
- Modify: `ayman_academy_flutter/lib/features/student/marketplace/screens/` (the marketplace screen)

**Interfaces:**
- Consumes: `STAGES` from `src/lib/studentStages.ts`.
- Produces: localStorage key `waraq-seen-stage-strip` (web) and the same key in Hive's `settings` box (Flutter). Per-device by design — a strip that reappears on a second device is cheaper than a migration.

- [ ] **Step 1: Add the strip to the web marketplace**

At the top of the list, above the filters:

```tsx
const STRIP_KEY = 'waraq-seen-stage-strip';

// Dismissal is per-device local state, not a profile column. Reappearing once
// on a second device costs less than a migration.
const [showStrip, setShowStrip] = useState(() => {
    try { return localStorage.getItem(STRIP_KEY) !== '1'; } catch { return false; }
});

const dismissStrip = () => {
    setShowStrip(false);
    try { localStorage.setItem(STRIP_KEY, '1'); } catch { /* private mode: just hide it */ }
};

const stageLabel = STAGES.find((s) => s.key === profile?.student_stage);
```

```tsx
{showStrip && stageLabel && (
    <div
        className="mb-5 flex items-center gap-3 border-2 p-3"
        style={{ background: A.wash, borderColor: A.line }}
    >
        <ArcadeChip filled>{t('جديد', 'New')}</ArcadeChip>
        <span className="flex-1 text-[14px] font-bold" style={{ color: A.ink }}>
            {t(`مواد ${stageLabel.arLong}`, `${stageLabel.enLong} subjects`)}
        </span>
        <button
            type="button"
            onClick={dismissStrip}
            className="arc-focus"
            style={{ color: A.inkSoft }}
            aria-label={t('إغلاق', 'Dismiss')}
        >
            <X className="h-4 w-4" />
        </button>
    </div>
)}
```

Both `localStorage` accesses are wrapped: a browser with site data blocked throws on read, and an unguarded read would blank the page.

- [ ] **Step 2: Mirror it on Android**

Same strip in `ayman_academy_flutter/lib/features/student/marketplace/screens/marketplace_screen.dart`, persisted to the existing Hive `settings` box — the one `languageProvider` and `themeProvider` already use, so nothing new has to be opened.

Add to the screen's state:

```dart
  static const _stripKey = 'waraq-seen-stage-strip';

  // Per-device, same as the web. A box that is somehow not open must not take
  // the screen down with it, so both accesses are guarded.
  bool _showStrip = () {
    try {
      return Hive.box('settings').get(_stripKey) != true;
    } catch (_) {
      return false;
    }
  }();

  void _dismissStrip() {
    setState(() => _showStrip = false);
    try {
      Hive.box('settings').put(_stripKey, true);
    } catch (_) {/* nothing to persist to: just stay hidden for this run */}
  }
```

and render it above the filter row:

```dart
        if (_showStrip && stage != null)
          ArcadeCard(
            fill: arc.wash,
            flat: true,
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                ArcadeChip(label: t('جديد', 'New'), filled: true),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    t('مواد ${stage.ar}', '${stage.en} subjects'),
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: arc.ink),
                  ),
                ),
                IconButton(
                  key: const Key('marketplace_dismiss_strip'),
                  icon: Icon(Icons.close_rounded, size: 18, color: arc.inkSoft),
                  tooltip: t('إغلاق', 'Dismiss'),
                  onPressed: _dismissStrip,
                ),
              ],
            ),
          ),
```

where `stage` resolves the student's stage against the shared list from Task 8:

```dart
    final stageKey = ref.watch(authProvider).profile?.studentStage;
    final stage = kStages.where((s) => s.key == stageKey).firstOrNull;
```

`firstOrNull` comes from `package:collection`. If that package is not already a dependency, use `kStages.firstWhere((s) => s.key == stageKey, orElse: () => kStages.first)` guarded by a `stageKey != null` check instead of adding a dependency for one call. Imports: `package:hive_flutter/hive_flutter.dart` and `package:ayman_academy_app/shared/student_stages.dart`.

- [ ] **Step 3: Build and test**

```bash
npx tsc -b && npm run build
cd ayman_academy_flutter && flutter analyze lib/features/student/marketplace && flutter test
```

- [ ] **Step 4: Verify dismissal sticks**

Open the marketplace as a fresh student: the strip names the chosen stage. Dismiss it, reload: gone. Clear site data, reload: back. Repeat on Android.

- [ ] **Step 5: Commit**

```bash
git add src/pages/student/StudentMarketplace.tsx ayman_academy_flutter/lib/features/student/marketplace
git commit -m "$(cat <<'EOF'
feat(student): one-time strip naming the stage on the marketplace

Confirms the onboarding choice landed, in place of a product tour. Dismissal
is per-device local state; both storage reads are guarded so a browser with
site data blocked cannot blank the page.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase C — Teacher flow

### Task 10: Trim the web application form

**Files:**
- Modify: `src/pages/TeacherApplication.tsx`

**Interfaces:**
- Produces: a `teacher_applications` row with `bio`, `profession` and `major` left null. **The admin review card and the Task 11 checklist must both tolerate a null bio** — the admin card currently renders it unconditionally.

- [ ] **Step 1: Drop the three fields from the schema and the form**

In the `applicationSchema` `useMemo`, delete the `bio`, `profession` and `major` entries. Delete their `ArcadeField` blocks from the form and their keys from `defaultValues`.

- [ ] **Step 2: Stop writing them, and stop signing the teacher out**

In `onSubmit`, remove `bio_ar: data.bio` from the profile insert and the matching line from the fallback update. Remove `bio`, `profession` and `major` from the `teacher_applications` insert.

Then delete the `await supabase.auth.signOut();` at `src/pages/TeacherApplication.tsx:163` and the comment above it, and replace `setSubmitted(true)` with a push into the dashboard:

```tsx
            // Keep the session: the teacher lands in the sandbox and starts
            // building. Signing them out of an account they just created was
            // the single largest piece of friction in this flow.
            navigate('/teacher', { replace: true });
```

Add `import { Link, useNavigate } from 'react-router-dom';` and `const navigate = useNavigate();`.

The `submitted` success card becomes unreachable from this path. **Delete it and the `submitted` state** — a screen nothing can reach is a maintenance trap, and the sandbox banner in Task 11 now carries the "under review" message.

- [ ] **Step 3: Make the admin card tolerate the nulls**

In `src/pages/admin/TeacherApplications.tsx`, the card renders the bio and profession. Guard each so a row without them renders cleanly rather than showing an empty block:

```tsx
{app.bio && (
    /* existing bio block */
)}
```

Do the same for `profession` and `major`.

- [ ] **Step 4: Build and verify**

```bash
npx tsc -b
npx eslint src/pages/TeacherApplication.tsx src/pages/admin/TeacherApplications.tsx
npm run build
```

Then submit a real application end to end with a throwaway email and confirm: five fields only, no sign-out, a landing on `/teacher`, and a clean card at `/admin/applications` with no empty bio block.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TeacherApplication.tsx src/pages/admin/TeacherApplications.tsx
git commit -m "$(cat <<'EOF'
feat(teacher): shorten the application and keep the session

Bio, profession and major move to the sandbox checklist — they are
public-profile material, not approve-or-reject material, and a teacher writes
a better bio on the screen that shows where it appears.

Also drops the signOut() that logged a teacher out of the account they had
just created, and removes the now-unreachable success card. The admin review
card tolerates the newly-null fields.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: The web sandbox banner and checklist

**Files:**
- Create: `src/hooks/useTeacherSetup.ts`
- Create: `src/components/teacher/SandboxBanner.tsx`
- Modify: `src/pages/teacher/TeacherDashboard.tsx:108-150`

**Interfaces:**
- Produces:
  ```ts
  export interface SetupRow { key: string; ar: string; en: string; done: boolean; to?: string }
  export function useTeacherSetup(): { rows: SetupRow[]; doneCount: number; total: number; isLoading: boolean }
  ```
  ```tsx
  export function SandboxBanner(): JSX.Element | null
  ```
  `SandboxBanner` renders nothing when the profile is active and the checklist is complete.

- [ ] **Step 1: Write the derived checklist hook**

Create `src/hooks/useTeacherSetup.ts`. All four rows are computed at render — **no new table and nothing to keep in sync.**

```ts
// The teacher setup checklist, derived rather than stored. Four rows, each
// read from data that already exists; a stored checklist would be a second
// source of truth that drifts from the first.
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface SetupRow {
    key: string;
    ar: string;
    en: string;
    done: boolean;
    to?: string;
}

export function useTeacherSetup() {
    const { user, profile } = useAuth();
    const p = profile as any;

    const { data: application, isLoading } = useQuery({
        queryKey: ['teacher', user?.id, 'application'],
        enabled: !!profile?.email,
        queryFn: async () => {
            const { data } = await supabase
                .from('teacher_applications')
                .select('grades_taught')
                .eq('email', profile!.email)
                .maybeSingle();
            return data;
        },
    });

    const rows: SetupRow[] = [
        {
            key: 'identity',
            ar: 'الاسم والبريد',
            en: 'Name and email',
            done: !!profile?.full_name && !!profile?.email,
        },
        {
            key: 'stages',
            ar: 'المراحل التي تُدرّسها',
            en: 'Stages you teach',
            done: !!application?.grades_taught,
            to: '/teacher/profile',
        },
        {
            key: 'bio',
            ar: 'نبذة عنك — تظهر في ملفك العام',
            en: 'A short bio — shown on your public profile',
            done: !!p?.bio_ar,
            to: '/teacher/profile',
        },
        {
            key: 'shamcash',
            ar: 'حساب شام كاش لاستلام المدفوعات',
            en: 'Sham Cash account for receiving payments',
            done: !!p?.shamcash_account_name && !!p?.shamcash_account_number,
            to: '/teacher/profile',
        },
    ];

    return {
        rows,
        doneCount: rows.filter((r) => r.done).length,
        total: rows.length,
        isLoading,
    };
}
```

- [ ] **Step 2: Build the banner**

Create `src/components/teacher/SandboxBanner.tsx`. It replaces both the amber pending banner (`TeacherDashboard.tsx:115-132`) and the standalone Sham Cash card (`:135-150`) — two prompts for one thing becomes one.

```tsx
// Pending-review banner plus the derived setup checklist, in the arcade
// language. The banner it replaces was amber and rounded, from before the
// rebrand, and promised a sandbox that nothing enforced; migration 113 makes
// that promise true.
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check } from 'lucide-react';
import { A } from '@/components/arcade/theme';
import { ArcadeCard, ArcadeChip } from '@/components/arcade/primitives';
import { useTeacherSetup } from '@/hooks/useTeacherSetup';

export function SandboxBanner() {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const { rows, doneCount, total, isLoading } = useTeacherSetup();

    const pending = profile?.is_active === false;
    const complete = doneCount === total;

    // Nothing to say once they are approved and set up.
    if (!pending && complete) return null;

    return (
        <div className="space-y-4">
            {pending && (
                <ArcadeCard className="p-4" fill={A.wash}>
                    <div className="flex items-center gap-2.5">
                        <ArcadeChip>{t('قيد المراجعة', 'Under review')}</ArcadeChip>
                        <span className="font-mono text-[11px]" style={{ color: A.inkSoft }} dir="ltr">~24h</span>
                    </div>
                    <p className="mt-2.5 text-[14px] font-semibold leading-relaxed" style={{ color: A.ink }}>
                        {t(
                            'ابنِ موادك ودروسك الآن. النشر والبيع يُفتحان بموافقة الإدارة.',
                            'Build your subjects and lessons now. Publishing and selling unlock once an admin approves you.',
                        )}
                    </p>
                </ArcadeCard>
            )}

            {/* A failed checklist query must never block a teacher from
                building, so this section simply does not render. */}
            {!isLoading && !complete && (
                <ArcadeCard className="p-4">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[15px] font-black" style={{ color: A.ink }}>
                            {t('أكمل ملفك', 'Finish your profile')}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums" style={{ color: A.inkSoft }} dir="ltr">
                            {doneCount} / {total}
                        </span>
                    </div>

                    <ul className="mt-3">
                        {rows.map((row) => (
                            <li
                                key={row.key}
                                className="flex items-start gap-2.5 border-t-2 py-2.5 first:border-t-0 first:pt-0"
                                style={{ borderColor: A.wash }}
                            >
                                <span
                                    className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2"
                                    style={{
                                        borderColor: A.line,
                                        background: row.done ? A.accent : 'transparent',
                                        color: A.onAccent,
                                    }}
                                    aria-hidden
                                >
                                    {row.done && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                                <span
                                    className="text-[13.5px] font-semibold"
                                    style={{
                                        color: row.done ? A.inkSoft : A.ink,
                                        textDecoration: row.done ? 'line-through' : 'none',
                                    }}
                                >
                                    {row.done || !row.to ? t(row.ar, row.en) : (
                                        <Link to={row.to} className="arc-link arc-focus">{t(row.ar, row.en)}</Link>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </ArcadeCard>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Swap it into the dashboard**

In `src/pages/teacher/TeacherDashboard.tsx`, delete the `isPending` block (`:115-132`) and the `missingShamCash` block (`:135-150`), plus the three consts at `:108-110` (`isPending`, `p`, `missingShamCash`) — **check whether `p` is referenced anywhere else in the file before deleting it**, since it is a general `profile as any` alias and may serve other reads.

Then remove the imports those blocks were the only users of. `AlertTriangle` becomes unused for certain. `Loader2` is used by the pending banner's spinner but may also appear in a loading state elsewhere in the file, and `Link` is used by the Sham Cash card's button but is likely used by other cards too. Do not guess and **do not rely on `tsc`** — both tsconfigs set `noUnusedLocals: false`, so it reports nothing here. Use:

```bash
npx eslint src/pages/teacher/TeacherDashboard.tsx --rule '{"@typescript-eslint/no-unused-vars":"error"}'
```

and remove exactly the names it lists. Render in their place:

```tsx
            <SandboxBanner />
```

with `import { SandboxBanner } from '@/components/teacher/SandboxBanner';`.

- [ ] **Step 4: Typecheck, lint, build**

```bash
npx tsc -b
npx eslint src/hooks/useTeacherSetup.ts src/components/teacher/SandboxBanner.tsx src/pages/teacher/TeacherDashboard.tsx
npm run build
```

Expected: `tsc -b` silent. The two new files are new — keep them lint-clean. If `tsc` reports an unused import in `TeacherDashboard.tsx`, Step 3's cleanup was incomplete.

- [ ] **Step 5: Verify all three states**

```bash
node .smoke/run-sql.mjs -q "update public.profiles set is_active = false where email = '<teacher email>'"
```

Pending with an incomplete checklist: banner + checklist, both visible. Then restore the flag — approved with an incomplete checklist: checklist only, no banner. Then fill the remaining rows — nothing renders at all. Check dark mode on the first state.

```bash
node .smoke/run-sql.mjs -q "update public.profiles set is_active = true where email = '<teacher email>'"
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTeacherSetup.ts src/components/teacher/SandboxBanner.tsx src/pages/teacher/TeacherDashboard.tsx
git commit -m "$(cat <<'EOF'
feat(teacher): sandbox banner and derived setup checklist

Replaces the pre-rebrand amber pending banner and the separate Sham Cash
warning with one arcade component. The banner already promised "you'll be
able to publish once approved"; migration 113 is what made that true.

All four checklist rows are derived at render from data that already exists —
no new table. A failed checklist query hides the section rather than blocking
a teacher from building.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: The Android teacher application screen

**Files:**
- Create: `ayman_academy_flutter/lib/features/teacher/application/screens/teacher_application_screen.dart`
- Create: `ayman_academy_flutter/test/screens/teacher_application_screen_test.dart`
- Modify: `ayman_academy_flutter/lib/core/router/routes.dart`
- Modify: `ayman_academy_flutter/lib/core/router/router.dart`

**Interfaces:**
- Consumes: `AuthNotifier.signUp` returning `Session?` (Task 5), `FakeAuthRepository.signUpSession` (Task 5 Step 1).
- Produces: `Routes.teacherApply = '/auth/apply-teacher'`. Task 5 Step 5's link consumes it.

**Why this is new:** `register_screen.dart` is student-only with no role choice, so a teacher has to leave the app for the web. `needsOnboarding` stays `isStudent && studentStage == null` — the teacher's first run is the Task 13 checklist inside the dashboard, not a blocking route, so the router's redirect logic does not change.

- [ ] **Step 1: Add the route constant**

In `ayman_academy_flutter/lib/core/router/routes.dart`, beside `register`:

```dart
  static const teacherApply = '/auth/apply-teacher';
```

The `/auth` prefix matters: `router.dart:62` computes `isAuthRoute` as `path.startsWith('/auth')`, so this path is reachable while signed out without touching the redirect logic.

- [ ] **Step 2: Write the failing tests**

Create `ayman_academy_flutter/test/screens/teacher_application_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/teacher/application/screens/teacher_application_screen.dart';
import 'package:ayman_academy_app/shared/student_stages.dart';

import '../support/harness.dart';

void main() {
  late FakeAuthRepository repo;

  setUpAll(initTestHive);

  setUp(() async {
    await resetSettings();
    repo = FakeAuthRepository();
  });

  Future<void> pumpApply(WidgetTester tester, {bool dark = false}) async {
    await pumpScreen(
      tester,
      const TeacherApplicationScreen(),
      dark: dark,
      overrides: [
        ...onlineOverrides,
        authRepositoryProvider.overrideWithValue(repo),
      ],
    );
    await tester.pumpAndSettle();
  }

  testWidgets('asks for five things and not for a bio', (tester) async {
    await pumpApply(tester);

    expect(find.text('الاسم الكامل'), findsOneWidget);
    expect(find.text('البريد الإلكتروني'), findsOneWidget);
    expect(find.text('كلمة المرور'), findsOneWidget);
    expect(find.text('رقم الهاتف'), findsOneWidget);
    expect(find.text('المراحل التي تُدرّسها'), findsOneWidget);

    // Bio, profession and major belong to the sandbox checklist.
    expect(find.text('نبذة عنك'), findsNothing);
    expect(find.text('المهنة'), findsNothing);
  });

  testWidgets('offers all four stages as toggles', (tester) async {
    await pumpApply(tester);

    // Labels come from kStages, so they are the app's wording, not the web's
    // four short labels.
    for (final stage in kStages) {
      expect(find.byKey(Key('apply_stage_${stage.key}')), findsOneWidget);
      expect(find.text(stage.ar), findsOneWidget);
    }
  });

  testWidgets('submit is refused until a stage is picked', (tester) async {
    await pumpApply(tester);

    await tester.enterText(find.byKey(const Key('apply_name')), 'بسام الأسد');
    await tester.enterText(find.byKey(const Key('apply_email')), 'b@example.com');
    await tester.enterText(find.byKey(const Key('apply_password')), 'password123');
    await tester.enterText(find.byKey(const Key('apply_phone')), '0912345678');

    await tester.tap(find.byKey(const Key('apply_submit')));
    await tester.pumpAndSettle();

    expect(find.text('اختر مرحلة واحدة على الأقل'), findsOneWidget);
    expect(repo.signUpCalls, isEmpty);
  });

  testWidgets('picking a stage clears the error and allows submit', (tester) async {
    repo.signUpSession = null; // confirmation-on branch: no router redirect to chase

    await pumpApply(tester);
    await tester.enterText(find.byKey(const Key('apply_name')), 'بسام الأسد');
    await tester.enterText(find.byKey(const Key('apply_email')), 'b@example.com');
    await tester.enterText(find.byKey(const Key('apply_password')), 'password123');
    await tester.enterText(find.byKey(const Key('apply_phone')), '0912345678');

    await tester.tap(find.byKey(const Key('apply_stage_primary')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('apply_submit')));
    await tester.pumpAndSettle();

    expect(find.text('اختر مرحلة واحدة على الأقل'), findsNothing);
    expect(repo.signUpCalls, hasLength(1));
    expect(repo.signUpCalls.first['email'], 'b@example.com');
  });

  testWidgets('renders in dark mode', (tester) async {
    await pumpApply(tester, dark: true);
    expect(find.text('علّم معنا'), findsOneWidget);
  });
}
```

- [ ] **Step 3: Run them and watch them fail**

```bash
cd ayman_academy_flutter
flutter test test/screens/teacher_application_screen_test.dart
```

Expected: a compile failure — `teacher_application_screen.dart` does not exist. That is the correct first failure.

- [ ] **Step 4: Build the screen**

Create `ayman_academy_flutter/lib/features/teacher/application/screens/teacher_application_screen.dart`.

**There is no `ArcadeAuthScaffold`** — `arcade_auth_scaffold.dart` exports only `ArcadeAuthHeader` and `ArcadeAlert`. Build the page shell the way `register_screen.dart` does: a plain `Scaffold` → `SafeArea(top: false)` → `SingleChildScrollView` → `Column` with `ArcadeAuthHeader` on top. Note also that Dart's `ArcadeChip` takes `label:` (a String) and has **no `onTap`**, so a selectable stage chip has to be wrapped.

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/student_stages.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

/// Teacher application. The app had no teacher signup at all, so a teacher had
/// to leave for the web.
///
/// Five fields only: bio, profession and major belong to the sandbox checklist
/// on the dashboard, not to the approve-or-reject decision. The session is
/// kept — the router's redirect lands the teacher in their panel, where they
/// can build immediately while publishing stays gated on approval.
class TeacherApplicationScreen extends ConsumerStatefulWidget {
  const TeacherApplicationScreen({super.key});

  @override
  ConsumerState<TeacherApplicationScreen> createState() => _TeacherApplicationScreenState();
}

class _TeacherApplicationScreenState extends ConsumerState<TeacherApplicationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();

  final _selectedStages = <String>{};
  bool _obscurePassword = true;
  bool _loading = false;
  bool _success = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = ref.read(languageProvider.notifier).t;
    if (!_formKey.currentState!.validate()) return;

    if (_selectedStages.isEmpty) {
      setState(() => _error = t('اختر مرحلة واحدة على الأقل', 'Pick at least one stage'));
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final session = await ref.read(authProvider.notifier).signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        fullName: _nameController.text.trim(),
      );

      final userId = supabase.auth.currentUser?.id;
      if (userId != null) {
        // is_active: false is the whole point — the teacher works, but cannot
        // publish until an admin flips it (enforced by migration 113).
        await supabase.from('profiles').upsert({
          'id': userId,
          'email': _emailController.text.trim(),
          'full_name': _nameController.text.trim(),
          'phone': _phoneController.text.trim(),
          'role': 'teacher',
          'is_active': false,
          'language_pref': 'ar',
        });

        // Secondary: the account already exists, so a failure here must not
        // look like a failed signup. The web treats it the same way.
        try {
          await supabase.from('teacher_applications').insert({
            'full_name': _nameController.text.trim(),
            'email': _emailController.text.trim(),
            'phone': _phoneController.text.trim(),
            'grades_taught': _selectedStages.join(','),
            'status': 'pending',
          });
        } catch (e) {
          debugPrint('teacher_applications insert failed: $e');
        }
      }

      // A session means they are in: the router redirect takes them to the
      // teacher home on its own. No session means confirmation is on.
      if (session == null) setState(() => _success = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final arc = context.arc;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              children: [
                ArcadeAuthHeader(
                  title: _success ? t('تحقّق من بريدك', 'Check your email') : t('علّم معنا', 'Teach with us'),
                  subtitle: _success
                      ? t('أكّد بريدك ثم سجّل الدخول', 'Confirm your email, then sign in')
                      : t('أنشئ حسابك وابدأ ببناء موادك الآن.', 'Create your account and start building now.'),
                  languageLabel: lang.languageCode == 'ar' ? 'EN' : 'عربي',
                  onToggleLanguage: () => ref.read(languageProvider.notifier).toggle(),
                  onBack: Navigator.of(context).canPop() ? () => Navigator.of(context).pop() : null,
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: _success ? _buildSuccess(t) : _buildForm(t, arc),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccess(String Function(String, String) t) => ArcadeButton.nav(
        key: const Key('apply_success_login'),
        onPressed: () => context.go(Routes.login),
        size: ArcadeSize.lg,
        variant: ArcadeVariant.solid,
        label: t('تسجيل الدخول', 'Sign In'),
      );

  Widget _buildForm(String Function(String, String) t, Arc arc) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null) ...[
            ArcadeAlert(message: _error!),
            const SizedBox(height: 20),
          ],

          ArcadeField(
            label: t('الاسم الكامل', 'Full name'),
            required: true,
            child: TextFormField(
              key: const Key('apply_name'),
              controller: _nameController,
              textInputAction: TextInputAction.next,
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.name],
              decoration: InputDecoration(
                hintText: t('أدخل اسمك الكامل', 'Enter your full name'),
                prefixIcon: Icon(Icons.person_outline_rounded, size: 20, color: arc.inkSoft),
              ),
              validator: (v) => (v == null || v.trim().length < 3)
                  ? t('الاسم مطلوب (3 أحرف على الأقل)', 'Name is required (at least 3 characters)')
                  : null,
            ),
          ),
          const SizedBox(height: 18),

          ArcadeField(
            label: t('البريد الإلكتروني', 'Email'),
            required: true,
            child: TextFormField(
              key: const Key('apply_email'),
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.email],
              decoration: InputDecoration(
                hintText: 'example@email.com',
                prefixIcon: Icon(Icons.mail_outline_rounded, size: 20, color: arc.inkSoft),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return t('مطلوب', 'Required');
                if (!v.contains('@') || !v.contains('.')) {
                  return t('بريد إلكتروني غير صالح', 'Invalid email');
                }
                return null;
              },
            ),
          ),
          const SizedBox(height: 18),

          ArcadeField(
            label: t('كلمة المرور', 'Password'),
            required: true,
            hint: t('6 أحرف على الأقل', 'At least 6 characters'),
            child: TextFormField(
              key: const Key('apply_password'),
              controller: _passwordController,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.next,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                hintText: t('أدخل كلمة المرور', 'Enter your password'),
                prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: arc.inkSoft),
                suffixIcon: IconButton(
                  key: const Key('apply_toggle_password'),
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    size: 20,
                    color: arc.inkSoft,
                  ),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return t('مطلوب', 'Required');
                if (v.length < 6) return t('6 أحرف على الأقل', 'At least 6 characters');
                return null;
              },
            ),
          ),
          const SizedBox(height: 18),

          ArcadeField(
            label: t('رقم الهاتف', 'Phone number'),
            required: true,
            child: TextFormField(
              key: const Key('apply_phone'),
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.done,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.telephoneNumber],
              decoration: InputDecoration(
                hintText: '+963 9xx xxx xxx',
                prefixIcon: Icon(Icons.phone_outlined, size: 20, color: arc.inkSoft),
              ),
              validator: (v) => (v == null || v.trim().length < 6)
                  ? t('رقم الهاتف مطلوب', 'Phone number is required')
                  : null,
            ),
          ),
          const SizedBox(height: 18),

          // ArcadeChip has no onTap, so selection is carried by a wrapper.
          // Semantics mirrors _StageTile on the onboarding screen.
          ArcadeField(
            label: t('المراحل التي تُدرّسها', 'Stages you teach'),
            required: true,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: kStages.map((s) {
                final selected = _selectedStages.contains(s.key);
                return Semantics(
                  button: true,
                  selected: selected,
                  child: GestureDetector(
                    key: Key('apply_stage_${s.key}'),
                    onTap: () => setState(() {
                      selected ? _selectedStages.remove(s.key) : _selectedStages.add(s.key);
                      _error = null;
                    }),
                    child: ArcadeChip(label: t(s.ar, s.en), filled: selected),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 28),

          ArcadeButton(
            key: const Key('apply_submit'),
            onPressed: _loading ? null : _submit,
            loading: _loading,
            size: ArcadeSize.lg,
            label: t('إنشاء حساب والبدء', 'Create account and start'),
          ),
        ],
      ),
    );
  }
}
```

Two things in here will fail to compile if their own tasks have not run: `kStages` comes from **Task 7 Step 3**, and `AuthNotifier.signUp` returning a `Session?` rather than `void` comes from **Task 5 Step 4**. Both are prerequisites of this task.

The `profiles` write is an `upsert`, not an `insert`: a database trigger may already have created the row from the auth signup, and the web form hits exactly this case — it catches the insert failure and falls back to an update (`TeacherApplication.tsx:132-144`). An upsert is the same recovery in one call.

- [ ] **Step 5: Register the route**

In `ayman_academy_flutter/lib/core/router/router.dart`, beside the register route at `:105`:

```dart
      GoRoute(path: Routes.teacherApply, builder: (_, _) => const TeacherApplicationScreen()),
```

plus the import. Do **not** change the `redirect` callback.

- [ ] **Step 6: Run the tests again**

```bash
flutter test test/screens/teacher_application_screen_test.dart
flutter analyze lib/features/teacher/application lib/core/router
flutter test
```

Expected: all four new tests pass, analyze clean, whole suite green.

- [ ] **Step 7: Complete Task 5 Step 5's link**

`Routes.teacherApply` now exists, so add the "هل أنت معلّم؟" card to `register_screen.dart` if it was deferred, and confirm tapping it opens this screen.

- [ ] **Step 8: Commit**

```bash
git add ayman_academy_flutter/lib/features/teacher/application ayman_academy_flutter/lib/core/router ayman_academy_flutter/test/screens/teacher_application_screen_test.dart
git commit -m "$(cat <<'EOF'
feat(flutter): teacher application screen

The app had no teacher signup at all — register_screen is student-only with no
role choice, so a teacher had to leave the app for the web. Five fields,
matching the trimmed web form, with the session kept so they land in the
sandbox.

needsOnboarding stays student-only on purpose: the teacher's first run is a
checklist inside the dashboard, not a blocking route, so the router's redirect
logic is untouched.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: The Android sandbox banner

**Files:**
- Create: `ayman_academy_flutter/lib/features/teacher/widgets/sandbox_banner.dart`
- Modify: the teacher home screen under `ayman_academy_flutter/lib/features/teacher/dashboard/`
- Modify: `ayman_academy_flutter/test/support/harness.dart:130,133` (open the profile seams)
- Test: `ayman_academy_flutter/test/widgets/shared_widgets_test.dart`

**Interfaces:**
- Produces: `SandboxBanner` — a `ConsumerWidget` returning `SizedBox.shrink()` when the profile is active and the checklist is complete, mirroring the web component's contract exactly.

- [ ] **Step 1: Give the harness a way to seed a profile**

`FakeAuthRepository.fetchProfile` is hard-coded to `return null` (`harness.dart:130`) and `currentUser` to `null` (`:133`), so no existing test can put a profile into `authProvider`. Open those two seams rather than overriding the notifier — `AuthNotifier` is a `StateNotifier` whose `state` setter is protected, and seeding through the repository exercises the real code path instead of bypassing it.

In `harness.dart`, add two fields to `FakeAuthRepository` beside `signUpSession`:

```dart
  /// Returned by [fetchProfile]. Null by default, which is what every
  /// existing test already expects.
  Profile? profile;

  /// Returned by [currentUser]. `refreshProfile` early-returns without it.
  sb.User? user;
```

and replace the two hard-coded getters:

```dart
  @override
  Future<Profile?> fetchProfile(String userId) async => profile;

  @override
  sb.User? get currentUser => user;
```

Then add two builders at the bottom of `harness.dart`:

```dart
/// A Supabase user with the minimum a test needs. `refreshProfile` only reads
/// `.id`, but the constructor requires the rest.
sb.User testUser({String id = 'test-user'}) => sb.User(
      id: id,
      appMetadata: const {},
      userMetadata: const {},
      aud: 'authenticated',
      createdAt: DateTime(2026).toIso8601String(),
    );

/// A profile carrying exactly the fields the teacher surfaces read.
Profile fakeProfile({
  String role = 'teacher',
  bool isActive = true,
  String? fullName = 'بسام الأسد',
  String email = 'teacher@example.com',
  String? bioAr,
  String? shamcashName,
  String? shamcashNumber,
}) =>
    Profile(
      id: 'test-user',
      email: email,
      fullName: fullName,
      role: role,
      isActive: isActive,
      bioAr: bioAr,
      shamcashAccountName: shamcashName,
      shamcashAccountNumber: shamcashNumber,
      createdAt: DateTime(2026).toIso8601String(),
    );
```

Check `Profile`'s `createdAt` type before copying that last line — if it is a `DateTime` rather than a `String`, pass `DateTime(2026)` directly.

- [ ] **Step 2: Write the failing tests**

Append to `ayman_academy_flutter/test/widgets/shared_widgets_test.dart`. `pumpScreen` returns the `ProviderContainer`, which is how the test drives the profile in after mounting:

```dart
  // `stages` stands in for teacherStagesProvider, which cannot resolve against
  // a fake Supabase. Overriding it keeps the checklist deterministic instead of
  // dependent on a network call that will never complete.
  Future<void> pumpBanner(
    WidgetTester tester,
    Profile seeded, {
    String? stages,
    bool dark = false,
  }) async {
    repo.user = testUser();
    repo.profile = seeded;

    final container = await pumpScreen(
      tester,
      const SandboxBanner(),
      dark: dark,
      overrides: [
        ...onlineOverrides,
        authRepositoryProvider.overrideWithValue(repo),
        teacherStagesProvider.overrideWith((ref) async => stages),
      ],
    );
    await container.read(authProvider.notifier).refreshProfile();
    await tester.pumpAndSettle();
  }

  testWidgets('shows the review message while pending', (tester) async {
    await pumpBanner(tester, fakeProfile(isActive: false));

    expect(find.text('قيد المراجعة'), findsOneWidget);
    expect(find.textContaining('النشر والبيع يُفتحان'), findsOneWidget);
  });

  testWidgets('no review message once approved', (tester) async {
    await pumpBanner(tester, fakeProfile(isActive: true));

    expect(find.text('قيد المراجعة'), findsNothing);
  });

  testWidgets('renders nothing at all for an approved, fully set-up teacher',
      (tester) async {
    await pumpBanner(
      tester,
      fakeProfile(
        isActive: true,
        bioAr: 'نبذة',
        shamcashName: 'بسام',
        shamcashNumber: '0912345678',
      ),
      stages: 'primary,middle',
    );

    expect(find.text('قيد المراجعة'), findsNothing);
    expect(find.text('أكمل ملفك'), findsNothing);
  });
```

Add to this file's imports: `teacherStagesProvider` and `SandboxBanner` from `package:ayman_academy_app/features/teacher/widgets/sandbox_banner.dart`, `authProvider`/`authRepositoryProvider`, and `Profile` from `package:ayman_academy_app/shared/models/profile.dart`.

- [ ] **Step 3: Run them and watch them fail**

```bash
cd ayman_academy_flutter
flutter test test/widgets/shared_widgets_test.dart
```

Expected: compile failure — `SandboxBanner` does not exist.

- [ ] **Step 4: Build the widget**

Create `ayman_academy_flutter/lib/features/teacher/widgets/sandbox_banner.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

/// Dart mirror of src/components/teacher/SandboxBanner.tsx — same four derived
/// rows, same contract: renders nothing once the teacher is approved and set
/// up, and hides the checklist rather than blocking if its lookup fails.
///
/// `is_active` is a PUBLISH gate, not a login gate. A pending teacher builds
/// freely; migration 113 is what stops them publishing.

/// The teacher's stages, read from their application row. Nullable on purpose:
/// null means "could not tell", which hides the checklist instead of showing a
/// row as undone on no evidence.
final teacherStagesProvider = FutureProvider<String?>((ref) async {
  final email = ref.watch(authProvider).profile?.email;
  if (email == null) return null;
  final row = await supabase
      .from('teacher_applications')
      .select('grades_taught')
      .eq('email', email)
      .maybeSingle();
  return row?['grades_taught'] as String?;
});

class _SetupRow {
  final String ar;
  final String en;
  final bool done;
  const _SetupRow(this.ar, this.en, this.done);
}

class SandboxBanner extends ConsumerWidget {
  const SandboxBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final arc = context.arc;
    final profile = ref.watch(authProvider).profile;
    final stages = ref.watch(teacherStagesProvider);

    final pending = profile?.isActive == false;

    final rows = <_SetupRow>[
      _SetupRow('الاسم والبريد', 'Name and email',
          (profile?.fullName ?? '').isNotEmpty && (profile?.email ?? '').isNotEmpty),
      _SetupRow('المراحل التي تُدرّسها', 'Stages you teach',
          (stages.valueOrNull ?? '').isNotEmpty),
      _SetupRow('نبذة عنك — تظهر في ملفك العام', 'A short bio — shown on your public profile',
          (profile?.bioAr ?? '').isNotEmpty),
      _SetupRow('حساب شام كاش لاستلام المدفوعات', 'Sham Cash account for receiving payments',
          (profile?.shamcashAccountName ?? '').isNotEmpty &&
              (profile?.shamcashAccountNumber ?? '').isNotEmpty),
    ];

    final doneCount = rows.where((r) => r.done).length;
    final complete = doneCount == rows.length;

    // Nothing to say once they are approved and set up.
    if (!pending && complete) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (pending)
          ArcadeCard(
            fill: arc.wash,
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    ArcadeChip(label: t('قيد المراجعة', 'Under review')),
                    const SizedBox(width: 10),
                    Text(
                      '~24h',
                      textDirection: TextDirection.ltr,
                      style: TextStyle(fontSize: 11, color: arc.inkSoft),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  t(
                    'ابنِ موادك ودروسك الآن. النشر والبيع يُفتحان بموافقة الإدارة.',
                    'Build your subjects and lessons now. Publishing and selling unlock once an admin approves you.',
                  ),
                  style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w600, height: 1.55, color: arc.ink),
                ),
              ],
            ),
          ),

        // hasValue, not valueOrNull: a failed lookup must hide the checklist
        // rather than show every row as undone.
        if (!complete && stages.hasValue)
          ArcadeCard(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      t('أكمل ملفك', 'Finish your profile'),
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: arc.ink),
                    ),
                    Text(
                      '$doneCount / ${rows.length}',
                      textDirection: TextDirection.ltr,
                      style: TextStyle(fontSize: 12, color: arc.inkSoft),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                for (final row in rows)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 18,
                          height: 18,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            // On the electric-green fill the glyph takes
                            // onAccent, never white.
                            color: row.done ? arc.accent : Colors.transparent,
                            border: Border.all(color: arc.line, width: Arc.borderWidth),
                          ),
                          child: row.done
                              ? Icon(Icons.check_rounded, size: 12, color: arc.onAccent)
                              : null,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            t(row.ar, row.en),
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: row.done ? arc.inkSoft : arc.ink,
                              decoration: row.done ? TextDecoration.lineThrough : null,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
```

The two `Text` widgets carrying `~24h` and `2 / 4` set `TextDirection.ltr` explicitly: both are Latin/numeric and would otherwise have their separator pushed to the wrong end inside the RTL subtree.

- [ ] **Step 5: Mount it on the teacher home**

Render `const SandboxBanner()` at the top of the teacher home's scroll view, above the stat cards.

- [ ] **Step 6: Run everything**

```bash
flutter test
flutter analyze lib/features/teacher
```

Expected: both new tests pass, suite green, analyze clean.

- [ ] **Step 7: Commit**

```bash
git add ayman_academy_flutter/lib/features/teacher ayman_academy_flutter/test
git commit -m "$(cat <<'EOF'
feat(flutter): sandbox banner and setup checklist on teacher home

Dart mirror of src/components/teacher/SandboxBanner.tsx, same four derived
rows and the same contract: renders nothing once the teacher is approved and
set up, and hides the checklist rather than blocking if its lookup fails.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase D — Automation

### Task 14: Arm the notification triggers

**Files:** none. This is configuration, and it serves both clients at once.

**Interfaces:**
- Consumes: migration `106_email_notifications.sql`, already applied — nine `trg_email_*` triggers exist and are inert because the Vault secret `notify_webhook_secret` was never created, so each is a silent no-op rather than an error.
- Produces: live delivery for seven of the ten events in the spec's table, with no new code.

- [ ] **Step 1: Confirm the triggers really are there and really are inert**

```bash
node .smoke/run-sql.mjs -q "select tgname from pg_trigger where tgname like 'trg_email_%' and not tgisinternal"
node .smoke/run-sql.mjs -q "select name from vault.decrypted_secrets where name = 'notify_webhook_secret'"
```

Expected: nine `trg_email_*` rows, and **zero** rows from the second query. If the secret already exists, stop — someone armed this already, and overwriting it breaks the triggers until the function secret is changed to match.

- [ ] **Step 2: Create and verify the sending domain**

```bash
resend domains create --name mail.waraq.academy
```

Add the printed DNS records at the registrar, then poll:

```bash
resend domains verify <id>
resend domains list
```

Expected: the domain reaches `verified`. Until it does, do not continue — step 3 would set a sender Resend refuses.

- [ ] **Step 3: Set the sender**

```bash
supabase secrets set "EMAIL_FROM=Waraq Academy <no-reply@mail.waraq.academy>"
```

`SITE_URL` is already `https://www.waraq.academy`, so links in these emails resolve. Until `EMAIL_FROM` is set, the sender stays `onboarding@resend.dev`, which **Resend only delivers to the account owner** — every notification would silently reach nobody else.

- [ ] **Step 4: Arm the triggers**

Generate one random string and use the same value in both places — a mismatch makes every trigger fail its signature check.

```bash
supabase secrets set NOTIFY_WEBHOOK_SECRET=<s>
node .smoke/run-sql.mjs -q "select vault.create_secret('<s>', 'notify_webhook_secret')"
```

If the secret already exists, use `vault.update_secret` instead.

- [ ] **Step 5: Verify with one real application, end to end**

Submit a teacher application from `/apply/teacher` with a throwaway email, then:

```bash
resend emails list
```

Expected: two deliveries — one to the applicant, one to each super_admin. Then approve it at `/admin/applications` and check again: one more delivery, the decision email, to the applicant.

This single pass exercises `trg_email_applications_insert` and `trg_email_applications_status`, which are the two events this whole design depends on.

- [ ] **Step 6: Record the state**

Update CLAUDE.md's email section: the triggers are armed, `EMAIL_FROM` is set, and note which deliveries were observed and when. The go-live checklist there should no longer list steps 1-3 as outstanding.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: record that the notification triggers are armed

Migration 106's nine trg_email_* triggers were applied but inert — each reads
notify_webhook_secret from Vault and that secret was never created, so they
no-opped silently. Domain verified, EMAIL_FROM set, secret created, and the
teacher-application and decision emails observed landing.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

- [ ] `npx tsc -b` — silent
- [ ] `npm run build` — succeeds
- [ ] `node .smoke/30-publish-gate.mjs` — `5 passed, 0 failed`
- [ ] `node .smoke/10-teacher-smoke.mjs` — still 72/72, no regression from the trigger
- [ ] `node .smoke/03-columns.mjs` — the live schema still matches what the clients name
- [ ] `cd ayman_academy_flutter && flutter test` — whole suite green
- [ ] `flutter analyze lib` — clean for every directory touched
- [ ] A full student signup on both clients, in Arabic and English, light and dark
- [ ] A full teacher application through to approval on both clients, with the publish button locked before and live after
- [ ] `node .smoke/run-sql.mjs -q "select is_active from profiles where email = '<teacher email>'"` returns `true` — no test left a real teacher deactivated

## Deliberately not in this plan

Both are named in the spec as deferred, not dropped:

- **A student welcome email.** No trigger exists on `profiles`, and there is nothing to say that the stage screen does not already say. If email confirmation is ever switched on, Supabase's verification message fills this slot.
- **A nudge for a teacher with an incomplete checklist.** Needs a scheduled job; the in-dashboard checklist is the first-line answer. Revisit only if teachers actually stall.

Also out of scope, from the spec: the payment flow, the Sham Cash QR configuration, subscription plans, and the parent dashboard.
