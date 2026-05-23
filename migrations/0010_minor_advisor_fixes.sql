-- Phase 6: minor advisor fixes + DB-side anon audit throttle
-- Applied to ubwxjlclvootvrxwsrpa
set search_path = public;

-- Trigger function should not be RPC-callable
revoke all on function fo_anonymize_on_user_delete() from public, anon, authenticated;

-- Per-IP throttle for anonymous fo_log_audit calls (defense against
-- audit-table flooding via direct REST API call with anon key).
create table if not exists fo_audit_anon_throttle (
  ip text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

create or replace function fo_log_audit(
  p_action text, p_resource_type text default null, p_resource_id text default null,
  p_ip text default null, p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb, p_success boolean default true
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_ip text := nullif(left(coalesce(p_ip, ''), 64), '');
  v_count integer;
begin
  if v_caller is null and v_ip is not null then
    insert into fo_audit_anon_throttle (ip, count, window_start)
      values (v_ip, 1, now())
    on conflict (ip) do update set
      count = case when fo_audit_anon_throttle.window_start < now() - interval '5 minutes'
                   then 1 else fo_audit_anon_throttle.count + 1 end,
      window_start = case when fo_audit_anon_throttle.window_start < now() - interval '5 minutes'
                          then now() else fo_audit_anon_throttle.window_start end
    returning count into v_count;
    if v_count > 30 then return; end if;
  end if;
  insert into fo_audit_log (user_id, action, resource_type, resource_id, ip, user_agent, metadata, success)
  values (
    v_caller, left(p_action, 64),
    nullif(left(coalesce(p_resource_type, ''), 64), ''),
    nullif(left(coalesce(p_resource_id, ''), 128), ''),
    v_ip,
    nullif(left(coalesce(p_user_agent, ''), 256), ''),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_success, true)
  );
end;
$$;

create or replace function fo_audit_throttle_purge()
returns void language sql security definer set search_path = public
as $$ delete from fo_audit_anon_throttle where window_start < now() - interval '1 hour'; $$;
revoke all on function fo_audit_throttle_purge() from public, anon, authenticated;
