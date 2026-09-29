-- 107_fix_lessons_write_policies.sql
--
-- ############ ALREADY APPLIED MANUALLY ON 2026-09-29 ############
--
-- This file is a RECORD of a hotfix the project owner ran by hand in the
-- Supabase SQL editor on 2026-09-29. It is committed so the folder shows what
-- the live database actually contains. Re-running it is harmless (every
-- statement is idempotent), but it does not need to be run.
--
-- WHAT WAS WRONG
--
-- Two write policies on public.lessons were effectively unguarded:
--
--   lessons_manage      FOR ALL USING (auth.role() = 'authenticated')
--                       with NO WITH CHECK clause.
--   lessons_teacher_own permitted INSERT of a lesson into ANY subject.
--
-- Consequences, all reachable with nothing but a normal logged-in session:
--
--   1. Any authenticated user could INSERT, UPDATE or DELETE ANY lesson,
--      including lessons belonging to other teachers' paid subjects.
--   2. Because there was no WITH CHECK, an attacker could UPDATE a lesson and
--      rewrite its `created_by` to their own uid. The content policies
--      `blocks_manage` / `sections_manage` key off lesson ownership, so that
--      one write handed them full control of that lesson's sections and
--      blocks as well.
--   3. Any user could create lessons inside a subject they do not own.
--
-- This contradicts the note previously in CLAUDE.md that "writes were already
-- correctly guarded on all other tables" — that claim was false for `lessons`.
-- CLAUDE.md has been corrected.
--
-- PRE-CHECK PERFORMED BEFORE APPLYING
--
-- The owner searched for rows that the loose policy could have produced and
-- found exactly one lesson whose creator did not own its subject. The creator
-- was a teacher, not a student, and there was no other sign of abuse. That
-- row's ownership was corrected by hand.
--
-- DELETE — checked, no action needed
--
-- The dropped `lessons_manage` was FOR ALL, so it was also a DELETE path, and
-- this hotfix creates no DELETE policy. That turned out to be fine: a separate
-- `lessons_teacher_delete` already exists live —
--
--     FOR DELETE USING (created_by = auth.uid() OR is_super_admin())
--
-- — and the hotfix does not touch it, so teacher delete still works.
-- Confirmed against pg_policies on 2026-09-29. The same check also showed that
-- 057's `"Teachers can manage own lessons"` does NOT exist live, so 057 is not
-- a factor here either way.
--
-- TeacherLessons.tsx and the Flutter lesson editor were still updated to
-- report an RLS denial in plain Arabic and English instead of a bare
-- "Failed to delete" — a teacher deleting someone else's lesson now gets a
-- reason rather than a shrug.
--
-- WHAT THIS DOES NOT FIX
--
-- Reads. `lesson_blocks` and `lesson_sections` still carry SELECT USING (true),
-- and `lessons` is readable by anon when published. Paid lesson bodies and
-- video URLs remain readable without purchase. See the CRITICAL entry in
-- CLAUDE.md's Known Issues; that work is scoped separately.
--
-- Depends on public.is_super_admin(), defined in 049_fix_profiles_rls.sql.

begin;
drop policy if exists "lessons_manage" on public.lessons;
drop policy if exists "lessons_teacher_own" on public.lessons;
create policy "lessons_teacher_own" on public.lessons
for insert to authenticated
with check (
  is_super_admin() or (
    created_by = auth.uid()
    and exists (select 1 from public.subjects s
                where s.id = lessons.subject_id and s.teacher_id = auth.uid())
  )
);
drop policy if exists "lessons_teacher_update" on public.lessons;
create policy "lessons_teacher_update" on public.lessons
for update to authenticated
using (created_by = auth.uid() or is_super_admin())
with check (
  is_super_admin() or (
    created_by = auth.uid()
    and exists (select 1 from public.subjects s
                where s.id = lessons.subject_id and s.teacher_id = auth.uid())
  )
);
commit;
