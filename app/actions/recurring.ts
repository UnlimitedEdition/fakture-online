"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { logAudit } from "@/lib/audit-log";

interface ScheduleItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface SchedulePayload {
  client_id: string;
  name: string;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  day_of_month?: number | null;
  day_of_week?: number | null;
  start_date: string;
  end_date?: string | null;
  tax_rate: number;
  notes: string;
  payment_method: string;
  due_days: number;
  items: ScheduleItem[];
}

function nextRunDate(args: {
  frequency: SchedulePayload["frequency"];
  start_date: string;
  day_of_month?: number | null;
  day_of_week?: number | null;
}): string {
  // First run = start_date itself
  return args.start_date;
}

export async function createSchedule(data: SchedulePayload) {
  if (!isUuid(data.client_id)) return { error: "Neispravan ID klijenta." };
  const { supabase, user } = await requireUser();

  if (!data.name?.trim()) return { error: "Naziv šeme je obavezan." };
  if (!data.items || data.items.length === 0) return { error: "Šema mora imati bar jednu stavku." };
  if (data.items.some((i) => !i.description || i.unit_price <= 0)) {
    return { error: "Svaka stavka mora imati opis i cenu." };
  }
  if (!data.start_date) return { error: "Datum starta je obavezan." };

  const next_run = nextRunDate({
    frequency: data.frequency,
    start_date: data.start_date,
    day_of_month: data.day_of_month,
    day_of_week: data.day_of_week,
  });

  const { data: created, error } = await supabase
    .from("fo_recurring_schedules")
    .insert({
      user_id: user.id,
      client_id: data.client_id,
      name: data.name.trim(),
      frequency: data.frequency,
      day_of_month: data.day_of_month ?? null,
      day_of_week: data.day_of_week ?? null,
      start_date: data.start_date,
      end_date: data.end_date || null,
      next_run_date: next_run,
      tax_rate: data.tax_rate,
      notes: data.notes || "",
      payment_method: data.payment_method || "",
      due_days: data.due_days || 15,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[recurring.create]", { code: error?.code, message: error?.message });
    return { error: "Greška pri kreiranju šeme." };
  }

  const itemsToInsert = data.items.map((item, idx) => ({
    schedule_id: created.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    sort_order: idx,
  }));

  const { error: itemsErr } = await supabase
    .from("fo_recurring_items")
    .insert(itemsToInsert);

  if (itemsErr) {
    await supabase.from("fo_recurring_schedules").delete().eq("id", created.id);
    return { error: "Greška pri snimanju stavki šeme." };
  }

  await logAudit({
    action: "invoice.created",
    resourceType: "recurring_schedule",
    resourceId: created.id,
    metadata: { frequency: data.frequency },
  });

  revalidatePath("/fakture/ponavljajuce");
  redirect("/fakture/ponavljajuce");
}

export async function pauseSchedule(id: string) {
  if (!isUuid(id)) return { error: "Neispravan ID." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("fo_recurring_schedules")
    .update({ status: "paused" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Greška." };
  revalidatePath("/fakture/ponavljajuce");
  return { success: true };
}

export async function resumeSchedule(id: string) {
  if (!isUuid(id)) return { error: "Neispravan ID." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("fo_recurring_schedules")
    .update({ status: "active" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Greška." };
  revalidatePath("/fakture/ponavljajuce");
  return { success: true };
}

export async function deleteSchedule(id: string) {
  if (!isUuid(id)) return { error: "Neispravan ID." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("fo_recurring_schedules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Greška." };
  revalidatePath("/fakture/ponavljajuce");
  return { success: true };
}
