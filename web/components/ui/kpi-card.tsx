import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type AccentTone = "default" | "primary" | "success" | "warning" | "error" | "info";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
  accent?: AccentTone;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
}

const ACCENT_TEXT: Record<AccentTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

const ACCENT_ICON_BG: Record<AccentTone, string> = {
  default: "bg-neutral-100 text-neutral-500 dark:bg-surface-elevated dark:text-neutral-400",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
};

const ACCENT_RAIL: Record<AccentTone, string> = {
  default: "border-accent-primary",
  primary: "border-accent-primary",
  success: "border-accent-success",
  warning: "border-accent-warning",
  error: "border-accent-error",
  info: "border-accent-info",
};

const TREND_ICON: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

const TREND_COLOR: Record<"up" | "down" | "flat", string> = {
  up: "text-success",
  down: "text-error",
  flat: "text-muted-foreground",
};

const BASE =
  "flex min-h-[128px] min-w-0 flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card sm:p-5 dark:border-surface-border dark:bg-surface-raised";

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  className,
  accent = "default",
  trend,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className={cn(BASE, ACCENT_RAIL[accent], className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-auto h-3 w-24" />
      </div>
    );
  }

  return (
    <div className={cn(BASE, ACCENT_RAIL[accent], className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              ACCENT_ICON_BG[accent],
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        className={cn(
          "min-w-0 wrap-anywhere text-xl font-semibold leading-tight tabular-nums sm:text-2xl md:text-3xl",
          ACCENT_TEXT[accent],
        )}
      >
        {value}
      </div>

      <div className="mt-auto flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              TREND_COLOR[trend.direction],
            )}
          >
            {TREND_ICON[trend.direction]} {trend.label}
          </span>
        )}
        {subtitle && !trend && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
