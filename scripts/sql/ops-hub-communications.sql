-- Customer Communications (phase A: manual tracking; nothing is sent).
-- Run in the Ops Supabase SQL editor AFTER ops-hub.sql, BEFORE deploying the
-- matching app change. One transaction; safe to reapply.
--
-- Orders are keyed by the immutable Shopify order ID (legacy numeric ID, as
-- used in /ops/orders/<id>). Customer names and emails are NOT copied here;
-- they are read live from Shopify. Rules (statuses, reminders, which tasks to
-- open) live in app/utils/ops-comms.js; these functions enforce identity,
-- atomicity, optimistic concurrency and one open task per kind.
begin;

-- Shared production stage, read by Current orders and Communications.
-- Only ops_save_production writes it; no communications action does.
create table if not exists public.ops_production_records (
  order_id text primary key check (order_id ~ '^[0-9]{1,20}$'),
  order_name text not null check (length(order_name) between 1 and 40),
  stage text not null check (length(stage) between 1 and 40),
  stage_confirmed_on date,
  stage_source text not null default '' check (length(stage_source) <= 200),
  estimate_weeks integer check (estimate_weeks between 1 and 52),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_comms_records (
  order_id text primary key check (order_id ~ '^[0-9]{1,20}$'),
  order_name text not null check (length(order_name) between 1 and 40),
  logistics_status text not null default 'not_requested' check (logistics_status in
    ('not_requested','awaiting_return','received_needs_review','needs_clarification','ready_for_carrier')),
  logistics_requested_on date,
  logistics_received_on date,
  logistics_reviewed_by text,
  logistics_reviewed_at timestamptz,
  logistics_notes text not null default '' check (length(logistics_notes) <= 2000),
  form_version integer not null default 0 check (form_version >= 0),
  delivery_provider text not null default '' check (length(delivery_provider) <= 120),
  carrier_shared_on date,
  reminders_enabled boolean not null default false,
  reminders_paused boolean not null default false,
  reminder_last_sent_on date,
  reminder_next_due_on date,
  created_at timestamptz not null default now(),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

-- Append-only timeline. occurred_on is the real date when known (null =
-- unknown); created_at is when it was entered.
create table if not exists public.ops_comms_events (
  id bigint generated always as identity primary key,
  order_id text not null references public.ops_comms_records(order_id),
  kind text not null check (length(kind) between 1 and 40),
  direction text not null check (direction in ('outgoing','incoming','internal')),
  occurred_on date,
  summary text not null check (length(summary) between 1 and 2000),
  evidence_url text check (evidence_url is null or (evidence_url like 'https://%' and length(evidence_url) <= 2000)),
  details jsonb not null default '{}'::jsonb,
  actor text not null,
  created_at timestamptz not null default now()
);
create index if not exists ops_comms_events_order_idx on public.ops_comms_events(order_id, created_at desc);

create table if not exists public.ops_comms_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.ops_comms_records(order_id),
  kind text not null check (kind in ('reply','update','logistics_review','missing_evidence','logistics_clarification','follow_up','other')),
  title text not null check (length(title) between 1 and 500),
  owner_email text not null check (owner_email in ('rob@moderncre8ve.com','haven@moderncre8ve.com')),
  status text not null default 'open' check (status in ('open','snoozed','done','cancelled')),
  due_on date,
  note text not null default '' check (length(note) <= 2000),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_by text not null,
  updated_at timestamptz not null default now()
);
-- Deduplication: at most one unfinished task per order and kind ("other" excepted).
create unique index if not exists ops_comms_tasks_one_open
  on public.ops_comms_tasks(order_id, kind)
  where status in ('open','snoozed') and kind <> 'other';

create or replace function public.ops_comms_overview(p_email text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  return jsonb_build_object(
    'records', coalesce((select jsonb_agg(to_jsonb(r)) from ops_comms_records r), '[]'::jsonb),
    'production', coalesce((select jsonb_agg(to_jsonb(p)) from ops_production_records p), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('order_name', r.order_name) order by t.due_on nulls last)
      from ops_comms_tasks t join ops_comms_records r using (order_id)
      where t.status in ('open','snoozed')), '[]'::jsonb),
    'last', coalesce((select jsonb_agg(to_jsonb(l)) from (
        select order_id,
          max(occurred_on) filter (where direction = 'outgoing') as last_outgoing,
          max(occurred_on) filter (where direction = 'incoming') as last_incoming,
          coalesce(bool_or(occurred_on is null) filter (where direction = 'outgoing'), false) as undated_outgoing,
          coalesce(bool_or(occurred_on is null) filter (where direction = 'incoming'), false) as undated_incoming
        from ops_comms_events group by order_id) l), '[]'::jsonb)
  );
