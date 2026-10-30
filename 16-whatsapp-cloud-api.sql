-- ==============================================================================
-- DAR EL IHSAN — MIGRATION: WHATSAPP CLOUD API INTEGRATION
-- جدول رسائل واتساب وأحداث الـ Webhook مع سياسات RLS وفهارس البحث
-- ==============================================================================

-- 1. جدول رسائل واتساب (whatsapp_messages)
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text default '',
  to_phone text not null,
  direction text default 'outbound' check (direction in ('outbound', 'inbound')),
  body text,
  template_name text,
  status text default 'sent' check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  error text default '',
  parent_id uuid,
  child_id uuid references public.children(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 2. جدول سجل أحداث Webhook من Meta (whatsapp_webhook_events)
create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text default 'meta_notification',
  payload jsonb default '{}'::jsonb,
  processed boolean default true,
  created_at timestamptz default now()
);

-- 3. الفهارس للبحث السريع والتصفية
create index if not exists idx_wa_msgs_wa_message_id on public.whatsapp_messages (wa_message_id);
create index if not exists idx_wa_msgs_to_phone on public.whatsapp_messages (to_phone);
create index if not exists idx_wa_msgs_status on public.whatsapp_messages (status);
create index if not exists idx_wa_msgs_created_at on public.whatsapp_messages (created_at desc);
create index if not exists idx_wa_msgs_child_id on public.whatsapp_messages (child_id);

-- 4. تفعيل أمن الصفوف RLS
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_webhook_events enable row level security;

-- أ) سياسة قراءة وإدراج رسائل واتساب للمديرين فقط
drop policy if exists "wa_messages_admin_all" on public.whatsapp_messages;
create policy "wa_messages_admin_all" on public.whatsapp_messages
  for all to authenticated
  using (
    exists (
      select 1 from public.admins a
      where a.user_id = auth.uid() and a.disabled = false
    )
  );

-- ب) سياسة كاملة لخدمة الخادم (service_role) لدوال Edge Functions
drop policy if exists "wa_messages_service_role" on public.whatsapp_messages;
create policy "wa_messages_service_role" on public.whatsapp_messages
  for all to service_role
  using (true);

drop policy if exists "wa_webhook_events_service_role" on public.whatsapp_webhook_events;
create policy "wa_webhook_events_service_role" on public.whatsapp_webhook_events
  for all to service_role
  using (true);

-- 5. إدراج سجل تجريبي أولي لتوثيق الجاهزية مع الرقم المعتمد (0564779067)
insert into public.whatsapp_messages (
  to_phone,
  direction,
  body,
  status,
  error
) values (
  '213564779067',
  'outbound',
  'السلام عليكم، هذا إشعار تجريبي لاختبار جاهزية ربط WhatsApp Cloud API لدار الإحسان.',
  'sent',
  ''
) on conflict do nothing;
