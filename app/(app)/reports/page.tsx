import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RiskBadge, StatusBadge, SectionHeader, EmptyState } from "@/components/ui-components";
import { FileText, Plus, Filter } from "lucide-react";
import { formatDate, reportTypeLabels, reportStatusLabels } from "@/lib/utils";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch via anon client — RLS scopes by role
  const { data: reports, count } = await supabase
    .from("reports")
    .select(
      `id, report_code, report_type, status, created_at, description, location_text,
       profiles(full_name, email),
       ai_analyses(risk_band, sif_potential, sif_confidence)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count ?? 0} total reports visible to you
          </p>
        </div>
        <Link
          href="/reports/new"
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500"
          id="new-report-btn"
        >
          <Plus className="h-4 w-4" />
          Report Hazard
        </Link>
      </div>

      {/* Filter bar (placeholder — wire to URL params in Phase 8) */}
      <div className="flex items-center gap-2 flex-wrap">
        {["ALL", "UNSAFE_ACT", "NEAR_MISS", "INCIDENT", "CONFIRMED_SIF", "IN_REVIEW"].map(
          (filter) => (
            <button
              key={filter}
              className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
            >
              {filter === "ALL"
                ? "All types"
                : filter.replace(/_/g, " ")}
            </button>
          )
        )}
      </div>

      {!reports?.length ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Reports submitted by you and your team will appear here."
          action={
            <Link
              href="/reports/new"
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white"
            >
              Submit first report
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {reports.map((report) => {
            const analysis = Array.isArray(report.ai_analyses)
              ? report.ai_analyses[0]
              : report.ai_analyses;
            const reporter = (Array.isArray(report.profiles) ? report.profiles[0] : report.profiles) as
              | { full_name: string | null; email: string }
              | null;

            return (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
              >
                {/* Type indicator */}
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {report.report_code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {reportTypeLabels[report.report_type]}
                    </span>
                    <StatusBadge status={report.status} />
                    {analysis?.risk_band && (
                      <RiskBadge
                        band={
                          analysis.risk_band as
                            | "CRITICAL"
                            | "HIGH"
                            | "MEDIUM"
                            | "LOW"
                        }
                        size="sm"
                      />
                    )}
                    {analysis?.sif_potential && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        SIF
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">
                    {report.description?.slice(0, 120)}…
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(report.created_at)} ·{" "}
                    {report.location_text ?? "Location unknown"} ·{" "}
                    {reporter?.full_name ?? reporter?.email ?? "Unknown"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
