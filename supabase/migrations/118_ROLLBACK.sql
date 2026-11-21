-- Rollback for 118_new_teachers_start_pending.sql
drop trigger if exists trg_enforce_new_profile_defaults on public.profiles;
drop function if exists public.enforce_new_profile_defaults();