end $$;

create or replace function public.ops_comms_detail(p_email text, p_order_id text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  return jsonb_build_object(
    'record', (select to_jsonb(r) from ops_comms_records r where order_id = p_order_id),
    'production', (select to_jsonb(p) from ops_production_records p where order_id = p_order_id),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc, e.id desc)
      from ops_comms_events e where order_id = p_order_id), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by (t.status in ('open','snoozed')) desc, t.due_on nulls last, t.updated_at desc)
      from ops_comms_tasks t where order_id = p_order_id), '[]'::jsonb)
  );
end $$;

-- Atomically: check the record hasn't changed, write its next state, append
-- events, close tasks by kind, then open tasks (skipping ones already open).
create or replace function public.ops_comms_apply(
  p_email text, p_order_id text, p_order_name text, p_expected_updated_at timestamptz,
  p_record jsonb, p_events jsonb, p_open_tasks jsonb, p_close_task_kinds text[]
) returns jsonb language plpgsql set search_path = public as $$
declare v_old ops_comms_records%rowtype; v_new ops_comms_records%rowtype; v_in ops_comms_records%rowtype; e jsonb; t jsonb;
begin
  perform ops_check_user(p_email);
  perform pg_advisory_xact_lock(hashtext('ops_comms:' || p_order_id));
  select * into v_old from ops_comms_records where order_id = p_order_id for update;
  if v_old.order_id is not null and v_old.updated_at is distinct from p_expected_updated_at then
    raise exception 'This order changed. Reload before saving.' using errcode = '40001';
  end if;
  if v_old.order_id is null and p_expected_updated_at is not null then
    raise exception 'This order changed. Reload before saving.' using errcode = '40001';
  end if;
  v_in := jsonb_populate_record(null::ops_comms_records, p_record);
  insert into ops_comms_records as r (
    order_id, order_name, logistics_status, logistics_requested_on, logistics_received_on,
    logistics_reviewed_by, logistics_reviewed_at, logistics_notes, form_version, delivery_provider,
    carrier_shared_on, reminders_enabled, reminders_paused, reminder_last_sent_on, reminder_next_due_on,
    updated_by, updated_at
  ) values (
    p_order_id, p_order_name, coalesce(v_in.logistics_status, 'not_requested'), v_in.logistics_requested_on, v_in.logistics_received_on,
    v_in.logistics_reviewed_by, v_in.logistics_reviewed_at, coalesce(v_in.logistics_notes, ''), coalesce(v_in.form_version, 0), coalesce(v_in.delivery_provider, ''),
    v_in.carrier_shared_on, coalesce(v_in.reminders_enabled, false), coalesce(v_in.reminders_paused, false), v_in.reminder_last_sent_on, v_in.reminder_next_due_on,
    p_email, clock_timestamp()
  ) on conflict (order_id) do update set
    order_name = excluded.order_name, logistics_status = excluded.logistics_status,
    logistics_requested_on = excluded.logistics_requested_on, logistics_received_on = excluded.logistics_received_on,
    logistics_reviewed_by = excluded.logistics_reviewed_by, logistics_reviewed_at = excluded.logistics_reviewed_at,
    logistics_notes = excluded.logistics_notes, form_version = excluded.form_version,
    delivery_provider = excluded.delivery_provider, carrier_shared_on = excluded.carrier_shared_on,
    reminders_enabled = excluded.reminders_enabled, reminders_paused = excluded.reminders_paused,
    reminder_last_sent_on = excluded.reminder_last_sent_on, reminder_next_due_on = excluded.reminder_next_due_on,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at
  returning * into v_new;
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    insert into ops_comms_events(order_id, kind, direction, occurred_on, summary, evidence_url, details, actor)
    values (p_order_id, e->>'kind', e->>'direction', (e->>'occurred_on')::date, e->>'summary',
      nullif(e->>'evidence_url', ''), coalesce(e->'details', '{}'::jsonb), p_email);
  end loop;
  if coalesce(array_length(p_close_task_kinds, 1), 0) > 0 then
    update ops_comms_tasks set status = 'done', note = case when note = '' then 'Resolved by a later update.' else note end,
      updated_by = p_email, updated_at = clock_timestamp()
    where order_id = p_order_id and kind = any(p_close_task_kinds) and status in ('open','snoozed');
  end if;
  for t in select * from jsonb_array_elements(coalesce(p_open_tasks, '[]'::jsonb)) loop
    insert into ops_comms_tasks(order_id, kind, title, owner_email, due_on, created_by, updated_by)
    values (p_order_id, t->>'kind', t->>'title', coalesce(t->>'owner_email', 'haven@moderncre8ve.com'),
      (t->>'due_on')::date, p_email, p_email)
    on conflict (order_id, kind) where status in ('open','snoozed') and kind <> 'other' do nothing;
  end loop;
  return to_jsonb(v_new);
