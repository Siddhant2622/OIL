"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Flame,
  Info,
  Check,
  CheckCheck,
  ExternalLink,
  Clock,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  org_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Non-fatal background fetch
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 12 seconds for background safety alerts
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markAsRead(id: string, link: string | null) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Ignore
    }

    if (link) {
      setOpen(false);
      router.push(link);
    }
  }

  async function markAllAsRead() {
    setLoading(true);
    // Optimistic
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        aria-label="View notifications"
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white shadow-sm shadow-red-500/40 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] divide-y divide-border/60 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Bell className="mx-auto mb-2 h-7 w-7 opacity-30" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs">
                  Critical alerts and report scan results will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                const isCritical = n.type === "CRITICAL_SIF_ALERT";
                const isHigh = n.type === "HIGH_SIF_ALERT" || n.type === "SIF_PRECURSOR_DETECTED";

                return (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id, n.link)}
                    className={`group relative flex cursor-pointer gap-3 p-3.5 transition-colors hover:bg-muted/50 ${
                      isUnread
                        ? isCritical
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : isHigh
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : "bg-muted/25"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isCritical ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                          <Flame className="h-4 w-4" />
                        </div>
                      ) : isHigh ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                          <Info className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isCritical
                              ? "text-red-600 dark:text-red-400"
                              : isHigh
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-foreground"
                          }`}
                        >
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
                        )}
                      </div>

                      {n.body && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{formatDateTime(n.created_at)}</span>
                        {n.link && (
                          <span className="inline-flex items-center gap-0.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            View <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/80 bg-muted/20 p-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All Notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
