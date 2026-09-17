"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MapPin,
  Activity,
  ShieldX,
  Zap,
  Filter,
  ArrowRight,
  Flame,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { RiskBadge } from "@/components/ui-components";
import { formatDateTime } from "@/lib/utils";

export interface DrilldownReport {
  id: string;
  report_code: string;
  report_type: string;
  site: string;
  activity: string;
  barrier: string;
  barrier_status: string;
  energy: string;
  risk_band: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  sif_potential: boolean;
  description: string;
  occurred_at: string;
}

interface Props {
  reports: DrilldownReport[];
  sites: string[];
  activities: string[];
  barriers: string[];
  energies: string[];
}

export function PrecursorDrilldownClient({
  reports,
  sites,
  activities,
  barriers,
  energies,
}: Props) {
  const searchParams = useSearchParams();
  const initialActivity = searchParams.get("activity") || "";
  const initialSite = searchParams.get("site") || "";

  const [selectedSite, setSelectedSite] = useState<string>(initialSite);
  const [selectedActivity, setSelectedActivity] = useState<string>(initialActivity);
  const [selectedBarrier, setSelectedBarrier] = useState<string>("");
  const [selectedEnergy, setSelectedEnergy] = useState<string>("");
  const [sifOnly, setSifOnly] = useState(false);

  // Filtered reports
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (selectedSite && r.site !== selectedSite) return false;
      if (selectedActivity && r.activity !== selectedActivity) return false;
      if (selectedBarrier && !r.barrier.toLowerCase().includes(selectedBarrier.toLowerCase())) return false;
      if (selectedEnergy && !r.energy.toLowerCase().includes(selectedEnergy.toLowerCase())) return false;
      if (sifOnly && !r.sif_potential) return false;
      return true;
    });
  }, [reports, selectedSite, selectedActivity, selectedBarrier, selectedEnergy, sifOnly]);

  const sifCount = filtered.filter((r) => r.sif_potential).length;
  const criticalCount = filtered.filter((r) => r.risk_band === "CRITICAL").length;
  const highCount = filtered.filter((r) => r.risk_band === "HIGH").length;

  function resetFilters() {
    setSelectedSite("");
    setSelectedActivity("");
    setSelectedBarrier("");
    setSelectedEnergy("");
    setSifOnly(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Precursor Intelligence &amp; Multi-Dimensional Drilldown
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Pinpoint exact operational breakdowns across: <strong>Site → Activity → Barrier Failure → Energy Source</strong>.
          </p>
        </div>

        {(selectedSite || selectedActivity || selectedBarrier || selectedEnergy || sifOnly) && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted text-foreground transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      {/* 4-Dimension Drilldown Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Location / Site */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-red-500" />
            1. Site / Facility
          </label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-semibold outline-none focus:border-primary"
          >
            <option value="">All Operational Sites ({sites.length})</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Activity */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-orange-500" />
            2. Activity
          </label>
          <select
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-semibold outline-none focus:border-primary"
          >
            <option value="">All Activities ({activities.length})</option>
            {activities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Barrier Failure */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ShieldX className="h-3.5 w-3.5 text-red-600" />
            3. Barrier Failure
          </label>
          <select
            value={selectedBarrier}
            onChange={(e) => setSelectedBarrier(e.target.value)}
            className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-semibold outline-none focus:border-primary"
          >
            <option value="">All Barriers ({barriers.length})</option>
            {barriers.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Energy Source */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            4. Hazard Energy
          </label>
          <select
            value={selectedEnergy}
            onChange={(e) => setSelectedEnergy(e.target.value)}
            className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-semibold outline-none focus:border-primary"
          >
            <option value="">All Energy Sources ({energies.length})</option>
            {energies.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Drilldown Path & Stats */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Active Intelligence Path</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
            <span>{selectedSite || "All Sites"}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{selectedActivity || "All Activities"}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={selectedBarrier ? "text-red-600" : ""}>
              {selectedBarrier || "All Barriers"}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={selectedEnergy ? "text-amber-600" : ""}>
              {selectedEnergy || "All Energies"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold shrink-0">
          <div className="text-center">
            <p className="text-xl font-black text-foreground tabular-nums">{filtered.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Matching Reports</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-red-600 tabular-nums">{sifCount}</p>
            <p className="text-[10px] text-red-600 uppercase">SIF Precursors</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-red-700 tabular-nums">{criticalCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Critical</p>
          </div>
          <button
            onClick={() => setSifOnly(!sifOnly)}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              sifOnly
                ? "bg-red-600 text-white"
                : "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/40"
            }`}
          >
            {sifOnly ? "Showing SIF Only" : "Filter SIF Precursors"}
          </button>
        </div>
      </div>

      {/* Filtered Reports Grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-semibold text-foreground">No reports match this exact 4-dimension path</p>
            <p className="mt-1 text-xs">Try broadening your site, activity, or barrier selection.</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border p-4 sm:p-5 transition-all hover:border-primary/40 bg-card space-y-3 ${
                r.sif_potential
                  ? "border-red-200/80 dark:border-red-950 shadow-xs"
                  : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {r.report_code}
                  </span>
                  <RiskBadge band={r.risk_band} size="sm" />
                  {r.sif_potential && (
                    <span className="rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                      SIF Potential
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(r.occurred_at)}
                  </span>
                </div>

                <Link
                  href={`/reports/${r.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  View Details <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Narrative */}
              <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                {r.description}
              </p>

              {/* 4 Dimension Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60 text-xs">
                <span className="rounded-lg bg-muted px-2 py-1 font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {r.site}
                </span>
                <span className="rounded-lg bg-muted px-2 py-1 font-semibold text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> {r.activity}
                </span>
                <span className="rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 px-2 py-1 font-semibold flex items-center gap-1">
                  <ShieldX className="h-3 w-3" /> Barrier: {r.barrier} ({r.barrier_status})
                </span>
                <span className="rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 font-semibold flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Energy: {r.energy}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
