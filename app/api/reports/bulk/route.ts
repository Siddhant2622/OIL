import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CsvRow {
  report_type?: string;
  occurred_at?: string;
  description?: string;
  location_text?: string;
  activity_text?: string;
  immediate_action?: string;
  reported_severity?: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    if (row.description) rows.push(row as CsvRow);
  }
  return rows;
}

const VALID_TYPES = new Set(["UNSAFE_ACT", "UNSAFE_CONDITION", "NEAR_MISS", "INCIDENT"]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("org_id, role, site_id").eq("id", user.id).single();

  if (!profile || !["ORG_ADMIN", "HSE_MANAGER"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const text = await file.text();
  const rows = parseCsv(text);

  if (!rows.length) return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });

  const { data: org } = await admin.from("organizations").select("slug").eq("id", profile.org_id).single();
  const { count } = await admin.from("reports").select("*", { count: "exact", head: true }).eq("org_id", profile.org_id);

  const created: string[] = [];
  const errors: string[] = [];
  let seq = (count ?? 0) + 1;
  const year = new Date().getFullYear();
  const prefix = (org?.slug ?? "RPT").toUpperCase().slice(0, 6);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const report_type = (row.report_type ?? "UNSAFE_ACT").toUpperCase();
    if (!VALID_TYPES.has(report_type)) {
      errors.push(`Row ${rowNum}: Invalid report_type "${row.report_type}"`);
      continue;
    }

    const description = row.description ?? "";
    if (description.length < 10) {
      errors.push(`Row ${rowNum}: Description too short (min 10 chars)`);
      continue;
    }

    const report_code = `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
    const occurred_at = row.occurred_at
      ? new Date(row.occurred_at).toISOString()
      : new Date().toISOString();

    const { data: inserted, error } = await admin.from("reports").insert({
      org_id: profile.org_id,
      report_code,
      reporter_id: user.id,
      site_id: profile.site_id ?? null,
      report_type,
      occurred_at,
      location_text: row.location_text ?? null,
      activity_text: row.activity_text ?? null,
      description,
      immediate_action: row.immediate_action ?? null,
      reported_severity: row.reported_severity ?? null,
      source: "CSV",
      status: "SUBMITTED",
    }).select("id").single();

    if (error) {
      errors.push(`Row ${rowNum}: ${error.message}`);
    } else {
      created.push(inserted.id);
      seq++;
    }
  }

  // Audit
  await admin.from("audit_log").insert({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "BULK_UPLOAD",
    meta: { total: rows.length, created: created.length, errors: errors.length, file: file.name },
  });

  return NextResponse.json({
    total: rows.length,
    created: created.length,
    report_ids: created,
    errors,
  });
}
