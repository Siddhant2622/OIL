/**
 * SIF Sentinel — WhatsApp Webhook Handler
 *
 * Supports:
 * - GET: Meta Cloud API webhook verification handshake
 * - POST: Inbound WhatsApp messages from Twilio or Meta Cloud API
 *
 * Capabilities:
 * 1. "Hi" / "Hello" -> sends Google account linking verification link if unlinked, or greeting & menu if linked.
 * 2. "Status" -> shows worker their recent submitted reports and AI findings.
 * 3. Text & Photo -> logs Unsafe Act / Unsafe Condition / Near Miss report with attachments,
 *    triggers Google Gemini 2.5 SIF pipeline, and alerts Supervisor & HSE via WhatsApp!
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage, normalizePhoneNumber } from "@/lib/whatsapp/client";
import { generatePhoneLinkToken } from "@/lib/whatsapp/auth";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import type { ReportType } from "@/types/database";

/**
 * Meta Cloud API Verification Handshake (GET)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "sif-sentinel-verify";

  if (mode === "subscribe" && token === expectedToken) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Verification token mismatch", { status: 403 });
}

/**
 * Inbound WhatsApp Message Handler (POST)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let senderPhone = "";
    let messageBody = "";
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    // ── 1. Parse Inbound Payload (Twilio or Meta) ───────────────────────────
    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Twilio standard form-encoded webhook
      const rawText = await request.text();
      const params = new URLSearchParams(rawText);
      senderPhone = params.get("From") || "";
      messageBody = params.get("Body") || "";
      mediaUrl = params.get("MediaUrl0") || undefined;
      mediaType = params.get("MediaContentType0") || undefined;
    } else {
      // JSON payload (Meta Cloud API or Twilio JSON format)
      const json = await request.json().catch(() => ({}));

      if (json.From) {
        // Twilio JSON
        senderPhone = json.From;
        messageBody = json.Body || "";
        mediaUrl = json.MediaUrl0 || undefined;
        mediaType = json.MediaContentType0 || undefined;
      } else if (json.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        // Meta Cloud API
        const msg = json.entry[0].changes[0].value.messages[0];
        senderPhone = msg.from || "";
        if (msg.type === "text") {
          messageBody = msg.text?.body || "";
        } else if (msg.type === "image") {
          messageBody = msg.image?.caption || "";
          mediaUrl = msg.image?.id ? `https://graph.facebook.com/v18.0/${msg.image.id}` : undefined;
          mediaType = msg.image?.mime_type || "image/jpeg";
        } else if (msg.type === "document") {
          messageBody = msg.document?.caption || "";
          mediaUrl = msg.document?.id ? `https://graph.facebook.com/v18.0/${msg.document.id}` : undefined;
          mediaType = msg.document?.mime_type || "application/pdf";
        }
      }
    }

    if (!senderPhone) {
      return NextResponse.json({ ok: true, note: "No sender found or delivery receipt" });
    }

    const cleanPhone = normalizePhoneNumber(senderPhone);
    const cleanText = messageBody.trim();
    const admin = createAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oilgas-pied.vercel.app";

    // ── 2. Check if Sender is Registered and Linked ─────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("*, organizations(id, name, slug)")
      .eq("phone", cleanPhone)
      .eq("is_active", true)
      .single();

    const isVerified = Boolean(profile && profile.whatsapp_verified);

    // ── 3. Flow A: Greeting / Help ("Hi", "Hello", "Start", "Menu") ────────
    const isGreeting = /^(hi|hello|hey|start|menu|help|namaste)/i.test(cleanText);

    if (isGreeting || !cleanText) {
      if (!isVerified) {
        // Generate single-use secure link to Google Sign In
        const token = await generatePhoneLinkToken(cleanPhone);
        const linkUrl = `${appUrl}/link-phone?token=${token}`;

        await sendWhatsAppMessage({
          to: cleanPhone,
          body: [
            `👋 *Welcome to SIF Sentinel (Oil India Safety Engine)*`,
            ``,
            `Your WhatsApp number is not yet linked to an active employee profile.`,
            ``,
            `🔗 *Tap below to sign in with your corporate Google Account:*`,
            linkUrl,
            ``,
            `Once verified, you will be able to submit safety observations (text + photos) and receive real-time SIF precursor alerts directly in this chat.`,
          ].join("\n"),
        });

        return NextResponse.json({ ok: true, action: "sent_link" });
      }

      // Verified Worker Greeting
      const orgName = (profile as any)?.organizations?.name || "Oil India Limited";
      await sendWhatsAppMessage({
        to: cleanPhone,
        body: [
          `👋 *Welcome back, ${profile?.full_name || "Safety Officer"}!*`,
          `🏢 *${orgName}* | ${profile?.department || "Field Operations"}`,
          ``,
          `*How can we help keep your site safe today?*`,
          `📝 *Report an Issue:* Simply describe the unsafe act, unsafe condition, or near miss.`,
          `📷 *Add Photos/PDFs:* You can attach photos or documents directly with your message.`,
          ``,
          `*Quick Commands:*`,
          `• *Status* — Check your recently logged reports`,
          `• *Dashboard* — Open the full safety analytics portal`,
        ].join("\n"),
      });

      return NextResponse.json({ ok: true, action: "sent_menu" });
    }

    // ── 4. Flow B: Status Inquiry ("Status", "Reports") ──────────────────────
    if (/^(status|reports|my reports)/i.test(cleanText)) {
      if (!isVerified) {
        const token = await generatePhoneLinkToken(cleanPhone);
        await sendWhatsAppMessage({
          to: cleanPhone,
          body: `⚠️ Please link your corporate Google account first:\n${appUrl}/link-phone?token=${token}`,
        });
        return NextResponse.json({ ok: true, action: "unauthorized" });
      }

      const { data: recentReports } = await admin
        .from("reports")
        .select("report_code, report_type, status, created_at, id")
        .eq("reporter_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!recentReports || recentReports.length === 0) {
        await sendWhatsAppMessage({
          to: cleanPhone,
          body: `ℹ️ You have not submitted any safety reports yet.\n\nTo report a hazard or near miss right now, simply describe it in a message!`,
        });
        return NextResponse.json({ ok: true, action: "no_reports" });
      }

      const reportLines = recentReports.map(
        (r) =>
          `• *${r.report_code}* (${r.report_type.replace(/_/g, " ")})\n  Status: _${r.status}_\n  Link: ${appUrl}/reports/${r.id}`
      );

      await sendWhatsAppMessage({
        to: cleanPhone,
        body: [`📋 *Your Recent Safety Reports:*`, ``, ...reportLines].join("\n"),
      });

      return NextResponse.json({ ok: true, action: "sent_status" });
    }

    // ── 5. Flow C: Incident Report Submission (Text + Optional Media) ────────
    if (!isVerified) {
      const token = await generatePhoneLinkToken(cleanPhone);
      await sendWhatsAppMessage({
        to: cleanPhone,
        body: [
          `⚠️ *Authentication Required*`,
          ``,
          `To submit this safety report, please link your corporate Google Account first:`,
          `${appUrl}/link-phone?token=${token}`,
          ``,
          `Once verified, your observations are protected under strict company isolation.`,
        ].join("\n"),
      });
      return NextResponse.json({ ok: true, action: "prompt_auth" });
    }

    // Classify category by narrative cues
    let reportType: ReportType = "NEAR_MISS";
    const lower = cleanText.toLowerCase();
    if (/act|violation|behavior|ppe|harness|bypass/i.test(lower)) {
      reportType = "UNSAFE_ACT";
    } else if (/condition|leak|spill|pressure|corrosion|wire|valve|hazard|guard/i.test(lower)) {
      reportType = "UNSAFE_CONDITION";
    } else if (/incident|injury|hurt|burn|fall|fire|explosion|blowout/i.test(lower)) {
      reportType = "INCIDENT";
    }

    // Sequential report code generator
    const { count } = await admin
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("org_id", profile.org_id);

    const seq = (count ?? 0) + 1;
    const year = new Date().getFullYear();
    const orgSlug = (profile as any)?.organizations?.slug || "OIL";
    const prefix = orgSlug.toUpperCase().slice(0, 6);
    const reportCode = `${prefix}-${year}-${String(seq).padStart(6, "0")}`;

    // Attachments
    const attachments = mediaUrl
      ? [
          {
            name: "whatsapp_evidence.jpg",
            type: mediaType || "image/jpeg",
            url: mediaUrl,
          },
        ]
      : [];

    // Insert Report
    const { data: report, error: reportErr } = await admin
      .from("reports")
      .insert({
        org_id: profile.org_id,
        report_code: reportCode,
        reporter_id: profile.id,
        site_id: profile.site_id,
        report_type: reportType,
        occurred_at: new Date().toISOString(),
        description: cleanText || "Photo report submitted via WhatsApp",
        source: "WHATSAPP",
        attachments,
        status: "SUBMITTED",
      })
      .select("*")
      .single();

    if (reportErr || !report) {
      console.error("[whatsapp:webhook] Insert error:", reportErr?.message);
      await sendWhatsAppMessage({
        to: cleanPhone,
        body: `❌ Failed to log report into system. Please try again or open the web dashboard: ${appUrl}/reports/new`,
      });
      return NextResponse.json({ error: "Failed to insert report" }, { status: 500 });
    }

    // Immediate confirmation on WhatsApp that report is received
    await sendWhatsAppMessage({
      to: cleanPhone,
      body: [
        `⏳ *Observation Received!*`,
        `Report Code: *${reportCode}*`,
        `Analyzing potential SIF precursors with Gemini AI...`,
      ].join("\n"),
    });

    // Run AI Analysis Pipeline
    let aiSummary = "";
    try {
      const aiResult = await runAnalysisPipeline({
        report,
        reporter: profile,
      });

      aiSummary = [
        `✅ *Safety Report Logged Successfully!*`,
        ``,
        `📋 *Report Code:* ${reportCode}`,
        `🏷️ *Category:* ${reportType.replace(/_/g, " ")}`,
        `⚠️ *Risk Band:* ${aiResult.risk_band || "EVALUATED"}`,
        aiResult.sif_potential
          ? `🚨 *SIF Precursor Flagged:* Yes — Potential for severe injury or fatality!`
          : `ℹ️ *SIF Precursor:* No precursor detected.`,
        ``,
        aiResult.risk_band === "CRITICAL" || aiResult.risk_band === "HIGH"
          ? `🔔 *Action Taken:* Your Rig Supervisor & HSE Manager have received immediate WhatsApp alerts.`
          : `📋 *Action Taken:* Routed to supervisor for review and closure.`,
        ``,
        `🔗 *View Full Report & Evidence:*`,
        `${appUrl}/reports/${report.id}`,
      ].join("\n");
    } catch (aiErr: any) {
      console.error("[whatsapp:ai] Pipeline error:", aiErr?.message);
      aiSummary = `✅ *Safety Report Logged: ${reportCode}*\nYour report has been queued for supervisor review.\nTrack here: ${appUrl}/reports/${report.id}`;
    }

    // Send final AI summary to worker
    await sendWhatsAppMessage({
      to: cleanPhone,
      body: aiSummary,
    });

    return NextResponse.json({ ok: true, report_code: reportCode });
  } catch (err: any) {
    console.error("[whatsapp:webhook] Unhandled exception:", err?.message);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
