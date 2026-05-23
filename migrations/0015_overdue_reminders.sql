-- Sprint 5: Overdue invoice reminders (3-step cadence: D+1, D+7, D+14).
-- Service-role daily cron picks invoices whose due_date has passed and whose
-- matching cadence level has not been logged yet, sends email via Resend, and
-- records the send here (idempotent via unique constraint).

set search_path = public;

create table fo_overdue_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references fo_invoices(id) on delete cascade,
  level integer not null check (level in (1, 2, 3)),  -- 1=D+1, 2=D+7, 3=D+14
  sent_at timestamptz not null default now(),
  email_address text not null,
  created_at timestamptz not null default now(),
  -- Never send the same cadence cell twice for the same invoice.
  constraint fo_overdue_reminders_invoice_level_uq unique (invoice_id, level)
);

create index fo_overdue_reminders_user_idx
  on fo_overdue_reminders (user_id, sent_at desc);
create index fo_overdue_reminders_invoice_idx
  on fo_overdue_reminders (invoice_id, level);

alter table fo_overdue_reminders enable row level security;

-- Owners can read their own log entries. Inserts happen only via service role
-- (the cron) — no insert policy for authenticated users.
create policy fo_overdue_reminders_select on fo_overdue_reminders
  for select to authenticated using (user_id = auth.uid());

revoke all on fo_overdue_reminders from anon, authenticated;
grant select on fo_overdue_reminders to authenticated;

-- ============================================================================
-- fo_invoices_needing_reminder()
-- Returns invoices whose due_date has passed, in status sent/overdue, where the
-- matching cadence level row has not yet been written to fo_overdue_reminders.
-- Cadence:
--   level 1 once days_overdue >= 1 and < 7
--   level 2 once days_overdue >= 7 and < 14
--   level 3 once days_overdue >= 14
-- A previously-skipped level is still re-attempted as long as its window is
-- the lowest unsent level for that invoice (we don't backfill ancient ones
-- where the higher level already went out — uniqueness on (invoice_id, level)
-- guarantees no duplicate).
-- ============================================================================
create or replace function fo_invoices_needing_reminder()
returns table (
  invoice_id uuid,
  user_id uuid,
  client_id uuid,
  level integer,
  days_overdue integer
)
language sql security definer set search_path = public
as $$
  with overdue as (
    select
      i.id           as invoice_id,
      i.user_id      as user_id,
      i.client_id    as client_id,
      (current_date - i.due_date)::integer as days_overdue
    from fo_invoices i
    where i.status in ('sent', 'overdue')
      and i.due_date is not null
      and i.due_date < current_date
  ),
  candidate as (
    select
      o.invoice_id,
      o.user_id,
      o.client_id,
      o.days_overdue,
      case
        when o.days_overdue >= 14 then 3
        when o.days_overdue >= 7  then 2
        when o.days_overdue >= 1  then 1
        else null
      end as level
    from overdue o
  )
  select
    c.invoice_id,
    c.user_id,
    c.client_id,
    c.level,
    c.days_overdue
  from candidate c
  where c.level is not null
    and not exists (
      select 1 from fo_overdue_reminders r
       where r.invoice_id = c.invoice_id
         and r.level = c.level
    );
$$;

revoke all on function fo_invoices_needing_reminder() from public, anon, authenticated;
grant execute on function fo_invoices_needing_reminder() to service_role;

-- ============================================================================
-- fo_record_reminder(invoice_id, level, email)
-- Inserts a fo_overdue_reminders row. Returns the new row id (or null on
-- conflict, which means another worker already logged this cell).
-- Looks up the owning user_id from fo_invoices so callers don't need to pass
-- it (service role context only).
-- ============================================================================
create or replace function fo_record_reminder(
  p_invoice_id uuid,
  p_level integer,
  p_email text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  if p_level not in (1, 2, 3) then
    raise exception 'invalid level: %', p_level using errcode = '22023';
  end if;

  select user_id into v_user_id
    from fo_invoices where id = p_invoice_id;
  if v_user_id is null then
    raise exception 'invoice not found: %', p_invoice_id using errcode = 'P0002';
  end if;

  insert into fo_overdue_reminders (user_id, invoice_id, level, email_address)
       values (v_user_id, p_invoice_id, p_level, p_email)
  on conflict (invoice_id, level) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function fo_record_reminder(uuid, integer, text) from public, anon, authenticated;
grant execute on function fo_record_reminder(uuid, integer, text) to service_role;
