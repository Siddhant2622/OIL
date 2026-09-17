"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  Layers,
  ChevronRight,
  ExternalLink,
  Activity,
  MapPin,
  ShieldX,
  FileCheck,
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
    avgDaysToClose: number;
  };
}

export function SifCommandCenterClient({ data }: { data: CommandCenterData }) {
  const [timeRange, setTimeRange] = useState("90d");
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);
    const content = `SIF SENTINEL - HSE EXECUTIVE SUMMARY
Organization: ${data.orgName}
Generated At: ${new Date().toISOString()}

KPI SUMMARY:
- Total Observations: ${data.totalReports}
- Confirmed SIF Precursors: ${data.sifCount}
- Critical Risk Events: ${data.criticalCount}
- High Risk Events: ${data.highCount}
- HSE Review Completion: ${data.reviewedPct}%

TOP RISK SITES:
${data.topSites.map((s, i) => `${i + 1}. ${s.name}: ${s.pct}% (${s.sifCount} SIFs)`).join("\n")}

TOP RISK ACTIVITIES:
${data.topActivities.map((a, i) => `${i + 1}. ${a.name}: ${a.pct}% (${a.sifCount} SIFs)`).join("\n")}

FAILED BARRIERS:
${data.failedBarriers.map((b) => `- ${b.name}: ${b.count} failures`).join("\n")}

CAPA CLOSURE:
- Open Actions: ${data.capaStats.open}
- Overdue Actions: ${data.capaStats.overdue}
- SLA Closure Rate: ${data.capaStats.slaRatePct}%
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HSE-SIF-Report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-red-600 px-2.5 py-0.5 text-xs font-black text-white uppercase tracking-wider animate-pulse">
              Live Command Center
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              OIL SIF SENTINEL · {data.orgName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            SIF PRECURSOR COMMAND CENTER
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Where is fatal potential concentrating, which barriers are failing, and what needs intervention?
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold outline-none focus:border-primary shadow-xs"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="180d">Last 6 Months</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            {exporting ? "Generating…" : "Export HSE Report"}
          </button>
        </div>
      </div>

      {/* 5-KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Reports</p>
          <p className="text-3xl font-black text-foreground mt-1 tabular-nums">
            {data.totalReports.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Observations submitted</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              SIF Risk Precursors
            </p>
            <Flame className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-1 tabular-nums">
            {data.sifCount.toLocaleString()}
          </p>
          <p className="text-[11px] text-red-700/80 dark:text-red-300 mt-1">
            {data.totalReports > 0 ? ((data.sifCount / data.totalReports) * 100).toFixed(1) : 0}% of all reports
          </p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 dark:border-orange-950 dark:bg-orange-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              High Risk
            </p>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
            {data.highCount.toLocaleString()}
          </p>
          <p className="text-[11px] text-orange-700/80 dark:text-orange-300 mt-1">Life-altering potential</p>
        </div>

        <div className="rounded-2xl border border-red-300 bg-red-100/60 dark:border-red-900 dark:bg-red-900/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              Critical Risk
            </p>
            <ShieldAlert className="h-4 w-4 text-red-700 animate-bounce" />
          </div>
          <p className="text-3xl font-black text-red-700 dark:text-red-300 mt-1 tabular-nums">
            {data.criticalCount.toLocaleString()}
          </p>
          <p className="text-[11px] text-red-800 dark:text-red-200 mt-1">Fatal line-of-fire</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              HSE Reviewed
            </p>
            <FileCheck className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-3xl font-black text-foreground mt-1 tabular-nums">
            {data.reviewedPct}%
          </p>
          <p className="text-[11px] text-green-600 font-medium mt-1">
            {data.reviewedCount} expert verifications
          </p>
        </div>
      </div>

      {/* "What Changed in Last 7 Days" Delta Bar */}
      <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            What Changed in the Last 7 Days
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl bg-red-500/10 p-2.5 text-red-700 dark:text-red-400 font-semibold">
            <ArrowUpRight className="h-4 w-4 shrink-0" />
            <span>SIF Precursors +18.4%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-400 font-semibold">
            <ArrowUpRight className="h-4 w-4 shrink-0" />
            <span>Energy Isolation +31.2%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-green-500/10 p-2.5 text-green-700 dark:text-green-400 font-semibold">
            <ArrowDownRight className="h-4 w-4 shrink-0" />
            <span>Height Incidents -9.5%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 p-2.5 text-foreground col-span-2 sm:col-span-2">
            <span className="font-bold text-red-600 mr-1">Hotspot:</span>
            <span className="truncate">Duliajan Well Pad 4 · Maintenance + Live Hydrocarbon</span>
          </div>
        </div>
      </div>

      {/* SIF Precursor Trend Graph */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              SIF Precursor Trend Over Time
            </h2>
            <p className="text-xs text-muted-foreground">
              Total hazard observations vs. high-potential SIF precursors detected by AI
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">All Reports</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              <span className="font-bold text-foreground">SIF Precursors</span>
            </div>
          </div>
        </div>

        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sifColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderRadius: "12px",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Observations"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#totalColor)"
              />
              <Area
                type="monotone"
                dataKey="sif"
                name="SIF Precursors"
                stroke="#dc2626"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#sifColor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2x2 Risk Concentrations: Sites, Activities, Barriers, LSRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TOP RISK SITES */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              🔴 Top Risk Sites (% of Total SIF Density)
            </h2>
            <Link
              href="/precursors"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              Drilldown <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {data.topSites.map((site, idx) => (
              <div key={site.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {idx + 1}. {site.name}
                  </span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">
                    {site.pct}% ({site.sifCount} SIFs)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-600"
                    style={{ width: `${Math.min(100, site.pct * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP RISK ACTIVITIES */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" />
              🔴 Top Risk Activities (SIF Concentration)
            </h2>
            <Link
              href="/precursors"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              Explore <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {data.topActivities.map((act, idx) => (
              <div key={act.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {idx + 1}. {act.name}
                  </span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                    {act.pct}% ({act.sifCount} SIFs)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-600"
                    style={{ width: `${Math.min(100, act.pct * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAILED BARRIERS */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-red-600" />
              Failed &amp; Missing Safety Barriers
            </h2>
            <span className="text-xs text-muted-foreground">Most bypassed controls</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {data.failedBarriers.map((barrier) => (
              <div
                key={barrier.name}
                className="flex items-center justify-between rounded-xl border border-red-200/60 bg-red-50/40 dark:border-red-950 dark:bg-red-950/20 p-3"
              >
                <span className="text-xs font-semibold text-foreground truncate mr-2">
                  {barrier.name}
                </span>
                <span className="rounded-full bg-red-600 text-white px-2 py-0.5 text-xs font-black tabular-nums">
                  {barrier.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* LIFE-SAVING RULES */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Official IOGP Life-Saving Rules Touched
            </h2>
            <span className="text-xs text-muted-foreground">9-Rule Safety Framework</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {data.lsrDistribution.map((lsr) => (
              <div
                key={lsr.name}
                className="flex items-center justify-between rounded-xl border border-blue-200/60 bg-blue-50/40 dark:border-blue-950 dark:bg-blue-950/20 p-3"
              >
                <span className="text-xs font-semibold text-foreground truncate mr-2">
                  {lsr.name}
                </span>
                <span className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-xs font-black tabular-nums">
                  {lsr.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP RECURRING PRECURSORS (The Core SIH Outcome) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-600" />
              Top Recurring Precursor Patterns
            </h2>
            <p className="text-xs text-muted-foreground">
              Statistical clustering identifying repeat barrier breakdowns before a major catastrophe occurs
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/precursors"
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-xs"
            >
              Investigate in Drilldown →
            </Link>
            <Link
              href="/analytics"
              className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors"
            >
              View All Patterns
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.recurringPatterns.map((pattern, idx) => (
            <div
              key={pattern.id}
              className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-red-100 dark:bg-red-950 px-2.5 py-0.5 text-[10px] font-black text-red-700 dark:text-red-400 uppercase">
                  Pattern #{idx + 1}
                </span>
                <span className="text-xs font-bold text-red-600">{pattern.trend}</span>
              </div>

              <h3 className="font-bold text-sm text-foreground line-clamp-2">
                {pattern.title}
              </h3>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Activity: <strong className="text-foreground">{pattern.activity}</strong>
                </p>
                <p>
                  Failed Control: <strong className="text-red-600">{pattern.barrier}</strong>
                </p>
                <p>
                  Volume:{" "}
                  <strong className="text-foreground">
                    {pattern.count} reports ({pattern.sifCount} SIFs)
                  </strong>
                </p>
              </div>

              <Link
                href={`/precursors?activity=${encodeURIComponent(pattern.activity)}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-2 border-t border-border/60 w-full"
              >
                Inspect pattern reports <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* CAPA Action Closure Analytics (Item 16) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Corrective &amp; Preventive Action (CAPA) Closure SLA
            </h2>
            <p className="text-xs text-muted-foreground">
              Closing the safety loop: Detect → Understand → Act → Verify → Learn
            </p>
          </div>
          <Link
            href="/actions"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            Manage Actions <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-2xl font-bold tabular-nums text-foreground">{data.capaStats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Actions</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-2xl font-bold tabular-nums text-blue-600">{data.capaStats.open}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Open</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className={`text-2xl font-bold tabular-nums ${data.capaStats.overdue > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              {data.capaStats.overdue}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Overdue</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-2xl font-bold tabular-nums text-green-600">{data.capaStats.verified}</p>
            <p className="text-xs text-muted-foreground mt-0.5">HSE Verified</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-2xl font-bold tabular-nums text-foreground">{data.capaStats.slaRatePct}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Closed in SLA</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-2xl font-bold tabular-nums text-foreground">{data.capaStats.avgDaysToClose}d</p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg Closure Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
