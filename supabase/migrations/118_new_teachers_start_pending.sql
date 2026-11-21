-- 118_new_teachers_start_pending.sql
--
-- PROBLEM (found by a production smoke test, 2026-11-21)
--   Every new teacher was auto-APPROVED. /apply/teacher signs up, then
--   PATCHes its own profile to is_active = false. Migration 115's trigger
--   (rightly) refuses an owner changing is_active, the page ignores the
--   error, and the row keeps the column default TRUE. Measured: the new
--   account read back {"role":"teacher","is_active":true} and its first
--   course went live as «منشورة» with a price and no review — migration
--   113's publish gate never engaged.
--
--   Related risk: the LIVE handle_new_user does not match 043 (which
--   hard-codes 'student'): a signup carrying metadata role 'teacher' came
--   out as a teacher, so the live body reads raw_user_meta_data->>'role'.
--   If it copies that value unchecked, signUp({data:{role:'super_admin'}})
--   with the public key would create an admin.
--
-- FIX
--   A BEFORE INSERT trigger on profiles, so the rule holds whatever
--   handle_new_user's live body is (it is deliberately NOT replaced here —
--   its live body is unknown to the repo):
--     1. role must be 'student' or 'teacher' unless the insert comes from a
--        super_admin or from a direct database session (SQL editor /
--        migrations, session_user postgres|supabase_admin). Anything else
--        becomes 'student'.
--     2. a new 'teacher' starts is_active = false (pending review) unless
--        a super_admin is inserting, or a valid pending teacher_invites row
--        exists for that email (an admin already vetted them).
--   A trigger, not a policy: Postgres ORs permissive policies (see 104/113).
--
--   Approval is unchanged: an admin approving the application in
--   /admin/applications sets is_active = true (TeacherApplications.tsx),
--   which 115 permits for super_admin.
--
-- NOT AFFECTED
--   * Existing rows. INSERT only — nobody already active is deactivated.
--     An optional, separate clean-up for teachers who slipped through is
--     at the bottom, commented out, for a deliberate human decision.
--   * TeacherApplication's own PATCH {role:'teacher', is_active:false}:
--     both values now already match the row, so 115 sees no change and
--     the PATCH succeeds instead of 403ing.
--
-- ROLLBACK: 118_ROLLBACK.sql

create or replace function public.enforce_new_profile_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_privileged boolean;
  v_invited    boolean := false;
begin
  v_privileged := session_user in ('postgres', 'supabase_admin')
                  or coalesce(public.is_super_admin(), false);

  -- 1. Only student/teacher may be self-assigned.
  if new.role is null or new.role::text not in ('student', 'teacher') then
    if not v_privileged then
      new.role := 'student';
    end if;
  end if;

  -- 2. A new teacher waits for review.
  if new.role::text = 'teacher' and not v_privileged then
    begin
      select exists (
        select 1
        from public.teacher_invites i
        where lower(i.email) = lower(new.email)
          and i.status = 'pending'
          and (i.expires_at is null or i.expires_at > now())
      ) into v_invited;
    exception when undefined_table or undefined_column then
      -- If the invite table's shape differs, fail CLOSED (pending) rather
      -- than breaking every signup.
      v_invited := false;
    end;

    if not v_invited then
      new.is_active := false;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_new_profile_defaults on public.profiles;
create trigger trg_enforce_new_profile_defaults
  before insert on public.profiles
  for each row execute function public.enforce_new_profile_defaults();

-- ── Verify after running ────────────────────────────────────────────────
-- select tgname, tgenabled from pg_trigger
--  where tgrelid = 'public.profiles'::regclass and not tgisinternal;
-- Then sign up a throwaway teacher at /apply/teacher and confirm
--   select role, is_active from profiles where email = '<that email>';
-- returns teacher | false.

-- ── OPTIONAL clean-up (decide deliberately; NOT run by this migration) ──
-- Teachers who are active although their application was never approved:
--
-- select p.id, p.full_name, p.email, a.status, p.created_at
--   from profiles p
--   join teacher_applications a on lower(a.email) = lower(p.email)
--  where p.role = 'teacher' and p.is_active and a.status = 'pending';
--
-- To send them back to review (their existing published courses stay
-- live — 113's gate fires on write, not retroactively):
-- update profiles p set is_active = false
--   from teacher_applications a
--  where lower(a.email) = lower(p.email)
--    and p.role = 'teacher' and p.is_active and a.status = 'pending';
