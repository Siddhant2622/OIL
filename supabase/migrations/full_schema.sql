-- ============================================================
-- SIF Sentinel — Complete Clean Database Schema Migration
-- Run this entire script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rzchkxuhsaicbixjysjd/sql/new
-- ============================================================

-- ─── 1. EXTENSIONS ──────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ─── 2. CLEAN UP OLD TYPES/FUNCTIONS IF ANY EXIST ───────────
-- Ensures no mismatched or outdated enums from previous attempts
drop function if exists public.is_strictly_senior_to(user_role) cascade;
drop function if exists public.current_user_role() cascade;

drop type if exists user_role cascade;
drop type if exists report_type cascade;
drop type if exists report_status cascade;
drop type if exists risk_band cascade;
drop type if exists action_status cascade;
drop type if exists invite_status cascade;

-- ─── 3. ENUMS ───────────────────────────────────────────────
create type user_role as enum (
  'ORG_ADMIN',
  'HSE_MANAGER',
  'DEPT_HEAD',
  'SUPERVISOR',
  'EMPLOYEE'
);

create type report_type as enum (
  'UNSAFE_ACT',
  'UNSAFE_CONDITION',
  'NEAR_MISS',
  'INCIDENT'
);

create type report_status as enum (
  'SUBMITTED',
  'ANALYZING',
  'ANALYZED',
  'ANALYSIS_FAILED',
  'IN_REVIEW',
  'CONFIRMED_SIF',
  'CONFIRMED_NON_SIF',
  'ACTIONS_OPEN',
  'CLOSED'
);

create type risk_band as enum (
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW'
);

create type action_status as enum (
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'VERIFIED',
  'OVERDUE'
);

create type invite_status as enum (
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'REVOKED'
);

-- ─── 4. TABLES ──────────────────────────────────────────────

create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  domain      text,
  industry    text not null default 'Oil & Gas - Upstream',
  country     text not null default 'India',
  settings    jsonb not null default '{}'::jsonb,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create table if not exists sites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  site_type   text,
  region      text,
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz not null default now()
);

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        user_role not null default 'EMPLOYEE',
  manager_id  uuid references profiles(id) on delete set null,
  designation text,
  department  text,
  site_id     uuid references sites(id) on delete set null,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        user_role not null,
  manager_id  uuid references profiles(id) on delete set null,
  site_id     uuid references sites(id) on delete set null,
  department  text,
  invited_by  uuid references profiles(id) on delete set null,
  status      invite_status not null default 'PENDING',
  expires_at  timestamptz not null default (now() + interval '14 days'),
  created_at  timestamptz not null default now()
);

create table if not exists reports (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations(id) on delete cascade,
  report_code       text not null,
  reporter_id       uuid not null references profiles(id) on delete cascade,
  site_id           uuid references sites(id) on delete set null,
  report_type       report_type not null,
  occurred_at       timestamptz not null,
  location_text     text,
  activity_text     text,
  description       text not null,
  immediate_action  text,
  reported_severity text,
  contractor        text,
  shift             text,
  source            text not null default 'WEB',
  attachments       jsonb not null default '[]'::jsonb,
  status            report_status not null default 'SUBMITTED',
  created_at        timestamptz not null default now()
);

create table if not exists ai_analyses (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations(id) on delete cascade,
  report_id            uuid not null references reports(id) on delete cascade,
  model                text not null,
  prompt_version       text not null,
  sif_potential        boolean not null,
  sif_confidence       numeric(4,3) not null check (sif_confidence between 0 and 1),
  risk_band            risk_band not null,
  energy_source        text,
  hazard               text,
  activity             text,
  location_type        text,
  equipment            text,
  barriers             jsonb not null default '[]'::jsonb,
  lsr_tags             text[] not null default '{}',
  precursor_type       text,
  evidence_spans       jsonb not null default '[]'::jsonb,
  rationale            text,
  recommended_actions  jsonb not null default '[]'::jsonb,
  needs_human_review   boolean not null default false,
  review_reasons       text[] not null default '{}',
  rule_overrides       jsonb not null default '[]'::jsonb,
  latency_ms           int,
  raw_response         jsonb,
  created_at           timestamptz not null default now()
);

