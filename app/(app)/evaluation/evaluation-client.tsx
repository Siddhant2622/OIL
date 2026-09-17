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

import { BenchmarkCase, BENCHMARK_SUITE } from "@/lib/ai/benchmark-suite";

interface InferredCaseResult {
  id: string;
  aiVerdictSIF: boolean;
  aiPredictedLSR: string | null;
  riskBand: string;
  guardrailsTriggered: string[];
  evidence_spans: string[];
  confidence: number;
  latency_ms: number;
  error?: string;
}

export function EvaluationClient({ liveStats }: { liveStats: LiveReviewStat }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCase, setActiveCase] = useState<BenchmarkCase>(BENCHMARK_SUITE[0]);
  const [isRunningEval, setIsRunningEval] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalStatus, setEvalStatus] = useState<"IDLE" | "COMPLETED" | "INCOMPLETE" | "ERROR">("IDLE");
  // Map of case id -> live Gemini inference result
  const [inferredResults, setInferredResults] = useState<Map<string, InferredCaseResult> | null>(null);
  const evalHasRun = evalStatus === "COMPLETED" && inferredResults !== null;

  // Compute metrics - strictly separate live empirical measurements from static fixtures
  const metrics = useMemo(() => {
    const total = BENCHMARK_SUITE.length;

    if (evalStatus === "INCOMPLETE") {
      // Incomplete evaluation: NEVER silently substitute static fixture predictions
      return null;
    }

    const isLive = evalStatus === "COMPLETED" && inferredResults !== null && inferredResults.size === total;

    // In live mode, get verdict strictly from live inference; in idle mode, show baseline expectations
    const getVerdictSIF = (c: BenchmarkCase): boolean => {
      if (isLive) {
        return inferredResults.get(c.id)!.aiVerdictSIF;
      }
      return c.aiVerdictSIF;
    };

    const getPredictedLSR = (c: BenchmarkCase): string | null => {
      if (isLive) {
        return inferredResults.get(c.id)!.aiPredictedLSR;
      }
      return c.aiPredictedLSR ?? null;
    };

    const tp = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF && getVerdictSIF(c)).length;
    const fp = BENCHMARK_SUITE.filter((c) => !c.groundTruthSIF && getVerdictSIF(c)).length;
    const fn = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF && !getVerdictSIF(c)).length;
    const tn = BENCHMARK_SUITE.filter((c) => !c.groundTruthSIF && !getVerdictSIF(c)).length;

    const recall = (tp / Math.max(1, tp + fn)) * 100;
    const precision = (tp / Math.max(1, tp + fp)) * 100;
    const f1 = (2 * (precision * recall)) / Math.max(1, precision + recall);

    const sifCases = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF);
    const lsrCorrect = sifCases.filter(
      (c) => c.groundTruthLSR && c.groundTruthLSR === getPredictedLSR(c)
    ).length;
    const lsrAccuracy = (lsrCorrect / Math.max(1, sifCases.length)) * 100;

    // Evidence Validity:
    // In live mode, evaluate the actual evidence spans returned by Gemini/Guardrails pipeline
    // using exact case-sensitive verbatim match (aligns with Guardrail 1 desc.includes(span))
    let evidenceValidity = 0;
    if (isLive) {
      const validCases = BENCHMARK_SUITE.filter((c) => {
        const live = inferredResults.get(c.id);
        if (!live) return false;
        const spans = live.evidence_spans || [];
        if (c.groundTruthSIF) {
          return (
            spans.length > 0 &&
            spans.every((s) => s.trim().length > 0 && c.description.includes(s))
          );
        } else {
          return spans.every((s) => c.description.includes(s));
        }
      }).length;
      evidenceValidity = (validCases / total) * 100;
    } else {
      const validEvidence = BENCHMARK_SUITE.filter((c) =>
        c.description.includes(c.exactEvidence)
      ).length;
      evidenceValidity = (validEvidence / total) * 100;
    }

    return {
      isLive,
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
  }, [inferredResults, evalStatus]);

  async function handleRunBenchmark() {
    setIsRunningEval(true);
    setEvalProgress(0);
    setEvalError(null);
    const newResults = new Map<string, InferredCaseResult>();

    try {
      // POST to /api/benchmark: server enforces ORG_ADMIN/HSE_MANAGER role and runs canonical suite
      const response = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const result = JSON.parse(line) as InferredCaseResult;
            newResults.set(result.id, result);
            completed++;
            setEvalProgress(Math.round((completed / BENCHMARK_SUITE.length) * 100));
          } catch { /* malformed line, skip */ }
        }
      }

      const totalCases = BENCHMARK_SUITE.length;
      const validResults = Array.from(newResults.values()).filter((r) => !r.error);

      if (validResults.length === totalCases) {
        // 20/20 cases completed -> calculate empirical metrics
        setEvalStatus("COMPLETED");
        setInferredResults(new Map(newResults));
      } else if (validResults.length > 0) {
        // 1 to 19 cases completed -> mark evaluation incomplete; NEVER silently substitute fixture predictions
        setEvalStatus("INCOMPLETE");
        setInferredResults(new Map(newResults));
        setEvalError(
          `Incomplete Evaluation: ${validResults.length}/${totalCases} cases completed successfully (${totalCases - validResults.length} failed). Empirical metrics are not calculated from partial runs to prevent contamination with fixture predictions.`
        );
      } else {
        // 0/20 cases completed -> show error
        setEvalStatus("ERROR");
        setInferredResults(null);
        setEvalError("Evaluation Failed: 0/20 cases completed successfully. Check server logs.");
      }
    } catch (err: unknown) {
      setEvalStatus("ERROR");
      setEvalError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsRunningEval(false);
    }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              BENCHMARK &amp; EVALUATION LAB
            </span>
            <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground border">
              {evalHasRun
                ? `Live Gemini 2.5 Flash Inference — ${BENCHMARK_SUITE.length}/${BENCHMARK_SUITE.length} cases`
                : evalStatus === "INCOMPLETE"
                ? "Evaluation Incomplete — Partial Run"
                : "Baseline Fixtures — Run pipeline for live empirical metrics"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            SIF Sentinel Empirical Evaluation &amp; Accuracy Lab
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Transparent empirical measurement of SIF recall, precision, confusion matrix, and IOGP Life-Saving Rule accuracy.
            {evalHasRun
              ? " Measured on 20 synthetic/domain-inspired scenarios using the current deployed Gemini + guardrails pipeline."
              : " Click \"Run Live Pipeline Evaluation\" to execute the current Gemini pipeline against all 20 scenarios."}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={handleRunBenchmark}
            disabled={isRunningEval}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isRunningEval ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Evaluating {evalProgress}% ({Math.round((evalProgress / 100) * BENCHMARK_SUITE.length)}/{BENCHMARK_SUITE.length} cases)...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                {evalHasRun ? "Re-Run Live Pipeline" : "Run Live Pipeline Evaluation"}
              </>
            )}
          </button>
          {evalError && (
            <p className="text-xs text-red-600 font-medium">{evalError}</p>
          )}
        </div>
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
              <span className="font-semibold text-sm">Production HSE Review Ground Truth</span>
              <span className="rounded bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                Production Database
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Benchmark labels are curated synthetic/domain-inspired labels; production HSE reviews are tracked independently in the database for drift monitoring.
            </p>
          </div>
        </div>
      </div>

