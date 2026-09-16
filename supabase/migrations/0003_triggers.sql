-- ============================================================
-- SIF Sentinel — Migration 0003: DB Triggers
-- ============================================================

-- ─── Prevent CLOSED status on SIF reports without a review ───────────────────
--
-- Spec §7.4: "No report the engine calls SIF-potential may reach CLOSED
-- without a human review row. Enforce in code and with a DB trigger."

create or replace function public.enforce_sif_review_before_close()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- Only fire when transitioning TO 'CLOSED'
  if new.status = 'CLOSED' and old.status <> 'CLOSED' then
    -- Check if the report has an AI analysis flagging SIF potential
    if exists (
      select 1 from ai_analyses a
      where a.report_id = new.id
        and a.sif_potential = true
    ) then
      -- Require a reviews row before allowing CLOSED
      if not exists (
        select 1 from reviews r
        where r.report_id = new.id
      ) then
        raise exception
          'SIF-potential reports cannot be closed without a human review. '
          'Create a review record first. (report_id=%)', new.id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_sif_review
  before update on reports
  for each row execute function public.enforce_sif_review_before_close();

-- ─── Auto-set OVERDUE on actions ──────────────────────────────────────────────
-- A separate nightly job would be better, but this covers in-DB enforcement.

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

create trigger trg_action_overdue
  before insert or update on actions
  for each row execute function public.check_action_overdue();

-- ─── Auto-write audit_log on key events ──────────────────────────────────────

-- Report status changes
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

create trigger trg_audit_report_status
  after update on reports
  for each row execute function public.audit_report_status();

-- Profile creation
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

create trigger trg_audit_profile_created
  after insert on profiles
  for each row execute function public.audit_profile_created();

-- Invitation accepted
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

create trigger trg_audit_invitation_status
  after update on invitations
  for each row execute function public.audit_invitation_status();
