-- 114_teacher_applications_self_select.sql
--
-- A teacher must be able to read their OWN application row. Without this,
-- `teacher_applications` has only a public INSERT policy and an admin-only
-- FOR ALL policy (066), so the teacher dashboard's setup checklist could never
-- see the stages the teacher had actually applied with: RLS filters the row out
-- silently, the query returns data: null, and the row reads as not-done forever
-- with no error anywhere.
--
-- Scoped to the caller's own email, taken from the JWT so this does not depend
-- on a second RLS-filtered read of `profiles`. Verified live 2026-10-14: a real
-- teacher's access token carries a top-level `email` claim equal to
-- auth.users.email, so auth.jwt() ->> 'email' resolves correctly.

drop policy if exists teacher_apps_self_select on public.teacher_applications;
create policy teacher_apps_self_select
  on public.teacher_applications
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));
