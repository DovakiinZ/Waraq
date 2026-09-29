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
- `107_fix_lessons_write_policies.sql` — `lessons_manage` was
  `FOR ALL USING (auth.role()='authenticated')` with no `WITH CHECK`, so any
  logged-in user could rewrite any lesson — including its `created_by`, which
  then handed them the lesson's blocks. **Applied 2026-09-29 by Claude.**
  ⚠ An earlier hand-run of this hotfix did NOT take: on 2026-09-29 `pg_policy`
  still showed `lessons_manage` present and `lessons_teacher_own` /
  `lessons_teacher_update` in their pre-hotfix form. The file's header used to
  claim it was applied; it was not, for some days. Verify policy changes
  against `pg_policy` rather than trusting a successful-looking SQL editor run.
- `108_lesson_summaries.sql` — the AI summary table, RLS and helper. Applied
  2026-09-29. **Do not re-run**: 109 replaces its student SELECT policy.
- `109_lock_lesson_content_reads.sql` — closed `SELECT USING (true)` on
  `lesson_sections` / `lesson_blocks`; added `subject_entitlement_reason`,
  `has_subject_access`, `can_read_lesson_content`, `can_edit_lesson_content`,
  `get_public_curriculum`. **Applied 2026-09-29.** Rollback: `109_ROLLBACK.sql`.
- `110_fix_entitlement_rpcs.sql` — is_paid rule, caller-scoping, `search_path`
  and `REVOKE ... FROM PUBLIC, anon` on `get_student_subjects` /
  `check_subject_access`. **Applied 2026-09-29.** Rollback: `110_ROLLBACK.sql`
  (verbatim pre-110 bodies + ACLs).
- `111_fix_discover_subjects.sql` — same treatment for
  `get_discover_subjects`. **Applied 2026-09-29.** Rollback: `111_ROLLBACK.sql`.
- `105_fix_admin_rpc_guards_and_profile_policies.sql` — closed a hole 104 left
  open (the admin enrollment RPCs were returning every student's and teacher's
  email to anonymous callers) and replaced the leftover permissive policies on
  `profiles`. Verified: anon now gets `42501` from those functions, sees 0
  student rows and 0 admin rows, and `email`, `grade` and
  `shamcash_account_number` all return 401.

## How to apply SQL here (no Docker on this machine)

`supabase db push` is banned and `supabase db dump` needs Docker, which is not
installed. Apply and inspect through the Management API instead — the project
is linked, and the CLI connects as `postgres`:

```bash
supabase db query --linked --workdir "$PWD" -f supabase/migrations/NNN.sql
node .smoke/run-sql.mjs -f supabase/migrations/NNN.sql   # same, readable output
node .smoke/run-sql.mjs -q "select 1"
```

`.smoke/_dump_schema.sql` + `run-sql.mjs` produce a full DDL snapshot of
`public` (tables, constraints, indexes, RLS flags, policies, function bodies,
function ACLs, grants, triggers) as a stand-in for `db dump`. Snapshots from
2026-09-29 are in `.smoke/live_schema_before.sql` and `live_schema_after.sql`.

**Always dump a function before replacing it** — several rollback files in this
folder are verbatim copies obtained that way:

```sql
select pg_get_functiondef('public.get_student_subjects(uuid)'::regprocedure);
```

## Known facts about the live schema

- `schema.json` at the repo root is a stale pre-`066` dump. Don't trust it.
- `lesson_progress` and `lesson_notes` key on **`user_id`**, not `student_id`.
- Quiz answers are normalised into `quiz_options`; `quiz_questions` has no
  `options` or `correct_answer` column.
- `profiles.featured_stages` does not exist, though some client code reads it.
- When in doubt, probe the column through PostgREST before writing SQL against
  it. A `select=<column>` that returns 200 exists; 400 with code `42703` does not.
