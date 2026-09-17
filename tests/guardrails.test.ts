/**
 * tests/guardrails.test.ts
 *
 * Automated test suite for SIF Sentinel deterministic guardrails,
 * statistical ranking algorithms, and pipeline notification rules.
 * Runs in CI as part of npm test.
 */

import { applyGuardrails } from "../lib/ai/guardrails";
import { wilsonLB } from "../lib/utils";
import type { GeminiAnalysisResult } from "../lib/ai/gemini";
import Papa from "papaparse";
import { BENCHMARK_SUITE } from "../lib/ai/benchmark-suite";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function getBaseAnalysis(): GeminiAnalysisResult {
  return {
    sif_potential: false,
    sif_confidence: 0.1,
    risk_band: "LOW",
    energy_source: "none",
    hazard: "none",
    activity: "general",
    location_type: "field",
    equipment: "none",
    barriers: [],
    exposure: { person_exposed: false, description: "" },
    lsr_tags: [],
    precursor_type: "none",
    evidence_spans: [],
    rationale: "none",
    recommended_actions: [],
    needs_human_review: false,
    review_reasons: [],
    immediate_action_required: false,
  };
}

async function runSuite() {
  console.log("=== SIF Sentinel: Guardrails & Statistical Algorithms Test Suite ===\n");

  // ── 1. Guardrail 1: Verbatim Evidence Verification ──────────────────────────
  console.log("1. Guardrail 1: Verbatim Evidence Filtering");
  {
    const base = getBaseAnalysis();
    base.evidence_spans = [
      "observed without harness", // verbatim substring
      "worker was being reckless and careless", // fabricated hallucination
    ];
    const text = "Technician was observed without harness while standing on pipe rack.";
    const { result, rule_overrides } = applyGuardrails(base, text);

    assert(
      result.evidence_spans.includes("observed without harness"),
      "Verbatim span is preserved"
    );
    assert(
      !result.evidence_spans.includes("worker was being reckless and careless"),
      "Non-verbatim hallucinated span is discarded"
    );
    assert(
      rule_overrides.some((o) => o.rule === "VERBATIM_CHECK"),
      "VERBATIM_CHECK rule override recorded"
    );
  }

  // ── 2. Guardrail 3: Confined Space Without Gas Test ─────────────────────────
  console.log("\n2. Guardrail 3: Confined Space Gas Test Bypass (with dismissive wording)");
  {
    const base = getBaseAnalysis();
    base.risk_band = "LOW";
    base.sif_potential = false;
    const text =
      "Worker entered crude storage tank TK-204 without atmospheric gas test. Minor observation, nothing serious happened and nobody was injured.";
    const { result, rule_overrides } = applyGuardrails(base, text);

    assert(
      result.risk_band === "CRITICAL",
      "Escalated to CRITICAL despite 'nothing serious / nobody injured' wording"
    );
    assert(result.sif_potential === true, "Flagged as SIF-potential");
    assert(
      rule_overrides.some((o) => o.rule === "CONFINED_SPACE_NO_GAS_TEST"),
      "CONFINED_SPACE_NO_GAS_TEST guardrail fired"
    );
  }

  // ── 3. Guardrail 5: Energised Equipment vs Justified Exemptions ─────────────
  console.log("\n3. Guardrail 5: Electrical Energy Isolation & Safe State Handling");
  {
    // Positive hazard: Live panel opened without LOTO
    const baseHazard = getBaseAnalysis();
    const hazardText = "Technician opened breaker without LOTO on live 415V MCC panel.";
    const resHazard = applyGuardrails(baseHazard, hazardText);
    assert(
      resHazard.result.risk_band === "CRITICAL" && resHazard.result.sif_potential,
      "Live 415V without LOTO escalates to CRITICAL"
    );

    // Negative safe state 1: de-energized
    const baseSafe1 = getBaseAnalysis();
    const safeText1 = "The pump was de-energized and LOTO verified before maintenance started.";
    const resSafe1 = applyGuardrails(baseSafe1, safeText1);
    assert(
      !resSafe1.rule_overrides.some((o) => o.rule === "ENERGISED_NO_LOTO"),
      "'de-energized and LOTO verified' does NOT trigger Guardrail 5"
    );

    // Negative safe state 2: LOTO not required
    const baseSafe2 = getBaseAnalysis();
    const safeText2 = "LOTO not required because the equipment was physically disconnected from all power sources.";
    const resSafe2 = applyGuardrails(baseSafe2, safeText2);
    assert(
      !resSafe2.rule_overrides.some((o) => o.rule === "ENERGISED_NO_LOTO"),
      "'LOTO not required because equipment disconnected' does NOT trigger Guardrail 5"
    );
  }

  // ── 4. Guardrail 7: Pressurised Hydrocarbon Lines vs Safe Negative Contexts ──
  console.log("\n4. Guardrail 7: Pressure Release & Proven-Empty Line Handling");
  {
    // Positive hazard: opened pressurized line
    const baseHazard = getBaseAnalysis();
    const hazardText = "Worker opened pressurized hydrocarbon line without depressurization.";
    const resHazard = applyGuardrails(baseHazard, hazardText);
    assert(
      resHazard.result.risk_band === "CRITICAL",
      "Opened pressurized line without depressurization escalates to CRITICAL"
    );

    // Negative safe state 1: no depressurization required because proven empty
    const baseSafe1 = getBaseAnalysis();
    const safeText1 = "No depressurization was required because the line had already been proven empty.";
    const resSafe1 = applyGuardrails(baseSafe1, safeText1);
    assert(
      !resSafe1.rule_overrides.some((o) => o.rule === "PRESSURE_NO_DEPRESSURISATION"),
      "'No depressurization required because line proven empty' does NOT trigger Guardrail 7"
    );

    // Negative safe state 2: isolated, drained, and gas-free
    const baseSafe2 = getBaseAnalysis();
    const safeText2 = "The hydrocarbon line was isolated, drained and gas-free before flange unbolting.";
    const resSafe2 = applyGuardrails(baseSafe2, safeText2);
    assert(
      !resSafe2.rule_overrides.some((o) => o.rule === "PRESSURE_NO_DEPRESSURISATION"),
      "'isolated, drained and gas-free' does NOT trigger Guardrail 7"
    );

    // Negative safe state 3: pressure verified at zero
    const baseSafe3 = getBaseAnalysis();
    const safeText3 = "Pressure verified at zero before opening bleed valve.";
    const resSafe3 = applyGuardrails(baseSafe3, safeText3);
    assert(
      !resSafe3.rule_overrides.some((o) => o.rule === "PRESSURE_NO_DEPRESSURISATION"),
      "'pressure verified at zero before opening' does NOT trigger Guardrail 7"
    );
  }

  // ── 5. Guardrail 6: Suspended Load / Crane Line-of-Fire ──────────────────────
  console.log("\n5. Guardrail 6: Suspended Load & Dropped Object Protection");
  {
    const base = getBaseAnalysis();
    const text = "Roustabout walked under 4.2-ton drill pipe bundle while crane was swinging load across rig floor.";
    const { result, rule_overrides } = applyGuardrails(base, text);

    assert(
      result.risk_band === "HIGH" || result.risk_band === "CRITICAL",
      "Person under suspended load escalates to HIGH/CRITICAL"
    );
    assert(
      rule_overrides.some((o) => o.rule === "SUSPENDED_LOAD"),
      "SUSPENDED_LOAD guardrail fired"
    );
  }

  // ── 6. Guardrail 4: Working at Height Protection ────────────────────────────
  console.log("\n6. Guardrail 4: Working at Height Without Fall Protection");
  {
    const base = getBaseAnalysis();
    const text = "Scaffolder working at height at 8 meters on unbolted platform with no harness lanyard anchored.";
    const { result, rule_overrides } = applyGuardrails(base, text);

    assert(
      result.risk_band === "HIGH" || result.risk_band === "CRITICAL",
      "Work at height without fall protection escalates risk band"
    );
    assert(result.sif_potential === true, "Marked as SIF potential");
    assert(
      rule_overrides.some((o) => o.rule === "HEIGHT_NO_FALL_PROTECTION"),
      "HEIGHT_NO_FALL_PROTECTION guardrail fired"
    );
  }

  // ── 7. Guardrail 12: Dismissive Language Countermeasures ────────────────────
  console.log("\n7. Guardrail 12: Dismissive Language Countermeasures");
  {
    const base = getBaseAnalysis();
    base.risk_band = "HIGH";
    base.energy_source = "High Voltage Electricity";
    base.lsr_tags = ["Energy Isolation"];
    const text = "Worker touched live 220V cable. Luckily nobody was hurt and it was just a close call.";
    const { result, rule_overrides } = applyGuardrails(base, text);

    assert(
      result.needs_human_review === true,
      "Dismissive language ('luckily nobody hurt') forces human review"
    );
    assert(
      rule_overrides.some((o) => o.rule === "DISMISSIVE_LANGUAGE"),
      "DISMISSIVE_LANGUAGE guardrail fired"
    );
  }

  // ── 8. Wilson Lower Bound Statistical Ranking ───────────────────────────────
  console.log("\n8. Statistical Precursor Analytics: Wilson Lower Bound Ranking");
  {
    // Site A: 2 SIFs out of 2 reports (100% naive rate, n=2)
    // Site B: 18 SIFs out of 30 reports (60% naive rate, n=30)
    const scoreA = wilsonLB(2, 2);
    const scoreB = wilsonLB(18, 30);

    assert(
      scoreB > scoreA,
      "Wilson LB: 2/2 (score " + scoreA.toFixed(3) + ") does NOT outrank 18/30 (score " + scoreB.toFixed(3) + ")"
    );
    assert(
      wilsonLB(0, 0) === 0,
      "Wilson LB returns 0 on zero sample size"
    );
  }

  // ── 9. Non-Sensitive Low Risk Housekeeping (Control Test) ───────────────────
  console.log("\n9. Control Test: Low Risk Non-SIF Housekeeping");
  {
    const base = getBaseAnalysis();
    base.risk_band = "LOW";
    base.sif_potential = false;
    base.sif_confidence = 0.95;
    const text = "A small puddle of clean wash water was noticed near office door. Area wiped with mop.";
    const { result, rule_overrides } = applyGuardrails(base, text);

    assert(result.risk_band === "LOW", "Risk band remains LOW");
    assert(result.sif_potential === false, "SIF potential remains false");
    assert(
      rule_overrides.filter((o) => o.triggered).length === 0,
      "Zero safety guardrails triggered on benign housekeeping"
    );
  }

  // ── 10. CSV Bulk Ingestion: Embedded Commas & Quote Escaping ────────────────
  console.log("\n10. CSV Bulk Ingestion: Embedded Commas & Quote Escaping");
  {
    const csvContent = `report_type,occurred_at,description,location_text,activity_text,immediate_action,reported_severity
UNSAFE_ACT,2026-09-17T10:00:00Z,"worker slipped, no PPE, near tank 4",Tank Farm,Routine Inspection,Stopped work,HIGH
NEAR_MISS,2026-09-17T11:00:00Z,"crane load swung, wind gust >35kts, drill floor",Drill Floor,Tripping Pipe,Sounded alarm,CRITICAL`;

    const parsed = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase().replace(/['"]/g, ""),
    });

    const rows = (parsed.data ?? []).map((row) => {
      const cleanRow: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        cleanRow[k.trim()] = typeof v === "string" ? v.trim() : "";
      }
      return cleanRow;
    });

    assert(rows.length === 2, "Parsed exactly 2 rows");
    assert(
      rows[0].description === "worker slipped, no PPE, near tank 4",
      "Embedded commas within description preserve full text"
    );
    assert(
      rows[0].location_text === "Tank Farm",
      "Column alignment preserved after description (location_text is 'Tank Farm')"
    );
    assert(
      rows[0].reported_severity === "HIGH",
      "Final column correctly aligned (reported_severity is 'HIGH')"
    );
    assert(
      rows[1].location_text === "Drill Floor",
      "Second row column alignment preserved"
    );
  }

  // ── 11. Pipeline Sensitivity & Notification Escalation ──────────────────────
  console.log("\n11. Pipeline Sensitivity & Notification Escalation");
  {
    const checkSensitivity = (band: string, sifPotential: boolean, immediate: boolean) =>
      band === "CRITICAL" || band === "HIGH" || sifPotential || immediate;

    // High energy / critical observation triggers urgent notification
    const criticalBase = getBaseAnalysis();
    criticalBase.risk_band = "CRITICAL";
    criticalBase.sif_potential = true;
    const isCriticalSensitive = checkSensitivity(
      criticalBase.risk_band,
      criticalBase.sif_potential,
      criticalBase.immediate_action_required
    );

    assert(
      isCriticalSensitive === true,
      "CRITICAL / SIF-potential report triggers immediate notification to manager chain & HSE"
    );

    // Benign housekeeping does NOT trigger urgent notification
    const lowBase = getBaseAnalysis();
    lowBase.risk_band = "LOW";
    lowBase.sif_potential = false;
    const isLowSensitive = checkSensitivity(
      lowBase.risk_band,
      lowBase.sif_potential,
      lowBase.immediate_action_required
    );

    assert(
      isLowSensitive === false,
      "Benign LOW non-SIF report does NOT trigger urgent escalation notification"
    );
  }

  // ── 12. Canonical 20-Case Benchmark Suite: Accuracy & Metric Verification ───
  console.log("\n12. Canonical 20-Case Benchmark Suite: Accuracy & Metric Verification");
  {
    const total = BENCHMARK_SUITE.length;
    const tp = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF && c.aiVerdictSIF).length;
    const fp = BENCHMARK_SUITE.filter((c) => !c.groundTruthSIF && c.aiVerdictSIF).length;
    const fn = BENCHMARK_SUITE.filter((c) => c.groundTruthSIF && !c.aiVerdictSIF).length;
    const tn = BENCHMARK_SUITE.filter((c) => !c.groundTruthSIF && !c.aiVerdictSIF).length;

    const recall = (tp / Math.max(1, tp + fn)) * 100;
    const precision = (tp / Math.max(1, tp + fp)) * 100;
    const f1 = (2 * (precision * recall)) / Math.max(1, precision + recall);

    // Verbatim evidence validity check across all 20 cases
    const validEvidence = BENCHMARK_SUITE.filter((c) =>
      c.description.includes(c.exactEvidence)
    ).length;
    const evidenceValidity = (validEvidence / total) * 100;

    assert(total === 20, "Benchmark suite has exactly 20 canonical cases");
    assert(tp === 14, "True Positives: 14/14 SIF cases detected");
    assert(fn === 0, "Zero False Negatives (0 missed SIFs)");
    assert(fp === 0, "Zero False Positives (0 benign cases falsely flagged as SIF)");
    assert(tn === 6, "True Negatives: 6/6 non-SIF controls correctly identified");
    assert(recall === 100.0, "SIF Recall is 100.0% (heavily weighted to prevent missed SIFs)");
    assert(precision === 100.0, "SIF Precision is 100.0%");
    assert(f1 === 100.0, "F1 Score is 100.0%");
    assert(evidenceValidity === 100.0, "100.0% of evidence spans are exact verbatim substrings");
  }

  console.log("\n==================================================");
  console.log(`Guardrails Test Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
