# AGENTS.md — SIF Sentinel Master Build Prompt

> Re-read this file at the start of every task. All decisions not covered by this spec go into DECISIONS.md.

## Project

**SIF Sentinel** — AI/NLP Engine to Detect Serious Injury & Fatality (SIF) Precursors in Unsafe-Act, Unsafe-Condition, Near-Miss, and Incident reports.

Reference: SIH26165 — Oil India Limited (OIL).

## Non-Negotiable Constraints

1. No custom/self-trained ML models. All NLP via Google Gemini API only.
2. A deterministic rule layer in TypeScript is required (lib/ai/guardrails.ts).
3. Never fake AI output. ANALYSIS_FAILED → retry queue.
4. Google OAuth only — no email/password.
5. Multi-tenant with Row Level Security enforced at DB level.
6. Everything persists in Supabase Postgres. No in-memory source of truth.
7. All secrets in .env.local. GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY never in any client bundle.
8. Gemini called only from server-side route handlers / Edge Functions.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router + TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui + lucide-react |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | react-hook-form + zod |
| Database | Supabase Postgres + pgvector |
| Auth | Supabase Auth → Google OAuth |
| AI | @google/genai — gemini-2.5-flash + gemini-embedding-001 |
| Email | Resend |
| Deploy | Vercel |

## Build Order (do not skip phases)

1. Next.js scaffold, Tailwind, shadcn, env plumbing, Supabase clients
2. Full migration SQL + RLS + helper functions
3. Google OAuth, /auth/callback, /not-registered, /register-company, onboarding
4. Profiles, invitations, hierarchy tree UI
5. Report submission + list + detail (no AI yet)
6. Gemini engine + guardrails + persistence + status transitions
7. Role dashboards with real aggregations
8. Review queue + reviews + CAPA actions
9. Embeddings, clustering, Wilson ranking, alerts, notifications
10. Bulk CSV upload + external API + exports
11. Seed script, RLS tests, README, deploy to Vercel

After each phase: `npm run build` must pass with zero TypeScript errors.

## Acceptance Criteria

- Unregistered Google account → /not-registered
- Registering a company makes caller ORG_ADMIN
- Company A gets zero rows from Company B tables (automated test)
- EMPLOYEE cannot see peer's report; SUPERVISOR sees subtree; HSE sees org
- Real Gemini analysis with verbatim evidence spans
- Confined-space-no-gas-test → CRITICAL even with "no injury" wording
- CRITICAL verdict notifies full manager chain + HSE within seconds
- No SIF-flagged report can reach CLOSED without a reviews row
- Five dashboards show distinct, role-correct data from DB
- Wilson LB: 2/2 does not outrank 18/30
- GEMINI_API_KEY never in any client bundle

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
