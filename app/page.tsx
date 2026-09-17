import Link from "next/link";
import {
  Shield,
  Zap,
  Eye,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lock,
  Globe,
  Layers,
  Sparkles,
  Flame,
  Search,
  Check,
  X,
  Play,
} from "lucide-react";

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const error = params?.error || params?.error_code;
  const errorDesc = params?.error_description;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ─── Nav ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-600/30">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white leading-none truncate">
                SIF Sentinel
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider hidden sm:inline">
                INDUSTRIAL SAFETY INTELLIGENCE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/about/architecture"
              className="hidden md:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 transition"
            >
              Architecture
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
            >
              <Play className="h-3 w-3 fill-current" />
              <span className="hidden xs:inline">Judge </span>Demo
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/10 px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register-company"
              className="hidden sm:inline-flex rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500 shadow-sm"
            >
              Register Company
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 sm:pt-32 pb-16 sm:pb-20">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[450px] sm:h-[550px] w-[90vw] sm:w-[850px] rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute left-1/3 top-36 h-[200px] sm:h-[250px] w-[300px] sm:w-[350px] rounded-full bg-red-600/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
          {error && (
            <div className="mb-6 mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-xs text-amber-300 text-left flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Google Sign-in Session Expired</p>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {errorDesc
                    ? errorDesc.replace(/\+/g, " ")
                    : "Your Google authentication session timed out or was interrupted."}{" "}
                  <Link href="/login" className="underline font-semibold text-white hover:text-blue-300 ml-1">
                    Click here to sign in again →
                  </Link>
                </p>
              </div>
            </div>
          )}

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 sm:px-4 py-1.5 text-xs font-semibold text-amber-400 max-w-[95vw] truncate">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">SIH26165 — Oil India Limited (OIL)</span>
          </div>

          <h1 className="mb-6 text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white">
            Detect SIF Precursors Before They Become{" "}
            <span className="bg-gradient-to-r from-red-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              Serious Incidents
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-sm sm:text-lg text-slate-300 leading-relaxed font-normal">
            AI-powered analysis of unsafe acts, unsafe conditions, near misses and incident reports,
            with explainable evidence, Life-Saving Rule mapping, and recurring precursor intelligence.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
            <Link
              href="/demo"
              className="group flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 sm:px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 hover:shadow-red-800/60"
            >
              <Play className="h-4 w-4 fill-current" />
              Launch 3-Min Judge Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register-company"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 sm:px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500"
            >
              Register Company
            </Link>
            <Link
              href="/about/architecture"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 sm:px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              System Architecture
            </Link>
          </div>

          {/* End-to-End Safety Pipeline Flow Strip (User Section 12) */}
          <div className="mt-14 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-md">
            <div className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-400 mb-3">
              SIF Sentinel End-to-End Safety Pipeline
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
              <span className="rounded bg-slate-800 px-3 py-1.5 text-white border border-white/10">
                REPORT
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-slate-800 px-3 py-1.5 text-purple-300 border border-purple-500/30">
                RETRIEVAL (pgvector)
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-slate-800 px-3 py-1.5 text-blue-300 border border-blue-500/30">
                GEMINI 2.5
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-amber-500/20 px-3 py-1.5 text-amber-300 border border-amber-500/40 font-bold">
                15 GUARDRAILS
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-red-500/20 px-3 py-1.5 text-red-300 border border-red-500/40 font-bold">
                SIF VERDICT
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-slate-800 px-3 py-1.5 text-blue-300 border border-blue-500/30">
                LIFE-SAVING RULE
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-slate-800 px-3 py-1.5 text-orange-300 border border-orange-500/30">
                BARRIER FAILURE
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-slate-800 px-3 py-1.5 text-emerald-300 border border-emerald-500/30">
                PRECURSOR INTEL
              </span>
              <span className="text-slate-500">→</span>
              <span className="rounded bg-slate-800 px-3 py-1.5 text-indigo-300 border border-indigo-500/30">
                HSE ACTION
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ──────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10">
        <div className="mx-auto max-w-7xl px-6">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
            <div>
              <dt className="text-3xl font-black tabular-nums text-white">~20–25%</dt>
              <dd className="mt-1 text-xs text-slate-400">Reports carry genuine fatal potential</dd>
            </div>
            <div>
              <dt className="text-3xl font-black tabular-nums text-white">9</dt>
              <dd className="mt-1 text-xs text-slate-400">Official IOGP Life-Saving Rules</dd>
            </div>
            <div>
              <dt className="text-3xl font-black tabular-nums text-white">15</dt>
              <dd className="mt-1 text-xs text-slate-400">Deterministic TypeScript Guardrails</dd>
            </div>
            <div>
              <dt className="text-xl sm:text-2xl font-black text-blue-400">Gemini + Guardrails</dt>
              <dd className="mt-1 text-xs text-slate-400">Hybrid AI + Deterministic Safety Layer</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ─── Why Not Just Severity Comparison (User Section 21) ────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <span className="rounded bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs font-mono font-bold text-red-400">
              SAFETY PARADIGM COMPARISON
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Why Traditional Severity Matrices Fail at Fatal Prevention
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-2xl mx-auto">
              Severity scoring assesses what happened. SIF Sentinel identifies what *could* have happened
              when high hazardous energy meets compromised barriers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traditional Severity */}
            <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-red-500/20 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-400" />
                    <span className="font-bold text-sm text-red-300">TRADITIONAL SEVERITY MATRIX</span>
                  </div>
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-mono font-bold text-red-400">
                    FLAWED
                  </span>
                </div>

                <div className="rounded bg-slate-900/60 p-3 text-xs italic text-slate-300 border border-white/5 mb-4">
                  &ldquo;Maintenance technician opened a pressurized hydrocarbon manifold without verifying LOTO isolation. Luckily nobody was hurt.&rdquo;
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Actual Injury:</span>
                    <span className="font-semibold text-slate-200">None (0 days lost)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Property Damage:</span>
                    <span className="font-semibold text-slate-200">Negligible</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Calculated Score:</span>
                    <span className="font-bold text-green-400">LOW SEVERITY (Level 1)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-red-900/20 border border-red-500/20 p-3 text-xs text-red-300">
                <strong>Result:</strong> Filed away as routine observation. No manager notification, no barrier audit. Precursor recurs until an ignition source triggers a fatal blowout.
              </div>
            </div>

            {/* SIF Sentinel Approach */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-6 flex flex-col justify-between shadow-lg shadow-emerald-950/20">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-300">SIF SENTINEL INTELLIGENCE</span>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
                    CORRECT
                  </span>
                </div>

                <div className="rounded bg-slate-900/60 p-3 text-xs italic text-slate-300 border border-white/5 mb-4">
                  &ldquo;Maintenance technician opened a pressurized hydrocarbon manifold without verifying LOTO isolation. Luckily nobody was hurt.&rdquo;
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Energy Vector:</span>
                    <span className="font-semibold text-amber-300">Pressure / Hydrocarbon</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Barrier Condition:</span>
                    <span className="font-semibold text-rose-300">Energy Isolation (MISSING)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Calculated Risk:</span>
                    <span className="font-black text-red-400">CRITICAL SIF PRECURSOR</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-emerald-900/20 border border-emerald-500/20 p-3 text-xs text-emerald-300">
                <strong>Result:</strong> Guardrails 7 &amp; 12 fire. Instant alert sent to Drilling Head &amp; HSE Head. Precursor pattern logged in Precursor Intelligence; mandatory isolation verification assigned.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 15 Safety Guardrails Differentiator (User Section 14) ───── */}
      <section className="py-20 bg-white/[0.02] border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-mono font-bold text-amber-400">
              CORE TECHNICAL DIFFERENTIATOR
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              15 Deterministic TypeScript Guardrails
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-2xl mx-auto">
              Gemini does not have unchecked authority. Probabilistic outputs are strictly validated by
              deterministic safety rules that can escalate risk but never downgrade it.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { id: "01", name: "Verbatim Substring Integrity", rule: "Rejects hallucinated quotes not present character-for-character" },
              { id: "02", name: "IOGP 9 Life-Saving Rules Enclosure", rule: "Strict adherence to official 9 standard rules only" },
              { id: "03", name: "Confined Space Without Gas Test", rule: "Atmospheric test or permit omitted → Forced CRITICAL" },
              { id: "04", name: "Working at Height Without Fall Prot.", rule: "Missing harness or unanchored lanyard → Forced HIGH" },
              { id: "05", name: "Live Line / Energised Equipment", rule: "Live circuit without verified isolation → Forced CRITICAL" },
              { id: "06", name: "Suspended Load & Line of Fire", rule: "Worker beneath crane hook or swing path → Forced HIGH" },
              { id: "07", name: "Pressurised Hydrocarbon Breached", rule: "Opening manifold without depressurisation → Forced CRITICAL" },
              { id: "08", name: "H₂S / Toxic Gas Without Detection", rule: "Entering toxic atmosphere without BA/detector → Forced CRITICAL" },
              { id: "09", name: "Excavation >1.2m Without Shoring", rule: "Deep trenching without cave-in shoring → Forced HIGH" },
              { id: "10", name: "Hot Work in Flammable Atmosphere", rule: "Welding or grinding without permit near gas → Forced CRITICAL" },
              { id: "11", name: "Vehicle Safety / Night Driving", rule: "Seatbelt violation, fatigue, or speeding → Forced HIGH" },
              { id: "12", name: "Dismissive Language Escalation", rule: "High energy + 'minor/no injury' phrasing → Routes to HSE review" },
              { id: "13", name: "Model Uncertainty Escalation", rule: "Confidence < 65% → Prevents auto-approval; triggers human review" },
              { id: "14", name: "High Energy Zero Barrier Guard", rule: "Severe energy with zero controls listed → Routes to HSE review" },
              { id: "15", name: "SIF Without Life-Saving Rule", rule: "SIF potential identified with missing rule tag → Human audit" },
            ].map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-xs hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-400">
                    GUARDRAIL {g.id}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <h4 className="mt-1 font-bold text-sm text-slate-100">{g.name}</h4>
                <p className="mt-1 text-slate-400">{g.rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Enterprise Safety Capabilities
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Engineered specifically for upstream exploration, drilling, and production operations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
              <Search className="h-6 w-6 text-primary mb-3" />
              <h3 className="text-base font-bold mb-1">pgvector Semantic Retrieval</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Uses 768-dimensional embeddings to match new field reports against historically similar cases, past barrier states, and reviewer overrides.
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
              <Layers className="h-6 w-6 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold mb-1">4D Precursor Intelligence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive drilldown from Site → Activity → Barrier → Energy to uncover recurring failure modes rather than isolated incidents.
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
              <Users className="h-6 w-6 text-blue-400 mb-3" />
              <h3 className="text-base font-bold mb-1">Visual Hierarchy Builder</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permission roles (HSE_MANAGER, SUPERVISOR) cleanly separated from operational positions (Drilling Head, Area Manager).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/5 bg-gradient-to-b from-transparent to-blue-950/20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl sm:text-4xl font-extrabold text-white">
            Experience the SIF Sentinel Safety Engine
          </h2>
          <p className="mb-8 text-sm sm:text-base text-slate-400">
            Launch the scripted 3-minute judge demonstration or register your organization.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-red-900/40 transition hover:bg-red-500"
            >
              <Play className="h-4 w-4 fill-current" />
              Launch Judge Demo
            </Link>
            <Link
              href="/register-company"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-900/40 transition hover:bg-blue-500"
            >
              Register Company
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center space-y-2">
          <p className="text-xs text-slate-500">
            SIF Sentinel — Developed for SIH26165 (Oil India Limited). Demonstration data is synthetic.
          </p>
          <p className="text-[11px] text-slate-600 font-mono">
            © {new Date().getFullYear()} SIF Sentinel · Supabase RLS · pgvector · Gemini 2.5 Flash · 15 Deterministic Guardrails
          </p>
        </div>
      </footer>
    </div>
  );
}
