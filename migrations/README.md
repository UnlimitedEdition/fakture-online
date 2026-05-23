# Fakture Online — Database Migrations

This directory contains SQL migrations for a **dedicated**, **single-tenant** Supabase project that hosts ONLY Fakture Online data. The old shared project (which also held a different app) is no longer used by this codebase.

## Setup on a new Supabase project

1. Create a new Supabase project at <https://supabase.com> — dedicated to Fakture.
2. Open the project's SQL editor.
3. Run each file **in order**:
   - `0001_initial_schema.sql` — tables, types, triggers, RLS enabled
   - `0002_rls_policies.sql` — RLS policies + grants (no `IS NULL` escapes, no `USING (true)`)
   - `0003_functions.sql` — RPCs (all `SECURITY DEFINER`, all use `auth.uid()` — none accept a caller-supplied user UUID)
   - `0004_indexes.sql` — performance indexes
4. Copy the project URL and anon key into `.env.local` (see `.env.example`).
5. Enable the optional Supabase Auth settings:
   - **HaveIBeenPwned password protection**: on
   - **Email confirmations**: on (recommended)

## What changed vs. the old shared schema

- **No more `p_user_id` arguments** on RPCs. `fo_get_profile`, `fo_get_next_invoice_number`, `fo_admin_stats` all use `auth.uid()` internally. The old IDOR — pass another user's UUID and read their profile — is gone.
- **`fo_admin_stats` self-checks `is_admin`** before returning data. Bypass via `p_user_id` argument is impossible because the argument no longer exists.
- **`fo_create_invoice` / `fo_update_invoice`** are atomic SECURITY DEFINER functions. They:
  - Verify `client_id` belongs to the caller (fixes IDOR where a user could link their invoice to someone else's client).
  - Recompute totals server-side from item array (client cannot lie about subtotal).
  - Insert invoice + items in one transaction (no more orphan invoices or stranded items).
- **`fo_audit_log`** new table. Every login, mutation, admin access is recorded with IP + user-agent. Read-back only via `fo_admin_audit()`.
- **`fo_subscriptions` / `fo_payments`** — billing scaffold. Processor-agnostic (NestPay / CorvusPay / Monri / etc. plug in via the `processor`/`processor_data` columns).
- **`fo_handle_new_user()`** trigger — every `auth.users` insert auto-creates a `fo_profiles` row + 14-day trial `fo_subscriptions` row.
- **Strict grants**: `anon` cannot touch any `fo_*` table. `authenticated` reads only via RLS-scoped queries.
- **`lead_signups`** is INSERT-only for anon. Admins read via `fo_admin_stats()` SECURITY DEFINER. The old `SUPABASE_SERVICE_KEY` is no longer needed by the application.

## Migrating existing users from the old shared DB

If there are real users in the old shared Supabase project who need their data preserved:

1. Apply migrations 0001-0004 to the new project.
2. Have users re-register on the new project (new auth identity, by email).
3. Run `scripts/migrate-from-shared-db.ts` from the project root with both old and new service-role keys exported — see the script header for details. The script matches users by email and copies `fo_profiles`, `fo_clients`, `fo_invoices`, `fo_invoice_items` over, mapping old UUIDs to new ones.
