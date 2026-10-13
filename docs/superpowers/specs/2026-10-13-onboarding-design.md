---
type: decision
date: 2026-10-13
project: waraq-academy-portal
status: active
tags: [onboarding, auth, teacher-approval, email-automation, flutter, web]
---

# Onboarding — student and teacher, web and Android

Design approved 2026-10-13 from the mockup board
(`https://claude.ai/code/artifact/9ad6ef35-f877-47ac-a287-ae603dfb6bbd`).

## The decision in one line

A student answers one question before seeing courses; a teacher is productive from the
first minute and approval gates **publishing** rather than **logging in**.

## Why this work exists

Three defects, all found by reading the live code, none previously on the roadmap:

1. **Every new account is told to confirm an email that is never sent.** `Register.tsx`
   shows a success card reading "Check your email to confirm your account, then sign in."
   Confirm email is disabled in Supabase and the Send Email hook is left disabled
   (see CLAUDE.md, email go-live checklist), so no message ever arrives. Both clients.
2. **`profiles.is_active` is read by no route guard.** `RoleRoutes.tsx` gates on role
   alone. A teacher who submits an application has the full teacher panel immediately and
   `TeacherSubjects.tsx:484` creates every subject with `is_active: true`, so they can
   list a paid course to school-age students before anyone reviews them. Meanwhile
   `TeacherDashboard.tsx:108-132` already renders a banner promising "You'll be able to
   publish subjects and lessons once approved" — the product states the contract and does
   not enforce it.
3. **Android has no teacher path at all.** `register_screen.dart` is student-only with no
   role choice, and `needsOnboarding` is `isStudent && studentStage == null`
   (`auth_provider.dart:33`), so the app's onboarding is student-shaped by construction.
   A teacher must leave the app for the web.

## Scope

In: the student signup and stage flow, the teacher application and sandbox, the publish
gate (client and database), arming the notification triggers that already exist, and
parity between the two clients.

Out: payment flow, the Sham Cash QR configuration, subscription plans, the parent
dashboard, and the two new email types named in §3.3.

---

## Part 1 — Student

### 1.1 Register

Three fields: full name, email, password. The confirm-password field is removed; the
show-password toggle already present covers the same risk at a quarter of the typing on a
phone keyboard.

The success card and the `/login` round-trip are both removed, but **the branch that
produces them stays**, keyed on whether Supabase returned a session:

- `AuthContext.signUp` (`src/contexts/AuthContext.tsx:335-354`) currently destructures
  only `{ error }` from `supabase.auth.signUp` and discards `data`. Change it to return
  `{ error, session: data?.session ?? null }`.
