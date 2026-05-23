# SEF Architecture

## Data model

```
auth.users
   │
   ├── fo_profiles (1:1)
   │      sef_api_key_encrypted, sef_api_key_iv  (AES-GCM)
   │      sef_demo_mode, sef_callback_secret
   │      jbkjs, is_budget_user
   │
   ├── fo_clients (1:N)
   │      sef_registered, sef_last_checked_at
   │      jbkjs, is_budget_user, is_foreign, country_code
   │
   ├── fo_invoices (1:N)
   │      sef_document_id (SEF GUID)
   │      sef_status (nacrt|slanje|poslato|odobreno|odbijeno|storniran|otkazan|greska)
   │      sef_document_type (invoice|credit_note|debit_note|corrective|advance)
   │      sef_billing_reference_id  (FK to original invoice for credit/debit notes)
   │      sef_prepayment_amount     (when consuming an advance)
   │      sef_archive_path, sef_signed_archive_path
   │
   ├── fo_sef_inbox (1:N)
   │      invoices RECEIVED from suppliers via SEF
   │      inbox_action (pending|accepted|rejected)
   │
   ├── fo_sef_inbox_actions (1:N inbox row)
   │      append-only history of accept/reject decisions
   │
   ├── fo_sef_documents (1:N)
   │      append-only audit of every SEF API call
   │      (call_kind, endpoint, http_status, response, duration, success,
   │       retry_attempt, idempotency_key, is_demo)
   │
   └── fo_sef_archive (1:N)
          metadata for files stored in the sef-xml Storage bucket
          (kind=sent|signed|received, sha256, retention_until=now+10y)

Shared registries (read-only to authenticated users, refreshed daily):
   fo_sef_companies_registry   — from SEF /Company/GetAllCompanies
   fo_kjs_registry             — from kjs.trezor.gov.rs (KJS_REGISTRY_URL)
```

## State machine

```
   ┌───────┐   sendInvoiceToSef    ┌────────┐  POST /sales-invoice/ubl
   │ nacrt ├──────────────────────►│ slanje ├──────────────────────┐
   └───────┘                       └────────┘                      │
        ▲                                                          │
        │                                                          ▼
        │            ┌─────────┐  ┌────────┐                  ┌─────────┐
        │            │ greska  │◄─┤ HTTP   │◄─────error───────┤ HTTP OK │
        │            └─────────┘  │ 4xx/5xx│                  └────┬────┘
        │                         └────────┘                       │
        │ retry                                                    │
        │                                                  ┌───────▼───────┐
        │                                                  │   poslato     │
        │                                                  └───┬─────┬─────┘
        │                                                      │     │
        │                          /changes poll               │     │
        │            ┌─────────────────┬────────────────┬──────┘     │
        │            │                 │                │            │
        │            ▼                 ▼                ▼            ▼
        │      ┌──────────┐      ┌──────────┐    ┌──────────┐  cancelSefInvoice
        │      │ odobreno │      │ odbijeno │    │storniran │
        │      └────┬─────┘      └────┬─────┘    └──────────┘  ┌──────────┐
        │           │                 │                        │ otkazan  │
        │           └──────────┬──────┘                        └──────────┘
        │                      │
        │            stornoSefInvoice (issuer-side)
        │                      ▼
        │                ┌──────────┐
        └────────────────┤storniran │
                         └──────────┘
```

Transitions are recorded via `fo_sef_record_status_change(invoice, status,
sef_doc_id, error_code, error_message)` RPC — atomic with the `sef_status`
column update and an `fo_audit_log` entry.

## Send flow (sendInvoiceToSef)

