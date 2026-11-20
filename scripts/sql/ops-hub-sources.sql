-- The database's allowlist of context source IDs. It must list every ID in
-- OPS_SOURCES (app/utils/ops-sources.server.js): when a tab or list_context
-- loads, every visible source is checked, and one unknown ID fails the whole
-- read with "Unknown source" (400). Add a new ID here, run this file in the
-- Ops Supabase SQL editor, and only then deploy the app change.
-- Retired IDs stay so their revision history remains valid. Safe to reapply.
begin;

create or replace function public.ops_check_source(p_email text, p_source_id text) returns void
language plpgsql set search_path = public as $$
begin
  perform ops_check_user(p_email);
  if p_source_id is null or p_source_id not in ('catalog-todos','catalog-cleanup','december-calendar','seo-visibility','trade-pipeline','daily-dashboard','daybook','brief-2026-11-12','brief-2026-11-01','debt-register','replacing-weaverse','design-system','ops-hub-status','wave-2-push-plan') then
    raise exception 'Unknown source';
  end if;
end $$;

commit;
