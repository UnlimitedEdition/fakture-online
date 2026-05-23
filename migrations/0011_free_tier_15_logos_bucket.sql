-- Sprint 1: raise free tier to 15 invoices/month (was 5), add private logos bucket
set search_path = public;

-- Bump free tier limit from 5 to 15 (matches market positioning vs Eurofaktura 70)
create or replace function fo_can_create_invoice()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan fo_plan;
  v_status fo_subscription_status;
  v_count_this_month integer;
  v_free_tier_limit constant integer := 15;
begin
  if v_user_id is null then return false; end if;
  select plan, status into v_plan, v_status from fo_subscriptions where user_id = v_user_id;
  if v_plan is null then v_plan := 'free'; v_status := 'trial'; end if;
  if v_plan in ('starter', 'pro', 'business') and v_status in ('trial', 'active') then return true; end if;
  select count(*) into v_count_this_month from fo_invoices
   where user_id = v_user_id and created_at >= date_trunc('month', now());
  return v_count_this_month < v_free_tier_limit;
end;
$$;

-- Private logos bucket — owner-scoped via RLS path prefix
insert into storage.buckets (id, name, public)
  values ('logos', 'logos', false)
  on conflict (id) do update set public = false;

create policy logos_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy logos_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy logos_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy logos_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
