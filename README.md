# SIF Sentinel

[![CI](https://github.com/Siddhant2622/OIL/actions/workflows/ci.yml/badge.svg)](https://github.com/Siddhant2622/OIL/actions/workflows/ci.yml)

> AI/NLP Engine to Detect Serious Injury & Fatality (SIF) Precursors in Unsafe-Act, Unsafe-Condition, Near-Miss and Incident Reports.
>
> Reference: **SIH26165** — Oil India Limited (OIL). Built for Smart India Hackathon 2026.

---

## What it does

SIF Sentinel reads free-text safety observation reports and identifies the ~20% that carry genuine fatal potential — the ones a numerical severity scale alone misses.

Every analysis follows a deterministic reasoning chain:

```
ENERGY → BARRIER → EXPOSURE → RULE → VERDICT
```

Powered by **Google Gemini 2.5 Flash** with 15 deterministic TypeScript guardrails applied after every AI response. Guardrails can only escalate — never downgrade — a Gemini verdict.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3+ App Router + TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui + lucide-react |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | react-hook-form + zod |
| Database | Supabase Postgres + pgvector |
| Auth | Supabase Auth → Google OAuth only |
| AI | `@google/genai` — gemini-2.5-flash + gemini-embedding-001 |
| Email | Resend |
| Deploy | Vercel |

---

## Prerequisites

- Node.js 22+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google Cloud](https://console.cloud.google.com) project with:
  - OAuth 2.0 credentials (Web application)
  - Gemini API key (from [Google AI Studio](https://aistudio.google.com))

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/Siddhant2622/OIL
cd OIL
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # NEVER expose to browser

GEMINI_API_KEY=AIza...                  # NEVER expose to browser

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: email alerts via Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=alerts@yourorg.com
```

### 3. Run database migrations

Paste the contents of these files into your Supabase SQL editor **in order**:

```
supabase/migrations/0001_init.sql               # Tables, enums, indexes
supabase/migrations/0002_rls.sql                # RLS policies + helper functions
supabase/migrations/0003_triggers.sql           # Audit triggers + SIF review guard
supabase/migrations/0004_security_hardening.sql # Profile field protection triggers
supabase/migrations/0005_invitation_hierarchy.sql # Invitation hierarchy persistence
```

Or use the Supabase CLI:
```bash
supabase db push
```

### 4. Configure Google OAuth

In your Supabase project → Authentication → Providers → Google:
- Client ID and Secret from Google Cloud Console
- Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

In Google Cloud Console → Credentials → OAuth:
- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`

### 5. Start development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## First-time Setup

1. Click **Register your company** on the landing page
2. Sign in with Google (must be the owner/admin)
3. Fill in company details → you become `ORG_ADMIN`
4. Go to **Team** → invite users by email with their role
5. Invited users sign in and are automatically assigned the correct role and hierarchy position
6. Submit a hazard observation and watch the AI analyse it in real time

---

## Seed demo data

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
```

Creates 10 synthetic reports covering all 9 IOGP Life-Saving Rule scenarios. You must have registered a company first.

---

## Run RLS isolation tests

```bash
npm run test:rls
```

Verifies that cross-organization data isolation is enforced at the database level. Requires:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

> **Note on Test Authentication Model**: End-user production access strictly uses Google OAuth only (`No email/password authentication`). For headless CI/CD test automation, `npm run test:rls` uses the Supabase Admin API to programmatically provision and authenticate test user accounts for two separate organizations (`Org Alpha` and `Org Beta`). This mints real, scoped JWT sessions to directly exercise PostgreSQL RLS policies (`auth.uid()`, `current_org_id()`) without requiring interactive browser OAuth prompts. All test entities are completely purged from the database upon completion.

---

## Deploy to Vercel

```bash
vercel deploy --prod
```

Required environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_APP_URL` (your Vercel deployment URL)
- `RESEND_API_KEY` *(optional — email alerts)*
- `RESEND_FROM_EMAIL` *(optional)*

---

## Key Files

| File | Purpose |
|---|---|
| `lib/ai/gemini.ts` | Gemini API calls, response schema, embeddings |
| `lib/ai/guardrails.ts` | 15 deterministic post-Gemini guardrails |
| `lib/ai/pipeline.ts` | End-to-end analysis orchestration |
| `app/api/analyze/route.ts` | Report analysis endpoint (server-only) |
| `app/api/benchmark/route.ts` | Evaluation Lab live inference endpoint |
| `supabase/migrations/` | Full schema (5 files, 0001–0005) |
| `tests/rls.test.ts` | RLS cross-org isolation test suite |
| `DECISIONS.md` | Architecture decision log |
| `AGENTS.md` | Master build instructions |

---

## CI / Automated Verification

Every push to `main` runs:
1. `npm run type-check` — zero TypeScript errors
2. `npm run build` — zero build errors
3. `npm run test:rls` — RLS isolation verification (if secrets configured)

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## Security Notes

- `GEMINI_API_KEY` is **only** used in server-side Route Handlers and Edge Functions. It never appears in any client bundle.
- `SUPABASE_SERVICE_ROLE_KEY` is similarly server-only.
- Every table has Row Level Security enabled. Company A cannot read any row from Company B.
- No email/password authentication. Google OAuth only.
- `/api/analyze` enforces role-based report access: employees can only trigger analysis on their own reports; supervisors on their subtree; HSE/Admin on the full org.

---

## Acceptance Test Checklist

- [ ] Unregistered Google account → `/not-registered`
- [ ] Registering a company makes caller `ORG_ADMIN`
- [ ] Employee cannot see peer`s reports; supervisor sees subtree; HSE sees org
- [ ] `"The pump was de-energized and LOTO verified."` does NOT trigger CRITICAL (Guardrail 5 negative lookbehind)
- [ ] Confined-space-no-gas-test → `CRITICAL` even with "no injury" wording (Guardrail 3)
- [ ] Evidence spans are verbatim substrings of original text (Guardrail 1)
- [ ] `CRITICAL` verdict notifies full manager chain + HSE within seconds
- [ ] SIF report cannot reach `CLOSED` without a reviews row (DB trigger enforces)
- [ ] Wilson LB: 2/2 does not outrank 18/30
- [ ] `GEMINI_API_KEY` not in any client bundle (check Network tab / bundle analysis)
- [ ] `npm run test:rls` passes (cross-org isolation verified)

---

## License

Built for Smart India Hackathon 2026 (SIH26165). Not an official Oil India Limited system. All demo data is synthetic.
