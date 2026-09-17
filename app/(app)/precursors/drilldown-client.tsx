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
  Database,
  Sparkles,
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
  isDemo?: boolean;
}

interface Props {
  liveReports: DrilldownReport[];
  demoReports: DrilldownReport[];
}

export function PrecursorDrilldownClient({ liveReports, demoReports }: Props) {
  const searchParams = useSearchParams();
  const initialActivity = searchParams.get("activity") || "";
  const initialSite = searchParams.get("site") || "";

  const [dataMode, setDataMode] = useState<"live" | "demo">("live");
  const [selectedSite, setSelectedSite] = useState<string>(initialSite);
  const [selectedActivity, setSelectedActivity] = useState<string>(initialActivity);
  const [selectedBarrier, setSelectedBarrier] = useState<string>("");
  const [selectedEnergy, setSelectedEnergy] = useState<string>("");
  const [sifOnly, setSifOnly] = useState(false);

  const activeReports = dataMode === "live" ? liveReports : demoReports;

  // Extract dimensions dynamically from the currently active dataset
  const sites = useMemo(() => Array.from(new Set(activeReports.map((r) => r.site))).sort(), [activeReports]);
  const activities = useMemo(() => Array.from(new Set(activeReports.map((r) => r.activity))).sort(), [activeReports]);
  const barriers = useMemo(() => Array.from(new Set(activeReports.map((r) => r.barrier))).sort(), [activeReports]);
  const energies = useMemo(() => Array.from(new Set(activeReports.map((r) => r.energy))).sort(), [activeReports]);

  // Filtered reports
  const filtered = useMemo(() => {
    return activeReports.filter((r) => {
      if (selectedSite && r.site !== selectedSite) return false;
      if (selectedActivity && r.activity !== selectedActivity) return false;
      if (selectedBarrier && !r.barrier.toLowerCase().includes(selectedBarrier.toLowerCase())) return false;
      if (selectedEnergy && !r.energy.toLowerCase().includes(selectedEnergy.toLowerCase())) return false;
      if (sifOnly && !r.sif_potential) return false;
      return true;
    });
  }, [activeReports, selectedSite, selectedActivity, selectedBarrier, selectedEnergy, sifOnly]);

  function resetFilters() {
    setSelectedSite("");
    setSelectedActivity("");
    setSelectedBarrier("");
    setSelectedEnergy("");
    setSifOnly(false);
  }

  const activeFilterCount =
    (selectedSite ? 1 : 0) +
    (selectedActivity ? 1 : 0) +
    (selectedBarrier ? 1 : 0) +
    (selectedEnergy ? 1 : 0) +
    (sifOnly ? 1 : 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Header & Mode Switcher (Problem 6) ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              4D PRECURSOR INTELLIGENCE
            </span>
            <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground border">
              Site → Activity → Barrier → Energy
            </span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Systemic Failure &amp; Precursor Drill-Down
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identify where fatal potential concentrates across operational nodes instead of viewing isolated incidents.
          </p>
        </div>

        {/* Unmistakable Data Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
            <button
              onClick={() => {
                setDataMode("live");
                resetFilters();
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                dataMode === "live"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dataMode === "live" ? "bg-white" : "bg-emerald-500"}`} />
              Live Company Data ({liveReports.length})
            </button>
            <button
              onClick={() => {
                setDataMode("demo");
                resetFilters();
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                dataMode === "demo"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dataMode === "demo" ? "bg-white" : "bg-amber-400"}`} />
              Demonstration Dataset ({demoReports.length})
            </button>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Mode State Notice */}
      {dataMode === "live" ? (
        liveReports.length === 0 ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-950 dark:text-blue-200">
                  Live Organization Data Connected · 0 Precursor Reports Logged
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  No precursor records found in the live company database yet. Switch to the Demonstration Dataset to explore the 4D drill-down across simulated upstream scenarios.
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
                View Demonstration Cases
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-emerald-950 dark:text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong>LIVE COMPANY DATA ACTIVE:</strong> Filtering across {liveReports.length} real reports stored in Supabase.
            </div>
            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">Zero Injected Records</span>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30 flex items-center gap-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="text-amber-950 dark:text-amber-200">
            <strong>DEMONSTRATION DATASET (6 Curated Cases):</strong> Showing representative upstream oil &amp; gas cases (Duliajan, Digboi, Moran) to illustrate 4D drill-down interactions.
          </div>
        </div>
      )}

      {/* ── 4-Dimensional Drilldown Selector Pills ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Dimension 1: Site / Asset */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs border-b pb-2">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <MapPin className="h-3.5 w-3.5 text-red-500" />
              1. Site / Asset Node
            </span>
            {selectedSite && (
              <button
                onClick={() => setSelectedSite("")}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {sites.map((site) => (
              <button
                key={site}
                onClick={() => setSelectedSite(selectedSite === site ? "" : site)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  selectedSite === site
                    ? "bg-red-600 text-white font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {site}
              </button>
            ))}
            {sites.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No sites available</p>
            )}
          </div>
        </div>

        {/* Dimension 2: Activity */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs border-b pb-2">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <Activity className="h-3.5 w-3.5 text-orange-500" />
              2. Operational Activity
            </span>
            {selectedActivity && (
              <button
                onClick={() => setSelectedActivity("")}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {activities.map((act) => (
              <button
                key={act}
                onClick={() => setSelectedActivity(selectedActivity === act ? "" : act)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  selectedActivity === act
                    ? "bg-orange-600 text-white font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {act}
              </button>
            ))}
            {activities.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No activities available</p>
            )}
          </div>
        </div>

        {/* Dimension 3: Barrier */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs border-b pb-2">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <ShieldX className="h-3.5 w-3.5 text-blue-500" />
              3. Failed Barrier
            </span>
            {selectedBarrier && (
              <button
                onClick={() => setSelectedBarrier("")}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {barriers.map((bar) => (
              <button
                key={bar}
                onClick={() => setSelectedBarrier(selectedBarrier === bar ? "" : bar)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  selectedBarrier === bar
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {bar}
              </button>
            ))}
            {barriers.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No barriers available</p>
            )}
          </div>
        </div>

        {/* Dimension 4: Hazardous Energy */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs border-b pb-2">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              4. Hazardous Energy
            </span>
            {selectedEnergy && (
              <button
                onClick={() => setSelectedEnergy("")}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {energies.map((eng) => (
              <button
                key={eng}
                onClick={() => setSelectedEnergy(selectedEnergy === eng ? "" : eng)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  selectedEnergy === eng
                    ? "bg-yellow-600 text-white font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {eng}
              </button>
            ))}
            {energies.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No energies available</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Active Drill-down Vector Path ── */}
      <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-muted-foreground uppercase">Path:</span>
          <span className="rounded bg-muted px-2 py-1 font-mono font-bold text-foreground">
            {selectedSite || "All Sites"}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="rounded bg-muted px-2 py-1 font-mono font-bold text-foreground">
            {selectedActivity || "All Activities"}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="rounded bg-muted px-2 py-1 font-mono font-bold text-foreground">
            {selectedBarrier || "All Barriers"}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="rounded bg-muted px-2 py-1 font-mono font-bold text-foreground">
            {selectedEnergy || "All Energy Sources"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none font-semibold">
            <input
              type="checkbox"
              checked={sifOnly}
              onChange={(e) => setSifOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-red-700 dark:text-red-400">SIF Precursors Only</span>
          </label>

          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-bold font-mono text-primary">
            {filtered.length} Matching Reports
          </span>
        </div>
      </div>

      {/* ── Drill-down Matching Reports List ── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h3 className="font-bold text-base">Filtered Observation Reports ({filtered.length})</h3>
            <p className="text-xs text-muted-foreground">
              Direct evidence and narrative context for selected operational hazard vector.
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Source: {dataMode === "live" ? "Live Database" : "Demonstration Asset Model"}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((report) => (
              <div
                key={report.id}
                className="rounded-lg border bg-muted/20 p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {report.report_code}
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {report.site}
                    </span>
                    <span className="rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 text-[10px] font-medium">
                      {report.activity}
                    </span>
                    {report.isDemo && (
                      <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.2 text-[9px] font-bold">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {report.sif_potential && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                        SIF PRECURSOR
                      </span>
                    )}
                    <RiskBadge band={report.risk_band} size="sm" />
                    {report.id.startsWith("demo-") ? (
                      <span className="text-[11px] text-muted-foreground">Simulated Case</span>
                    ) : (
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-muted-foreground hover:text-foreground"
                        title="View Full Report"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-sm text-foreground leading-relaxed">
                  {report.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <ShieldX className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      <strong>Barrier:</strong> {report.barrier} ({report.barrier_status})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" />
                    <span>
                      <strong>Energy:</strong> {report.energy}
                    </span>
                  </div>
                  <span className="ml-auto font-mono text-[11px]">
                    {formatDateTime(report.occurred_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No reports match the current 4D drill-down filters ({selectedSite || "Any Site"} / {selectedActivity || "Any Activity"} / {selectedBarrier || "Any Barrier"} / {selectedEnergy || "Any Energy"}).
            <div className="mt-3">
              <button
                onClick={resetFilters}
                className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
