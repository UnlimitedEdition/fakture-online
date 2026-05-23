-- Security hardening based on production audit:
--   B3: enable RLS on fo_audit_anon_throttle (was missing, anon could SELECT all)
--   B4: tighten lead_signups insert policy (was WITH CHECK (true))
--   H5: bank match — require >=6 digits to avoid invoice-number collisions
--   H6: bank match — paid_at uses Belgrade midnight, not UTC
--   H10: fo_log_audit anon callers can no longer bypass throttle via p_ip=null
--
-- Bank-grade audit pass. Each change is minimal and backwards-compatible.
set search_path = public;

-- =============================================================================
-- B3: fo_audit_anon_throttle was created without RLS — anon role could SELECT
-- and DELETE rows via PostgREST, bypassing the per-IP audit floodgate.
-- The fo_log_audit RPC writes via SECURITY DEFINER so we lose nothing by
-- locking the table down completely for anon/authenticated.
-- =============================================================================
alter table fo_audit_anon_throttle enable row level security;
revoke all on fo_audit_anon_throttle from anon, authenticated;
-- No CRUD policies — only the SECURITY DEFINER function may touch the table.

-- =============================================================================
-- B4: lead_signups had `with check (true)` which let any anon-keyed client
-- POST arbitrary rows past the /api/signup honeypot + rate limit. Restrict
-- to plausibly real values via CHECK constraints + a stricter policy.
-- =============================================================================
alter table lead_signups
  add constraint lead_signups_contact_name_len
    check (length(btrim(contact_name)) between 2 and 120),
  add constraint lead_signups_phone_format
    check (length(regexp_replace(phone, '\D', '', 'g')) between 6 and 20),
  add constraint lead_signups_business_name_len
    check (length(btrim(business_name)) between 2 and 160),
  add constraint lead_signups_email_format
    check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add constraint lead_signups_source_whitelist
    check (source in ('landing','referral','direct'));

drop policy if exists lead_signups_insert on lead_signups;
create policy lead_signups_insert on lead_signups
  for insert to anon, authenticated
  with check (
    length(btrim(contact_name)) between 2 and 120
    and length(regexp_replace(phone, '\D', '', 'g')) between 6 and 20
    and length(btrim(business_name)) between 2 and 160
    and source in ('landing','referral','direct')
  );

-- =============================================================================
-- H10: fo_log_audit accepted client-supplied p_ip; an anon attacker could pass
-- p_ip=null and skip the per-IP throttle entirely. Switch to reading the IP
-- from the trusted request header for anon callers, and bucket missing IPs
-- under a shared 'unknown' key so flooding still hits a limit.
-- =============================================================================
create or replace function fo_log_audit(
  p_action text,
  p_resource_type text default null,
  p_resource_id text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_success boolean default true
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_ip text;
  v_count integer;
  v_window timestamptz;
  v_headers jsonb;
begin
  if v_caller is not null then
    -- Authenticated callers: trust the client-supplied IP (server actions
    -- already populate it from headers); throttle is unnecessary, the user
    -- is identified.
    v_ip := nullif(left(coalesce(p_ip, ''), 64), '');
  else
    -- Anonymous callers: ignore client-supplied p_ip — pull from PostgREST
    -- request headers so an attacker can't bypass the per-IP bucket. If the
    -- header is missing, all anon traffic shares one 'unknown' bucket so the
    -- limit still bites.
    begin
      v_headers := current_setting('request.headers', true)::jsonb;
    exception when others then
      v_headers := '{}'::jsonb;
    end;
    v_ip := nullif(
      left(coalesce(
        split_part(v_headers ->> 'x-forwarded-for', ',', 1),
        v_headers ->> 'x-real-ip',
        ''
      ), 64),
      ''
    );
    v_ip := coalesce(v_ip, 'unknown');

    insert into fo_audit_anon_throttle (ip, count, window_start)
      values (v_ip, 1, now())
    on conflict (ip) do update set
      count = case
        when fo_audit_anon_throttle.window_start < now() - interval '5 minutes'
          then 1
        else fo_audit_anon_throttle.count + 1
      end,
      window_start = case
        when fo_audit_anon_throttle.window_start < now() - interval '5 minutes'
          then now()
        else fo_audit_anon_throttle.window_start
      end
    returning count, window_start into v_count, v_window;

    if v_count > 30 then
      -- Silently drop to avoid leaking the threshold via error timing.
      return;
    end if;
  end if;

  insert into fo_audit_log (
    user_id, action, resource_type, resource_id, ip, user_agent, metadata, success
  ) values (
    v_caller,
    left(p_action, 64),
    nullif(left(coalesce(p_resource_type, ''), 64), ''),
    nullif(left(coalesce(p_resource_id, ''), 128), ''),
    v_ip,
    nullif(left(coalesce(p_user_agent, ''), 256), ''),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_success, true)
  );
end;
$$;

-- =============================================================================
-- H5/H6: harden bank auto-match.
--   H5: require >=6 stripped digits (was 4) — short references like "2025-1"
--       (reduces to '20251') were colliding with unrelated invoices.
--   H6: paid_at was txn_date::timestamptz which is interpreted as UTC midnight
--       and renders as "previous day" in Belgrade. Use Belgrade midnight.
-- =============================================================================
create or replace function fo_match_transaction(p_txn_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_txn record;
  v_invoice record;
  v_ref_digits text;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;

  select * into v_txn from fo_bank_transactions
   where id = p_txn_id and user_id = v_user_id;
  if v_txn is null then return false; end if;
  if v_txn.match_status = 'matched' then return true; end if;

  v_ref_digits := regexp_replace(coalesce(v_txn.reference, ''), '\D', '', 'g');
  -- H5: at least 6 digits so we don't collide on short numbers
  if length(v_ref_digits) < 6 then return false; end if;

  select * into v_invoice from fo_invoices
   where user_id = v_user_id
     and status in ('sent', 'overdue', 'draft')
     and regexp_replace(invoice_number, '\D', '', 'g') = v_ref_digits
   order by created_at desc
   limit 1;

  if v_invoice is null then return false; end if;

  if abs(v_invoice.total - v_txn.amount) > 0.01 then
    return false;
  end if;

  update fo_bank_transactions set
    match_status = 'matched',
    matched_invoice_id = v_invoice.id,
    matched_at = now(),
    match_confidence = 'reference'
  where id = p_txn_id;

  if v_invoice.status != 'paid' then
    -- H6: Belgrade midnight, not UTC midnight, so paid_at renders as the
    -- correct calendar day for SR users
    update fo_invoices set
      status = 'paid',
      paid_at = (v_txn.txn_date::timestamp at time zone 'Europe/Belgrade')
    where id = v_invoice.id and user_id = v_user_id;
  end if;

  return true;
end;
$$;
