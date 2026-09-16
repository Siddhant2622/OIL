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
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ─── Nav ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              SIF Sentinel
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register-company"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Register your company
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute left-1/3 top-40 h-[300px] w-[400px] rounded-full bg-red-600/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-sm text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Reference: SIH26165 — Oil India Limited</span>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Find the{" "}
            <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              fatal potential
            </span>{" "}
            <br className="hidden sm:block" />
            before it kills someone
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 leading-relaxed">
            SIF Sentinel is an AI/NLP engine that reads your Unsafe-Act,
            Unsafe-Condition, Near-Miss and Incident reports and surfaces the
            ~20% that carried genuine fatal potential — the ones your severity
            scale missed.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register-company"
              className="group flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 hover:shadow-blue-800/60"
            >
              Register your company
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Sign in with Google
            </Link>
          </div>

          {/* Disclaimer */}
          <p className="mt-8 text-xs text-slate-600">
            ⚠ Demo data only. All synthetic reports are clearly labelled. SIF
            Sentinel is not an officially endorsed Oil India Limited system.
          </p>
        </div>
      </section>

      {/* ─── Stats bar ──────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: "~20–25%", label: "Reports carry genuine fatal potential" },
              { value: "9", label: "IOGP Life-Saving Rules monitored" },
              { value: "15", label: "Deterministic guardrails" },
              { value: "0", label: "Custom-trained ML models" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="text-3xl font-extrabold tabular-nums text-white">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-sm text-slate-500">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Energy → Barrier → Exposure → Rule
            </h2>
            <p className="mt-4 text-slate-400">
              Every analysis follows the same rigorous HSE reasoning chain.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                step: "01",
                icon: Zap,
                color: "text-yellow-400",
                bg: "bg-yellow-400/10",
                title: "Energy",
                desc: "What hazardous energy was present? Gravity, electrical, pressure, chemical, thermal…",
              },
              {
                step: "02",
                icon: Shield,
                color: "text-blue-400",
                bg: "bg-blue-400/10",
                title: "Barrier",
                desc: "Was the required control PRESENT, MISSING, FAILED, or BYPASSED?",
              },
              {
                step: "03",
                icon: Eye,
                color: "text-orange-400",
                bg: "bg-orange-400/10",
                title: "Exposure",
                desc: "Was a person in the line of fire, or could they plausibly have been?",
              },
              {
                step: "04",
                icon: AlertTriangle,
                color: "text-red-400",
                bg: "bg-red-400/10",
                title: "Rule",
                desc: "Which of the 9 IOGP Life-Saving Rules does this touch?",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-6"
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="mb-1 text-xs font-mono text-slate-600">
                  STEP {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Guardrails ─────────────────────────────────────────────── */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              15 deterministic guardrails
            </h2>
            <p className="mt-4 text-slate-400">
              Written in TypeScript, running after Gemini. They can only escalate — never downgrade.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Confined space without gas test → CRITICAL",
              "Work at height with missing fall protection → HIGH",
              "Energised equipment without LOTO → CRITICAL",
              "Person under suspended load → HIGH",
              "Pressurised line opened without depressurisation → CRITICAL",
              "H₂S area without detection/BA → CRITICAL",
              "Excavation >1.2m without shoring → HIGH",
              "Hot work without permit near hydrocarbons → CRITICAL",
              "Vehicle: no seatbelt / overspeed / fatigue → HIGH",
              "Dismissive language + high energy → Human review",
              "Confidence < 65% → Human review",
              "High energy, no barriers identified → Human review",
              "Evidence span not verbatim → Dropped + review",
              "LSR tag outside the 9 rules → Stripped",
              "SIF report reaching CLOSED without review → Blocked",
            ].map((rule) => (
              <div
                key={rule}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-4"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-sm text-slate-300">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Role dashboards ────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Five role-aware dashboards
            </h2>
            <p className="mt-4 text-slate-400">
              Each person sees exactly what their role and reporting tree permits — enforced at the database level.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                role: "Employee",
                color: "border-green-500/30 bg-green-500/5",
                icon: "🧑‍🔧",
                desc: "Submit reports from the field. Mobile-first form.",
              },
              {
                role: "Supervisor",
                color: "border-blue-500/30 bg-blue-500/5",
                icon: "👷",
                desc: "Team feed, action tracker, top 3 risks on my patch.",
              },
              {
                role: "Dept Head",
                color: "border-purple-500/30 bg-purple-500/5",
                icon: "🏭",
                desc: "Subtree rollup, site heatmap, barrier-failure alerts.",
              },
              {
                role: "HSE Manager",
                color: "border-orange-500/30 bg-orange-500/5",
                icon: "🛡️",
                desc: "Human review queue, AI vs reality agreement tracking.",
              },
              {
                role: "Org Admin",
                color: "border-red-500/30 bg-red-500/5",
                icon: "🏢",
                desc: "Full company control, org tree, audit log, API keys.",
              },
            ].map((d) => (
              <div
                key={d.role}
                className={`rounded-xl border p-5 ${d.color}`}
              >
                <div className="mb-3 text-2xl">{d.icon}</div>
                <h3 className="mb-1 font-semibold">{d.role}</h3>
                <p className="text-xs text-slate-400">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features grid ──────────────────────────────────────────── */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                icon: Lock,
                title: "Hard multi-tenant isolation",
                desc: "Row Level Security on every table. Company A cannot read a single row belonging to Company B — enforced in Postgres, not just application code.",
              },
              {
                icon: Globe,
                title: "Google OAuth only",
                desc: "No email/password attack surface. Every user signs in with their Google account. Uninvited accounts land on a clear rejection screen.",
              },
              {
                icon: Layers,
                title: "Wilson-ranked clusters",
                desc: "Nightly pattern analysis uses Wilson lower bound at 95% confidence — so a 2-of-2 group can never outrank an 18-of-30 group.",
              },
              {
                icon: BarChart3,
                title: "Verbatim evidence spans",
                desc: "Every AI finding is anchored to exact substrings of the original narrative. No paraphrasing. If it can't quote it, it doesn't claim it.",
              },
              {
                icon: Users,
                title: "Hierarchical visibility",
                desc: "Supervisors see their team. Department heads see their subtree. HSE sees the org. The hierarchy is a real recursive tree stored in Postgres.",
              },
              {
                icon: Zap,
                title: "Real-time critical alerts",
                desc: "A CRITICAL verdict triggers instant push notifications and Resend emails to the entire manager chain + all HSE roles within seconds.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-6"
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/15">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{f.title}</h3>
                  <p className="text-sm text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold">
            Ready to find the fatalities your reports are hiding?
          </h2>
          <p className="mb-10 text-lg text-slate-400">
            Register your company and start analysing reports in minutes.
            No model training. No setup fees.
          </p>
          <Link
            href="/register-company"
            className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-blue-900/40 transition hover:bg-blue-500"
          >
            Register your company
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs text-slate-600">
            SIF Sentinel — Built for SIH26165. Not an official Oil India Limited
            system. All demo data is synthetic.{" "}
            <span className="text-slate-700">
              © {new Date().getFullYear()} SIF Sentinel
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
