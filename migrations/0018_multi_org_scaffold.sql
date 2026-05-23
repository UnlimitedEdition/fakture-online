-- Fakture Online — Multi-organization (multi-firma) scaffold
-- Migration: 0018
--
-- Introduces a parallel `org_id` concept alongside the existing `user_id`
-- ownership model. Every existing user gets a default personal org so legacy
-- code (which still filters by `user_id`) continues to work unchanged.
--
-- Backwards-compatible: existing RLS policies remain in place. The new
-- org-membership policies are ADDITIVE — a user with `user_id = auth.uid()`
-- still sees their rows, AND so does any other member of the same org.
--
-- The application layer is intentionally not updated in this migration; UI
-- changes ship in a follow-up once the scaffold is verified in production.

set search_path = public;

-- ============================================================================
-- 1. Organizations
-- ============================================================================
create table fo_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index fo_orgs_owner_idx on fo_orgs (owner_user_id);

alter table fo_orgs enable row level security;

-- ============================================================================
-- 2. Org memberships (user ↔ org with role)
-- ============================================================================
create table fo_org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references fo_orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','accountant','viewer')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (org_id, user_id)
);

create index fo_org_members_user_idx on fo_org_members (user_id);
create index fo_org_members_org_idx  on fo_org_members (org_id);

alter table fo_org_members enable row level security;

-- ============================================================================
-- 3. RLS policies for the two new tables
-- ============================================================================
-- fo_orgs: a user can see any org they are a member of.
create policy fo_orgs_select on fo_orgs
  for select to authenticated using (
    exists (
      select 1 from fo_org_members m
      where m.org_id = fo_orgs.id and m.user_id = auth.uid()
    )
  );

-- Writes to fo_orgs happen via SECURITY DEFINER RPCs (fo_ensure_default_org).
-- Owners may rename their own org directly.
create policy fo_orgs_update on fo_orgs
  for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- fo_org_members: a user can see membership rows for orgs they belong to.
create policy fo_org_members_select on fo_org_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from fo_org_members m2
      where m2.org_id = fo_org_members.org_id and m2.user_id = auth.uid()
    )
  );

-- Writes to fo_org_members go through SECURITY DEFINER RPCs (future invite flow).

revoke all on fo_orgs, fo_org_members from anon, authenticated;
grant select, update on fo_orgs to authenticated;
grant select on fo_org_members to authenticated;

