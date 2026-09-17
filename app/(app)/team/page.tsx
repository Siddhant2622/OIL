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

  // Fetch pending invitations
  const { data: pendingInvites } = await admin
    .from("invitations")
    .select("id, email, role, designation, department, status, expires_at, created_at, sites(name)")
    .eq("org_id", profile.org_id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

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

  const formattedPending = (pendingInvites ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    designation: inv.designation,
    department: inv.department,
    status: inv.status,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    site: (Array.isArray(inv.sites) ? inv.sites[0] : inv.sites) as unknown as { name: string } | null,
  }));

  return (
    <TeamHierarchyClient
      profiles={formattedProfiles}
      pendingInvites={formattedPending}
      sites={sites ?? []}
      currentUserRole={profile.role}
    />
  );
}
