"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
  ExternalLink,
  MapPin,
  ShieldX,
  FileCheck,
  Database,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface CommandCenterData {
  orgName: string;
  totalReports: number;
  sifCount: number;
  highCount: number;
  criticalCount: number;
  reviewedCount: number;
  reviewedPct: number;
  /** Percentage change vs previous period. null means no historical data available. */
  periodDeltaReports: number | null;
  /** Percentage change in SIF count vs previous period. null means no historical data. */
  periodDeltaSif: number | null;
  trendData: { period: string; total: number; sif: number }[];
  topSites: { name: string; count: number; pct: number; sifCount: number }[];
  topActivities: { name: string; count: number; pct: number; sifCount: number }[];
  failedBarriers: { name: string; count: number }[];
  lsrDistribution: { name: string; count: number }[];
  recurringPatterns: {
    id: string;
    title: string;
    activity: string;
    barrier: string;
    count: number;
    sifCount: number;
    trend: string;
  }[];
  capaStats: {
    total: number;
    open: number;
    overdue: number;
    verified: number;
    slaRatePct: number;
    /** Actual mean of (completed_at - created_at) for verified actions, in days. null = no verified actions yet. */
    avgDaysToClose: number | null;
  };
}

export function SifCommandCenterClient({
  liveData,
  demoData,
}: {
  liveData: CommandCenterData;
  demoData: CommandCenterData;
}) {
  const [dataMode, setDataMode] = useState<"live" | "demo">("live");
  const [timeRange, setTimeRange] = useState("90d");
  const [exporting, setExporting] = useState(false);

  const data = dataMode === "live" ? liveData : demoData;

  function handleExport() {
    setExporting(true);
    const content = `SIF SENTINEL - HSE EXECUTIVE SUMMARY
Organization: ${data.orgName}
Data Mode: ${dataMode === "live" ? "LIVE COMPANY DATA" : "DEMONSTRATION ASSET MODEL"}
Generated At: ${new Date().toISOString()}

KPI SUMMARY:
- Total Observations: ${data.totalReports}
- Confirmed SIF Precursors: ${data.sifCount}
- Critical Risk Events: ${data.criticalCount}
- High Risk Events: ${data.highCount}
- Reviewed Compliance: ${data.reviewedPct}% (${data.reviewedCount}/${data.sifCount})

TOP RISK SITES:
${data.topSites.map((s, i) => `${i + 1}. ${s.name}: ${s.count} reports (${s.pct}%), ${s.sifCount} SIF`).join("\n")}

TOP RISK ACTIVITIES:
${data.topActivities.map((a, i) => `${i + 1}. ${a.name}: ${a.count} reports (${a.pct}%), ${a.sifCount} SIF`).join("\n")}

FAILED BARRIERS:
${data.failedBarriers.map((b) => `- ${b.name}: ${b.count} failures`).join("\n")}

IOGP LIFE-SAVING RULES:
${data.lsrDistribution.map((l) => `- ${l.name}: ${l.count} occurrences`).join("\n")}

CORRECTIVE ACTION SLA:
- Total CAPA Items: ${data.capaStats.total}
- Open: ${data.capaStats.open}
- Overdue: ${data.capaStats.overdue}
- Verified Closed: ${data.capaStats.verified}
- SLA Compliance Rate: ${data.capaStats.slaRatePct}%
- Avg Resolution Latency: ${data.capaStats.avgDaysToClose} days
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SIF_Command_Center_${dataMode}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 800);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Top Header & Mode Toggle ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              SIF SENTINEL COMMAND CENTER
            </span>
            <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground border">
              {data.orgName}
            </span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Upstream Asset Safety Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time concentration of fatal potential, critical barrier degradation, and recurring precursor vectors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Explicit Data Mode Switcher (Problem 1) */}
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
            <button
              onClick={() => setDataMode("live")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                dataMode === "live"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dataMode === "live" ? "bg-white" : "bg-emerald-500"}`} />
              Live Company Data ({liveData.totalReports})
            </button>
            <button
              onClick={() => setDataMode("demo")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                dataMode === "demo"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dataMode === "demo" ? "bg-white" : "bg-amber-400"}`} />
              Demonstration Asset (1,284)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-muted/40 transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Generating..." : "Export HSE Report"}
            </button>

            <Link
              href="/precursors"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow transition hover:bg-primary/90"
            >
              <Layers className="h-3.5 w-3.5" />
              4D Precursors
            </Link>
          </div>
        </div>
      </div>

      {/* Mode Indicator Banner */}
      {dataMode === "live" ? (
        liveData.totalReports === 0 ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-950 dark:text-blue-200">
                  Live Company Database Connected · 0 Reports Logged
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Metrics below display exact database counts with zero synthetic fabrication. Submit field observations or switch to Demonstration Asset mode to preview populated operational metrics.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/reports/new"
                className="rounded-lg bg-blue-600 text-white text-xs font-bold px-3 py-1.5 shadow hover:bg-blue-500"
              >
                + Submit Live Observation
              </Link>
              <button
                onClick={() => setDataMode("demo")}
                className="rounded-lg border border-blue-300 text-blue-900 dark:text-blue-200 text-xs font-semibold px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              >
                View Demo Model
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-emerald-950 dark:text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong>LIVE SUPABASE DATABASE MODE:</strong> Displaying {liveData.totalReports} live reports, {liveData.sifCount} SIF precursors, and {liveData.capaStats.total} actions.
            </div>
            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">Zero Fabricated Numbers</span>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30 flex items-center gap-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="text-amber-950 dark:text-amber-200">
            <strong>DEMONSTRATION ASSET MODEL ACTIVE:</strong> Showing 1,284 calibrated simulation reports across Duliajan, Digboi, and Moran. Switch to <strong>Live Company Data</strong> anytime to view current database rows.
          </div>
        </div>
      )}

      {/* ── 5-Metric Command Center Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Reports */}
        <div className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Observations
          </div>
          <div className="mt-2 text-3xl font-black text-foreground tabular-nums">
            {data.totalReports.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold">
            {data.periodDeltaReports === null ? (
              <span className="text-muted-foreground">— no prior period data</span>
            ) : data.periodDeltaReports >= 0 ? (
              <><ArrowUpRight className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600">+{data.periodDeltaReports.toFixed(1)}% vs last period</span></>
            ) : (
              <><ArrowDownRight className="h-3 w-3 text-blue-600" /><span className="text-blue-600">{data.periodDeltaReports.toFixed(1)}% vs last period</span></>
            )}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">UA, UC, Near-Miss &amp; Incidents</div>
        </div>

        {/* SIF Risk Potential */}
        <div className="rounded-xl border border-red-300 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              SIF Risk Precursors
            </span>
            <span className="rounded-full bg-red-200 dark:bg-red-900/60 px-1.5 py-0.5 text-[10px] font-black text-red-800 dark:text-red-200">
              {data.totalReports > 0 ? `${((data.sifCount / data.totalReports) * 100).toFixed(1)}%` : "0%"}
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-red-600 dark:text-red-400 tabular-nums">
            {data.sifCount.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold">
            {data.periodDeltaSif === null ? (
              <span className="text-muted-foreground">— no prior period data</span>
            ) : data.periodDeltaSif >= 0 ? (
              <><ArrowUpRight className="h-3 w-3 text-red-600" /><span className="text-red-600">+{data.periodDeltaSif.toFixed(1)}% SIF vs last period</span></>
            ) : (
              <><ArrowDownRight className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600">{data.periodDeltaSif.toFixed(1)}% SIF vs last period</span></>
            )}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">Carrying fatal or life-altering energy</div>
        </div>

        {/* HIGH Severity */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            HIGH Risk Band
          </div>
          <div className="mt-2 text-3xl font-black text-foreground tabular-nums">
            {data.highCount.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>Escalated barrier degradation</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">Immediate supervisor intervention</div>
        </div>

        {/* CRITICAL Precursors */}
        <div className="rounded-xl border border-red-400 bg-red-100/50 dark:border-red-800 dark:bg-red-950/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-900 dark:text-red-200">
              CRITICAL SIF
            </span>
            <Flame className="h-4 w-4 text-red-600 fill-current animate-pulse" />
          </div>
          <div className="mt-2 text-3xl font-black text-red-700 dark:text-red-300 tabular-nums">
            {data.criticalCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-bold text-red-700 dark:text-red-300">
            Full manager chain notified
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">Immediate work halt protocol</div>
        </div>

        {/* Reviewed Compliance % */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reviewed By HSE
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-foreground tabular-nums">
            {data.reviewedPct}%
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
            {data.reviewedCount} of {data.sifCount} SIF cases audited
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">Zero unreviewed SIF closure</div>
        </div>
      </div>

      {/* ── SIF Precursor Trend Trajectory (Recharts) ── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-base">SIF Precursor Trajectory &amp; Total Ingestion Trend</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Temporal velocity of hazardous energy occurrences compared to gross observation submission rate.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Total Observations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-red-600 dark:text-red-400">SIF Precursors</span>
            </div>
          </div>
        </div>

        {data.trendData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSif" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Total Observations"
                />
                <Area
                  type="monotone"
                  dataKey="sif"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSif)"
                  name="SIF Precursors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground">
            No temporal trend data available yet in live database.
          </div>
        )}
      </div>

      {/* ── 2x2 Command Center Grid: Sites, Activities, Barriers, LSRs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Risk Sites */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              <h3 className="font-bold text-sm">TOP RISK SITES (Fatal Potential Density)</h3>
            </div>
            <Link href="/precursors" className="text-xs text-primary font-semibold hover:underline">
              Drill-down →
            </Link>
          </div>

          {data.topSites.length > 0 ? (
            <div className="space-y-3">
              {data.topSites.map((site, index) => (
                <div key={site.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {index + 1}. {site.name}
                    </span>
                    <span className="font-mono font-bold text-red-600">
                      {site.pct}% ({site.sifCount} SIF)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, site.pct * 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No site distribution records found in current data scope.
            </div>
          )}
        </div>

        {/* Top Risk Activities */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-600" />
              <h3 className="font-bold text-sm">TOP RISK ACTIVITIES (Precursor Density)</h3>
            </div>
            <Link href="/precursors" className="text-xs text-primary font-semibold hover:underline">
              Drill-down →
            </Link>
          </div>

          {data.topActivities.length > 0 ? (
            <div className="space-y-3">
              {data.topActivities.map((act, index) => (
                <div key={act.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {index + 1}. {act.name}
                    </span>
                    <span className="font-mono font-bold text-orange-600">
                      {act.pct}% ({act.sifCount} SIF)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, act.pct * 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No activity records found in current data scope.
            </div>
          )}
        </div>

        {/* Failed Barriers */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-amber-600" />
              <h3 className="font-bold text-sm">FAILED BARRIERS (Missing / Bypassed Controls)</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Deficiency Count</span>
          </div>

          {data.failedBarriers.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {data.failedBarriers.map((b) => (
                <div key={b.name} className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-foreground truncate">{b.name}</div>
                  <div className="text-2xl font-black font-mono text-amber-600 mt-1">{b.count}</div>
                  <div className="text-[10px] text-muted-foreground">Compromised Barrier</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No failed barrier events logged in current data scope.
            </div>
          )}
        </div>

        {/* IOGP Life-Saving Rules */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-sm">IOGP LIFE-SAVING RULES BREACHED</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">IOGP Standard 9</span>
          </div>

          {data.lsrDistribution.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {data.lsrDistribution.map((l) => (
                <div key={l.name} className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-foreground truncate">{l.name}</div>
                  <div className="text-2xl font-black font-mono text-blue-600 mt-1">{l.count}</div>
                  <div className="text-[10px] text-muted-foreground">Mapped Rule Precursors</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No IOGP Life-Saving Rule breaches logged in current data scope.
            </div>
          )}
        </div>
      </div>

      {/* ── Top Recurring Precursors (Wilson Ranked) ── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h3 className="font-bold text-base">TOP RECURRING SIF PRECURSORS (Wilson Confidence Ranked)</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identifies systemic multi-failure combinations: hazardous energy + recurring barrier breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/precursors"
              className="rounded-lg border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted"
            >
              Investigate Patterns
            </Link>
            <Link
              href="/reports"
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              View All Reports
            </Link>
          </div>
        </div>

        {data.recurringPatterns.length > 0 ? (
          <div className="space-y-3">
            {data.recurringPatterns.map((pat, idx) => (
              <div
                key={pat.id}
                className="rounded-lg border bg-muted/20 p-4 hover:border-primary/40 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-600">
                      PATTERN #{idx + 1}
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {pat.activity}
                    </span>
                    <span className="rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                      {pat.barrier}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-sm text-foreground">{pat.title}</p>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-black text-base text-foreground">
                      {pat.count} cases
                    </div>
                    <div className="text-[11px] font-bold text-red-600">
                      {pat.sifCount} SIF Potential
                    </div>
                  </div>
                  <span className="rounded bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {pat.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No recurring pattern clusters detected yet in live database. Submit more observations to run Wilson ranking.
          </div>
        )}
      </div>

      {/* ── Corrective Action (CAPA) SLA Closure Analytics ── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h3 className="font-bold text-base">Closed-Loop CAPA SLA &amp; Resolution Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detect → Understand → Act → Verify → Learn: tracking corrective intervention SLAs.
            </p>
          </div>
          <Link href="/actions" className="text-xs text-primary font-semibold hover:underline">
            View Action Register →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
          <div className="rounded-lg border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground font-semibold">Total Actions</span>
            <div className="text-2xl font-black text-foreground mt-1">{data.capaStats.total}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground font-semibold">Open / In Progress</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{data.capaStats.open}</div>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 p-3">
            <span className="text-xs text-red-700 dark:text-red-300 font-bold">Overdue SLA</span>
            <div className="text-2xl font-black text-red-600 mt-1">{data.capaStats.overdue}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground font-semibold">Verified Closed</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{data.capaStats.verified}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground font-semibold">SLA Compliance</span>
            <div className="text-2xl font-black text-foreground mt-1">{data.capaStats.slaRatePct}%</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground font-semibold">Avg Closure Time</span>
            <div className="text-2xl font-black text-foreground mt-1">
              {data.capaStats.avgDaysToClose !== null ? `${data.capaStats.avgDaysToClose}d` : "—"}
            </div>
            {data.capaStats.avgDaysToClose === null && (
              <div className="text-[10px] text-muted-foreground mt-0.5">No closed actions yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
