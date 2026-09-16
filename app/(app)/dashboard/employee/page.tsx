import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KpiCard, SectionHeader, StatusBadge, RiskBadge, EmptyState } from "@/components/ui-components";
import { AlertTriangle, FileText, CheckSquare, Plus, Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Fetch user's own reports
  const { data: reports } = await admin
    .from("reports")
    .select("id, report_code, report_type, status, created_at, description")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // KPIs
  const { count: totalReports } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_id", user.id);

  const { count: sifCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .eq("report_id", user.id) // will be report_id matched against user's reports
    .eq("sif_potential", true);

  const { count: openActions } = await admin
    .from("actions")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", user.id)
    .in("status", ["OPEN", "IN_PROGRESS", "OVERDUE"]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Safety Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your safety reporting activity and assigned actions.
        </p>
      </div>

      {/* Primary CTA */}
      <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-950/20">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-orange-900 dark:text-orange-100">
              See a hazard? Report it immediately.
            </h2>
            <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
              Every report — even a near miss — helps prevent a fatality.
            </p>
          </div>
          <Link
            href="/reports/new"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-500"
            id="report-hazard-btn"
          >
            <Plus className="h-4 w-4" />
            Report a Hazard
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="My Reports (total)"
          value={totalReports ?? 0}
          icon={FileText}
        />
        <KpiCard
          label="SIF Precursors Found"
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
      </div>

      {/* Recent reports */}
      <div className="space-y-3">
        <SectionHeader
          title="My Recent Reports"
          action={
            <Link
              href="/reports"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          }
        />

        {!reports?.length ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Your submitted reports will appear here."
            action={
              <Link
                href="/reports/new"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Submit your first report
              </Link>
            }
          />
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {reports.map((report) => (
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
                    {report.description.slice(0, 80)}…
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
    </div>
  );
}