- `Register.tsx` then branches on that session:
  - **session present** (confirm email off, today's configuration) → navigate straight to
    `/student/onboarding`. No second login.
  - **session null** (confirm email on) → render the existing success card, which is now
    telling the truth.

This is deliberate: it makes "do we require email confirmation?" a Supabase dashboard
setting rather than a code change, and it means the dead-end copy can never reappear.

Flutter mirrors it: `auth_repository.dart` returns the session, `register_screen.dart`
drops `_confirmController` (declared at `:22`) and takes the same branch.

### 1.2 Stage

One screen, four cards, one tap, then Continue. `student_stage` is the only required
answer because it is the only one the system makes a decision from: the onboarding guard
at `RoleRoutes.tsx:86`, `needsOnboarding` at `auth_provider.dart:33`, and the stage filter
on every subject query.

Each card carries a stage-colour square, the Arabic stage name, and its grade range as a
mono sublabel (`KG`, `Grades 1–6`, `Grades 7–9`, `Grades 10–12`). Stage colours are the
darkened brand variants that clear 3:1 — `#D1563A` coral, `#C0881F` sun, `#2E7F9E` sky,
`#17864F` green, matching `app_colors.dart:157-160`. Selected state is the arcade's:
`wash` fill plus the hard offset shadow, and a tick plate.

Two fixes ride along on the web page, which never received the arcade rebrand:

- `StudentOnboarding.tsx` still imports `@/assets/logo.png` (the pre-rebrand mark), uses
  `rounded-2xl` and shadows, and hard-codes `dir="rtl"` so it ignores the language
  setting. Rebuild it with `ArcadeCard` / `ArcadeButton` / `ArcadeBrand` and `dir={direction}`.
- The write goes through `verifiedUpdate('profiles', id, { student_stage })` from
  `adminDb.ts` instead of the raw `supabase.from('profiles').update(...)` at
  `StudentOnboarding.tsx:79-88`, per the project rule. **Verify first** that `verifiedUpdate`
  succeeds for a student updating their own row under migration 104's profile policies;
  if it does not, keep the raw call and note why rather than weakening a policy.

Android's screen is already stage-only and already arcade — it gains only the grade-range
sublabels, for parity.

### 1.3 Landing

Web lands on `/student/marketplace` as it does today; Android on the student home. Both
show a one-time strip reading «مواد المرحلة الابتدائية» (the student's stage), dismissible
and then gone for good. It replaces a product tour with one line that confirms the
student's choice landed.

Dismissal is per-device local state, not a profile column. A strip that reappears on a
second device is a smaller cost than a migration.

### 1.4 Where gender and grade go

Both move out of signup into `src/pages/student/StudentProfile.tsx` (web) and
`student_profile_screen.dart` (Android) as optional fields. Verified safe: the only readers
are `certificateTokens.ts` (the optional `{{student_gender}}` token, lines 81-82 and 122-129)
and `admin/StudentsManagement.tsx` (display only, line 116). Nothing in either client
gates on either value.

`StudentProfile.tsx` today edits `full_name` alone (line 26), so this adds a small
stage/gender/grade editor there. `GRADE_OPTIONS` moves out of `StudentOnboarding.tsx` into
a shared module so both the profile editor and the admin table can read one list.

Asking a child their gender on the first screen of a product costs goodwill and returns
nothing the platform uses.

### 1.5 Counted result

Measured against the current code, not estimated: **5 screens → 3**, **6 typed fields → 3
plus one tap**, **1 forced re-login → 0**, **1 unkeepable email promise → 0**.

---

## Part 2 — Teacher

### 2.1 Application form

Keeps: full name, email, password, phone, stages taught (multi-select chips).

Moves to the sandbox checklist: bio (today a required 20-character minimum), profession,
and major. These are public-profile material, not approve-or-reject material, and a teacher
writes a better bio on the screen that shows where it appears.

`TeacherApplication.tsx` keeps its three writes — auth user, profile with
`is_active: false`, `teacher_applications` row — but **drops the `signOut()` at line 163**,
which currently signs a teacher out of the account they just created. The session carries
them into the sandbox instead.

Android gains this screen: `features/teacher/application/screens/teacher_application_screen.dart`,
plus a "هل أنت معلّم؟" link on `register_screen.dart` mirroring the web's wash box.
`needsOnboarding` stays student-only — the teacher's first run is a checklist inside the
dashboard, not a blocking route, so the router does not change.

### 2.2 The sandbox

The teacher dashboard in the `is_active === false` state:

- **Status banner.** Rebuild the existing one (`TeacherDashboard.tsx:115-132`) in the
  arcade language — it is currently amber and rounded, from before the rebrand. Copy:
  «قيد المراجعة» chip, "ابنِ موادك ودروسك الآن. النشر والبيع يُفتحان بموافقة الإدارة."
  and a `~24h` expectation.
- **Setup checklist**, four rows with an `n / 4` counter. All four are **derived at render,
  not stored** — no new table and nothing to keep in sync:

  | Row | Source | Done when |
  |---|---|---|
  | الاسم والبريد | `profiles.full_name`, `profiles.email` | always (required at signup) |
  | المراحل التي تُدرّسها | `teacher_applications.grades_taught` | non-empty |
  | نبذة عنك | `profiles.bio_ar` | non-empty |
  | حساب شام كاش | `profiles.shamcash_account_name` + `_number` | both non-empty |

  The Sham Cash row supersedes the standalone warning at `TeacherDashboard.tsx:135-150`;
  fold that card into the checklist rather than showing two prompts for one thing.

- **Course cards** show a «مسودة» chip and a locked نشر button whose label states the
  reason: "النشر يُفتح بعد الموافقة". Locked, not hidden — a disabled control that explains
  itself teaches the rule; a missing one reads as a bug.

### 2.3 Enforcement

Two layers, because the UI layer is not a control. The anon key ships inside the APK, so
anyone holding it can call the update directly — hiding a button changes nothing.

**Client.** `TeacherSubjects.tsx:484` currently inserts `is_active: true` unconditionally.
It must insert `is_active: false` when `profile.is_active === false`, and the publish
control must be disabled in that state.

**Database — migration `113_teacher_publish_gate.sql`.** Use a `BEFORE INSERT OR UPDATE`
trigger on `subjects`, **not** an RLS policy. Postgres ORs permissive policies, which is
how migration 104's profiles lockdown silently failed and why 109 had to enumerate
`pg_policy` rather than drop by name; a later permissive policy would quietly reopen a
policy-based gate, whereas a trigger cannot be ORed away. The trigger raises when
`NEW.is_active` is true and the owning teacher's `profiles.is_active` is false, exempting
`is_super_admin()`.

Before writing it, enumerate the existing policies and triggers on `subjects` from
`pg_policy` / `pg_trigger` — per CLAUDE.md, a change that "ran fine" in the SQL editor is
not evidence it took. Apply with `node .smoke/run-sql.mjs -f supabase/migrations/113_teacher_publish_gate.sql`;
`supabase db push` is banned on this project.

**Deactivating a teacher does not unpublish their existing subjects.** The trigger fires on
write, not on read, so a teacher who is deactivated later stops being able to publish
anything new while courses students have already paid for stay available. Pulling live
courses is an explicit admin action, never a side effect of a flag change — the alternative
silently cuts off paying students.

### 2.4 Approval

Unchanged. `TeacherApplications.tsx:114-128` already flips `is_active = true`; the admin's
work does not change, only what that flag now controls. On approval the banner flips to the
accent confirmation and the publish controls unlock.

### 2.5 The sandbox contract

Stated once here and enforced in both layers.

**Open immediately:** creating subjects, lessons and quizzes; editing the profile and bio;
previewing own content as a student sees it; the AI summary on own lessons; the teacher guide.

**Locked until approved:** publishing a subject; appearing in the marketplace; receiving
orders and payments; broadcasting announcements.

---

## Part 3 — Automation

### 3.1 What already exists

Migration `106_email_notifications.sql` is **applied** and ships nine `trg_email_*`
triggers. Seven of them carry this flow with no new code:

| Event | Recipient | Trigger |
|---|---|---|
| Teacher application submitted | applicant + super_admins | `trg_email_applications_insert` |
| Application approved or rejected | applicant | `trg_email_applications_status` |
| Teacher invited | invitee | `trg_email_invites_insert` |
| New order | teacher | `trg_email_orders_insert` |
| Payment confirmed or rejected | student | `trg_email_orders_status` |
| Announcement posted | enrolled students | `trg_email_announcements_insert` |
| Certificate issued | student | `trg_email_certificates_insert` / `_status` |

They are silent, not broken: each reads its secret from Vault under
`notify_webhook_secret`, that secret was never created, and with no secret the trigger is a
no-op rather than an error. **The automation this design needs is built and applied — it
needs arming, not building.**

### 3.2 Arming it

Three steps from the CLAUDE.md go-live checklist, all now unblocked since
`waraq.academy` exists:

```bash
# 1 — sending domain
resend domains create --name mail.waraq.academy
# add the printed DNS records, then:
resend domains verify <id>

# 2 — the sender. Until this is set, Resend only delivers to the account owner,
#     so every notification silently reaches nobody but you.
supabase secrets set "EMAIL_FROM=Waraq Academy <no-reply@mail.waraq.academy>"

# 3 — arm the triggers. Both halves must be the same string.
supabase secrets set NOTIFY_WEBHOOK_SECRET=<s>
# then, in SQL:
select vault.create_secret('<s>', 'notify_webhook_secret');
```

`SITE_URL` is already set to `https://www.waraq.academy`, so links in those emails resolve.

Verify by submitting one real teacher application and confirming two deliveries (applicant
+ admin) in `resend emails list`, then approving it and confirming the decision email.

### 3.3 Deliberately not built

- **Student welcome email.** No trigger exists on `profiles` and there is nothing to say
  that the first screen does not already say. If confirm-email is switched on, Supabase's
  verification message fills this slot.
- **Nudge for a teacher with an incomplete checklist.** Needs a scheduled job; the
  in-dashboard checklist is the first-line answer. Revisit if teachers actually stall.

---

## Part 4 — Client parity

| Work | Web | Android |
|---|---|---|
| Return the session from signup; branch on it | edit `AuthContext.tsx`, `Register.tsx` | edit `auth_repository.dart`, `register_screen.dart` |
| Drop confirm-password | edit `Register.tsx` | edit `register_screen.dart` (`_confirmController`) |
| Move gender + grade to the profile | edit `StudentOnboarding.tsx`, `StudentProfile.tsx` | already matches; add the profile fields |
| Stage screen in the arcade language | rebuild — still pre-rebrand | done; add grade-range sublabels |
| First-run stage strip | new | new |
| Teacher application | exists at `/apply/teacher`; trim fields, drop `signOut()` | new screen |
| Sandbox banner + checklist | rebuild the existing amber banner | new |
| Publish gate in the client | edit `TeacherSubjects.tsx` | edit `course_editor_screen.dart` |
| Publish gate in the database | migration 113 — serves both clients | — |
| Arm the notification triggers | 3 commands — serves both clients | — |

## Error handling

- **Signup fails.** The existing inline alert stays; the arcade error style is the one
  non-green colour in the system, via `hsl(var(--destructive))`.
- **Stage write fails.** Keep the student on the screen with a persistent inline message,
  never a toast that scrolls away — they cannot proceed until it succeeds. This is what
  `student_onboarding_screen.dart:46-52` already does correctly; the web should match it
  rather than the reverse.
- **Session expired mid-onboarding.** Already handled on Android with a persistent "sign in
  again" message; add the same on web.
- **Publish blocked by the trigger.** The client should not be able to reach it, so if the
  error surfaces, show the reason and the checklist rather than a raw Postgres message.
- **Checklist query fails.** Render the banner without the checklist. A teacher must never
  be blocked from building because a derived counter could not load.

## Testing

- **`.smoke/30-onboarding.mjs`** (new, same shape as `10-teacher-smoke.mjs`): signs up a
  throwaway student, writes a stage, replays the marketplace query, then exercises the gate
  — a pending teacher's publish must be refused by the trigger, an active teacher's must
  succeed — cleaning up after itself.
- **Re-probe live policies and triggers** on `subjects` with `.smoke/03-columns.mjs` and a
  `pg_trigger` query after applying 113. Never trust a successful-looking run.
- **Flutter widget tests** for the new application screen and the sandbox checklist,
  following the existing test map in `ayman_academy_flutter/CLAUDE.md`.
- **Manual, both clients, both languages, both themes:** a full student signup, a full
  teacher application through to approval, and the pending teacher's locked publish button.
- `npx tsc -b` and `npm run build` must pass; `npm run lint` is known to fail repo-wide
  (634 pre-existing errors) so check touched files with `npx eslint <file>` only.

## Resolved by default

**Email confirmation stays off**, which is the configuration the design is drawn against.
The session branch in §1.1 means turning it on later is a dashboard setting, and the
"check your inbox" screen is kept and correct for that case. Enabling it also requires the
Send Email hook to be enabled — both are listed in the CLAUDE.md go-live checklist.
