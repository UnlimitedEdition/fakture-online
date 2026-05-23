-- Sprint 4: Bank reconciliation
set search_path = public;

create type fo_bank_format as enum (
  'generic_csv',           -- 3-column CSV: date, amount, reference
  'intesa_csv',            -- Banca Intesa SR export
  'nlb_csv',               -- NLB Komercijalna export
  'raiffeisen_csv',        -- Raiffeisen export
  'otp_csv',               -- OTP banka export
  'procredit_csv',         -- ProCredit export
  'aik_csv',               -- AIK banka export
  'mt940'                  -- SWIFT MT940 standard
);

create type fo_txn_match_status as enum (
  'unmatched',             -- no invoice found
  'matched',               -- linked to an invoice
  'manual_match',          -- user manually paired
  'ignored'                -- user marked as not invoice-related
);

create table fo_bank_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format fo_bank_format not null,
  filename text,
  imported_at timestamptz not null default now(),
  total_transactions integer not null default 0,
  matched_count integer not null default 0,
  total_amount numeric(14, 2) not null default 0
);

create index fo_bank_imports_user_idx on fo_bank_imports (user_id, imported_at desc);

create table fo_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid references fo_bank_imports(id) on delete set null,
  txn_date date not null,
  amount numeric(14, 2) not null,
  currency text not null default 'RSD',
  reference text,                                       -- poziv na broj
  description text,                                     -- "Uplata po fakturi FAK-2026-0001"
  counterparty_name text,
  counterparty_account text,
  match_status fo_txn_match_status not null default 'unmatched',
  matched_invoice_id uuid references fo_invoices(id) on delete set null,
  matched_at timestamptz,
  match_confidence text,                                -- 'reference' | 'amount_date' | 'manual'
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index fo_bank_txn_user_date_idx on fo_bank_transactions (user_id, txn_date desc);
create index fo_bank_txn_status_idx on fo_bank_transactions (user_id, match_status) where match_status != 'matched';
create index fo_bank_txn_invoice_idx on fo_bank_transactions (matched_invoice_id) where matched_invoice_id is not null;

alter table fo_bank_imports enable row level security;
alter table fo_bank_transactions enable row level security;

create policy fo_bank_imports_select on fo_bank_imports
  for select to authenticated using (user_id = auth.uid());
create policy fo_bank_imports_insert on fo_bank_imports
  for insert to authenticated with check (user_id = auth.uid());
create policy fo_bank_imports_delete on fo_bank_imports
  for delete to authenticated using (user_id = auth.uid());

create policy fo_bank_txn_select on fo_bank_transactions
  for select to authenticated using (user_id = auth.uid());
create policy fo_bank_txn_insert on fo_bank_transactions
  for insert to authenticated with check (user_id = auth.uid());
create policy fo_bank_txn_update on fo_bank_transactions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fo_bank_txn_delete on fo_bank_transactions
  for delete to authenticated using (user_id = auth.uid());

revoke all on fo_bank_imports, fo_bank_transactions from anon, authenticated;
grant select, insert, delete on fo_bank_imports to authenticated;
grant select, insert, update, delete on fo_bank_transactions to authenticated;

-- ============================================================================
-- fo_match_transaction(txn_id) — try to auto-match a single transaction
-- to an outstanding invoice.
-- Matching strategy:
--   1. Extract digits from reference; look up invoice by reference suffix
--   2. If invoice found with matching amount → match (high confidence)
--   3. If invoice found but amount mismatch → flag but don't match
--   4. Otherwise leave unmatched
-- ============================================================================
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

  -- Extract digits from reference
  v_ref_digits := regexp_replace(coalesce(v_txn.reference, ''), '\D', '', 'g');
  if length(v_ref_digits) < 4 then return false; end if;

  -- Match by invoice_number digits (suffix match — invoice numbers contain digits like 0001, 2026, etc.)
  select * into v_invoice from fo_invoices
   where user_id = v_user_id
     and status in ('sent', 'overdue', 'draft')
     and regexp_replace(invoice_number, '\D', '', 'g') = v_ref_digits
   order by created_at desc
   limit 1;

  if v_invoice is null then return false; end if;

  -- Amount must match within 0.01 RSD
  if abs(v_invoice.total - v_txn.amount) > 0.01 then
    return false;
  end if;

  -- Match!
  update fo_bank_transactions set
    match_status = 'matched',
    matched_invoice_id = v_invoice.id,
    matched_at = now(),
    match_confidence = 'reference'
  where id = p_txn_id;

  -- Mark invoice as paid if it isn't already
  if v_invoice.status != 'paid' then
    update fo_invoices set
      status = 'paid',
      paid_at = v_txn.txn_date::timestamptz
    where id = v_invoice.id and user_id = v_user_id;
  end if;

  return true;
end;
$$;

revoke all on function fo_match_transaction(uuid) from public, anon;
grant execute on function fo_match_transaction(uuid) to authenticated;

-- ============================================================================
-- fo_match_all_unmatched() — bulk: try to match all unmatched txns
-- ============================================================================
create or replace function fo_match_all_unmatched()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_txn_id uuid;
  v_matched integer := 0;
  v_total integer := 0;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;

  for v_txn_id in
    select id from fo_bank_transactions
     where user_id = v_user_id and match_status = 'unmatched'
  loop
    v_total := v_total + 1;
    if fo_match_transaction(v_txn_id) then
      v_matched := v_matched + 1;
    end if;
  end loop;

  return jsonb_build_object('total_unmatched', v_total, 'newly_matched', v_matched);
end;
$$;

revoke all on function fo_match_all_unmatched() from public, anon;
grant execute on function fo_match_all_unmatched() to authenticated;

-- ============================================================================
-- fo_manual_match(txn_id, invoice_id) — user-initiated pairing
-- ============================================================================
create or replace function fo_manual_match(p_txn_id uuid, p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice record;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;

  if not exists (select 1 from fo_bank_transactions where id = p_txn_id and user_id = v_user_id) then
    raise exception 'transaction not found' using errcode = '42501';
  end if;
  select * into v_invoice from fo_invoices where id = p_invoice_id and user_id = v_user_id;
  if v_invoice is null then raise exception 'invoice not found' using errcode = '42501'; end if;

  update fo_bank_transactions set
    match_status = 'manual_match',
    matched_invoice_id = p_invoice_id,
    matched_at = now(),
    match_confidence = 'manual'
  where id = p_txn_id and user_id = v_user_id;

  if v_invoice.status != 'paid' then
    update fo_invoices set status = 'paid', paid_at = now()
     where id = p_invoice_id and user_id = v_user_id;
  end if;
end;
$$;

revoke all on function fo_manual_match(uuid, uuid) from public, anon;
grant execute on function fo_manual_match(uuid, uuid) to authenticated;
