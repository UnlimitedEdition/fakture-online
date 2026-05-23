-- Fakture Online — Org invites (multi-firma poziv flow)
-- Migration: 0019
--
-- Builds on 0018 (fo_orgs, fo_org_members). Adds a pending-invite table so an
-- org owner can invite a user (typically računovođa) by email even before that
-- person has registered. The invite carries a token; the recipient clicks
-- /orgs/accept?token=... and is converted into a fo_org_members row via the
-- SECURITY DEFINER RPC fo_accept_org_invite.
--
-- Applied to project ubwxjlclvootvrxwsrpa via Supabase MCP apply_migration.

set search_path = public;

-- ============================================================================
-- 1. fo_org_invites table
-- ============================================================================
create table fo_org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references fo_orgs(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','accountant','viewer')),
  token uuid not null default gen_random_uuid() unique,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  unique (org_id, email)
);

create index fo_org_invites_email_idx on fo_org_invites (lower(email));
create index fo_org_invites_org_idx on fo_org_invites (org_id);
create index fo_org_invites_token_idx on fo_org_invites (token);

-- Always store email lower-cased so the email-match RLS predicate is reliable.
create or replace function fo_org_invites_lowercase_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

create trigger fo_org_invites_lc_email
  before insert or update of email on fo_org_invites
  for each row execute function fo_org_invites_lowercase_email();

alter table fo_org_invites enable row level security;

-- ============================================================================
-- 2. RLS — owners of the org see invites for their org; invitees see invites
--    addressed to their (current auth) email.
-- ============================================================================
create policy fo_org_invites_select_owner on fo_org_invites
  for select to authenticated using (
    exists (
      select 1 from fo_orgs o
      where o.id = fo_org_invites.org_id and o.owner_user_id = auth.uid()
    )
  );

create policy fo_org_invites_select_invitee on fo_org_invites
  for select to authenticated using (
    lower(email) = lower((select email from auth.users where id = auth.uid()))
  );

revoke all on fo_org_invites from anon, authenticated;
grant select on fo_org_invites to authenticated;

