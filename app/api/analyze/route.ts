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

  // Role-based report access enforcement (mirrors RLS visibility rules)
  const role = profile.role as string;
  if (role !== "ORG_ADMIN" && role !== "HSE_MANAGER") {
    if (role === "EMPLOYEE") {
      // Employees can only trigger analysis on their own submissions
      if (report.reporter_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (role === "SUPERVISOR") {
      // Supervisors can analyze reports by anyone in their subtree
      // Walk the reporter's manager chain to verify supervisor is in it
      const { data: reporterProfile } = await admin
        .from("profiles")
        .select("manager_id")
        .eq("id", report.reporter_id)
        .single();

      let managerId = reporterProfile?.manager_id ?? null;
      let authorized = managerId === user.id;
      let depth = 0;

      while (!authorized && managerId && depth < 10) {
        const { data: mgr } = await admin
          .from("profiles")
          .select("manager_id, id")
          .eq("id", managerId)
          .single();
        if (!mgr) break;
        authorized = mgr.id === user.id;
        managerId = mgr.manager_id ?? null;
        depth++;
      }

      if (!authorized) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Atomically claim the report for analysis using Compare-And-Swap (CAS).
  // Strictly permits analysis ONLY if the report is in SUBMITTED or ANALYSIS_FAILED state.
  // Finalized (CLOSED, CONFIRMED_*), active (IN_REVIEW, ACTIONS_OPEN), or already analyzing states are rejected.
  const { data: claimedReport, error: claimError } = await admin
    .from("reports")
    .update({ status: "ANALYZING" })
    .eq("id", report_id)
    .in("status", ["SUBMITTED", "ANALYSIS_FAILED"])
    .select()
    .maybeSingle();

  if (claimError || !claimedReport) {
    return NextResponse.json(
      {
        error:
          "Report cannot be analyzed in its current state (only SUBMITTED or ANALYSIS_FAILED reports can be analyzed)",
      },
      { status: 409 }
    );
  }

  // Run pipeline (async — returns immediately after starting)
  const result = await runAnalysisPipeline({ report: claimedReport, reporter: profile });

  if (!result.success) {
    return NextResponse.json(
      { error: "Analysis failed", details: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, analysis_id: result.analysis_id });
}
