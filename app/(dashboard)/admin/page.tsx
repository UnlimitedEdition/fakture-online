import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use service role to bypass RLS for admin check
  const adminDb = createAdminClient();

  const { data: profile } = await adminDb
    .from("fo_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  // Get admin stats via service role
  const { data: stats, error } = await adminDb.rpc("fo_admin_stats");

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Admin Panel</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          Greška pri učitavanju: {error.message}
        </div>
      </div>
    );
  }

  return <AdminDashboard stats={stats} />;
}
