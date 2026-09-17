"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Eye,
  Sparkles,
  ArrowRight,
  Clock,
  Send,
  Loader2,
  ExternalLink,
  Flame,
  Award,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  badge: string;
  expectedBand: "CRITICAL" | "HIGH";
  expectedLSR: string;
  expectedGuardrail: string;
  language: string;
  description: string;
  location: string;
  activity: string;
  reportType: string;
  rationaleSnippet: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "SCENARIO-1",
    title: "Scenario 1: Confined Space Without Gas Test / Permit",
    badge: "Confined Space",
    expectedBand: "CRITICAL",
    expectedLSR: "Confined Space",
    expectedGuardrail: "CONFINED_SPACE_NO_GAS_TEST (Guardrail 3)",
    language: "English",
    description:
      "Two contract cleaners entered crude storage tank V-301 to clear heavy bottom sludge. Atmospheric gas testing was not carried out prior to entry and no confined space permit was verified.",
    location: "Duliajan Tank Farm",
    activity: "Tank Cleaning & Sludge Removal",
    reportType: "UNSAFE_CONDITION",
    rationaleSnippet:
      "Vessel entry in toxic/hydrocarbon atmosphere without mandatory multi-gas testing carries immediate asphyxiation and explosion fatality potential.",
  },
  {
    id: "SCENARIO-2",
    title: "Scenario 2: Worker in Line of Fire Under Suspended Load",
    badge: "Suspended Load",
    expectedBand: "HIGH",
    expectedLSR: "Line of Fire / Safe Mechanical Lifting",
    expectedGuardrail: "SUSPENDED_LOAD (Guardrail 6)",
    language: "English",
    description:
      "Roustabout walked directly beneath a 3.8-ton drill collar suspended by crane hook while maneuvering pipe onto rig floor. Tag lines were not attached to guide the load.",
    location: "Digboi Drilling Rig #4",
    activity: "Rig Floor Pipe Handling",
    reportType: "UNSAFE_ACT",
    rationaleSnippet:
      "Direct exposure to suspended 3.8-ton mechanical energy with no secondary retention barrier in place.",
  },
  {
    id: "SCENARIO-3",
    title: "Scenario 3: Zero-Injury Hydrocarbon Breach Without LOTO",
    badge: "Energy Isolation",
    expectedBand: "CRITICAL",
    expectedLSR: "Energy Isolation",
    expectedGuardrail: "PRESSURE_NO_DEPRESSURISATION (Guardrail 7) & DISMISSIVE_LANGUAGE (12)",
    language: "English (Dismissive wording)",
    description:
      "Maintenance technician opened a pressurized hydrocarbon manifold valve without confirming lock-out tag-out isolation. Luckily nobody was hurt and only minor gas escaped.",
    location: "Moran Gas Compressor Station",
    activity: "Manifold Valve Maintenance",
    reportType: "NEAR_MISS",
    rationaleSnippet:
      "High-pressure hydrocarbon breach without verified isolation. Dismissive wording 'luckily nobody was hurt' overridden by deterministic safety guardrails.",
  },
  {
    id: "SCENARIO-4",
    title: "Scenario 4: Multilingual Field Report (Hinglish / Regional)",
    badge: "Multilingual Field Live Demo",
    expectedBand: "CRITICAL",
    expectedLSR: "Energy Isolation",
    expectedGuardrail: "ENERGISED_NO_LOTO (Guardrail 5)",
    language: "Hinglish (Hindi + English)",
    description:
      "Pump ka pressure line open tha aur LOTO nahi laga tha. Technician live line pe kaam kar raha tha par kismat se koi accident nahi hua.",
    location: "Duliajan Gathering Station 2",
    activity: "Pump Overhaul",
    reportType: "UNSAFE_ACT",
    rationaleSnippet:
      "Gemini native comprehension parses Romanised Hindi/Hinglish, mapping unisolated live line to Energy: Pressure, Barrier: Energy Isolation (Missing), and SIF: TRUE.",
  },
];

