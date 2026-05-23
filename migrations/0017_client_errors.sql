-- Lightweight client-side error sink. Populated via /api/internal/report-error
-- when error.tsx / global-error.tsx is hit on a user's browser. Service-role
-- only — no PII (just digest, message, path, UA hash, IP). Admin views via
-- fo_admin_client_errors() RPC.
set search_path = public;

create table fo_client_errors (
  id uuid primary key default gen_random_uuid(),
  digest text,
  message text,
  path text,
  user_agent text,
  ip text,
  fatal boolean not null default false,
  created_at timestamptz not null default now()
);

create index fo_client_errors_created_idx on fo_client_errors (created_at desc);
create index fo_client_errors_fatal_idx on fo_client_errors (created_at desc) where fatal = true;

alter table fo_client_errors enable row level security;
revoke all on fo_client_errors from anon, authenticated;
-- Service-role only — no policies needed.

-- Admin view: latest 200 errors via SECURITY DEFINER guard.
create or replace function fo_admin_client_errors(p_limit integer default 200)
returns setof fo_client_errors
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select is_admin into v_is_admin from fo_profiles where id = v_user_id;
  if not coalesce(v_is_admin, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select * from fo_client_errors
    order by created_at desc
    limit greatest(1, least(p_limit, 1000));
end;
$$;

revoke all on function fo_admin_client_errors(integer) from public, anon;
grant execute on function fo_admin_client_errors(integer) to authenticated;
