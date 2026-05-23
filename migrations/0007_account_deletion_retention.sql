-- Account deletion + retention purge (Phase 3)
-- Applied to ubwxjlclvootvrxwsrpa
set search_path = public;

create or replace function fo_anonymize_my_data()
returns void
language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update fo_invoices set
    notes = case when sef_document_id is not null then '[redacted]' else notes end,
    payment_method = case when sef_document_id is not null then '[redacted]' else payment_method end
  where user_id = v_user_id and sef_document_id is not null;
  delete from fo_invoices where user_id = v_user_id and sef_document_id is null;
  delete from fo_clients where user_id = v_user_id
    and id not in (select client_id from fo_invoices where user_id = v_user_id);
  update fo_clients set
    company_name = '[redacted]', contact_name = '', email = '', phone = '',
    pib = '', maticni_broj = '', address = '', notes = ''
  where user_id = v_user_id;
  update fo_audit_log set
    ip = regexp_replace(ip, '\.\d+$', '.0'),
    user_agent = null, metadata = '{}'::jsonb
  where user_id = v_user_id;
end;
$$;
revoke all on function fo_anonymize_my_data() from public, anon;
grant execute on function fo_anonymize_my_data() to authenticated;

create or replace function fo_export_my_data()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'exported_at', now(), 'user_id', v_user_id,
    'profile', (select row_to_json(p) from (
      select id, company_name, owner_name, pib, maticni_broj, address, city,
             zip_code, phone, email, bank_account, invoice_prefix,
             next_invoice_number, is_admin, jbkjs, is_budget_user,
             sef_demo_mode, created_at, updated_at
      from fo_profiles where id = v_user_id) p),
    'clients', (select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) from fo_clients c where c.user_id = v_user_id),
    'invoices', (select coalesce(jsonb_agg(row_to_json(i)), '[]'::jsonb) from fo_invoices i where i.user_id = v_user_id),
    'invoice_items', (select coalesce(jsonb_agg(row_to_json(it)), '[]'::jsonb) from fo_invoice_items it
      where it.invoice_id in (select id from fo_invoices where user_id = v_user_id)),
    'sef_inbox', (select coalesce(jsonb_agg(row_to_json(sx)), '[]'::jsonb) from fo_sef_inbox sx where sx.user_id = v_user_id),
    'sef_inbox_actions', (select coalesce(jsonb_agg(row_to_json(sa)), '[]'::jsonb) from fo_sef_inbox_actions sa where sa.user_id = v_user_id),
    'sef_documents', (select coalesce(jsonb_agg(row_to_json(sd)), '[]'::jsonb) from fo_sef_documents sd where sd.user_id = v_user_id),
    'subscriptions', (select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) from fo_subscriptions s where s.user_id = v_user_id),
    'payments', (select coalesce(jsonb_agg(row_to_json(pm)), '[]'::jsonb) from fo_payments pm where pm.user_id = v_user_id),
    'audit_log', (select coalesce(jsonb_agg(row_to_json(al)), '[]'::jsonb) from fo_audit_log al where al.user_id = v_user_id)
  );
end;
$$;
revoke all on function fo_export_my_data() from public, anon;
grant execute on function fo_export_my_data() to authenticated;

create or replace function fo_retention_purge()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_audit_deleted integer; v_leads_deleted integer; v_sef_docs_deleted integer;
begin
  delete from fo_audit_log
   where created_at < now() - interval '180 days' and not (action like 'admin.%');
  get diagnostics v_audit_deleted = row_count;
  delete from fo_audit_log where created_at < now() - interval '2 years';
  delete from lead_signups
   where created_at < now() - interval '90 days'
     and not exists (select 1 from auth.users u where lower(u.email) = lower(lead_signups.email));
  get diagnostics v_leads_deleted = row_count;
  delete from fo_sef_documents where created_at < now() - interval '2 years';
  get diagnostics v_sef_docs_deleted = row_count;
  return jsonb_build_object(
    'audit_deleted', v_audit_deleted, 'leads_deleted', v_leads_deleted,
    'sef_docs_deleted', v_sef_docs_deleted, 'purged_at', now()
  );
end;
$$;
revoke all on function fo_retention_purge() from public, anon, authenticated;
