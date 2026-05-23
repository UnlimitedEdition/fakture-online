-- Sprint 2: KPO knjiga RPC + paušal limit tracking helpers
set search_path = public;

-- Stored profile preference for paušal limit (6M / 8M / off)
alter table fo_profiles
  add column if not exists pausal_limit_rsd numeric(14, 2) default 8000000,
  add column if not exists pausal_limit_enabled boolean not null default false;

-- KPO knjiga rows for current user, ordered by issue_date.
-- Includes all NON-cancelled invoices regardless of status (KPO tracks
-- issued income, not collected — per ZPDV).
create or replace function fo_kpo_book(p_year integer default null)
returns table (
  redni_broj bigint,
  issue_date date,
  invoice_number text,
  client_name text,
  client_pib text,
  amount numeric(12, 2),
  currency text,
  status fo_invoice_status,
  paid_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_year integer := coalesce(p_year, extract(year from now())::integer);
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  return query
  select
    row_number() over (order by i.issue_date, i.created_at) as redni_broj,
    i.issue_date,
    i.invoice_number,
    coalesce(c.company_name, '') as client_name,
    coalesce(c.pib, '') as client_pib,
    i.total as amount,
    i.currency,
    i.status,
    i.paid_at
  from fo_invoices i
  left join fo_clients c on c.id = i.client_id
  where i.user_id = v_user_id
    and extract(year from i.issue_date) = v_year
    and i.status != 'cancelled';
end;
$$;

revoke all on function fo_kpo_book(integer) from public, anon;
grant execute on function fo_kpo_book(integer) to authenticated;

-- Year-to-date revenue + month-over-month rate for limit prediction
create or replace function fo_revenue_stats(p_year integer default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_year integer := coalesce(p_year, extract(year from now())::integer);
  v_ytd numeric(14, 2);
  v_current_month numeric(14, 2);
  v_avg_monthly numeric(14, 2);
  v_months_with_revenue integer;
  v_limit numeric(14, 2);
  v_limit_enabled boolean;
  v_predicted_hit_date date := null;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select pausal_limit_rsd, pausal_limit_enabled into v_limit, v_limit_enabled
    from fo_profiles where id = v_user_id;

  -- YTD revenue (all non-cancelled, regardless of paid status per ZPDV)
  select coalesce(sum(total), 0) into v_ytd
    from fo_invoices
   where user_id = v_user_id
     and status != 'cancelled'
     and extract(year from issue_date) = v_year;

  -- Current month revenue
  select coalesce(sum(total), 0) into v_current_month
    from fo_invoices
   where user_id = v_user_id
     and status != 'cancelled'
     and issue_date >= date_trunc('month', now())::date;

  -- Months with revenue (used for averaging) — only past months count
  select count(distinct date_trunc('month', issue_date)) into v_months_with_revenue
    from fo_invoices
   where user_id = v_user_id
     and status != 'cancelled'
     and extract(year from issue_date) = v_year
     and issue_date < date_trunc('month', now())::date;

  if v_months_with_revenue > 0 then
    v_avg_monthly := (v_ytd - v_current_month) / v_months_with_revenue;
    -- Predict hit date if monthly average is positive and there's a limit
    if v_limit_enabled and v_avg_monthly > 0 and v_ytd < v_limit then
      v_predicted_hit_date := (
        date_trunc('month', now())::date
        + (ceil((v_limit - v_ytd) / v_avg_monthly)::integer) * interval '1 month'
      )::date;
    end if;
  end if;

  return jsonb_build_object(
    'year', v_year,
    'ytd_revenue', v_ytd,
    'current_month_revenue', v_current_month,
    'avg_monthly_revenue', coalesce(v_avg_monthly, 0),
    'months_completed', coalesce(v_months_with_revenue, 0),
    'limit_rsd', v_limit,
    'limit_enabled', v_limit_enabled,
    'predicted_hit_date', v_predicted_hit_date,
    'percent_used', case when v_limit > 0 then round((v_ytd / v_limit * 100)::numeric, 1) else 0 end
  );
end;
$$;

revoke all on function fo_revenue_stats(integer) from public, anon;
grant execute on function fo_revenue_stats(integer) to authenticated;
