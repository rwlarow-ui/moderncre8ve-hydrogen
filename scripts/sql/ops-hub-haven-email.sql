-- Haven's Google account is haven@moderncre8ve.com (confirmed 2026-11-15).
-- The hub first listed havenmb@moderncre8ve.com, so Google sign-in refused her
-- ("This Google account is not allowed to access Ops.").
--
-- Run in the Ops Supabase SQL editor BEFORE deploying the matching app change.
-- One transaction; safe to reapply. Rob's records are untouched.
--
-- Moves live identity rows (sessions, Google connection, Claude connector
-- codes and tokens, task ownership) to haven@ and makes the database's own
-- access check accept haven@ instead of havenmb@. Audit columns
-- (published_by, updated_by, task event actors, revision documents) keep the
-- address that was recorded at the time.
begin;

update public.ops_sessions
  set user_email = 'haven@moderncre8ve.com'
  where user_email = 'havenmb@moderncre8ve.com';

-- user_email is the primary key: keep an existing haven@ connection if both exist.
delete from public.ops_connections
  where user_email = 'havenmb@moderncre8ve.com'
    and exists (select 1 from public.ops_connections where user_email = 'haven@moderncre8ve.com');
update public.ops_connections
  set user_email = 'haven@moderncre8ve.com'
  where user_email = 'havenmb@moderncre8ve.com';

update public.ops_bridge_codes
  set user_email = 'haven@moderncre8ve.com'
  where user_email = 'havenmb@moderncre8ve.com';
update public.ops_bridge_tokens
  set user_email = 'haven@moderncre8ve.com'
  where user_email = 'havenmb@moderncre8ve.com';

-- Task owners are restricted by a check constraint: swap it around the update.
alter table public.ops_tasks drop constraint if exists ops_tasks_owner_email_check;
update public.ops_tasks
  set owner_email = 'haven@moderncre8ve.com'
  where owner_email = 'havenmb@moderncre8ve.com';
alter table public.ops_tasks add constraint ops_tasks_owner_email_check
  check (owner_email in ('rob@moderncre8ve.com','haven@moderncre8ve.com'));

-- Every Ops RPC calls this first. Existing grants survive create or replace.
create or replace function public.ops_check_user(p_email text) returns void
language plpgsql set search_path = public as $$
begin
  if p_email is null or p_email not in ('rob@moderncre8ve.com','haven@moderncre8ve.com') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
end $$;

commit;
