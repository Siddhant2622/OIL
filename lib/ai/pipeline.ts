/**
 * lib/ai/pipeline.ts
 *
 * SIF Sentinel — End-to-end analysis pipeline (spec §7).
 * Orchestrates: analyseReport → applyGuardrails → persist → route → notify → embed
 *
 * SERVER-ONLY. Uses admin Supabase client to bypass RLS.
 */

import { analyseReport, embedDescription, PROMPT_VERSION } from "./gemini";
import { applyGuardrails } from "./guardrails";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportRow, ProfileRow, RiskBand } from "@/types/database";

export interface PipelineInput {
  report: ReportRow;
  reporter: ProfileRow;
}

export interface PipelineResult {
  success: boolean;
  analysis_id?: string;
  error?: string;
}

/**
 * Run the full SIF analysis pipeline on a submitted report.
 * Sets report status to ANALYZING immediately, then ANALYZED/IN_REVIEW/ANALYSIS_FAILED.
 */
export async function runAnalysisPipeline(
  input: PipelineInput
): Promise<PipelineResult> {
  const { report, reporter } = input;
  const admin = createAdminClient();

  // ── 1. Set status = ANALYZING ────────────────────────────────────────────
  await admin
    .from("reports")
    .update({ status: "ANALYZING" })
    .eq("id", report.id);

  try {
    // ── 2. Fetch historical context ──────────────────────────────────────────
    const historicalSummary = await fetchHistoricalContext(
      admin,
      report.org_id,
      report.location_text ?? undefined,
      report.activity_text ?? undefined
    );

    // ── 3. Call Gemini ───────────────────────────────────────────────────────
    const { result: geminiResult, latency_ms, raw_response, model } =
      await analyseReport(report.description, {
        site: report.location_text ?? undefined,
        activity: report.activity_text ?? undefined,
        report_type: report.report_type,
        historical_summary: historicalSummary,
      });

    // ── 4. Apply guardrails ──────────────────────────────────────────────────
    const { result, rule_overrides } = applyGuardrails(
      geminiResult,
      report.description
    );

    // ── 5. Persist analysis ──────────────────────────────────────────────────
    const { data: analysis, error: persistError } = await admin
      .from("ai_analyses")
      .insert({
        org_id: report.org_id,
        report_id: report.id,
        model,
        prompt_version: PROMPT_VERSION,
        sif_potential: result.sif_potential,
        sif_confidence: result.sif_confidence,
        risk_band: result.risk_band as RiskBand,
        energy_source: result.energy_source,
        hazard: result.hazard,
        activity: result.activity,
        location_type: result.location_type,
        equipment: result.equipment,
        barriers: result.barriers,
        lsr_tags: result.lsr_tags,
        precursor_type: result.precursor_type,
        evidence_spans: result.evidence_spans,
        rationale: result.rationale,
        recommended_actions: result.recommended_actions,
        needs_human_review: result.needs_human_review,
        review_reasons: result.review_reasons,
        rule_overrides,
        latency_ms,
        raw_response: raw_response as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (persistError || !analysis) {
      throw new Error(`Failed to persist analysis: ${persistError?.message}`);
    }

    // ── 6. Route: determine next status ──────────────────────────────────────
    const nextStatus = determineStatus(result);

    await admin
      .from("reports")
      .update({ status: nextStatus })
      .eq("id", report.id);

    // ── 7. Notify on CRITICAL / immediate action ──────────────────────────────
    if (
      result.risk_band === "CRITICAL" ||
      result.immediate_action_required
    ) {
      await notifyCritical(admin, report, reporter, result.risk_band as RiskBand);
    }

    // ── 8. Embed for clustering (fire-and-forget) ────────────────────────────
    embedAndStore(admin, report.id, report.org_id, report.description).catch(
      (err) =>
        console.warn("[pipeline] Embedding failed (non-fatal):", err?.message)
    );

    return { success: true, analysis_id: analysis.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pipeline] Analysis failed:", message);

    // Set status = ANALYSIS_FAILED — report enters retry queue
    await admin
      .from("reports")
      .update({ status: "ANALYSIS_FAILED" })
      .eq("id", report.id);

    return { success: false, error: message };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function determineStatus(
  result: ReturnType<typeof applyGuardrails>["result"]
): string {
  if (result.risk_band === "CRITICAL" || result.immediate_action_required) {
    return "IN_REVIEW";
  }
  if (result.needs_human_review) {
    return "IN_REVIEW";
  }
  return "ANALYZED";
}

async function fetchHistoricalContext(
  admin: ReturnType<typeof createAdminClient>,
  org_id: string,
  location?: string,
  activity?: string
): Promise<string | undefined> {
  // Fetch up to 5 similar recent reports from the same org
  const { data: similar } = await admin
    .from("reports")
    .select("description, status, created_at")
    .eq("org_id", org_id)
    .eq("location_text", location ?? "")
    .neq("status", "SUBMITTED")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!similar || similar.length === 0) return undefined;

  const summaries = similar
    .map((r, i) => `[${i + 1}] (${r.status}) ${r.description.slice(0, 200)}…`)
    .join("\n");

  return `${similar.length} similar recent reports at this location:\n${summaries}`;
}

async function notifyCritical(
  admin: ReturnType<typeof createAdminClient>,
  report: ReportRow,
  reporter: ProfileRow,
  band: RiskBand
) {
  // Collect manager chain + all HSE_MANAGER and ORG_ADMIN in the org
  const { data: hseUsers } = await admin
    .from("profiles")
    .select("id")
    .eq("org_id", report.org_id)
    .in("role", ["HSE_MANAGER", "ORG_ADMIN"])
    .eq("is_active", true);

  const managerChain = await getManagerChain(admin, reporter.manager_id);
  const recipientIds = [
    ...new Set([
      ...(hseUsers?.map((u) => u.id) ?? []),
      ...managerChain,
    ]),
  ].filter((id) => id !== reporter.id);

  const title = `🚨 ${band} SIF Alert: ${report.report_code}`;
  const body = `A ${band}-risk SIF precursor was detected. Immediate review required.`;
  const link = `/reports/${report.id}`;

  const notifications = recipientIds.map((user_id) => ({
    org_id: report.org_id,
    user_id,
    type: "CRITICAL_SIF_ALERT",
    title,
    body,
    link,
  }));

  if (notifications.length > 0) {
    await admin.from("notifications").insert(notifications);
  }

  // Audit
  await admin.from("audit_log").insert({
    org_id: report.org_id,
    actor_id: null,
    action: "CRITICAL_ALERT_SENT",
    entity: "reports",
    entity_id: report.id,
    meta: {
      band,
      recipient_count: recipientIds.length,
      report_code: report.report_code,
    },
  });
}

async function getManagerChain(
  admin: ReturnType<typeof createAdminClient>,
  manager_id: string | null
): Promise<string[]> {
  const chain: string[] = [];
  let current = manager_id;
  let depth = 0;

  while (current && depth < 10) {
    chain.push(current);
    const { data: mgr } = await admin
      .from("profiles")
      .select("manager_id")
      .eq("id", current)
      .single();
    current = mgr?.manager_id ?? null;
    depth++;
  }

  return chain;
}

async function embedAndStore(
  admin: ReturnType<typeof createAdminClient>,
  report_id: string,
  org_id: string,
  description: string
) {
  const embedding = await embedDescription(description);

  await admin.from("report_embeddings").upsert({
    report_id,
    org_id,
    embedding,
  });
}