-- ============================================================================
-- 4. fo_ensure_default_org() — creates personal org on first call. Idempotent.
-- ============================================================================
create or replace function fo_ensure_default_org(p_user_id uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_name text;
begin
  -- When called with no arg, use caller. When called with an arg (backfill /
  -- admin use only), still require an authenticated context. We allow a
  -- supplied UUID since this RPC is also invoked from a one-off migration
  -- block where auth.uid() is null.
  v_user_id := coalesce(p_user_id, auth.uid());
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  -- Already a member of some org owned by this user? Return that org.
  select o.id into v_org_id
  from fo_orgs o
  where o.owner_user_id = v_user_id
  order by o.created_at asc
  limit 1;

  if v_org_id is not null then
    -- Ensure membership row exists (self-heal).
    insert into fo_org_members (org_id, user_id, role, accepted_at)
    values (v_org_id, v_user_id, 'owner', now())
    on conflict (org_id, user_id) do nothing;
    return v_org_id;
  end if;

  -- No existing org → create one. Name = profile.company_name if set,
  -- else 'Lična firma'.
  select nullif(trim(company_name), '') into v_name
  from fo_profiles where id = v_user_id;

  v_name := coalesce(v_name, 'Lična firma');

  insert into fo_orgs (name, owner_user_id) values (v_name, v_user_id)
  returning id into v_org_id;

  insert into fo_org_members (org_id, user_id, role, accepted_at)
  values (v_org_id, v_user_id, 'owner', now())
  on conflict (org_id, user_id) do nothing;

  return v_org_id;
end;
$$;

revoke all on function fo_ensure_default_org(uuid) from public, anon;
grant execute on function fo_ensure_default_org(uuid) to authenticated;

-- ============================================================================
-- 5. fo_my_orgs() — list orgs the caller is a member of, with role.
-- ============================================================================
create or replace function fo_my_orgs()
returns table (org_id uuid, name text, role text, owner_user_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public stable
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  return query
    select o.id, o.name, m.role, o.owner_user_id, o.created_at
    from fo_orgs o
    join fo_org_members m on m.org_id = o.id
    where m.user_id = v_user_id
    order by o.created_at asc;
end;
$$;

revoke all on function fo_my_orgs() from public, anon;
grant execute on function fo_my_orgs() to authenticated;

-- ============================================================================
-- 6. fo_switch_org() — stub. Validates membership, sets a session GUC that the
--    UI will read in a later migration. Returns the active org_id on success.
-- ============================================================================
create or replace function fo_switch_org(p_org_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_member boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_org_id is null then
    raise exception 'org_id required' using errcode = '22023';
  end if;

  select exists (
    select 1 from fo_org_members
    where org_id = p_org_id and user_id = v_user_id
  ) into v_member;

  if not v_member then
    raise exception 'not a member of org %', p_org_id using errcode = '42501';
  end if;

  -- Local (transaction-scoped) GUC. Real session-scoped propagation will be
  -- wired in once the UI starts reading active_org_id from the JWT claim.
  perform set_config('request.active_org', p_org_id::text, true);
  return p_org_id;
end;
$$;

revoke all on function fo_switch_org(uuid) from public, anon;
grant execute on function fo_switch_org(uuid) to authenticated;

-- ============================================================================
-- 7. Add nullable org_id columns to all tenant tables
-- ============================================================================
alter table fo_invoices             add column org_id uuid references fo_orgs(id) on delete cascade;
alter table fo_clients              add column org_id uuid references fo_orgs(id) on delete cascade;
alter table fo_recurring_schedules  add column org_id uuid references fo_orgs(id) on delete cascade;
alter table fo_bank_imports         add column org_id uuid references fo_orgs(id) on delete cascade;
alter table fo_bank_transactions    add column org_id uuid references fo_orgs(id) on delete cascade;
alter table fo_sef_documents        add column org_id uuid references fo_orgs(id) on delete cascade;
alter table fo_sef_inbox            add column org_id uuid references fo_orgs(id) on delete cascade;
alter table fo_sef_archive          add column org_id uuid references fo_orgs(id) on delete cascade;

create index fo_invoices_org_idx             on fo_invoices            (org_id);
create index fo_clients_org_idx              on fo_clients             (org_id);
create index fo_recurring_schedules_org_idx  on fo_recurring_schedules (org_id);
create index fo_bank_imports_org_idx         on fo_bank_imports        (org_id);
create index fo_bank_transactions_org_idx    on fo_bank_transactions   (org_id);
create index fo_sef_documents_org_idx        on fo_sef_documents       (org_id);
create index fo_sef_inbox_org_idx            on fo_sef_inbox           (org_id);
create index fo_sef_archive_org_idx          on fo_sef_archive         (org_id);

-- ============================================================================
-- 8. Backfill: create a personal org for every existing user_id, then update
--    every existing row to point at that org.
-- ============================================================================
do $$
declare
  r record;
begin
  -- Pre-create orgs for every distinct user that owns rows in any tenant table
  -- OR has a profile row (covers users who haven't created data yet).
  for r in
    select distinct uid from (
      select id as uid from fo_profiles
      union
      select user_id from fo_invoices
      union
      select user_id from fo_clients
      union
      select user_id from fo_recurring_schedules
      union
      select user_id from fo_bank_imports
      union
      select user_id from fo_bank_transactions
      union
      select user_id from fo_sef_documents
      union
      select user_id from fo_sef_inbox
      union
      select user_id from fo_sef_archive
    ) s
    where uid is not null
  loop
    perform fo_ensure_default_org(r.uid);
  end loop;
end$$;

-- Now backfill org_id on every tenant row from the user's default (oldest) org.
update fo_invoices            t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;
update fo_clients             t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;
update fo_recurring_schedules t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;
update fo_bank_imports        t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;
update fo_bank_transactions   t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;
update fo_sef_documents       t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;
update fo_sef_inbox           t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;
update fo_sef_archive         t set org_id = (select id from fo_orgs where owner_user_id = t.user_id order by created_at asc limit 1) where org_id is null;

-- ============================================================================
-- 9. Add NOT VALID check constraints first, then validate.
--    (Cheaper than NOT NULL on huge tables, and lets us reject new NULL writes
--    without rewriting the heap.)
-- ============================================================================
alter table fo_invoices             add constraint fo_invoices_org_id_not_null             check (org_id is not null) not valid;
alter table fo_clients              add constraint fo_clients_org_id_not_null              check (org_id is not null) not valid;
alter table fo_recurring_schedules  add constraint fo_recurring_schedules_org_id_not_null  check (org_id is not null) not valid;
alter table fo_bank_imports         add constraint fo_bank_imports_org_id_not_null         check (org_id is not null) not valid;
alter table fo_bank_transactions    add constraint fo_bank_transactions_org_id_not_null    check (org_id is not null) not valid;
alter table fo_sef_documents        add constraint fo_sef_documents_org_id_not_null        check (org_id is not null) not valid;
alter table fo_sef_inbox            add constraint fo_sef_inbox_org_id_not_null            check (org_id is not null) not valid;
alter table fo_sef_archive          add constraint fo_sef_archive_org_id_not_null          check (org_id is not null) not valid;

alter table fo_invoices             validate constraint fo_invoices_org_id_not_null;
alter table fo_clients              validate constraint fo_clients_org_id_not_null;
alter table fo_recurring_schedules  validate constraint fo_recurring_schedules_org_id_not_null;
alter table fo_bank_imports         validate constraint fo_bank_imports_org_id_not_null;
alter table fo_bank_transactions    validate constraint fo_bank_transactions_org_id_not_null;
alter table fo_sef_documents        validate constraint fo_sef_documents_org_id_not_null;
alter table fo_sef_inbox            validate constraint fo_sef_inbox_org_id_not_null;
alter table fo_sef_archive          validate constraint fo_sef_archive_org_id_not_null;

-- ============================================================================
-- 10. ADDITIVE org-membership RLS policies. Existing user_id policies stay.
--     A user can access a row if they own it (existing policy) OR if they are
--     a member of the row's org.
-- ============================================================================
create policy fo_invoices_select_via_org on fo_invoices
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_invoices.org_id and m.user_id = auth.uid())
  );
create policy fo_invoices_insert_via_org on fo_invoices
  for insert to authenticated with check (
    exists (select 1 from fo_org_members m where m.org_id = fo_invoices.org_id and m.user_id = auth.uid())
  );
create policy fo_invoices_update_via_org on fo_invoices
  for update to authenticated
  using (exists (select 1 from fo_org_members m where m.org_id = fo_invoices.org_id and m.user_id = auth.uid()))
  with check (exists (select 1 from fo_org_members m where m.org_id = fo_invoices.org_id and m.user_id = auth.uid()));
create policy fo_invoices_delete_via_org on fo_invoices
  for delete to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_invoices.org_id and m.user_id = auth.uid())
  );

