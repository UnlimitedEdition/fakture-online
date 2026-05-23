-- Fakture Online — Initial Schema
-- Migration: 0001
-- Run this on a FRESH Supabase project (not the shared one).

set search_path = public;

-- ============================================================================
-- Profiles (one row per auth user)
-- ============================================================================
create table fo_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null default '',
  owner_name text not null default '',
  pib text not null default '',
  maticni_broj text not null default '',
  address text not null default '',
  city text not null default '',
  zip_code text not null default '',
  phone text not null default '',
  email text not null default '',
  bank_account text not null default '',
  logo_url text not null default '',
  invoice_prefix text not null default 'FAK',
  next_invoice_number integer not null default 1,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Clients
-- ============================================================================
create table fo_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text not null default '',
  pib text not null default '',
  maticni_broj text not null default '',
  address text not null default '',
  city text not null default '',
  zip_code text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Invoices + items
-- ============================================================================
create type fo_invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');

create table fo_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references fo_clients(id) on delete restrict,
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date,
  status fo_invoice_status not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'RSD',
  notes text not null default '',
  payment_method text not null default '',
  paid_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table fo_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references fo_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text not null default 'kom',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Lead signups (landing-page captures)
-- ============================================================================
create table lead_signups (
  id uuid primary key default gen_random_uuid(),
  niche text not null default '',
  business_name text not null default '',
  contact_name text not null,
  phone text not null,
  email text,
  city text,
  message text,
  business_type text,
  source text not null default 'landing',
  ip text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Audit log
-- ============================================================================
create table fo_audit_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  success boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Subscriptions + payments (billing scaffold)
-- Local Serbian processor (NestPay / CorvusPay / Monri) wired in later.
-- ============================================================================
create type fo_subscription_status as enum ('trial', 'active', 'past_due', 'cancelled', 'expired');
create type fo_plan as enum ('free', 'starter', 'pro', 'business');

create table fo_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan fo_plan not null default 'free',
  status fo_subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  processor text,
  processor_customer_id text,
  processor_subscription_id text,
  processor_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fo_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references fo_subscriptions(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'RSD',
  status text not null,
  processor text,
  processor_payment_id text,
  processor_data jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Updated-at triggers
-- ============================================================================
create or replace function fo_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger fo_profiles_touch       before update on fo_profiles       for each row execute function fo_touch_updated_at();
create trigger fo_clients_touch        before update on fo_clients        for each row execute function fo_touch_updated_at();
create trigger fo_invoices_touch       before update on fo_invoices       for each row execute function fo_touch_updated_at();
create trigger fo_subscriptions_touch  before update on fo_subscriptions  for each row execute function fo_touch_updated_at();

-- ============================================================================
-- Enable RLS everywhere (policies defined in 0002)
-- ============================================================================
alter table fo_profiles       enable row level security;
alter table fo_clients        enable row level security;
alter table fo_invoices       enable row level security;
alter table fo_invoice_items  enable row level security;
alter table lead_signups      enable row level security;
alter table fo_audit_log      enable row level security;
alter table fo_subscriptions  enable row level security;
alter table fo_payments       enable row level security;
