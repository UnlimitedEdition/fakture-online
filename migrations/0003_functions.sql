-- Fakture Online — RPC functions
-- Migration: 0003
-- All SECURITY DEFINER functions use auth.uid() internally.
-- NO function trusts a caller-supplied UUID.

set search_path = public;

-- ----------------------------------------------------------------------------
-- fo_get_profile() — current user's profile
-- ----------------------------------------------------------------------------
create or replace function fo_get_profile()
returns fo_profiles
language sql security definer
set search_path = public
as $$
  select * from fo_profiles where id = auth.uid();
$$;

revoke all on function fo_get_profile() from public, anon;
grant execute on function fo_get_profile() to authenticated;

-- ----------------------------------------------------------------------------
-- fo_get_next_invoice_number() — atomic per-user sequential numbering
-- Returns e.g. "FAK-0001-2026"
-- ----------------------------------------------------------------------------
create or replace function fo_get_next_invoice_number()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_prefix text;
  v_number integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  -- Atomic upsert: creates profile with next=2 (returning 1) if missing,
  -- otherwise increments and returns the value just allocated.
  insert into fo_profiles (id, email, invoice_prefix, next_invoice_number)
  select v_user_id, coalesce(au.email, ''), 'FAK', 2
    from auth.users au where au.id = v_user_id
  on conflict (id) do update
    set next_invoice_number = fo_profiles.next_invoice_number + 1
  returning invoice_prefix, next_invoice_number - 1
  into v_prefix, v_number;

  return v_prefix || '-' || lpad(v_number::text, 4, '0') || '-' || to_char(now(), 'YYYY');
end;
$$;

revoke all on function fo_get_next_invoice_number() from public, anon;
grant execute on function fo_get_next_invoice_number() to authenticated;

-- ----------------------------------------------------------------------------
-- fo_create_invoice(p_data jsonb) — atomic: verifies client ownership,
-- computes totals server-side, inserts invoice + items in one transaction.
-- Returns the new invoice id.
-- ----------------------------------------------------------------------------
create or replace function fo_create_invoice(p_data jsonb)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice_id uuid;
  v_number text;
  v_subtotal numeric(12,2);
  v_tax_rate numeric(5,2);
  v_tax_amount numeric(12,2);
  v_total numeric(12,2);
  v_client_id uuid;
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  v_client_id := (p_data->>'client_id')::uuid;
  v_items := coalesce(p_data->'items', '[]'::jsonb);
  v_tax_rate := coalesce((p_data->>'tax_rate')::numeric, 0);

  if v_client_id is null then
    raise exception 'client_id is required' using errcode = '22023';
  end if;

  -- IDOR fix: verify client belongs to caller
  if not exists (select 1 from fo_clients where id = v_client_id and user_id = v_user_id) then
    raise exception 'client not found or not owned' using errcode = '42501';
  end if;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'invoice must have at least one item' using errcode = '22023';
  end if;

  -- Compute totals server-side from items (never trust client computation)
  select coalesce(sum((item->>'quantity')::numeric * (item->>'unit_price')::numeric), 0)
    into v_subtotal
    from jsonb_array_elements(v_items) as item;

  v_tax_amount := round(v_subtotal * v_tax_rate / 100, 2);
  v_total := v_subtotal + v_tax_amount;

  v_number := fo_get_next_invoice_number();

  insert into fo_invoices (
    user_id, client_id, invoice_number, issue_date, due_date,
    tax_rate, subtotal, tax_amount, total, notes, payment_method
  ) values (
    v_user_id, v_client_id, v_number,
    coalesce((p_data->>'issue_date')::date, current_date),
    nullif(p_data->>'due_date', '')::date,
    v_tax_rate, v_subtotal, v_tax_amount, v_total,
    coalesce(p_data->>'notes', ''),
    coalesce(p_data->>'payment_method', '')
  ) returning id into v_invoice_id;

  insert into fo_invoice_items (invoice_id, description, quantity, unit, unit_price, total, sort_order)
  select
    v_invoice_id,
    coalesce(item->>'description', ''),
    (item->>'quantity')::numeric,
    coalesce(item->>'unit', 'kom'),
    (item->>'unit_price')::numeric,
    (item->>'quantity')::numeric * (item->>'unit_price')::numeric,
    (idx - 1)::integer
  from jsonb_array_elements(v_items) with ordinality as t(item, idx);

  return v_invoice_id;
end;
$$;

