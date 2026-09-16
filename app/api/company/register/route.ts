import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().min(2),
  industry: z.string().min(1),
  country: z.string().min(1),
  domain: z.string().optional(),
  admin_designation: z.string().min(1),
});

// Default Life-Saving Rules config seeded for every new org
const DEFAULT_LSR_CONFIG = {
  life_saving_rules: [
    "Bypassing Safety Controls",
    "Confined Space",
    "Driving",
    "Energy Isolation",
    "Hot Work",
    "Line of Fire",
    "Safe Mechanical Lifting",
    "Work Authorisation",
    "Working at Height",
  ],
  risk_thresholds: {
    sif_confidence_for_review: 0.65,
    alert_barrier_failures_within_days: 30,
    alert_barrier_failures_min_count: 2,
  },
};

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
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { company_name, industry, country, domain, admin_designation } = parsed.data;
  const admin = createAdminClient();

  // Check caller doesn't already have a profile
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existingProfile) {
    return NextResponse.json(
      { error: "You are already registered with a company." },
      { status: 409 }
    );
  }

  // Generate unique slug
  let slug = slugify(company_name);
  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Create organization
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: company_name,
      slug,
      domain: domain || null,
      industry,
      country,
      created_by: user.id,
      settings: DEFAULT_LSR_CONFIG,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("[register-company] Org creation failed:", orgError?.message);
    return NextResponse.json(
      { error: "Failed to create organisation." },
      { status: 500 }
    );
  }

  // Create ORG_ADMIN profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    org_id: org.id,
    email: (user.email ?? "").toLowerCase(),
    full_name: user.user_metadata?.full_name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    role: "ORG_ADMIN",
    manager_id: null,
    designation: admin_designation,
    is_active: true,
  });

  if (profileError) {
    console.error("[register-company] Profile creation failed:", profileError.message);
    // Rollback org
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json(
      { error: "Failed to create profile." },
      { status: 500 }
    );
  }

  // Seed a default "HQ" site
  await admin.from("sites").insert({
    org_id: org.id,
    name: "Headquarters",
    site_type: "Field Office",
  });

  // Audit log
  await admin.from("audit_log").insert({
    org_id: org.id,
    actor_id: user.id,
    action: "COMPANY_REGISTERED",
    entity: "organizations",
    entity_id: org.id,
    meta: { name: company_name, slug, industry },
  });

  return NextResponse.json({ ok: true, org_id: org.id });
}
