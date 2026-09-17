-- ==============================================================================
-- 0006_tighten_rls_and_concurrency.sql
-- Defense-in-depth: Remove overly permissive client-side insert policies on
-- organizations and profiles.
-- The application performs all org and profile provisioning via service role
-- (createAdminClient), which bypasses RLS by design. Denying client-side inserts
-- prevents malicious authenticated users from creating arbitrary organizations
-- or injecting unauthorized profile rows.
--
-- Concurrency: Add unique index on ai_analyses(report_id) to guarantee that
-- reports cannot have duplicate analysis rows.
-- ==============================================================================

-- 1. Drop overly permissive client-side insert policies
drop policy if exists "org_insert" on public.organizations;
drop policy if exists "profiles_insert" on public.profiles;

-- 2. Ensure unique constraint on ai_analyses.report_id
create unique index if not exists idx_ai_analyses_report_id on public.ai_analyses (report_id);
