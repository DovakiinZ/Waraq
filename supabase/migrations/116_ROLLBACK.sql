-- 116_ROLLBACK.sql
-- Rolls back 116_teacher_applications_self_select_ci.sql to 114's verbatim
-- case-sensitive policy.

drop policy if exists teacher_apps_self_select on public.teacher_applications;

create policy teacher_apps_self_select
  on public.teacher_applications
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));
