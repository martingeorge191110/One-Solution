"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "accent";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "xs" | "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current/30 border-t-current"
    />
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      loading,
      leadingIcon,
      trailingIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const liftEligible =
      !disabled &&
      !loading &&
      (variant === "default" ||
        variant === "destructive" ||
        variant === "accent" ||
        variant === "secondary");

    const leading = loading ? <Spinner /> : leadingIcon;

    const decoratedChildren = asChild ? (
      children
    ) : (
      <>
        {leading}
        {children}
        {!loading && trailingIcon}
      </>
    );

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
          liftEligible && "hover:-translate-y-0.5",
          {
            "bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary-dark hover:shadow-md hover:shadow-primary/25":
              variant === "default",
            "bg-error text-white shadow-sm shadow-error/20 hover:opacity-90 hover:shadow-md":
              variant === "destructive",
            "border border-neutral-200 bg-white text-neutral-700 shadow-sm hover:border-primary/40 hover:bg-neutral-50 hover:text-primary dark:border-surface-border dark:bg-surface-elevated dark:text-neutral-200 dark:hover:text-primary":
              variant === "outline",
            "bg-neutral-100 text-neutral-700 shadow-sm hover:bg-neutral-200 dark:bg-surface-elevated dark:text-neutral-200 dark:hover:bg-surface-border":
              variant === "secondary",
            "text-neutral-600 hover:bg-neutral-100/80 hover:text-primary dark:text-neutral-400 dark:hover:bg-surface-elevated dark:hover:text-primary":
              variant === "ghost",
            "h-auto p-0 font-medium text-primary shadow-none hover:text-primary-dark hover:underline":
              variant === "link",
            "bg-accent text-white shadow-sm shadow-accent/20 hover:opacity-90 hover:shadow-md":
              variant === "accent",
          },
          {
            "h-10 px-4 text-sm": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-7 px-2.5 text-[11px]": size === "xs",
            "h-12 px-6 text-base": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className,
        )}
        {...props}
      >
        {decoratedChildren}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button };
