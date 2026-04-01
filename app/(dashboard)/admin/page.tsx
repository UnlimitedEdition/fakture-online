import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";

const ADMIN_EMAILS = ["REDACTED_EMAIL"];

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!ADMIN_EMAILS.includes(user.email || "")) {
    redirect("/dashboard");
  }

  // Get admin stats via RPC (SECURITY DEFINER — bypasses RLS)
  const { data: stats, error } = await supabase.rpc("fo_admin_stats", {
    p_user_id: user.id,
  });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Admin Panel</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          Greška: {error.message}
        </div>
      </div>
    );
  }

  return <AdminDashboard stats={stats} />;
}
