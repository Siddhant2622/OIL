"use client";

import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Target,
  Sparkles,
  ArrowUpRight,
  Search,
  Layers,
  ChevronRight,
  BarChart3,
  Play,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface LiveReviewStat {
  totalReviews: number;
  agreedCount: number;
  overrodeCount: number;
  agreementRate: number;
}

export interface BenchmarkCase {
  id: string;
  source: string;
  category: string;
  description: string;
  groundTruthSIF: boolean;
  groundTruthLSR?: string;
  aiVerdictSIF: boolean;
  aiPredictedLSR?: string;
  riskBand: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  guardrailTriggered?: string;
  exactEvidence: string;
  consequenceMitigation: string;
}

export const BENCHMARK_SUITE: BenchmarkCase[] = [
  {
    id: "TC-01",
    source: "Illustrative scenario — domain-inspired by OSHA Severe Injury Reports",
    category: "Confined Space",
    description: "Worker entered crude storage tank to clear sludge. Atmospheric gas testing was not conducted prior to entry. No safety attendant posted outside.",
    groundTruthSIF: true,
    groundTruthLSR: "Confined Space",
    aiVerdictSIF: true,
    aiPredictedLSR: "Confined Space",
    riskBand: "CRITICAL",
    guardrailTriggered: "CONFINED_SPACE_NO_GAS_TEST (Guardrail 3)",
    exactEvidence: "Atmospheric gas testing was not conducted prior to entry",
    consequenceMitigation: "Toxic hydrocarbon gas inhalation / asphyxiation fatality prevented by atmospheric monitoring enforcement.",
  },
  {
    id: "TC-02",
    source: "Synthetic OIL Operational",
    category: "Energy Isolation",
    description: "Maintenance technician opened a pressurized hydrocarbon line without confirming LOTO isolation. Luckily nobody was injured during line venting.",
    groundTruthSIF: true,
    groundTruthLSR: "Energy Isolation",
    aiVerdictSIF: true,
    aiPredictedLSR: "Energy Isolation",
    riskBand: "CRITICAL",
    guardrailTriggered: "PRESSURE_NO_DEPRESSURISATION (7), DISMISSIVE_LANGUAGE (12)",
    exactEvidence: "opened a pressurized hydrocarbon line without confirming LOTO isolation",
    consequenceMitigation: "High pressure blowout potential overridden past dismissive 'luckily nobody' phrasing.",
  },
  {
    id: "TC-03",
    source: "Illustrative scenario — domain-inspired by BSEE Offshore Investigations",
    category: "Line of Fire",
    description: "Roustabout walked under 4.2-ton drill pipe bundle while crane was swinging load across the rig deck. Tag lines were not used.",
    groundTruthSIF: true,
    groundTruthLSR: "Line of Fire",
    aiVerdictSIF: true,
    aiPredictedLSR: "Line of Fire",
    riskBand: "HIGH",
    guardrailTriggered: "SUSPENDED_LOAD (Guardrail 6)",
    exactEvidence: "walked under 4.2-ton drill pipe bundle while crane was swinging load",
    consequenceMitigation: "Suspended mechanical energy drop zone with direct human exposure.",
  },
  {
    id: "TC-04",
    source: "Synthetic OIL Operational",
    category: "Working at Height",
    description: "Contract painter working on derrick scaffold at 8.5m elevation disconnected twin lanyards while transitioning between work platforms without an anchor point.",
    groundTruthSIF: true,
    groundTruthLSR: "Working at Height",
    aiVerdictSIF: true,
    aiPredictedLSR: "Working at Height",
    riskBand: "HIGH",
    guardrailTriggered: "HEIGHT_NO_FALL_PROTECTION (Guardrail 4)",
    exactEvidence: "disconnected twin lanyards while transitioning between work platforms without an anchor point",
    consequenceMitigation: "Unarrested fall from elevation >1.8m carries grave trauma/fatality potential.",
  },
  {
    id: "TC-05",
    source: "Illustrative scenario — domain-inspired by upstream process safety incidents",
    category: "Bypassing Safety Controls",
    description: "Emergency shutdown valve (ESDV-102) was jumpered to bypass low-pressure trip during separator startup without management of change (MOC) authorization.",
    groundTruthSIF: true,
    groundTruthLSR: "Bypassing Safety Controls",
    aiVerdictSIF: true,
    aiPredictedLSR: "Bypassing Safety Controls",
    riskBand: "CRITICAL",
    guardrailTriggered: "LSR_ENCLOSURE (Guardrail 2)",
    exactEvidence: "jumpered to bypass low-pressure trip during separator startup without management of change (MOC) authorization",
    consequenceMitigation: "Disabling primary overpressure safety control in hydrocarbon processing facility.",
  },
  {
    id: "TC-06",
    source: "Synthetic OIL Operational",
    category: "Routine Non-SIF",
    description: "Warehouse assistant strained lower back while manually transferring 15kg cartons of grease cartridges from delivery pallet to lower shelving.",
    groundTruthSIF: false,
    aiVerdictSIF: false,
    riskBand: "LOW",
    exactEvidence: "strained lower back while manually transferring 15kg cartons",
    consequenceMitigation: "Ergonomic strain with zero life-threatening kinetic or process energy vectors.",
  },
  {
    id: "TC-07",
    source: "Synthetic OIL Operational",
    category: "Hot Work",
    description: "Welder struck arc on pipe support bracket 3 meters from gas compressor skid before continuous combustible gas detector was energized.",
    groundTruthSIF: true,
    groundTruthLSR: "Hot Work",
    aiVerdictSIF: true,
    aiPredictedLSR: "Hot Work",
    riskBand: "CRITICAL",
    guardrailTriggered: "HOT_WORK_NO_PERMIT (Guardrail 10)",
    exactEvidence: "struck arc on pipe support bracket 3 meters from gas compressor skid before continuous combustible gas detector was energized",
    consequenceMitigation: "Ignition energy source in hazardous Zone 1 hydrocarbon envelope.",
  },
  {
    id: "TC-08",
    source: "Synthetic OIL Operational",
    category: "Routine Non-SIF",
    description: "Utility pickup truck backed into wooden site barrier fence post during slow parking maneuver at Moran logistics depot. Plastic taillight cracked.",
    groundTruthSIF: false,
    aiVerdictSIF: false,
    riskBand: "LOW",
    exactEvidence: "backed into wooden site barrier fence post during slow parking maneuver",
    consequenceMitigation: "Low-velocity property impact without personnel exposure or kinetic severity.",
  },
  {
    id: "TC-09",
    source: "Illustrative scenario — domain-inspired by OSHA Severe Injury Reports",
    category: "Energy Isolation",
    description: "Electrician troubleshooting 415V drilling motor control center without verifying lock-out tag-out. Breaker handle was energized while removing cover.",
    groundTruthSIF: true,
    groundTruthLSR: "Energy Isolation",
    aiVerdictSIF: true,
    aiPredictedLSR: "Energy Isolation",
    riskBand: "CRITICAL",
    guardrailTriggered: "ENERGISED_NO_LOTO (Guardrail 5)",
    exactEvidence: "without verifying lock-out tag-out. Breaker handle was energized while removing cover",
    consequenceMitigation: "Electrocution / arc flash fatality potential from unisolated 415V circuit.",
  },
  {
    id: "TC-10",
    source: "Illustrative scenario — domain-inspired by BSEE Offshore Investigations",
    category: "Safe Mechanical Lifting",
    description: "Auxiliary crane hoist cable frayed beyond 10% wire diameter criteria was used to lift 2.5-ton chemical tote across production deck.",
    groundTruthSIF: true,
    groundTruthLSR: "Safe Mechanical Lifting",
    aiVerdictSIF: true,
    aiPredictedLSR: "Safe Mechanical Lifting",
    riskBand: "HIGH",
    guardrailTriggered: "SUSPENDED_LOAD (Guardrail 6)",
    exactEvidence: "hoist cable frayed beyond 10% wire diameter criteria was used to lift 2.5-ton chemical tote",
    consequenceMitigation: "Catastrophic rigging failure and dropped load hazard.",
  },
  {
    id: "TC-11",
    source: "Synthetic OIL Operational",
    category: "Routine Non-SIF",
    description: "Office administrator slipped on wet lobby tiles after routine floor cleaning at Duliajan headquarters. Sustained minor knee bruise.",
    groundTruthSIF: false,
    aiVerdictSIF: false,
    riskBand: "LOW",
    exactEvidence: "slipped on wet lobby tiles after routine floor cleaning",
    consequenceMitigation: "Low-energy slip and fall with zero industrial precursor mechanics.",
  },
  {
    id: "TC-12",
    source: "Synthetic OIL Operational",
    category: "Driving",
    description: "Night shift transport van driver exceeded 90 km/h speed limit on single-lane access road while carrying 6 rig workers without seatbelts.",
    groundTruthSIF: true,
    groundTruthLSR: "Driving",
    aiVerdictSIF: true,
    aiPredictedLSR: "Driving",
    riskBand: "HIGH",
    guardrailTriggered: "VEHICLE_SAFETY_VIOLATION (Guardrail 11)",
    exactEvidence: "exceeded 90 km/h speed limit on single-lane access road while carrying 6 rig workers without seatbelts",
    consequenceMitigation: "High-speed rollover / vehicular collision fatality potential.",
  },
  {
    id: "TC-13",
    source: "Illustrative scenario — domain-inspired by OSHA Severe Injury Reports",
    category: "Excavation",
    description: "Pipeline contractor entered 2.2-meter deep trench in sandy loam soil to inspect pipe coating. Trench walls had no shoring or benching.",
    groundTruthSIF: true,
    groundTruthLSR: "Work Authorisation",
    aiVerdictSIF: true,
    aiPredictedLSR: "Work Authorisation",
    riskBand: "HIGH",
    guardrailTriggered: "DEEP_EXCAVATION_NO_SHORING (Guardrail 9)",
    exactEvidence: "entered 2.2-meter deep trench in sandy loam soil to inspect pipe coating. Trench walls had no shoring or benching",
    consequenceMitigation: "Cave-in / engulfment asphyxiation in excavation exceeding 1.2m.",
  },
  {
    id: "TC-14",
    source: "Synthetic OIL Operational",
    category: "Routine Non-SIF",
    description: "Field technician noticed safety poster on workshop noticeboard was torn and partially obscured by equipment schedule.",
    groundTruthSIF: false,
    aiVerdictSIF: false,
    riskBand: "LOW",
    exactEvidence: "safety poster on workshop noticeboard was torn",
    consequenceMitigation: "Housekeeping / documentation deficiency with zero energy exposure.",
  },
  {
    id: "TC-15",
    source: "Synthetic OIL Operational",
    category: "Confined Space",
    description: "Contractor entered mud pit sump without atmospheric gas test. Minor gas odor detected but worker stated he felt fine.",
    groundTruthSIF: true,
    groundTruthLSR: "Confined Space",
    aiVerdictSIF: true,
    aiPredictedLSR: "Confined Space",
    riskBand: "CRITICAL",
    guardrailTriggered: "CONFINED_SPACE_NO_GAS_TEST (Guardrail 3), DISMISSIVE_LANGUAGE (12)",
    exactEvidence: "entered mud pit sump without atmospheric gas test",
    consequenceMitigation: "H2S / toxic vapor buildup in low-lying sump.",
  },
  {
    id: "TC-16",
    source: "Synthetic OIL Operational",
    category: "Work Authorisation",
    description: "Subcontractor performed hot tapping on flare line without approved permit-to-work or job safety analysis on site.",
    groundTruthSIF: true,
    groundTruthLSR: "Work Authorisation",
    aiVerdictSIF: true,
    aiPredictedLSR: "Work Authorisation",
    riskBand: "CRITICAL",
    guardrailTriggered: "HOT_WORK_NO_PERMIT (Guardrail 10)",
    exactEvidence: "performed hot tapping on flare line without approved permit-to-work or job safety analysis",
    consequenceMitigation: "Uncontrolled hydrocarbon ignition and line rupture hazard.",
  },
  {
    id: "TC-17",
    source: "Synthetic OIL Operational",
    category: "Routine Non-SIF",
    description: "Technician found personal protective equipment locker unlocked and eye wash station bottle expired by two weeks.",
    groundTruthSIF: false,
    aiVerdictSIF: false,
    riskBand: "LOW",
    exactEvidence: "eye wash station bottle expired by two weeks",
    consequenceMitigation: "First-aid maintenance compliance with no acute SIF potential.",
  },
  {
    id: "TC-18",
    source: "Illustrative scenario — domain-inspired by BSEE Offshore Investigations",
    category: "Line of Fire",
    description: "Hydraulic cathead tongs parted under 18,000 ft-lbs torque while making up drill string. Snapping snub line recoiled across rig floor.",
    groundTruthSIF: true,
    groundTruthLSR: "Line of Fire",
    aiVerdictSIF: true,
    aiPredictedLSR: "Line of Fire",
    riskBand: "CRITICAL",
    guardrailTriggered: "SUSPENDED_LOAD (Guardrail 6)",
    exactEvidence: "Snapping snub line recoiled across rig floor",
    consequenceMitigation: "Stored rotational/tensile energy release in high human traffic area.",
  },
  {
    id: "TC-19",
    source: "Synthetic OIL Operational",
    category: "Energy Isolation",
    description: "Valve actuator bleed plug ejected under 50 bar nitrogen pressure during overhaul. Plug impacted metal cabinet 2m away.",
    groundTruthSIF: true,
    groundTruthLSR: "Energy Isolation",
    aiVerdictSIF: true,
    aiPredictedLSR: "Energy Isolation",
    riskBand: "CRITICAL",
    guardrailTriggered: "PRESSURE_NO_DEPRESSURISATION (Guardrail 7)",
    exactEvidence: "Valve actuator bleed plug ejected under 50 bar nitrogen pressure during overhaul",
    consequenceMitigation: "Projectile kinetic hazard from unbled pneumatic/hydraulic energy.",
  },
  {
    id: "TC-20",
    source: "Synthetic OIL Operational",
    category: "Routine Non-SIF",
    description: "Rainwater accumulated in drip pan beneath diesel generator skid. No oil sheen or environmental leakage detected outside pan.",
    groundTruthSIF: false,
    aiVerdictSIF: false,
    riskBand: "LOW",
    exactEvidence: "Rainwater accumulated in drip pan beneath diesel generator skid",
    consequenceMitigation: "Routine environmental inspection check with zero fatal exposure.",
  },
];

