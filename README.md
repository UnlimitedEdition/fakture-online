# FaktureOnline

Online fakturisanje za freelancere, paušalce i male firme u Srbiji. Kreirajte
profesionalnu fakturu za 30 sekundi, pošaljite je klijentu na email i pratite
status naplate iz dashboarda.

## Tech stack

- **Next.js 16** (App Router, React Server Components, Server Actions, Turbopack)
- **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Row-Level Security, accessed via `@supabase/ssr`)
  — runs in a **dedicated, single-tenant** project (not shared with any other app)
- **Upstash Redis** (rate limiting)
- **Resend** (transactional email)

## Project structure

```
app/
  (auth)/              Public auth routes (login, register)
  (dashboard)/         Authenticated app (dashboard, fakture, klijenti,
                       podesavanja, admin)
  actions/             Server Actions (auth, clients, invoices, settings)
  api/signup/          Landing-page lead capture endpoint
  hvala/               Thank-you page
  page.tsx             Marketing landing page
lib/
  admin.ts             Admin allow-list helper (env-configurable)
  audit-log.ts         Audit trail helper (writes via fo_log_audit RPC)
  html-escape.ts       HTML escape + email-header sanitizer
  invoice-status.ts    Shared invoice status config (labels + colors)
  rate-limit.ts        Upstash-backed rate limiter (login/register/signup/email)
  request-meta.ts      IP + User-Agent helper (read from request headers)
  supabase/client.ts   Browser Supabase client
  supabase/server.ts   Server Supabase client + requireUser() helper
  types.ts             Domain types (Profile, Client, Invoice, …)
migrations/
  0001_initial_schema.sql      Tables, types, triggers, RLS enabled
  0002_rls_policies.sql        RLS policies + grants
  0003_functions.sql           RPCs (all use auth.uid(), never trust args)
  0004_indexes.sql             Performance indexes
scripts/
  migrate-from-shared-db.ts    One-shot data import from old shared project
proxy.ts                       Next.js proxy (auth-gated routing)
```

Route groups `(auth)` and `(dashboard)` do not appear in the URL — they exist
only to share layouts.

## Getting started

### Prerequisites

- Node.js 20+
- A **fresh, dedicated** Supabase project for Fakture (do NOT reuse a shared one)
- Upstash Redis (free tier is enough for low traffic)
- Resend account (optional, only if you want to send invoice emails)

### 1. Install

```bash
npm install
```

### 2. Apply migrations

Open the SQL editor in your Supabase dashboard and run the files in
`migrations/` in order. See `migrations/README.md`.

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
```

### 4. Run

```bash
npm run dev       # http://localhost:3000
npm run build     # production build (Turbopack)
npm run start     # run the production build
npm run lint      # ESLint
```

### 5. Grant yourself admin

Either set `ADMIN_EMAILS=you@example.com` in `.env.local`, or after registering
flip `is_admin = true` in `fo_profiles` for your row via the Supabase SQL editor.
There is no hard-coded fallback admin in the source.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (RLS-protected) |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Used to verify `Origin` on POST endpoints (CSRF defense) |
| `RESEND_API_KEY` | optional | Enables email sending |
| `NOTIFICATION_EMAIL` | optional | Inbox that receives new-lead notifications |
| `ADMIN_EMAILS` | optional | Comma-separated emails granted admin; preferred is `fo_profiles.is_admin` |
| `UPSTASH_REDIS_REST_URL` | yes (prod) | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | yes (prod) | Upstash Redis token |

The app **no longer uses** `SUPABASE_SERVICE_KEY`. Lead capture inserts via the
anon client, gated by an INSERT-only RLS policy on `lead_signups`.

## Database

The schema and policies are defined in `migrations/`. Key properties:

- All `fo_*` tables enforce RLS scoped by `auth.uid() = user_id`.
- All SECURITY DEFINER RPCs use `auth.uid()` internally and never accept a
  caller-supplied user UUID.
- `fo_create_invoice` / `fo_update_invoice` are atomic — no orphan invoices,
  no items left out of sync.
- `fo_audit_log` records logins, mutations, admin access (with IP + UA).
- `fo_subscriptions` / `fo_payments` scaffold for local Serbian processor.

## SEF (Sistem Elektronskih Faktura)

Full integration with Serbia's mandatory e-invoicing platform:

- **Send invoices** to SEF (types 380, 381, 383, 384, 386)
- **Receive inbox** of invoices from suppliers (accept/reject with reason)
- **Cancel / storno** sent invoices
- **Daily polling cron** for status changes + new inbox docs
- **Optional webhook callback** for real-time status updates
- **Pre-flight validation** (PIB ISO 7064 MOD 11,10, tax math, schema)
- **PIB eligibility check** before sending (cached SEF companies registry)
- **AES-GCM-encrypted** per-user API key (master key in `SEF_KEY_ENCRYPTION_KEY`)
- **10-year XML archive** in Supabase Storage (`sef-xml` bucket) per Zakon o
  elektronskom fakturisanju
- **Demo + production** environments switchable per user
- **60 unit + snapshot tests** for PIB validation, tax math, UBL generation,
  UBL parsing

See:
- `docs/sef-setup.md` — onboarding + portal API key generation + first send
- `docs/sef-architecture.md` — state machine, data model, cron schedule,
  failure modes

UI lives under `/sef` (overview, sent, inbox) and `/podesavanja/sef`
(API key configuration). Core libs are in `lib/sef/`.

## Authentication

- Email + password via Supabase Auth.
- Session cookies are refreshed by `proxy.ts` on every request to gated paths.
- Protected routes (redirect to `/login` when signed out): `/dashboard`,
  `/fakture`, `/klijenti`, `/podesavanja`, `/admin`.
- Admin access: `lib/admin.ts` reads `ADMIN_EMAILS` env or `fo_profiles.is_admin`.

## Rate limiting

Limits per identifier per window (configured in `lib/rate-limit.ts`):

- `login` — 5 per 15 min, per IP and per email
- `register` — 3 per hour per IP
- `signup` (landing form) — 5 per hour per IP
- `email` (invoice email) — 20 per hour per user

When Upstash env vars are missing, the limiter fails open (suitable for local
dev; configure Upstash in production).

## Audit log

Recorded via `fo_log_audit()` RPC. Visible to admins via `fo_admin_audit()`.
Tracks login success/failure (with hashed email), register, logout, admin
panel access (and denied attempts), invoice/client/profile mutations, email
sends, and landing-form submissions — each with IP + user-agent.

## Migrating from the old shared project

If you previously ran Fakture on a Supabase project shared with another app,
see `scripts/migrate-from-shared-db.ts` for a one-shot data copy.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run migrate-data` | Copy fo_* data from old shared DB → new DB (see script header) |

## Deployment

Any Next.js-compatible platform (Vercel, self-hosted Node) works. Set the env
vars above and ensure migrations have been applied.

## License

Proprietary — all rights reserved.
