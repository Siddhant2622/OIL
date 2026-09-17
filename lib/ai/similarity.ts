/**
 * lib/ai/similarity.ts
 *
 * SIF Sentinel — pgvector Semantic Similarity Retrieval Engine.
 * Uses 768-dimensional embeddings to find historically similar safety observations
 * within the organization, including their past SIF verdicts, reviewer decisions, and barriers.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { embedDescription } from "./gemini";

export interface SimilarCase {
  report_id: string;
  report_code: string;
  similarity_pct: number;
  occurred_at: string;
  location?: string | null;
  description: string;
  sif_potential: boolean;
  risk_band: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  hazard?: string;
  barrier?: string;
  lsr_tags?: string[];
  reviewer_verdict?: {
    agreed: boolean;
    final_sif: boolean;
    final_band: string;
    reviewer_name?: string;
    notes?: string;
  } | null;
}

/**
 * Retrieve top semantically similar reports from pgvector embeddings.
 */
export async function findSimilarHistoricalReports(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  description: string,
  limit = 4,
  excludeReportId?: string
): Promise<SimilarCase[]> {
  try {
    // 1. Generate 768-dim query embedding
    const queryEmbedding = await embedDescription(description);

    // 2. Call pgvector similarity search RPC
    const { data: rpcMatches, error: rpcError } = await admin.rpc(
      "match_similar_reports",
      {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter_org_id: orgId,
        exclude_report_id: excludeReportId ?? null,
      }
    );

    let matchIds: { report_id: string; similarity: number }[] = [];

    if (!rpcError && Array.isArray(rpcMatches) && rpcMatches.length > 0) {
      matchIds = rpcMatches
        .filter((m: any) => typeof m.similarity === "number" && !isNaN(m.similarity))
        .map((m: { report_id: string; similarity: number }) => ({
          report_id: m.report_id,
          similarity: Math.max(0, Math.min(1, m.similarity)),
        }));
    } else {
      if (rpcError) {
        console.warn("[similarity] pgvector match_similar_reports RPC warning:", rpcError.message);
      }
      // Never manufacture fake similarity scores. If no matches exist in pgvector, return empty.
      return [];
    }

    if (!matchIds.length) return [];

    // 3. Fetch report details, analyses, and reviews
    const cases: SimilarCase[] = [];

    for (const match of matchIds) {
      const { data: rep } = await admin
        .from("reports")
        .select("id, report_code, occurred_at, location_text, description")
        .eq("id", match.report_id)
        .single();

      if (!rep) continue;

      const { data: analysis } = await admin
        .from("ai_analyses")
        .select("sif_potential, risk_band, hazard, barriers, lsr_tags")
        .eq("report_id", match.report_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: review } = await admin
        .from("reviews")
        .select("agreed, final_sif, final_band, notes, profiles(full_name)")
        .eq("report_id", match.report_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const barriersList = analysis?.barriers as { name: string; status: string }[] | null;
      const primaryBarrier = Array.isArray(barriersList) && barriersList.length > 0
        ? `${barriersList[0].name} (${barriersList[0].status})`
        : undefined;

      const reviewerProfile = review?.profiles as unknown as { full_name: string | null } | null;

      cases.push({
        report_id: rep.id,
        report_code: rep.report_code,
        similarity_pct: Math.min(99, Math.round(match.similarity * 100)),
        occurred_at: rep.occurred_at,
        location: rep.location_text,
        description: rep.description,
        sif_potential: Boolean(analysis?.sif_potential),
        risk_band: (analysis?.risk_band as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW") || "MEDIUM",
        hazard: analysis?.hazard,
        barrier: primaryBarrier,
        lsr_tags: (analysis?.lsr_tags as string[]) ?? [],
        reviewer_verdict: review
          ? {
              agreed: review.agreed,
              final_sif: review.final_sif,
              final_band: review.final_band,
              reviewer_name: reviewerProfile?.full_name ?? undefined,
              notes: review.notes ?? undefined,
            }
          : null,
      });
    }

    return cases;
  } catch (err) {
    console.warn("[similarity] pgvector retrieval non-fatal fallback:", err);
    return [];
  }
}

/**
 * Format retrieved similar historical cases for inclusion in Gemini's prompt.
 */
export function formatSimilarCasesForPrompt(cases: SimilarCase[]): string | undefined {
  if (!cases.length) return undefined;

  const lines = cases.map((c, i) => {
    const rev = c.reviewer_verdict
      ? ` | HSE Reviewer: ${c.reviewer_verdict.final_sif ? "Confirmed SIF" : "Non-SIF"} (${c.reviewer_verdict.final_band})`
      : "";
    return `[Case ${i + 1}] (${c.similarity_pct}% Semantic Match | Past AI: ${c.risk_band} SIF=${c.sif_potential}${rev})\n"${c.description.slice(0, 180)}…"`;
  });

  return `SEMANTICALLY SIMILAR HISTORICAL CASES IN THIS OPERATOR'S DATABASE:\n${lines.join("\n\n")}`;
}
