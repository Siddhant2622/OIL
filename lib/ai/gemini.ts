/**
 * lib/ai/gemini.ts
 *
 * SIF Sentinel — Gemini structured analysis module.
 * SERVER-ONLY. Never import from client components.
 *
 * Spec §7.1: gemini-2.5-flash, temperature 0.1, responseSchema,
 * retry 3× with exponential backoff on 429/5xx, record latency_ms.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { LIFE_SAVING_RULES } from "@/lib/utils";

// ── Prompt version ────────────────────────────────────────────────────────────
export const PROMPT_VERSION = "sif-v1";

// ── Client (initialised once) ─────────────────────────────────────────────────
function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey: key });
}

// ── System instruction (spec §7.2) ────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are an HSE (Health, Safety, Security, Environment) analyst for an upstream oil and gas operator. You read a single free-text safety observation and judge whether the situation it describes carried credible potential to kill a person or cause a life-altering injury — REGARDLESS of what actually happened or how the reporter graded it. A report where nobody was hurt can still be a SIF precursor; a painful but non-escalating injury may not be one.

Reason in this order and show it in your output:
1. ENERGY   — what hazardous energy was present or could have been released?
               (gravity, motion, mechanical, electrical, pressure, chemical, thermal, radiation, sound, biological)
2. BARRIER  — what control should have stopped that energy, and was it PRESENT, MISSING, FAILED or BYPASSED?
3. EXPOSURE — was a person in, or could a person plausibly have been in, the line of fire?
4. RULE     — which IOGP Life-Saving Rule(s) does this touch?

A report is SIF-potential when a high-energy source was present AND a required barrier was missing, failed or bypassed AND a person was or could realistically have been exposed.

RULES YOU MUST FOLLOW:
- Every evidence_span you output MUST be an EXACT, character-for-character substring of the report text. Never paraphrase inside evidence_spans. If you cannot quote it, do not claim it.
- Use ONLY these Life-Saving Rules: Bypassing Safety Controls, Confined Space, Driving, Energy Isolation, Hot Work, Line of Fire, Safe Mechanical Lifting, Work Authorisation, Working at Height. Never invent a rule.
- Do not be reassured by dismissive wording such as "no injury", "minor", "nothing serious", or "luckily nobody was there". Judge the energy and the barrier, not the outcome.
- If the text is too vague, contradictory or truncated to judge, set needs_human_review = true and explain why. Guessing is worse than escalating.
- Output ONLY valid JSON matching the schema. No markdown, no commentary.`;

// ── Response schema (spec §7.3) ───────────────────────────────────────────────
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sif_potential: { type: Type.BOOLEAN },
    sif_confidence: {
      type: Type.NUMBER,
      description: "0 to 1 inclusive",
    },
    risk_band: {
      type: Type.STRING,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
    },
    energy_source: { type: Type.STRING },
    hazard: { type: Type.STRING },
    activity: { type: Type.STRING },
    location_type: { type: Type.STRING },
    equipment: { type: Type.STRING },
    barriers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          status: {
            type: Type.STRING,
            enum: ["PRESENT", "MISSING", "FAILED", "BYPASSED"],
          },
        },
        required: ["name", "status"],
      },
    },
    exposure: {
      type: Type.OBJECT,
      properties: {
        person_exposed: { type: Type.BOOLEAN },
        description: { type: Type.STRING },
      },
      required: ["person_exposed", "description"],
    },
    lsr_tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    precursor_type: { type: Type.STRING },
    evidence_spans: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "EXACT character-for-character substrings of the report description. Never paraphrase.",
    },
    rationale: {
      type: Type.STRING,
      description: "2-4 sentences using HSE vocabulary.",
    },
    recommended_actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          owner_role: { type: Type.STRING },
          urgency: {
            type: Type.STRING,
            enum: ["IMMEDIATE", "SHORT_TERM", "SYSTEMIC"],
          },
        },
        required: ["title", "owner_role", "urgency"],
      },
    },
    needs_human_review: { type: Type.BOOLEAN },
    review_reasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    immediate_action_required: { type: Type.BOOLEAN },
  },
  required: [
    "sif_potential",
    "sif_confidence",
    "risk_band",
    "energy_source",
    "hazard",
    "activity",
    "location_type",
    "equipment",
    "barriers",
    "exposure",
    "lsr_tags",
    "precursor_type",
    "evidence_spans",
    "rationale",
    "recommended_actions",
    "needs_human_review",
    "review_reasons",
    "immediate_action_required",
  ],
};

// ── Gemini response type ──────────────────────────────────────────────────────
export interface GeminiAnalysisResult {
  sif_potential: boolean;
  sif_confidence: number;
  risk_band: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  energy_source: string;
  hazard: string;
  activity: string;
  location_type: string;
  equipment: string;
  barriers: { name: string; status: "PRESENT" | "MISSING" | "FAILED" | "BYPASSED" }[];
  exposure: { person_exposed: boolean; description: string };
  lsr_tags: string[];
  precursor_type: string;
  evidence_spans: string[];
  rationale: string;
  recommended_actions: {
    title: string;
    owner_role: string;
    urgency: "IMMEDIATE" | "SHORT_TERM" | "SYSTEMIC";
  }[];
  needs_human_review: boolean;
  review_reasons: string[];
  immediate_action_required: boolean;
}

export interface AnalysisOutput {
  result: GeminiAnalysisResult;
  latency_ms: number;
  raw_response: unknown;
  model: string;
}

// ── Sleep utility ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main analysis function ────────────────────────────────────────────────────
/**
 * Analyse a single report description with Gemini.
 * Retries up to 3 times with exponential backoff on 429/5xx.
 * Throws on permanent failure so the caller can set status = ANALYSIS_FAILED.
 */
