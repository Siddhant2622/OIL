import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";

/**
 * POST /api/analyze
 * Body: { report_id: string }
 *
 * SERVER-ONLY — Gemini key never touches the browser.
 * Verifies the caller can see the report, then runs the pipeline.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { report_id } = body as { report_id?: string };

  if (!report_id) {
    return NextResponse.json({ error: "report_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch report using admin (will validate org isolation in pipeline)
  const { data: report, error: reportError } = await admin
    .from("reports")
    .select("*")
    .eq("id", report_id)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Verify caller's profile belongs to same org
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.org_id !== report.org_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check not already analyzed
  if (["ANALYZING", "ANALYZED"].includes(report.status)) {
    return NextResponse.json(
      { error: "Report is already being analyzed" },
      { status: 409 }
    );
  }

  // Run pipeline (async — returns immediately after starting)
  const result = await runAnalysisPipeline({ report, reporter: profile });

  if (!result.success) {
    return NextResponse.json(
      { error: "Analysis failed", details: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, analysis_id: result.analysis_id });
}
