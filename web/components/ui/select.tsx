"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

type Size = "sm" | "md" | "lg";
const SIZE: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-3.5 text-base",
};

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger> & {
    size?: Size;
    state?: "default" | "error";
    leading?: React.ReactNode;
  }
>(({ className, children, size = "md", state = "default", leading, ...props }, ref) => (
  <RadixSelect.Trigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between gap-2 rounded-xl border bg-white transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-elevated",
      "data-[placeholder]:text-neutral-400 dark:data-[placeholder]:text-neutral-500",
      SIZE[size],
      state === "error"
        ? "border-error focus:border-error focus:ring-error/30"
        : "border-border hover:border-neutral-300 focus:border-primary focus:ring-primary/30 dark:hover:border-surface-border",
      className,
    )}
    {...props}
  >
    <span className="flex min-w-0 items-center gap-2 truncate">
      {leading}
      {children}
    </span>
    <RadixSelect.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
    </RadixSelect.Icon>
  </RadixSelect.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        "z-50 max-h-[280px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-card-lg",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      <RadixSelect.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
        <ChevronUp className="h-4 w-4" />
      </RadixSelect.ScrollUpButton>
      <RadixSelect.Viewport className="p-0.5">{children}</RadixSelect.Viewport>
      <RadixSelect.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
        <ChevronDown className="h-4 w-4" />
      </RadixSelect.ScrollDownButton>
    </RadixSelect.Content>
  </RadixSelect.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Label>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Label>
>(({ className, ...props }, ref) => (
  <RadixSelect.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item> & {
    description?: string;
  }
>(({ className, children, description, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none flex-col rounded-lg py-2 pe-8 ps-3 text-sm text-foreground outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
      className,
    )}
    {...props}
  >
    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    {description && (
      <span className="text-xs text-muted-foreground">{description}</span>
    )}
    <RadixSelect.ItemIndicator className="absolute end-2.5 top-2.5">
      <Check className="h-4 w-4 text-primary" />
    </RadixSelect.ItemIndicator>
  </RadixSelect.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Separator>
>(({ className, ...props }, ref) => (
  <RadixSelect.Separator
    ref={ref}
    className={cn("my-1 h-px bg-border", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  size = "md",
  state = "default",
  disabled,
  id,
  ariaLabel,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: Size;
  state?: "default" | "error";
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} size={size} state={state} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} description={o.description}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
