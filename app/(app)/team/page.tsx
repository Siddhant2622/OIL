import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SectionHeader, EmptyState } from "@/components/ui-components";
import { Users, ChevronRight, Mail, Phone } from "lucide-react";
import { roleLabels } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  designation: string | null;
  department: string | null;
  manager_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
}

function buildTree(profiles: Profile[], parentId: string | null = null): Profile[] {
  return profiles
    .filter((p) => p.manager_id === parentId)
    .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
}

function TreeNode({ profile, children, depth = 0 }: {
  profile: Profile;
  children: Profile[];
  depth?: number;
}) {
  const subChildren = buildTree(children, profile.id);
  const initials = (profile.full_name ?? profile.email)[0].toUpperCase();

  return (
    <div className={`${depth > 0 ? "ml-8 border-l pl-4 border-border" : ""}`}>
      <div className={`flex items-center gap-3 rounded-xl border bg-card p-3.5 ${!profile.is_active ? "opacity-50" : ""} mb-2`}>
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt={profile.full_name ?? ""} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 font-bold text-sm">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{profile.full_name ?? profile.email.split("@")[0]}</p>
          <p className="text-xs text-muted-foreground">
            {roleLabels[profile.role] ?? profile.role}
            {profile.designation && ` · ${profile.designation}`}
          </p>
          {profile.department && (
            <p className="text-xs text-muted-foreground">{profile.department}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!profile.is_active && (
            <span className="text-xs text-red-500">Deactivated</span>
          )}
          <a href={`mailto:${profile.email}`} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted">
            <Mail className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      {subChildren.map((child) => (
        <TreeNode
          key={child.id}
          profile={child}
          children={children}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, full_name, email, role, designation, department, manager_id, is_active, avatar_url")
    .eq("org_id", profile.org_id)
    .order("full_name", { ascending: true });

  const profiles = (allProfiles ?? []) as Profile[];
  const roots = buildTree(profiles, null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team &amp; Hierarchy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profiles.length} members · Reporting tree structure
          </p>
        </div>
      </div>

      {!profiles.length ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite team members from the organisation settings page."
        />
      ) : (
        <div className="space-y-2">
          {roots.map((root) => (
            <TreeNode key={root.id} profile={root} children={profiles} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
