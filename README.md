# FaktureOnline

Online fakturisanje za freelancere, paušalce i male firme u Srbiji. Kreirajte
profesionalnu fakturu za 30 sekundi, pošaljite je klijentu na email i pratite
status naplate iz dashboarda.

Live: _configure via deployment_

## Tech stack

- **Next.js 16** (App Router, React Server Components, Server Actions, Turbopack)
- **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Row-Level Security, accessed via `@supabase/ssr`)
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
  invoice-status.ts    Shared invoice status config (labels + colors)
  supabase/client.ts   Browser Supabase client
  supabase/server.ts   Server Supabase client (cookie-aware)
  types.ts             Domain types (Profile, Client, Invoice, …)
proxy.ts               Next.js proxy (auth-gated routing)
```

Route groups `(auth)` and `(dashboard)` do not appear in the URL — they exist
only to share layouts.

## Getting started

### Prerequisites

- Node.js 20+
- Supabase project with the `fo_*` schema (see **Database** below)
- Resend account (optional, only if you want to send invoice emails)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
```

### 3. Run

```bash
npm run dev       # http://localhost:3000
npm run build     # production build (Turbopack)
npm run start     # run the production build
npm run lint      # ESLint
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (RLS-protected) |
| `SUPABASE_URL` | yes (API routes) | Same as above, server-only alias |
| `SUPABASE_SERVICE_KEY` | yes (API routes) | Service role key — used by `/api/signup` to insert into `lead_signups` |
| `RESEND_API_KEY` | optional | Enables email sending (invoices + lead notifications) |
| `NOTIFICATION_EMAIL` | optional | Inbox that receives new-lead notifications |
| `ADMIN_EMAILS` | optional | Comma-separated emails granted admin access |

## Database

The app expects a Supabase schema with these tables and functions:

- `fo_profiles` — user profile (company info used on invoices)
- `fo_clients` — user's client directory
- `fo_invoices` — invoices with status, amounts, dates
- `fo_invoice_items` — line items
- `lead_signups` — landing-page lead captures
- RPC `fo_get_profile(p_user_id uuid)` — SECURITY DEFINER profile fetch
- RPC `fo_get_next_invoice_number(p_user_id uuid)` — sequential invoice numbering
- RPC `fo_admin_stats(p_user_id uuid)` — admin panel aggregates

All `fo_*` tables are expected to enforce RLS so users can only access their own
rows. Server Actions additionally scope every mutation by `user_id`.

## Authentication

- Email + password via Supabase Auth.
- Session cookies are refreshed by `proxy.ts` on every request to gated paths.
- Protected routes (redirect to `/login` when signed out): `/dashboard`,
  `/fakture`, `/klijenti`, `/podesavanja`, `/admin`.
- Admin access: `lib/admin.ts` uses `ADMIN_EMAILS` env var, with fallback to a
  single hard-coded owner for bootstrap; profile column `is_admin` also grants
  access.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals` + `next/typescript`) |

## Deployment

Any Next.js-compatible platform (Vercel, self-hosted Node) works. Set the
environment variables listed above and Supabase schema must be provisioned in
advance.

## License

Proprietary — all rights reserved.
