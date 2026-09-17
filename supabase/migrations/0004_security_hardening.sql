-- ============================================================
-- 0003_security_hardening.sql
-- SIF Sentinel — Security Hardening & pgvector Semantic Search
-- ============================================================

-- 1. Restrict profiles self-update: prevent role, org_id, manager_id, designation, department escalation
create or replace function public.check_profile_immutable_fields()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If updated by non-admin or self-service, prevent altering security-critical columns
  if (auth.uid() = old.id and auth.role() = 'authenticated') then
    if (new.role is distinct from old.role) then
      raise exception 'Unauthorized: Cannot change user role via self-service.';
    end if;
    if (new.org_id is distinct from old.org_id) then
      raise exception 'Unauthorized: Cannot change organization.';
    end if;
    -- Fix manager_id = NULL loophole: reject ANY change to manager_id regardless of old value
    if (new.manager_id is distinct from old.manager_id) then
      raise exception 'Unauthorized: Cannot modify manager hierarchy via self-service.';
    end if;
    if (new.designation is distinct from old.designation) then
      raise exception 'Unauthorized: Cannot modify organizational position/designation via self-service.';
    end if;
    if (new.department is distinct from old.department) then
      raise exception 'Unauthorized: Cannot change assigned department via self-service.';
    end if;
    if (new.site_id is distinct from old.site_id) then
      raise exception 'Unauthorized: Cannot change assigned operational site via self-service.';
    end if;
    if (new.is_active is distinct from old.is_active) then
      raise exception 'Unauthorized: Cannot change active account status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_protect_profile_fields on profiles;
create trigger tr_protect_profile_fields
  before update on profiles
  for each row
  execute function public.check_profile_immutable_fields();

-- 2. pgvector Semantic Search RPC
create or replace function public.match_similar_reports (
  query_embedding vector(768),
  match_count int,
  filter_org_id uuid,
  exclude_report_id uuid default null
) returns table (
  report_id uuid,
  similarity float
) language plpgsql stable security definer as $$
begin
  return query
  select
    re.report_id,
    (1 - (re.embedding <=> query_embedding))::float as similarity
  from report_embeddings re
  where re.org_id = filter_org_id
    and (exclude_report_id is null or re.report_id != exclude_report_id)
  order by re.embedding <=> query_embedding
  limit match_count;
end;
$$;
