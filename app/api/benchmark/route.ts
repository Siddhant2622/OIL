import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyseReport } from "@/lib/ai/gemini";
import { applyGuardrails } from "@/lib/ai/guardrails";
import { BENCHMARK_SUITE } from "@/lib/ai/benchmark-suite";

export interface BenchmarkCaseResult {
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

/**
 * POST /api/benchmark
 * Runs the real Gemini + guardrails pipeline against the canonical 20-case suite.
 *
 * Security & Integrity constraints:
 * 1. Server-only - GEMINI_API_KEY never leaves the server.
 * 2. Role-restricted - Only ORG_ADMIN and HSE_MANAGER can trigger execution.
 * 3. Proxy-abuse prevention - Client cannot supply arbitrary descriptions;
 *    the server strictly loads and evaluates the canonical BENCHMARK_SUITE.
 *
 * Returns streaming NDJSON: one JSON object per line, one per benchmark case.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization: restrict live benchmark execution to ORG_ADMIN and HSE_MANAGER
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;
  if (role !== "ORG_ADMIN" && role !== "HSE_MANAGER") {
    return NextResponse.json(
      {
        error:
          "Forbidden: Live benchmark execution is restricted to ORG_ADMIN and HSE_MANAGER roles.",
      },
      { status: 403 }
    );
  }

  // Server strictly loads the canonical 20-case suite (client input is ignored to prevent proxy abuse)
  const cases = BENCHMARK_SUITE;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const testCase of cases) {
        const caseResult: BenchmarkCaseResult = {
          id: testCase.id,
          aiVerdictSIF: false,
          aiPredictedLSR: null,
          riskBand: "LOW",
          guardrailsTriggered: [],
          evidence_spans: [],
          confidence: 0,
          latency_ms: 0,
        };

        try {
          const { result: geminiResult, latency_ms } = await analyseReport(
            testCase.description,
            { report_type: "UNSAFE_ACT" }
          );

          const { result, rule_overrides } = applyGuardrails(
            geminiResult,
            testCase.description
          );

          caseResult.aiVerdictSIF = result.sif_potential;
          caseResult.aiPredictedLSR =
            result.lsr_tags && result.lsr_tags.length > 0
              ? result.lsr_tags[0]
              : null;
          caseResult.riskBand = result.risk_band;
          caseResult.confidence = result.sif_confidence;
          caseResult.latency_ms = latency_ms;
          caseResult.evidence_spans = result.evidence_spans || [];
          caseResult.guardrailsTriggered = rule_overrides
            .filter((r) => r.triggered)
            .map((r) => r.rule);
        } catch (err: unknown) {
          caseResult.error =
            err instanceof Error ? err.message : "Unknown error";
        }

        controller.enqueue(
          encoder.encode(JSON.stringify(caseResult) + "\n")
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-store",
    },
  });
}
