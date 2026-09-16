import * as React from "react";
import { cn } from "@/lib/utils";
import type { RiskBand } from "@/types/database";
import { riskBandColors } from "@/lib/utils";

interface RiskBadgeProps {
  band: RiskBand;
  size?: "sm" | "md";
  className?: string;
}

export function RiskBadge({
  band,
  size = "md",
  className,
}: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold tabular-nums",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        riskBandColors[band].badge,
        className
      )}
    >
      {band}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ANALYZING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse",
  ANALYZED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  ANALYSIS_FAILED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  IN_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED_SIF: "bg-red-600 text-white",
  CONFIRMED_NON_SIF: "bg-green-600 text-white",
  ACTIONS_OPEN: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  CLOSED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  ANALYZING: "Analyzing…",
  ANALYZED: "Analyzed",
  ANALYSIS_FAILED: "Failed",
  IN_REVIEW: "In Review",
  CONFIRMED_SIF: "Confirmed SIF",
  CONFIRMED_NON_SIF: "Non-SIF",
  ACTIONS_OPEN: "Actions Open",
  CLOSED: "Closed",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  band?: RiskBand;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  band,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm",
        band ? riskBandColors[band].border : "border-border",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              band ? riskBandColors[band].bg : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                band ? riskBandColors[band].text : "text-muted-foreground"
              )}
            />
          </div>
        )}
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-bold tabular-nums",
          band ? riskBandColors[band].text : "text-foreground"
        )}
      >
        {value}
      </p>
      {trend && trendValue && (
        <p
          className={cn(
            "mt-1 text-xs",
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
          )}
        >
          {trendValue}
        </p>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
