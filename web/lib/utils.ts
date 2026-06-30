import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "EGP"): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale = "ar-EG"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const opts = options ?? {};
  const hasGranular = "hour" in opts || "minute" in opts || "day" in opts || "month" in opts;
  const formatOptions: Intl.DateTimeFormatOptions = hasGranular
    ? { ...opts }
    : {
        dateStyle: opts.dateStyle ?? "medium",
        timeStyle: opts.timeStyle ?? "short",
      };
  return new Intl.DateTimeFormat("ar-EG", formatOptions).format(new Date(date));
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
