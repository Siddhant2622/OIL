import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAndLinkPhone } from "@/lib/whatsapp/auth";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { LoginButton } from "../login/login-button";
import { CheckCircle2, AlertTriangle, ShieldCheck, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Link WhatsApp — SIF Sentinel",
  description: "Connect your WhatsApp number to your SIF Sentinel profile.",
};

export default async function LinkPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params?.token;

  if (!token) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Invalid Request</h2>
        <p className="text-sm text-slate-400 mb-6">
          No verification token was provided. Please text &quot;Hi&quot; to the SIF Sentinel WhatsApp bot to receive a valid authorization link.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
        >
          Return to Sign In
        </Link>
      </div>
    );
  }

  // 1. Check if user is authenticated with Google
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, prompt Google login
  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Connect Your WhatsApp
        </h2>
        <p className="text-sm text-slate-400 text-center mb-6">
          Sign in with your corporate Google account to securely link your WhatsApp number for 1-tap hazard reporting and real-time SIF alerts.
        </p>

        <LoginButton next={`/link-phone?token=${encodeURIComponent(token)}`} />

        <p className="mt-6 text-center text-xs text-slate-500">
          Once signed in, your WhatsApp phone number will be automatically bound to your safety profile and company hierarchy.
        </p>
      </div>
    );
  }

  // 2. User is logged in — verify and link the phone number
  const admin = createAdminClient();
  const linkResult = await verifyAndLinkPhone(token, user.id);

  if (!linkResult.success) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 backdrop-blur-sm shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Link Expired or Invalid</h2>
        <p className="text-sm text-slate-400 mb-6">
          {linkResult.error || "This verification link could not be verified."}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // 3. Fetch profile and company details for confirmation
  const { data: profile } = await admin
    .from("profiles")
    .select("*, organizations(name)")
    .eq("id", user.id)
    .single();

  const orgName = (profile as any)?.organizations?.name || "SIF Sentinel";
  const verifiedPhone = linkResult.phone;

  // 4. Send outbound WhatsApp confirmation
  if (verifiedPhone) {
    sendWhatsAppMessage({
      to: verifiedPhone,
      body: [
        `🎉 *WhatsApp Connected Successfully!*`,
        ``,
        `Hello *${profile?.full_name || "Safety Officer"}*, your WhatsApp is now linked to *${orgName}* (${profile?.role || "EMPLOYEE"}).`,
        ``,
        `📝 *How to report safety issues:*`,
        `Simply send a message describing the unsafe act, condition, or near miss (you can also attach photos or PDFs directly here!).`,
        ``,
        `Our Gemini AI engine will automatically screen for SIF precursors and escalate critical risks to your supervisor.`,
      ].join("\n"),
    }).catch((err) => {
      console.warn("[whatsapp] Post-link confirmation send error:", err?.message);
    });
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 backdrop-blur-sm shadow-2xl text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-950/50">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        WhatsApp Connected!
      </h2>

      <p className="text-sm text-slate-300 mb-4">
        Your phone number{" "}
        <span className="font-mono font-bold text-emerald-400">{verifiedPhone}</span>{" "}
        has been verified and linked to your corporate profile:
      </p>

      <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-400">Name:</span>
          <span className="font-semibold text-white">{profile?.full_name || user.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Company:</span>
          <span className="font-semibold text-white">{orgName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Role:</span>
          <span className="font-mono text-amber-400">{profile?.role}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-900/30"
        >
          <ShieldCheck className="h-4 w-4" />
          Go to Safety Dashboard
        </Link>
        <p className="text-xs text-slate-400">
          You can also switch back to WhatsApp right now to send your first report!
        </p>
      </div>
    </div>
  );
}
