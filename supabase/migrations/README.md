# About this folder

**This folder is not a truthful history of the live database.** It accumulated
over time, contains duplicate numbers (`033_`, `050_`, `999_`, `9999_` all
appear twice) and several files that were never applied. Do not assume a file
here has run, and do not assume the database matches what these files describe.

## Never run `supabase db push` on this project

`db push` applies every `*.sql` in this folder in order. Two files here would
destroy or compromise the production database:

| File | What it does |
|---|---|
| `100_clean_rewrite.sql.DO-NOT-RUN` | Drops **every table in `public`** with CASCADE, plus all functions, triggers and types, then rebuilds a schema that no longer matches the live one. It has never been applied and must not be — it would delete `orders`, `teacher_applications` and the Sham Cash columns. |
| `101_seed_test_data.sql.DO-NOT-RUN` | Inserts fake `auth.users`, including a `super_admin` (`admin@ayman-academy.com`) with the hardcoded password `Test123456!`. Against production that is a backdoor admin account with a password published in this repo. |

Both were renamed with a `.DO-NOT-RUN` suffix so the CLI's `*.sql` glob cannot
pick them up. Renaming them back re-arms them — don't, unless you are
deliberately rebuilding an empty database from scratch.

## How to apply a migration here

Paste the specific file into the Supabase SQL editor for the **Ayman Academy**
project and run it:

https://supabase.com/dashboard/project/lkdbinrwojvrchunzqfq/sql/new

Migrations from `104` onward start with a preflight block that aborts if the
core tables are missing, so running one against the wrong project fails loudly
instead of silently creating objects in the wrong database.

## Applied and verified

Probed directly against the live database, not inferred from this folder:

- `102_live_schema_gaps.sql` — added `quiz_attempts.passed` and `student_levels`.
- `103_submit_quiz_attempt.sql` — server-side quiz grading. Verified: the RPC
  exists and rejects unauthenticated callers.
- `104_rls_and_missing_rpcs.sql` — profiles RLS, `teacher_evaluations`, and the
  five functions the UI called that did not exist.
- `105_fix_admin_rpc_guards_and_profile_policies.sql` — closed a hole 104 left
  open (the admin enrollment RPCs were returning every student's and teacher's
  email to anonymous callers) and replaced the leftover permissive policies on
  `profiles`. Verified: anon now gets `42501` from those functions, sees 0
  student rows and 0 admin rows, and `email`, `grade` and
  `shamcash_account_number` all return 401.

## Known facts about the live schema

- `schema.json` at the repo root is a stale pre-`066` dump. Don't trust it.
- `lesson_progress` and `lesson_notes` key on **`user_id`**, not `student_id`.
- Quiz answers are normalised into `quiz_options`; `quiz_questions` has no
  `options` or `correct_answer` column.
- `profiles.featured_stages` does not exist, though some client code reads it.
- When in doubt, probe the column through PostgREST before writing SQL against
  it. A `select=<column>` that returns 200 exists; 400 with code `42703` does not.
