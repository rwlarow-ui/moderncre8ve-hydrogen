-- Register the "ops-hub-status" context source (Tech tab) so the Claude
-- connector can publish the Ops Hub status page to the hub.
-- Run in the Ops Supabase SQL editor BEFORE deploying the matching app change.
-- Only replaces the source allowlist check; safe to reapply. Fresh projects
-- use the updated ops-hub.sql.
begin;

create or replace function public.ops_check_source(p_email text, p_source_id text) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  if p_source_id is null or p_source_id not in ('catalog-todos','catalog-cleanup','december-calendar','seo-visibility','trade-pipeline','daily-dashboard','daybook','brief-2026-11-12','brief-2026-11-01','debt-register','replacing-weaverse','design-system','ops-hub-status') then
    raise exception 'Unknown source';
  end if;
end $$;

commit;
