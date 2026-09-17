import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { Resend } from "resend";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR", "EMPLOYEE"]),
  designation: z.string().optional(),
  department: z.string().optional(),
  manager_id: z.string().uuid().optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("profiles")
    .select("id, org_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!caller || !["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to invite" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, role, site_id } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();

  // Check if profile already exists in this org
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("org_id", caller.org_id)
    .eq("email", cleanEmail)
    .single();

  if (existingProfile) {
    return NextResponse.json({ error: "A user with this email already belongs to your organization" }, { status: 409 });
  }

  // Check for pending invitation
  const { data: existingInvite } = await admin
    .from("invitations")
    .select("id")
    .eq("org_id", caller.org_id)
    .eq("email", cleanEmail)
    .eq("status", "PENDING")
    .single();

  if (existingInvite) {
    return NextResponse.json({ error: "An invitation is already pending for this email address" }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: inviteErr } = await admin
    .from("invitations")
    .insert({
      org_id: caller.org_id,
      email: cleanEmail,
      role,
      site_id: site_id ?? null,
      invited_by: caller.id,
      status: "PENDING",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (inviteErr || !invitation) {
    return NextResponse.json({ error: inviteErr?.message ?? "Failed to create invitation" }, { status: 500 });
  }

  // Audit
  await admin.from("audit_log").insert({
    org_id: caller.org_id,
    actor_id: caller.id,
    action: "INVITATION_CREATED",
    entity: "invitations",
    entity_id: invitation.id,
    meta: {
      email: cleanEmail,
      role,
      designation: parsed.data.designation,
      manager_id: parsed.data.manager_id,
    },
  });

  // Optional: dispatch invitation email via Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const fromEmail = process.env.RESEND_FROM_EMAIL || "alerts@resend.dev";

      const { data: org } = await admin
        .from("organizations")
        .select("name")
        .eq("id", caller.org_id)
        .single();

      await resend.emails.send({
        from: fromEmail,
        to: [cleanEmail],
        subject: `You've been invited to ${org?.name ?? "SIF Sentinel"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f172a;">Join ${org?.name ?? "SIF Sentinel"}</h2>
            <p>You have been invited by <strong>${caller.full_name ?? "your administrator"}</strong> to join the SIF Sentinel safety intelligence platform as <strong>${parsed.data.designation ?? role}</strong>.</p>
            <div style="margin: 28px 0;">
              <a href="${appUrl}/login" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Sign in with Google to Accept →
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px;">Please use your Google account associated with <code>${cleanEmail}</code> to automatically complete your onboarding.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("[invitations] Non-fatal email error:", mailErr);
    }
  }

  return NextResponse.json({ success: true, invitation });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!caller || !["ORG_ADMIN", "HSE_MANAGER"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await admin
    .from("invitations")
    .delete()
    .eq("id", id)
    .eq("org_id", caller.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
