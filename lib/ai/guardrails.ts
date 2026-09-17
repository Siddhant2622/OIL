/**
 * lib/ai/guardrails.ts
 *
 * SIF Sentinel — Deterministic guardrails (spec §7.4).
 * Run AFTER Gemini. Can only ESCALATE verdicts, never downgrade.
 * Each rule that fires is appended to rule_overrides.
 */

import type { GeminiAnalysisResult } from "./gemini";
import { LIFE_SAVING_RULES } from "@/lib/utils";

export interface GuardrailOutput {
  result: GeminiAnalysisResult;
  rule_overrides: RuleOverride[];
}

export interface RuleOverride {
  rule: string;
  triggered: boolean;
  original_band?: string;
  forced_band?: string;
  reason: string;
}

type Band = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const BAND_ORDER: Band[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function escalateBand(current: Band, minimum: Band): Band {
  const ci = BAND_ORDER.indexOf(current);
  const mi = BAND_ORDER.indexOf(minimum);
  return ci > mi ? minimum : current;
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").toLowerCase().trim();
}

/**
 * Run all 15 guardrails over the Gemini result.
 * Modifies a copy of the result — never mutates the original.
 */
export function applyGuardrails(
  geminiResult: GeminiAnalysisResult,
  reportDescription: string
): GuardrailOutput {
  const result: GeminiAnalysisResult = JSON.parse(JSON.stringify(geminiResult));
  const rule_overrides: RuleOverride[] = [];
  const desc = reportDescription;
  const normDesc = normalise(desc);

  // ── Guardrail 1: Verbatim evidence spans ───────────────────────────────────
  const verbatimDropped: string[] = [];
  result.evidence_spans = result.evidence_spans.filter((span) => {
    const found = desc.includes(span);
    if (!found) {
      verbatimDropped.push(span);
    }
    return found;
  });

  if (verbatimDropped.length > 0) {
    result.needs_human_review = true;
    result.review_reasons = [
      ...new Set([...result.review_reasons, "EVIDENCE_NOT_VERBATIM"]),
    ];
    rule_overrides.push({
      rule: "VERBATIM_CHECK",
      triggered: true,
      reason: `Dropped ${verbatimDropped.length} non-verbatim span(s): ${verbatimDropped.slice(0, 3).join("; ")}`,
    });
  }

  // ── Guardrail 2: LSR enclosure ─────────────────────────────────────────────
  const validLSR = new Set<string>(LIFE_SAVING_RULES);
  const originalTags = [...result.lsr_tags];
  result.lsr_tags = result.lsr_tags.filter((tag) => validLSR.has(tag));
  const droppedTags = originalTags.filter((t) => !validLSR.has(t));

  if (droppedTags.length > 0) {
    rule_overrides.push({
      rule: "LSR_ENCLOSURE",
      triggered: true,
      reason: `Dropped invalid LSR tags: ${droppedTags.join(", ")}`,
    });
  }

  // ── Guardrail 3: Confined space without gas test / permit ─────────────────
  const confinedSpacePattern =
    /confined\s+space|manhole|vessel\s+(entry)?|tank\s+(entry)?|pit\s+(entry)?|entered\s+([a-z0-9\s-]{0,25})?(tank|vessel|pit|manhole|compartment)/i;
  const noGasTestPattern =
    /(no|without)\s+([a-z\s-]{0,20})?gas\s+test|gas\s+test\s+not|no\s+permit|without\s+permit|permit\s+not/i;

  if (confinedSpacePattern.test(desc) && noGasTestPattern.test(desc)) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "CRITICAL");
    rule_overrides.push({
      rule: "CONFINED_SPACE_NO_GAS_TEST",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Confined space entry with missing gas test or permit",
    });
  }

  // ── Guardrail 4: Work at height with missing fall protection ───────────────
  const heightPattern =
    /work(ing)?\s+at\s+height|elevated\s+work|scaffold|ladder|roof\s+top|above\s+ground/i;
  const noFallProtPattern =
    /no\s+harness|without\s+harness|harness\s+not|no\s+lanyard|lanyard\s+not|fall\s+protection\s+missing|no\s+fall\s+protection|unanchored/i;

  if (heightPattern.test(desc) && noFallProtPattern.test(desc)) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "HIGH");
    rule_overrides.push({
      rule: "HEIGHT_NO_FALL_PROTECTION",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Work at height with missing, unanchored or failed fall protection",
    });
  }

  // ── Guardrail 5: Energised equipment / live line without LOTO ─────
  // Handles safe negative states: "de-energized", "not energized",
  // "never energized", "no longer energized", "isolated", as well as justified
  // exemptions like "LOTO not required" or "isolation not required".
  // Triggers only on active energized states without LOTO or genuine electrical hazards.
  const isLotoExempt =
    /\b(loto|isolation)\s+(was\s+)?not\s+(required|needed|necessary|applicable)\b/i.test(desc) ||
    /\b(no|without)\s+(loto|isolation)\s+(was\s+)?(required|needed|necessary|applicable)\b/i.test(desc) ||
    /\b(loto|isolation)\s+exempt\b/i.test(desc);

  const directElectricalHazard =
    /\b(live\s+(line|wire|circuit|cable|conductor|busbar)|loto\s+(bypassed?|failed?|breached?|violated?|omitted?)|isolation\s+(bypassed?|failed?|breached?|violated?|omitted?))\b/i;

  const missingLotoPattern =
    /\b(loto\s+not\s+(applied|followed|done|performed|implemented|used|installed|verified|in\s+place)|isolation\s+not\s+(applied|followed|done|performed|implemented|used|installed|verified|in\s+place))\b/i;

  const noLotoDirect =
    /\b(no|without)\s+loto\b(?!\s+(was\s+)?(required|needed|necessary|applicable))\b/i;

  const unisolatedDirect =
    /\b(not|without)\s+isolation\b(?!\s+(was\s+)?(required|needed|necessary|applicable))\b/i;

  let hasEnergisedHazard = false;

  if (
    directElectricalHazard.test(desc) ||
    missingLotoPattern.test(desc) ||
    noLotoDirect.test(desc) ||
    unisolatedDirect.test(desc)
  ) {
    // If the observation is a safe exemption without active live electrical energy, do not trigger
    if (!isLotoExempt || /\b(live\s+(line|wire|circuit|cable|conductor|busbar)|energiz|energis)/i.test(desc)) {
      hasEnergisedHazard = true;
    }
  }

  if (!hasEnergisedHazard && !isLotoExempt) {
    // Check if "energised"/"energized" appears in an active (non-negated) hazard context
    const energisedMatches = desc.matchAll(/(?:\b[\w-]+\s+){0,4}\b(de-?|un-?)?energi[sz]e?d\b/gi);
    for (const match of energisedMatches) {
      const prefix = (match[1] || "").toLowerCase();
      if (prefix.startsWith("de") || prefix.startsWith("un")) {
        continue; // safe de-energized / unenergized state
      }
      const phrase = match[0].toLowerCase();
      const isNegated =
        /\b(de-?|not|never|no\s+longer|was\s+not|were\s+not|is\s+not|are\s+not|un-?|neither)\s*(been\s+)?energi[sz]e?d$/i.test(
          phrase
        );

      if (!isNegated) {
        hasEnergisedHazard = true;
        break;
      }
    }
  }

  if (hasEnergisedHazard) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "CRITICAL");
    rule_overrides.push({
      rule: "ENERGISED_NO_LOTO",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Work on energised equipment without verified isolation/LOTO",
    });
  }

  // ── Guardrail 6: Suspended load / dropped object / person under crane ──────
  const suspendedPattern =
    /suspended\s+load|dropped\s+object|person\s+under\s+(crane|load|hook)|under\s+([a-z0-9.\s-]{0,25})?(load|pipe|bundle|crane|hook|collar|tubular)|beneath\s+the\s+load|crane\s+([a-z\s-]{0,15})?swing/i;

  if (suspendedPattern.test(desc)) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "HIGH");
    rule_overrides.push({
      rule: "SUSPENDED_LOAD",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Suspended load, dropped object, or person under crane/load",
    });
  }

  // ── Guardrail 7: Pressurised line without depressurisation ────────────
  // Context-aware detection: requires explicit uncontrolled pressure release,
  // trapped/residual pressure, missing/bypassed depressurisation, or opening
  // lines/manifolds while pressurized. Does NOT fire on isolated/depressurized
  // lines, proven-empty lines ("no depressurization required because line was proven empty"),
  // or systems verified at zero pressure before opening.
  const isSafePressureState =
    /\b(no|without)\s+depressuri[sz]ation\s+(was\s+)?(required|needed|necessary)\b/i.test(desc) ||
    /\bdepressuri[sz]ation\s+(was\s+)?not\s+(required|needed|necessary)\b/i.test(desc) ||
    /\b(proven|proved)\s+(zero|empty|depressuri[sz]ed)\b/i.test(desc) ||
    /\b(isolated[,\s]+drained\s+and\s+gas-?free|drained\s+and\s+depressuri[sz]ed)\b/i.test(desc) ||
    /\bpressure\s+verified\s+at\s+zero\b/i.test(desc) ||
    /\bverified\s+zero\s+pressure\b/i.test(desc);

  const uncontrolledPressurePattern =
    /\b(trapped|uncontrolled|unexpected|sudden|residual)\s+pressure\b|\bpressure\s+(kick|blowout|spray|burst|rupture|discharge|release)\b|\blive\s+pressure\s+(release|escape|leak|discharge|hazard|spray)\b|\b(well|gas)\s+kick\b|\bblowout\b/i;

  const missingDepressurisationPattern =
    /\b(without|no)\s+depressuri[sz]ation\b(?!\s+(was\s+)?(required|needed|necessary))\b|\bdepressuri[sz]ation\s+(not\s+(done|performed|carried|completed)|bypassed|skipped|omitted|failed)\b|\bnot\s+depressuri[sz]ed\b|\b(without|no)\s+(bleeding|bleed)\s+(off|down)\b/i;

  const openedUnderPressurePattern =
    /\b(manifold|flange|line|pipe|valve|coupling|fitting|vessel)\s+(opened|cracked|loosened|disconnected|unbolted|cut)\s+(under|while|with)\s+(live\s+)?pressure\b|\b(opened|cracked|loosened|disconnected|unbolted|cut)\s+(a\s+)?pressuri[sz]ed\s+(hydrocarbon\s+|gas\s+|oil\s+|steam\s+|fluid\s+)?(line|pipe|manifold|valve|flange|vessel)\b|\b(opened|cracked|loosened|disconnected|unbolted|cut)\s+(while\s+(still\s+)?pressuri[sz]ed|under\s+(live\s+)?pressure)\b/i;

  let hasPressureHazard = false;

  if (uncontrolledPressurePattern.test(desc) || openedUnderPressurePattern.test(desc)) {
    hasPressureHazard = true;
  } else if (missingDepressurisationPattern.test(desc) && !isSafePressureState) {
    hasPressureHazard = true;
  }

  if (hasPressureHazard) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "CRITICAL");
    rule_overrides.push({
      rule: "PRESSURE_NO_DEPRESSURISATION",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Pressurised line or manifold opened without verified depressurisation",
    });
  }

  // ── Guardrail 8: H₂S / toxic gas without detection or BA ─────────────────
  const h2sPattern =
    /h2s|hydrogen\s+sulphide|hydrogen\s+sulfide|toxic\s+gas|h₂s/i;
  const noDetectionPattern =
    /no\s+(gas\s+)?(detector|detection|monitor|monitoring)|without\s+(detector|detection)|no\s+ba|without\s+ba|no\s+breathing\s+apparatus|without\s+breathing\s+apparatus|scba\s+not|no\s+scba/i;

  if (h2sPattern.test(desc) && noDetectionPattern.test(desc)) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "CRITICAL");
    rule_overrides.push({
      rule: "H2S_NO_DETECTION",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "H₂S/toxic gas area entered without detection or breathing apparatus",
    });
  }

  // ── Guardrail 9: Excavation >1.2m without shoring ─────────────────────────
  const excavationPattern =
    /excavat(ion|ed|ing)|trenching|digging|pit\s+\d|trench\s+\d/i;
  const noShoringPattern =
    /no\s+shoring|without\s+shoring|no\s+benching|without\s+benching|unsupported\s+trench|no\s+support/i;
  // Look for depth cues > 1.2m
  const depthPattern =
    /\b([2-9](\.\d+)?\s*m|1\.[2-9]\d*\s*m|1[3-9]\s*m|[2-9]\d+\s*m|[2-9]\d*\.\d*\s*m|deep\s+trench|deep\s+excavat)/i;

  if (
    excavationPattern.test(desc) &&
    noShoringPattern.test(desc) &&
    depthPattern.test(desc)
  ) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "HIGH");
    rule_overrides.push({
      rule: "DEEP_EXCAVATION_NO_SHORING",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Excavation deeper than 1.2m without shoring/benching",
    });
  }

  // ── Guardrail 10: Hot work without permit / gas test near hydrocarbons ─────
  const hotWorkPattern =
    /hot\s+work|welding|grinding|cutting|spark|open\s+flame/i;
  const noHotWorkControlPattern =
    /no\s+(hot\s+work\s+)?permit|without\s+(hot\s+work\s+)?permit|no\s+gas\s+test|without\s+gas\s+test|near\s+hydrocarbons|hydrocarbon\s+area|flammable/i;

  if (hotWorkPattern.test(desc) && noHotWorkControlPattern.test(desc)) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "CRITICAL");
    rule_overrides.push({
      rule: "HOT_WORK_NO_PERMIT",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Hot work without permit or gas test near hydrocarbons",
    });
  }

  // ── Guardrail 11: Vehicle safety violations ────────────────────────────────
  const vehiclePattern =
    /vehicle|truck|car|driving|driver|transport|HGV|LGV|forklift/i;
  const vehicleViolationPattern =
    /no\s+seatbelt|without\s+seatbelt|seatbelt\s+not|over.?speed(ing)?|speed(ing)?\s+limit|fatigue|drowsy|sleeping\s+driver|night\s+driv(ing)?|off.?plan/i;

  if (vehiclePattern.test(desc) && vehicleViolationPattern.test(desc)) {
    const orig = result.risk_band;
    result.sif_potential = true;
    result.risk_band = escalateBand(result.risk_band as Band, "HIGH");
    rule_overrides.push({
      rule: "VEHICLE_SAFETY_VIOLATION",
      triggered: true,
      original_band: orig,
      forced_band: result.risk_band,
      reason: "Vehicle safety violation: no seatbelt, over-speeding, fatigue, or night driving off-plan",
    });
  }

  // ── Guardrail 12: Dismissive language + high energy ───────────────────────
  const dismissivePattern =
    /nothing\s+serious|no\s+harm|minor\s+only|luckily|lucky\s+(no|there|nobody)|fortunately\s+no/i;
  const hasHighEnergy =
    result.energy_source &&
    result.energy_source.length > 0 &&
    result.risk_band !== "LOW";

  if (dismissivePattern.test(desc) && hasHighEnergy) {
    result.needs_human_review = true;
    result.review_reasons = [
      ...new Set([...result.review_reasons, "DISMISSIVE_LANGUAGE"]),
    ];
    rule_overrides.push({
      rule: "DISMISSIVE_LANGUAGE",
      triggered: true,
      reason: "Dismissive wording detected alongside high-energy source identification",
    });
  }

  // ── Guardrail 13: Low confidence ──────────────────────────────────────────
  if (result.sif_confidence < 0.65) {
    result.needs_human_review = true;
    result.review_reasons = [
      ...new Set([...result.review_reasons, "LOW_CONFIDENCE"]),
    ];
    rule_overrides.push({
      rule: "LOW_CONFIDENCE",
      triggered: true,
      reason: `sif_confidence ${result.sif_confidence.toFixed(3)} < 0.65 threshold`,
    });
  }

  // ── Guardrail 14: High energy without barrier ─────────────────────────────
  const hasHighEnergySource =
    result.energy_source &&
    result.energy_source.length > 3 &&
    !["none", "n/a", "unknown"].includes(
      result.energy_source.toLowerCase().trim()
    );
  const hasNoBarriers =
    !result.barriers || result.barriers.length === 0;

  if (hasHighEnergySource && hasNoBarriers) {
    result.needs_human_review = true;
    result.review_reasons = [
      ...new Set([...result.review_reasons, "NO_BARRIER_IDENTIFIED"]),
    ];
    rule_overrides.push({
      rule: "NO_BARRIER_IDENTIFIED",
      triggered: true,
      reason: "High-energy source identified but no barriers were listed",
    });
  }

  // ── Guardrail 15: SIF potential without lsr_tags ──────────────────────────
  if (result.sif_potential && result.lsr_tags.length === 0) {
    result.needs_human_review = true;
    result.review_reasons = [
      ...new Set([...result.review_reasons, "SIF_WITHOUT_LSR"]),
    ];
    rule_overrides.push({
      rule: "SIF_WITHOUT_LSR",
      triggered: true,
      reason: "Report flagged as SIF-potential but no Life-Saving Rule tags provided",
    });
  }

  return { result, rule_overrides };
}
