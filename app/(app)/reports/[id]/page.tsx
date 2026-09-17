import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RiskBadge, StatusBadge } from "@/components/ui-components";
import { EvidenceHighlight } from "./evidence-highlight";
import { AnalyzeButton } from "./analyze-button";
import { AutoRefresh } from "./auto-refresh";
import { findSimilarHistoricalReports } from "@/lib/ai/similarity";
import {
  ArrowLeft,
  Zap,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Layers,
  FileCheck,
  ExternalLink,
  Sparkles,
  Quote,
  Paperclip,
  FileText,
  Camera,
} from "lucide-react";
import { formatDateTime, reportTypeLabels } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

const ALL_GUARDRAILS = [
  { id: "VERBATIM_CHECK", name: "Verbatim Evidence Substring Integrity", desc: "Rejects hallucinated quotes not present character-for-character" },
  { id: "LSR_ENCLOSURE", name: "IOGP 9 Life-Saving Rules Validation", desc: "Enforces strict enclosure to official industry standard rules" },
  { id: "CONFINED_SPACE_NO_GAS_TEST", name: "Confined Space Without Gas Test / Permit", desc: "Forced escalation to CRITICAL if atmospheric testing was omitted" },
  { id: "HEIGHT_NO_FALL_PROTECTION", name: "Working at Height Without Fall Protection", desc: "Escalates to HIGH if elevated work lacked verified harness/anchor" },
  { id: "ENERGISED_NO_LOTO", name: "Live Line / Energised Equipment Without LOTO", desc: "Escalates to CRITICAL for unverified isolation on live circuits/lines" },
  { id: "SUSPENDED_LOAD", name: "Suspended Load & Line of Fire", desc: "Escalates to HIGH if personnel were under crane hook or swing radius" },
  { id: "PRESSURE_NO_DEPRESSURISATION", name: "Pressurised Hydrocarbon Line Breached", desc: "Escalates to CRITICAL if manifold opened without bleeding pressure" },
  { id: "H2S_NO_DETECTION", name: "H₂S / Toxic Gas Entry Without Detector/BA", desc: "Escalates to CRITICAL for hazardous atmospheres without SCBA or sensors" },
  { id: "DEEP_EXCAVATION_NO_SHORING", name: "Excavation >1.2m Without Shoring", desc: "Escalates to HIGH for trenching without required cave-in protection" },
  { id: "HOT_WORK_NO_PERMIT", name: "Hot Work in Hydrocarbon Zone Without Permit", desc: "Escalates to CRITICAL if spark/flame work performed near flammables" },
  { id: "VEHICLE_SAFETY_VIOLATION", name: "Vehicle Safety / Night Driving Violation", desc: "Escalates to HIGH for seatbelt violation, overspeeding, or fatigue" },
  { id: "DISMISSIVE_LANGUAGE", name: "High-Energy Dismissive Language Escalation", desc: "Routes for human review if narrative claims 'no harm' despite high energy" },
  { id: "LOW_CONFIDENCE", name: "Model Uncertainty Escalation (Confidence < 65%)", desc: "Prevents autonomous acceptance; forces mandatory human HSE review" },
  { id: "NO_BARRIER_IDENTIFIED", name: "High Energy Without Barrier Definition", desc: "Flags for human review when severe energy identified with zero controls" },
  { id: "SIF_WITHOUT_LSR", name: "SIF Potential Without Life-Saving Rule", desc: "Flags for human review when SIF is present but no LSR is tagged" },
];

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Fetch report (RLS applied via anon client for the select, use admin for joins)
  const { data: report, error } = await admin
    .from("reports")
    .select("*, profiles(full_name, email, role), sites(name)")
    .eq("id", id)
    .single();

  if (error || !report) notFound();

  // Verify caller belongs to same org
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || callerProfile.org_id !== report.org_id) {
    notFound();
  }

  // Fetch latest analysis
  const { data: analysis } = await admin
    .from("ai_analyses")
    .select("*")
    .eq("report_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch reviews
  const { data: reviews } = await admin
    .from("reviews")
    .select("*, profiles(full_name)")
    .eq("report_id", id)
    .order("created_at", { ascending: false });

  // Fetch actions
  const { data: actions } = await admin
    .from("actions")
    .select("*, profiles!assigned_to(full_name)")
    .eq("report_id", id)
    .order("created_at", { ascending: false });

  // Fetch semantically similar historical reports using pgvector
  const similarReports = await findSimilarHistoricalReports(
    admin,
    report.org_id,
    report.description,
    4,
    report.id
  );

  const reporter = report.profiles as { full_name: string | null; email: string };
  const site = report.sites as { name: string } | null;

  const overrides = (analysis?.rule_overrides as {
    rule: string;
    triggered: boolean;
    reason: string;
  }[] | undefined) ?? [];

  const triggeredSet = new Set(
    overrides.filter((r) => r.triggered).map((r) => r.rule)
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>
        <span className="rounded bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground border">
          Data Provenance: Synthetic Demonstration Data (OIL Standard Format)
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground font-semibold">
              {report.report_code}
            </span>
            <StatusBadge status={report.status} />
            {analysis?.risk_band && (
              <RiskBadge band={analysis.risk_band as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"} />
            )}
            {analysis?.sif_potential && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                SIF PRECURSOR
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold">
            {reportTypeLabels[report.report_type]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(report.occurred_at)} ·{" "}
            {site?.name ?? report.location_text ?? "Unknown location"} ·
            Reported by {reporter?.full_name ?? reporter?.email}
          </p>
        </div>

        {/* Trigger analysis if not yet done */}
        {["SUBMITTED", "ANALYSIS_FAILED"].includes(report.status) && (
          <AnalyzeButton reportId={report.id} />
        )}
      </div>

      <AutoRefresh status={report.status} />

      {/* Section 4: Why was this classified as SIF? (Evidence & Reasoning Matrix) */}
      {analysis && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">SIF Precursor Decision & Evidence Matrix</h2>
                <p className="text-xs text-muted-foreground">
                  Explainable Energy → Barrier → Exposure reasoning with exact evidence quotes
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-medium">Model Confidence</div>
              <div className="text-lg font-black font-mono text-foreground">
                {(analysis.sif_confidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Zap className="h-3.5 w-3.5" /> Hazardous Energy
              </div>
              <p className="mt-2 font-semibold text-sm">{analysis.energy_source || "None identified"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Potential release vector</p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Shield className="h-3.5 w-3.5" /> Barrier Condition
              </div>
              <div className="mt-2 space-y-1">
                {(analysis.barriers as { name: string; status: string }[])?.length ? (
                  (analysis.barriers as { name: string; status: string }[]).map((b, i) => (
                    <div key={i} className="text-sm font-semibold flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          b.status === "PRESENT"
                            ? "bg-green-500"
                            : b.status === "MISSING"
                            ? "bg-red-500"
                            : "bg-orange-500"
                        }`}
                      />
                      <span>{b.name}</span>
                      <span className="text-xs font-mono text-muted-foreground font-normal">
                        ({b.status})
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No barriers logged</p>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Critical barrier controls</p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <Eye className="h-3.5 w-3.5" /> Exposure / Line of Fire
              </div>
              <p className="mt-2 font-semibold text-sm">{analysis.hazard || "Human exposure present"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Personnel in line-of-fire</p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <FileCheck className="h-3.5 w-3.5" /> Life-Saving Rule
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(analysis.lsr_tags as string[])?.length ? (
                  (analysis.lsr_tags as string[]).map((t) => (
                    <span
                      key={t}
                      className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">IOGP standard mapping</p>
            </div>
          </div>

          {/* Exact Verbatim Evidence Spans */}
          {(analysis.evidence_spans as string[] | undefined)?.length ? (
            <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <Quote className="h-4 w-4" /> Verbatim Evidence Cited by Model
              </div>
              <div className="mt-2 space-y-2">
                {(analysis.evidence_spans as string[]).map((span, idx) => (
                  <blockquote
                    key={idx}
                    className="border-l-4 border-amber-500 pl-3 italic text-sm font-medium text-foreground bg-amber-100/40 dark:bg-amber-900/30 py-1.5 rounded-r"
                  >
                    &ldquo;{span}&rdquo;
                  </blockquote>
                ))}
              </div>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                ✓ Validated by Guardrail 1 (Verbatim Check) against original field report string.
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Narrative & Reviews */}
        <div className="lg:col-span-3 space-y-6">
          {/* Narrative with evidence highlights */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-3 font-semibold text-base">Observation Narrative</h2>
            <div className="text-sm leading-relaxed text-foreground">
              <EvidenceHighlight
                text={report.description}
                spans={(analysis?.evidence_spans as string[] | undefined) ?? []}
              />
            </div>
            {(analysis?.evidence_spans as string[] | undefined)?.length ? (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                🟡 Highlighted text corresponds to character-for-character cited evidence.
              </p>
            ) : null}
          </div>

          {/* Immediate action */}
          {report.immediate_action && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-2 font-semibold text-base">Immediate Action Taken</h2>
              <p className="text-sm text-foreground">{report.immediate_action}</p>
            </div>
          )}

          {/* Attachments (Photos / PDF) */}
          {(report.attachments as { name: string; type: string; size?: number; url?: string }[])?.length ? (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-3 font-semibold text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                Attached Photos &amp; Documents
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(report.attachments as { name: string; type: string; size?: number; url?: string }[]).map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                  >
                    {att.type?.startsWith("image/") ? (
                      att.url ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="h-14 w-14 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Camera className="h-6 w-6" />
                        </div>
                      )
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {att.name}
                      </p>
                      {att.size && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {Math.round(att.size / 1024)} KB
                        </p>
                      )}
                      {att.url && (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                        >
                          View full size
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Section 3: Similar Historical Cases (pgvector Semantic Search) */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">Similar Historical Cases (pgvector)</h2>
              </div>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                gemini-embedding-001
              </span>
            </div>

            {similarReports.length > 0 ? (
              <div className="space-y-3">
                {similarReports.map((sim) => (
                  <div
                    key={sim.report_id}
                    className="rounded-lg border bg-muted/20 p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {sim.report_code}
                        </span>
                        {sim.location && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {sim.location}
                          </span>
                        )}
                        {sim.sif_potential && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            SIF Potential
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-bold font-mono text-emerald-800 dark:text-emerald-300">
                          {sim.similarity_pct}% match
                        </span>
                        <Link
                          href={`/reports/${sim.report_id}`}
                          className="text-muted-foreground hover:text-foreground"
                          title="View historical case"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {sim.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {sim.lsr_tags && sim.lsr_tags.length > 0 && (
                        <span>
                          <strong className="text-foreground">LSR:</strong> {sim.lsr_tags.join(", ")}
                        </span>
                      )}
                      {sim.reviewer_verdict && (
                        <span>
                          <strong className="text-foreground">Reviewer:</strong>{" "}
                          {sim.reviewer_verdict.final_band} (
                          {sim.reviewer_verdict.final_sif ? "SIF" : "Non-SIF"})
                        </span>
                      )}
                      {sim.hazard && (
                        <span>
                          <strong className="text-foreground">Hazard:</strong> {sim.hazard}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No historical cases with cosine similarity &gt; 0.50 found for this organization.
              </div>
            )}
          </div>

          {/* Human Reviews */}
          {reviews && reviews.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold text-base">Human HSE Reviews</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      {review.agreed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="text-sm font-medium">
                        {review.agreed ? "Agreed with AI Verdict" : "Overrode AI Verdict"}
                      </span>
                      <RiskBadge band={review.final_band as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"} size="sm" />
                    </div>
                    {review.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{review.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reviewed by{" "}
                      {(review.profiles as { full_name: string | null })?.full_name ?? "Unknown"} ·{" "}
                      {formatDateTime(review.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrective Actions (CAPA) */}
          {actions && actions.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold text-base">CAPA Corrective Actions</h2>
              <div className="space-y-3">
                {actions.map((act) => (
                  <div key={act.id} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {act.action_code}
                          </span>
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">
                            {act.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium">{act.title}</p>
                        {act.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{act.description}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                          act.urgency === "IMMEDIATE"
                            ? "bg-red-100 text-red-700"
                            : act.urgency === "SHORT_TERM"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {act.urgency}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Assignee: {(act.profiles as { full_name: string | null })?.full_name ?? "Unassigned"}
                      </span>
                      <span>Due: {act.due_date ? formatDateTime(act.due_date) : "No due date"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Guardrails Inspector & AI Status */}
        <div className="lg:col-span-2 space-y-4">
          {analysis ? (
            <>
              {/* SIF Status Banner */}
              <div
                className={`rounded-xl border p-5 ${
                  analysis.sif_potential
                    ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                    : "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {analysis.sif_potential ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold">
                      {analysis.sif_potential
                        ? "SIF POTENTIAL DETECTED"
                        : "No SIF Potential Detected"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Confidence:{" "}
                      <span className="font-mono font-semibold">
                        {(analysis.sif_confidence * 100).toFixed(1)}%
                      </span>{" "}
                      · Model: {analysis.model}
                    </p>
                  </div>
                </div>
                {analysis.rationale && (
                  <p className="mt-3 text-sm leading-relaxed text-foreground">
                    {analysis.rationale}
                  </p>
                )}
              </div>

              {/* Visual 15 Deterministic Guardrails Inspector (Section 14) */}
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Deterministic Safety Guardrails (15)</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Runs post-Gemini in TypeScript. Enforces hard safety floors and automatic risk escalations.
                </p>

                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {ALL_GUARDRAILS.map((g) => {
                    const isTriggered = triggeredSet.has(g.id);
                    const overrideObj = overrides.find((o) => o.rule === g.id && o.triggered);

                    return (
                      <div
                        key={g.id}
                        className={`rounded-lg border p-2.5 text-xs transition-colors ${
                          isTriggered
                            ? "border-amber-400 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                            : "border-border/60 bg-muted/10 opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-foreground">
                            {g.id}
                          </span>
                          {isTriggered ? (
                            <span className="rounded bg-amber-200 px-1.5 py-0.5 font-bold text-[10px] text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                              ESCALATED
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              PASSED
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-medium text-foreground">{g.name}</p>
                        <p className="text-[11px] text-muted-foreground">{g.desc}</p>
                        {overrideObj && (
                          <div className="mt-2 rounded bg-amber-100/70 dark:bg-amber-900/50 p-2 font-mono text-[11px] text-amber-950 dark:text-amber-200">
                            <strong>Triggered:</strong> {overrideObj.reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Actions */}
              {(analysis.recommended_actions as { title: string; owner_role: string; urgency: string }[])
                ?.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="mb-3 text-sm font-semibold">AI Recommended Interventions</h3>
                  <div className="space-y-2">
                    {(
                      analysis.recommended_actions as {
                        title: string;
                        owner_role: string;
                        urgency: string;
                      }[]
                    ).map((action, i) => (
                      <div key={i} className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{action.title}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              action.urgency === "IMMEDIATE"
                                ? "bg-red-100 text-red-700"
                                : action.urgency === "SHORT_TERM"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {action.urgency}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Owner: {action.owner_role}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Analysis pending</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.status === "ANALYZING"
                  ? "The AI is currently analysing this report…"
                  : "Submit this report for AI analysis."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
