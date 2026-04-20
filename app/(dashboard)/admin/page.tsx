import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.rpc("fo_get_profile", {
    p_user_id: user.id,
  });

  if (!isAdmin(user.email, profile?.is_admin)) {
    redirect("/dashboard");
  }

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
