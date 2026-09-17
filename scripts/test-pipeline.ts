/**
 * scripts/test-pipeline.ts
 *
 * SIF Sentinel — Pipeline & Sensitivity Notification Verification Test.
 * Tests Gemini analysis (or deterministic guardrails) and sensitivity classification.
 */

import { applyGuardrails } from "../lib/ai/guardrails";
import type { GeminiAnalysisResult } from "../lib/ai/gemini";

// Synthetic test cases
const TEST_CASES: {
  name: string;
  description: string;
  mockGemini: GeminiAnalysisResult;
  expectedSensitive: boolean;
  expectedMinBand: string;
}[] = [
  {
    name: "Confined space entry without gas test (dismissive wording)",
    description:
      "Worker was observed entering the confined space of tank TK-204 without a gas test being conducted first. No permit was signed and no standby person was present. Minor observation, nothing serious happened.",
    mockGemini: {
      sif_potential: false, // Intentionally dismissed by raw AI to test guardrail
      sif_confidence: 0.85,
      risk_band: "LOW",
      energy_source: "Atmospheric / Toxic Gas",
      hazard: "Asphyxiation in confined space",
      activity: "Tank Entry",
      location_type: "Storage Tank",
      equipment: "TK-204",
      barriers: [{ name: "Gas testing", status: "MISSING" }],
      exposure: { person_exposed: true, description: "Worker in tank" },
      lsr_tags: ["Confined Space"],
      precursor_type: "Unsafe Act",
      evidence_spans: ["entering the confined space of tank TK-204 without a gas test"],
      rationale: "Confined space entered without atmospheric testing.",
      recommended_actions: [
        { title: "Halt entry and test atmosphere", owner_role: "SUPERVISOR", urgency: "IMMEDIATE" },
      ],
      needs_human_review: false,
      review_reasons: [],
      immediate_action_required: true,
    },
    expectedSensitive: true,
    expectedMinBand: "CRITICAL",
  },
  {
    name: "Work at height without harness lanyard",
    description:
      "Contractor was observed working at height on scaffold at 7m elevation without harness lanyard anchored. Luckily nobody fell.",
    mockGemini: {
      sif_potential: true,
      sif_confidence: 0.9,
      risk_band: "HIGH",
      energy_source: "Gravity",
      hazard: "Fall from elevation",
      activity: "Scaffold Work",
      location_type: "Elevated Platform",
      equipment: "Scaffolding",
      barriers: [{ name: "Fall arrest harness", status: "MISSING" }],
      exposure: { person_exposed: true, description: "Worker at 7m without tie-off" },
      lsr_tags: ["Working at Height"],
      precursor_type: "Unsafe Act",
      evidence_spans: ["working at height on scaffold at 7m elevation without harness lanyard"],
      rationale: "Unprotected work at height carries fall from height SIF potential.",
      recommended_actions: [
        { title: "Immediate stand-down and tie-off", owner_role: "SUPERVISOR", urgency: "IMMEDIATE" },
      ],
      needs_human_review: false,
      review_reasons: [],
      immediate_action_required: true,
    },
    expectedSensitive: true,
    expectedMinBand: "HIGH",
  },
  {
    name: "Non-sensitive low risk housekeeping",
    description:
      "A small puddle of clean wash water was noticed near the office corridor door. Area was marked with a caution cone and wiped with a mop.",
    mockGemini: {
      sif_potential: false,
      sif_confidence: 0.98,
      risk_band: "LOW",
      energy_source: "Gravity (Slip/Trip)",
      hazard: "Slip hazard on wet floor",
      activity: "Walking",
      location_type: "Office corridor",
      equipment: "None",
      barriers: [{ name: "Caution cone", status: "PRESENT" }],
      exposure: { person_exposed: false, description: "No current exposure" },
      lsr_tags: [],
      precursor_type: "Housekeeping",
      evidence_spans: ["small puddle of clean wash water"],
      rationale: "Minor slip hazard with low energy.",
      recommended_actions: [],
      needs_human_review: false,
      review_reasons: [],
      immediate_action_required: false,
    },
    expectedSensitive: false,
    expectedMinBand: "LOW",
  },
];

console.log("=== SIF Sentinel: Sensitivity & Guardrail Verification ===");
let passed = 0;

for (const tc of TEST_CASES) {
  console.log(`\nTesting: "${tc.name}"`);

  const { result, rule_overrides } = applyGuardrails(tc.mockGemini, tc.description);

  const isSensitive =
    result.risk_band === "CRITICAL" ||
    result.risk_band === "HIGH" ||
    result.sif_potential ||
    result.immediate_action_required;

  console.log(`  -> Final Risk Band: ${result.risk_band} (original: ${tc.mockGemini.risk_band})`);
  console.log(`  -> SIF Potential: ${result.sif_potential}`);
  console.log(`  -> Is Sensitive (triggers notification): ${isSensitive}`);
  console.log(
    `  -> Fired Guardrails: ${
      rule_overrides.filter((r) => r.triggered).map((r) => r.rule).join(", ") || "None"
    }`
  );

  const sensitiveMatch = isSensitive === tc.expectedSensitive;
  const bandMatch =
    tc.expectedMinBand === "CRITICAL"
      ? result.risk_band === "CRITICAL"
      : tc.expectedMinBand === "HIGH"
      ? result.risk_band === "CRITICAL" || result.risk_band === "HIGH"
      : true;

  if (sensitiveMatch && bandMatch) {
    console.log(`  ✅ PASS`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: sensitiveMatch=${sensitiveMatch}, bandMatch=${bandMatch}`);
  }
}

console.log(`\nResults: ${passed}/${TEST_CASES.length} tests passed.`);
if (passed !== TEST_CASES.length) {
  process.exit(1);
}
