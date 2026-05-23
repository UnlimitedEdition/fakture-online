#!/usr/bin/env tsx
/**
 * One-shot migration: copy fo_* data from the OLD shared Supabase project
 * into the NEW dedicated Fakture project, matching users by email.
 *
 * Prereqs:
 *   1. New project has migrations 0001-0004 applied.
 *   2. Users you want to migrate have re-registered on the new project
 *      using the SAME email as before.
 *
 * Required env vars (set in shell, NOT in .env.local):
 *   OLD_SUPABASE_URL          — URL of the old shared project
 *   OLD_SUPABASE_SERVICE_KEY  — service-role key of the old project
 *   NEW_SUPABASE_URL          — URL of the new dedicated project
 *   NEW_SUPABASE_SERVICE_KEY  — service-role key of the new project
 *
 * Run: npm run migrate-data
 */

import { createClient } from "@supabase/supabase-js";

const oldUrl = process.env.OLD_SUPABASE_URL;
const oldKey = process.env.OLD_SUPABASE_SERVICE_KEY;
const newUrl = process.env.NEW_SUPABASE_URL;
const newKey = process.env.NEW_SUPABASE_SERVICE_KEY;

if (!oldUrl || !oldKey || !newUrl || !newKey) {
  console.error(
    "Missing required env vars: OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY",
  );
  process.exit(1);
}

const oldDb = createClient(oldUrl, oldKey, {
  auth: { persistSession: false },
});
const newDb = createClient(newUrl, newKey, {
  auth: { persistSession: false },
});

type OldProfile = {
  id: string;
  email: string | null;
  company_name: string | null;
  owner_name: string | null;
  pib: string | null;
  maticni_broj: string | null;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  phone: string | null;
  bank_account: string | null;
  invoice_prefix: string | null;
  next_invoice_number: number | null;
};

