/**
 * SIF Sentinel — WhatsApp Phone Linking & Verification Helper
 */

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { normalizePhoneNumber } from "./client";

/**
 * Generate a short-lived cryptographically random token to link a WhatsApp phone number.
 */
export async function generatePhoneLinkToken(rawPhone: string): Promise<string> {
  const phone = normalizePhoneNumber(rawPhone);
  const token = crypto.randomBytes(24).toString("hex");
  const admin = createAdminClient();

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  await admin.from("phone_verification_tokens").insert({
    phone,
    token,
    expires_at: expiresAt,
    used: false,
  });

  return token;
}

/**
 * Verify a token and bind the phone number to the authenticated user's profile.
 */
export async function verifyAndLinkPhone(
  token: string,
  userId: string
): Promise<{ success: boolean; phone?: string; error?: string }> {
  const admin = createAdminClient();

  // 1. Look up token
  const { data: tokenRecord, error: tokenErr } = await admin
    .from("phone_verification_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenErr || !tokenRecord) {
    return { success: false, error: "Invalid verification link." };
  }

  if (tokenRecord.used) {
    return { success: false, error: "This link has already been used." };
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { success: false, error: "This verification link has expired. Please text 'Hi' on WhatsApp again." };
  }

  // 2. Update user's profile with phone and mark verified
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      phone: tokenRecord.phone,
      whatsapp_verified: true,
    })
    .eq("id", userId);

  if (profileErr) {
    console.error("[whatsapp:auth] Failed to update profile:", profileErr.message);
    return { success: false, error: "Failed to update profile. Please try again." };
  }

  // 3. Mark token as used
  await admin
    .from("phone_verification_tokens")
    .update({ used: true })
    .eq("id", tokenRecord.id);

  return { success: true, phone: tokenRecord.phone };
}