export function DemoClient({ sites }: { sites: { id: string; name: string }[] }) {
  const router = useRouter();
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultReportId, setResultReportId] = useState<string | null>(null);
  const [resultReportCode, setResultReportCode] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fallbackSiteId = sites[0]?.id;

  async function handleInjectScenario() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setResultReportId(null);
    setLiveResult(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: fallbackSiteId || null,
          report_type: selectedScenario.reportType,
          description: selectedScenario.description,
          occurred_at: new Date().toISOString(),
          location_text: selectedScenario.location,
          immediate_action: "Work halted immediately pending HSE investigation.",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to inject scenario");
      }

      setResultReportId(data.report_id);
      setResultReportCode(data.report_code);
      setLiveResult(data.ai_analysis);
    } catch (err: any) {
      setErrorMessage(err.message || "Execution error during demo injection");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-red-100 px-2.5 py-0.5 text-xs font-mono font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
            3-MINUTE JUDGE DEMONSTRATION HUB
          </span>
          <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground border">
            Scripted Interactive Flow
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          SIF Sentinel Live Evaluation &amp; Demonstration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Experience the complete closed-loop safety intelligence cycle in real time: from raw multilingual
          observation to instant Gemini analysis, 15 TypeScript guardrails escalation, pgvector historical
          similarity matching, and command center notification.
        </p>
      </div>

      {/* 5-Phase Demo Roadmap (User Section 19) */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          The 3-Minute Demonstration Script
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="font-mono font-bold text-primary">0:00 – 0:20</div>
            <div className="font-semibold text-foreground mt-1">Org Hierarchy</div>
            <p className="text-muted-foreground mt-1">
              Visual manager tree, permission roles vs. organizational positions, and 1-click subordinate invitations.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="font-mono font-bold text-primary">0:20 – 0:45</div>
            <div className="font-semibold text-foreground mt-1">Field Observation</div>
            <p className="text-muted-foreground mt-1">
              Field worker submits high-energy precursor in English or Hinglish without manual risk categorisation.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="font-mono font-bold text-primary">0:45 – 1:15</div>
            <div className="font-semibold text-foreground mt-1">AI + 15 Guardrails</div>
            <p className="text-muted-foreground mt-1">
              Deterministic escalation: dismissive wording dismissed; exact verbatim quotes cited; pgvector similarity retrieved.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="font-mono font-bold text-primary">1:15 – 2:10</div>
            <div className="font-semibold text-foreground mt-1">Command Center</div>
            <p className="text-muted-foreground mt-1">
              Instant notification sent; top risk sites, barrier breakdown, and 4D precursor intelligence drill-down.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="font-mono font-bold text-primary">2:10 – 3:00</div>
            <div className="font-semibold text-foreground mt-1">Act &amp; Verify</div>
            <p className="text-muted-foreground mt-1">
              HSE review audit, CAPA corrective assignment with SLA tracking, closing the loop on fatal precursor prevention.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map((sc) => (
          <div
            key={sc.id}
            onClick={() => setSelectedScenario(sc)}
            className={`cursor-pointer rounded-xl border p-5 transition-all ${
              selectedScenario.id === sc.id
                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary">{sc.badge}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  sc.expectedBand === "CRITICAL"
                    ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                }`}
              >
                Expected: {sc.expectedBand}
              </span>
            </div>
            <h3 className="mt-2 font-bold text-sm text-foreground">{sc.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-2 rounded">
              &ldquo;{sc.description}&rdquo;
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                <strong>Language:</strong> {sc.language}
              </span>
              <span>
                <strong>LSR:</strong> {sc.expectedLSR}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Scenario Control Panel */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Ready to Inject: {selectedScenario.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulates direct mobile field report transmission from {selectedScenario.location}.
            </p>
          </div>

          <button
            onClick={handleInjectScenario}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning with Gemini 2.5 Flash...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Inject &amp; Run Live AI Scan
              </>
            )}
          </button>
        </div>

        {/* Narrative Review */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Observation Submitted to SIF Sentinel
          </label>
          <div className="mt-2 rounded-lg border bg-muted/20 p-4 font-mono text-sm leading-relaxed">
            {selectedScenario.description}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border bg-muted/10 p-3">
            <span className="font-semibold text-muted-foreground">Expected SIF Risk Band</span>
            <div className="font-bold text-red-600 text-sm mt-1">{selectedScenario.expectedBand}</div>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <span className="font-semibold text-muted-foreground">Target IOGP Life-Saving Rule</span>
            <div className="font-bold text-primary text-sm mt-1">{selectedScenario.expectedLSR}</div>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <span className="font-semibold text-muted-foreground">Deterministic Guardrail Trigger</span>
            <div className="font-bold text-amber-600 text-sm mt-1">{selectedScenario.expectedGuardrail}</div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Live Result Reveal */}
        {resultReportId && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                  Live Analysis Complete: {resultReportCode}
                </span>
              </div>
              <Link
                href={`/reports/${resultReportId}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline"
              >
                Inspect Full Report Detail <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {liveResult && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                <div className="rounded-lg border bg-background p-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    SIF Potential
                  </span>
                  <div className="text-base font-black text-red-600 mt-1">
                    {liveResult.sif_potential ? "DETECTED (TRUE)" : "FALSE"}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Confidence: {(liveResult.sif_confidence * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Assigned Risk Band
                  </span>
                  <div className="text-base font-black text-foreground mt-1">
                    {liveResult.risk_band}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Model: {liveResult.model || "gemini-2.5-flash"}
                  </span>
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Energy &amp; Barrier
                  </span>
                  <div className="text-xs font-bold text-foreground mt-1 truncate">
                    {liveResult.energy_source || "N/A"}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {liveResult.barriers?.[0]?.name} ({liveResult.barriers?.[0]?.status})
                  </span>
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    IOGP Rule
                  </span>
                  <div className="text-xs font-bold text-blue-600 mt-1">
                    {liveResult.lsr_tags?.join(", ") || "None"}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    ✓ High-priority dispatch sent
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
              <span>This report is now live in the SIF Command Center &amp; Precursor Intelligence.</span>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/hse"
                  className="font-bold underline hover:text-foreground"
                >
                  View in Command Center
                </Link>
                <Link
                  href="/precursors"
                  className="font-bold underline hover:text-foreground"
                >
                  View in Precursors
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
