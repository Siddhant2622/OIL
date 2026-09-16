import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, Users, Globe, Briefcase } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function OrgSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "ORG_ADMIN") redirect("/dashboard");

  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  const { data: sites } = await admin
    .from("sites")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("name");

  const { data: pendingInvites } = await admin
    .from("invitations")
    .select("*")
    .eq("org_id", profile.org_id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  const { data: recentAudit } = await admin
    .from("audit_log")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Organisation Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin controls for {org?.name}
        </p>
      </div>

      {/* Org details */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" /> Organisation Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">Company name</p>
            <p className="font-medium mt-0.5">{org?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Slug</p>
            <p className="font-mono mt-0.5">{org?.slug}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Industry</p>
            <p className="font-medium mt-0.5">{org?.industry}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Country</p>
            <p className="font-medium mt-0.5">{org?.country}</p>
          </div>
          {org?.domain && (
            <div>
              <p className="text-muted-foreground">Email domain</p>
              <p className="font-mono mt-0.5">{org.domain}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="mt-0.5">{org?.created_at ? formatDate(org.created_at) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Sites */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-600" /> Sites ({sites?.length ?? 0})
        </h2>
        {!sites?.length ? (
          <p className="text-sm text-muted-foreground">No sites configured.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {sites.map((site) => (
              <div key={site.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium text-sm">{site.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {site.site_type ?? "—"}{site.region ? ` · ${site.region}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" /> Pending Invitations ({pendingInvites?.length ?? 0})
        </h2>
        {!pendingInvites?.length ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium text-sm">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.role} · Expires {formatDate(inv.expires_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit log */}
      <div id="audit" className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Recent Audit Log</h2>
        {!recentAudit?.length ? (
          <p className="text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {recentAudit.map((event) => (
              <div key={event.id} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{event.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
                </div>
                {event.entity && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.entity} {event.entity_id ? `· ${event.entity_id.slice(0, 8)}…` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
