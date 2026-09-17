-- ============================================================
-- 0004_invitation_hierarchy.sql
-- Ensure invitations table stores complete hierarchy info:
-- designation, department, manager_id, site_id
-- ============================================================

alter table public.invitations 
  add column if not exists designation text,
  add column if not exists department text,
  add column if not exists manager_id uuid references public.profiles(id) on delete set null,
  add column if not exists site_id uuid references public.sites(id) on delete set null;

create index if not exists idx_invitations_manager_id on public.invitations(manager_id);
create index if not exists idx_invitations_site_id on public.invitations(site_id);