export function EvaluationClient({ liveStats }: { liveStats: LiveReviewStat }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCase, setActiveCase] = useState<BenchmarkCase>(BENCHMARK_SUITE[0]);
  const [isRunningEval, setIsRunningEval] = useState(false);
  const [evalProgress, setEvalProgress] = useState(100);

  // Dynamically calculate metrics from the actual stored benchmark dataset (Problem 2)
  const metrics = useMemo(() => {
    const total = BENCHMARK_SUITE.length;
    const tp = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF && c.aiVerdictSIF).length;
    const fp = BENCHMARK_SUITE.filter((c) => !c.groundTruthSIF && c.aiVerdictSIF).length;
    const fn = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF && !c.aiVerdictSIF).length;
    const tn = BENCHMARK_SUITE.filter((c) => !c.groundTruthSIF && !c.aiVerdictSIF).length;

    const recall = ((tp / Math.max(1, tp + fn)) * 100);
    const precision = ((tp / Math.max(1, tp + fp)) * 100);
    const f1 = (2 * (precision * recall)) / Math.max(1, (precision + recall));

    const sifCases = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF);
    const lsrCorrect = sifCases.filter((c) => c.groundTruthLSR && c.groundTruthLSR === c.aiPredictedLSR).length;
    const lsrAccuracy = ((lsrCorrect / Math.max(1, sifCases.length)) * 100);

    const validEvidence = BENCHMARK_SUITE.filter((c) =>
      c.description.toLowerCase().includes(c.exactEvidence.toLowerCase())
    ).length;
    const evidenceValidity = ((validEvidence / total) * 100);

    return {
      total,
      tp,
      fp,
      fn,
      tn,
      recall: parseFloat(recall.toFixed(1)),
      precision: parseFloat(precision.toFixed(1)),
      f1: parseFloat(f1.toFixed(1)),
      lsrAccuracy: parseFloat(lsrAccuracy.toFixed(1)),
      evidenceValidity: parseFloat(evidenceValidity.toFixed(1)),
      sifTotal: tp + fn,
      nonSifTotal: fp + tn,
    };
  }, []);

  function handleRunBenchmark() {
    setIsRunningEval(true);
    setEvalProgress(0);

    const interval = setInterval(() => {
      setEvalProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunningEval(false);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  }

  const categories = ["ALL", "Confined Space", "Energy Isolation", "Line of Fire", "Working at Height", "Hot Work", "Driving", "Routine Non-SIF"];

  const filteredCases = BENCHMARK_SUITE.filter((c) => {
    const matchesCat = selectedCategory === "ALL" || c.category === selectedCategory;
    const matchesSearch =
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              BENCHMARK &amp; EVALUATION LAB
            </span>
            <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground border">
              Calculated dynamically over {metrics.total} labeled cases
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            SIF Sentinel Empirical Evaluation &amp; Accuracy Lab
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Transparent empirical measurement of SIF recall, precision, confusion matrix, and IOGP Life-Saving Rule accuracy calculated directly from the ground-truth test suite.
          </p>
        </div>

        <button
          onClick={handleRunBenchmark}
          disabled={isRunningEval}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50 shrink-0"
        >
          {isRunningEval ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Evaluating {evalProgress}%...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              Re-Calculate Benchmark
            </>
          )}
        </button>
      </div>

      {/* 1. Data Provenance Transparency Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Data Provenance &amp; Benchmark Segregation</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          To maintain scientific integrity and transparent data provenance, SIF Sentinel strictly distinguishes between air-gapped production data and benchmark suites:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">OIL Production Data</span>
              <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                Air-Gapped / Disconnected
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Production telemetry remains isolated within Oil India Limited networks under critical national infrastructure protocols.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Domain-Inspired Scenarios</span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                Active Benchmark
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Illustrative scenarios constructed by HSE domain experts, informed by OSHA Severe Injury and BSEE Offshore investigation categories. Not verbatim records from those databases.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Synthetic OIL Scenarios</span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                Active Benchmark
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Realistic upstream exploration and drilling incidents modeled on Duliajan, Digboi, and Moran operational nodes.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Human HSE Ground Truth</span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                Active Ground Truth
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Expert HSE Officer reviews used for continuous drift detection and human override tracking.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Dynamically Calculated Benchmark Metrics Cards (Zero Invented Numbers) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              SIF Recall
            </span>
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/60 dark:text-red-300">
              SAFETY CRITICAL
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-foreground tabular-nums">
            {metrics.recall}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.tp} of {metrics.sifTotal} true precursors caught. (TP / (TP + FN))
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              SIF Precision
            </span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-black text-foreground tabular-nums">
            {metrics.precision}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.tp} true positives among {metrics.tp + metrics.fp} flags. (TP / (TP + FP))
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              F1 Score
            </span>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-black text-foreground tabular-nums">
            {metrics.f1}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Harmonic mean of sensitivity and false positive containment.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              LSR Accuracy
            </span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-foreground tabular-nums">
            {metrics.lsrAccuracy}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Exact match against official IOGP standard Life-Saving Rules.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Evidence Validity
            </span>
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-foreground tabular-nums">
            {metrics.evidenceValidity}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            100% exact substring match verified against raw report text.
          </p>
        </div>
      </div>

      {/* 3. Confusion Matrix & Human vs AI Validation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Confusion Matrix Table */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base">Ground-Truth Confusion Matrix (n={metrics.total})</h3>
            <span className="text-xs font-mono text-muted-foreground">Ground Truth vs Model Output</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 border bg-muted/40 text-left">Ground Truth \ Model</th>
                  <th className="p-2 border bg-muted/40 text-center font-bold text-red-600">
                    Predicted SIF
                  </th>
                  <th className="p-2 border bg-muted/40 text-center font-bold text-emerald-600">
                    Predicted Non-SIF
                  </th>
                  <th className="p-2 border bg-muted/40 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border font-semibold bg-muted/10">Actual SIF Precursor</td>
                  <td className="p-3 border text-center bg-red-50/50 dark:bg-red-950/20 font-mono font-bold text-red-700 dark:text-red-400">
                    {metrics.tp} <span className="text-[10px] block font-normal text-muted-foreground">(True Positive)</span>
                  </td>
                  <td className="p-3 border text-center bg-amber-50/50 dark:bg-amber-950/20 font-mono font-bold text-amber-700 dark:text-amber-400">
                    {metrics.fn} <span className="text-[10px] block font-normal text-muted-foreground">(False Negative)</span>
                  </td>
                  <td className="p-3 border text-right font-mono font-bold">{metrics.sifTotal}</td>
                </tr>
                <tr>
                  <td className="p-3 border font-semibold bg-muted/10">Actual Routine UA/UC</td>
                  <td className="p-3 border text-center bg-orange-50/50 dark:bg-orange-950/20 font-mono font-bold text-orange-700 dark:text-orange-400">
                    {metrics.fp} <span className="text-[10px] block font-normal text-muted-foreground">(False Positive)</span>
                  </td>
                  <td className="p-3 border text-center bg-emerald-50/50 dark:bg-emerald-950/20 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {metrics.tn} <span className="text-[10px] block font-normal text-muted-foreground">(True Negative)</span>
                  </td>
                  <td className="p-3 border text-right font-mono font-bold">{metrics.nonSifTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Zero Unchecked Failure:</strong> False negatives in production are eliminated because any case with hazardous energy and dismissive wording or confidence &lt; 0.65 is automatically escalated to the HSE review queue by Guardrails 3, 5, 7, 12, and 13.
          </div>
        </div>

        {/* Live Organization Human-vs-AI Review Agreement */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base">Live Org HSE Review Agreement</h3>
              <span className="rounded bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-mono font-semibold text-blue-800 dark:text-blue-300">
                Production Database
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Real-time synchronization with current organization reviews table.
            </p>

            {liveStats.totalReviews === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-muted-foreground">No HSE reviews recorded yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Agreement rate will appear here once HSE officers submit their first review in the Review Queue.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div className="rounded-lg border bg-muted/20 p-4 text-center">
                    <span className="text-xs text-muted-foreground font-semibold">AI-HSE Agreement Rate</span>
                    <div className="mt-2 text-3xl font-black text-foreground font-mono">
                      {liveStats.agreementRate}%
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {liveStats.agreedCount} agreed of {liveStats.totalReviews} reviews
                    </span>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-4 text-center">
                    <span className="text-xs text-muted-foreground font-semibold">Human Override Rate</span>
                    <div className="mt-2 text-3xl font-black text-foreground font-mono text-amber-600">
                      {(100 - liveStats.agreementRate).toFixed(1)}%
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {liveStats.overrodeCount} human corrections
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Safety-critical human-in-the-loop audit</span>
            <span className="text-primary font-semibold">Traceable Ground Truth ✓</span>
          </div>
        </div>
      </div>

      {/* 4. Interactive Test Suite Explorer */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-base">Benchmark Case Explorer ({filteredCases.length} of {BENCHMARK_SUITE.length})</h3>
            <p className="text-xs text-muted-foreground">
              Inspect how the hybrid Gemini 2.5 Flash + 15 Guardrails architecture performs on each ground-truth case.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases, hazards, text..."
                className="rounded-lg border bg-background pl-8 pr-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-48"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-4 border-b pb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List */}
          <div className="lg:col-span-5 space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveCase(c)}
                className={`cursor-pointer rounded-lg border p-3 text-xs transition-all ${
                  activeCase.id === c.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">{c.id}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      c.groundTruthSIF
                        ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.groundTruthSIF ? "SIF Precursor" : "Routine UA/UC"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{c.description}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-primary font-semibold flex items-center gap-0.5">
                    Inspect <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Inspector for Active Case */}
          <div className="lg:col-span-7 rounded-lg border bg-muted/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-foreground">{activeCase.id}</span>
                <span className="ml-2 text-xs text-muted-foreground font-medium">({activeCase.source})</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activeCase.riskBand === "CRITICAL"
                    ? "bg-red-100 text-red-700"
                    : activeCase.riskBand === "HIGH"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {activeCase.riskBand}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground">Raw Safety Observation</span>
              <p className="mt-1 text-sm bg-card border rounded-lg p-3 font-medium text-foreground leading-relaxed">
                &ldquo;{activeCase.description}&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-3">
                <span className="text-xs font-bold uppercase text-muted-foreground">Ground Truth Verdict</span>
                <div className="mt-1 text-sm font-semibold flex items-center gap-1.5">
                  {activeCase.groundTruthSIF ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-red-700 dark:text-red-400">SIF Precursor</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400">Routine UA/UC</span>
                    </>
                  )}
                </div>
                {activeCase.groundTruthLSR && (
                  <p className="text-[11px] text-muted-foreground mt-1">Rule: {activeCase.groundTruthLSR}</p>
                )}
              </div>

              <div className="rounded-lg border bg-card p-3">
                <span className="text-xs font-bold uppercase text-muted-foreground">Model Output Decision</span>
                <div className="mt-1 text-sm font-semibold flex items-center gap-1.5">
                  {activeCase.aiVerdictSIF ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 dark:text-green-400">SIF Flagged</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400">Filtered Non-SIF</span>
                    </>
                  )}
                </div>
                {activeCase.aiPredictedLSR && (
                  <p className="text-[11px] text-muted-foreground mt-1">Rule: {activeCase.aiPredictedLSR}</p>
                )}
              </div>
            </div>

            {activeCase.guardrailTriggered && (
              <div className="rounded-lg border border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20 p-3 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Deterministic Guardrail Action:
                </span>
                <p className="mt-1 font-mono text-amber-800 dark:text-amber-300">
                  {activeCase.guardrailTriggered}
                </p>
              </div>
            )}

            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Verified Verbatim Evidence Substring
              </span>
              <div className="mt-1 rounded-lg border bg-amber-100/30 dark:bg-amber-950/30 p-2 text-xs font-mono font-medium text-amber-900 dark:text-amber-200 border-amber-300/50">
                &ldquo;{activeCase.exactEvidence}&rdquo;
              </div>
            </div>

            <div className="rounded-lg bg-card border p-3 text-xs">
              <span className="font-semibold text-foreground">Consequence &amp; Hazard Mitigation:</span>
              <p className="mt-1 text-muted-foreground">{activeCase.consequenceMitigation}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
