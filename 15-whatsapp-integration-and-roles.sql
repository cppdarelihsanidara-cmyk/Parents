-- ==============================================================================
-- DAR EL IHSAN — MIGRATION 15: WHATSAPP INTEGRATION & ROLE ACCESS HARDENING
-- نظام المراسلة عبر واتساب (Meta Cloud API)، وسجل الرسائل، وحماية صلاحيات الإدارة
-- ==============================================================================

-- 1. جدول إعدادات واتساب العامة (بيانات غير سرية)
-- تنبيه أمني: مفاتيح Access Token و App Secret لا تُخزن في قاعدة البيانات أبداً،
-- بل تُحفظ كأسرار مشفرة داخل Supabase Edge Functions Secrets.
create table if not exists public.whatsapp_settings (
  id text primary key default 'default',
  phone_number_id text default '',
  waba_id text default '',
  default_template text default 'hello_world',
  webhook_verify_token text default 'dar_el_ihsan_wa_verify_2026',
  is_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- إدراج الإعداد الافتراضي إن لم يكن موجوداً
insert into public.whatsapp_settings (id, phone_number_id, waba_id, webhook_verify_token, is_enabled)
values ('default', '', '', 'dar_el_ihsan_wa_verify_2026', true)
on conflict (id) do nothing;

-- 2. جدول سجل رسائل واتساب الصادرة والواردة
create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  child_id uuid references public.children(id) on delete set null,
  phone text not null,
  recipient_name text default '',
  direction text default 'outbound' check (direction in ('outbound', 'inbound')),
  message_type text default 'text' check (message_type in ('text', 'template', 'document', 'interactive')),
  template_name text default '',
  message_body text not null,
  status text default 'sent' check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  wamid text default '',
  error_message text default '',
  meta_payload jsonb default '{}'::jsonb,
  center text default 'main',
  section_id uuid references public.sections(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null
);

-- 3. جدول ردود الأولياء الواردة عبر واتساب
create table if not exists public.whatsapp_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  phone text not null,
  child_id uuid references public.children(id) on delete set null,
  sender_name text default '',
  message_body text not null,
  wamid text unique,
  reply_to_wamid text default '',
  status text default 'received',
  is_read boolean default false,
  raw_event jsonb default '{}'::jsonb
);

-- 4. جدول أحداث Webhook وسجلات التتبع
create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  event_type text default 'message',
  payload jsonb default '{}'::jsonb,
  processed boolean default true
);

-- 5. الفهارس للبحث السريع والتصفية حسب التاريخ والفرع والقسم والطفل والحالة
create index if not exists idx_wa_logs_created_at on public.whatsapp_logs (created_at desc);
create index if not exists idx_wa_logs_phone on public.whatsapp_logs (phone);
create index if not exists idx_wa_logs_child_id on public.whatsapp_logs (child_id);
create index if not exists idx_wa_logs_center on public.whatsapp_logs (center);
create index if not exists idx_wa_logs_section_id on public.whatsapp_logs (section_id);
create index if not exists idx_wa_logs_status on public.whatsapp_logs (status);
create index if not exists idx_wa_logs_wamid on public.whatsapp_logs (wamid);

create index if not exists idx_wa_replies_created_at on public.whatsapp_replies (created_at desc);
create index if not exists idx_wa_replies_phone on public.whatsapp_replies (phone);
create index if not exists idx_wa_replies_child_id on public.whatsapp_replies (child_id);
create index if not exists idx_wa_replies_is_read on public.whatsapp_replies (is_read);

-- 6. تفعيل أمن الصفوف RLS
alter table public.whatsapp_settings enable row level security;
alter table public.whatsapp_logs enable row level security;
alter table public.whatsapp_replies enable row level security;
alter table public.whatsapp_webhook_events enable row level security;

-- دوال وسياسات الوصول
-- أ) whatsapp_settings: قراءة لجميع المشرفين والإدارة، وتعديل للمديرين العامين فقط
drop policy if exists "wa_settings_select" on public.whatsapp_settings;
create policy "wa_settings_select" on public.whatsapp_settings
  for select to authenticated
  using (true);

drop policy if exists "wa_settings_update" on public.whatsapp_settings;
create policy "wa_settings_update" on public.whatsapp_settings
  for all to authenticated
  using (
    exists (
      select 1 from public.admins a
      where a.user_id = auth.uid()
        and a.is_owner = true
        and a.disabled = false
    )
  );

-- ب) whatsapp_logs: وصول كامل للإداريين المصرح لهم
drop policy if exists "wa_logs_all_admin" on public.whatsapp_logs;
create policy "wa_logs_all_admin" on public.whatsapp_logs
  for all to authenticated
  using (
    exists (
      select 1 from public.admins a
      where a.user_id = auth.uid() and a.disabled = false
    )
  );

-- ج) whatsapp_replies: وصول كامل للإداريين
drop policy if exists "wa_replies_all_admin" on public.whatsapp_replies;
create policy "wa_replies_all_admin" on public.whatsapp_replies
  for all to authenticated
  using (
    exists (
      select 1 from public.admins a
      where a.user_id = auth.uid() and a.disabled = false
    )
  );

-- د) whatsapp_webhook_events: خدمة الخادم فقط (Service Role)
drop policy if exists "wa_webhook_service" on public.whatsapp_webhook_events;
create policy "wa_webhook_service" on public.whatsapp_webhook_events
  for all to service_role
  using (true);

-- 7. سجل تجريبي لتوثيق الجاهزية مع رقم هاتف الفحص (0564779067)
insert into public.whatsapp_logs (
  phone,
  recipient_name,
  direction,
  message_type,
  message_body,
  status,
  center,
  error_message
) values (
  '0564779067',
  'رقم الاختبار المعتمد',
  'outbound',
  'text',
  'مرحباً بكم من جمعية أولياء الأطفال المعاقين ذهنياً - دار الإحسان. هذا إشعار تجريبي لاختبار الربط والجاهزية.',
  'sent',
  'main',
  ''
) on conflict do nothing;
