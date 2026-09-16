# SIF Sentinel

> AI/NLP Engine to Detect Serious Injury & Fatality (SIF) Precursors in Unsafe-Act, Unsafe-Condition, Near-Miss and Incident Reports.
>
> Reference: SIH26165 — Oil India Limited (OIL).

---

## What it does

SIF Sentinel reads free-text safety observation reports and identifies the ~20% that carried genuine fatal potential — the ones a numerical severity scale missed.

Every analysis follows a deterministic reasoning chain:

```
ENERGY → BARRIER → EXPOSURE → RULE → VERDICT
```

Powered by **Google Gemini 2.5 Flash** with 15 deterministic TypeScript guardrails running after every response.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15+ App Router + TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase Postgres + pgvector |
| Auth | Supabase Auth → Google OAuth only |
| AI | `@google/genai` — gemini-2.5-flash + gemini-embedding-001 |
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
git clone https://github.com/your-org/sif-sentinel
cd sif-sentinel
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
```

### 3. Run database migrations

Paste the contents of these files into your Supabase SQL editor **in order**:

```
supabase/migrations/0001_init.sql     # Tables, enums, indexes
supabase/migrations/0002_rls.sql      # RLS policies + helper functions
supabase/migrations/0003_triggers.sql # Audit triggers + SIF review guard
```

Or use the Supabase CLI:
```bash
npx supabase db push
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
4. Go to **Team** → invite users by email
5. Invited users sign in and are automatically given the correct role
6. Submit a hazard report and watch the AI analyse it

---

## Seed demo data

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
```

Creates 10 synthetic reports covering all 9 IOGP Life-Saving Rule scenarios. You must have registered a company first.

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

---

## Key Files

| File | Purpose |
|---|---|
| `lib/ai/gemini.ts` | Gemini API calls, response schema, embeddings |
| `lib/ai/guardrails.ts` | 15 deterministic post-Gemini rules |
| `lib/ai/pipeline.ts` | End-to-end analysis orchestration |
| `supabase/migrations/` | Full schema, RLS, triggers |
| `supabase/functions/cluster-compute/` | Wilson LB clustering Edge Function |
| `DECISIONS.md` | Architecture decision log |
| `AGENTS.md` | Master build instructions |

---

## Security Notes

- `GEMINI_API_KEY` is **only** used in server-side Route Handlers and Edge Functions. It never appears in any client bundle.
- `SUPABASE_SERVICE_ROLE_KEY` similarly server-only.
- Every table has Row Level Security enabled. Company A cannot read any row from Company B.
- No email/password authentication. Google OAuth only.

---

## Acceptance Test Checklist

- [ ] Unregistered Google account → `/not-registered`
- [ ] Registering a company makes caller `ORG_ADMIN`
- [ ] Employee cannot see peer's reports; supervisor sees subtree; HSE sees org
- [ ] Confined-space-no-gas-test → `CRITICAL` even with "no injury" wording
- [ ] Evidence spans are verbatim substrings of original text
- [ ] `CRITICAL` verdict notifies full manager chain + HSE
- [ ] SIF report cannot reach `CLOSED` without a reviews row (DB trigger enforces)
- [ ] Wilson LB: 2/2 does not outrank 18/30
- [ ] `GEMINI_API_KEY` not in any client bundle (check Network tab / bundle analysis)

---

## License

Built for Smart India Hackathon 2025 (SIH26165). Not an official Oil India Limited system. All demo data is synthetic.
