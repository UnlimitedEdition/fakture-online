import { requireUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { SidebarNav } from "./sidebar-nav";
import { ServiceWorkerRegister } from "./service-worker-register";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();

  // Profile + trial subscription are auto-created by the fo_on_auth_user_created
  // trigger, so this RPC normally returns a row immediately after signup.
  const { data: profile, error } = await supabase.rpc("fo_get_profile");
  if (error) {
    console.error("[layout.profile]", {
      user_id: user.id,
      code: error.code,
      message: error.message,
    });
  }

  const displayName =
    profile?.owner_name || profile?.company_name || user.email || "Korisnik";

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <SidebarNav
        displayName={displayName}
        email={user.email ?? ""}
        isAdmin={isAdmin(user.email, profile?.is_admin)}
      />
      <main className="flex-1 ml-0 md:ml-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <ServiceWorkerRegister />
    </div>
  );
}
