-- Logistics email automation (CARE-01 request, CARE-02 reminder). ADR-0010.
-- Run in the Ops Supabase SQL editor AFTER ops-hub-communications.sql and
-- BEFORE deploying the matching app change. One transaction; safe to reapply.
--
-- Additive only: new ops_care_* tables, new nullable/defaulted columns on
-- ops_comms_records, one more task kind, and a trigger that cancels queued
-- emails the moment a record stops being eligible (for example when a form
-- receipt is recorded). It changes no existing row: automation starts in
-- mode 'off', and no existing order is enrolled.
--
-- Rules (eligibility, schedule, templates) live in app/utils/ops-care.js.
-- These functions enforce identity, deduplication, atomic claims, the
-- receipt-wins rule and per-order serialisation (the same advisory lock
-- ops_comms_apply takes).
begin;

-- Settings: one row. Deployment leaves mode 'off'.
create table if not exists public.ops_care_settings (
  id integer primary key default 1 check (id = 1),
  mode text not null default 'off' check (mode in ('off','test','live')),
  global_pause boolean not null default false,
  live_rules jsonb not null default '{"CARE-01": false, "CARE-02": false}'::jsonb,
  intake_started_at timestamptz,
  intake_cursor timestamptz,
  timezone text not null default 'America/New_York' check (length(timezone) between 1 and 64),
  send_hour integer check (send_hour between 0 and 23),
  business_days integer[] not null default '{1,2,3,4,5}',
  holidays date[] not null default '{}',
  test_recipients text[] not null default '{}',
  test_order_ids text[] not null default '{}',
  excluded_item_patterns text[] not null default '{wax,oil,"gift card",sample}',
  from_name text not null default 'MODERNCRE8VE' check (length(from_name) between 1 and 80),
  reply_to text not null default 'care@moderncre8ve.com',
  last_tick_at timestamptz,
  last_tick_result jsonb,
  updated_by text not null default 'setup',
  updated_at timestamptz not null default now()
);
insert into public.ops_care_settings (id) values (1) on conflict (id) do nothing;

-- Haven's sending connection (gmail.send + gmail.readonly), separate from the
-- read-only daybook connection. The refresh token is encrypted by the app.
create table if not exists public.ops_care_sender (
  id integer primary key default 1 check (id = 1),
  email text not null check (email = 'haven@moderncre8ve.com'),
  refresh_token text not null,
  scopes text not null default '',
  send_as_ok boolean not null default false,
  send_as_display_name text,
  send_as_checked_at timestamptz,
  send_as_problem text,
  connected_at timestamptz not null default now()
);

-- Immutable template versions. Only one active per key.
create table if not exists public.ops_care_templates (
  key text not null check (key in ('CARE-01','CARE-02')),
  version integer not null check (version > 0),
  subject text not null check (length(subject) between 1 and 200),
  body_text text not null check (length(body_text) between 1 and 20000),
  neutral_greeting text not null default '' check (length(neutral_greeting) <= 200),
  source_doc_id text not null default '' check (length(source_doc_id) <= 200),
  source_revision text not null default '' check (length(source_revision) <= 200),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  imported_by text not null,
  imported_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  active boolean not null default false,
  primary key (key, version)
);
create unique index if not exists ops_care_templates_one_active
  on public.ops_care_templates(key) where active;

-- Immutable asset versions: the blank logistics PDF and the care@ signature.
create table if not exists public.ops_care_assets (
  kind text not null check (kind in ('logistics_blank_pdf','care_signature')),
  version integer not null check (version > 0),
  filename text not null default '' check (length(filename) <= 200),
  content_base64 text check (content_base64 is null or length(content_base64) <= 7500000),
  html text check (html is null or length(html) <= 20000),
  text_content text check (text_content is null or length(text_content) <= 5000),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size integer not null default 0,
  page_count integer,
  source text not null default '' check (length(source) <= 200),
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  active boolean not null default false,
  primary key (kind, version)
);
create unique index if not exists ops_care_assets_one_active
  on public.ops_care_assets(kind) where active;

