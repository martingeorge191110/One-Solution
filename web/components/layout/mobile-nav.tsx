"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LayoutDashboard, Users, FolderOpen, Database } from "lucide-react";
import { cn } from "@/lib/utils";

// Core nav for the mobile bottom bar. Quotations/payments/daily-logs/reports
// live inside each project's dashboard, so they're not duplicated here.
const MOBILE_NAV = [
  { key: "dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { key: "clients", icon: Users, path: "/clients" },
  { key: "projects", icon: FolderOpen, path: "/projects" },
  { key: "systemData", icon: Database, path: "/system-data" },
] as const;

export function MobileNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");

  const basePath = `/${locale}`;

  return (
    <nav className="fixed bottom-0 start-0 end-0 z-40 flex items-center justify-around border-t border-border bg-white pb-safe dark:bg-surface-raised lg:hidden">
      {MOBILE_NAV.map(({ key, icon: Icon, path }) => {
        const href = `${basePath}${path}`;
        const isActive = pathname.startsWith(href);

        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-center text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-sidebar-text-muted hover:text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{t(key as keyof typeof t)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
