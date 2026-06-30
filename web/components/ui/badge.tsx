import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "primary"
  | "accent"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "active"
  | "inactive"
  | "outline";

type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:
    "bg-neutral-100 text-neutral-700 dark:bg-surface-elevated dark:text-neutral-200",
  primary: "bg-primary/10 text-primary dark:bg-primary/20",
  accent: "bg-accent/10 text-accent dark:bg-accent/20",
  success: "bg-success/10 text-success dark:bg-success/20",
  error: "bg-error/10 text-error dark:bg-error/20",
  warning: "bg-warning/10 text-warning dark:bg-warning/20",
  info: "bg-info/10 text-info dark:bg-info/20",
  active: "bg-success/10 text-success dark:bg-success/20",
  inactive:
    "bg-neutral-100 text-neutral-500 dark:bg-surface-elevated dark:text-neutral-400",
  outline: "border border-border text-neutral-600 dark:text-neutral-300",
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-neutral-400",
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
  active: "bg-success",
  inactive: "bg-neutral-400",
  outline: "bg-neutral-400",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-0.5 text-xs gap-1.5",
  lg: "px-3 py-1 text-sm gap-1.5",
};

export function Badge({
  variant = "default",
  size = "md",
  icon,
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[variant])} />
      )}
      {icon}
      {children}
    </span>
  );
}