create policy fo_clients_select_via_org on fo_clients
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_clients.org_id and m.user_id = auth.uid())
  );
create policy fo_clients_insert_via_org on fo_clients
  for insert to authenticated with check (
    exists (select 1 from fo_org_members m where m.org_id = fo_clients.org_id and m.user_id = auth.uid())
  );
create policy fo_clients_update_via_org on fo_clients
  for update to authenticated
  using (exists (select 1 from fo_org_members m where m.org_id = fo_clients.org_id and m.user_id = auth.uid()))
  with check (exists (select 1 from fo_org_members m where m.org_id = fo_clients.org_id and m.user_id = auth.uid()));
create policy fo_clients_delete_via_org on fo_clients
  for delete to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_clients.org_id and m.user_id = auth.uid())
  );

create policy fo_recurring_schedules_select_via_org on fo_recurring_schedules
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_recurring_schedules.org_id and m.user_id = auth.uid())
  );
create policy fo_recurring_schedules_insert_via_org on fo_recurring_schedules
  for insert to authenticated with check (
    exists (select 1 from fo_org_members m where m.org_id = fo_recurring_schedules.org_id and m.user_id = auth.uid())
  );
create policy fo_recurring_schedules_update_via_org on fo_recurring_schedules
  for update to authenticated
  using (exists (select 1 from fo_org_members m where m.org_id = fo_recurring_schedules.org_id and m.user_id = auth.uid()))
  with check (exists (select 1 from fo_org_members m where m.org_id = fo_recurring_schedules.org_id and m.user_id = auth.uid()));
create policy fo_recurring_schedules_delete_via_org on fo_recurring_schedules
  for delete to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_recurring_schedules.org_id and m.user_id = auth.uid())
  );

create policy fo_bank_imports_select_via_org on fo_bank_imports
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_bank_imports.org_id and m.user_id = auth.uid())
  );
create policy fo_bank_imports_insert_via_org on fo_bank_imports
  for insert to authenticated with check (
    exists (select 1 from fo_org_members m where m.org_id = fo_bank_imports.org_id and m.user_id = auth.uid())
  );
create policy fo_bank_imports_delete_via_org on fo_bank_imports
  for delete to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_bank_imports.org_id and m.user_id = auth.uid())
  );

create policy fo_bank_txn_select_via_org on fo_bank_transactions
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_bank_transactions.org_id and m.user_id = auth.uid())
  );
create policy fo_bank_txn_insert_via_org on fo_bank_transactions
  for insert to authenticated with check (
    exists (select 1 from fo_org_members m where m.org_id = fo_bank_transactions.org_id and m.user_id = auth.uid())
  );
create policy fo_bank_txn_update_via_org on fo_bank_transactions
  for update to authenticated
  using (exists (select 1 from fo_org_members m where m.org_id = fo_bank_transactions.org_id and m.user_id = auth.uid()))
  with check (exists (select 1 from fo_org_members m where m.org_id = fo_bank_transactions.org_id and m.user_id = auth.uid()));
create policy fo_bank_txn_delete_via_org on fo_bank_transactions
  for delete to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_bank_transactions.org_id and m.user_id = auth.uid())
  );

create policy fo_sef_documents_select_via_org on fo_sef_documents
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_sef_documents.org_id and m.user_id = auth.uid())
  );

create policy fo_sef_inbox_select_via_org on fo_sef_inbox
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_sef_inbox.org_id and m.user_id = auth.uid())
  );
create policy fo_sef_inbox_update_via_org on fo_sef_inbox
  for update to authenticated
  using (exists (select 1 from fo_org_members m where m.org_id = fo_sef_inbox.org_id and m.user_id = auth.uid()))
  with check (exists (select 1 from fo_org_members m where m.org_id = fo_sef_inbox.org_id and m.user_id = auth.uid()));

create policy fo_sef_archive_select_via_org on fo_sef_archive
  for select to authenticated using (
    exists (select 1 from fo_org_members m where m.org_id = fo_sef_archive.org_id and m.user_id = auth.uid())
  );
