-- Run once in a dedicated Supabase project's SQL editor. Never expose its secret key.
begin;
create table if not exists public.ops_sessions (
  token_hash text primary key, user_email text not null,
  expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.ops_connections (
  user_email text primary key, refresh_token text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.ops_artifacts (
  source_id text primary key, revision integer not null,
  content text not null check (length(content) <= 100000), content_hash text not null,
  source_updated_at timestamptz not null, status text not null check (status in ('current','draft','historical')),
  withdrawn boolean not null default false, published_by text not null,
  published_at timestamptz not null default now()
);
create table if not exists public.ops_artifact_revisions (
  source_id text not null, revision integer not null, document jsonb not null,
  primary key (source_id, revision)
);
create table if not exists public.ops_tasks (
  id uuid primary key default gen_random_uuid(), section text not null,
  title text not null check (length(title) between 1 and 500),
  status text not null check (status in ('todo','in_progress','blocked','done')),
  evidence text not null default '' check (length(evidence) <= 2000),
  owner_email text not null check (owner_email in ('rob@moderncre8ve.com','havenmb@moderncre8ve.com')),
  due_date date,
  updated_by text not null, updated_at timestamptz not null default now()
);
create table if not exists public.ops_task_events (
  id bigint generated always as identity primary key, task_id uuid not null,
  actor text not null, document jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.ops_bridge_clients (
  id uuid primary key default gen_random_uuid(), name text not null,
  redirect_uris jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.ops_bridge_codes (
  code_hash text primary key, client_id uuid not null references public.ops_bridge_clients(id),
  user_email text not null, redirect_uri text not null, challenge text not null,
  resource text not null, scope text not null, expires_at timestamptz not null
);
create table if not exists public.ops_bridge_tokens (
  access_hash text primary key, refresh_hash text unique not null,
  client_id uuid not null references public.ops_bridge_clients(id), user_email text not null,
  resource text not null, scope text not null,
  access_expires_at timestamptz not null, refresh_expires_at timestamptz not null,
  family_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.ops_bridge_refresh_history (
  refresh_hash text primary key, family_id uuid not null,
  client_id uuid not null, resource text not null, expires_at timestamptz not null
);

create or replace function public.ops_check_user(p_email text) returns void
language plpgsql set search_path = public as $$
begin
  if p_email is null or p_email not in ('rob@moderncre8ve.com','havenmb@moderncre8ve.com') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
end $$;
create or replace function public.ops_check_source(p_email text, p_source_id text) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  if p_source_id is null or p_source_id not in ('catalog-todos','catalog-cleanup','december-calendar','seo-visibility','trade-pipeline','daily-dashboard','daybook','brief-2026-11-12','brief-2026-11-01','debt-register','replacing-weaverse','design-system') then
    raise exception 'Unknown source';
  end if;
end $$;
create or replace function public.ops_read_artifacts(p_email text, p_ids text[]) returns setof public.ops_artifacts
language plpgsql set search_path = public as $$
declare v_id text;
begin
  perform ops_check_user(p_email);
  foreach v_id in array p_ids loop perform ops_check_source(p_email,v_id); end loop;
  return query select * from ops_artifacts where source_id = any(p_ids);
end $$;
create or replace function public.ops_publish_artifact(
  p_email text, p_source_id text, p_content text, p_source_updated_at timestamptz,
  p_status text, p_expected_revision integer, p_hash text, p_withdrawn boolean
) returns jsonb language plpgsql set search_path = public as $$
declare v_old ops_artifacts%rowtype; v_new ops_artifacts%rowtype;
begin
  perform ops_check_source(p_email,p_source_id);
  perform pg_advisory_xact_lock(hashtext(p_source_id));
  select * into v_old from ops_artifacts where source_id = p_source_id for update;
  if v_old.content_hash = p_hash and v_old.withdrawn = p_withdrawn then return to_jsonb(v_old); end if;
  if coalesce(v_old.revision,0) <> p_expected_revision then raise exception 'Revision conflict. Read the source again.' using errcode = '40001'; end if;
  if p_source_updated_at > now() + interval '5 minutes' then raise exception 'Future source date'; end if;
  insert into ops_artifacts as a values (p_source_id,coalesce(v_old.revision,0)+1,p_content,p_hash,p_source_updated_at,p_status,p_withdrawn,p_email,now())
  on conflict (source_id) do update set revision=excluded.revision,content=excluded.content,content_hash=excluded.content_hash,source_updated_at=excluded.source_updated_at,status=excluded.status,withdrawn=excluded.withdrawn,published_by=excluded.published_by,published_at=excluded.published_at
  returning * into v_new;
  insert into ops_artifact_revisions values (v_new.source_id,v_new.revision,to_jsonb(v_new));
  return to_jsonb(v_new);
end $$;
create or replace function public.ops_save_connection(p_email text,p_token text) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  insert into ops_connections values (p_email,p_token,now()) on conflict(user_email) do update set refresh_token=excluded.refresh_token,updated_at=now();
end $$;
create or replace function public.ops_read_tasks(p_email text,p_section text) returns setof public.ops_tasks
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  return query select * from ops_tasks where section=p_section order by updated_at desc;
end $$;
create or replace function public.ops_save_task(p_email text,p_section text,p_id uuid,p_title text,p_status text,p_evidence text,p_expected_updated_at timestamptz,p_owner_email text,p_due_date date) returns jsonb
language plpgsql set search_path = public as $$
declare v_old ops_tasks%rowtype; v_new ops_tasks%rowtype;
begin
  perform ops_check_user(p_email);
  if p_section not in ('daily','catalog','marketing','sales','tech','brand') then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_status='done' and trim(p_evidence)='' then raise exception 'Completion needs evidence'; end if;
  if p_id is not null then
    select * into v_old from ops_tasks where id=p_id and section=p_section for update;
    if v_old.id is null or v_old.updated_at is distinct from p_expected_updated_at then raise exception 'Task changed. Reload before saving.' using errcode='40001'; end if;
    update ops_tasks set title=p_title,status=p_status,evidence=p_evidence,owner_email=p_owner_email,due_date=p_due_date,updated_by=p_email,updated_at=clock_timestamp() where id=p_id returning * into v_new;
  else
    insert into ops_tasks(section,title,status,evidence,owner_email,due_date,updated_by) values(p_section,p_title,p_status,p_evidence,p_owner_email,p_due_date,p_email) returning * into v_new;
  end if;
  insert into ops_task_events(task_id,actor,document) values(v_new.id,p_email,to_jsonb(v_new));
  return to_jsonb(v_new);
end $$;

-- Atomic single-use code redemption and rotating refresh tokens.
create or replace function public.ops_exchange_bridge_token(
  p_grant text,p_hash text,p_client_id uuid,p_redirect_uri text,p_challenge text,
  p_resource text,p_access_hash text,p_refresh_hash text
) returns jsonb language plpgsql set search_path = public as $$
declare v_email text; v_scope text; v_family uuid;
begin
  if p_grant='authorization_code' then
    delete from ops_bridge_codes where code_hash=p_hash and client_id=p_client_id and redirect_uri=p_redirect_uri and challenge=p_challenge and resource=p_resource and expires_at>now() returning user_email,scope into v_email,v_scope;
  elsif p_grant='refresh_token' then
    delete from ops_bridge_tokens where refresh_hash=p_hash and client_id=p_client_id and resource=p_resource and refresh_expires_at>now() returning user_email,scope,family_id into v_email,v_scope,v_family;
    if v_email is null then
      select family_id into v_family from ops_bridge_refresh_history where refresh_hash=p_hash and client_id=p_client_id and resource=p_resource and expires_at>now();
      if v_family is not null then
        delete from ops_bridge_tokens where family_id=v_family;
        return jsonb_build_object('error','invalid_grant');
      end if;
    else
      insert into ops_bridge_refresh_history values(p_hash,v_family,p_client_id,p_resource,now()+interval '30 days');
    end if;
  end if;
  if v_email is null then raise exception 'Invalid grant' using errcode='28000'; end if;
  perform ops_check_user(v_email);
  insert into ops_bridge_tokens(access_hash,refresh_hash,client_id,user_email,resource,scope,access_expires_at,refresh_expires_at,family_id)
    values(p_access_hash,p_refresh_hash,p_client_id,v_email,p_resource,v_scope,now()+interval '1 hour',now()+interval '30 days',coalesce(v_family,gen_random_uuid()));
  return jsonb_build_object('email',v_email,'scope',v_scope);
end $$;

-- Only the server-side secret/service role may use these tables and functions.
do $$ declare t text; f record; begin
  foreach t in array array['ops_sessions','ops_connections','ops_artifacts','ops_artifact_revisions','ops_tasks','ops_task_events','ops_bridge_clients','ops_bridge_codes','ops_bridge_tokens','ops_bridge_refresh_history'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'ops\_%' escape '\' loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
grant usage, select on sequence public.ops_task_events_id_seq to service_role;
commit;
