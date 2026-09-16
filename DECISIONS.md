# DECISIONS.md — SIF Sentinel

> Architectural decisions made where the spec was silent.
> Append new entries; never delete old ones.

---

## 001 — Admin client uses `any` generic

**Date**: 2026-09-16  
**Decision**: The admin Supabase client (`lib/supabase/admin.ts`) uses a plain `any`-typed generic rather than `Database<T>`.  
**Rationale**: Our hand-crafted `Database` type in `types/database.ts` is shaped for developer readability but doesn't satisfy Supabase's internal `GenericSchema` constraint. Rather than rewrite the entire type to match Supabase's expected `Tables<T>` structure (which would require aligning deeply nested generics), we use `any` at the admin layer and enforce correctness at query call sites via explicit type assertions. This is acceptable because the admin client is exclusively server-side and all mutations are guarded by application logic checks.

---

## 002 — Auth callback creates profiles, not server actions

**Date**: 2026-09-16  
**Decision**: Profile creation happens in `/auth/callback` (a Route Handler), not in a Next.js Server Action.  
**Rationale**: The callback URL is where Supabase delivers the OAuth code; the entire user context (email, avatar) is available there. Using a Server Action would require an extra round-trip and could lose the invitation context. The callback uses the service-role admin client to bypass RLS for the initial profile write.

---

## 003 — Guardrails can only escalate, never downgrade

**Date**: 2026-09-16  
**Decision**: `lib/ai/guardrails.ts` uses an `escalateBand()` helper that only moves the risk band toward CRITICAL, never toward LOW.  
**Rationale**: Spec §7.4 is explicit. The guardrails exist to catch cases where Gemini was reassured by dismissive language or missed a pattern (e.g., confined space + no gas test). If Gemini already said CRITICAL, the guardrail does nothing. This is a safety-critical one-way ratchet.

---

## 004 — Embeddings are fire-and-forget in the pipeline

**Date**: 2026-09-16  
**Decision**: `embedAndStore()` in `pipeline.ts` is called without `await`, wrapped in `.catch()` for non-fatal failure logging.  
**Rationale**: Embedding latency (typically 300–800ms) should not block the primary analysis response. If the embedding fails, the report still gets a complete AI analysis and risk verdict. The embedding is only used for semantic clustering in Phase 9, which is computed nightly.

---

## 005 — Wilson Lower Bound at 95% confidence (z=1.96)

**Date**: 2026-09-16  
**Decision**: All cluster rankings use Wilson LB at 95% confidence interval (z = 1.96).  
**Rationale**: Spec §10 explicitly requires Wilson LB to prevent small-sample groups from appearing falsely prominent. At 95%, z=1.96 is the standard value. This ensures that a 2/2 group cannot outrank an 18/30 group, as the spec's acceptance criterion requires.

---

## 006 — No email/password auth; invitation-only org join

**Date**: 2026-09-16  
**Decision**: The only way to join an existing org is via an invitation sent to a specific email address. Unregistered Google accounts see `/not-registered` with a domain hint if available.  
**Rationale**: Spec constraint §3.4. Invitation flow ensures every user is pre-approved by a manager or admin, maintaining the reporting-tree integrity required for RLS scoping.

---

## 007 — Toaster is a custom component, not shadcn/ui

**Date**: 2026-09-16  
**Decision**: Built a custom `Toaster` component (`components/ui/toaster.tsx`) rather than wiring up the full shadcn/ui `sonner` or `toast` primitive.  
**Rationale**: The shadcn toast components require `use-toast` context and Radix primitives that add significant boilerplate for the initial scaffold. Our custom version implements the same API surface (`useToast()`, variants) and can be swapped for the official shadcn component later without changing callsites.

---

## 008 — `middleware.ts` deprecation warning in Next.js 16

**Date**: 2026-09-16  
**Decision**: Build shows a warning that `middleware.ts` is deprecated in favour of `proxy`. We retain `middleware.ts` for now.  
**Rationale**: The `proxy` convention is only available in Next.js 16+. Our project targets Next.js 15+ compatibility. The functionality is identical; this is a naming deprecation only. We will migrate when the project is on a stable Next.js 16 release.

---

## 009 — Bulk CSV upload placeholder in Phase 10

**Date**: 2026-09-16  
**Decision**: The `/hse/upload` route is scaffolded but the full CSV parsing and batch-analysis loop is in Phase 10.  
**Rationale**: Phase ordering. The core report→analysis→review loop must be solid before adding bulk ingestion.

---

## 010 — `next-themes` for dark mode

**Date**: 2026-09-16  
**Decision**: Dark mode implemented via `next-themes` with `ThemeProvider` wrapper.  
**Rationale**: Spec required a dark-capable design system. `next-themes` is the standard Next.js solution and integrates with our Tailwind CSS variable-based design tokens automatically.