create table if not exists report_embeddings (
  report_id  uuid primary key references reports(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  embedding  vector(768)
);

create table if not exists reviews (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  report_id       uuid not null references reports(id) on delete cascade,
  reviewer_id     uuid not null references profiles(id) on delete cascade,
  agreed          boolean not null,
  final_sif       boolean not null,
  final_band      risk_band not null,
  final_lsr_tags  text[] not null default '{}',
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists actions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  report_id     uuid references reports(id) on delete cascade,
  title         text not null,
  description   text,
  assigned_to   uuid references profiles(id) on delete set null,
  created_by    uuid references profiles(id) on delete set null,
  due_date      date,
  priority      text not null default 'MEDIUM',
  status        action_status not null default 'OPEN',
  completed_at  timestamptz,
  verified_by   uuid references profiles(id) on delete set null,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists clusters (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  key_type      text not null,
  key_value     text not null,
  report_count  int not null,
  sif_count     int not null,
  density       numeric(5,4) not null,
  wilson_lb     numeric(5,4) not null,
  window_days   int not null default 90,
  is_alerting   boolean not null default false,
  computed_at   timestamptz not null default now()
);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  actor_id    uuid,
  action      text not null,
  entity      text,
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ─── 5. INDEXES ─────────────────────────────────────────────
create index if not exists idx_profiles_org_id on profiles(org_id);
create index if not exists idx_profiles_manager_id on profiles(manager_id);
create unique index if not exists idx_profiles_email on profiles(lower(email));

create unique index if not exists idx_invitations_pending on invitations(org_id, lower(email)) where status = 'PENDING';

create unique index if not exists idx_reports_code on reports(org_id, report_code);
create index if not exists idx_reports_org_created on reports(org_id, created_at desc);
create index if not exists idx_reports_reporter on reports(reporter_id);
create index if not exists idx_reports_status on reports(org_id, status);

create index if not exists idx_ai_analyses_report on ai_analyses(report_id);
create index if not exists idx_ai_analyses_band on ai_analyses(org_id, risk_band);
create index if not exists idx_ai_analyses_review on ai_analyses(org_id, needs_human_review) where needs_human_review = true;

create index if not exists idx_reviews_report on reviews(report_id);
create index if not exists idx_reviews_org on reviews(org_id);

create index if not exists idx_actions_status on actions(org_id, status);
create index if not exists idx_actions_assigned on actions(assigned_to);
create index if not exists idx_actions_report on actions(report_id);

create index if not exists idx_clusters_wilson on clusters(org_id, wilson_lb desc);
create index if not exists idx_clusters_alerting on clusters(org_id, is_alerting) where is_alerting = true;

create index if not exists idx_notifications_unread on notifications(user_id, read_at);
create index if not exists idx_notifications_user_created on notifications(user_id, created_at desc);

create index if not exists idx_audit_log_org on audit_log(org_id, created_at desc);
create index if not exists idx_audit_log_actor on audit_log(actor_id);

-- ─── 6. SECURITY DEFINER HELPER FUNCTIONS ───────────────────
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

-- ─── 7. ENABLE ROW LEVEL SECURITY ───────────────────────────
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

-- ─── 8. POLICIES (Idempotent: drop before create) ───────────

-- organizations
drop policy if exists "org_select" on organizations;
create policy "org_select" on organizations
  for select using (id = public.current_org_id());

drop policy if exists "org_insert" on organizations;
create policy "org_insert" on organizations
  for insert with check (true);

drop policy if exists "org_update" on organizations;
create policy "org_update" on organizations
  for update using (
    id = public.current_org_id()
    and public.current_user_role() = 'ORG_ADMIN'
  );

-- sites
drop policy if exists "sites_select" on sites;
create policy "sites_select" on sites
  for select using (org_id = public.current_org_id());

drop policy if exists "sites_insert" on sites;
create policy "sites_insert" on sites
  for insert with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
  );

drop policy if exists "sites_update" on sites;
create policy "sites_update" on sites
  for update using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
  );

drop policy if exists "sites_delete" on sites;
create policy "sites_delete" on sites
  for delete using (
    org_id = public.current_org_id()
    and public.current_user_role() = 'ORG_ADMIN'
  );

-- profiles
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (org_id = public.current_org_id());

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert with check (true);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles
  for update using (
    org_id = public.current_org_id()
    and public.current_user_role() = 'ORG_ADMIN'
  );

-- invitations
drop policy if exists "invitations_select" on invitations;
create policy "invitations_select" on invitations
  for select using (org_id = public.current_org_id());

drop policy if exists "invitations_insert" on invitations;
create policy "invitations_insert" on invitations
  for insert with check (
    org_id = public.current_org_id()
    and public.is_strictly_senior_to(role)
  );

drop policy if exists "invitations_update" on invitations;
create policy "invitations_update" on invitations
  for update using (
    org_id = public.current_org_id()
    and (
      public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
      or invited_by = auth.uid()
    )
  );

-- reports
drop policy if exists "reports_select" on reports;
create policy "reports_select" on reports
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_org_wide()
      or reporter_id in (select id from public.subordinate_ids(auth.uid()))
    )
  );

drop policy if exists "reports_insert" on reports;
create policy "reports_insert" on reports
  for insert with check (
    org_id = public.current_org_id()
    and reporter_id = auth.uid()
  );

