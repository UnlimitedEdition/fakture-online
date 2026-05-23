-- Sprint 3: Recurring invoices
set search_path = public;

create type fo_recurring_frequency as enum (
  'weekly', 'monthly', 'quarterly', 'yearly'
);
create type fo_recurring_status as enum ('active', 'paused', 'ended');

create table fo_recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references fo_clients(id) on delete restrict,
  name text not null,                          -- "Mesečni retainer ACME"
  frequency fo_recurring_frequency not null,
  day_of_month integer,                        -- 1-28 for monthly/quarterly/yearly
  day_of_week integer,                         -- 0-6 for weekly (0=sunday)
  next_run_date date not null,                 -- when next invoice should be created
  start_date date not null,
  end_date date,                               -- null = forever
  status fo_recurring_status not null default 'active',
  tax_rate numeric(5, 2) not null default 0,
  currency text not null default 'RSD',
  notes text not null default '',
  payment_method text not null default '',
  due_days integer not null default 15,        -- invoice due_date = issue_date + due_days
  auto_send_email boolean not null default false,
  auto_send_sef boolean not null default false,
  last_generated_at timestamptz,
  last_generated_invoice_id uuid references fo_invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fo_recurring_user_idx on fo_recurring_schedules (user_id, status, next_run_date);
create index fo_recurring_due_idx on fo_recurring_schedules (next_run_date)
  where status = 'active';

create table fo_recurring_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references fo_recurring_schedules(id) on delete cascade,
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'kom',
  unit_price numeric(12, 2) not null default 0,
  sort_order integer not null default 0
);

create index fo_recurring_items_schedule_idx on fo_recurring_items (schedule_id, sort_order);

alter table fo_recurring_schedules enable row level security;
alter table fo_recurring_items enable row level security;

create policy fo_recurring_schedules_select on fo_recurring_schedules
  for select to authenticated using (user_id = auth.uid());
create policy fo_recurring_schedules_insert on fo_recurring_schedules
  for insert to authenticated with check (user_id = auth.uid());
create policy fo_recurring_schedules_update on fo_recurring_schedules
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fo_recurring_schedules_delete on fo_recurring_schedules
  for delete to authenticated using (user_id = auth.uid());

create policy fo_recurring_items_select on fo_recurring_items
  for select to authenticated using (
    exists (select 1 from fo_recurring_schedules s where s.id = schedule_id and s.user_id = auth.uid())
  );
create policy fo_recurring_items_insert on fo_recurring_items
  for insert to authenticated with check (
    exists (select 1 from fo_recurring_schedules s where s.id = schedule_id and s.user_id = auth.uid())
  );
create policy fo_recurring_items_update on fo_recurring_items
  for update to authenticated using (
    exists (select 1 from fo_recurring_schedules s where s.id = schedule_id and s.user_id = auth.uid())
  );
create policy fo_recurring_items_delete on fo_recurring_items
  for delete to authenticated using (
    exists (select 1 from fo_recurring_schedules s where s.id = schedule_id and s.user_id = auth.uid())
  );

revoke all on fo_recurring_schedules, fo_recurring_items from anon, authenticated;
grant select, insert, update, delete on fo_recurring_schedules to authenticated;
grant select, insert, update, delete on fo_recurring_items to authenticated;
create trigger fo_recurring_schedules_touch before update on fo_recurring_schedules
  for each row execute function fo_touch_updated_at();

-- ============================================================================
-- fo_recurring_generate_due() — service-role, called from daily cron.
-- For every active schedule with next_run_date <= today, atomically:
--   1. create invoice + items from schedule
--   2. compute next_run_date based on frequency
--   3. update schedule.last_generated_invoice_id + last_generated_at
-- Returns count of generated invoices.
-- ============================================================================
create or replace function fo_recurring_generate_due()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_sched record;
  v_invoice_id uuid;
  v_number text;
  v_subtotal numeric(12, 2);
  v_tax numeric(12, 2);
  v_total numeric(12, 2);
  v_count integer := 0;
  v_errors integer := 0;
begin
  for v_sched in
    select * from fo_recurring_schedules
     where status = 'active'
       and next_run_date <= current_date
       and (end_date is null or end_date >= current_date)
  loop
    begin
      -- Compute totals from items
      select
        coalesce(sum(quantity * unit_price), 0),
        coalesce(sum(quantity * unit_price), 0) * v_sched.tax_rate / 100
      into v_subtotal, v_tax
      from fo_recurring_items where schedule_id = v_sched.id;
      v_total := round(v_subtotal + v_tax, 2);

      if v_subtotal = 0 then
        v_errors := v_errors + 1;
        continue;
      end if;

      -- Allocate next invoice number for the OWNING user (bypass auth.uid
      -- check by inlining the increment since this is service role context)
      update fo_profiles
         set next_invoice_number = next_invoice_number + 1
       where id = v_sched.user_id
       returning invoice_prefix, next_invoice_number - 1
      into v_number, v_count;

      v_number := v_number || '-' || lpad(coalesce(v_count, 1)::text, 4, '0')
                  || '-' || to_char(now(), 'YYYY');

      -- Create the invoice
      insert into fo_invoices (
        user_id, client_id, invoice_number, issue_date, due_date,
        tax_rate, subtotal, tax_amount, total, currency, notes, payment_method
      ) values (
        v_sched.user_id, v_sched.client_id, v_number,
        current_date,
        current_date + (v_sched.due_days * interval '1 day'),
        v_sched.tax_rate,
        round(v_subtotal, 2),
        round(v_tax, 2),
        v_total,
        v_sched.currency,
        v_sched.notes,
        v_sched.payment_method
      ) returning id into v_invoice_id;

      -- Copy items
      insert into fo_invoice_items (invoice_id, description, quantity, unit, unit_price, total, sort_order)
      select v_invoice_id, description, quantity, unit, unit_price,
             round(quantity * unit_price, 2), sort_order
        from fo_recurring_items where schedule_id = v_sched.id;

      -- Advance next_run_date per frequency
      update fo_recurring_schedules set
        next_run_date = case v_sched.frequency
          when 'weekly' then v_sched.next_run_date + 7
          when 'monthly' then v_sched.next_run_date + interval '1 month'
          when 'quarterly' then v_sched.next_run_date + interval '3 months'
          when 'yearly' then v_sched.next_run_date + interval '1 year'
          end::date,
        last_generated_at = now(),
        last_generated_invoice_id = v_invoice_id,
        -- auto-end if past end_date
        status = case
          when end_date is not null and (case v_sched.frequency
            when 'weekly' then v_sched.next_run_date + 7
            when 'monthly' then v_sched.next_run_date + interval '1 month'
            when 'quarterly' then v_sched.next_run_date + interval '3 months'
            when 'yearly' then v_sched.next_run_date + interval '1 year'
            end::date) > end_date then 'ended'::fo_recurring_status
          else status
        end
      where id = v_sched.id;

      v_count := v_count + 1;
    exception when others then
      v_errors := v_errors + 1;
    end;
  end loop;

  return jsonb_build_object('generated', v_count, 'errors', v_errors, 'ran_at', now());
end;
$$;

revoke all on function fo_recurring_generate_due() from public, anon, authenticated;
