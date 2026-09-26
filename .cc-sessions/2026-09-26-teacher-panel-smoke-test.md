---
type: session
date: 2026-09-26
project: waraq-academy-portal
status: completed
tags: [teacher-panel, testing, smoke-test, supabase, schema, bugfix]
---

# Teacher panel — full smoke test and repairs

Brief: "analyse the teacher panel and test all the screens and buttons and make sure
everything is working — run a smoke test for every function", using the real teacher
account `yamancloud@gmail.com`.

## How it was tested

Three layers, all against the **live** Supabase project as the real logged-in teacher
(Bassam Alassad, `role=teacher`, `is_active=true`, 1 subject / 2 lessons / 1 student):

1. **Live schema probe** — `.smoke/03-columns.mjs` asks PostgREST for every column the
   teacher panel names, one at a time, and reports `OK / MISSING (42703) / denied`.
   This is what caught the four defects. The repo's `schema.json` is a **stale** swagger
   dump (no `orders`, no shamcash columns, no subject pricing) — do not trust it.
2. **Data-layer suite** — `.smoke/10-teacher-smoke.mjs`, 72 checks that replay the exact
   query and mutation shapes of every screen (select lists, embeds, filters, payloads),
   creating and then deleting real rows. Now 72/72.
3. **Browser drive** — Playwright (`playwright-core` + installed Edge, run from the
   scratchpad so the repo stays clean) logging in and clicking through all ten screens
   plus the lesson editor, at 1440px and at 390px, capturing console errors, failed
   network responses and screenshots.

## Defects found and fixed

All four were **live schema mismatches** — code naming columns that do not exist. They
failed silently because the surrounding code either ignored the error or caught it.

- **Announcements could never be saved.** The page wrote `title`/`body`; the table is
  bilingual (`title_ar/title_en/body_ar/body_en`). Every save returned PGRST204 and the
  list rendered blank titles. Rewritten with AR/EN fields + `TranslationButton` +
  `useAutoTranslate`, matching the other teacher forms. Full CRUD verified in the browser.
- **Ratings & Feedback always showed zero.** `ratings` is polymorphic (`entity_type` +
  `entity_id`) so `lesson:lessons(...)` is not embeddable — PGRST200 — and the hook threw.
  A second query filtered `certificates` on `lesson_id`, which that table does not have.
  Lessons are now joined client-side and certificates queried by `subject_id`. The render
  also read `review.rating`; the column is `stars`, so stars were always grey.
  The no-lessons early return omitted `systemRemarks`, which would have crashed the page
  for a teacher with no lessons — fixed too. Page now shows the real rating and comment.
- **Course Health scored every course as if nobody had taken a quiz.**
  `teacherEvaluationService` selected `quiz_attempts.created_at`; the columns are
  `started_at` / `completed_at`. The 400 was swallowed by `|| []`.
- **Confirming a repeat purchase lied.** `student_subjects` is unique on
  `(student_id, subject_id)`, so a second order for the same subject 23505'd while the
  toast still said "access granted". Now an upsert, and a real failure warns the teacher.

Also fixed while in there: the teacher shell (and `MobileLayout`) still showed the
**pre-rebrand Ayman Academy logo**; the dashboard's "My Students" stat counted
`lesson_progress` rows rather than distinct students; the certificate card's expand
chevron was an icon-only button with no accessible name.

## Verified working (no change needed)

Dashboard stats and quick actions · Orders filter tabs and both status updates (columns
and RLS accepted; the access grant round-tripped) · Subjects list, detail panel, edit /
invite / announce dialogs, cover upload to the `public` bucket · Lessons list, create,
delete · **Lesson editor** end to end: create → add section → add block → type →
autosave ("محفوظ") → settings tabs → preview → the publish dialog → delete · Quizzes
create + enable toggle · Certificates enable switch and the eligible-students panel ·
`issue_certificate` RPC reachable · Messages contacts, conversation, send, mark-read ·
Profile prefill, save, avatar bucket · sidebar nav, dark mode, sign out · all ten screens
at 390px with no horizontal overflow.

## The Flutter app (same pass)

All 30 teacher-side query shapes in `ayman_academy_flutter` were replayed against the
live DB (`.smoke/21-flutter-shapes.mjs`) — **30/30 passed**, so the app never had the four
web defects. It had three of its own:

- **Confirming a payment never granted access** — `_confirmPayment` marked the order paid
  and never wrote `student_subjects`. The student paid and still could not open the
  course. Now an upsert on `(student_id, subject_id)`, with an honest message when the
  grant fails, and `reviewed_by` stamped on both confirm and reject.
- Dashboard "Students" counted enrolment rows, not distinct students.
- The announcement sheet was Arabic-only although the table and model are bilingual —
  optional English title/content added, matching the web form.

`flutter analyze` clean, `flutter test` 180/180.

## Left open

- **6 "SMOKE TEST" messages** are stuck in the `yamancloud ↔ yaman1` conversation. The
  `messages` table has **no DELETE policy**, so the client cannot remove them. Owner has
  to run: `delete from public.messages where content like 'SMOKE TEST%';`
- **`GROQ_API_KEY` is set but rejected** — `ai-assist` answers `{"success":false,
  "error":"Invalid API Key"}`, so every AI and translate button fails. The wiring itself
  is correct (client `AIAction` values all match the function's `VALID_ACTIONS`).
- **Orders confirm/reject were never clicked in the UI** — there are no orders, and RLS
  correctly forbids a teacher from creating one (42501). Both updates were validated at
  the data layer instead. A student login would close this.
- The old `logo.png` still ships in the admin, student and parent shells and four
  standalone pages — same one-line swap, out of scope for this pass.
- The pending-teacher gate (`is_active=false` → only `/teacher` and `/teacher/profile`)
  was read but not exercised; it needs a pending account.
- **No APK was built or published.** `android/key.properties` is still absent, so a
  release build would fall back to the debug key, which the Play Store rejects and which
  cannot upgrade an installed release build. Shipping one needs the owner's keystore plus
  the `--dart-define` values (including `ONESIGNAL_APP_ID`), then the version bump and
  GitHub release described in the web CLAUDE.md's Android Release Policy.
- The Flutter side has **no data-layer tests** — the 180 tests are brand/widget/screen
  only, with auth faked and no Supabase fake. The order-grant fix is covered by the live
  shape probe, not by a unit test.

## Verified

`npx tsc --noEmit` clean · `npm run build` clean · lint on the touched files went from
84 to 82 pre-existing `no-explicit-any` errors (none added) · `.smoke/10` 72/72 · all
test rows and uploaded files removed, teacher data back to its original 1 subject /
2 lessons.
