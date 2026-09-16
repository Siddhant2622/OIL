import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskBand } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Risk-band → Tailwind colour class mapping (spec §9 colours) */
export const riskBandColors: Record<
  RiskBand,
  { text: string; bg: string; border: string; badge: string }
> = {
  CRITICAL: {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-600 text-white",
  },
  HIGH: {
    text: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-600 text-white",
  },
  MEDIUM: {
    text: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-600 text-white",
  },
  LOW: {
    text: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-600 text-white",
  },
};

/** Format a UTC ISO string to a human-readable local date */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** Format a UTC ISO string to date + time */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Slugify a company name */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Generate a sequential report code: ORG-YYYY-NNNNNN */
export function generateReportCode(slug: string, seq: number): string {
  const year = new Date().getFullYear();
  const n = String(seq).padStart(6, "0");
  return `${slug.toUpperCase().slice(0, 6)}-${year}-${n}`;
}

/** Wilson Lower Bound for proportion confidence interval (95%) */
export function wilsonLB(pos: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = pos / n;
  return (
    (p +
      (z * z) / (2 * n) -
      z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}

/** Truncate text to a max length with ellipsis */
export function truncate(text: string, max = 120): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

/** Highlight evidence spans in a narrative — returns segments */
export function highlightSpans(
  text: string,
  spans: string[]
): { text: string; highlighted: boolean }[] {
  if (!spans.length) return [{ text, highlighted: false }];

  // Sort spans by first occurrence to avoid overlapping matches
  const sorted = [...spans].sort(
    (a, b) => text.indexOf(a) - text.indexOf(b)
  );

  const segments: { text: string; highlighted: boolean }[] = [];
  let cursor = 0;

  for (const span of sorted) {
    const idx = text.indexOf(span, cursor);
    if (idx === -1) continue;
    if (idx > cursor) {
      segments.push({ text: text.slice(cursor, idx), highlighted: false });
    }
    segments.push({ text: span, highlighted: true });
    cursor = idx + span.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlighted: false });
  }

  return segments;
}

/** Role display labels */
export const roleLabels: Record<string, string> = {
  ORG_ADMIN: "Company Admin",
  HSE_MANAGER: "HSE Manager",
  DEPT_HEAD: "Department Head",
  SUPERVISOR: "Supervisor",
  EMPLOYEE: "Employee",
};

/** Report type display labels */
export const reportTypeLabels: Record<string, string> = {
  UNSAFE_ACT: "Unsafe Act",
  UNSAFE_CONDITION: "Unsafe Condition",
  NEAR_MISS: "Near Miss",
  INCIDENT: "Incident",
};

/** Report status display labels */
export const reportStatusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  ANALYZING: "Analyzing",
  ANALYZED: "Analyzed",
  ANALYSIS_FAILED: "Analysis Failed",
  IN_REVIEW: "In Review",
  CONFIRMED_SIF: "Confirmed SIF",
  CONFIRMED_NON_SIF: "Confirmed Non-SIF",
  ACTIONS_OPEN: "Actions Open",
  CLOSED: "Closed",
};

/** The 9 IOGP Life-Saving Rules */
export const LIFE_SAVING_RULES = [
  "Bypassing Safety Controls",
  "Confined Space",
  "Driving",
  "Energy Isolation",
  "Hot Work",
  "Line of Fire",
  "Safe Mechanical Lifting",
  "Work Authorisation",
  "Working at Height",
] as const;

export type LifeSavingRule = (typeof LIFE_SAVING_RULES)[number];
