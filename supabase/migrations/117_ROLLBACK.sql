-- 117_ROLLBACK.sql
-- Restores the pre-117 `public` bucket write policies VERBATIM, including
-- the missing ownership predicate that 117 exists to fix.
--
-- Running this re-opens the hole proven by `.smoke/32-storage-acl.mjs`:
-- any authenticated user (any pupil) can overwrite or delete any object in
-- the `public` bucket. Only run it if 117 broke an upload path, and fix
-- forward instead if at all possible.

drop policy if exists public_bucket_insert_own on storage.objects;
drop policy if exists public_bucket_update_own on storage.objects;
drop policy if exists public_bucket_delete_own on storage.objects;

create policy "Auth users can upload to public bucket"
  on storage.objects
  for insert
  with check ((bucket_id = 'public'::text) AND (auth.role() = 'authenticated'::text));

create policy "Auth users can update own uploads"
  on storage.objects
  for update
  using ((bucket_id = 'public'::text) AND (auth.role() = 'authenticated'::text));

create policy "Auth users can delete own uploads"
  on storage.objects
  for delete
  using ((bucket_id = 'public'::text) AND (auth.role() = 'authenticated'::text));
