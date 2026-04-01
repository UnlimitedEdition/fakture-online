import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";

const ADMIN_EMAILS = ["REDACTED_EMAIL"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get profile via RPC (SECURITY DEFINER — bypasses RLS)
  const { data: profile } = await supabase.rpc("fo_get_profile", {
    p_user_id: user.id,
  });

  // Auto-create profile if missing
  if (!profile) {
    await supabase.from("fo_profiles").upsert({
      id: user.id,
      email: user.email || "",
      owner_name:
        user.user_metadata?.full_name || user.user_metadata?.name || "",
    });
  }

  const displayName =
    profile?.owner_name || profile?.company_name || user.email || "Korisnik";
  const isAdmin = profile?.is_admin || ADMIN_EMAILS.includes(user.email || "");

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <SidebarNav
        displayName={displayName}
        email={user.email || ""}
        isAdmin={isAdmin}
      />
      <main className="flex-1 ml-0 md:ml-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
