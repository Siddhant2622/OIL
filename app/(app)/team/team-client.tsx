"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Mail,
  Building,
  MapPin,
  Shield,
  Search,
  PlusCircle,
} from "lucide-react";
import { roleLabels } from "@/lib/utils";
import { InviteModal } from "@/components/invite-modal";

export interface TeamProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  designation: string | null;
  department: string | null;
  manager_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
  site?: { name: string } | null;
}

interface SiteItem {
  id: string;
  name: string;
}

interface Props {
  profiles: TeamProfile[];
  sites: SiteItem[];
  currentUserRole: string;
}

export function TeamHierarchyClient({ profiles, sites, currentUserRole }: Props) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const canInvite = ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR"].includes(currentUserRole);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openInviteFor = (managerId: string | null = null) => {
    setSelectedManagerId(managerId);
    setInviteModalOpen(true);
  };

  const filteredProfiles = searchQuery.trim()
    ? profiles.filter(
        (p) =>
          (p.full_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.designation ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.department ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : profiles;

  // Build tree
  function getSubordinates(parentId: string | null): TeamProfile[] {
    return filteredProfiles
      .filter((p) => p.manager_id === parentId)
      .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  }

  const roots = getSubordinates(null);
  // Fallback: If no roots with null manager, take top-most
  const displayRoots =
    roots.length > 0
      ? roots
      : filteredProfiles.filter(
          (p) => !filteredProfiles.some((parent) => parent.id === p.manager_id)
        );

  const managerOptions = profiles
    .filter((p) => ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR"].includes(p.role))
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? p.email,
      role: roleLabels[p.role] ?? p.role,
      designation: p.designation,
    }));

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Organization Command Hierarchy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profiles.length} total team members across reporting lines and field sites.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canInvite && (
            <button
              onClick={() => openInviteFor(null)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 shadow-sm w-full sm:w-auto"
              id="add-team-member-btn"
            >
              <UserPlus className="h-4 w-4" />
              + Add Member / Head
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <Search className="h-4 w-4 text-muted-foreground ml-1" />
        <input
          type="text"
          placeholder="Search by name, position, department, or email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-muted-foreground hover:text-foreground mr-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tree View */}
      {profiles.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-semibold text-foreground">No team members added yet</p>
          <p className="mt-1 text-xs">Start by adding your leadership team, supervisors, or field personnel.</p>
          {canInvite && (
            <button
              onClick={() => openInviteFor(null)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              + Add First Member
            </button>
          )}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-semibold text-foreground">No personnel match your search</p>
          <p className="mt-1 text-xs">Try searching by a different name, department or position.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRoots.map((root) => (
            <HierarchyNode
              key={root.id}
              profile={root}
              allProfiles={filteredProfiles}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
              onAddSubordinate={openInviteFor}
              canInvite={canInvite}
              depth={0}
            />
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => window.location.reload()}
        defaultManagerId={selectedManagerId}
        managers={managerOptions}
        sites={sites}
      />
    </div>
  );
}

function HierarchyNode({
  profile,
  allProfiles,
  collapsed,
  onToggleCollapse,
  onAddSubordinate,
  canInvite,
  depth = 0,
}: {
  profile: TeamProfile;
  allProfiles: TeamProfile[];
  collapsed: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  onAddSubordinate: (managerId: string) => void;
  canInvite: boolean;
  depth: number;
}) {
  const directReports = allProfiles.filter((p) => p.manager_id === profile.id);
  const hasSubordinates = directReports.length > 0;
  const isCollapsed = Boolean(collapsed[profile.id]);

  const initials = (profile.full_name ?? profile.email)[0].toUpperCase();

  const roleColor =
    profile.role === "ORG_ADMIN"
      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200"
      : profile.role === "HSE_MANAGER"
      ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200"
      : profile.role === "DEPT_HEAD"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200"
      : profile.role === "SUPERVISOR"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className={`space-y-2 ${depth > 0 ? "ml-2 sm:ml-6 md:ml-8 border-l-2 border-border/80 pl-2 sm:pl-4" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs transition-all hover:border-primary/40">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {hasSubordinates ? (
            <button
              onClick={() => onToggleCollapse(profile.id)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}

          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? ""}
              className="h-10 w-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {initials}
            </div>
          )}

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate">
                {profile.full_name ?? profile.email.split("@")[0]}
              </span>

              {/* Position badge */}
              <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-foreground">
                {profile.designation || "Personnel"}
              </span>

              {/* Access Role badge */}
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleColor}`}>
                {roleLabels[profile.role] ?? profile.role}
              </span>

              {!profile.is_active && (
                <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                  Inactive
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {profile.department && (
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {profile.department}
                </span>
              )}
              {profile.site?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.site.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {profile.email}
              </span>
            </div>
          </div>
        </div>

        {/* Node Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {hasSubordinates && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground font-medium">
              {directReports.length} direct report{directReports.length !== 1 ? "s" : ""}
            </span>
          )}

          {canInvite && (
            <button
              onClick={() => onAddSubordinate(profile.id)}
              className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 hover:border-primary transition-colors"
              title="Add a subordinate reporting to this member"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              + Subordinate
            </button>
          )}
        </div>
      </div>

      {/* Subordinates */}
      {!isCollapsed && hasSubordinates && (
        <div className="space-y-2 mt-2">
          {directReports.map((child) => (
            <HierarchyNode
              key={child.id}
              profile={child}
              allProfiles={allProfiles}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
              onAddSubordinate={onAddSubordinate}
              canInvite={canInvite}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
