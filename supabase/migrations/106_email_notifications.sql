-- ════════════════════════════════════════════════════════════════════════════
-- 106 — Email notifications via the `notify` Edge Function (Resend)
--
-- AFTER triggers POST the changed row to supabase/functions/notify through
-- pg_net. pg_net is asynchronous: the HTTP call happens after commit, in a
-- background worker, so a slow or failing email provider can never slow down
-- or roll back an order, message or announcement. The trigger function also
-- swallows its own errors for the same reason.
--
-- The shared secret lives in Vault as `notify_webhook_secret`, NOT in this
-- file. Until that secret exists the triggers are silent no-ops. Create it
-- once (same value as the function's NOTIFY_WEBHOOK_SECRET):
--
--   select vault.create_secret('<secret>', 'notify_webhook_secret');
--
-- Apply by pasting into the SQL editor (see README.md — never `db push`).
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- Preflight: refuse to run against the wrong project.
do $$
begin
  if to_regclass('public.orders') is null
     or to_regclass('public.teacher_applications') is null
     or to_regclass('public.teacher_invites') is null then
    raise exception 'Preflight failed: this is not the Ayman Academy database';
  end if;
end $$;

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_email_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'notify_webhook_secret'
  limit 1;

  if v_secret is null then
    return null; -- not configured yet: do nothing
  end if;

  perform net.http_post(
    url     := 'https://lkdbinrwojvrchunzqfq.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'record', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
      'old_record', case when tg_op = 'INSERT' then null else to_jsonb(old) end
    ),
    timeout_milliseconds := 10000
  );
  return null;
exception when others then
  raise warning 'notify_email_webhook(%): %', tg_table_name, sqlerrm;
  return null;
end;
$$;

revoke all on function public.notify_email_webhook() from public, anon, authenticated;

-- ── orders: new order → teacher; paid/rejected → student ────────────────────
drop trigger if exists trg_email_orders_insert on public.orders;
create trigger trg_email_orders_insert
  after insert on public.orders
  for each row execute function public.notify_email_webhook();

drop trigger if exists trg_email_orders_status on public.orders;
create trigger trg_email_orders_status
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status and new.status in ('paid', 'rejected'))
  execute function public.notify_email_webhook();

-- ── announcements → enrolled students ───────────────────────────────────────
drop trigger if exists trg_email_announcements_insert on public.announcements;
create trigger trg_email_announcements_insert
  after insert on public.announcements
  for each row
  when (new.is_active is not false)
  execute function public.notify_email_webhook();

-- ── messages → receiver (throttled inside the function) ─────────────────────
drop trigger if exists trg_email_messages_insert on public.messages;
create trigger trg_email_messages_insert
  after insert on public.messages
  for each row execute function public.notify_email_webhook();

-- ── certificates: issued → student ──────────────────────────────────────────
drop trigger if exists trg_email_certificates_insert on public.certificates;
create trigger trg_email_certificates_insert
  after insert on public.certificates
  for each row
  when (new.status = 'issued')
  execute function public.notify_email_webhook();

drop trigger if exists trg_email_certificates_status on public.certificates;
create trigger trg_email_certificates_status
  after update of status on public.certificates
  for each row
  when (old.status is distinct from new.status and new.status = 'issued')
  execute function public.notify_email_webhook();

-- ── teacher_applications: received → applicant + admins; decision → applicant
drop trigger if exists trg_email_applications_insert on public.teacher_applications;
create trigger trg_email_applications_insert
  after insert on public.teacher_applications
  for each row execute function public.notify_email_webhook();

drop trigger if exists trg_email_applications_status on public.teacher_applications;
create trigger trg_email_applications_status
  after update of status on public.teacher_applications
  for each row
  when (old.status is distinct from new.status and new.status in ('approved', 'rejected'))
  execute function public.notify_email_webhook();

-- ── teacher_invites → invitee, with the /invite/:token link ─────────────────
drop trigger if exists trg_email_invites_insert on public.teacher_invites;
create trigger trg_email_invites_insert
  after insert on public.teacher_invites
  for each row execute function public.notify_email_webhook();
