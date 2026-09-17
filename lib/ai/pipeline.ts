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
import { sendSensitiveAlertEmail } from "@/lib/email";
import { findSimilarHistoricalReports, formatSimilarCasesForPrompt } from "./similarity";
import type { ReportRow, ProfileRow, RiskBand } from "@/types/database";

export interface PipelineInput {
  report: ReportRow;
  reporter: ProfileRow;
}

export interface PipelineResult {
  success: boolean;
  analysis_id?: string;
  risk_band?: RiskBand;
  sif_potential?: boolean;
  is_sensitive?: boolean;
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
    // ── 2. pgvector Semantic Retrieval ──────────────────────────────────────
    const similarCases = await findSimilarHistoricalReports(
      admin,
      report.org_id,
      report.description,
      4,
      report.id
    );
    const historicalSummary = formatSimilarCasesForPrompt(similarCases);

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
    const isSensitive =
      result.risk_band === "CRITICAL" ||
      result.risk_band === "HIGH" ||
      result.sif_potential ||
      result.immediate_action_required;

    const nextStatus = determineStatus(result);

    await admin
      .from("reports")
      .update({ status: nextStatus })
      .eq("id", report.id);

    // ── 7. Notify on sensitive / CRITICAL / HIGH SIF / immediate action ───────
    if (isSensitive) {
      await notifySensitive(admin, report, reporter, result);
    }

    // ── 8. Embed for clustering (fire-and-forget) ────────────────────────────
    embedAndStore(admin, report.id, report.org_id, report.description).catch(
      (err) =>
        console.warn("[pipeline] Embedding failed (non-fatal):", err?.message)
    );

    return {
      success: true,
      analysis_id: analysis.id,
      risk_band: result.risk_band as RiskBand,
      sif_potential: result.sif_potential,
      is_sensitive: isSensitive,
    };
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
  if (
    result.risk_band === "CRITICAL" ||
    result.risk_band === "HIGH" ||
    result.sif_potential ||
    result.immediate_action_required ||
    result.needs_human_review
  ) {
    return "IN_REVIEW";
  }
  return "ANALYZED";
}

async function notifySensitive(
  admin: ReturnType<typeof createAdminClient>,
  report: ReportRow,
  reporter: ProfileRow,
  analysisResult: ReturnType<typeof applyGuardrails>["result"]
) {
  const band = analysisResult.risk_band as RiskBand;

  // Collect manager chain + all HSE_MANAGER and ORG_ADMIN in the org
  const { data: hseUsers } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("org_id", report.org_id)
    .in("role", ["HSE_MANAGER", "ORG_ADMIN"])
    .eq("is_active", true);

  const managerProfiles = await getManagerProfiles(admin, reporter.manager_id);

  // Safety team & management recipients
  const safetyPersonnel = [
    ...(hseUsers ?? []),
    ...managerProfiles,
  ].filter((p) => p.id !== reporter.id);

  // De-duplicate by id
  const uniquePersonnelMap = new Map<string, { id: string; email: string }>();
  safetyPersonnel.forEach((p) => {
    if (p.id && !uniquePersonnelMap.has(p.id)) {
      uniquePersonnelMap.set(p.id, { id: p.id, email: p.email });
    }
  });

  const hazardText = analysisResult.hazard ? ` (${analysisResult.hazard})` : "";
  const title = `🚨 ${band} SIF Alert: ${report.report_code}`;
  const body = `A ${band}-risk SIF precursor was detected${hazardText}. Immediate safety review required.`;
  const link = `/reports/${report.id}`;
  const alertType = band === "CRITICAL" ? "CRITICAL_SIF_ALERT" : "HIGH_SIF_ALERT";

  const notifications = Array.from(uniquePersonnelMap.values()).map((u) => ({
    org_id: report.org_id,
    user_id: u.id,
    type: alertType,
    title,
    body,
    link,
  }));

  // Also send an informative confirmation to the reporter
  if (reporter.id) {
    notifications.push({
      org_id: report.org_id,
      user_id: reporter.id,
      type: "SIF_PRECURSOR_DETECTED",
      title: `Observation Flagged (${band}): ${report.report_code}`,
      body: `Your safety observation has been assessed as high priority by AI. Management and HSE teams have been alerted.`,
      link,
    });
  }

  if (notifications.length > 0) {
    const { error: notifErr } = await admin.from("notifications").insert(notifications);
    if (notifErr) {
      console.warn("[pipeline] Failed to insert notifications:", notifErr.message);
    }
  }

  // Send Resend email to unique safety personnel emails + reporter if email exists
  const emailRecipients = Array.from(
    new Set(
      Array.from(uniquePersonnelMap.values())
        .map((u) => u.email)
        .filter((e): e is string => Boolean(e && e.includes("@")))
    )
  );

  if (emailRecipients.length > 0) {
    sendSensitiveAlertEmail({
      to: emailRecipients,
      reportCode: report.report_code,
      reportType: report.report_type,
      riskBand: band,
      sifPotential: analysisResult.sif_potential,
      hazard: analysisResult.hazard,
      energySource: analysisResult.energy_source,
      lsrTags: analysisResult.lsr_tags,
      location: report.location_text ?? undefined,
      reportId: report.id,
      description: report.description,
    }).catch((err) => {
      console.warn("[pipeline] Email delivery non-fatal error:", err?.message);
    });
  }

  // Audit
  await admin.from("audit_log").insert({
    org_id: report.org_id,
    actor_id: null,
    action: "SENSITIVE_ALERT_SENT",
    entity: "reports",
    entity_id: report.id,
    meta: {
      band,
      sif_potential: analysisResult.sif_potential,
      recipient_count: notifications.length,
      email_count: emailRecipients.length,
      report_code: report.report_code,
    },
  });
}

async function getManagerProfiles(
  admin: ReturnType<typeof createAdminClient>,
  manager_id: string | null
): Promise<{ id: string; email: string; full_name: string | null }[]> {
  const chain: { id: string; email: string; full_name: string | null }[] = [];
  let current = manager_id;
  let depth = 0;

  while (current && depth < 10) {
    const { data: mgr } = await admin
      .from("profiles")
      .select("id, email, full_name, manager_id")
      .eq("id", current)
      .single();

    if (!mgr) break;
    chain.push({ id: mgr.id, email: mgr.email, full_name: mgr.full_name });
    current = mgr.manager_id ?? null;
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