type OldClient = {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  pib: string | null;
  maticni_broj: string | null;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type OldInvoice = {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string | null;
  notes: string | null;
  payment_method: string | null;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
};

type OldItem = {
  invoice_id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total: number;
  sort_order: number;
};

async function main() {
  console.log("[migrate] start");

  // 1. Fetch all profiles from the old DB.
  const { data: oldProfiles, error: pErr } = await oldDb
    .from("fo_profiles")
    .select("*");
  if (pErr) throw pErr;
  console.log(`[migrate] found ${oldProfiles?.length ?? 0} old profiles`);

  let migrated = 0;
  let skipped = 0;

  for (const old of (oldProfiles ?? []) as OldProfile[]) {
    if (!old.email) {
      console.log(`[migrate] skip profile ${old.id} (no email)`);
      skipped++;
      continue;
    }

    // 2. Find matching user in new auth.users by email.
    const { data: newUserList, error: lookupErr } =
      await newDb.auth.admin.listUsers({ perPage: 1000 });
    if (lookupErr) throw lookupErr;

    const newUser = newUserList?.users.find(
      (u) => u.email?.toLowerCase() === old.email?.toLowerCase(),
    );
    if (!newUser) {
      console.log(
        `[migrate] skip ${old.email}: not yet re-registered on new project`,
      );
      skipped++;
      continue;
    }

    console.log(`[migrate] ${old.email}: old=${old.id} -> new=${newUser.id}`);

    // 3. Upsert profile into new DB (trigger created a stub; merge in old data).
    const { error: profileErr } = await newDb.from("fo_profiles").upsert({
      id: newUser.id,
      company_name: old.company_name ?? "",
      owner_name: old.owner_name ?? "",
      pib: old.pib ?? "",
      maticni_broj: old.maticni_broj ?? "",
      address: old.address ?? "",
      city: old.city ?? "",
      zip_code: old.zip_code ?? "",
      phone: old.phone ?? "",
      email: old.email,
      bank_account: old.bank_account ?? "",
      invoice_prefix: old.invoice_prefix ?? "FAK",
      next_invoice_number: old.next_invoice_number ?? 1,
    });
    if (profileErr) {
      console.error(`[migrate] profile upsert failed for ${old.email}`, profileErr.message);
      continue;
    }

    // 4. Copy clients (build old->new id map).
    const { data: oldClients } = await oldDb
      .from("fo_clients")
      .select("*")
      .eq("user_id", old.id);

    const clientIdMap = new Map<string, string>();
    for (const c of (oldClients ?? []) as OldClient[]) {
      const { data: newClient, error: cErr } = await newDb
        .from("fo_clients")
        .insert({
          user_id: newUser.id,
          company_name: c.company_name,
          contact_name: c.contact_name ?? "",
          pib: c.pib ?? "",
          maticni_broj: c.maticni_broj ?? "",
          address: c.address ?? "",
          city: c.city ?? "",
          zip_code: c.zip_code ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
          notes: c.notes ?? "",
        })
        .select("id")
        .single();
      if (cErr || !newClient) {
        console.error(`[migrate] client insert failed`, cErr?.message);
        continue;
      }
      clientIdMap.set(c.id, newClient.id);
    }
    console.log(`[migrate]   ${clientIdMap.size} clients`);

    // 5. Copy invoices (map client_id, build old->new invoice id map).
    const { data: oldInvoices } = await oldDb
      .from("fo_invoices")
      .select("*")
      .eq("user_id", old.id);

    const invoiceIdMap = new Map<string, string>();
    for (const inv of (oldInvoices ?? []) as OldInvoice[]) {
      const newClientId = clientIdMap.get(inv.client_id);
      if (!newClientId) {
        console.error(`[migrate]   skip invoice ${inv.invoice_number}: client missing`);
        continue;
      }
      const { data: newInvoice, error: iErr } = await newDb
        .from("fo_invoices")
        .insert({
          user_id: newUser.id,
          client_id: newClientId,
          invoice_number: inv.invoice_number,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          status: inv.status,
          subtotal: inv.subtotal,
          tax_rate: inv.tax_rate,
          tax_amount: inv.tax_amount,
          total: inv.total,
          currency: inv.currency ?? "RSD",
          notes: inv.notes ?? "",
          payment_method: inv.payment_method ?? "",
          paid_at: inv.paid_at,
          sent_at: inv.sent_at,
          created_at: inv.created_at,
        })
        .select("id")
        .single();
      if (iErr || !newInvoice) {
        console.error(`[migrate]   invoice insert failed`, iErr?.message);
        continue;
      }
      invoiceIdMap.set(inv.id, newInvoice.id);
    }
    console.log(`[migrate]   ${invoiceIdMap.size} invoices`);

    // 6. Copy invoice items.
    if (invoiceIdMap.size > 0) {
      const oldIds = Array.from(invoiceIdMap.keys());
      const { data: oldItems } = await oldDb
        .from("fo_invoice_items")
        .select("*")
        .in("invoice_id", oldIds);

      const itemsToInsert = ((oldItems ?? []) as OldItem[])
        .map((it) => {
          const newInvoiceId = invoiceIdMap.get(it.invoice_id);
          if (!newInvoiceId) return null;
          return {
            invoice_id: newInvoiceId,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit ?? "kom",
            unit_price: it.unit_price,
            total: it.total,
            sort_order: it.sort_order,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (itemsToInsert.length > 0) {
        const { error: itErr } = await newDb
          .from("fo_invoice_items")
          .insert(itemsToInsert);
        if (itErr) {
          console.error(`[migrate]   items insert failed`, itErr.message);
        } else {
          console.log(`[migrate]   ${itemsToInsert.length} items`);
        }
      }
    }

    migrated++;
  }

  console.log(`[migrate] done: ${migrated} migrated, ${skipped} skipped`);
}

main().catch((err) => {
  console.error("[migrate] fatal", err);
  process.exit(1);
});
