-- Fakture Online — Row Level Security policies
-- Migration: 0002
-- Strict scoping by auth.uid(). No `OR (... IS NULL)` escapes anywhere.

set search_path = public;

-- ----------------------------------------------------------------------------
-- fo_profiles: each user reads/writes only their own row
-- ----------------------------------------------------------------------------
create policy fo_profiles_select on fo_profiles
  for select to authenticated using (id = auth.uid());

create policy fo_profiles_insert on fo_profiles
  for insert to authenticated with check (id = auth.uid());

create policy fo_profiles_update on fo_profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- No DELETE policy: cascade from auth.users handles cleanup.

-- ----------------------------------------------------------------------------
-- fo_clients: scoped by user_id
-- ----------------------------------------------------------------------------
create policy fo_clients_select on fo_clients
  for select to authenticated using (user_id = auth.uid());

create policy fo_clients_insert on fo_clients
  for insert to authenticated with check (user_id = auth.uid());

create policy fo_clients_update on fo_clients
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy fo_clients_delete on fo_clients
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- fo_invoices: scoped by user_id
-- ----------------------------------------------------------------------------
create policy fo_invoices_select on fo_invoices
  for select to authenticated using (user_id = auth.uid());

create policy fo_invoices_insert on fo_invoices
  for insert to authenticated with check (user_id = auth.uid());

create policy fo_invoices_update on fo_invoices
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy fo_invoices_delete on fo_invoices
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- fo_invoice_items: scoped via parent invoice ownership
-- ----------------------------------------------------------------------------
create policy fo_invoice_items_select on fo_invoice_items
  for select to authenticated using (
    exists (select 1 from fo_invoices i where i.id = invoice_id and i.user_id = auth.uid())
  );

create policy fo_invoice_items_insert on fo_invoice_items
  for insert to authenticated with check (
    exists (select 1 from fo_invoices i where i.id = invoice_id and i.user_id = auth.uid())
  );

create policy fo_invoice_items_update on fo_invoice_items
  for update to authenticated
  using (
    exists (select 1 from fo_invoices i where i.id = invoice_id and i.user_id = auth.uid())
  ) with check (
    exists (select 1 from fo_invoices i where i.id = invoice_id and i.user_id = auth.uid())
  );

create policy fo_invoice_items_delete on fo_invoice_items
  for delete to authenticated using (
    exists (select 1 from fo_invoices i where i.id = invoice_id and i.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- lead_signups: INSERT-only for anon (landing form). No SELECT policy
-- → admins read via fo_admin_stats() (SECURITY DEFINER) which bypasses RLS.
-- ----------------------------------------------------------------------------
create policy lead_signups_insert on lead_signups
  for insert to anon, authenticated with check (true);

-- ----------------------------------------------------------------------------
-- fo_audit_log: NO direct policies. All writes go through fo_log_audit() RPC.
-- All reads go through fo_admin_stats() / fo_admin_audit() RPCs.
-- RLS enabled with no policies = effectively locked to SECURITY DEFINER funcs.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- fo_subscriptions: user reads their own row only
-- Writes happen via service role from payment webhook.
-- ----------------------------------------------------------------------------
create policy fo_subscriptions_select on fo_subscriptions
  for select to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- fo_payments: user reads their own payments
-- ----------------------------------------------------------------------------
create policy fo_payments_select on fo_payments
  for select to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Grants — keep narrow. Anon cannot touch fo_* tables.
-- ----------------------------------------------------------------------------
revoke all on fo_profiles, fo_clients, fo_invoices, fo_invoice_items,
              fo_audit_log, fo_subscriptions, fo_payments, lead_signups
       from anon, authenticated;

grant select, insert, update on fo_profiles to authenticated;
grant select, insert, update, delete on fo_clients to authenticated;
grant select, insert, update, delete on fo_invoices to authenticated;
grant select, insert, update, delete on fo_invoice_items to authenticated;
grant select on fo_subscriptions to authenticated;
grant select on fo_payments to authenticated;
grant insert on lead_signups to anon, authenticated;
