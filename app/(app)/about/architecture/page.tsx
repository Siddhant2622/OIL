import Link from "next/link";
import {
  Layers,
  Shield,
  Zap,
  Search,
  Cpu,
  Lock,
  ArrowDown,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Database,
  ExternalLink,
} from "lucide-react";

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 py-2">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-primary">
            SYSTEM ARCHITECTURE &amp; DATAFLOW
          </span>
          <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground border">
            SIH26165 — Oil India Limited Spec
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          SIF Sentinel Industrial Intelligence Architecture
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl leading-relaxed">
          A defense-in-depth, deterministic safety engineering pipeline combining Supabase Postgres Row-Level
          Security, pgvector semantic retrieval, Google Gemini 2.5 Flash, 15 TypeScript guardrails, and
          human-in-the-loop HSE review.
        </p>
      </div>

      {/* Visual Pipeline Flowchart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-base font-bold mb-1">End-to-End Safety Dataflow</h2>
        <p className="text-xs text-muted-foreground mb-6">
          Every field observation traverses an 8-stage verification pipeline before any risk closure or mitigation.
        </p>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="rounded-lg border bg-muted/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold font-mono">
                01
              </div>
              <div>
                <div className="font-bold text-sm">Multilingual Ingestion &amp; Row-Level Security</div>
                <p className="text-xs text-muted-foreground">
                  Employee submits observation in English, Hindi, Assamese, or Hinglish. Scoped strictly to company tenant via Postgres RLS.
                </p>
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground border">
              Supabase Auth / RLS
            </span>
          </div>

          <div className="flex justify-center -my-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border bg-muted/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                02
              </div>
              <div>
                <div className="font-bold text-sm">Historical Semantic Retrieval (pgvector)</div>
                <p className="text-xs text-muted-foreground">
                  gemini-embedding-001 generates 768-dim embedding. Cosine distance operator (&lt;=&gt;) pulls top 4-5 historical cases, past barrier states, and reviewer verdicts.
                </p>
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground border">
              Postgres pgvector
            </span>
          </div>

          <div className="flex justify-center -my-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border bg-muted/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold font-mono">
                03
              </div>
              <div>
                <div className="font-bold text-sm">Gemini 2.5 Flash Structured Analysis</div>
                <p className="text-xs text-muted-foreground">
                  Strict Energy → Barrier → Exposure → Life-Saving Rule structured reasoning. Character-for-character verbatim evidence extraction with zero paraphrasing.
                </p>
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground border">
              @google/genai (temp 0.1)
            </span>
          </div>

          <div className="flex justify-center -my-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          {/* Step 4 */}
          <div className="rounded-lg border border-amber-300 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold font-mono">
                04
              </div>
              <div>
                <div className="font-bold text-sm text-amber-950 dark:text-amber-200">
                  15 Deterministic TypeScript Guardrails Layer
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Runs post-Gemini in lib/ai/guardrails.ts. Enforces hard safety floors: confined spaces, live lines without LOTO, and dismissive phrasing are unilaterally escalated.
                </p>
              </div>
            </div>
            <span className="rounded bg-amber-200/80 dark:bg-amber-900/80 px-2 py-1 text-[11px] font-mono font-bold text-amber-950 dark:text-amber-200">
              Deterministic Logic
            </span>
          </div>

          <div className="flex justify-center -my-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          {/* Step 5 */}
          <div className="rounded-lg border bg-muted/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold font-mono">
                05
              </div>
              <div>
                <div className="font-bold text-sm">Instant Safety Broadcast &amp; Alert Dispatch</div>
                <p className="text-xs text-muted-foreground">
                  CRITICAL SIF precursors dispatch real-time in-app notifications plus Resend HTML safety alerts to the full management chain and HSE Head within seconds.
                </p>
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground border">
              Resend + Webhooks
            </span>
          </div>

          <div className="flex justify-center -my-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          {/* Step 6 */}
          <div className="rounded-lg border bg-muted/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold font-mono">
                06
              </div>
              <div>
                <div className="font-bold text-sm">Human HSE Review Queue (Zero-Fake AI Policy)</div>
                <p className="text-xs text-muted-foreground">
                  HSE Managers review, corroborate, or override AI classifications. All overrides are audited and fed into ongoing drift calibration.
                </p>
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground border">
              Human-in-the-Loop
            </span>
          </div>

          <div className="flex justify-center -my-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          {/* Step 7 */}
          <div className="rounded-lg border bg-muted/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold font-mono">
                07
              </div>
              <div>
                <div className="font-bold text-sm">Closed-Loop CAPA Actions &amp; SLA Tracking</div>
                <p className="text-xs text-muted-foreground">
                  AI generates targeted corrective interventions. Owners are assigned with strict due-dates, evidence verification, and supervisor sign-offs.
                </p>
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground border">
              Corrective Actions
            </span>
          </div>

          <div className="flex justify-center -my-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          {/* Step 8 */}
          <div className="rounded-lg border bg-muted/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold font-mono">
                08
              </div>
              <div>
                <div className="font-bold text-sm">Recurring Precursor Intelligence &amp; Command Center</div>
                <p className="text-xs text-muted-foreground">
                  4-dimensional drill-down (Site → Activity → Barrier → Energy) and Wilson lower-bound statistical ranking to eradicate systemic failure modes.
                </p>
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground border">
              Safety Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Architectural Guarantees & Tech Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">Security &amp; Multi-Tenant Isolation</h3>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Postgres Row-Level Security:</strong> Company A cannot read or write Company B rows under any query, enforced at database engine level.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Server-Side Only Secrets:</strong> GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY are strictly loaded on Node.js runtime and never leaked into client bundles.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Role vs Position Separation:</strong> Access permissions (ORG_ADMIN, HSE_MANAGER, SUPERVISOR, EMPLOYEE) decoupled from operational positions (Drilling Head, Shift Supervisor).
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">Deterministic Safety Philosophy</h3>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Unchecked LLM Authority:</strong> An LLM is probabilistic; safety rules are absolute. 15 TypeScript guardrails can escalate risk bands but can never downgrade them.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Verbatim Substring Integrity:</strong> Hallucinated quotes are strictly eliminated via automated substring verification against the original report text.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Official IOGP 9 Life-Saving Rules:</strong> Strict taxonomy matching IOGP standards (Energy Isolation, Confined Space, Line of Fire, Working at Height, etc.).
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
