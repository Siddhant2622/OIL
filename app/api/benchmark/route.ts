import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyseReport } from "@/lib/ai/gemini";
import { applyGuardrails } from "@/lib/ai/guardrails";

export interface BenchmarkRunRequest {
  cases: {
    id: string;
    description: string;
    category: string;
  }[];
}

export interface BenchmarkCaseResult {
  id: string;
  aiVerdictSIF: boolean;
  aiPredictedLSR: string | null;
  riskBand: string;
  guardrailsTriggered: string[];
  confidence: number;
  latency_ms: number;
  error?: string;
}

/**
 * POST /api/benchmark
 * Runs the real Gemini + guardrails pipeline for each test case.
 * Server-only — GEMINI_API_KEY never leaves the server.
 * Returns streaming NDJSON: one JSON object per line, one per case.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BenchmarkRunRequest;
  const cases = body?.cases;

  if (!Array.isArray(cases) || cases.length === 0) {
    return NextResponse.json(
      { error: "cases array required" },
      { status: 400 }
    );
  }

  if (cases.length > 20) {
    return NextResponse.json(
      { error: "Maximum 20 benchmark cases per run" },
      { status: 400 }
    );
  }

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