-- ============================================================================
-- 3. fo_accept_org_invite(p_token) — converts an invite to a membership row.
-- ============================================================================
create or replace function fo_accept_org_invite(p_token uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite fo_org_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_token is null then
    raise exception 'token required' using errcode = '22023';
  end if;

  select email into v_user_email from auth.users where id = v_user_id;
  if v_user_email is null then
    raise exception 'user has no email' using errcode = '42501';
  end if;

  select * into v_invite from fo_org_invites where token = p_token;
  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite already accepted' using errcode = '22023';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite expired' using errcode = '22023';
  end if;
  if lower(v_invite.email) <> lower(v_user_email) then
    raise exception 'invite email does not match' using errcode = '42501';
  end if;

  insert into fo_org_members (org_id, user_id, role, accepted_at)
  values (v_invite.org_id, v_user_id, v_invite.role, now())
  on conflict (org_id, user_id) do update set
    role = excluded.role,
    accepted_at = coalesce(fo_org_members.accepted_at, now());

  update fo_org_invites set accepted_at = now() where id = v_invite.id;
  return v_invite.org_id;
end;
$$;

revoke all on function fo_accept_org_invite(uuid) from public, anon;
grant execute on function fo_accept_org_invite(uuid) to authenticated;

-- ============================================================================
-- 4. fo_create_org_invite(p_org_id, p_email, p_role) — owner-only create.
-- ============================================================================
create or replace function fo_create_org_invite(p_org_id uuid, p_email text, p_role text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_owner boolean;
  v_email text;
  v_token uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_org_id is null then
    raise exception 'org_id required' using errcode = '22023';
  end if;
  if p_role not in ('admin','accountant','viewer') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  select exists (
    select 1 from fo_orgs where id = p_org_id and owner_user_id = v_user_id
  ) into v_is_owner;
  if not v_is_owner then
    raise exception 'not owner of org %', p_org_id using errcode = '42501';
  end if;

  insert into fo_org_invites (org_id, invited_by, email, role)
  values (p_org_id, v_user_id, v_email, p_role)
  on conflict (org_id, email) do update set
    role = excluded.role,
    invited_by = excluded.invited_by,
    invited_at = now(),
    expires_at = now() + interval '7 days',
    accepted_at = null,
    token = gen_random_uuid()
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function fo_create_org_invite(uuid, text, text) from public, anon;
grant execute on function fo_create_org_invite(uuid, text, text) to authenticated;

-- ============================================================================
-- 5. fo_cancel_org_invite(p_invite_id) — owner-only invite cancel.
-- ============================================================================
create or replace function fo_cancel_org_invite(p_invite_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_invite_id is null then
    raise exception 'invite id required' using errcode = '22023';
  end if;

  delete from fo_org_invites i
  where i.id = p_invite_id
    and i.accepted_at is null
    and exists (
      select 1 from fo_orgs o
      where o.id = i.org_id and o.owner_user_id = v_user_id
    );
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function fo_cancel_org_invite(uuid) from public, anon;
grant execute on function fo_cancel_org_invite(uuid) to authenticated;

-- ============================================================================
-- 6. fo_create_org(p_name) — creates a new org + owner membership atomically.
-- ============================================================================
create or replace function fo_create_org(p_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    raise exception 'name required' using errcode = '22023';
  end if;
  if length(v_name) > 200 then
    raise exception 'name too long' using errcode = '22023';
  end if;

  insert into fo_orgs (name, owner_user_id) values (v_name, v_user_id)
  returning id into v_org_id;

  insert into fo_org_members (org_id, user_id, role, accepted_at)
  values (v_org_id, v_user_id, 'owner', now())
  on conflict (org_id, user_id) do nothing;

  return v_org_id;
end;
$$;

revoke all on function fo_create_org(text) from public, anon;
grant execute on function fo_create_org(text) to authenticated;

-- ============================================================================
-- 7. fo_org_members_list(p_org_id) — list members for an org you're a member of.
-- ============================================================================
create or replace function fo_org_members_list(p_org_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  email text,
  role text,
  invited_at timestamptz,
  accepted_at timestamptz
)
language plpgsql security definer set search_path = public stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_member boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select exists (
    select 1 from fo_org_members m
    where m.org_id = p_org_id and m.user_id = v_user_id
  ) into v_is_member;
  if not v_is_member then
    raise exception 'not a member of org %', p_org_id using errcode = '42501';
  end if;

  return query
    select m.id, m.user_id, u.email::text, m.role, m.invited_at, m.accepted_at
    from fo_org_members m
    left join auth.users u on u.id = m.user_id
    where m.org_id = p_org_id
    order by m.invited_at asc;
end;
$$;

revoke all on function fo_org_members_list(uuid) from public, anon;
grant execute on function fo_org_members_list(uuid) to authenticated;

-- ============================================================================
-- 8. fo_org_invites_list(p_org_id) — list pending invites for an org. Owner-only.
-- ============================================================================
create or replace function fo_org_invites_list(p_org_id uuid)
returns table (
  id uuid,
  email text,
  role text,
  invited_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz
)
language plpgsql security definer set search_path = public stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_owner boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select exists (
    select 1 from fo_orgs o
    where o.id = p_org_id and o.owner_user_id = v_user_id
  ) into v_is_owner;
  if not v_is_owner then
    raise exception 'not owner of org %', p_org_id using errcode = '42501';
  end if;

  return query
    select i.id, i.email, i.role, i.invited_at, i.expires_at, i.accepted_at
    from fo_org_invites i
    where i.org_id = p_org_id
    order by i.invited_at desc;
end;
$$;

revoke all on function fo_org_invites_list(uuid) from public, anon;
grant execute on function fo_org_invites_list(uuid) to authenticated;
