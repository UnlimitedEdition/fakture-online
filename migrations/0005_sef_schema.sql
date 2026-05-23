-- Fakture Online — SEF (Sistem Elektronskih Faktura) integration
-- Migration: 0005
-- Adds tables, columns, enums, RLS, RPCs for full SEF integration.

set search_path = public;

-- ============================================================================
-- Enums
-- ============================================================================
create type fo_sef_status as enum (
  'nacrt',       -- not sent yet (local draft)
  'slanje',      -- in flight (POST started, response not received)
  'poslato',     -- SEF accepted, awaiting buyer
  'odobreno',    -- buyer accepted (Prihvaceno)
  'odbijeno',    -- buyer rejected
  'storniran',   -- issuer cancelled (storno)
  'otkazan',     -- cancelled before delivery
  'greska'       -- API/validation error from SEF
);

create type fo_sef_doc_type as enum (
  'invoice',       -- 380
  'credit_note',   -- 381
  'debit_note',    -- 383
  'corrective',    -- 384
  'advance'        -- 386
);

create type fo_sef_inbox_action as enum (
  'pending',
  'accepted',
  'rejected'
);

create type fo_sef_api_call_kind as enum (
  'send_invoice',
  'cancel',
  'storno',
  'get_status',
  'get_xml',
  'list_changes',
  'check_company',
  'list_companies',
  'inbox_list',
  'inbox_get',
  'inbox_action',
  'subscribe'
);

-- ============================================================================
-- Columns on existing tables
-- ============================================================================

-- fo_profiles: SEF credentials per user
alter table fo_profiles
  add column sef_api_key_encrypted text,           -- AES-GCM ciphertext (base64)
  add column sef_api_key_iv text,                  -- IV for AES-GCM (base64)
  add column sef_demo_mode boolean not null default true,
  add column sef_callback_secret text,             -- random secret for webhook auth
  add column sef_callback_url text,                -- where SEF callback should hit (informational)
  add column jbkjs text,                           -- if seller is a budget user
  add column is_budget_user boolean not null default false;

-- fo_invoices: SEF tracking columns
alter table fo_invoices
  add column sef_document_id uuid,                                -- SEF GUID returned on send
  add column sef_status fo_sef_status,                            -- null = not sent
  add column sef_document_type fo_sef_doc_type,                   -- which UBL doc kind
  add column sef_sent_at timestamptz,
  add column sef_status_updated_at timestamptz,
  add column sef_error_code text,
  add column sef_error_message text,
  add column sef_retry_count integer not null default 0,
  add column sef_billing_reference_id uuid references fo_invoices(id) on delete set null,
  add column sef_prepayment_amount numeric(12,2) not null default 0,
  add column sef_archive_path text,                               -- Storage path to sent XML
  add column sef_signed_archive_path text;                        -- Storage path to SEF-signed XML

create unique index fo_invoices_sef_doc_id_idx
  on fo_invoices (sef_document_id) where sef_document_id is not null;

-- fo_clients: SEF eligibility + B2G + foreign client metadata
alter table fo_clients
  add column sef_registered boolean,                              -- null = unknown, true/false = checked
  add column sef_last_checked_at timestamptz,
  add column is_budget_user boolean not null default false,
  add column jbkjs text,                                          -- JBKJS for budget users
  add column is_foreign boolean not null default false,
  add column country_code text not null default 'RS';             -- ISO 3166-1 alpha-2

-- ============================================================================
-- fo_sef_documents — audit trail of every SEF API call
-- ============================================================================
create table fo_sef_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid references fo_invoices(id) on delete set null,
  inbox_id uuid,                                          -- FK declared after fo_sef_inbox below
  call_kind fo_sef_api_call_kind not null,
  endpoint text not null,
  http_status integer,
  request_payload_hash text,                              -- sha256 of request body
  response_summary jsonb not null default '{}'::jsonb,    -- relevant response fields (id, status, error)
  duration_ms integer,
  success boolean not null,
  error_code text,
  error_message text,
  retry_attempt integer not null default 0,
  idempotency_key text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index fo_sef_documents_user_created_idx on fo_sef_documents (user_id, created_at desc);