```
1. requireUser() + loadSefCredentials()
2. Fetch invoice + client + profile + items
3. Build SefInvoiceInput (lib/sef/from-db.ts)
4. validateInvoiceInput() — pre-flight pass (catches local errors fast)
5. buildSefXml() — generate UBL 2.1 string
6. archiveXml(kind="sent") — upload to Storage + insert fo_sef_archive
7. recordStatusChange(status="slanje")
8. sefSendInvoice() — POST /sales-invoice/ubl with idempotency key
   = sha256(xml).slice(0,32)
   - Retries on 5xx/429/network with 500ms→2s→8s backoff
9. logSefApiCall() — fo_sef_documents row with request hash + response
10. On success: recordStatusChange(status="poslato", sef_document_id)
    On error: recordStatusChange(status="greska", error_code, error_message)
```

## Status polling cron

Daily at 06:00 UTC (`/api/cron/sef-poll-status`):

```
for each user with sef_api_key_encrypted:
  loadSefCredentials(user.id)
  changes = sefListSalesChanges(creds, yesterday)
  for each changed invoice:
    if local sef_status != remote status:
      update fo_invoices.sef_status
      if terminal (odobreno|odbijeno|storniran):
        fetch + archive signed XML
```

SEF does NOT allow polling for changes on the current day (intentional —
forces use of the email subscription or webhook). The cron only requests
yesterday's date range.

## Inbox polling cron

Daily at 07:00 UTC (`/api/cron/sef-poll-inbox`):

```
for each user with sef_api_key_encrypted:
  list = sefListInbox(creds, yesterday)
  for each row not already in fo_sef_inbox:
    xml = sefGetInboxXml(creds, row.PurchaseInvoiceId)
    parsed = parseInboxInvoice(xml)
    insert into fo_sef_inbox (
      invoice_number, document_type, supplier_pib, supplier_name,
      issue_date, due_date, currency, total_amount, tax_amount,
      sef_status, raw_xml_excerpt
    )
```

Users see new inbox rows on `/sef/inbox` with **pending** action state and
must accept or reject (mandatory rejection reason).

## Registry refresh

Daily at 03:00 UTC (`/api/cron/sef-refresh-registries`):

- Calls `GET /api/publicApi/Company/GetAllCompanies` using the FIRST
  registered user's credentials (registry is global — any active key
  works) and upserts `fo_sef_companies_registry` in 500-row chunks.
- If `KJS_REGISTRY_URL` env is set, fetches the JSON list and upserts
  `fo_kjs_registry`.

## Idempotency + retries

- `sefSendInvoice` passes `requestId` query param (= invoice number) and
  `Idempotency-Key` header (= sha256(xml).slice(0,32)). SEF de-dupes by
  `requestId`, so re-sending the same invoice number on retry returns
  the already-created document rather than a duplicate.
- HTTP 5xx, 429, and network errors trigger up to 3 attempts with
  exponential backoff (500ms → 2s → 8s).
- All API calls — including failed ones — are logged to
  `fo_sef_documents` for forensic audit.

## Encryption

`SEF_KEY_ENCRYPTION_KEY` (32 bytes, hex-encoded in env) is the AES-GCM
master key. Each user's SEF API key is encrypted with a fresh random
IV (12 bytes) and stored as:

- `fo_profiles.sef_api_key_encrypted` (base64 ciphertext)
- `fo_profiles.sef_api_key_iv` (base64 IV)

`decryptSefApiKey()` is only ever called in `loadSefCredentials()` on the
server (Server Action or cron route). The decrypted plaintext never
leaves the server-side request scope.

## Legal archive

Per Zakon o elektronskom fakturisanju, the issuer must keep the original
UBL XML for **10 years**. Implementation:

- `archiveXml(kind="sent")` runs before every send — uploads to
  `sef-xml/{user_id}/{YYYY}/{MM}/{DD}/sent/{invoice_id}-{sha16}.xml`
- `archiveXml(kind="signed")` runs when status reaches odobreno/odbijeno/
  storniran — uploads the SEF-signed copy fetched via
  `GET /sales-invoice/xml`
- `archiveXml(kind="received")` runs when inbox cron stores incoming
  invoices (TODO: currently only the 4KB excerpt is stored; full XML
  upload from cron context requires service-role-aware archive helper)
- `fo_sef_archive` row created with `retention_until = today + 10y`

