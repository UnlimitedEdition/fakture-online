-- Fakture Online — Post-migration hardening
-- Migration: 0006
-- Run after 0005. Addresses Supabase advisor warnings + adds Storage bucket
-- and RLS for sef-xml.

set search_path = public;

-- Fix function_search_path_mutable on the only function that lacked it
create or replace function fo_touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- fo_handle_new_user is a trigger only; revoke RPC callability so it can't be
-- invoked via /rest/v1/rpc/fo_handle_new_user with caller-controlled `new`.
revoke all on function fo_handle_new_user() from public, anon, authenticated;

-- ============================================================================
-- Storage: sef-xml bucket + tenant-scoped RLS policies on storage.objects
-- (10-year retention is enforced by fo_sef_archive.retention_until at the
-- app layer; no UPDATE/DELETE permitted for authenticated users — only the
-- service role can purge after retention.)
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('sef-xml', 'sef-xml', false)
  on conflict (id) do update set public = false;

create policy sef_xml_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sef-xml'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy sef_xml_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sef-xml'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Block user UPDATE / DELETE on archived XML (retention)
create policy sef_xml_block_user_delete on storage.objects
  for delete to authenticated using (false);

create policy sef_xml_block_user_update on storage.objects
  for update to authenticated using (false);
