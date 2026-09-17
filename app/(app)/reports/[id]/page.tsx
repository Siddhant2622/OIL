import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RiskBadge, StatusBadge } from "@/components/ui-components";
import { EvidenceHighlight } from "./evidence-highlight";
import { AnalyzeButton } from "./analyze-button";
import { AutoRefresh } from "./auto-refresh";
import {
  ArrowLeft,
  Zap,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { formatDateTime, reportTypeLabels } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  // Similar reports via embedding (Phase 9 — placeholder for now)
  const reporter = report.profiles as { full_name: string | null; email: string };
  const site = report.sites as { name: string } | null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {report.report_code}
            </span>
            <StatusBadge status={report.status} />
            {analysis?.risk_band && (
              <RiskBadge band={analysis.risk_band as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"} />
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

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Narrative */}
        <div className="lg:col-span-3 space-y-6">
          {/* Narrative with evidence highlights */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-3 font-semibold">Observation Narrative</h2>
            <div className="text-sm leading-relaxed text-foreground">
              <EvidenceHighlight
                text={report.description}
                spans={
                  (analysis?.evidence_spans as string[] | undefined) ?? []
                }
              />
            </div>
            {(analysis?.evidence_spans as string[] | undefined)?.length ? (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                🟡 Highlighted text = verbatim evidence cited by the AI
              </p>
            ) : null}
          </div>

          {/* Immediate action */}
          {report.immediate_action && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-2 font-semibold">Immediate Action Taken</h2>
              <p className="text-sm text-foreground">{report.immediate_action}</p>
            </div>
          )}

          {/* Reviews */}
          {reviews && reviews.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">Human Reviews</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border bg-muted/30 p-4"
                  >
                    <div className="flex items-center gap-2">
                      {review.agreed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="text-sm font-medium">
                        {review.agreed
                          ? "Agreed with AI"
                          : "Overrode AI verdict"}
                      </span>
                      <RiskBadge band={review.final_band as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"} size="sm" />
                    </div>
                    {review.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {review.notes}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reviewed by{" "}
                      {(review.profiles as { full_name: string | null })
                        ?.full_name ?? "Unknown"}{" "}
                      · {formatDateTime(review.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: AI verdict */}
        <div className="lg:col-span-2 space-y-4">
          {analysis ? (
            <>
              {/* SIF verdict */}
              <div
                className={`rounded-xl border p-5 ${
                  analysis.sif_potential
                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                    : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
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
                        : "No SIF potential"}
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
                  <p className="mt-3 text-sm leading-relaxed">
                    {analysis.rationale}
                  </p>
                )}
              </div>

              {/* Energy → Barrier → Exposure */}
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-sm">Reasoning Chain</h3>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Zap className="h-3.5 w-3.5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Energy</p>
                    <p className="text-sm">{analysis.energy_source || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Barriers</p>
                    {(analysis.barriers as { name: string; status: string }[])
                      ?.length ? (
                      <ul className="mt-0.5 space-y-1">
                        {(analysis.barriers as { name: string; status: string }[]).map(
                          (b, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-sm">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  b.status === "PRESENT"
                                    ? "bg-green-500"
                                    : b.status === "MISSING"
                                    ? "bg-red-500"
                                    : b.status === "FAILED"
                                    ? "bg-orange-500"
                                    : "bg-purple-500"
                                }`}
                              />
                              {b.name}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({b.status})
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm">—</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Eye className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Exposure</p>
                    <p className="text-sm">
                      {analysis.hazard || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* LSR tags */}
              {(analysis.lsr_tags as string[])?.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="mb-3 text-sm font-semibold">Life-Saving Rules</h3>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.lsr_tags as string[]).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended actions */}
              {(analysis.recommended_actions as { title: string; owner_role: string; urgency: string }[])
                ?.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="mb-3 text-sm font-semibold">
                    AI Recommended Actions
                  </h3>
                  <div className="space-y-2">
                    {(
                      analysis.recommended_actions as {
                        title: string;
                        owner_role: string;
                        urgency: string;
                      }[]
                    ).map((action, i) => (
                      <div
                        key={i}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
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

              {/* Guardrail overrides */}
              {(analysis.rule_overrides as { rule: string; triggered: boolean; reason: string }[])
                ?.filter((r) => r.triggered).length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
                  <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Deterministic Guardrails Fired
                  </h3>
                  <ul className="space-y-1">
                    {(
                      analysis.rule_overrides as {
                        rule: string;
                        triggered: boolean;
                        reason: string;
                      }[]
                    )
                      .filter((r) => r.triggered)
                      .map((rule, i) => (
                        <li key={i} className="text-xs text-amber-700 dark:text-amber-300">
                          <span className="font-mono font-semibold">
                            {rule.rule}
                          </span>{" "}
                          — {rule.reason}
                        </li>
                      ))}
                  </ul>
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