-- The outbox: one row per intended email. dedupe_key is the single guard
-- against duplicates: CARE-01 once per order, CARE-02 once per due date.
create table if not exists public.ops_care_messages (
  id uuid primary key default gen_random_uuid(),
  store text not null default 'moderncre8ve.myshopify.com',
  order_id text not null check (order_id ~ '^[0-9]{1,20}$'),
  order_name text not null check (length(order_name) between 1 and 40),
  template_key text not null check (template_key in ('CARE-01','CARE-02')),
  anchor text not null check (length(anchor) between 1 and 40),
  dedupe_key text not null unique,
  status text not null default 'scheduled' check (status in
    ('scheduled','held','sending','accepted','failed','uncertain','suppressed','cancelled')),
  due_at timestamptz not null,
  override_due_at timestamptz,
  lease_until timestamptz,
  attempts integer not null default 0,
  rfc822_message_id text,
  last_attempt_at timestamptz,
  reconcile_attempts integer not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  provider_message_id text,
  provider_thread_id text,
  accepted_at timestamptz,
  outcome_note text not null default '' check (length(outcome_note) <= 2000),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ops_care_messages_due_idx
  on public.ops_care_messages(due_at) where status = 'scheduled';
create index if not exists ops_care_messages_order_idx
  on public.ops_care_messages(order_id, created_at desc);

-- Per-order automation fields on the existing record. Existing rows keep
-- care_enrolment 'none': deployment never enrols them.
alter table public.ops_comms_records
  add column if not exists logistics_requested_at timestamptz,
  add column if not exists reminder_last_sent_at timestamptz,
  add column if not exists care_enrolment text not null default 'none',
  add column if not exists care_excluded boolean not null default false,
  add column if not exists care_paused_until date,
  add column if not exists care_test_recipient text;
do $$ begin
  alter table public.ops_comms_records add constraint ops_comms_records_care_enrolment_check
    check (care_enrolment in ('none','auto','manual'));
exception when duplicate_object then null; end $$;

-- One more task kind for automation problems.
alter table public.ops_comms_tasks drop constraint if exists ops_comms_tasks_kind_check;
alter table public.ops_comms_tasks add constraint ops_comms_tasks_kind_check check (kind in
  ('reply','update','logistics_review','missing_evidence','logistics_clarification','follow_up','other','care_exception'));

create or replace function public.ops_care_check_actor(p_actor text) returns void
language plpgsql set search_path = public as $$
begin
  if p_actor is distinct from 'system:care-tick' then
    perform ops_check_user(p_actor);
  end if;
end $$;

create or replace function public.ops_care_lock(p_order_id text) returns void
language sql set search_path = public as $$
  select pg_advisory_xact_lock(hashtext('ops_comms:' || p_order_id));
$$;

create or replace function public.ops_care_event(
  p_order_id text, p_kind text, p_direction text, p_occurred_on date, p_summary text,
  p_evidence_url text, p_details jsonb, p_actor text
) returns void language sql set search_path = public as $$
  insert into ops_comms_events(order_id, kind, direction, occurred_on, summary, evidence_url, details, actor)
  values (p_order_id, p_kind, p_direction, p_occurred_on, left(p_summary, 2000),
    nullif(p_evidence_url, ''), coalesce(p_details, '{}'::jsonb), p_actor);
$$;

create or replace function public.ops_care_exception_task(p_order_id text, p_title text, p_actor text)
returns void language sql set search_path = public as $$
  insert into ops_comms_tasks(order_id, kind, title, owner_email, created_by, updated_by)
  values (p_order_id, 'care_exception', left(p_title, 500), 'haven@moderncre8ve.com', p_actor, p_actor)
  on conflict (order_id, kind) where status in ('open','snoozed') and kind <> 'other' do nothing;
$$;

-- Receipt wins: whenever a record changes so that a queued email no longer
-- fits, cancel it in the same transaction as the change.
create or replace function public.ops_care_records_changed() returns trigger
language plpgsql set search_path = public as $$
declare j record; v_reason text;
begin
  for j in select id, template_key, anchor from ops_care_messages
    where order_id = new.order_id and status in ('scheduled','held') for update loop
    v_reason := null;
    if new.care_excluded then
      v_reason := 'Excluded from automated emails';
    elsif j.template_key = 'CARE-01' and new.logistics_status <> 'not_requested' then
      v_reason := case when new.logistics_status = 'awaiting_return'
        then 'Logistics request already recorded' else 'Form receipt recorded' end;
    elsif j.template_key = 'CARE-02' and new.logistics_status <> 'awaiting_return' then
      v_reason := 'Form receipt recorded (status ' || replace(new.logistics_status, '_', ' ') || ')';
    elsif j.template_key = 'CARE-02' and not new.reminders_enabled then
      v_reason := 'Reminders turned off';
    elsif j.template_key = 'CARE-02' and new.reminder_next_due_on::text is distinct from j.anchor then
      v_reason := 'Reminder date changed (for example, an update included the reminder)';
    end if;
    if v_reason is not null then
      update ops_care_messages set status = 'suppressed', outcome_note = v_reason,
        override_due_at = null, updated_at = clock_timestamp() where id = j.id;
      perform ops_care_event(new.order_id, 'care_email_suppressed', 'internal', null,
        format('%s cancelled before sending: %s.', j.template_key, v_reason), null,
        jsonb_build_object('message_id', j.id, 'template', j.template_key), new.updated_by);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists ops_care_records_changed on public.ops_comms_records;
create trigger ops_care_records_changed after update on public.ops_comms_records
  for each row execute function public.ops_care_records_changed();

-- Reads ------------------------------------------------------------------

create or replace function public.ops_care_settings_get(p_actor text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return (select to_jsonb(s) from ops_care_settings s where id = 1);
end $$;

create or replace function public.ops_care_overview(p_email text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  return jsonb_build_object(
    'settings', (select to_jsonb(s) from ops_care_settings s where id = 1),
    'sender', (select to_jsonb(x) - 'refresh_token' from ops_care_sender x where id = 1),
    'templates', coalesce((select jsonb_agg(to_jsonb(t) order by t.key, t.version desc) from ops_care_templates t), '[]'::jsonb),
    'assets', coalesce((select jsonb_agg(to_jsonb(a) - 'content_base64' order by a.kind, a.version desc) from ops_care_assets a), '[]'::jsonb),
    'exceptions', coalesce((select jsonb_agg(to_jsonb(m) order by m.updated_at desc) from ops_care_messages m
      where m.status in ('held','failed','uncertain','sending')), '[]'::jsonb),
    'exception_tasks', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('order_name', r.order_name) order by t.created_at desc)
      from ops_comms_tasks t join ops_comms_records r using (order_id)
      where t.kind = 'care_exception' and t.status in ('open','snoozed')), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x order by x->>'updated_at' desc) from
      (select to_jsonb(m) as x from ops_care_messages m order by m.updated_at desc limit 50) q), '[]'::jsonb),
    'queued', coalesce((select jsonb_agg(to_jsonb(m) order by coalesce(m.override_due_at, m.due_at)) from ops_care_messages m
      where m.status = 'scheduled'), '[]'::jsonb)
  );
