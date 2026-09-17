-- ============================================================
-- SIF Sentinel — Migration 0002: RLS + Helper Functions
-- ============================================================
-- IMPORTANT: Enable RLS on every table, then apply policies.
-- Helper functions use SECURITY DEFINER to avoid infinite
-- recursion when profiles policies query profiles.
-- ============================================================

-- ─── SECURITY DEFINER helpers ────────────────────────────────────────────────
-- These bypass RLS and are the single source of truth for
-- identity resolution inside policies.

create or replace function public.current_org_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_org_wide()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('ORG_ADMIN','HSE_MANAGER')
     from profiles
     where id = auth.uid()),
    false
  );
$$;

-- Self + every descendant in the management tree (recursive CTE)
create or replace function public.subordinate_ids(root uuid)
returns table(id uuid)
language sql stable security definer
set search_path = public
as $$
  with recursive tree as (
    select p.id from profiles p where p.id = root
    union all
    select c.id from profiles c join tree t on c.manager_id = t.id
  )
  select id from tree;
$$;

-- Check if caller is strictly senior to a given role (for invitation authz)
create or replace function public.is_strictly_senior_to(target_role user_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case public.current_user_role()
    when 'ORG_ADMIN'   then true
    when 'HSE_MANAGER' then target_role in ('DEPT_HEAD','SUPERVISOR','EMPLOYEE')
    when 'DEPT_HEAD'   then target_role in ('SUPERVISOR','EMPLOYEE')
    when 'SUPERVISOR'  then target_role in ('EMPLOYEE')
    else false
  end;
$$;

-- ─── Enable RLS on all tables ────────────────────────────────────────────────

alter table organizations     enable row level security;
alter table sites             enable row level security;
alter table profiles          enable row level security;
alter table invitations       enable row level security;
alter table reports           enable row level security;
alter table ai_analyses       enable row level security;
alter table report_embeddings enable row level security;
alter table reviews           enable row level security;
alter table actions           enable row level security;
alter table clusters          enable row level security;
alter table notifications     enable row level security;
alter table audit_log         enable row level security;

-- ─── organizations ───────────────────────────────────────────────────────────

create policy "org_select" on organizations
  for select using (id = public.current_org_id());

-- Note: organizations inserts are performed strictly via service role (createAdminClient)
-- which bypasses RLS. Client-side insert is denied by default.

create policy "org_update" on organizations
  for update using (
    id = public.current_org_id()
    and public.current_user_role() = 'ORG_ADMIN'
  );

-- ─── sites ───────────────────────────────────────────────────────────────────

create policy "sites_select" on sites
  for select using (org_id = public.current_org_id());

create policy "sites_insert" on sites
  for insert with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
  );

create policy "sites_update" on sites
  for update using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
  );

create policy "sites_delete" on sites
  for delete using (
    org_id = public.current_org_id()
    and public.current_user_role() = 'ORG_ADMIN'
  );

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Everyone in the org can see the directory.
-- Users can update their own row; ORG_ADMIN can update any row in org.
-- Note: profile creation is service-role only (via /auth/callback and /register-company).
-- Client-side insert is denied by default under RLS.

create policy "profiles_select" on profiles
  for select using (org_id = public.current_org_id());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_update_admin" on profiles
  for update using (
    org_id = public.current_org_id()
    and public.current_user_role() = 'ORG_ADMIN'
  );

-- ─── invitations ─────────────────────────────────────────────────────────────

create policy "invitations_select" on invitations
  for select using (org_id = public.current_org_id());

create policy "invitations_insert" on invitations
  for insert with check (
    org_id = public.current_org_id()
    and public.is_strictly_senior_to(role)
  );

create policy "invitations_update" on invitations
  for update using (
    org_id = public.current_org_id()
    and (
      public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
      or invited_by = auth.uid()
    )
  );

-- ─── reports ─────────────────────────────────────────────────────────────────

create policy "reports_select" on reports
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_org_wide()
      or reporter_id in (select id from public.subordinate_ids(auth.uid()))
    )
  );

create policy "reports_insert" on reports
  for insert with check (
    org_id = public.current_org_id()
    and reporter_id = auth.uid()
  );

create policy "reports_update" on reports
  for update using (
    org_id = public.current_org_id()
    and (
      public.is_org_wide()
      or (reporter_id = auth.uid() and status = 'SUBMITTED')
    )
  );

-- Service role can update status (for AI pipeline)
-- This is handled by the admin client bypassing RLS

-- ─── ai_analyses ─────────────────────────────────────────────────────────────
-- SELECT: visible if the parent report is visible (RLS on reports does the work)

create policy "ai_analyses_select" on ai_analyses
  for select using (
    org_id = public.current_org_id()
    and exists (
      select 1 from reports r where r.id = report_id
    )
  );

-- INSERT: service role only (AI pipeline uses admin client)
-- No client-side insert policy needed

-- ─── report_embeddings ───────────────────────────────────────────────────────

create policy "embeddings_select" on report_embeddings
  for select using (
    org_id = public.current_org_id()
    and exists (
      select 1 from reports r where r.id = report_id
    )
  );

-- ─── reviews ─────────────────────────────────────────────────────────────────

create policy "reviews_select" on reviews
  for select using (
    org_id = public.current_org_id()
    and exists (
      select 1 from reports r where r.id = report_id
    )
  );

create policy "reviews_insert" on reviews
  for insert with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('HSE_MANAGER','ORG_ADMIN')
    and reviewer_id = auth.uid()
  );

-- ─── actions ─────────────────────────────────────────────────────────────────

create policy "actions_select" on actions
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_org_wide()
      or assigned_to = auth.uid()
      or created_by = auth.uid()
      or (
        report_id is not null
        and exists (
          select 1 from reports r where r.id = report_id
        )
      )
    )
  );

create policy "actions_insert" on actions
  for insert with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER','DEPT_HEAD','SUPERVISOR')
  );

create policy "actions_update" on actions
  for update using (
    org_id = public.current_org_id()
    and (
      public.is_org_wide()
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

-- ─── clusters ────────────────────────────────────────────────────────────────

create policy "clusters_select" on clusters
  for select using (org_id = public.current_org_id());

-- Clusters are written by the Edge Function using service role

-- ─── notifications ───────────────────────────────────────────────────────────

create policy "notifications_select" on notifications
  for select using (
    org_id = public.current_org_id()
    and user_id = auth.uid()
  );

create policy "notifications_update" on notifications
  for update using (
    org_id = public.current_org_id()
    and user_id = auth.uid()
  );

-- ─── audit_log ───────────────────────────────────────────────────────────────

create policy "audit_select" on audit_log
  for select using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
  );

-- Audit log is written by service role only
