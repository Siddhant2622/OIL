-- 0007_whatsapp_integration.sql
-- SIF Sentinel: WhatsApp Bot Integration & Phone Verification Schema

-- 1. Ensure phone column and whatsapp_verified flag on profiles
alter table profiles add column if not exists whatsapp_verified boolean not null default false;
create index if not exists idx_profiles_phone on profiles(phone);

-- 2. Short-lived signed tokens for linking WhatsApp phone numbers to Google auth profiles
create table if not exists phone_verification_tokens (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  token       text not null unique,
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_pvt_token on phone_verification_tokens(token);
create index if not exists idx_pvt_phone on phone_verification_tokens(phone);

-- 3. RLS for phone_verification_tokens (Service role only, public can query by token)
alter table phone_verification_tokens enable row level security;

create policy "Tokens accessible by token value"
  on phone_verification_tokens for select
  using (true);

create policy "Tokens managed by service role"
  on phone_verification_tokens for all
  using (auth.role() = 'service_role');
