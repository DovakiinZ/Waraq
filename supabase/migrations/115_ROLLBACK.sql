-- 115_ROLLBACK.sql
-- Rolls back 115_lock_profile_privilege_columns.sql

drop trigger if exists trg_enforce_profile_privilege_columns on public.profiles;
drop function if exists public.enforce_profile_privilege_columns();
