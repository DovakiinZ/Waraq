-- 116_teacher_applications_self_select_ci.sql
--
-- Supersedes 114_teacher_applications_self_select.sql with a case-insensitive
-- comparison. 114's policy was `email = (auth.jwt() ->> 'email')` — a raw,
-- case-sensitive equality. profiles.email and teacher_applications.email do
-- not always agree on casing across the two clients (Android has written the
-- as-typed email; web leaves profiles.email as GoTrue's lowercased value), and
-- a row written directly in the SQL editor or by an older client build can
-- carry mixed case too. Any of those made the applicant's own row invisible
-- to them under 114: RLS filtered it out silently, the query returned
-- data: null, and the setup checklist's "stages" row stayed stuck at
-- not-done forever.
--
-- Zero mixed-case rows exist in teacher_applications today (checked
-- 2026-10-14), so this is a latent bug being closed before it is tripped by
-- the next applicant who types "Ahmad@Gmail.com" — not a backfill.
--
-- lower()/lower() rather than ilike(): ILIKE treats '%' and '_' as wildcards,
-- and '_' is legal and common in email local-parts (foo_bar@x.com would match
-- fooXbar@x.com under ILIKE).

drop policy if exists teacher_apps_self_select on public.teacher_applications;

create policy teacher_apps_self_select
  on public.teacher_applications
  for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
