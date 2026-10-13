-- 114_ROLLBACK.sql
-- Rolls back 114_teacher_applications_self_select.sql

drop policy if exists teacher_apps_self_select on public.teacher_applications;
