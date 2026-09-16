import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KpiCard, SectionHeader, StatusBadge, RiskBadge, EmptyState } from "@/components/ui-components";
import { Users, AlertTriangle, CheckSquare, FileText, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function SupervisorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Get subordinate IDs
  const { data: subordinates } = await admin.rpc("subordinate_ids", {
    root: user.id,
  });
  const subIds = (subordinates ?? []).map((r: { id: string }) => r.id);

  // Reports by team this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: teamReports } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .in("reporter_id", subIds)
    .gte("created_at", monthStart.toISOString());

  const { data: recentReports } = await admin
    .from("reports")
    .select("id, report_code, report_type, status, created_at, description, reporter_id")
    .in("reporter_id", subIds)
    .order("created_at", { ascending: false })
    .limit(8);

  // SIF count
  const { data: reportIds } = await admin
    .from("reports")
    .select("id")
    .in("reporter_id", subIds);

  const ids = (reportIds ?? []).map((r) => r.id);

  const { count: sifCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .in("report_id", ids)
    .eq("sif_potential", true);

  const { count: openActions } = await admin
    .from("actions")
    .select("*", { count: "exact", head: true })
    .eq("org_id", user.id) // scoped by RLS
    .in("assigned_to", subIds)
    .in("status", ["OPEN", "IN_PROGRESS", "OVERDUE"]);

  const { count: overdueActions } = await admin
    .from("actions")
    .select("*", { count: "exact", head: true })
    .in("assigned_to", subIds)
    .eq("status", "OVERDUE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Safety Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitoring {subIds.length - 1} team members.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Team Reports (this month)" value={teamReports ?? 0} icon={FileText} />
        <KpiCard
          label="SIF Precursors"
          value={sifCount ?? 0}
          icon={AlertTriangle}
          band={sifCount ? "HIGH" : undefined}
        />
        <KpiCard
          label="Open Actions"
          value={openActions ?? 0}
          icon={CheckSquare}
          band={openActions ? "MEDIUM" : undefined}
        />
        <KpiCard
          label="Overdue Actions"
          value={overdueActions ?? 0}
          icon={TrendingUp}
          band={overdueActions ? "CRITICAL" : undefined}
        />
      </div>

      {/* Team report feed */}
      <div className="space-y-3">
        <SectionHeader
          title="Team Report Feed"
          action={
            <Link href="/reports" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          }
        />
        {!recentReports?.length ? (
          <EmptyState
            icon={FileText}
            title="No team reports yet"
            description="Reports from your team will appear here."
          />
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {recentReports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {report.report_code}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium">
                    {report.description.slice(0, 90)}…
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(report.created_at)} · {report.report_type.replace("_", " ")}
                  </p>
                </div>
                <StatusBadge status={report.status} className="ml-4 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/team"
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          <Users className="h-4 w-4" />
          Manage Team
        </Link>
        <Link
          href="/actions"
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          <CheckSquare className="h-4 w-4" />
          CAPA Tracker
        </Link>
      </div>
    </div>
  );
}
