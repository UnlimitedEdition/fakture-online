import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit-log";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.rpc("fo_get_profile");

  if (!isAdmin(user.email, profile?.is_admin)) {
    await logAudit({
      action: "admin.denied",
      metadata: { path: "/admin" },
      success: false,
    });
    redirect("/dashboard");
  }

  await logAudit({ action: "admin.access", metadata: { path: "/admin" } });

  const { data: stats, error } = await supabase.rpc("fo_admin_stats");

  if (error || !stats) {
    console.error("[admin.stats]", {
      user_id: user.id,
      code: error?.code,
      message: error?.message,
    });
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Admin Panel</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          Greška pri učitavanju podataka. Pokušajte ponovo.
        </div>
      </div>
    );
  }

  return <AdminDashboard stats={stats} />;
}
