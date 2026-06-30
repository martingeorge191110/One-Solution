"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  FileText,
  ReceiptText,
  Download,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { reportsApi } from "@/lib/api/reports.api";
import type {
  DailyLogsReportResponse,
  FinalInvoiceResponse,
} from "@/lib/api/reports.api";
import { formatCurrency } from "@/lib/utils";

// ─── Daily Logs Card ──────────────────────────────────────────────────────────

function DailyLogsReportCard({ projectId }: { projectId: string }) {
  const t = useTranslations("reports.dailyLogs");
  const locale = useLocale();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [summary, setSummary] = useState<DailyLogsReportResponse | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await reportsApi.getDailyLogsReport(
        projectId,
        from || undefined,
        to || undefined
      );

      if (!data || data.entries.length === 0) {
        toast.warning(t("noData"));
        setSummary(null);
        return;
      }

      setSummary(data);

      // Lazy import the PDF generator
      const { exportDailyLogsReportPdf } = await import(
        "@/lib/reports/daily-logs-pdf"
      );
      await exportDailyLogsReportPdf(data);
      toast.success(t("success"));
    } catch {
      toast.error(t("error"));
    } finally {
      setIsFetching(false);
    }
  }, [projectId, from, to, t]);

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Card header */}
      <div className="flex items-start gap-3 border-b border-border p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">{t("title")}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="dl-from"
            type="date"
            label={t("fromDate")}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <Input
            id="dl-to"
            type="date"
            label={t("toDate")}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            icon={<CalendarDays className="h-4 w-4" />}
          />
        </div>

        <Button
          onClick={() => void handleGenerate()}
          loading={isFetching}
          leadingIcon={<Download className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          {isFetching ? t("fetching") : t("generatePdf")}
        </Button>
      </div>

      {/* On-screen summary */}
      {summary && (
        <div className="border-t border-border p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("summary")}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              title={t("totalEntries")}
              value={summary.totals.count}
              accent="info"
            />
            <KpiCard
              title={t("termItemSpent")}
              value={formatCurrency(Number(summary.totals.termItemSpent))}
              accent="primary"
            />
            <KpiCard
              title={t("additionalsSpent")}
              value={formatCurrency(Number(summary.totals.additionalsSpent))}
              accent="warning"
            />
            <KpiCard
              title={t("totalSpent")}
              value={formatCurrency(Number(summary.totals.totalSpent))}
              accent="success"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Final Invoice Card ───────────────────────────────────────────────────────

function FinalInvoiceCard({ projectId }: { projectId: string }) {
  const t = useTranslations("reports.finalInvoice");
  const [isFetching, setIsFetching] = useState(false);
  const [summary, setSummary] = useState<FinalInvoiceResponse | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await reportsApi.getFinalInvoice(projectId);

      if (!data || (data.terms.length === 0 && data.additionals.length === 0)) {
        toast.warning(t("noData"));
        setSummary(null);
        return;
      }

      setSummary(data);

      const { exportFinalInvoicePdf } = await import(
        "@/lib/reports/final-invoice-pdf"
      );
      await exportFinalInvoicePdf(data);
      toast.success(t("success"));
    } catch {
      toast.error(t("error"));
    } finally {
      setIsFetching(false);
    }
  }, [projectId, t]);

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Card header */}
      <div className="flex items-start gap-3 border-b border-border p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <ReceiptText className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">{t("title")}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5">
        <Button
          onClick={() => void handleGenerate()}
          loading={isFetching}
          leadingIcon={<Download className="h-4 w-4" />}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {isFetching ? t("fetching") : t("generatePdf")}
        </Button>
      </div>

      {/* On-screen summary */}
      {summary && (
        <div className="border-t border-border p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("summary")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              title={t("totalSpent")}
              value={formatCurrency(Number(summary.totalSpent))}
              accent="primary"
            />
            <KpiCard
              title={`${t("supervisionFee")} (${summary.supervisionPercent}%)`}
              value={formatCurrency(Number(summary.supervisionFee))}
              accent="warning"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              title={t("invoiceTotal")}
              value={formatCurrency(Number(summary.invoiceTotal))}
              accent="success"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ReportsPanel (exported) ──────────────────────────────────────────────────

interface ReportsPanelProps {
  projectId: string;
}

export function ReportsPanel({ projectId }: ReportsPanelProps) {
  const locale = useLocale();

  if (!projectId) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <p className="text-sm text-muted-foreground">
          {locale === "ar" ? "معرّف المشروع غير متوفر" : "Project ID unavailable"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DailyLogsReportCard projectId={projectId} />
      <FinalInvoiceCard projectId={projectId} />
    </div>
  );
}

// Also export loading skeleton for Suspense
export function ReportsPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}
