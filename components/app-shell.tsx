"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  CheckSquare,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Search,
  Upload,
  Building2,
  Eye,
} from "lucide-react";
import { cn, roleLabels } from "@/lib/utils";
import type { ProfileRow, UserRole } from "@/types/database";
import { NotificationBell } from "./notification-bell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR", "EMPLOYEE"],
  },
  {
    href: "/reports/new",
    label: "Report Hazard",
    icon: AlertTriangle,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR", "EMPLOYEE"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR", "EMPLOYEE"],
  },
  {
    href: "/notifications",
    label: "Alerts",
    icon: Bell,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR", "EMPLOYEE"],
  },
  {
    href: "/review",
    label: "Review Queue",
    icon: Eye,
    roles: ["ORG_ADMIN", "HSE_MANAGER"],
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD"],
  },
  {
    href: "/actions",
    label: "CAPA Actions",
    icon: CheckSquare,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR"],
  },
  {
    href: "/team",
    label: "Team & Hierarchy",
    icon: Users,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR"],
  },
  {
    href: "/hse/upload",
    label: "Bulk Upload",
    icon: Upload,
    roles: ["ORG_ADMIN", "HSE_MANAGER"],
  },
  {
    href: "/settings/organization",
    label: "Org Settings",
    icon: Building2,
    roles: ["ORG_ADMIN"],
  },
  {
    href: "/settings/profile",
    label: "Profile",
    icon: Settings,
    roles: ["ORG_ADMIN", "HSE_MANAGER", "DEPT_HEAD", "SUPERVISOR", "EMPLOYEE"],
  },
];

interface AppShellProps {
  profile: ProfileRow & { organizations: { name: string; slug: string } | null };
  children: React.ReactNode;
}

export function AppShell({ profile, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(profile.role)
  );

  const orgName =
    (profile as unknown as { organizations?: { name: string } | null })
      .organizations?.name ?? "SIF Sentinel";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Mobile overlay ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: "hsl(var(--sidebar-background))",
          borderRight: "1px solid hsl(var(--sidebar-border))",
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">SIF Sentinel</span>
          </Link>
          <button
            className="rounded-md p-1 text-slate-500 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Org name */}
        <div className="mx-3 mb-2 rounded-lg bg-white/5 px-3 py-2">
          <p className="text-xs text-slate-500">Organisation</p>
          <p className="mt-0.5 truncate text-sm font-medium text-white">
            {orgName}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">
            {visibleNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-white/10 text-white font-medium"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User */}
        <div
          className="border-t p-3"
          style={{ borderColor: "hsl(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-3 rounded-lg p-2">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "User"}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/30 text-blue-300 text-sm font-bold">
                {(profile.full_name ?? profile.email)[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {profile.full_name ?? profile.email.split("@")[0]}
              </p>
              <p className="text-xs text-slate-500">
                {roleLabels[profile.role]}
              </p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                title="Sign out"
                className="rounded-md p-1 text-slate-500 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
          <button
            className="rounded-md p-2 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search placeholder */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground w-64">
            <Search className="h-4 w-4" />
            <span>Search reports, people…</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationBell />

            {/* Role badge */}
            <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {roleLabels[profile.role]}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