export async function analyseReport(
  description: string,
  context?: {
    site?: string;
    activity?: string;
    report_type?: string;
    historical_summary?: string;
  }
): Promise<AnalysisOutput> {
  const client = getClient();
  const model = "gemini-2.5-flash";

  // Build the user prompt
  const userPrompt = buildPrompt(description, context);

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const start = Date.now();

    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const latency_ms = Date.now() - start;
      // In @google/genai SDK, text is a property getter, not a method
      const rawText = response.text as unknown as string | undefined;
      const text = typeof rawText === "function"
        ? (rawText as unknown as () => string)()
        : (rawText ?? "");

      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      const result = JSON.parse(text) as GeminiAnalysisResult;

      return {
        result,
        latency_ms,
        raw_response: { text, usage: response.usageMetadata },
        model,
      };
    } catch (err: unknown) {
      lastError = err;

      // Check for retryable status codes
      const isRetryable =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("500") ||
          err.message.includes("503") ||
          err.message.includes("RESOURCE_EXHAUSTED"));

      if (!isRetryable || attempt === 3) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoff = Math.pow(2, attempt - 1) * 1000;
      console.warn(
        `[gemini] Attempt ${attempt} failed (${err instanceof Error ? err.message : "unknown"}). Retrying in ${backoff}ms…`
      );
      await sleep(backoff);
    }
  }

  throw new Error(
    `Gemini analysis failed after 3 attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

function buildPrompt(
  description: string,
  context?: {
    site?: string;
    activity?: string;
    report_type?: string;
    historical_summary?: string;
  }
): string {
  let prompt = `SAFETY REPORT TEXT:\n"""\n${description}\n"""\n`;

  if (context?.report_type) {
    prompt += `\nReport type: ${context.report_type}`;
  }
  if (context?.site) {
    prompt += `\nSite: ${context.site}`;
  }
  if (context?.activity) {
    prompt += `\nActivity at time of observation: ${context.activity}`;
  }
  if (context?.historical_summary) {
    prompt += `\n\nHISTORICAL CONTEXT (similar past reports at this org):\n${context.historical_summary}`;
  }

  prompt += `\n\nAnalyse this report and return JSON matching the required schema.`;
  return prompt;
}

// ── Embedding function ────────────────────────────────────────────────────────
/**
 * Generate a 768-dimensional embedding for semantic clustering.
 * Uses gemini-embedding-001 as specified in §2.
 */
export async function embedDescription(text: string): Promise<number[]> {
  const client = getClient();

  const response = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: [{ role: "user", parts: [{ text }] }],
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error("Empty embedding response from Gemini");
  }

  return embedding;
}
