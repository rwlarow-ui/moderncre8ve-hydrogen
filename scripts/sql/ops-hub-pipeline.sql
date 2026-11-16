-- Sales pipeline (ADR-0009, phase 1: manual tracking; nothing is sent).
-- Run in the Ops Supabase SQL editor AFTER ops-hub.sql, BEFORE deploying the
-- matching app change. One transaction; safe to reapply.
--
-- A deal belongs to a Shopify customer, keyed by the immutable legacy
-- customer ID. Names, emails and phones are NOT copied here; they are read
-- live from Shopify. Rules (stages, which tasks to open or close, the board)
-- live in app/utils/ops-pipeline.js; these functions enforce identity,
-- atomicity, optimistic concurrency and one open task per kind.
begin;

create table if not exists public.ops_deals (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null check (customer_id ~ '^[0-9]{1,20}$'),
  title text not null check (length(title) between 1 and 200),
  deal_type text not null default 'custom' check (deal_type in ('retail','custom','trade','wholesale','other')),
  stage text not null default 'new' check (stage in
    ('new','contacted','discovery','measured','design_sent','maker_quote','quote_sent','won','lost','on_hold')),
  owner_email text not null check (owner_email in ('rob@moderncre8ve.com','haven@moderncre8ve.com')),
  source text not null default 'other' check (source in
    ('contact_form','piece_request','trade_form','email','phone','referral','in_person','asana','other')),
  estimated_value numeric(12,2) check (estimated_value is null or estimated_value >= 0),
  next_step text not null default '' check (length(next_step) <= 500),
  next_step_due date,
  lost_reason text not null default '' check (length(lost_reason) <= 500),
  closed_on date,
  stage_changed_at timestamptz not null default now(),
  -- Phase 3 (Shopify quotes) fills these; nullable until then.
  shopify_draft_order_id text check (shopify_draft_order_id is null or shopify_draft_order_id ~ '^[0-9]{1,20}$'),
  shopify_order_id text check (shopify_order_id is null or shopify_order_id ~ '^[0-9]{1,20}$'),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_by text not null,
  updated_at timestamptz not null default now()
);
create index if not exists ops_deals_customer_idx on public.ops_deals(customer_id);
create index if not exists ops_deals_stage_idx on public.ops_deals(stage);

-- Append-only timeline. occurred_on is the real date when known (null =
-- unknown); created_at is when it was entered.
create table if not exists public.ops_deal_events (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.ops_deals(id),
  kind text not null check (length(kind) between 1 and 40),
  direction text not null check (direction in ('outgoing','incoming','internal')),
  occurred_on date,
  summary text not null check (length(summary) between 1 and 2000),
  evidence_url text check (evidence_url is null or (evidence_url like 'https://%' and length(evidence_url) <= 2000)),
  details jsonb not null default '{}'::jsonb,
  actor text not null,
  created_at timestamptz not null default now()
);
create index if not exists ops_deal_events_deal_idx on public.ops_deal_events(deal_id, created_at desc);

create table if not exists public.ops_deal_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.ops_deals(id),
  kind text not null check (kind in ('reply','follow_up','schedule_visit','send_design','maker_quote','send_quote','other')),
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
-- Deduplication: at most one unfinished task per deal and kind ("other" excepted).
create unique index if not exists ops_deal_tasks_one_open
  on public.ops_deal_tasks(deal_id, kind)
  where status in ('open','snoozed') and kind <> 'other';

create or replace function public.ops_pipeline_overview(p_email text) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  return jsonb_build_object(
    'deals', coalesce((select jsonb_agg(to_jsonb(d)) from ops_deals d), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by t.due_on nulls last)
      from ops_deal_tasks t where t.status in ('open','snoozed')), '[]'::jsonb),
    'last', coalesce((select jsonb_agg(to_jsonb(l)) from (
        select deal_id,
          max(occurred_on) filter (where direction = 'outgoing') as last_outgoing,
          max(occurred_on) filter (where direction = 'incoming') as last_incoming
        from ops_deal_events group by deal_id) l), '[]'::jsonb)
  );
end $$;

create or replace function public.ops_pipeline_detail(p_email text, p_deal_id uuid) returns jsonb
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  return jsonb_build_object(
    'deal', (select to_jsonb(d) from ops_deals d where id = p_deal_id),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc, e.id desc)
      from ops_deal_events e where deal_id = p_deal_id), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by (t.status in ('open','snoozed')) desc, t.due_on nulls last, t.updated_at desc)
      from ops_deal_tasks t where deal_id = p_deal_id), '[]'::jsonb)
  );
end $$;

