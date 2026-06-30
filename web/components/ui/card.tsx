"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardDensity = "compact" | "regular" | "comfortable";

const CardDensityContext = createContext<CardDensity>("regular");

interface CardProps {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  onClick?: () => void;
  density?: CardDensity;
  ariaLabel?: string;
}

const HEADER_PADDING: Record<CardDensity, string> = {
  compact: "p-3",
  regular: "p-5",
  comfortable: "p-6",
};

const CONTENT_PADDING: Record<CardDensity, string> = {
  compact: "p-3",
  regular: "p-5",
  comfortable: "p-6",
};

const FOOTER_PADDING: Record<CardDensity, string> = {
  compact: "px-3 py-2",
  regular: "px-5 py-3.5",
  comfortable: "px-6 py-4",
};

export function Card({
  className,
  children,
  hover,
  onClick,
  density = "regular",
  ariaLabel,
}: CardProps) {
  const isInteractive = !!onClick;

  const wrapperClasses = cn(
    "overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card dark:border-surface-border dark:bg-surface-raised",
    hover && "card-lift cursor-pointer",
    isInteractive &&
      !hover &&
      "cursor-pointer transition-colors hover:bg-neutral-50/50 dark:hover:bg-surface-elevated/50",
    isInteractive &&
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface",
    className,
  );

  const content = (
    <CardDensityContext.Provider value={density}>
      {children}
    </CardDensityContext.Provider>
  );

  if (isInteractive) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={wrapperClasses}
      >
        {content}
      </div>
    );
  }

  return <div className={wrapperClasses}>{content}</div>;
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const density = useContext(CardDensityContext);
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-neutral-100 dark:border-surface-border",
        HEADER_PADDING[density],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h3
      className={cn(
        "font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-100",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed text-neutral-500 dark:text-neutral-400",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const density = useContext(CardDensityContext);
  return <div className={cn(CONTENT_PADDING[density], className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const density = useContext(CardDensityContext);
  return (
    <div
      className={cn(
        "flex items-center border-t border-neutral-100 bg-neutral-50/60 dark:border-surface-border dark:bg-surface-elevated/40",
        FOOTER_PADDING[density],
        className,
      )}
    >
      {children}
    </div>
  );
}
