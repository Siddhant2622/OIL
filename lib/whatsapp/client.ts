/**
 * SIF Sentinel — WhatsApp Bot Client
 * Supports Twilio WhatsApp Sandbox / Production & Meta Cloud API.
 * Includes graceful fallback logging for local development.
 */

import { SendWhatsAppParams, WhatsAppSendResult } from "./types";

/**
 * Normalizes phone numbers to E.164 format (+919876543210)
 */
export function normalizePhoneNumber(raw: string): string {
  let cleaned = raw.trim().replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    // If 10 digits starting with 6, 7, 8, 9, assume India (+91)
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      cleaned = `+91${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
}

/**
 * Send a WhatsApp text message (or with media) via Twilio or Meta Cloud API.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<WhatsAppSendResult> {
  const to = normalizePhoneNumber(params.to);

  // 1. Check Twilio Configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

  if (twilioSid && twilioToken) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const form = new URLSearchParams();
      form.append("To", `whatsapp:${to}`);
      form.append("From", twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`);
      form.append("Body", params.body);

      if (params.mediaUrl) {
        form.append("MediaUrl", params.mediaUrl);
      }

      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        console.warn("[whatsapp:twilio] Send failed:", data?.message || res.statusText);
        return { success: false, error: data?.message || "Twilio API error" };
      }

      return { success: true, messageId: data?.sid };
    } catch (err: any) {
      console.error("[whatsapp:twilio] Exception:", err?.message);
      return { success: false, error: err?.message };
    }
  }

  // 2. Check Meta Cloud API Configuration
  const metaToken = process.env.META_WHATSAPP_TOKEN;
  const metaPhoneId = process.env.META_PHONE_NUMBER_ID;

  if (metaToken && metaPhoneId) {
    try {
      const endpoint = `https://graph.facebook.com/v18.0/${metaPhoneId}/messages`;
      const recipientDigits = to.replace(/^\+/, "");

      const payload: Record<string, any> = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientDigits,
        type: "text",
        text: {
          preview_url: true,
          body: params.body,
        },
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        console.warn("[whatsapp:meta] Send failed:", data?.error?.message || res.statusText);
        return { success: false, error: data?.error?.message || "Meta API error" };
      }

      return { success: true, messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
      console.error("[whatsapp:meta] Exception:", err?.message);
      return { success: false, error: err?.message };
    }
  }

  // 3. Fallback Development Simulation Mode
  console.log(
    `[whatsapp:dev-simulated] To: ${to}\nMessage:\n${params.body}\n${params.mediaUrl ? `Media: ${params.mediaUrl}\n` : ""}`
  );

  return { success: true, simulated: true };
}
