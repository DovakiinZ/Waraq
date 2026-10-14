-- 115_lock_profile_privilege_columns.sql
--
-- `profiles_update_self` is `USING (id = auth.uid()) WITH CHECK (id = auth.uid())`
-- with no column restriction, and `authenticated` holds column-level UPDATE on
-- both `role` and `is_active`. Verified behaviourally: the test student
-- account wrote `is_active = false` on its own row and the write was
-- accepted. The same policy/grant pair cover `role`, so any authenticated
-- user could PATCH their own row to `{"role":"super_admin"}` using only the
-- anon key shipped inside the Android APK.
--
-- Migration 113 just turned `is_active` into a security control (it gates
-- whether a teacher may publish a subject), and `is_super_admin()` reads
-- `role` from this same row — so the gate was defeatable by exactly the
-- party it gates.
--
-- Implemented as a BEFORE UPDATE trigger, deliberately not a policy change
-- and not a column REVOKE:
--   * A policy change is the wrong tool for the reason 113's header already
--     documents: Postgres ORs permissive policies together, so a later
--     permissive policy could silently reopen a policy-based gate (104's
--     profiles lockdown silently failed this way; 109 had to enumerate
--     pg_policy instead of dropping by name).
--   * A column-level REVOKE UPDATE from `authenticated` would make ANY
--     UPDATE ... SET touching these columns fail outright for authenticated
--     — including legitimate server-side paths — and this project has a
--     documented history of blanket revokes breaking published APK builds
--     that can never be updated.
--
-- The rule: reject the statement when `role` or `is_active` is being
-- CHANGED and the caller is an ordinary end user. Allow it when either:
--   1. public.is_super_admin() is true — how an admin approves a teacher.
--   2. auth.uid() IS NULL — no end-user JWT on the session. This is the
--      postgres/service-role/SQL-editor path (how `.smoke/run-sql.mjs`
--      applies SQL and flips is_active in tests), the `handle_new_user`
--      trigger that creates every profile row, migration 106's
--      trg_email_* notification triggers, and any SECURITY DEFINER
--      function running with no caller JWT. Without this clause, all of
--      the above break.
--
-- Only fires when OLD and NEW actually differ (`is distinct from`, so NULL
-- on either side behaves correctly) — ordinary profile edits (name, bio,
-- Sham Cash details, stage, gender, grade) are completely unaffected.

create or replace function public.enforce_profile_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No end-user JWT on this session (service role / postgres / SQL editor /
  -- another trigger / a SECURITY DEFINER function): always allowed.
  if auth.uid() is null then
    return new;
  end if;

  -- An admin session: always allowed (this is how a teacher gets approved).
  if public.is_super_admin() then
    return new;
  end if;

  -- Ordinary end user: block any actual change to the privileged columns.
  if new.role is distinct from old.role then
    raise exception
      'PRIVILEGE_COLUMN_LOCKED: role cannot be changed by the account owner'
      using errcode = '42501';
  end if;

  if new.is_active is distinct from old.is_active then
    raise exception
      'PRIVILEGE_COLUMN_LOCKED: is_active cannot be changed by the account owner'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_profile_privilege_columns() from public, anon;

drop trigger if exists trg_enforce_profile_privilege_columns on public.profiles;
create trigger trg_enforce_profile_privilege_columns
  before update of role, is_active on public.profiles
  for each row execute function public.enforce_profile_privilege_columns();