drop policy if exists "reports_update" on reports;
create policy "reports_update" on reports
  for update using (
    org_id = public.current_org_id()
    and (
      public.is_org_wide()
      or (reporter_id = auth.uid() and status = 'SUBMITTED')
    )
  );

-- ai_analyses
drop policy if exists "ai_analyses_select" on ai_analyses;
create policy "ai_analyses_select" on ai_analyses
  for select using (
    org_id = public.current_org_id()
    and exists (
      select 1 from reports r where r.id = report_id
    )
  );

-- report_embeddings
drop policy if exists "embeddings_select" on report_embeddings;
create policy "embeddings_select" on report_embeddings
  for select using (
    org_id = public.current_org_id()
    and exists (
      select 1 from reports r where r.id = report_id
    )
  );

-- reviews
drop policy if exists "reviews_select" on reviews;
create policy "reviews_select" on reviews
  for select using (
    org_id = public.current_org_id()
    and exists (
      select 1 from reports r where r.id = report_id
    )
  );

drop policy if exists "reviews_insert" on reviews;
create policy "reviews_insert" on reviews
  for insert with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('HSE_MANAGER','ORG_ADMIN')
    and reviewer_id = auth.uid()
  );

-- actions
drop policy if exists "actions_select" on actions;
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

drop policy if exists "actions_insert" on actions;
create policy "actions_insert" on actions
  for insert with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER','DEPT_HEAD','SUPERVISOR')
  );

drop policy if exists "actions_update" on actions;
create policy "actions_update" on actions
  for update using (
    org_id = public.current_org_id()
    and (
      public.is_org_wide()
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

-- clusters
drop policy if exists "clusters_select" on clusters;
create policy "clusters_select" on clusters
  for select using (org_id = public.current_org_id());

-- notifications
drop policy if exists "notifications_select" on notifications;
create policy "notifications_select" on notifications
  for select using (
    org_id = public.current_org_id()
    and user_id = auth.uid()
  );

drop policy if exists "notifications_update" on notifications;
create policy "notifications_update" on notifications
  for update using (
    org_id = public.current_org_id()
    and user_id = auth.uid()
  );

-- audit_log
drop policy if exists "audit_select" on audit_log;
create policy "audit_select" on audit_log
  for select using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('ORG_ADMIN','HSE_MANAGER')
  );

-- ─── 9. TRIGGERS & TRIGGER FUNCTIONS ────────────────────────

-- SIF Review Guard Trigger
create or replace function public.enforce_sif_review_before_close()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'CLOSED' and old.status <> 'CLOSED' then
    if exists (
      select 1 from ai_analyses a
      where a.report_id = new.id
        and a.sif_potential = true
    ) then
      if not exists (
        select 1 from reviews r
        where r.report_id = new.id
      ) then
        raise exception
          'SIF-potential reports cannot be closed without a human review. Create a review record first. (report_id=%)', new.id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_sif_review on reports;
create trigger trg_enforce_sif_review
  before update on reports
  for each row execute function public.enforce_sif_review_before_close();

-- Overdue Actions Trigger
create or replace function public.check_action_overdue()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.due_date is not null
     and new.due_date < current_date
     and new.status not in ('COMPLETED','VERIFIED','OVERDUE')
  then
    new.status := 'OVERDUE';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_action_overdue on actions;
create trigger trg_action_overdue
  before insert or update on actions
  for each row execute function public.check_action_overdue();

-- Audit: Report Status Trigger
create or replace function public.audit_report_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into audit_log(org_id, actor_id, action, entity, entity_id, meta)
    values (
      new.org_id,
      auth.uid(),
      'REPORT_STATUS_CHANGED',
      'reports',
      new.id,
      jsonb_build_object(
        'from', old.status::text,
        'to',   new.status::text,
        'code', new.report_code
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_report_status on reports;
create trigger trg_audit_report_status
  after update on reports
  for each row execute function public.audit_report_status();

-- Audit: Profile Created Trigger
create or replace function public.audit_profile_created()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into audit_log(org_id, actor_id, action, entity, entity_id, meta)
  values (
    new.org_id,
    new.id,
    'USER_CREATED',
    'profiles',
    new.id,
    jsonb_build_object(
      'email', new.email,
      'role',  new.role::text
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_profile_created on profiles;
create trigger trg_audit_profile_created
  after insert on profiles
  for each row execute function public.audit_profile_created();

-- Audit: Invitation Status Trigger
create or replace function public.audit_invitation_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into audit_log(org_id, actor_id, action, entity, entity_id, meta)
    values (
      new.org_id,
      auth.uid(),
      'INVITATION_' || upper(new.status::text),
      'invitations',
      new.id,
      jsonb_build_object(
        'email', new.email,
        'role',  new.role::text
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_invitation_status on invitations;
create trigger trg_audit_invitation_status
  after update on invitations
  for each row execute function public.audit_invitation_status();