end $$;

create or replace function public.ops_care_order(p_email text, p_order_id text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc)
    from ops_care_messages m where m.order_id = p_order_id), '[]'::jsonb);
end $$;

create or replace function public.ops_care_sender_get(p_actor text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return (select to_jsonb(x) from ops_care_sender x where id = 1);
end $$;

create or replace function public.ops_care_active_content(p_actor text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return jsonb_build_object(
    'templates', coalesce((select jsonb_object_agg(t.key, to_jsonb(t)) from ops_care_templates t where t.active), '{}'::jsonb),
    'pdf', (select to_jsonb(a) - 'content_base64' from ops_care_assets a where a.kind = 'logistics_blank_pdf' and a.active),
    'signature', (select to_jsonb(a) - 'content_base64' from ops_care_assets a where a.kind = 'care_signature' and a.active)
  );
end $$;

-- The PDF bytes, fetched only at send time.
create or replace function public.ops_care_pdf_content(p_actor text, p_version integer) returns text
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return (select content_base64 from ops_care_assets where kind = 'logistics_blank_pdf' and version = p_version);
end $$;

create or replace function public.ops_care_record_get(p_actor text, p_order_id text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return (select to_jsonb(r) from ops_comms_records r where order_id = p_order_id);
end $$;

-- Settings and sender ------------------------------------------------------

create or replace function public.ops_care_save_settings(
  p_email text, p_settings jsonb, p_expected_updated_at timestamptz
) returns jsonb language plpgsql set search_path = public as $$
declare v_old ops_care_settings%rowtype; v_new ops_care_settings%rowtype; v_in ops_care_settings%rowtype;
begin
  perform ops_check_user(p_email);
  select * into v_old from ops_care_settings where id = 1 for update;
  if v_old.updated_at is distinct from p_expected_updated_at then
    raise exception 'Automation settings changed. Reload before saving.' using errcode = '40001';
  end if;
  v_in := jsonb_populate_record(v_old, p_settings);
  update ops_care_settings set mode = v_in.mode, global_pause = v_in.global_pause,
    live_rules = v_in.live_rules, intake_started_at = v_in.intake_started_at,
    intake_cursor = v_in.intake_cursor, timezone = v_in.timezone, send_hour = v_in.send_hour,
    business_days = v_in.business_days, holidays = v_in.holidays,
    test_recipients = v_in.test_recipients, test_order_ids = v_in.test_order_ids,
    excluded_item_patterns = v_in.excluded_item_patterns, from_name = v_in.from_name,
    reply_to = v_in.reply_to, updated_by = p_email, updated_at = clock_timestamp()
  where id = 1 returning * into v_new;
  return to_jsonb(v_new);
end $$;

-- Leaving test mode clears every test override, and nothing else.
create or replace function public.ops_care_leave_test(p_email text) returns jsonb
language plpgsql set search_path = public as $$
declare v_new ops_care_settings%rowtype;
begin
  perform ops_check_user(p_email);
  update ops_care_messages set override_due_at = null, updated_at = clock_timestamp()
    where override_due_at is not null;
  update ops_comms_records set care_test_recipient = null where care_test_recipient is not null;
  update ops_care_settings set mode = 'off', test_order_ids = '{}', test_recipients = '{}',
    updated_by = p_email, updated_at = clock_timestamp()
    where id = 1 returning * into v_new;
  return to_jsonb(v_new);
end $$;

create or replace function public.ops_care_save_sender(p_email text, p_sender_email text, p_token text, p_scopes text)
returns void language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  if p_email <> p_sender_email then
    raise exception 'Only the sender can connect their own mailbox.';
  end if;
  insert into ops_care_sender(id, email, refresh_token, scopes, send_as_ok, connected_at)
  values (1, p_sender_email, p_token, coalesce(p_scopes, ''), false, now())
  on conflict (id) do update set email = excluded.email, refresh_token = excluded.refresh_token,
    scopes = excluded.scopes, send_as_ok = false, send_as_checked_at = null,
    send_as_problem = null, connected_at = excluded.connected_at;
end $$;

create or replace function public.ops_care_sender_checked(p_actor text, p_ok boolean, p_display_name text, p_problem text)
returns void language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  update ops_care_sender set send_as_ok = p_ok, send_as_display_name = p_display_name,
    send_as_problem = p_problem, send_as_checked_at = now() where id = 1;
end $$;

create or replace function public.ops_care_disconnect_sender(p_email text) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  delete from ops_care_sender where id = 1;
end $$;

-- Templates and assets -------------------------------------------------------

create or replace function public.ops_care_import_template(p_email text, p_template jsonb) returns integer
language plpgsql set search_path = public as $$
declare v_version integer;
begin
  perform ops_check_user(p_email);
  perform pg_advisory_xact_lock(hashtext('ops_care_template:' || (p_template->>'key')));
  select coalesce(max(version), 0) + 1 into v_version from ops_care_templates where key = p_template->>'key';
  insert into ops_care_templates(key, version, subject, body_text, neutral_greeting, source_doc_id,
    source_revision, content_sha256, imported_by)
  values (p_template->>'key', v_version, p_template->>'subject', p_template->>'body_text',
    coalesce(p_template->>'neutral_greeting', ''), coalesce(p_template->>'source_doc_id', ''),
    coalesce(p_template->>'source_revision', ''), p_template->>'content_sha256', p_email);
  return v_version;
end $$;

create or replace function public.ops_care_activate_template(p_email text, p_key text, p_version integer) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  perform pg_advisory_xact_lock(hashtext('ops_care_template:' || p_key));
  if not exists (select 1 from ops_care_templates where key = p_key and version = p_version) then
    raise exception 'Template version not found.';
  end if;
  update ops_care_templates set active = false where key = p_key and active;
  update ops_care_templates set active = true, approved_by = p_email, approved_at = now()
    where key = p_key and version = p_version;
end $$;

create or replace function public.ops_care_save_asset(p_email text, p_asset jsonb) returns integer
language plpgsql set search_path = public as $$
declare v_version integer;
begin
  perform ops_check_user(p_email);
  perform pg_advisory_xact_lock(hashtext('ops_care_asset:' || (p_asset->>'kind')));
  select coalesce(max(version), 0) + 1 into v_version from ops_care_assets where kind = p_asset->>'kind';
  insert into ops_care_assets(kind, version, filename, content_base64, html, text_content, sha256,
    byte_size, page_count, source, uploaded_by)
  values (p_asset->>'kind', v_version, coalesce(p_asset->>'filename', ''), p_asset->>'content_base64',
    p_asset->>'html', p_asset->>'text_content', p_asset->>'sha256',
    coalesce((p_asset->>'byte_size')::integer, 0), (p_asset->>'page_count')::integer,
    coalesce(p_asset->>'source', ''), p_email);
  return v_version;
end $$;

create or replace function public.ops_care_activate_asset(p_email text, p_kind text, p_version integer) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  perform pg_advisory_xact_lock(hashtext('ops_care_asset:' || p_kind));
  if not exists (select 1 from ops_care_assets where kind = p_kind and version = p_version) then
    raise exception 'Asset version not found.';
  end if;
  update ops_care_assets set active = false where kind = p_kind and active;
  update ops_care_assets set active = true, approved_by = p_email, approved_at = now()
    where kind = p_kind and version = p_version;
end $$;

-- Scheduling ---------------------------------------------------------------

-- Queue one email. Idempotent: a second call with the same dedupe key does
-- nothing, unless the earlier row was suppressed/cancelled (for example a
-- pause that has since been lifted), in which case it is queued again.
-- Creates the comms record when the order has none (automatic intake).
create or replace function public.ops_care_schedule(
  p_actor text, p_order_id text, p_order_name text, p_template_key text, p_anchor text,
  p_due_at timestamptz, p_enrolment text
) returns jsonb language plpgsql set search_path = public as $$
declare v_job ops_care_messages%rowtype; v_key text;
begin
  perform ops_care_check_actor(p_actor);
  perform ops_care_lock(p_order_id);
  insert into ops_comms_records(order_id, order_name, updated_by, care_enrolment)
  values (p_order_id, p_order_name, p_actor, coalesce(p_enrolment, 'none'))
  on conflict (order_id) do nothing;
  if p_enrolment is not null then
    update ops_comms_records set care_enrolment = p_enrolment
      where order_id = p_order_id and care_enrolment = 'none';
  end if;
  v_key := format('moderncre8ve.myshopify.com:%s:%s:%s', p_order_id, p_template_key, p_anchor);
  insert into ops_care_messages(order_id, order_name, template_key, anchor, dedupe_key, due_at, created_by)
  values (p_order_id, p_order_name, p_template_key, p_anchor, v_key, p_due_at, p_actor)
  on conflict (dedupe_key) do update set status = 'scheduled', due_at = excluded.due_at,
    outcome_note = '', updated_at = clock_timestamp()
    where ops_care_messages.status in ('suppressed','cancelled')
  returning * into v_job;
  if v_job.id is null then
    return null;
  end if;
  perform ops_care_event(p_order_id, 'care_email_queued', 'internal', null,
    format('%s queued for %s.', p_template_key, to_char(p_due_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI "UTC"')),
    null, jsonb_build_object('message_id', v_job.id, 'template', p_template_key, 'due_at', p_due_at), p_actor);
  return to_jsonb(v_job);
end $$;

-- Reminder candidates: enrolled orders awaiting the form with a known next
-- date and no live CARE-02 for that date. Unknown dates never qualify.
create or replace function public.ops_care_plan_candidates(p_actor text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return coalesce((select jsonb_agg(jsonb_build_object('order_id', r.order_id, 'order_name', r.order_name,
      'reminder_next_due_on', r.reminder_next_due_on))
    from ops_comms_records r
    where r.care_enrolment in ('auto','manual') and not r.care_excluded
      and r.logistics_status = 'awaiting_return' and r.reminders_enabled and not r.reminders_paused
      and r.reminder_next_due_on is not null
      and not exists (select 1 from ops_care_messages m where m.order_id = r.order_id
        and m.template_key = 'CARE-02' and m.anchor = r.reminder_next_due_on::text
        and m.status not in ('suppressed','cancelled'))), '[]'::jsonb);
end $$;

create or replace function public.ops_care_due(p_actor text, p_now timestamptz, p_limit integer, p_order_id text)
returns jsonb language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return coalesce((select jsonb_agg(to_jsonb(m) order by coalesce(m.override_due_at, m.due_at))
    from (select * from ops_care_messages
      where status = 'scheduled' and coalesce(override_due_at, due_at) <= p_now
        and (p_order_id is null or order_id = p_order_id)
      order by coalesce(override_due_at, due_at) limit greatest(p_limit, 0)) m), '[]'::jsonb);
end $$;

-- Per-order controls from the order page.
create or replace function public.ops_care_set_order(
  p_email text, p_order_id text, p_order_name text, p_change jsonb
) returns jsonb language plpgsql set search_path = public as $$
declare v_settings ops_care_settings%rowtype; v_rec ops_comms_records%rowtype; v_to text;
begin
  perform ops_check_user(p_email);
  perform ops_care_lock(p_order_id);
  select * into v_settings from ops_care_settings where id = 1;
  insert into ops_comms_records(order_id, order_name, updated_by)
  values (p_order_id, p_order_name, p_email) on conflict (order_id) do nothing;
  if p_change ? 'care_test_recipient' then
    v_to := nullif(lower(trim(p_change->>'care_test_recipient')), '');
    if v_to is not null and (not (p_order_id = any(v_settings.test_order_ids))
        or not (v_to = any(v_settings.test_recipients))) then
      raise exception 'A test recipient needs an approved test order and an allowlisted address.';
    end if;
    update ops_comms_records set care_test_recipient = v_to where order_id = p_order_id;
  end if;
  if p_change ? 'care_excluded' then
    update ops_comms_records set care_excluded = (p_change->>'care_excluded')::boolean,
      updated_by = p_email, updated_at = clock_timestamp() where order_id = p_order_id;
  end if;
  if p_change ? 'care_paused_until' then
    update ops_comms_records set care_paused_until = nullif(p_change->>'care_paused_until', '')::date
      where order_id = p_order_id;
  end if;
  if p_change ? 'care_enrolment' then
    update ops_comms_records set care_enrolment = p_change->>'care_enrolment' where order_id = p_order_id;
  end if;
  if p_change ? 'reminders_enabled' then
    update ops_comms_records set reminders_enabled = (p_change->>'reminders_enabled')::boolean,
      reminders_paused = false, updated_by = p_email, updated_at = clock_timestamp()
      where order_id = p_order_id;
  end if;
  -- Bump the version so a send decided before this change is refused.
  update ops_comms_records set updated_by = p_email, updated_at = clock_timestamp() where order_id = p_order_id;
  perform ops_care_event(p_order_id, 'care_settings', 'internal', null,
    coalesce(p_change->>'summary', 'Automated email settings changed.'), null, p_change - 'summary', p_email);
  select * into v_rec from ops_comms_records where order_id = p_order_id;
  return to_jsonb(v_rec);
end $$;

-- Release, retry, cancel or (test orders only) make due now.
create or replace function public.ops_care_job_action(p_email text, p_job_id uuid, p_action text)
returns jsonb language plpgsql set search_path = public as $$
declare v_job ops_care_messages%rowtype; v_settings ops_care_settings%rowtype;
begin
  perform ops_check_user(p_email);
  select * into v_job from ops_care_messages where id = p_job_id;
  if v_job.id is null then raise exception 'Email not found.'; end if;
  perform ops_care_lock(v_job.order_id);
  select * into v_job from ops_care_messages where id = p_job_id for update;
  select * into v_settings from ops_care_settings where id = 1;
  if p_action = 'release' and v_job.status = 'held' then
    update ops_care_messages set status = 'scheduled', outcome_note = '', updated_at = clock_timestamp() where id = p_job_id;
  elsif p_action = 'retry' and v_job.status = 'failed' then
    update ops_care_messages set status = 'scheduled', override_due_at = null, outcome_note = 'Retry requested by ' || p_email,
      reconcile_attempts = 0, updated_at = clock_timestamp() where id = p_job_id;
  elsif p_action = 'cancel' and v_job.status in ('scheduled','held','failed') then
    update ops_care_messages set status = 'cancelled', outcome_note = 'Cancelled by ' || p_email,
      override_due_at = null, updated_at = clock_timestamp() where id = p_job_id;
  elsif p_action = 'make_due' and v_job.status = 'scheduled' then
    if v_settings.mode <> 'test' or not (v_job.order_id = any(v_settings.test_order_ids)) then
      raise exception 'Only approved test orders in test mode can be made due early.';
    end if;
    update ops_care_messages set override_due_at = now(), updated_at = clock_timestamp() where id = p_job_id;
  else
    raise exception 'That can''t be done while the email is %.', v_job.status;
  end if;
  perform ops_care_event(v_job.order_id, 'care_email_action', 'internal', null,
    format('%s: %s by %s.', v_job.template_key, replace(p_action, '_', ' '), p_email), null,
    jsonb_build_object('message_id', v_job.id), p_email);
  select * into v_job from ops_care_messages where id = p_job_id;
  return to_jsonb(v_job);
end $$;

-- Sending ------------------------------------------------------------------

-- Claim one due job. The app has already decided it may be sent, from the
-- record and settings at the versions passed here; if either changed since,
-- the claim is refused and the next tick decides again.
create or replace function public.ops_care_claim(
  p_actor text, p_job_id uuid, p_record_updated_at timestamptz, p_settings_updated_at timestamptz,
  p_lease_until timestamptz
) returns jsonb language plpgsql set search_path = public as $$
declare v_job ops_care_messages%rowtype; v_order text;
begin
  perform ops_care_check_actor(p_actor);
  select order_id into v_order from ops_care_messages where id = p_job_id;
  if v_order is null then return null; end if;
  perform ops_care_lock(v_order);
  select * into v_job from ops_care_messages where id = p_job_id for update skip locked;
  if v_job.id is null or v_job.status <> 'scheduled' then return null; end if;
  if (select updated_at from ops_comms_records where order_id = v_order) is distinct from p_record_updated_at
     or (select updated_at from ops_care_settings where id = 1) is distinct from p_settings_updated_at then
    return null;
  end if;
  update ops_care_messages set status = 'sending', attempts = attempts + 1, lease_until = p_lease_until,
    last_attempt_at = clock_timestamp(),
    rfc822_message_id = format('<care-%s-%s@moderncre8ve.com>', id, attempts + 1),
    updated_at = clock_timestamp()
  where id = p_job_id returning * into v_job;
  return to_jsonb(v_job);
end $$;

-- Last check before Gmail. If anything changed, the job goes back to the
-- queue (nothing was sent) for the next tick to decide again.
create or replace function public.ops_care_confirm(
  p_actor text, p_job_id uuid, p_record_updated_at timestamptz, p_settings_updated_at timestamptz
) returns boolean language plpgsql set search_path = public as $$
declare v_job ops_care_messages%rowtype;
begin
  perform ops_care_check_actor(p_actor);
  select * into v_job from ops_care_messages where id = p_job_id;
  perform ops_care_lock(v_job.order_id);
  select * into v_job from ops_care_messages where id = p_job_id for update;
  if v_job.status <> 'sending' or v_job.lease_until < clock_timestamp() then return false; end if;
  if (select updated_at from ops_comms_records where order_id = v_job.order_id) is distinct from p_record_updated_at
     or (select updated_at from ops_care_settings where id = 1) is distinct from p_settings_updated_at then
    update ops_care_messages set status = 'scheduled', lease_until = null,
      outcome_note = 'Order or settings changed just before sending; re-checking.', updated_at = clock_timestamp()
      where id = p_job_id;
    return false;
  end if;
  return true;
end $$;

-- Hold, suppress or requeue a job the app decided not to send (nothing was
-- sent). A hold opens a care_exception task for Haven.
create or replace function public.ops_care_set_status(
  p_actor text, p_job_id uuid, p_status text, p_reason text, p_snapshot jsonb
) returns void language plpgsql set search_path = public as $$
declare v_job ops_care_messages%rowtype;
begin
  perform ops_care_check_actor(p_actor);
  select * into v_job from ops_care_messages where id = p_job_id;
  perform ops_care_lock(v_job.order_id);
  select * into v_job from ops_care_messages where id = p_job_id for update;
  if p_status not in ('held','suppressed','scheduled') or v_job.status not in ('scheduled','sending') then
    raise exception 'Can''t mark a % email %.', v_job.status, p_status;
  end if;
  update ops_care_messages set status = p_status, outcome_note = left(coalesce(p_reason, ''), 2000),
    lease_until = null, snapshot = coalesce(p_snapshot, snapshot), updated_at = clock_timestamp()
    where id = p_job_id;
  if p_status = 'held' then
    perform ops_care_exception_task(v_job.order_id,
      format('Automated %s held: %s', v_job.template_key, p_reason), p_actor);
    perform ops_care_event(v_job.order_id, 'care_email_held', 'internal', null,
      format('%s not sent: %s', v_job.template_key, p_reason), null,
      jsonb_build_object('message_id', v_job.id), p_actor);
  elsif p_status = 'suppressed' then
    perform ops_care_event(v_job.order_id, 'care_email_suppressed', 'internal', null,
      format('%s cancelled before sending: %s.', v_job.template_key, p_reason), null,
      jsonb_build_object('message_id', v_job.id), p_actor);
  end if;
end $$;

-- Record what Gmail said. Accepted always marks the job accepted and logs the
-- send (it did go out). The order record is only moved forward if it is still
-- in the state the send assumed: a receipt recorded while Gmail was sending
-- is never undone, and no further reminder is planned.
create or replace function public.ops_care_record_outcome(
  p_actor text, p_job_id uuid, p_outcome jsonb, p_sent_on date, p_next_due_on date
) returns jsonb language plpgsql set search_path = public as $$
declare v_job ops_care_messages%rowtype; v_rec ops_comms_records%rowtype; v_status text;
  v_applied boolean := false; v_at timestamptz; v_note text;
begin
  perform ops_care_check_actor(p_actor);
  select * into v_job from ops_care_messages where id = p_job_id;
  perform ops_care_lock(v_job.order_id);
  select * into v_job from ops_care_messages where id = p_job_id for update;
  if v_job.status not in ('sending','uncertain') then
    raise exception 'Outcome for an email that is %.', v_job.status;
  end if;
  v_status := p_outcome->>'status';
  v_note := left(coalesce(p_outcome->>'note', ''), 2000);
  if v_status = 'accepted' then
    v_at := coalesce((p_outcome->>'accepted_at')::timestamptz, clock_timestamp());
    select * into v_rec from ops_comms_records where order_id = v_job.order_id for update;
    if v_job.template_key = 'CARE-01' and v_rec.logistics_status = 'not_requested' and not v_rec.care_excluded then
      update ops_comms_records set logistics_status = 'awaiting_return', logistics_requested_on = p_sent_on,
        logistics_requested_at = v_at, reminders_enabled = true, reminders_paused = false,
        reminder_next_due_on = p_next_due_on, updated_by = p_actor, updated_at = clock_timestamp()
        where order_id = v_job.order_id;
      v_applied := true;
    elsif v_job.template_key = 'CARE-02' and v_rec.logistics_status = 'awaiting_return'
        and v_rec.reminders_enabled and not v_rec.reminders_paused and not v_rec.care_excluded then
      update ops_comms_records set reminder_last_sent_on = p_sent_on, reminder_last_sent_at = v_at,
        reminder_next_due_on = p_next_due_on, updated_by = p_actor, updated_at = clock_timestamp()
        where order_id = v_job.order_id;
      v_applied := true;
    end if;
    update ops_care_messages set status = 'accepted', accepted_at = v_at, lease_until = null,
      provider_message_id = p_outcome->>'provider_message_id', provider_thread_id = p_outcome->>'provider_thread_id',
      snapshot = coalesce(p_outcome->'snapshot', snapshot),
      outcome_note = case when v_applied then v_note
        else 'Accepted by Gmail after the order changed (for example, the form receipt was recorded while sending). Status left as recorded; no further reminder planned.' end,
      updated_at = clock_timestamp()
      where id = p_job_id;
    perform ops_care_event(v_job.order_id, 'care_email_sent', 'outgoing', p_sent_on,
      format('%s %s accepted by Gmail%s.', v_job.template_key,
        case v_job.template_key when 'CARE-01' then 'Delivery logistics request' else 'Logistics reminder' end,
        case when v_applied then '' else ' after the form receipt was recorded' end),
      p_outcome->>'gmail_url',
      jsonb_build_object('message_id', v_job.id, 'template', v_job.template_key, 'accepted_at', v_at,
        'provider_message_id', p_outcome->>'provider_message_id', 'provider_thread_id', p_outcome->>'provider_thread_id',
        'rfc822_message_id', v_job.rfc822_message_id, 'record_updated', v_applied)
        || coalesce(p_outcome->'snapshot', '{}'::jsonb),
      p_actor);
  elsif v_status = 'failed' then
    update ops_care_messages set status = 'failed', lease_until = null, outcome_note = v_note,
      snapshot = coalesce(p_outcome->'snapshot', snapshot), updated_at = clock_timestamp() where id = p_job_id;
    perform ops_care_exception_task(v_job.order_id,
      format('Automated %s failed: %s', v_job.template_key, v_note), p_actor);
    perform ops_care_event(v_job.order_id, 'care_email_failed', 'internal', null,
      format('%s failed: %s', v_job.template_key, v_note), null, jsonb_build_object('message_id', v_job.id), p_actor);
  elsif v_status = 'uncertain' then
    update ops_care_messages set status = 'uncertain', lease_until = null, outcome_note = v_note,
      snapshot = coalesce(p_outcome->'snapshot', snapshot), updated_at = clock_timestamp() where id = p_job_id;
    perform ops_care_event(v_job.order_id, 'care_email_uncertain', 'internal', null,
      format('%s outcome uncertain (%s). Checking Gmail Sent before anything is resent.', v_job.template_key, v_note),
      null, jsonb_build_object('message_id', v_job.id), p_actor);
  else
    raise exception 'Unknown outcome %.', v_status;
  end if;
  select * into v_job from ops_care_messages where id = p_job_id;
  return to_jsonb(v_job);
end $$;

-- A worker that died mid-send leaves a lease behind. That job may have gone
-- out, so it becomes uncertain (reconciled), never back to queued.
create or replace function public.ops_care_expire_leases(p_actor text, p_now timestamptz) returns integer
language plpgsql set search_path = public as $$
declare v_count integer;
begin
  perform ops_care_check_actor(p_actor);
  update ops_care_messages set status = 'uncertain', lease_until = null,
    outcome_note = 'The sending worker stopped before recording an outcome.', updated_at = clock_timestamp()
    where status = 'sending' and lease_until < p_now;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.ops_care_uncertain(p_actor text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  return coalesce((select jsonb_agg(to_jsonb(m)) from ops_care_messages m where status = 'uncertain'), '[]'::jsonb);
end $$;

create or replace function public.ops_care_reconcile_miss(p_actor text, p_job_id uuid, p_give_up boolean)
returns void language plpgsql set search_path = public as $$
declare v_job ops_care_messages%rowtype;
begin
  perform ops_care_check_actor(p_actor);
  select * into v_job from ops_care_messages where id = p_job_id;
  perform ops_care_lock(v_job.order_id);
  update ops_care_messages set reconcile_attempts = reconcile_attempts + 1, updated_at = clock_timestamp()
    where id = p_job_id and status = 'uncertain';
  if p_give_up then
    update ops_care_messages set status = 'failed',
      outcome_note = 'Not found in Gmail Sent after reconciliation. Use Retry only after checking Gmail.',
      updated_at = clock_timestamp() where id = p_job_id and status = 'uncertain';
    perform ops_care_exception_task(v_job.order_id,
      format('Automated %s may not have sent: check Gmail Sent, then Retry or Cancel', v_job.template_key), p_actor);
  end if;
end $$;

create or replace function public.ops_care_heartbeat(p_actor text, p_result jsonb) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_care_check_actor(p_actor);
  -- updated_at is deliberately untouched: a heartbeat must not invalidate claims.
  update ops_care_settings set last_tick_at = now(), last_tick_result = p_result where id = 1;
end $$;

-- Advance the intake cursor only from the value the scan started with.
create or replace function public.ops_care_advance_cursor(p_actor text, p_expected timestamptz, p_new timestamptz)
returns boolean language plpgsql set search_path = public as $$
declare v_count integer;
begin
  perform ops_care_check_actor(p_actor);
  update ops_care_settings set intake_cursor = p_new
    where id = 1 and intake_cursor is not distinct from p_expected and p_new >= coalesce(intake_cursor, p_new);
  get diagnostics v_count = row_count;
  return v_count = 1;
end $$;

-- Only the server-side secret/service role may use these tables and functions.
do $$ declare t text; f record; begin
  foreach t in array array['ops_care_settings','ops_care_sender','ops_care_templates','ops_care_assets','ops_care_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  for f in select oid::regprocedure as signature from pg_proc
    where pronamespace = 'public'::regnamespace and proname like 'ops\_care\_%' escape '\' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
commit;
