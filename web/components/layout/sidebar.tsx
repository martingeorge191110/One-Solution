"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Database,
  UserCog,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/brand.config";
import { useAuth } from "@/lib/auth/auth-context";

// Quotations, payments, daily logs and reports are managed inside each project's
// dashboard, so they are intentionally NOT top-level nav items (avoids redundancy).
const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, path: "", superAdminOnly: false },
  { key: "clients", icon: Users, path: "/clients", superAdminOnly: false },
  { key: "projects", icon: FolderOpen, path: "/projects", superAdminOnly: false },
  { key: "systemData", icon: Database, path: "/system-data", superAdminOnly: false },
  { key: "users", icon: UserCog, path: "/users", superAdminOnly: true },
  { key: "audit", icon: Shield, path: "/audit", superAdminOnly: true },
] as const;

export function Sidebar() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const basePath = `/${locale}`;

  return (
    <aside className="flex h-full w-64 flex-col border-e border-sidebar-border bg-sidebar-bg">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <Image
          src="/logo.jpeg"
          alt="ONE SOLUTIONS"
          width={40}
          height={40}
          priority
          unoptimized
          className="h-10 w-auto rounded-md"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.filter(
            (item) => !item.superAdminOnly || isSuperAdmin,
          ).map(({ key, icon: Icon, path }) => {
            const href = `${basePath}${path || "/dashboard"}`;
            const isActive =
              path === ""
                ? pathname === `${basePath}/dashboard` || pathname === basePath
                : pathname.startsWith(`${basePath}${path}`);

            return (
              <li key={key}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-e-2 border-sidebar-active-border bg-sidebar-item-active text-sidebar-active-text"
                      : "text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-active-text",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-sidebar-active-text"
                        : "text-sidebar-text-muted",
                    )}
                  />
                  <span>{t(key as keyof typeof t)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Brand footer */}
      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-[10px] text-sidebar-text-muted">{brand.tagline}</p>
      </div>
    </aside>
  );
}
