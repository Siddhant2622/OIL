/**
 * tests/rls.test.ts
 *
 * SIF Sentinel — Row Level Security Isolation Test Suite
 *
 * Strictly tests Postgres RLS by:
 * 1. Provisioning two separate organizations (Org Alpha, Org Beta) and test users via Service Role.
 * 2. Authenticating as real users via Supabase Auth to obtain valid, scoped JWT sessions.
 * 3. Issuing queries with restricted client instances subject to Postgres RLS policies.
 * 4. Strictly verifying that cross-tenant access returns 0 rows and mutations are blocked.
 * 5. Verifying intra-org role isolation (EMPLOYEE cannot see peer reports).
 * 6. Cleaning up all fixture data in a finally block.
 *
 * Run: npm run test:rls
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be set."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  console.log("\n=== SIF Sentinel Genuine RLS Isolation Test Suite ===\n");

  const nonce = Date.now();
  const cleanupUserIds: string[] = [];
  const cleanupOrgIds: string[] = [];
  const cleanupReportIds: string[] = [];

  try {
    // ── Setup: Create Org Alpha and Org Beta ──────────────────────────────────
    console.log("Setting up test organizations and users via Service Role...");

    const { data: orgA, error: errA } = await admin
      .from("organizations")
      .insert({
        name: `RLS Test Org Alpha ${nonce}`,
        slug: `rls-test-alpha-${nonce}`,
      })
      .select()
      .single();

    const { data: orgB, error: errB } = await admin
      .from("organizations")
      .insert({
        name: `RLS Test Org Beta ${nonce}`,
        slug: `rls-test-beta-${nonce}`,
      })
      .select()
      .single();

    if (errA || errB || !orgA || !orgB) {
      throw new Error(`Failed to create test organizations: ${errA?.message || errB?.message}`);
    }
    cleanupOrgIds.push(orgA.id, orgB.id);

    // ── Setup: Create Authenticated Users ─────────────────────────────────────
    const password = `TestPass!${nonce}`;
    const emailAdminA = `org-a-admin-${nonce}@sif-test.internal`;
    const emailAdminB = `org-b-admin-${nonce}@sif-test.internal`;
    const emailEmp1A = `org-a-emp1-${nonce}@sif-test.internal`;
    const emailEmp2A = `org-a-emp2-${nonce}@sif-test.internal`;

    const { data: authAdminA } = await admin.auth.admin.createUser({
      email: emailAdminA,
      password,
      email_confirm: true,
    });
    const { data: authAdminB } = await admin.auth.admin.createUser({
      email: emailAdminB,
      password,
      email_confirm: true,
    });
    const { data: authEmp1A } = await admin.auth.admin.createUser({
      email: emailEmp1A,
      password,
      email_confirm: true,
    });
    const { data: authEmp2A } = await admin.auth.admin.createUser({
      email: emailEmp2A,
      password,
      email_confirm: true,
    });

    if (!authAdminA?.user || !authAdminB?.user || !authEmp1A?.user || !authEmp2A?.user) {
      throw new Error("Failed to create test auth users");
    }

    cleanupUserIds.push(
      authAdminA.user.id,
      authAdminB.user.id,
      authEmp1A.user.id,
      authEmp2A.user.id
    );

    // Insert profiles for each user
    await admin.from("profiles").insert([
      {
        id: authAdminA.user.id,
        org_id: orgA.id,
        email: emailAdminA,
        full_name: "Alpha Admin",
        role: "ORG_ADMIN",
      },
      {
        id: authAdminB.user.id,
        org_id: orgB.id,
        email: emailAdminB,
        full_name: "Beta Admin",
        role: "ORG_ADMIN",
      },
      {
        id: authEmp1A.user.id,
        org_id: orgA.id,
        email: emailEmp1A,
        full_name: "Alpha Employee 1",
        role: "EMPLOYEE",
      },
      {
        id: authEmp2A.user.id,
        org_id: orgA.id,
        email: emailEmp2A,
        full_name: "Alpha Employee 2",
        role: "EMPLOYEE",
      },
    ]);

    // ── Setup: Insert Fixture Records ─────────────────────────────────────────
    // Report in Org A (submitted by Employee 1)
    const { data: reportA, error: errRepA } = await admin
      .from("reports")
      .insert({
        org_id: orgA.id,
        report_code: `OIL-A-${nonce}`,
        reporter_id: authEmp1A.user.id,
        report_type: "UNSAFE_ACT",
        occurred_at: new Date().toISOString(),
        description: "Alpha confidential crane hoist near miss.",
        status: "SUBMITTED",
      })
      .select()
      .single();

    // Report in Org B (submitted by Beta Admin)
    const { data: reportB, error: errRepB } = await admin
      .from("reports")
      .insert({
        org_id: orgB.id,
        report_code: `OIL-B-${nonce}`,
        reporter_id: authAdminB.user.id,
        report_type: "UNSAFE_CONDITION",
        occurred_at: new Date().toISOString(),
        description: "Beta confidential offshore separator corrosion.",
        status: "SUBMITTED",
      })
      .select()
      .single();

    if (!reportA || !reportB) {
      throw new Error(`Failed to insert fixture reports: ${errRepA?.message || errRepB?.message}`);
    }
    cleanupReportIds.push(reportA.id, reportB.id);

    // AI Analysis in Org B
    const { data: analysisB, error: errAnalB } = await admin
      .from("ai_analyses")
      .insert({
        org_id: orgB.id,
        report_id: reportB.id,
        model: "gemini-2.5-flash",
        prompt_version: "v1.0",
        sif_potential: true,
        risk_band: "CRITICAL",
        sif_confidence: 0.95,
        energy_source: "Pressure",
        hazard: "High pressure gas release",
        activity: "Separator inspection",
        evidence_spans: ["separator corrosion"],
        needs_human_review: false,
      })
      .select()
      .single();

    if (errAnalB) {
      console.warn("Notice: AI analysis fixture warning:", errAnalB.message);
    }

    // CAPA Action in Org B
    const { data: actionB, error: errActB } = await admin
      .from("actions")
      .insert({
        org_id: orgB.id,
        report_id: reportB.id,
        assigned_to: authAdminB.user.id,
        created_by: authAdminB.user.id,
        title: "Beta emergency valve repair",
        priority: "HIGH",
        status: "OPEN",
      })
      .select()
      .single();

    if (errActB) {
      console.warn("Notice: Action fixture warning:", errActB.message);
    }

    // Notification in Org B
    const { data: notificationB } = await admin
      .from("notifications")
      .insert({
        org_id: orgB.id,
        user_id: authAdminB.user.id,
        type: "CRITICAL_ALERT",
        title: "Beta SIF alert",
        body: "Confidential notification for Beta Admin",
      })
      .select()
      .single();

    // ── Authenticate User Clients (RLS Enforced) ─────────────────────────────
    console.log("Authenticating test users with Supabase Auth to obtain scoped JWTs...\n");

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    // Client for Org Alpha Admin
    const { data: sessionAdminA } = await authClient.auth.signInWithPassword({
      email: emailAdminA,
      password,
    });
    const tokenAdminA = sessionAdminA?.session?.access_token;
    if (!tokenAdminA) throw new Error("Failed to obtain session for Alpha Admin");
    const clientAdminA = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${tokenAdminA}` } },
    });

    // Client for Org Alpha Employee 2
    const { data: sessionEmp2A } = await authClient.auth.signInWithPassword({
      email: emailEmp2A,
      password,
    });
    const tokenEmp2A = sessionEmp2A?.session?.access_token;
    if (!tokenEmp2A) throw new Error("Failed to obtain session for Alpha Employee 2");
    const clientEmp2A = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${tokenEmp2A}` } },
    });

    // ── Test 1: Cross-Org Reports Read Isolation ─────────────────────────────
    console.log("1. Cross-Org Reports Read Isolation");

    // Alpha Admin querying Org A reports -> should see report A
    const { data: alphaOwnReports } = await clientAdminA
      .from("reports")
      .select("id, org_id")
      .eq("id", reportA.id);
    assert(
      (alphaOwnReports ?? []).length === 1 && alphaOwnReports![0].id === reportA.id,
      "Org A user CAN read Org A reports",
      `Expected 1 row, got ${(alphaOwnReports ?? []).length}`
    );

    // Alpha Admin querying Org B report directly by primary key -> MUST return 0 rows
    const { data: alphaReadBetaDirect } = await clientAdminA
      .from("reports")
      .select("id, org_id")
      .eq("id", reportB.id);
    assert(
      (alphaReadBetaDirect ?? []).length === 0,
      "Org A user CANNOT read Org B report directly by ID (RLS returns 0 rows)",
      `Expected 0 rows, got ${(alphaReadBetaDirect ?? []).length}`
    );

    // Alpha Admin querying all visible reports -> MUST NOT contain any Org B reports
    const { data: alphaAllReports } = await clientAdminA
      .from("reports")
      .select("id, org_id");
    const leakedBetaReports = (alphaAllReports ?? []).filter((r) => r.org_id === orgB.id);
    assert(
      leakedBetaReports.length === 0,
      "Org A user query on all reports leaks 0 rows from Org B",
      `Leaked ${leakedBetaReports.length} rows`
    );

    // ── Test 2: Cross-Org AI Analyses Isolation ──────────────────────────────
    console.log("\n2. Cross-Org AI Analyses Isolation");

    if (analysisB) {
      const { data: alphaReadAnalysisB } = await clientAdminA
        .from("ai_analyses")
        .select("id, org_id")
        .eq("id", analysisB.id);
      assert(
        (alphaReadAnalysisB ?? []).length === 0,
        "Org A user CANNOT read Org B AI analysis (RLS returns 0 rows)",
        `Expected 0 rows, got ${(alphaReadAnalysisB ?? []).length}`
      );
    } else {
      assert(false, "Org B AI analysis fixture missing");
    }

    // ── Test 3: Cross-Org CAPA Actions Isolation ─────────────────────────────
    console.log("\n3. Cross-Org CAPA Actions Isolation");

    if (actionB) {
      const { data: alphaReadActionB } = await clientAdminA
        .from("actions")
        .select("id, org_id")
        .eq("id", actionB.id);
      assert(
        (alphaReadActionB ?? []).length === 0,
        "Org A user CANNOT read Org B CAPA action (RLS returns 0 rows)",
        `Expected 0 rows, got ${(alphaReadActionB ?? []).length}`
      );
    } else {
      assert(false, "Org B Action fixture missing");
    }

    // ── Test 4: Cross-Org Profiles Isolation ─────────────────────────────────
    console.log("\n4. Cross-Org Profiles Isolation");

    const { data: alphaReadBetaProfile } = await clientAdminA
      .from("profiles")
      .select("id, org_id, email")
      .eq("id", authAdminB.user.id);
    assert(
      (alphaReadBetaProfile ?? []).length === 0,
      "Org A user CANNOT view Org B member profiles (RLS returns 0 rows)",
      `Expected 0 rows, got ${(alphaReadBetaProfile ?? []).length}`
    );

    // ── Test 5: Cross-Org Notifications Isolation ────────────────────────────
    console.log("\n5. Cross-Org Notifications Isolation");

    if (notificationB) {
      const { data: alphaReadNotificationB } = await clientAdminA
        .from("notifications")
        .select("id, org_id")
        .eq("id", notificationB.id);
      assert(
        (alphaReadNotificationB ?? []).length === 0,
        "Org A user CANNOT view Org B notifications (RLS returns 0 rows)",
        `Expected 0 rows, got ${(alphaReadNotificationB ?? []).length}`
      );
    }

    // ── Test 6: Cross-Org Write / Mutation Rejection ─────────────────────────
    console.log("\n6. Cross-Org Write / Mutation Rejection");

    // Attempt insert by User A with Org B's org_id -> MUST fail RLS check
    const { error: illegalInsertErr } = await clientAdminA
      .from("reports")
      .insert({
        org_id: orgB.id,
        report_code: `ILLEGAL-A-INTO-B-${nonce}`,
        reporter_id: authAdminA.user.id,
        report_type: "UNSAFE_ACT",
        occurred_at: new Date().toISOString(),
        description: "Illegal cross-tenant insert attempt.",
        status: "SUBMITTED",
      });
    assert(
      illegalInsertErr !== null,
      "Org A user CANNOT insert reports into Org B (rejected by RLS WITH CHECK policy)",
      illegalInsertErr ? `Error: ${illegalInsertErr.message}` : "Unexpectedly succeeded"
    );

    // Attempt update by User A on Org B's report -> MUST affect 0 rows
    const { data: illegalUpdateData } = await clientAdminA
      .from("reports")
      .update({ description: "Compromised by Org A" })
      .eq("id", reportB.id)
      .select();
    assert(
      (illegalUpdateData ?? []).length === 0,
      "Org A user CANNOT update Org B report (0 rows updated by RLS)",
      `Updated ${(illegalUpdateData ?? []).length} rows`
    );

    // ── Test 7: Intra-Org Role Isolation (Employee Peer Visibility) ──────────
    console.log("\n7. Intra-Org Role Isolation (Employee Peer Visibility)");

    // In Org A: reportA was submitted by Employee 1.
    // Employee 2 (not a manager/admin/HSE) attempts to read Employee 1's report:
    const { data: emp2ReadReportA } = await clientEmp2A
      .from("reports")
      .select("id, reporter_id")
      .eq("id", reportA.id);
    assert(
      (emp2ReadReportA ?? []).length === 0,
      "EMPLOYEE cannot see peer employee's report in same organization (spec §7.2)",
      `Expected 0 rows, got ${(emp2ReadReportA ?? []).length}`
    );

  } catch (err: unknown) {
    console.error("\nUnexpected test error:", err instanceof Error ? err.message : err);
    failed++;
  } finally {
    // ── Teardown: Clean Up All Test Entities ──────────────────────────────────
    console.log("\nCleaning up test entities via Service Role...");
    if (cleanupReportIds.length > 0) {
      await admin.from("actions").delete().in("report_id", cleanupReportIds);
      await admin.from("ai_analyses").delete().in("report_id", cleanupReportIds);
      await admin.from("reports").delete().in("id", cleanupReportIds);
    }
    if (cleanupUserIds.length > 0) {
      await admin.from("notifications").delete().in("user_id", cleanupUserIds);
      await admin.from("profiles").delete().in("id", cleanupUserIds);
      for (const uid of cleanupUserIds) {
        await admin.auth.admin.deleteUser(uid);
      }
    }
    if (cleanupOrgIds.length > 0) {
      await admin.from("organizations").delete().in("id", cleanupOrgIds);
    }
    console.log("Cleanup complete.");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(50)}`);
  console.log(`RLS Test Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(50)}\n`);

  if (failed > 0) {
    console.error("❌ RLS isolation tests FAILED. Database security policy violation.");
    process.exit(1);
  } else {
    console.log("✅ All RLS isolation tests PASSED with authentic user sessions.\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Unhandled test runner failure:", err);
  process.exit(1);
});