create index fo_sef_documents_invoice_idx on fo_sef_documents (invoice_id) where invoice_id is not null;
create index fo_sef_documents_inbox_idx on fo_sef_documents (inbox_id) where inbox_id is not null;
create index fo_sef_documents_kind_created_idx on fo_sef_documents (call_kind, created_at desc);

-- ============================================================================
-- fo_sef_inbox — invoices received from suppliers via SEF
-- ============================================================================
create table fo_sef_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sef_document_id uuid not null,                          -- SEF GUID
  invoice_number text,                                    -- supplier's invoice number from UBL/cbc:ID
  document_type fo_sef_doc_type,
  supplier_pib text,
  supplier_name text,
  issue_date date,
  due_date date,
  currency text not null default 'RSD',
  total_amount numeric(12,2),
  tax_amount numeric(12,2),
  sef_status fo_sef_status not null default 'poslato',    -- mirrors SEF state
  inbox_action fo_sef_inbox_action not null default 'pending',
  inbox_action_reason text,                               -- for rejection
  inbox_action_at timestamptz,
  fetched_at timestamptz not null default now(),
  archive_path text,                                      -- Storage path to received XML
  raw_xml_excerpt text,                                   -- first 4KB for quick preview / debugging
  is_demo boolean not null default false,
  unique (user_id, sef_document_id)
);

create index fo_sef_inbox_user_status_idx on fo_sef_inbox (user_id, inbox_action, fetched_at desc);
create index fo_sef_inbox_supplier_idx on fo_sef_inbox (user_id, supplier_pib) where supplier_pib is not null;

-- backfill the FK on fo_sef_documents now that fo_sef_inbox exists
alter table fo_sef_documents
  add constraint fo_sef_documents_inbox_fk
  foreign key (inbox_id) references fo_sef_inbox(id) on delete set null;

-- ============================================================================
-- fo_sef_inbox_actions — accept/reject decision log (history beyond current state)
-- ============================================================================
create table fo_sef_inbox_actions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  inbox_id uuid not null references fo_sef_inbox(id) on delete cascade,
  action fo_sef_inbox_action not null,
  reason text,
  performed_at timestamptz not null default now()
);

create index fo_sef_inbox_actions_inbox_idx on fo_sef_inbox_actions (inbox_id, performed_at desc);

-- ============================================================================
-- fo_kjs_registry — cached KJS (budget users) list from kjs.trezor.gov.rs
-- Daily refresh via cron. Shared across all users (no RLS scope, read-only).
-- ============================================================================
create table fo_kjs_registry (
  jbkjs text primary key,                                 -- 5-digit or alphanumeric (post Apr 2026)
  name text not null,
  pib text,
  city text,
  level text,                                             -- "republika" / "lokalna samouprava" / etc.
  active boolean not null default true,
  refreshed_at timestamptz not null default now()
);

create index fo_kjs_registry_pib_idx on fo_kjs_registry (pib) where pib is not null;

-- ============================================================================
-- fo_sef_companies_registry — cached SEF subscribers (from /getAllCompanies)
-- ============================================================================
create table fo_sef_companies_registry (
  pib text primary key,
  name text,
  jbkjs text,
  is_budget_user boolean not null default false,
  refreshed_at timestamptz not null default now()
);

create index fo_sef_companies_registry_refreshed_idx
  on fo_sef_companies_registry (refreshed_at);

-- ============================================================================
-- fo_sef_archive — metadata for 10-year XML retention in Storage
-- ============================================================================
create table fo_sef_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid references fo_invoices(id) on delete set null,
  inbox_id uuid references fo_sef_inbox(id) on delete set null,
  storage_path text not null,                             -- bucket path
  storage_bucket text not null default 'sef-xml',
  kind text not null,                                     -- 'sent' | 'signed' | 'received'
  sha256 text not null,                                   -- content hash for integrity check
  bytes integer,
  retention_until date not null,                          -- created_at + 10y
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index fo_sef_archive_invoice_idx on fo_sef_archive (invoice_id) where invoice_id is not null;
create index fo_sef_archive_inbox_idx on fo_sef_archive (inbox_id) where inbox_id is not null;
create index fo_sef_archive_user_kind_idx on fo_sef_archive (user_id, kind, created_at desc);

-- ============================================================================
-- Updated-at triggers (reuse fo_touch_updated_at from 0001)
-- ============================================================================
-- (fo_sef_inbox and fo_sef_documents are append-mostly; no updated_at column needed)

