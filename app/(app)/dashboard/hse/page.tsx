import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SifCommandCenterClient, type CommandCenterData } from "./command-center-client";

export default async function HseDashboard() {
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
  const org_id = profile.org_id;

  // Fetch org name
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", org_id)
    .single();

  // 1. Live counts strictly from Supabase
  const { count: totalReports } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id);

  const { count: sifCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("sif_potential", true);

  const { count: criticalCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("risk_band", "CRITICAL");

  const { count: highCount } = await admin
    .from("ai_analyses")
    .select("*", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("risk_band", "HIGH");

  // "Reviewed by HSE" = distinct SIF report_ids that have at least one review row
  const { data: reviewRows } = await admin
    .from("reviews")
    .select("report_id")
    .eq("org_id", org_id);

  // 2. Live CAPA actions
  const { data: actions } = await admin
    .from("actions")
    .select("status, due_date, completed_at, created_at")
    .eq("org_id", org_id);

  const totalActions = actions?.length ?? 0;
  const openActions = actions?.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length ?? 0;
  const overdueActions = actions?.filter((a) => a.status === "OVERDUE" || (a.due_date && new Date(a.due_date) < new Date() && a.status !== "COMPLETED")).length ?? 0;
  const verifiedActions = actions?.filter((a) => a.status === "COMPLETED").length ?? 0;

  // 3. Live analyses — include report_id so we can build site SIF density correctly
  const { data: analyses } = await admin
    .from("ai_analyses")
    .select("report_id, hazard, activity, barriers, lsr_tags, risk_band, sif_potential, created_at")
    .eq("org_id", org_id);

  // 4. Live reports for site breakdown — include id so we can join with analyses
  const { data: reports } = await admin
    .from("reports")
    .select("id, location_text, created_at")
    .eq("org_id", org_id);

  // Build lookup: report_id → sif_potential (from analyses)
  const sifReportIds = new Set<string>(
    (analyses ?? []).filter((a) => a.sif_potential).map((a) => a.report_id as string)
  );

  // Aggregate live site distribution — sif now correctly joined via report_id
  const siteCounts: Record<string, { total: number; sif: number }> = {};
  (reports ?? []).forEach((r) => {
    const loc = r.location_text || "Unspecified Area";
    if (!siteCounts[loc]) siteCounts[loc] = { total: 0, sif: 0 };
    siteCounts[loc].total++;
    if (sifReportIds.has(r.id)) siteCounts[loc].sif++;
  });

  // Aggregate live activity, barrier, and LSR distributions
  const actCounts: Record<string, { total: number; sif: number }> = {};
  const barrierCounts: Record<string, number> = {};
  const lsrCounts: Record<string, number> = {};
  const weekMap: Record<string, { total: number; sif: number }> = {};

  (reports ?? []).forEach((r) => {
    const d = new Date(r.created_at);
    const label = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString("default", { month: "short" })}`;
    if (!weekMap[label]) weekMap[label] = { total: 0, sif: 0 };
    weekMap[label].total++;
  });

  (analyses ?? []).forEach((a) => {
    const act = a.activity || "Operational Activity";
    if (!actCounts[act]) actCounts[act] = { total: 0, sif: 0 };
    actCounts[act].total++;
    if (a.sif_potential) actCounts[act].sif++;

    const bList = a.barriers as { name: string; status: string }[] | null;
    if (Array.isArray(bList)) {
      bList.forEach((b) => {
        if (["MISSING", "FAILED", "BYPASSED"].includes(b.status)) {
          const bName = b.name.trim();
          barrierCounts[bName] = (barrierCounts[bName] ?? 0) + 1;
        }
      });
    }

    const lList = a.lsr_tags as string[] | null;
    if (Array.isArray(lList)) {
      lList.forEach((l) => {
        lsrCounts[l] = (lsrCounts[l] ?? 0) + 1;
      });
    }

    const d = new Date(a.created_at);
    const label = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString("default", { month: "short" })}`;
    if (!weekMap[label]) weekMap[label] = { total: 0, sif: 0 };
    if (a.sif_potential) weekMap[label].sif++;
  });

  const liveTrendData = Object.entries(weekMap).map(([period, v]) => ({
    period,
    total: v.total,
    sif: v.sif,
  }));

  const safeTotalReports = totalReports ?? 0;
  const safeSifCount = sifCount ?? 0;

  const liveTopSites = Object.entries(siteCounts)
    .map(([name, val]) => ({
      name,
      count: val.total,
      pct: safeTotalReports > 0 ? parseFloat(((val.total / safeTotalReports) * 100).toFixed(1)) : 0,
      sifCount: val.sif,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const liveTopActivities = Object.entries(actCounts)
    .map(([name, val]) => ({
      name,
      count: val.total,
      pct: safeTotalReports > 0 ? parseFloat(((val.total / safeTotalReports) * 100).toFixed(1)) : 0,
      sifCount: val.sif,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const liveFailedBarriers = Object.entries(barrierCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const liveLsrDistribution = Object.entries(lsrCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 2a. Compute actual average closure time from real timestamps
  const completedActions = actions?.filter(
    (a) => a.status === "COMPLETED" && a.completed_at && a.created_at
  ) ?? [];
  const avgDaysToClose: number | null = completedActions.length > 0
    ? parseFloat(
        (
          completedActions.reduce((sum, a) => {
            const diff =
              (new Date(a.completed_at!).getTime() - new Date(a.created_at).getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + Math.max(0, diff);
          }, 0) / completedActions.length
        ).toFixed(1)
      )
    : null;

  // ── Compute period deltas using explicit 30d windows ──────────────────────
  // "last 30d" = past 30 days; "previous 30d" = 30-60 days ago
  // This is honest: the label shown in UI matches exactly what is computed.
  function calcDelta30d(
    rows: { created_at: string }[]
  ): { delta: number | null; periodLabel: string } {
    const now = Date.now();
    const MS_30D = 30 * 24 * 60 * 60 * 1000;
    const curr = rows.filter(
      (r) => new Date(r.created_at).getTime() >= now - MS_30D
    ).length;
    const prev = rows.filter(
      (r) =>
        new Date(r.created_at).getTime() >= now - 2 * MS_30D &&
        new Date(r.created_at).getTime() < now - MS_30D
    ).length;
    if (prev === 0) return { delta: null, periodLabel: "last 30d vs previous 30d" };
    return {
      delta: parseFloat((((curr - prev) / prev) * 100).toFixed(1)),
      periodLabel: "last 30d vs previous 30d",
    };
  }

  const allReportRows = (reports ?? []).map((r) => ({ created_at: r.created_at }));
  const allSifRows = (analyses ?? [])
    .filter((a) => a.sif_potential)
    .map((a) => ({ created_at: a.created_at }));

  const { delta: periodDeltaReports, periodLabel } = calcDelta30d(allReportRows);
  const { delta: periodDeltaSif } = calcDelta30d(allSifRows);

  // reviewedCount = distinct SIF report_ids that have at least one review
  const reviewedReportIds = new Set((reviewRows ?? []).map((r) => r.report_id as string));
  const reviewedSifCount = [...reviewedReportIds].filter((id) => sifReportIds.has(id)).length;

  // ── STRICT LIVE DATA (Zero fabricated numbers) ──
  const liveData: CommandCenterData = {
    orgName: org?.name ?? "Company Workspace",
    totalReports: safeTotalReports,
    sifCount: safeSifCount,
    highCount: highCount ?? 0,
    criticalCount: criticalCount ?? 0,
    reviewedCount: reviewedSifCount,
    reviewedPct: safeSifCount > 0 ? Math.min(100, Math.round((reviewedSifCount / safeSifCount) * 100)) : 0,
    periodDeltaReports,
    periodDeltaSif,
    periodLabel,
    trendData: liveTrendData,
    topSites: liveTopSites,
    topActivities: liveTopActivities,
    failedBarriers: liveFailedBarriers,
    lsrDistribution: liveLsrDistribution,
    recurringPatterns: [],
    capaStats: {
      total: totalActions,
      open: openActions,
      overdue: overdueActions,
      verified: verifiedActions,
      slaRatePct: totalActions > 0 ? Math.round(((totalActions - overdueActions) / totalActions) * 100) : 100,
      avgDaysToClose,
    },
  };

  // ── CALIBRATED DEMONSTRATION ASSET MODEL (Clearly labeled) ──
  const demoData: CommandCenterData = {
    orgName: `${org?.name ?? "Oil India Limited"} (Demo Model)`,
    totalReports: 1284,
    sifCount: 217,
    highCount: 63,
    criticalCount: 18,
    reviewedCount: 198,
    reviewedPct: 91,
    // Demo model deltas are labelled as illustrative, not computed from live DB
    periodDeltaReports: 12.4,
    periodDeltaSif: 18.0,
    periodLabel: "illustrative demo period",
    trendData: [
      { period: "Week 1", total: 110, sif: 18 },
      { period: "Week 2", total: 125, sif: 22 },
      { period: "Week 3", total: 140, sif: 29 },
      { period: "Week 4", total: 135, sif: 24 },
      { period: "Week 5", total: 160, sif: 33 },
      { period: "Week 6", total: 155, sif: 27 },
      { period: "Week 7", total: 175, sif: 35 },
      { period: "Week 8", total: 190, sif: 39 },
    ],
    topSites: [
      { name: "Duliajan Field Pad 4", count: 240, pct: 18.7, sifCount: 42 },
      { name: "Digboi Refinery Section 2", count: 210, pct: 16.4, sifCount: 36 },
      { name: "Moran Central Gathering", count: 168, pct: 13.1, sifCount: 28 },
      { name: "Naharkatiya Well Site 12", count: 144, pct: 11.2, sifCount: 24 },
      { name: "Kumchai Gas Compressor", count: 108, pct: 8.4, sifCount: 18 },
    ],
    topActivities: [
      { name: "Hot Work & Welding", count: 310, pct: 24.2, sifCount: 52 },
      { name: "Safe Mechanical Lifting", count: 254, pct: 19.8, sifCount: 43 },
      { name: "Confined Space Entry", count: 236, pct: 18.4, sifCount: 40 },
      { name: "Working at Height", count: 187, pct: 14.6, sifCount: 32 },
      { name: "Line Depressurization", count: 142, pct: 11.1, sifCount: 24 },
    ],
    failedBarriers: [
      { name: "LOTO / Energy Isolation", count: 38 },
      { name: "Permit to Work (PTW)", count: 27 },
      { name: "Atmospheric Gas Testing", count: 21 },
      { name: "Fall Protection Harness", count: 19 },
      { name: "Line of Fire Barricade", count: 14 },
      { name: "Secondary Containment", count: 11 },
    ],
    lsrDistribution: [
      { name: "Energy Isolation", count: 31 },
      { name: "Line of Fire", count: 25 },
      { name: "Working at Height", count: 18 },
      { name: "Confined Space", count: 16 },
      { name: "Hot Work", count: 14 },
      { name: "Safe Mechanical Lifting", count: 12 },
    ],
    recurringPatterns: [
      {
        id: "pat-1",
        title: "Missing isolation verification during piping maintenance on live lines",
        activity: "Piping Maintenance",
        barrier: "LOTO / Energy Isolation",
        count: 23,
        sifCount: 8,
        trend: "↑ 28% this month",
      },
      {
        id: "pat-2",
        title: "Personnel entering line-of-fire beneath suspended crane loads",
        activity: "Safe Mechanical Lifting",
        barrier: "Line of Fire Barricading",
        count: 19,
        sifCount: 6,
        trend: "↑ 14% this month",
      },
      {
        id: "pat-3",
        title: "Confined-space tank entry without verified atmospheric gas testing",
        activity: "Confined Space Entry",
        barrier: "Atmospheric Gas Testing",
        count: 16,
        sifCount: 5,
        trend: "Stable",
      },
    ],
    capaStats: {
      total: 48,
      open: 14,
      overdue: 3,
      verified: 31,
      slaRatePct: 94,
      avgDaysToClose: 4.2,
    },
  };

  return <SifCommandCenterClient liveData={liveData} demoData={demoData} />;
}
