/**
 * SIF Sentinel — WhatsApp Bot & Notification Types
 */

export interface WhatsAppInboundMessage {
  from: string;          // e.g. "+919876543210" or "whatsapp:+919876543210"
  to: string;            // bot's number
  body: string;          // text body
  mediaUrl?: string;     // URL to photo or document if sent
  mediaType?: string;    // image/jpeg, application/pdf, etc.
  rawPayload: unknown;
  provider: "twilio" | "meta";
}

export interface SendWhatsAppParams {
  to: string;            // recipient phone number (with country code e.g. +919876543210)
  body: string;          // message text (supports WhatsApp markdown formatting: *bold*, _italic_, etc.)
  mediaUrl?: string;     // optional image/document attachment link
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}
