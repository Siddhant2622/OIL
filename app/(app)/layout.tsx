import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/app-shell";
import type { ProfileRow } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*, organizations(name, slug)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/not-registered");
  }

  if (!profile.is_active) {
    redirect("/deactivated");
  }

  return (
    <AppShell profile={profile as ProfileRow & { organizations: { name: string; slug: string } | null }}>
      {children}
    </AppShell>
  );
}
