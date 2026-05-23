-- SEF + PII hardening (Phase 4)
-- Applied to ubwxjlclvootvrxwsrpa
set search_path = public;

alter table fo_sef_inbox drop column if exists raw_xml_excerpt;

alter table fo_profiles add column if not exists sef_callback_secret_hash text;

-- Admin PII access auditing inside fo_admin_stats / fo_admin_audit
create or replace function fo_admin_stats()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid(); v_is_admin boolean;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select is_admin into v_is_admin from fo_profiles where id = v_user_id;
  if v_is_admin is not true then raise exception 'admin access required' using errcode = '42501'; end if;
  insert into fo_audit_log (user_id, action, resource_type, metadata)
  values (v_user_id, 'admin.access', 'admin_stats', '{"function":"fo_admin_stats"}'::jsonb);
  return jsonb_build_object(
    'total_users', (select count(*) from fo_profiles),
    'total_clients', (select count(*) from fo_clients),
    'total_invoices', (select count(*) from fo_invoices),
    'total_revenue', (select coalesce(sum(total), 0) from fo_invoices where status = 'paid'),
    'invoices_by_status', (select coalesce(jsonb_object_agg(status, c), '{}'::jsonb)
      from (select status::text, count(*) as c from fo_invoices group by status) s),
    'lead_signups_count', (select count(*) from lead_signups),
    'recent_signups', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'email', email, 'owner_name', owner_name,
      'company_name', company_name, 'created_at', created_at, 'is_admin', is_admin
    )), '[]'::jsonb) from (select * from fo_profiles order by created_at desc limit 50) p),
    'recent_leads', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'business_name', business_name, 'contact_name', contact_name,
      'email', email, 'phone', phone, 'city', city, 'created_at', created_at
    )), '[]'::jsonb) from (select * from lead_signups order by created_at desc limit 50) l)
  );
end;
$$;

create or replace function fo_admin_audit(p_limit integer default 200)
returns setof fo_audit_log
language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid(); v_is_admin boolean;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select is_admin into v_is_admin from fo_profiles where id = v_user_id;
  if v_is_admin is not true then raise exception 'admin access required' using errcode = '42501'; end if;
  insert into fo_audit_log (user_id, action, resource_type, metadata)
  values (v_user_id, 'admin.access', 'admin_audit', jsonb_build_object('limit', p_limit));
  return query select * from fo_audit_log order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

create or replace function fo_anonymize_on_user_delete()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update fo_audit_log set
    ip = regexp_replace(coalesce(ip, ''), '\.\d+$', '.0'),
    user_agent = null, metadata = '{}'::jsonb
  where user_id = old.id;
  return old;
end;
$$;
drop trigger if exists fo_on_auth_user_deleted on auth.users;
create trigger fo_on_auth_user_deleted before delete on auth.users
  for each row execute function fo_anonymize_on_user_delete();
