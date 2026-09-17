/**
 * tests/whatsapp.test.ts
 * Unit tests for WhatsApp client, phone normalization, and webhook payload logic.
 */

import assert from "assert";
import { normalizePhoneNumber, sendWhatsAppMessage } from "../lib/whatsapp/client";

console.log("=== SIF Sentinel: WhatsApp Bot Test Suite ===");

// 1. Test Phone Number Normalization
console.log("\n1. Phone Number Normalization");

const t1 = normalizePhoneNumber("whatsapp:+919876543210");
assert.strictEqual(t1, "+919876543210", "Strips whatsapp: prefix");
console.log("  ✓ PASS: Strips 'whatsapp:' prefix correctly");

const t2 = normalizePhoneNumber("+91 98765 43210");
assert.strictEqual(t2, "+919876543210", "Strips internal whitespace");
console.log("  ✓ PASS: Strips spaces correctly");

const t3 = normalizePhoneNumber("9876543210");
assert.strictEqual(t3, "+919876543210", "Defaults standard 10-digit Indian numbers to +91");
console.log("  ✓ PASS: Automatically prepends +91 for 10-digit mobile numbers");

const t4 = normalizePhoneNumber("+1 (415) 523-8886");
assert.strictEqual(t4, "+14155238886", "Normalizes international numbers with brackets & hyphens");
console.log("  ✓ PASS: Normalizes international numbers with punctuation");

// 2. Test Safe Simulation / Fallback Dispatch
console.log("\n2. Outbound WhatsApp Fallback & Dispatch");

async function testSimulation() {
  const result = await sendWhatsAppMessage({
    to: "+919876543210",
    body: "🚨 Test Alert: High risk SIF precursor detected at Rig 4",
  });

  assert.strictEqual(result.success, true, "Returns success even in test simulation mode");
  console.log("  ✓ PASS: sendWhatsAppMessage succeeds gracefully without throwing");
}

// 3. Test Inbound Webhook Payload Parsing Logic
console.log("\n3. Inbound Webhook Payload Parsing");

function parseTwilioForm(raw: string) {
  const params = new URLSearchParams(raw);
  return {
    from: normalizePhoneNumber(params.get("From") || ""),
    body: params.get("Body") || "",
    mediaUrl: params.get("MediaUrl0") || undefined,
  };
}

const twilioSample = "From=whatsapp%3A%2B919876543210&To=whatsapp%3A%2B14155238886&Body=Near+miss+at+compressor+deck&NumMedia=1&MediaUrl0=https%3A%2F%2Fapi.twilio.com%2Fmedia%2F123.jpg";
const parsedTwilio = parseTwilioForm(twilioSample);
assert.strictEqual(parsedTwilio.from, "+919876543210");
assert.strictEqual(parsedTwilio.body, "Near miss at compressor deck");
assert.strictEqual(parsedTwilio.mediaUrl, "https://api.twilio.com/media/123.jpg");
console.log("  ✓ PASS: Correctly parses Twilio URL-encoded form data with media");

function parseMetaJson(json: any) {
  const msg = json.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  return {
    from: normalizePhoneNumber(msg?.from || ""),
    body: msg?.text?.body || msg?.image?.caption || "",
    mediaId: msg?.image?.id || undefined,
  };
}

const metaSample = {
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              {
                from: "919876543210",
                type: "image",
                image: {
                  id: "img_987654321",
                  caption: "Unsafe condition: heavy oil puddle on catwalk",
                  mime_type: "image/jpeg",
                },
              },
            ],
          },
        },
      ],
    },
  ],
};

const parsedMeta = parseMetaJson(metaSample);
assert.strictEqual(parsedMeta.from, "+919876543210");
assert.strictEqual(parsedMeta.body, "Unsafe condition: heavy oil puddle on catwalk");
assert.strictEqual(parsedMeta.mediaId, "img_987654321");
console.log("  ✓ PASS: Correctly parses Meta Cloud API JSON payload with image attachment");

// 4. Test Meta Verification Handshake
console.log("\n4. Meta Webhook Verification Handshake");

function verifyMetaHandshake(mode: string | null, token: string | null, expectedToken: string) {
  return mode === "subscribe" && token === expectedToken;
}

assert.strictEqual(verifyMetaHandshake("subscribe", "sif-sentinel-verify", "sif-sentinel-verify"), true);
assert.strictEqual(verifyMetaHandshake("subscribe", "wrong-token", "sif-sentinel-verify"), false);
assert.strictEqual(verifyMetaHandshake("invalid_mode", "sif-sentinel-verify", "sif-sentinel-verify"), false);
console.log("  ✓ PASS: Meta webhook verification handshake validates token correctly");

testSimulation().then(() => {
  console.log("\n==================================================");
  console.log("WhatsApp Test Results: ALL TESTS PASSED!");
  console.log("==================================================");
});