-- ============================================================================
-- Enable RLS
-- ============================================================================
alter table fo_sef_documents enable row level security;
alter table fo_sef_inbox enable row level security;
alter table fo_sef_inbox_actions enable row level security;
alter table fo_kjs_registry enable row level security;
alter table fo_sef_companies_registry enable row level security;
alter table fo_sef_archive enable row level security;

-- ============================================================================
-- RLS policies
-- ============================================================================

-- fo_sef_documents: user reads their own audit; writes happen via SECURITY DEFINER RPC only
create policy fo_sef_documents_select on fo_sef_documents
  for select to authenticated using (user_id = auth.uid());

-- fo_sef_inbox: user reads + updates their own
create policy fo_sef_inbox_select on fo_sef_inbox
  for select to authenticated using (user_id = auth.uid());
create policy fo_sef_inbox_update on fo_sef_inbox
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- fo_sef_inbox_actions: user reads their own
create policy fo_sef_inbox_actions_select on fo_sef_inbox_actions
  for select to authenticated using (user_id = auth.uid());

-- fo_kjs_registry: world-readable to authenticated (it's public data)
create policy fo_kjs_registry_select on fo_kjs_registry
  for select to authenticated using (true);

-- fo_sef_companies_registry: world-readable to authenticated
create policy fo_sef_companies_registry_select on fo_sef_companies_registry
  for select to authenticated using (true);

-- fo_sef_archive: user reads their own metadata (XML access via Storage RLS)
create policy fo_sef_archive_select on fo_sef_archive
  for select to authenticated using (user_id = auth.uid());

-- Grants
revoke all on fo_sef_documents, fo_sef_inbox, fo_sef_inbox_actions,
              fo_kjs_registry, fo_sef_companies_registry, fo_sef_archive
       from anon, authenticated;

grant select on fo_sef_documents to authenticated;
grant select, update on fo_sef_inbox to authenticated;
grant select on fo_sef_inbox_actions to authenticated;
grant select on fo_kjs_registry to authenticated;
grant select on fo_sef_companies_registry to authenticated;
grant select on fo_sef_archive to authenticated;

-- ============================================================================
-- RPC: fo_sef_record_status_change — atomic status update + audit insert
-- ============================================================================
create or replace function fo_sef_record_status_change(
  p_invoice_id uuid,
  p_status fo_sef_status,
  p_sef_document_id uuid default null,
  p_error_code text default null,
  p_error_message text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update fo_invoices set
    sef_status = p_status,
    sef_status_updated_at = now(),
    sef_document_id = coalesce(p_sef_document_id, sef_document_id),
    sef_error_code = p_error_code,
    sef_error_message = p_error_message,
    sef_sent_at = case when sef_sent_at is null and p_status in ('slanje','poslato')
                       then now() else sef_sent_at end
  where id = p_invoice_id and user_id = v_user_id;

  if not found then
    raise exception 'invoice not found' using errcode = '42501';
  end if;
end;
$$;

revoke all on function fo_sef_record_status_change(uuid, fo_sef_status, uuid, text, text) from public, anon;
grant execute on function fo_sef_record_status_change(uuid, fo_sef_status, uuid, text, text) to authenticated;

-- ============================================================================
-- RPC: fo_sef_log_api_call — append to audit trail (called by client after API call)
-- ============================================================================
create or replace function fo_sef_log_api_call(
  p_invoice_id uuid,
  p_inbox_id uuid,
  p_call_kind fo_sef_api_call_kind,
  p_endpoint text,
  p_http_status integer,
  p_request_hash text,
  p_response jsonb,
  p_duration_ms integer,
  p_success boolean,
  p_error_code text default null,
  p_error_message text default null,
  p_retry_attempt integer default 0,
  p_idempotency_key text default null,
  p_is_demo boolean default false
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into fo_sef_documents (
    user_id, invoice_id, inbox_id, call_kind, endpoint,
    http_status, request_payload_hash, response_summary,
    duration_ms, success, error_code, error_message,
    retry_attempt, idempotency_key, is_demo
  ) values (
    v_user_id, p_invoice_id, p_inbox_id, p_call_kind, p_endpoint,
    p_http_status, p_request_hash, coalesce(p_response, '{}'::jsonb),
    p_duration_ms, p_success, p_error_code, p_error_message,
    p_retry_attempt, p_idempotency_key, p_is_demo
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function fo_sef_log_api_call(uuid, uuid, fo_sef_api_call_kind, text, integer, text, jsonb, integer, boolean, text, text, integer, text, boolean) from public, anon;
grant execute on function fo_sef_log_api_call(uuid, uuid, fo_sef_api_call_kind, text, integer, text, jsonb, integer, boolean, text, text, integer, text, boolean) to authenticated;

-- ============================================================================
-- RPC: fo_sef_pending_status_checks — return invoice IDs needing status poll
-- ============================================================================
create or replace function fo_sef_pending_status_checks(p_user_id uuid default null)
returns table (id uuid, sef_document_id uuid)
language plpgsql security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_target uuid := coalesce(p_user_id, v_caller);
begin
  -- Only callable by the user themselves or service role (auth.uid()=null bypass via service role)
  if v_caller is not null and v_target is not distinct from v_caller then
    return query
      select i.id, i.sef_document_id
        from fo_invoices i
       where i.user_id = v_caller
         and i.sef_document_id is not null
         and i.sef_status in ('slanje', 'poslato');
  elsif v_caller is null then
    -- Service-role call (cron): return for all users
    return query
      select i.id, i.sef_document_id
        from fo_invoices i
       where i.sef_document_id is not null
         and i.sef_status in ('slanje', 'poslato');
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke all on function fo_sef_pending_status_checks(uuid) from public, anon;
grant execute on function fo_sef_pending_status_checks(uuid) to authenticated;

-- ============================================================================
-- RPC: fo_sef_inbox_decide — apply accept/reject to an inbox row + log
-- ============================================================================
create or replace function fo_sef_inbox_decide(
  p_inbox_id uuid,
  p_action fo_sef_inbox_action,
  p_reason text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_action not in ('accepted', 'rejected') then
    raise exception 'invalid action' using errcode = '22023';
  end if;

  update fo_sef_inbox set
    inbox_action = p_action,
    inbox_action_reason = p_reason,
    inbox_action_at = now()
  where id = p_inbox_id and user_id = v_user_id;

  if not found then
    raise exception 'inbox row not found' using errcode = '42501';
  end if;

  insert into fo_sef_inbox_actions (user_id, inbox_id, action, reason)
  values (v_user_id, p_inbox_id, p_action, p_reason);
end;
$$;

revoke all on function fo_sef_inbox_decide(uuid, fo_sef_inbox_action, text) from public, anon;
grant execute on function fo_sef_inbox_decide(uuid, fo_sef_inbox_action, text) to authenticated;

-- ============================================================================
-- RPC: fo_sef_record_archive — register a file in archive (called after upload)
-- ============================================================================
create or replace function fo_sef_record_archive(
  p_invoice_id uuid,
  p_inbox_id uuid,
  p_storage_path text,
  p_kind text,
  p_sha256 text,
  p_bytes integer
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_kind not in ('sent', 'signed', 'received') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  insert into fo_sef_archive (
    user_id, invoice_id, inbox_id, storage_path, kind, sha256, bytes, retention_until
  ) values (
    v_user_id, p_invoice_id, p_inbox_id, p_storage_path, p_kind, p_sha256, p_bytes,
    (current_date + interval '10 years')::date
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function fo_sef_record_archive(uuid, uuid, text, text, text, integer) from public, anon;
grant execute on function fo_sef_record_archive(uuid, uuid, text, text, text, integer) to authenticated;

-- ============================================================================
-- RPC: fo_sef_company_eligibility — check + cache result locally
-- ============================================================================
create or replace function fo_sef_lookup_company(p_pib text)
returns table (pib text, name text, jbkjs text, is_budget_user boolean, fetched_at timestamptz)
language sql security definer
set search_path = public
as $$
  select pib, name, jbkjs, is_budget_user, refreshed_at
    from fo_sef_companies_registry
   where pib = p_pib;
$$;

revoke all on function fo_sef_lookup_company(text) from public, anon;
grant execute on function fo_sef_lookup_company(text) to authenticated;

-- ============================================================================
-- Updated grants on the new admin_stats to include SEF counts (extend later if desired)
-- ============================================================================
-- (We keep fo_admin_stats() as-is; SEF dashboards are user-scoped on /sef.)