revoke all on function fo_create_invoice(jsonb) from public, anon;
grant execute on function fo_create_invoice(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- fo_update_invoice(p_invoice_id, p_data) — atomic update + items replace
-- ----------------------------------------------------------------------------
create or replace function fo_update_invoice(p_invoice_id uuid, p_data jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subtotal numeric(12,2);
  v_tax_rate numeric(5,2);
  v_tax_amount numeric(12,2);
  v_total numeric(12,2);
  v_client_id uuid;
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  v_client_id := (p_data->>'client_id')::uuid;
  v_items := coalesce(p_data->'items', '[]'::jsonb);
  v_tax_rate := coalesce((p_data->>'tax_rate')::numeric, 0);

  if not exists (select 1 from fo_invoices where id = p_invoice_id and user_id = v_user_id) then
    raise exception 'invoice not found' using errcode = '42501';
  end if;

  if not exists (select 1 from fo_clients where id = v_client_id and user_id = v_user_id) then
    raise exception 'client not found or not owned' using errcode = '42501';
  end if;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'invoice must have at least one item' using errcode = '22023';
  end if;

  select coalesce(sum((item->>'quantity')::numeric * (item->>'unit_price')::numeric), 0)
    into v_subtotal
    from jsonb_array_elements(v_items) as item;

  v_tax_amount := round(v_subtotal * v_tax_rate / 100, 2);
  v_total := v_subtotal + v_tax_amount;

  update fo_invoices set
    client_id = v_client_id,
    issue_date = coalesce((p_data->>'issue_date')::date, issue_date),
    due_date = nullif(p_data->>'due_date', '')::date,
    tax_rate = v_tax_rate,
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    notes = coalesce(p_data->>'notes', ''),
    payment_method = coalesce(p_data->>'payment_method', '')
  where id = p_invoice_id and user_id = v_user_id;

  delete from fo_invoice_items where invoice_id = p_invoice_id;

  insert into fo_invoice_items (invoice_id, description, quantity, unit, unit_price, total, sort_order)
  select
    p_invoice_id,
    coalesce(item->>'description', ''),
    (item->>'quantity')::numeric,
    coalesce(item->>'unit', 'kom'),
    (item->>'unit_price')::numeric,
    (item->>'quantity')::numeric * (item->>'unit_price')::numeric,
    (idx - 1)::integer
  from jsonb_array_elements(v_items) with ordinality as t(item, idx);
end;
$$;

revoke all on function fo_update_invoice(uuid, jsonb) from public, anon;
grant execute on function fo_update_invoice(uuid, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- fo_log_audit — writes one audit_log row attributed to current user.
-- Anon may call (for failed-login attempts where session does not exist).
-- ----------------------------------------------------------------------------
create or replace function fo_log_audit(
  p_action text,
  p_resource_type text default null,
  p_resource_id text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_success boolean default true
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into fo_audit_log (user_id, action, resource_type, resource_id, ip, user_agent, metadata, success)
  values (
    auth.uid(),
    left(p_action, 64),
    nullif(left(coalesce(p_resource_type, ''), 64), ''),
    nullif(left(coalesce(p_resource_id, ''), 128), ''),
    nullif(left(coalesce(p_ip, ''), 64), ''),
    nullif(left(coalesce(p_user_agent, ''), 256), ''),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_success, true)
  );
end;
$$;

revoke all on function fo_log_audit(text, text, text, text, text, jsonb, boolean) from public;
grant execute on function fo_log_audit(text, text, text, text, text, jsonb, boolean) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- fo_admin_stats() — admin aggregates. NO arguments. Self-checks is_admin.
-- ----------------------------------------------------------------------------
create or replace function fo_admin_stats()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select is_admin into v_is_admin from fo_profiles where id = v_user_id;
  if v_is_admin is not true then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_users', (select count(*) from fo_profiles),
    'total_clients', (select count(*) from fo_clients),
    'total_invoices', (select count(*) from fo_invoices),
    'total_revenue', (select coalesce(sum(total), 0) from fo_invoices where status = 'paid'),
    'invoices_by_status', (
      select coalesce(jsonb_object_agg(status, c), '{}'::jsonb)
        from (select status::text, count(*) as c from fo_invoices group by status) s
    ),
    'lead_signups_count', (select count(*) from lead_signups),
    'recent_signups', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'email', email, 'owner_name', owner_name,
        'company_name', company_name, 'created_at', created_at, 'is_admin', is_admin
      )), '[]'::jsonb)
      from (select * from fo_profiles order by created_at desc limit 50) p
    ),
    'recent_leads', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'business_name', business_name, 'contact_name', contact_name,
        'email', email, 'phone', phone, 'city', city, 'created_at', created_at
      )), '[]'::jsonb)
      from (select * from lead_signups order by created_at desc limit 50) l
    )
  );
end;
$$;

revoke all on function fo_admin_stats() from public, anon;
grant execute on function fo_admin_stats() to authenticated;

-- ----------------------------------------------------------------------------
-- fo_admin_audit(p_limit int) — admin reads recent audit_log rows
-- ----------------------------------------------------------------------------
create or replace function fo_admin_audit(p_limit integer default 200)
returns setof fo_audit_log
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select is_admin into v_is_admin from fo_profiles where id = v_user_id;
  if v_is_admin is not true then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
    select * from fo_audit_log
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

revoke all on function fo_admin_audit(integer) from public, anon;
grant execute on function fo_admin_audit(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- fo_can_create_invoice() — billing gate
-- Free tier: 5 invoices per calendar month.
-- ----------------------------------------------------------------------------
create or replace function fo_can_create_invoice()
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan fo_plan;
  v_status fo_subscription_status;
  v_count_this_month integer;
  v_free_tier_limit constant integer := 5;
begin
  if v_user_id is null then return false; end if;

  select plan, status into v_plan, v_status
    from fo_subscriptions where user_id = v_user_id;

  if v_plan is null then v_plan := 'free'; v_status := 'trial'; end if;

  if v_plan in ('starter', 'pro', 'business') and v_status in ('trial', 'active') then
    return true;
  end if;

  select count(*) into v_count_this_month
    from fo_invoices
   where user_id = v_user_id
     and created_at >= date_trunc('month', now());

  return v_count_this_month < v_free_tier_limit;
end;
$$;

revoke all on function fo_can_create_invoice() from public, anon;
grant execute on function fo_can_create_invoice() to authenticated;

-- ----------------------------------------------------------------------------
-- Auto-create profile + trial subscription on auth.users insert
-- ----------------------------------------------------------------------------
create or replace function fo_handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into fo_profiles (id, email, owner_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;

  insert into fo_subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'free', 'trial', now() + interval '14 days')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists fo_on_auth_user_created on auth.users;
create trigger fo_on_auth_user_created
  after insert on auth.users
  for each row execute function fo_handle_new_user();
