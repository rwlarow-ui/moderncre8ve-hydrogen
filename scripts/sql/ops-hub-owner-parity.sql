-- Give both approved Ops identities the same database permissions.
-- Run before deploying the matching app role change. Safe to reapply.
begin;

create or replace function public.ops_check_source(p_email text, p_source_id text) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  if p_source_id is null or p_source_id not in ('catalog-todos','catalog-cleanup','december-calendar','seo-visibility','trade-pipeline','daily-dashboard','daybook','brief-2026-11-12','brief-2026-11-01','debt-register','replacing-weaverse','design-system') then
    raise exception 'Unknown source';
  end if;
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

commit;
