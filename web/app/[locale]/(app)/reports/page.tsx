"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { useProjects } from "@/lib/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { BadgeVariant } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/api/clients.api";

function statusVariant(status: ProjectStatus): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
}

export default function ReportsPage() {
  const t = useTranslations("reports");
  const tProjectStatus = useTranslations("projectStatus");
  const locale = useLocale();

  // Load all projects (not just active) so users can view completed ones too
  const { data, isLoading } = useProjects({ pageSize: 200 });
  const projects = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>
      </div>

      {/* Project list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {locale === "ar" ? "المشاريع" : "Projects"}
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-surface-elevated">
              <BarChart3 className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">
              {t("noProjects")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {projects.map((project) => (
              <li key={project.id}>
                {/* Link deep into the project dashboard with ?tab=reports */}
                <Link
                  href={`/${locale}/projects/${project.id}?tab=reports`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BarChart3 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {project.name}
                      </p>
                      {(project.client || project.location) && (
                        <p className="text-xs text-muted-foreground">
                          {project.client?.name}
                          {project.client?.name && project.location ? " • " : ""}
                          {project.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(project.status)} dot>
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
          ? "افتح المشروع واختر تبويب \"التقارير\" لتصدير تقرير اليوميات أو الفاتورة النهائية"
          : "Open a project and select the \"Reports\" tab to export the daily logs report or final invoice"}
      </p>
    </div>
  );
}