end $$;

create or replace function public.ops_comms_update_task(
  p_email text, p_id uuid, p_status text, p_due_on date, p_owner_email text, p_note text, p_expected_updated_at timestamptz
) returns jsonb language plpgsql set search_path = public as $$
declare v_old ops_comms_tasks%rowtype; v_new ops_comms_tasks%rowtype;
begin
  perform ops_check_user(p_email);
  select * into v_old from ops_comms_tasks where id = p_id for update;
  if v_old.id is null or v_old.updated_at is distinct from p_expected_updated_at then
    raise exception 'Task changed. Reload before saving.' using errcode = '40001';
  end if;
  if p_status in ('done','cancelled') and trim(coalesce(p_note, '')) = '' then
    raise exception 'Say how it was resolved.';
  end if;
  update ops_comms_tasks set status = p_status, due_on = p_due_on, owner_email = p_owner_email,
    note = coalesce(p_note, ''), updated_by = p_email, updated_at = clock_timestamp()
  where id = p_id returning * into v_new;
  insert into ops_comms_events(order_id, kind, direction, summary, details, actor)
  values (v_new.order_id, 'task', 'internal',
    left(format('Task "%s" → %s%s', v_new.title, v_new.status, case when v_new.note <> '' then ': ' || v_new.note else '' end), 2000),
    jsonb_build_object('task_id', v_new.id), p_email);
  return to_jsonb(v_new);
end $$;

create or replace function public.ops_save_production(
  p_email text, p_order_id text, p_order_name text, p_stage text, p_confirmed_on date,
  p_source text, p_estimate_weeks integer, p_expected_updated_at timestamptz
) returns jsonb language plpgsql set search_path = public as $$
declare v_old ops_production_records%rowtype; v_new ops_production_records%rowtype;
begin
  perform ops_check_user(p_email);
  -- Serialise per order so two first saves can't both pass the "no row yet" check.
  perform pg_advisory_xact_lock(hashtext('ops_production:' || p_order_id));
  select * into v_old from ops_production_records where order_id = p_order_id for update;
  if (v_old.order_id is null) <> (p_expected_updated_at is null)
     or (v_old.order_id is not null and v_old.updated_at is distinct from p_expected_updated_at) then
    raise exception 'Production stage changed. Reload before saving.' using errcode = '40001';
  end if;
  insert into ops_production_records as p values (p_order_id, p_order_name, p_stage, p_confirmed_on,
    coalesce(p_source, ''), p_estimate_weeks, p_email, clock_timestamp())
  on conflict (order_id) do update set order_name = excluded.order_name, stage = excluded.stage,
    stage_confirmed_on = excluded.stage_confirmed_on, stage_source = excluded.stage_source,
    estimate_weeks = excluded.estimate_weeks, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  returning * into v_new;
  return to_jsonb(v_new);
end $$;

-- Only the server-side secret/service role may use these tables and functions.
do $$ declare t text; f record; begin
  foreach t in array array['ops_production_records','ops_comms_records','ops_comms_events','ops_comms_tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  for f in select oid::regprocedure as signature from pg_proc
    where pronamespace = 'public'::regnamespace and (proname like 'ops\_comms\_%' escape '\' or proname = 'ops_save_production') loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
grant usage, select on sequence public.ops_comms_events_id_seq to service_role;
commit;
