# SEF Setup Guide

This guide walks you through configuring **Sistem Elektronskih Faktura
(SEF)** integration for Fakture Online. SEF is mandatory for B2B and B2G
invoicing in Serbia (Zakon o elektronskom fakturisanju, 44/2021).

## Prerequisites

- Active Fakture Online deployment (Next.js + Supabase, with migrations
  0001-0005 applied).
- Production / company PIB.
- An eID.gov.rs login (qualified certificate) for the SEF portal.

## 1. Generate environment secrets

In the project root, add these to `.env.local` (production: set in your
hosting provider):

```bash
# 32-byte hex master key for AES-GCM encrypting per-user SEF API keys
SEF_KEY_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Shared secret for the /api/cron/sef-* endpoints
SEF_CRON_SECRET=$(openssl rand -hex 32)

# Supabase service-role key (cron uses this to bypass RLS for the sweep)
SUPABASE_SERVICE_ROLE_KEY=...   # from your Supabase project settings
```

`SEF_KEY_ENCRYPTION_KEY` MUST be 64 hex characters (32 raw bytes). If you
ever rotate this key, every user must re-enter their SEF API key in
**/podesavanja/sef**.

## 2. Register on the SEF demo portal first

Always do your first integration test against the demo environment.

1. Open <https://demoefaktura.mfin.gov.rs/login>
2. Log in with eID.gov.rs (qualified certificate).
3. Register your test company (separate from prod — demo data is wiped
   periodically).
4. Open **Podešavanja → API menadžment → Autentifikacioni ključ** and
   click **Generiši**.
5. Toggle **API status** to **Aktivno**.
6. Copy the key — you'll paste it into Fakture Online.

## 3. Enter the API key in Fakture Online

1. Sign in and go to **Podešavanja → SEF integracija**.
2. Paste the demo API key.
3. Keep **"Koristi demo okruženje"** checked.
4. If your firm is a budget user (state institution), check
   **"Moja firma je budžetski korisnik"** and enter your JBKJS.
5. Click **Sačuvaj**.

The key is encrypted at rest (AES-GCM with `SEF_KEY_ENCRYPTION_KEY`) and
never shown in plain text.

## 4. (Optional) Set up the webhook callback

SEF does NOT push status changes to a webhook by default — we run a daily
polling cron at 06:00 UTC. If you want near-real-time updates, you can
register a callback URL in the SEF portal:

1. After saving your API key in step 3, copy the **Callback URL** shown on
   the SEF settings page (format:
   `https://YOUR_SITE/api/sef/callback/<user-id>?secret=<hex>`).
2. In the SEF portal under **API menadžment**, paste the URL as the
   callback endpoint.

The endpoint verifies the secret on every request and updates the matching
invoice's `sef_status` instantly.

## 5. Test the full round-trip

1. Create a fake counterparty in the demo SEF portal (with a fake PIB).
2. In Fakture Online, create a client with the same fake PIB.
3. On the client detail page, click **Proveri SEF registraciju** — should
   show "Registrovan".
4. Create an invoice for that client.
5. Open the invoice and click **Pošalji na SEF**.
6. Status should transition: `nacrt → slanje → poslato`.
7. In the demo SEF portal under the receiver account, accept the invoice.
8. Wait for the daily cron (or click **Proveri SEF status** manually) to
   see status flip to `odobreno`.

## 6. Switch to production

When you're ready for real invoicing:

1. Generate a separate API key on the **prod** portal
   (<https://efaktura.mfin.gov.rs/>) using the same flow as step 2-3.
2. In **Podešavanja → SEF integracija**, paste the new key and **uncheck**
   "Koristi demo okruženje".
3. Click **Sačuvaj**.

Demo and production are completely isolated — keys, invoices, documents
do not cross over.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "SEF API ključ izgleda neispravno (premali)." | Key copied with a trailing space or only part copied | Re-copy from the portal |
| "Postavite SEF API ključ u podešavanjima." after saving | `SEF_KEY_ENCRYPTION_KEY` env var changed between save and read | Re-enter the key |
| "Klijent nije registrovan na SEF sistemu" | Recipient PIB not in SEF | Use **Proveri SEF registraciju** on the client page first |
| "Datum izdavanja mora biti današnji" | Trying to send a back-dated invoice | Change issue date to today, then send |
| "Faktura sa ovim brojem već postoji" | Invoice number reused | Add a year suffix (e.g. FAK-2026-001) |
| Cron not running | `SEF_CRON_SECRET` not set or Vercel cron not configured | Check `vercel.json` + your hosting cron settings |

## Cron schedule (vercel.json)

| Path | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/cron/sef-refresh-registries` | `0 3 * * *` | Daily refresh of SEF companies + KJS list |
| `/api/cron/sef-poll-status` | `0 6 * * *` | Pull status changes from yesterday |
| `/api/cron/sef-poll-inbox` | `0 7 * * *` | Fetch newly received invoices |

All cron endpoints require the `X-Cron-Secret` header. Vercel cron passes
this automatically when configured per `vercel.json`. If self-hosting,
trigger via `curl -H "X-Cron-Secret: $SEF_CRON_SECRET" $URL`.

## Legal archive

Every UBL XML sent or received is uploaded to the `sef-xml` Supabase
Storage bucket and recorded in `fo_sef_archive` with a 10-year
`retention_until` date (per Zakon o elektronskom fakturisanju).

Object lock + versioning should be enabled on the bucket in production —
do this in the Supabase dashboard under **Storage → sef-xml → Settings**.
