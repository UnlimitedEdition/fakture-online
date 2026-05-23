-- Fakture Online — Performance indexes
-- Migration: 0004

set search_path = public;

create index fo_clients_user_idx              on fo_clients (user_id);
create index fo_invoices_user_status_idx      on fo_invoices (user_id, status);
create index fo_invoices_user_created_idx     on fo_invoices (user_id, created_at desc);
create index fo_invoices_client_idx           on fo_invoices (client_id);
create index fo_invoice_items_invoice_idx     on fo_invoice_items (invoice_id);
create index fo_audit_log_user_created_idx    on fo_audit_log (user_id, created_at desc);
create index fo_audit_log_action_created_idx  on fo_audit_log (action, created_at desc);
create index lead_signups_created_idx         on lead_signups (created_at desc);
create index fo_subscriptions_status_idx      on fo_subscriptions (status);
create index fo_payments_user_created_idx     on fo_payments (user_id, created_at desc);
