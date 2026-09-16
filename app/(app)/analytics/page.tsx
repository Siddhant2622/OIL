import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KpiCard, SectionHeader, RiskBadge, EmptyState } from "@/components/ui-components";
import { BarChart3, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { wilsonLB } from "@/lib/utils";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || ["EMPLOYEE"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const org_id = profile.org_id;

  // Overall stats
  const { count: totalReports } = await admin
    .from("reports").select("*", { count: "exact", head: true }).eq("org_id", org_id);
  const { count: sifCount } = await admin
    .from("ai_analyses").select("*", { count: "exact", head: true })
    .eq("org_id", org_id).eq("sif_potential", true);
  const { count: critical } = await admin
    .from("ai_analyses").select("*", { count: "exact", head: true })
    .eq("org_id", org_id).eq("risk_band", "CRITICAL");
  const { count: high } = await admin
    .from("ai_analyses").select("*", { count: "exact", head: true })
    .eq("org_id", org_id).eq("risk_band", "HIGH");

  // Clusters (Wilson-ranked)
  const { data: clusters } = await admin
    .from("clusters")
    .select("*")
    .eq("org_id", org_id)
    .order("wilson_lb", { ascending: false })
    .limit(20);

  // LSR distribution
  const { data: analyses } = await admin
    .from("ai_analyses")
    .select("lsr_tags, risk_band")
    .eq("org_id", org_id)
    .eq("sif_potential", true);

  // Tally LSR tags
  const lsrCounts: Record<string, number> = {};
  for (const a of analyses ?? []) {
    for (const tag of (a.lsr_tags as string[]) ?? []) {
      lsrCounts[tag] = (lsrCounts[tag] ?? 0) + 1;
    }
  }
  const lsrSorted = Object.entries(lsrCounts).sort((a, b) => b[1] - a[1]);

  // Band distribution
  const bands: Record<string, number> = { CRITICAL: critical ?? 0, HIGH: high ?? 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Explorer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pattern intelligence across all reports in your org.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Reports" value={totalReports ?? 0} icon={BarChart3} />
        <KpiCard
          label="SIF Precursors"
          value={sifCount ?? 0}
          icon={AlertTriangle}
          band="HIGH"
        />
        <KpiCard
          label="CRITICAL"
          value={critical ?? 0}
          icon={Shield}
          band="CRITICAL"
        />
        <KpiCard
          label="SIF Rate"
          value={
            totalReports
              ? `${(((sifCount ?? 0) / totalReports) * 100).toFixed(1)}%`
              : "—"
          }
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wilson-ranked clusters */}
        <div className="space-y-3">
          <SectionHeader
            title="Top Precursor Clusters"
            description="Wilson lower bound at 95% confidence"
          />
          {!clusters?.length ? (
            <EmptyState
              icon={BarChart3}
              title="No clusters yet"
              description="Clusters are computed nightly."
            />
          ) : (
            <div className="space-y-2">
              {clusters.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground uppercase">
                        {c.key_type}
                      </span>
                      {c.is_alerting && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">
                          ALERT
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-medium text-sm">{c.key_value}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {/* Wilson LB bar */}
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${c.wilson_lb * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {(c.wilson_lb * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.sif_count}/{c.report_count} SIF · {c.window_days}d window
                    </p>
                  </div>
                  <RiskBadge
                    band={
                      c.wilson_lb > 0.5
                        ? "CRITICAL"
                        : c.wilson_lb > 0.3
                        ? "HIGH"
                        : c.wilson_lb > 0.15
                        ? "MEDIUM"
                        : "LOW"
                    }
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LSR distribution */}
        <div className="space-y-3">
          <SectionHeader
            title="Life-Saving Rule Violations"
            description="Across SIF-potential reports"
          />
          {!lsrSorted.length ? (
            <EmptyState
              icon={Shield}
              title="No LSR data yet"
              description="LSR distribution appears once SIF reports are analysed."
            />
          ) : (
            <div className="space-y-2">
              {lsrSorted.map(([rule, count]) => {
                const max = lsrSorted[0][1];
                return (
                  <div key={rule} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{rule}</p>
                      <span className="text-sm font-bold tabular-nums text-red-600">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
