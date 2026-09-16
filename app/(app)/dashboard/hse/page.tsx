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
  Eye,
  AlertTriangle,
  BarChart3,
  CheckSquare,
  Clock,
  Shield,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function HseDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  const org_id = profile.org_id;

  // KPIs
  const { count: totalReports } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id);

  const { count: sifCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("sif_potential", true);

  const { count: reviewQueue } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("status", "IN_REVIEW");

  const { count: criticalCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("risk_band", "CRITICAL");

  const { count: openActions } = await admin
    .from("actions")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .in("status", ["OPEN", "IN_PROGRESS", "OVERDUE"]);

  // Review queue (top items)
  const { data: queueItems } = await admin
    .from("reports")
    .select(`
      id, report_code, report_type, status, created_at, description,
      ai_analyses(risk_band, sif_confidence, needs_human_review, review_reasons)
    `)
    .eq("org_id", org_id)
    .eq("status", "IN_REVIEW")
    .order("created_at", { ascending: false })
    .limit(5);

  // Engine health
  const { count: analysisRun } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id);

  const { count: analysisFailed } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("status", "ANALYSIS_FAILED");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">HSE Command Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organisation-wide safety intelligence.
          </p>
        </div>
        <Link
          href="/review"
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-500"
        >
          <Eye className="h-4 w-4" />
          Review Queue
          {(reviewQueue ?? 0) > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
              {reviewQueue}
            </span>
          )}
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Reports" value={totalReports ?? 0} icon={BarChart3} />
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
          label="Pending Review"
          value={reviewQueue ?? 0}
          icon={Eye}
          band={reviewQueue ? "MEDIUM" : undefined}
        />
        <KpiCard
          label="Open Actions"
          value={openActions ?? 0}
          icon={CheckSquare}
          band={openActions ? "MEDIUM" : undefined}
        />
        <KpiCard
          label="Analysis Failures"
          value={analysisFailed ?? 0}
          icon={Clock}
          band={analysisFailed ? "HIGH" : undefined}
        />
      </div>

      {/* Review queue preview */}
      <div className="space-y-3">
        <SectionHeader
          title="Human Review Queue"
          description="Sorted by creation time — most recent first"
          action={
            <Link
              href="/review"
              className="text-sm text-blue-600 hover:underline"
            >
              Full queue →
            </Link>
          }
        />
        {!queueItems?.length ? (
          <EmptyState
            icon={Eye}
            title="Queue is empty"
            description="All SIF-potential reports have been reviewed."
          />
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {queueItems.map((item) => {
              const analysis = Array.isArray(item.ai_analyses)
                ? item.ai_analyses[0]
                : item.ai_analyses;
              return (
                <Link
                  key={item.id}
                  href={`/reports/${item.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-muted-foreground">
                        {item.report_code}
                      </p>
                      {analysis?.risk_band && (
                        <RiskBadge
                          band={analysis.risk_band as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"}
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">
                      {item.description.slice(0, 100)}…
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.created_at)} · {item.report_type.replace("_", " ")}
                      {analysis?.review_reasons?.length > 0 && (
                        <span className="ml-2 text-amber-600">
                          {analysis.review_reasons[0]}
                        </span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={item.status} className="shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Engine health */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">AI Engine Health</h3>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Analyses run</p>
            <p className="text-xl font-bold tabular-nums">{analysisRun ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Failures</p>
            <p
              className={`text-xl font-bold tabular-nums ${analysisFailed ? "text-red-600" : ""}`}
            >
              {analysisFailed ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">SIF rate</p>
            <p className="text-xl font-bold tabular-nums">
              {analysisRun
                ? `${(((sifCount ?? 0) / analysisRun) * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Review rate</p>
            <p className="text-xl font-bold tabular-nums">
              {analysisRun
                ? `${(((reviewQueue ?? 0) / analysisRun) * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
