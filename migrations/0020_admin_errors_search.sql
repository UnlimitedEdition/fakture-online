-- Adds a search-capable variant of fo_admin_client_errors. Same SECURITY DEFINER
-- + admin guard as fo_admin_client_errors. Filters by message ILIKE %query% and
-- optionally restricts to fatal=true. Limit clamped to [1, 1000].
set search_path = public;

create or replace function fo_admin_client_errors_search(
  p_query text default null,
  p_limit integer default 200,
  p_fatal_only boolean default false
)
returns setof fo_client_errors
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_query text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select is_admin into v_is_admin from fo_profiles where id = v_user_id;
  if not coalesce(v_is_admin, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_query := nullif(btrim(coalesce(p_query, '')), '');

  return query
    select * from fo_client_errors
    where (not coalesce(p_fatal_only, false) or fatal = true)
      and (
        v_query is null
        or message ilike '%' || v_query || '%'
      )
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

revoke all on function fo_admin_client_errors_search(text, integer, boolean) from public, anon;
grant execute on function fo_admin_client_errors_search(text, integer, boolean) to authenticated;
