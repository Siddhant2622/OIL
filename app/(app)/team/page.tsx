import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamHierarchyClient } from "./team-client";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Server-side security check: Employees cannot access team hierarchy management
  if (profile.role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  // Fetch all profiles in organization
  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, full_name, email, role, designation, department, manager_id, is_active, avatar_url, sites(name)")
    .eq("org_id", profile.org_id)
    .order("full_name", { ascending: true });

  // Fetch sites
  const { data: sites } = await admin
    .from("sites")
    .select("id, name")
    .eq("org_id", profile.org_id)
    .order("name");

  const formattedProfiles = (allProfiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role,
    designation: p.designation,
    department: p.department,
    manager_id: p.manager_id,
    is_active: p.is_active,
    avatar_url: p.avatar_url,
    site: (Array.isArray(p.sites) ? p.sites[0] : p.sites) as unknown as { name: string } | null,
  }));

  return (
    <TeamHierarchyClient
      profiles={formattedProfiles}
      sites={sites ?? []}
      currentUserRole={profile.role}
    />
  );
}
