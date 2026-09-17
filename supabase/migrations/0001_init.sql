-- ============================================================
-- SIF Sentinel — Migration 0001: Full Schema
-- ============================================================
-- Run against Supabase project via:
--   supabase db push
-- or paste into the Supabase SQL editor.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ─── Enums ───────────────────────────────────────────────────────────────────

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

create type risk_band as enum ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

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

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table organizations (
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

create table sites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  site_type   text,    -- Drilling Rig | Workover | Gas Plant | Pipeline | Field Office
  region      text,
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz not null default now()
);

create table profiles (
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

create index on profiles(org_id);
create index on profiles(manager_id);
create unique index on profiles(lower(email));

create table invitations (
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

create unique index on invitations(org_id, lower(email)) where status = 'PENDING';

create table reports (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations(id) on delete cascade,
  report_code       text not null,  -- e.g. OIL-2026-000123
  reporter_id       uuid not null references profiles(id) on delete cascade,
  site_id           uuid references sites(id) on delete set null,
  report_type       report_type not null,
  occurred_at       timestamptz not null,
  location_text     text,
  activity_text     text,
  description       text not null,  -- the free-text narrative the AI reads
  immediate_action  text,
  reported_severity text,           -- what the reporter thought
  contractor        text,
  shift             text,
  source            text not null default 'WEB',  -- WEB | CSV | API
  attachments       jsonb not null default '[]'::jsonb,
  status            report_status not null default 'SUBMITTED',
  created_at        timestamptz not null default now()
);

create unique index on reports(org_id, report_code);
create index on reports(org_id, created_at desc);
create index on reports(reporter_id);
create index on reports(org_id, status);

create table ai_analyses (
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

create unique index on ai_analyses(report_id);
create index on ai_analyses(org_id, risk_band);
create index on ai_analyses(org_id, needs_human_review) where needs_human_review = true;

create table report_embeddings (
  report_id  uuid primary key references reports(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  embedding  vector(768)
);

create table reviews (
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

create index on reviews(report_id);
create index on reviews(org_id);

create table actions (
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

create index on actions(org_id, status);
create index on actions(assigned_to);
create index on actions(report_id);

create table clusters (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  key_type      text not null,   -- LOCATION | ACTIVITY | LSR | BARRIER | ENERGY
  key_value     text not null,
  report_count  int not null,
  sif_count     int not null,
  density       numeric(5,4) not null,
  wilson_lb     numeric(5,4) not null,
  window_days   int not null default 90,
  is_alerting   boolean not null default false,
  computed_at   timestamptz not null default now()
);

create index on clusters(org_id, wilson_lb desc);
create index on clusters(org_id, is_alerting) where is_alerting = true;

create table notifications (
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

create index on notifications(user_id, read_at);
create index on notifications(user_id, created_at desc);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  actor_id    uuid,
  action      text not null,
  entity      text,
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index on audit_log(org_id, created_at desc);
create index on audit_log(actor_id);
