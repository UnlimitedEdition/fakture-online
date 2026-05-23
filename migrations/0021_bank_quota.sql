-- H11: Per-user daily bank import quota
-- Caps how many bank statement files a user can import each day to prevent
-- runaway growth of fo_bank_transactions and matching CPU.
--
-- Free / trial-on-free tier:  5 imports / day
-- Starter / Pro / Business:  20 imports / day
set search_path = public;

-- ============================================================================
-- fo_bank_import_quota_remaining()
--   Returns the user's daily import quota: how many imports they have left
--   today, their hard limit, and the period label (always 'day').
--   SECURITY DEFINER so it can read fo_subscriptions even if RLS would
--   otherwise hide it (it won't — the policy already allows self-read — but
--   we keep parity with fo_can_import_bank).
-- ============================================================================
create or replace function fo_bank_import_quota_remaining()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan fo_plan;
  v_status fo_subscription_status;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select plan, status into v_plan, v_status
    from fo_subscriptions where user_id = v_user_id;
  if v_plan is null then v_plan := 'free'; v_status := 'trial'; end if;

  -- Paid plans get 20/day; free/expired/past_due get 5/day.
  if v_plan in ('starter', 'pro', 'business') and v_status in ('trial', 'active') then
    v_limit := 20;
  else
    v_limit := 5;
  end if;

  select count(*) into v_used from fo_bank_imports
   where user_id = v_user_id and imported_at >= current_date;

  return jsonb_build_object(
    'remaining', greatest(v_limit - v_used, 0),
    'limit', v_limit,
    'period', 'day'
  );
end;
$$;

revoke all on function fo_bank_import_quota_remaining() from public, anon;
grant execute on function fo_bank_import_quota_remaining() to authenticated;

-- ============================================================================
-- fo_can_import_bank(p_max_per_day)
--   Cheap boolean check used inline by app/actions/bank.ts before writing a
--   new fo_bank_imports row. Respects subscription-tier-aware cap by default,
--   but callers can override via p_max_per_day.
-- ============================================================================
create or replace function fo_can_import_bank(p_max_per_day integer default 20)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan fo_plan;
  v_status fo_subscription_status;
  v_effective_limit integer;
  v_count_today integer;
begin
  if v_user_id is null then return false; end if;

  select plan, status into v_plan, v_status
    from fo_subscriptions where user_id = v_user_id;
  if v_plan is null then v_plan := 'free'; v_status := 'trial'; end if;

  -- Tier-aware default; never exceed the explicit per-call cap.
  if v_plan in ('starter', 'pro', 'business') and v_status in ('trial', 'active') then
    v_effective_limit := least(p_max_per_day, 20);
  else
    v_effective_limit := least(p_max_per_day, 5);
  end if;

  select count(*) into v_count_today from fo_bank_imports
   where user_id = v_user_id and imported_at >= current_date;

  return v_count_today < v_effective_limit;
end;
$$;

revoke all on function fo_can_import_bank(integer) from public, anon;
grant execute on function fo_can_import_bank(integer) to authenticated;