-- Atomically: create the deal (p_deal_id null) or check it hasn't changed and
-- write its next state, append events, close tasks by kind, then open tasks
-- (skipping kinds already open).
create or replace function public.ops_pipeline_save(
  p_email text, p_deal_id uuid, p_expected_updated_at timestamptz,
  p_deal jsonb, p_events jsonb, p_open_tasks jsonb, p_close_task_kinds text[]
) returns jsonb language plpgsql set search_path = public as $$
declare v_old ops_deals%rowtype; v_new ops_deals%rowtype; v_in ops_deals%rowtype; e jsonb; t jsonb;
begin
  perform ops_check_user(p_email);
  v_in := jsonb_populate_record(null::ops_deals, p_deal);
  if p_deal_id is null then
    if p_expected_updated_at is not null then
      raise exception 'This deal changed. Reload before saving.' using errcode = '40001';
    end if;
    insert into ops_deals (
      customer_id, title, deal_type, stage, owner_email, source, estimated_value,
      next_step, next_step_due, lost_reason, closed_on, created_by, updated_by
    ) values (
      v_in.customer_id, v_in.title, coalesce(v_in.deal_type, 'custom'), coalesce(v_in.stage, 'new'),
      v_in.owner_email, coalesce(v_in.source, 'other'), v_in.estimated_value,
      coalesce(v_in.next_step, ''), v_in.next_step_due, coalesce(v_in.lost_reason, ''), v_in.closed_on,
      p_email, p_email
    ) returning * into v_new;
  else
    select * into v_old from ops_deals where id = p_deal_id for update;
    if v_old.id is null then
      raise exception 'Deal not found.';
    end if;
    if v_old.updated_at is distinct from p_expected_updated_at then
      raise exception 'This deal changed. Reload before saving.' using errcode = '40001';
    end if;
    -- The customer a deal belongs to never changes.
    update ops_deals set
      title = v_in.title, deal_type = v_in.deal_type, stage = v_in.stage,
      owner_email = v_in.owner_email, source = v_in.source, estimated_value = v_in.estimated_value,
      next_step = coalesce(v_in.next_step, ''), next_step_due = v_in.next_step_due,
      lost_reason = coalesce(v_in.lost_reason, ''), closed_on = v_in.closed_on,
      stage_changed_at = case when v_in.stage is distinct from v_old.stage then clock_timestamp() else v_old.stage_changed_at end,
      updated_by = p_email, updated_at = clock_timestamp()
    where id = p_deal_id returning * into v_new;
  end if;
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    insert into ops_deal_events(deal_id, kind, direction, occurred_on, summary, evidence_url, details, actor)
    values (v_new.id, e->>'kind', e->>'direction', (e->>'occurred_on')::date, e->>'summary',
      nullif(e->>'evidence_url', ''), coalesce(e->'details', '{}'::jsonb), p_email);
  end loop;
  if coalesce(array_length(p_close_task_kinds, 1), 0) > 0 then
    update ops_deal_tasks set status = 'done', note = case when note = '' then 'Resolved by a later update.' else note end,
      updated_by = p_email, updated_at = clock_timestamp()
    where deal_id = v_new.id and kind = any(p_close_task_kinds) and status in ('open','snoozed');
  end if;
  for t in select * from jsonb_array_elements(coalesce(p_open_tasks, '[]'::jsonb)) loop
    insert into ops_deal_tasks(deal_id, kind, title, owner_email, due_on, created_by, updated_by)
    values (v_new.id, t->>'kind', t->>'title', coalesce(t->>'owner_email', v_new.owner_email),
      (t->>'due_on')::date, p_email, p_email)
    on conflict (deal_id, kind) where status in ('open','snoozed') and kind <> 'other' do nothing;
  end loop;
  return to_jsonb(v_new);
end $$;

create or replace function public.ops_pipeline_update_task(
  p_email text, p_id uuid, p_status text, p_due_on date, p_owner_email text, p_note text, p_expected_updated_at timestamptz
) returns jsonb language plpgsql set search_path = public as $$
declare v_old ops_deal_tasks%rowtype; v_new ops_deal_tasks%rowtype;
begin
  perform ops_check_user(p_email);
  select * into v_old from ops_deal_tasks where id = p_id for update;
  if v_old.id is null or v_old.updated_at is distinct from p_expected_updated_at then
    raise exception 'Task changed. Reload before saving.' using errcode = '40001';
  end if;
  if p_status in ('done','cancelled') and trim(coalesce(p_note, '')) = '' then
    raise exception 'Say how it was resolved.';
  end if;
  update ops_deal_tasks set status = p_status, due_on = p_due_on, owner_email = p_owner_email,
    note = coalesce(p_note, ''), updated_by = p_email, updated_at = clock_timestamp()
  where id = p_id returning * into v_new;
  insert into ops_deal_events(deal_id, kind, direction, summary, details, actor)
  values (v_new.deal_id, 'task', 'internal',
    left(format('Task "%s" → %s%s', v_new.title, v_new.status, case when v_new.note <> '' then ': ' || v_new.note else '' end), 2000),
    jsonb_build_object('task_id', v_new.id), p_email);
  return to_jsonb(v_new);
end $$;

-- Only the server-side secret/service role may use these tables and functions.
do $$ declare t text; f record; begin
  foreach t in array array['ops_deals','ops_deal_events','ops_deal_tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  for f in select oid::regprocedure as signature from pg_proc
    where pronamespace = 'public'::regnamespace and proname like 'ops\_pipeline\_%' escape '\' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
grant usage, select on sequence public.ops_deal_events_id_seq to service_role;
commit;
