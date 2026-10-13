-- 113_teacher_publish_gate.sql
--
-- `profiles.is_active` becomes a PUBLISH gate rather than a login gate: a
-- teacher builds freely from the first minute, but cannot make a subject
-- visible until an admin approves them.
--
-- Implemented as a TRIGGER, deliberately not an RLS policy. Postgres ORs
-- permissive policies together, which is how 104's profiles lockdown silently
-- failed and why 109 had to enumerate pg_policy instead of dropping by name.
-- A later permissive policy would quietly reopen a policy-based gate; it
-- cannot reopen a trigger.
--
-- Deactivating a teacher does NOT unpublish their existing subjects. The
-- trigger fires on write, not on read, so students who have paid keep their
-- access and pulling a live course stays an explicit admin action.

create or replace function public.enforce_teacher_publish_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_active boolean;
begin
  -- Only a row that ends up published is interesting.
  if coalesce(new.is_active, false) = false then
    return new;
  end if;

  -- Already published and staying published: not a transition, let it through.
  -- This is what keeps a deactivated teacher's live courses editable.
  if tg_op = 'UPDATE' and coalesce(old.is_active, false) = true then
    return new;
  end if;

  if public.is_super_admin() then
    return new;
  end if;

  select p.is_active into owner_active
    from public.profiles p
   where p.id = new.teacher_id;

  if coalesce(owner_active, false) = false then
    raise exception
      'TEACHER_NOT_APPROVED: a subject cannot be published until the teacher account is approved'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_teacher_publish_gate() from public, anon;

drop trigger if exists trg_teacher_publish_gate on public.subjects;
create trigger trg_teacher_publish_gate
  before insert or update of is_active on public.subjects
  for each row execute function public.enforce_teacher_publish_gate();
