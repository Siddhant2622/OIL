import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * /auth/callback — Google OAuth code exchange + profile routing.
 *
 * Decision tree (spec §4):
 * 1. Exchange code for session
 * 2. Look up profiles by auth.users.id
 *    a. Found + is_active=true  → /dashboard (role router)
 *    b. Found + is_active=false → /deactivated
 * 3. Not found → look up pending invitation by email
 *    a. Found invitation → create profile, accept invitation, → /onboarding/profile
 * 4. No invitation → /not-registered
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    console.error("[auth/callback] OAuth error:", oauthError);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // ── Step 1: Exchange code for session ─────────────────────────────────────
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "[auth/callback] Code exchange failed:",
      exchangeError.message
    );
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  // ── Step 2: Get authenticated user ────────────────────────────────────────
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "[auth/callback] No user after exchange:",
      userError?.message
    );
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  const userEmail = (user.email ?? "").toLowerCase();

  // ── Step 3: Look up existing profile ──────────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("id, org_id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profile) {
    if (!profile.is_active) {
      return NextResponse.redirect(`${origin}/deactivated`);
    }
    const nextParam = searchParams.get("next");
    if (nextParam && nextParam.startsWith("/")) {
      return NextResponse.redirect(`${origin}${nextParam}`);
    }
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // ── Step 4: Look up pending invitation ────────────────────────────────────
  const now = new Date().toISOString();
  const { data: inv } = await admin
    .from("invitations")
    .select("*")
    .ilike("email", userEmail)
    .eq("status", "PENDING")
    .gt("expires_at", now)
    .limit(1)
    .single();

  if (inv) {
    // Create profile with full hierarchy context from invitation
    const { error: profileError } = await admin.from("profiles").insert({
      id: user.id,
      org_id: inv.org_id,
      email: userEmail,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role: inv.role,
      designation: (inv as any).designation ?? null,
      manager_id: inv.manager_id ?? null,
      site_id: inv.site_id ?? null,
      department: inv.department ?? null,
      is_active: true,
    });

    if (profileError) {
      console.error(
        "[auth/callback] Profile creation failed:",
        profileError.message
      );
      return NextResponse.redirect(
        `${origin}/login?error=profile_creation_failed`
      );
    }

    // Accept invitation
    await admin
      .from("invitations")
      .update({ status: "ACCEPTED" })
      .eq("id", inv.id);

    // Audit
    await admin.from("audit_log").insert({
      org_id: inv.org_id,
      actor_id: user.id,
      action: "USER_REGISTERED_VIA_INVITATION",
      entity: "invitations",
      entity_id: inv.id,
      meta: { email: userEmail, role: inv.role },
    });

    return NextResponse.redirect(`${origin}/onboarding/profile`);
  }

  // ── Step 5: Not registered — check domain hint ────────────────────────────
  const emailDomain = userEmail.split("@")[1] ?? "";
  const params = new URLSearchParams({ email: userEmail });

  if (emailDomain) {
    const { data: matchingOrg } = await admin
      .from("organizations")
      .select("name")
      .eq("domain", emailDomain)
      .single();

    if (matchingOrg) {
      params.set("org_hint", matchingOrg.name);
    }
  }

  return NextResponse.redirect(
    `${origin}/not-registered?${params.toString()}`
  );
}
