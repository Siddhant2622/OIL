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

  const userEmail = (user.email ?? "").toLowerCase().trim();

  // ── Step 3: Look up existing profile ──────────────────────────────────────
  let { data: profile } = await admin
    .from("profiles")
    .select("id, org_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // If not found by auth user.id, check by verified email (e.g. pre-provisioned employee)
  if (!profile && userEmail) {
    const { data: profileByEmail } = await admin
      .from("profiles")
      .select("id, org_id, role, is_active")
      .ilike("email", userEmail)
      .maybeSingle();

    if (profileByEmail) {
      if (profileByEmail.id !== user.id) {
        await admin
          .from("profiles")
          .update({ id: user.id })
          .eq("id", profileByEmail.id);
        profileByEmail.id = user.id;
      }
      profile = profileByEmail;
    }
  }

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
  let { data: inv } = await admin
    .from("invitations")
    .select("*")
    .ilike("email", userEmail)
    .eq("status", "PENDING")
    .gt("expires_at", now)
    .limit(1)
    .maybeSingle();

  // If exact match not found and it's Gmail, also check dot-normalized variations
  // (e.g. j.sharma@gmail.com matches jsharma@gmail.com)
  if (!inv && (userEmail.endsWith("@gmail.com") || userEmail.endsWith("@googlemail.com"))) {
    const [localPart] = userEmail.split("@");
    const dotFree = localPart.replace(/\./g, "");

    const { data: pendingInvites } = await admin
      .from("invitations")
      .select("*")
      .eq("status", "PENDING")
      .gt("expires_at", now);

    if (pendingInvites) {
      inv = pendingInvites.find((cand) => {
        const cEmail = (cand.email ?? "").toLowerCase().trim();
        if (cEmail.endsWith("@gmail.com") || cEmail.endsWith("@googlemail.com")) {
          const [cLocal] = cEmail.split("@");
          return cLocal.replace(/\./g, "") === dotFree;
        }
        return false;
      }) ?? null;
    }
  }

  if (inv) {
    // Check if a profile already exists with this email or user.id
    const { data: existingProf } = await admin
      .from("profiles")
      .select("id")
      .or(`id.eq.${user.id},email.ilike.${userEmail}`)
      .limit(1)
      .maybeSingle();

    const profileData = {
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
    };

    let profileError: any = null;
    if (existingProf) {
      const { error: updErr } = await admin
        .from("profiles")
        .update(profileData)
        .eq("id", existingProf.id);
      profileError = updErr;
    } else {
      const { error: insErr } = await admin
        .from("profiles")
        .insert(profileData);
      profileError = insErr;
    }

    if (profileError) {
      console.error(
        "[auth/callback] Profile creation/update failed:",
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
      .maybeSingle();

    if (matchingOrg) {
      params.set("org_hint", matchingOrg.name);
    }
  }

  return NextResponse.redirect(
    `${origin}/not-registered?${params.toString()}`
  );
}
