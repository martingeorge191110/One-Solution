"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import { useProjects } from "@/lib/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DailyLogsPage() {
  const t = useTranslations("dailyLogs");
  const tProjectStatus = useTranslations("projectStatus");
  const locale = useLocale();

  const { data, isLoading } = useProjects({ status: "ACTIVE", pageSize: 100 });
  const activeProjects = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {locale === "ar"
              ? "السجلات اليومية تُدار من لوحة تحكم كل مشروع"
              : "Daily logs are managed per-project from the project dashboard"}
          </p>
        </div>
      </div>

      {/* Active projects list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {locale === "ar" ? "المشاريع النشطة" : "Active Projects"}
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-surface-elevated">
              <ClipboardList className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">
              {locale === "ar"
                ? "لا توجد مشاريع نشطة حالياً"
                : "No active projects found"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activeProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/${locale}/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {project.name}
                      </p>
                      {project.client && (
                        <p className="text-xs text-muted-foreground">
                          {project.client.name}
                          {project.location ? ` • ${project.location}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="active" dot>
                      {tProjectStatus(project.status)}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {locale === "ar"
          ? "افتح المشروع واختر تبويب \"السجلات اليومية\" لإضافة أو عرض السجلات"
          : "Open a project and select the \"Daily Logs\" tab to add or view log entries"}
      </p>
    </div>
  );
}
