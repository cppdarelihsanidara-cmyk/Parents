-- DAR EL IHSAN — SECURITY HARDENING MIGRATION 18
-- Review before production. Run once in Supabase SQL Editor as database owner.
-- This migration narrows notifications/WhatsApp access and replaces public QR RPC output
-- with a least-privilege function. It does NOT change auth users or delete child records.

begin;

-- 1) Remove the published/default webhook verification token from database configuration.
-- The real value must be stored in Supabase Edge Function secrets only.
alter table if exists public.whatsapp_settings
  alter column webhook_verify_token drop default;
update public.whatsapp_settings set webhook_verify_token = null;

-- Remove all existing policies on the affected tables first. PostgreSQL permissive policies
-- combine with OR, so leaving an old broad policy would defeat a new restrictive policy.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('notifications','notification_delivery_logs','whatsapp_settings',
                        'whatsapp_logs','whatsapp_replies','whatsapp_webhook_events','whatsapp_messages')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table if exists public.notifications enable row level security;
alter table if exists public.notification_delivery_logs enable row level security;
alter table if exists public.whatsapp_settings enable row level security;
alter table if exists public.whatsapp_logs enable row level security;
alter table if exists public.whatsapp_replies enable row level security;
alter table if exists public.whatsapp_webhook_events enable row level security;
alter table if exists public.whatsapp_messages enable row level security;

-- 2) Settings contain operational configuration and are not directly readable by browser users.
revoke all on table public.whatsapp_settings from anon, authenticated;
grant all on table public.whatsapp_settings to service_role;

-- 3) Notifications: only active admins can create/change/delete. Parents can read only their own
-- addressed notifications or notifications for a child linked to their account.
create policy de18_notifications_admin_select on public.notifications
  for select to authenticated
  using (
    exists (select 1 from public.admins a
            where a.user_id = auth.uid() and a.disabled = false)
    and audience in ('admin','all')
  );
create policy de18_notifications_admin_insert on public.notifications
  for insert to authenticated
  with check (
    exists (select 1 from public.admins a
            where a.user_id = auth.uid() and a.disabled = false)
  );
create policy de18_notifications_admin_update on public.notifications
  for update to authenticated
  using (exists (select 1 from public.admins a
                 where a.user_id = auth.uid() and a.disabled = false))
  with check (exists (select 1 from public.admins a
                      where a.user_id = auth.uid() and a.disabled = false));
create policy de18_notifications_admin_delete on public.notifications
  for delete to authenticated
  using (exists (select 1 from public.admins a
                 where a.user_id = auth.uid() and a.disabled = false));
create policy de18_notifications_parent_select on public.notifications
  for select to authenticated
  using (
    audience in ('parent','all') and
    (recipient_user_id = auth.uid() or child_id in (
      select pc.child_id from public.parent_children pc where pc.parent_id = auth.uid()
    ))
  );

-- Delivery logs are server-only: no browser role gets a policy.
revoke all on table public.notification_delivery_logs from anon, authenticated;
grant all on table public.notification_delivery_logs to service_role;

-- 4) WhatsApp message logs: active administrators only; Edge Functions use service_role.
create policy de18_whatsapp_logs_admin on public.whatsapp_logs
  for all to authenticated
  using (exists (select 1 from public.admins a
                 where a.user_id = auth.uid() and a.disabled = false))
  with check (exists (select 1 from public.admins a
                      where a.user_id = auth.uid() and a.disabled = false));
create policy de18_whatsapp_replies_admin on public.whatsapp_replies
  for all to authenticated
  using (exists (select 1 from public.admins a
                 where a.user_id = auth.uid() and a.disabled = false))
  with check (exists (select 1 from public.admins a
                      where a.user_id = auth.uid() and a.disabled = false));
create policy de18_whatsapp_messages_admin on public.whatsapp_messages
  for all to authenticated
  using (exists (select 1 from public.admins a
                 where a.user_id = auth.uid() and a.disabled = false))
  with check (exists (select 1 from public.admins a
                      where a.user_id = auth.uid() and a.disabled = false));
-- Intentionally no authenticated/anon policy for webhook event payloads.
revoke all on table public.whatsapp_webhook_events from anon, authenticated;
grant all on table public.whatsapp_webhook_events to service_role;

-- 5) Least-privilege public QR endpoint. Never return DOB, disability, section, phone, or login ID.
-- Uses a high-entropy 32-character token stored on the child row. The function is SECURITY DEFINER
-- so it can read the one matching row despite table RLS; its output is deliberately minimal.
create or replace function public.public_child_card_safe(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('found', false);
  end if;

  select jsonb_build_object(
    'found', true,
    'membership_no', c.membership_no,
    'full_name', c.full_name,
    'center', c.center,
    'academic_year', c.academic_year
  )
  into result
  from public.children c
  where c.qr_token::text = p_token
    and coalesce(c.active, false) = true
  limit 1;

  return coalesce(result, jsonb_build_object('found', false));
end;
$$;
revoke all on function public.public_child_card_safe(text) from public;
grant execute on function public.public_child_card_safe(text) to anon, authenticated;

-- Disable older public RPCs that may return more personal data than the QR page needs.
-- The new qr.js calls public_child_card_safe. Any other caller of the old RPCs must be migrated.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('public_child_card','get_public_child')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
  end loop;
end $$;

commit;

-- Post-migration manual verification:
-- 1) Inspect pg_policies for these seven tables; no broad legacy policy should remain.
-- 2) Test as anon, parent, active admin, and disabled admin using synthetic accounts.
-- 3) Verify Edge Functions read META_WA_VERIFY_TOKEN from Supabase Secrets, not this table.
-- 4) Confirm `children.qr_token` stores 32 lowercase hex characters and `active` is boolean.