Object lock + versioning on the Storage bucket should be enabled in
production.

## Failure modes + defenses

| Failure | Detection | Recovery |
|---|---|---|
| Network blip on send | client retry (3x backoff) | If all 3 fail, status → greska with NETWORK code; user clicks "Pošalji na SEF" again, idempotency key prevents duplicate |
| SEF 5xx during peak (VAT deadlines) | client retry; cron picks up status next day | No data loss; status remains slanje until cron reconciles |
| User loses API key | Encrypted column is opaque without master key | User generates new key on portal, re-enters in podesavanja |
| `SEF_KEY_ENCRYPTION_KEY` rotated | decryptSefApiKey throws on every send | UI displays "Postavite SEF API ključ" — user re-enters |
| Recipient not registered on SEF | Pre-check via `checkClientSefEligibility`; SEF returns 400 with "primalac nije registrovan" | Error mapped to Serbian message; client marked sef_registered=false |
| Validation error in our pre-flight | `validateInvoiceInput` returns issues[] | Status → greska with first 3 issues in error_message |
| Validation error in SEF Schematron | HTTP 400 with body | Error mapped via error-map.ts |
| Bot scrapes endpoints | All SEF endpoints require auth (server actions check requireUser; crons check X-Cron-Secret) | No exposed surface |

## File layout

```
lib/sef/
├── types.ts                  Enums, DTOs, status mapper
├── pib.ts                    PIB / JBKJS / MB / bank account validators
├── tax-categories.ts         12 SEF tax categories + allowed percents
├── exemption-reasons.ts      Full PDV-RS-* exemption codes
├── rounding.ts               round2, formatAmount, tax math
├── validate.ts               Pre-flight validation
├── error-map.ts              SEF errors → Serbian messages
├── key-encryption.ts         AES-GCM enc/dec + sha256 + secret gen
├── archive.ts                Storage upload + fo_sef_archive insert
├── credentials.ts            loadSefCredentials(userId)
├── from-db.ts                DB row → SefInvoiceInput mapper
├── status-config.ts          Status pill + state-machine helpers
├── ubl/
│   ├── namespaces.ts         cbc/cac/sbt + CustomizationID 2022
│   ├── builder-base.ts       el/elText/escape primitives
│   ├── common/
│   │   ├── party.ts          Supplier + customer party blocks
│   │   ├── payment-means.ts
│   │   ├── tax-totals.ts     groupLinesIntoSubtotals + buildTaxTotal
│   │   ├── monetary-total.ts
│   │   └── invoice-line.ts   Invoice + CreditNote lines
│   ├── invoice.ts            type 380 (+ 383, 384, prepayment consume)
│   ├── credit-note.ts        type 381
│   ├── advance.ts            type 386
│   ├── index.ts              buildSefXml() dispatcher
│   └── parse/
│       └── inbox-invoice.ts  fast-xml-parser → ParsedInboxInvoice
└── api/
    ├── endpoints.ts          Base URLs + 15 path constants
    ├── client.ts             fetch + retry + auth
    ├── send-invoice.ts
    ├── cancel.ts, storno.ts
    ├── get-status.ts, get-xml.ts
    ├── list-changes.ts
    ├── company.ts, list-companies.ts
    ├── inbox-list.ts, inbox-get.ts, inbox-action.ts
    └── subscribe.ts

app/actions/sef.ts            All SEF Server Actions
app/api/cron/sef-poll-status/route.ts
app/api/cron/sef-poll-inbox/route.ts
app/api/cron/sef-refresh-registries/route.ts
app/api/sef/callback/[userId]/route.ts

app/(dashboard)/sef/         UI: overview, sent, inbox, inbox detail
app/(dashboard)/podesavanja/sef/   UI: API key + settings

migrations/0005_sef_schema.sql    Tables, columns, RLS, RPCs
vercel.json                   Cron schedule

lib/sef/*.test.ts             60 unit + snapshot tests (vitest)
```
