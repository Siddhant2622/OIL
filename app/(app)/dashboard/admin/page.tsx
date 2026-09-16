import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  KpiCard,
  SectionHeader,
  RiskBadge,
  StatusBadge,
  EmptyState,
} from "@/components/ui-components";
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  Shield,
  CheckSquare,
  Eye,
  Settings,
  BarChart3,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, organizations(name, slug)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  const org_id = profile.org_id;
  const orgName = (profile as unknown as { organizations?: { name: string } })
    .organizations?.name ?? "Your Company";

  // Org-wide stats
  const [
    { count: totalEmployees },
    { count: totalReports },
    { count: sifCount },
    { count: criticalCount },
    { count: openActions },
    { count: pendingInvites },
    { count: analysisFailures },
    { count: reviewQueue },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("org_id", org_id),
    admin.from("reports").select("*", { count: "exact", head: true }).eq("org_id", org_id),
    admin.from("ai_analyses").select("*", { count: "exact", head: true }).eq("org_id", org_id).eq("sif_potential", true),
    admin.from("ai_analyses").select("*", { count: "exact", head: true }).eq("org_id", org_id).eq("risk_band", "CRITICAL"),
    admin.from("actions").select("*", { count: "exact", head: true }).eq("org_id", org_id).in("status", ["OPEN", "IN_PROGRESS", "OVERDUE"]),
    admin.from("invitations").select("*", { count: "exact", head: true }).eq("org_id", org_id).eq("status", "PENDING"),
    admin.from("reports").select("*", { count: "exact", head: true }).eq("org_id", org_id).eq("status", "ANALYSIS_FAILED"),
    admin.from("reports").select("*", { count: "exact", head: true }).eq("org_id", org_id).eq("status", "IN_REVIEW"),
  ]);

  // Recent critical reports
  const { data: criticalReports } = await admin
    .from("reports")
    .select("id, report_code, report_type, status, created_at, description")
    .eq("org_id", org_id)
    .eq("status", "IN_REVIEW")
    .order("created_at", { ascending: false })
    .limit(4);

  // Recent audit events
  const { data: auditEvents } = await admin
    .from("audit_log")
    .select("*")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">{orgName}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Full organisation visibility and control.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings/organization"
            className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Link
            href="/team"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <Users className="h-4 w-4" />
            Manage Team
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Employees" value={totalEmployees ?? 0} icon={Users} />
        <KpiCard label="Pending Invitations" value={pendingInvites ?? 0} icon={Clock} />
        <KpiCard label="Total Reports" value={totalReports ?? 0} icon={FileText} />
        <KpiCard
          label="SIF Precursors"
          value={sifCount ?? 0}
          icon={AlertTriangle}
          band={sifCount ? "HIGH" : undefined}
        />
        <KpiCard
          label="CRITICAL Alerts"
          value={criticalCount ?? 0}
          icon={Shield}
          band={criticalCount ? "CRITICAL" : undefined}
        />
        <KpiCard
          label="Review Queue"
          value={reviewQueue ?? 0}
          icon={Eye}
          band={reviewQueue ? "MEDIUM" : undefined}
        />
        <KpiCard
          label="Open CAPA Actions"
          value={openActions ?? 0}
          icon={CheckSquare}
          band={openActions ? "MEDIUM" : undefined}
        />
        <KpiCard
          label="Analysis Failures"
          value={analysisFailures ?? 0}
          icon={BarChart3}
          band={analysisFailures ? "HIGH" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Critical / In-Review reports */}
        <div className="space-y-3">
          <SectionHeader
            title="In-Review Reports"
            action={
              <Link href="/review" className="text-sm text-blue-600 hover:underline">
                Full queue →
              </Link>
            }
          />
          {!criticalReports?.length ? (
            <EmptyState
              icon={Eye}
              title="Review queue is clear"
              description="No reports currently awaiting human review."
            />
          ) : (
            <div className="divide-y rounded-xl border bg-card">
              {criticalReports.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      {r.report_code}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium">
                      {r.description.slice(0, 70)}…
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} className="ml-3 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent audit log */}
        <div className="space-y-3">
          <SectionHeader
            title="Recent Activity"
            action={
              <Link
                href="/settings/organization#audit"
                className="text-sm text-blue-600 hover:underline"
              >
                Full log →
              </Link>
            }
          />
          {!auditEvents?.length ? (
            <EmptyState icon={Clock} title="No activity yet" />
          ) : (
            <div className="divide-y rounded-xl border bg-card">
              {auditEvents.map((event) => (
                <div key={event.id} className="p-3.5">
                  <p className="text-sm font-medium">
                    {event.action.replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.entity} · {formatDate(event.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-semibold">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/team", label: "Manage Hierarchy", icon: Users },
            { href: "/review", label: "Review Queue", icon: Eye },
            { href: "/analytics", label: "Analytics", icon: BarChart3 },
            { href: "/actions", label: "CAPA Tracker", icon: CheckSquare },
            { href: "/hse/upload", label: "Bulk Upload", icon: FileText },
            { href: "/settings/organization", label: "Org Settings", icon: Settings },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
