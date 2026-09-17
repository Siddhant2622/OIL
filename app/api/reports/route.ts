import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import { z } from "zod";

const schema = z.object({
  report_type: z.enum(["UNSAFE_ACT", "UNSAFE_CONDITION", "NEAR_MISS", "INCIDENT"]),
  occurred_at: z.string(),
  location_text: z.string().optional(),
  activity_text: z.string().optional(),
  description: z.string().min(40),
  immediate_action: z.string().optional(),
  reported_severity: z.string().optional(),
  contractor: z.string().optional(),
  shift: z.string().optional(),
  site_id: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        size: z.number().optional(),
        url: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Get full reporter profile
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Generate sequential report code
  const { count } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("org_id", profile.org_id);

  const { data: org } = await admin
    .from("organizations")
    .select("slug")
    .eq("id", profile.org_id)
    .single();

  const seq = (count ?? 0) + 1;
  const year = new Date().getFullYear();
  const prefix = (org?.slug ?? "RPT").toUpperCase().slice(0, 6);
  const report_code = `${prefix}-${year}-${String(seq).padStart(6, "0")}`;

  const { data: report, error } = await admin
    .from("reports")
    .insert({
      org_id: profile.org_id,
      report_code,
      reporter_id: user.id,
      site_id: parsed.data.site_id ?? profile.site_id ?? null,
      report_type: parsed.data.report_type,
      occurred_at: parsed.data.occurred_at,
      location_text: parsed.data.location_text ?? null,
      activity_text: parsed.data.activity_text ?? null,
      description: parsed.data.description,
      immediate_action: parsed.data.immediate_action ?? null,
      reported_severity: parsed.data.reported_severity ?? null,
      contractor: parsed.data.contractor ?? null,
      shift: parsed.data.shift ?? null,
      attachments: parsed.data.attachments ?? [],
      source: "WEB",
      status: "SUBMITTED",
    })
    .select("*")
    .single();

  if (error || !report) {
    console.error("[reports POST] Insert failed:", error?.message);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }

  // Audit report creation
  await admin.from("audit_log").insert({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "REPORT_CREATED",
    entity: "reports",
    entity_id: report.id,
    meta: { report_code, report_type: parsed.data.report_type },
  });

  // Directly scan the uploaded report with AI
  let analysisResult: Awaited<ReturnType<typeof runAnalysisPipeline>> | null = null;
  try {
    analysisResult = await runAnalysisPipeline({
      report,
      reporter: profile,
    });
  } catch (scanErr) {
    console.error("[reports POST] Direct AI scan exception:", scanErr);
  }

  return NextResponse.json({
    id: report.id,
    report_code: report.report_code,
    analyzed: analysisResult?.success ?? false,
    analysis_id: analysisResult?.analysis_id ?? null,
    risk_band: analysisResult?.risk_band ?? null,
    sif_potential: analysisResult?.sif_potential ?? false,
    is_sensitive: analysisResult?.is_sensitive ?? false,
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = (page - 1) * limit;

  // Use the user's Supabase client — RLS automatically scopes results
  const { data, count, error } = await supabase
    .from("reports")
    .select("*, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, limit });
}