{/* Incomplete Evaluation Alert */}
      {evalStatus === "INCOMPLETE" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-200">
                Evaluation Incomplete - Empirical Metrics Suppressed
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                {evalError || "To maintain empirical integrity, metrics are never calculated from a partial inference run mixed with static fixtures. Please retry the evaluation to obtain a full 20/20 empirical measurement."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode Indicator Badge */}
      {metrics && (
        <div className="flex items-center justify-between">
          {metrics.isLive ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              LIVE EMPIRICAL MEASUREMENT: 20/20 cases analyzed via live Gemini 2.5 Flash + Guardrails pipeline
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border">
              <Database className="h-4 w-4 text-muted-foreground" />
              PRE-RUN BASELINE SUITE: Static expected values. Click &ldquo;Run Live Pipeline Evaluation&rdquo; above for live empirical inference.
            </div>
          )}
        </div>
      )}

      {metrics && (
        <>
      {/* 2. Dynamically Calculated Benchmark Metrics Cards (Zero Invented Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
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
            <strong className="text-foreground">Guardrail Coverage:</strong> Deterministic guardrails escalate defined high-risk patterns (Guardrails 3, 5, 7, 12, 13) and low-confidence cases to reduce missed SIF precursors and increase human review coverage. Guardrails can only escalate — never downgrade — a Gemini verdict.
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


        </>
      )}
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-foreground">{c.id}</span>
                    {evalHasRun && inferredResults?.get(c.id) && !inferredResults?.get(c.id)?.error && (
                      <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                        inferredResults.get(c.id)?.aiVerdictSIF
                          ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40"
                      }`}>
                        AI: {inferredResults.get(c.id)?.aiVerdictSIF ? "SIF" : "NON-SIF"}
                      </span>
                    )}
                  </div>
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

          {/* Detailed Inspector for Active Case (Issue 8: displays live AI output when eval has run) */}
          {(() => {
            const liveCase = inferredResults?.get(activeCase.id);
            const isLiveCase = evalHasRun && !!liveCase && !liveCase.error;
            const displayRiskBand = isLiveCase ? liveCase.riskBand : activeCase.riskBand;
            const displayVerdictSIF = isLiveCase ? liveCase.aiVerdictSIF : activeCase.aiVerdictSIF;
            const displayPredictedLSR = isLiveCase ? liveCase.aiPredictedLSR : activeCase.aiPredictedLSR;
            const displayGuardrails = isLiveCase
              ? (liveCase.guardrailsTriggered.length > 0 ? liveCase.guardrailsTriggered.join(", ") : "None triggered (Pure Gemini verdict)")
              : activeCase.guardrailTriggered;
            const displayEvidence = isLiveCase
              ? (liveCase.evidence_spans.length > 0 ? liveCase.evidence_spans.join("; ") : "(No evidence spans returned)")
              : activeCase.exactEvidence;

            return (
              <div className="lg:col-span-7 rounded-lg border bg-muted/10 p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-foreground">{activeCase.id}</span>
                    {isLiveCase ? (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        LIVE MODEL OUTPUT ({liveCase.latency_ms}ms)
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border">
                        BASELINE FIXTURE
                      </span>
                    )}
                    <span className="ml-1 text-xs text-muted-foreground font-medium">({activeCase.source})</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      displayRiskBand === "CRITICAL"
                        ? "bg-red-100 text-red-700"
                        : displayRiskBand === "HIGH"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {displayRiskBand}
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
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">
                        {isLiveCase ? "Live Model Decision" : "Model Output Decision"}
                      </span>
                      {isLiveCase && (
                        <span className="text-[10px] font-mono font-bold text-primary">
                          {Math.round(liveCase.confidence * 100)}% conf
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-semibold flex items-center gap-1.5">
                      {displayVerdictSIF ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-red-700 dark:text-red-400">SIF Flagged</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-700 dark:text-emerald-400">Filtered Non-SIF</span>
                        </>
                      )}
                    </div>
                    {displayPredictedLSR && (
                      <p className="text-[11px] text-muted-foreground mt-1">Rule: {displayPredictedLSR}</p>
                    )}
                  </div>
                </div>

                {displayGuardrails && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20 p-3 text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      {isLiveCase ? "Live Deterministic Guardrail Action:" : "Deterministic Guardrail Action:"}
                    </span>
                    <p className="mt-1 font-mono text-amber-800 dark:text-amber-300">
                      {displayGuardrails}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {isLiveCase ? "Live Extracted Verbatim Evidence" : "Verified Verbatim Evidence Substring"}
                    </span>
                    {isLiveCase && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {liveCase.evidence_spans.length} span(s)
                      </span>
                    )}
                  </div>
                  <div className="mt-1 rounded-lg border bg-amber-100/30 dark:bg-amber-950/30 p-2 text-xs font-mono font-medium text-amber-900 dark:text-amber-200 border-amber-300/50">
                    &ldquo;{displayEvidence}&rdquo;
                  </div>
                </div>

            <div className="rounded-lg bg-card border p-3 text-xs">
              <span className="font-semibold text-foreground">Consequence &amp; Hazard Mitigation:</span>
              <p className="mt-1 text-muted-foreground">{activeCase.consequenceMitigation}</p>
            </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
