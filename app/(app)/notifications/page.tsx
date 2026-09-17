"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Flame,
  Info,
  CheckCheck,
  Check,
  ExternalLink,
  Clock,
  Filter,
  RefreshCw,
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "CRITICAL">("ALL");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAsRead(id: string) {
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
  }

  async function markAllAsRead() {
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
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.read_at;
    if (filter === "CRITICAL")
      return n.type === "CRITICAL_SIF_ALERT" || n.type === "HIGH_SIF_ALERT";
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-primary" />
            Safety Alerts &amp; Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time notifications for automated SIF precursor detections and escalated safety hazards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadNotifications}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setFilter("ALL")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "ALL"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("UNREAD")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "UNREAD"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter("CRITICAL")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "CRITICAL"
              ? "bg-red-600 text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          🚨 SIF Precursor Alerts (
          {
            notifications.filter(
              (n) => n.type === "CRITICAL_SIF_ALERT" || n.type === "HIGH_SIF_ALERT"
            ).length
          }
          )
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <p className="font-semibold text-foreground">No notifications match your filter</p>
            <p className="mt-1 text-xs">
              When AI scans sensitive safety reports or managers review actions, alerts will appear here.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const isUnread = !n.read_at;
            const isCritical = n.type === "CRITICAL_SIF_ALERT";
            const isHigh = n.type === "HIGH_SIF_ALERT" || n.type === "SIF_PRECURSOR_DETECTED";

            return (
              <div
                key={n.id}
                className={`relative flex flex-col sm:flex-row items-start justify-between gap-4 rounded-xl border p-5 transition-all ${
                  isUnread
                    ? isCritical
                      ? "border-red-300 bg-red-50/50 shadow-sm dark:border-red-900/60 dark:bg-red-950/20"
                      : isHigh
                      ? "border-amber-300 bg-amber-50/50 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20"
                      : "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border bg-card opacity-85 hover:opacity-100"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    {isCritical ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                        <Flame className="h-5 w-5" />
                      </div>
                    ) : isHigh ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <Info className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-bold text-sm ${
                          isCritical
                            ? "text-red-700 dark:text-red-400"
                            : isHigh
                            ? "text-amber-800 dark:text-amber-300"
                            : "text-foreground"
                        }`}
                      >
                        {n.title}
                      </h3>
                      {isUnread && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider">
                          New
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>

                    {n.body && (
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 self-end sm:self-center">
                  {n.link && (
                    <Link
                      href={n.link}
                      onClick={() => markAsRead(n.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      View Report
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {isUnread && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
