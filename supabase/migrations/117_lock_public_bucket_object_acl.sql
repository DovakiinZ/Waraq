-- 117_lock_public_bucket_object_acl.sql
--
-- The `public` storage bucket's UPDATE and DELETE policies are NAMED
-- "Auth users can update/delete own uploads" but carry NO ownership
-- predicate whatsoever. Both are simply:
--
--     (bucket_id = 'public' AND auth.role() = 'authenticated')
--
-- so *any* logged-in user can overwrite or delete *any* object in the
-- bucket. Proven behaviourally on 2026-10-15 with `.smoke/32-storage-acl.mjs`:
-- the test STUDENT account overwrote a teacher-owned object and the public
-- URL then served the student's bytes, then deleted it outright. Anonymous
-- upload is correctly blocked, so the hole is "any authenticated user",
-- which includes every pupil — and the anon key that lets them sign in
-- ships inside the Android APK.
--
-- This is the same failure shape the repo has hit three times now: a policy
-- whose NAME states a rule its BODY does not enforce (104's note on
-- `lessons_manage` having no WITH CHECK; 115's privilege columns).
--
-- Live blast radius today (10 objects): 2 teacher subject cover images and
-- 8 student certificate PDFs. A pupil could blank every teacher's course
-- artwork, or replace another pupil's certificate PDF at its own URL.
--
-- It becomes materially worse the moment lesson attachments land here:
-- lesson images and worksheets are served from the academy's own domain, so
-- a pupil could replace a diagram inside a *paid* lesson with anything they
-- liked and it would be served as the teacher's content. That is why this
-- migration lands BEFORE the lesson-upload feature, not after.
--
-- Three changes:
--
-- 1. UPDATE / DELETE become owner-scoped (`owner = auth.uid()`), with a
--    super_admin override so an admin can still remove content a teacher
--    uploaded. `owner` is gated rather than a path prefix because the bucket
--    is multi-tenant by path shape — `certificates/<id>.pdf` has no uid in
--    it at all — and because `owner` is populated on all 17 live objects
--    across both buckets (verified, not assumed).
--
-- 2. INSERT stops being "anywhere in the bucket". A teacher could previously
--    write into another teacher's `subjects/<uid>/` folder. It is now scoped
--    to the three prefixes that real code actually writes, enumerated from
--    the only two call sites in the codebase:
--      * `lessons/<auth.uid()>/...`     — lesson attachments (new)
--      * `subjects/<auth.uid()>/...`    — TeacherSubjects.tsx:417
--      * `certificates/...`             — certificateGenerator.ts:97, which
--        names the file from a random id with no uid in the path, so this
--        prefix stays uid-less exactly as today.
--
-- 3. Policies are dropped by ENUMERATING pg_policy, never by name. Postgres
--    ORs permissive policies together, so dropping the two known names would
--    leave any other permissive UPDATE/DELETE policy on this bucket silently
--    granting what we just revoked. This is how 104's profiles lockdown
--    failed and why 109 enumerates too.
--
-- SELECT is deliberately UNCHANGED: the bucket is public by design and the
-- public URL is already the credential (see the "Video URLs are bearer
-- access" entry in CLAUDE.md). This migration stops people WRITING over
-- each other's files; it does not and cannot make the bucket private.
--
-- NOTE: a student can still overwrite their OWN certificate PDF, since they
-- own it. Certificate authenticity is verified against the `certificates`
-- table via the QR code, not by trusting the PDF bytes, so this is a
-- narrowing (any student -> only that student) and not a new exposure. A
-- proper fix is to mint certificate PDFs server-side; out of scope here.

-- ── 1. Drop every permissive UPDATE/DELETE policy touching this bucket ─────
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and cmd in ('UPDATE', 'DELETE')
      and (
        coalesce(qual, '')       like '%''public''%'
        or coalesce(with_check, '') like '%''public''%'
      )
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
    raise notice 'dropped UPDATE/DELETE policy: %', p.policyname;
  end loop;
end $$;

-- ── 2. Drop every permissive INSERT policy touching this bucket ────────────
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and cmd = 'INSERT'
      and coalesce(with_check, '') like '%''public''%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
    raise notice 'dropped INSERT policy: %', p.policyname;
  end loop;
end $$;

-- ── 3. Owner-scoped replacements ───────────────────────────────────────────

create policy public_bucket_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'public'
    and (
      public.is_super_admin()
      -- lesson attachments: lessons/<uid>/<lesson_id>/<file>
      or ((storage.foldername(name))[1] = 'lessons'
          and (storage.foldername(name))[2] = auth.uid()::text)
      -- subject cover images: subjects/<uid>/<file>
      or ((storage.foldername(name))[1] = 'subjects'
          and (storage.foldername(name))[2] = auth.uid()::text)
      -- certificate PDFs: certificates/<random id>.pdf (no uid in path)
      or ((storage.foldername(name))[1] = 'certificates')
    )
  );

create policy public_bucket_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'public'
    and (owner = auth.uid() or public.is_super_admin())
  )
  with check (
    bucket_id = 'public'
    and (owner = auth.uid() or public.is_super_admin())
  );

create policy public_bucket_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'public'
    and (owner = auth.uid() or public.is_super_admin())
  );

-- ── 4. Verify ──────────────────────────────────────────────────────────────
do $$
declare
  n_bad int;
begin
  -- No remaining UPDATE/DELETE policy on this bucket may be ownership-blind.
  select count(*) into n_bad
  from pg_policies
  where schemaname = 'storage'
    and tablename  = 'objects'
    and cmd in ('UPDATE', 'DELETE')
    and coalesce(qual, '') like '%''public''%'
    and coalesce(qual, '') not like '%owner%';

  if n_bad > 0 then
    raise exception '117 FAILED: % ownership-blind UPDATE/DELETE policy/ies remain on the public bucket', n_bad;
  end if;

  raise notice '117 OK: public bucket write ACL is owner-scoped';
end $$;
