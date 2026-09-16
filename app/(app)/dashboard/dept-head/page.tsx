import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KpiCard, SectionHeader, RiskBadge, EmptyState } from "@/components/ui-components";
import { BarChart3, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { wilsonLB } from "@/lib/utils";

export default async function DeptHeadDashboard() {
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

  // Get subtree
  const { data: subordinates } = await admin.rpc("subordinate_ids", { root: user.id });
  const subIds = (subordinates ?? []).map((r: { id: string }) => r.id);

  const { data: reportIds } = await admin
    .from("reports")
    .select("id")
    .in("reporter_id", subIds);
  const ids = (reportIds ?? []).map((r) => r.id);

  // KPIs
  const { count: totalReports } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .in("reporter_id", subIds);

  const { count: sifCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .in("report_id", ids)
    .eq("sif_potential", true);

  // Top clusters (Wilson-ranked)
  const { data: clusters } = await admin
    .from("clusters")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("wilson_lb", { ascending: false })
    .limit(5);

  // Barrier failures
  const { data: barrierAlerts } = await admin
    .from("clusters")
    .select("*")
    .eq("org_id", profile.org_id)
    .eq("is_alerting", true)
    .order("wilson_lb", { ascending: false })
    .limit(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Department Safety Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitoring {subIds.length - 1} people across your department subtree.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Reports" value={totalReports ?? 0} icon={BarChart3} />
        <KpiCard
          label="SIF Precursors Detected"
          value={sifCount ?? 0}
          icon={AlertTriangle}
          band={sifCount ? "HIGH" : undefined}
        />
        <KpiCard
          label="SIF Rate"
          value={
            totalReports
              ? `${(((sifCount ?? 0) / totalReports) * 100).toFixed(1)}%`
              : "—"
          }
          icon={TrendingUp}
          band={
            totalReports && sifCount && sifCount / totalReports > 0.25
              ? "CRITICAL"
              : "LOW"
          }
        />
        <KpiCard
          label="Alerting Clusters"
          value={barrierAlerts?.length ?? 0}
          icon={Shield}
          band={barrierAlerts?.length ? "HIGH" : undefined}
        />
      </div>

      {/* Top precursor clusters */}
      <div className="space-y-3">
        <SectionHeader
          title="Top Precursor Clusters"
          description="Ranked by Wilson lower bound (95% CI)"
          action={
            <Link href="/analytics" className="text-sm text-blue-600 hover:underline">
              Full explorer →
            </Link>
          }
        />
        {!clusters?.length ? (
          <EmptyState
            icon={BarChart3}
            title="No clusters computed yet"
            description="Clusters are recomputed nightly after at least 2 similar reports."
          />
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {clusters.map((cluster) => (
              <div key={cluster.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                    {cluster.key_type}
                  </p>
                  <p className="mt-0.5 font-medium">{cluster.key_value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cluster.sif_count}/{cluster.report_count} SIF · Wilson LB:{" "}
                    {(cluster.wilson_lb * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {cluster.is_alerting && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      ALERT
                    </span>
                  )}
                  <RiskBadge
                    band={
                      cluster.wilson_lb > 0.5
                        ? "CRITICAL"
                        : cluster.wilson_lb > 0.3
                        ? "HIGH"
                        : cluster.wilson_lb > 0.15
                        ? "MEDIUM"
                        : "LOW"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barrier alerts */}
      {barrierAlerts && barrierAlerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <h3 className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-200">
            <AlertTriangle className="h-4 w-4" />
            Repeat Barrier Failure Alerts
          </h3>
          <ul className="mt-2 space-y-1">
            {barrierAlerts.map((a) => (
              <li key={a.id} className="text-sm text-red-700 dark:text-red-300">
                {a.key_value} — {a.sif_count} failures in {a.window_days}d
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
