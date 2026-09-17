/**
 * lib/email.ts
 *
 * SIF Sentinel — Email notification delivery using Resend.
 * SERVER-ONLY. Dispatches formatted safety alerts when a sensitive
 * SIF precursor or CRITICAL/HIGH risk report is detected.
 */

import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SensitiveAlertEmailParams {
  to: string[];
  reportCode: string;
  reportType: string;
  riskBand: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  sifPotential: boolean;
  hazard?: string;
  energySource?: string;
  lsrTags?: string[];
  location?: string;
  reportId: string;
  description: string;
}

/**
 * Send an email alert to safety personnel and managers when a sensitive SIF precursor is detected.
 * Returns true if sent, false if skipped or failed (never throws to protect caller).
 */
export async function sendSensitiveAlertEmail(
  params: SensitiveAlertEmailParams
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.info(
      `[email] RESEND_API_KEY not configured. Skipping email alert for ${params.reportCode} to ${params.to.length} recipient(s).`
    );
    return false;
  }

  if (!params.to.length) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reportUrl = `${appUrl}/reports/${params.reportId}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "alerts@resend.dev";

  const isCritical = params.riskBand === "CRITICAL";
  const badgeColor = isCritical ? "#dc2626" : "#ea580c";
  const badgeBg = isCritical ? "#fef2f2" : "#fff7ed";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SIF Sentinel Safety Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: ${badgeColor}; padding: 20px 24px; color: #ffffff;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; opacity: 0.9;">SIF Sentinel Safety Alert</p>
      <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">
        🚨 ${params.riskBand} SIF Precursor Detected: ${params.reportCode}
      </h1>
    </div>

    <div style="padding: 24px;">
      <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: ${badgeBg}; border: 1px solid ${badgeColor}; color: ${badgeColor}; font-weight: 700; font-size: 13px; margin-bottom: 16px;">
        Risk Level: ${params.riskBand} · ${params.sifPotential ? "SIF Potential Confirmed" : "High Severity Potential"}
      </div>

      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        The SIF Sentinel AI safety engine has scanned an uploaded observation report and identified a <strong>sensitive safety hazard</strong> requiring review.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 35%;">Report Type</td>
            <td style="padding: 10px 0; font-weight: 600;">${params.reportType}</td>
          </tr>
          ${params.location ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Location</td>
            <td style="padding: 10px 0; font-weight: 600;">${params.location}</td>
          </tr>` : ""}
          ${params.hazard ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Hazard / Exposure</td>
            <td style="padding: 10px 0; font-weight: 600;">${params.hazard}</td>
          </tr>` : ""}
          ${params.energySource ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Energy Source</td>
            <td style="padding: 10px 0; font-weight: 600;">${params.energySource}</td>
          </tr>` : ""}
          ${params.lsrTags && params.lsrTags.length > 0 ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Life-Saving Rules</td>
            <td style="padding: 10px 0; font-weight: 600; color: #2563eb;">${params.lsrTags.join(", ")}</td>
          </tr>` : ""}
        </tbody>
      </table>

      <div style="background-color: #f8fafc; border-left: 4px solid ${badgeColor}; padding: 14px; margin-bottom: 24px; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b;">Observation Narrative</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #334155; font-style: italic;">
          "${params.description.length > 300 ? params.description.slice(0, 300) + "…" : params.description}"
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${reportUrl}" style="background-color: ${badgeColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
          View Report &amp; Evidence Details →
        </a>
      </div>
    </div>

    <div style="background-color: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      SIF Sentinel AI Safety Engine · Oil India Limited · Automated Safety Dispatch
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: `🚨 ${params.riskBand} SIF Precursor Alert: ${params.reportCode}`,
      html: htmlContent,
    });

    if (error) {
      console.warn("[email] Resend error:", error.message);
      return false;
    }

    console.info(
      `[email] Alert email successfully sent to ${params.to.length} recipient(s) for ${params.reportCode}`
    );
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[email] Failed to send alert email:", msg);
    return false;
  }
}
