"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [isLoading, isAuthenticated, router, locale]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-3xl font-bold text-primary leading-none">ONE</span>
            <span className="text-xs font-semibold tracking-[0.25em] text-neutral-400 uppercase">
              SOLUTIONS
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 w-48">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-2 w-3/4 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
