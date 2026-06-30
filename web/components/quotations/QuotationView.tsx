"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Printer,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QuotationStatusBadge } from "@/components/quotations/QuotationStatusBadge";
import {
  useQuotation,
  useDeleteQuotation,
  useApproveQuotation,
  useRejectQuotation,
} from "@/lib/hooks/useQuotations";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { QuotationPdfData } from "@/lib/quotation/quotation-pdf";

type ActionType = "delete" | "approve" | "reject";

export default function QuotationView() {
  const params = useParams<{ id: string; quotationId: string }>();
  const projectId = params.id;
  const quotationId = params.quotationId;

  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("quotations");
  const tCommon = useTranslations("common");

  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: quotation, isLoading } = useQuotation(quotationId);
  const deleteMutation = useDeleteQuotation();
  const approveMutation = useApproveQuotation();
  const rejectMutation = useRejectQuotation();

  const handlePdf = useCallback(async () => {
    if (!quotation) return;
    setPdfLoading(true);
    try {
      const { exportQuotationPdf } = await import("@/lib/quotation/quotation-pdf");
      const pdfData: QuotationPdfData = {
        quotationNumber: quotation.quotationNumber,
        date: quotation.date,
        supervisionPercent: quotation.supervisionPercent ?? 0,
        subtotal: quotation.subtotal,
        supervisionAmount: quotation.supervisionAmount,
        grandTotal: quotation.grandTotal,
        subject: quotation.subject,
        notes: quotation.notes,
        project: {
          name: quotation.project.name,
          location: quotation.project.location,
          unitType: quotation.project.unitType,
          client: quotation.project.client,
        },
        lines: quotation.lines.map((l) => ({
          order: l.order,
          pricingMode: l.pricingMode,
          unit: l.unit,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          descriptionAr: l.descriptionAr,
          descriptionEn: l.descriptionEn,
          term: l.term,
        })),
        conditions: quotation.conditions.map((c) => ({
          order: c.order,
          titleAr: c.titleAr,
          titleEn: c.titleEn,
          bodyAr: c.bodyAr,
          bodyEn: c.bodyEn,
        })),
        locale: locale as "ar" | "en",
      };
      await exportQuotationPdf(pdfData);
    } catch {
      toast.error(t("pdfError"));
    } finally {
      setPdfLoading(false);
    }
  }, [quotation, locale, t]);

  const isPending =
    deleteMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending;

  const handleConfirm = useCallback(async () => {
    if (!pendingAction || !quotation) return;
    try {
      if (pendingAction === "delete") {
        await deleteMutation.mutateAsync(quotation.id);
        toast.success(t("deleted"));
        router.push(`/${locale}/projects/${projectId}`);
      } else if (pendingAction === "approve") {
        await approveMutation.mutateAsync({ id: quotation.id, projectId });
        toast.success(t("approved"));
      } else if (pendingAction === "reject") {
        await rejectMutation.mutateAsync({ id: quotation.id });
        toast.success(t("rejected"));
      }
    } catch {
      if (pendingAction === "delete") toast.error(t("deleteError"));
      else if (pendingAction === "approve") toast.error(t("approveError"));
      else toast.error(t("rejectError"));
    } finally {
      setPendingAction(null);
    }
  }, [
    pendingAction,
    quotation,
    deleteMutation,
    approveMutation,
    rejectMutation,
    router,
    locale,
    projectId,
    t,
  ]);

  const confirmTitle =
    pendingAction === "delete"
      ? t("deleteQuotation")
      : pendingAction === "approve"
        ? t("approve")
        : t("reject");

  const confirmDesc =
    pendingAction === "delete"
      ? t("deleteWarning")
      : pendingAction === "approve"
        ? t("approveWarning")
        : t("rejectWarning");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{tCommon("noData")}</p>
      </div>
    );
  }

  const sortedLines = [...quotation.lines].sort((a, b) => a.order - b.order);
  const sortedConditions = [...quotation.conditions].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/projects/${projectId}`)}
          aria-label={tCommon("back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">
            {quotation.project.name}
          </p>
          <h1 className="text-lg font-bold text-foreground">
            {t("viewQuotation")} — {quotation.quotationNumber}
          </h1>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                {quotation.quotationNumber}
              </h2>
              <QuotationStatusBadge status={quotation.status} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                {t("dateLabel")}:{" "}
                {formatDate(quotation.date, { dateStyle: "long" })}
              </span>
              <span>
                {quotation.project.client.name}
              </span>
              {quotation.project.location && (
                <span>{quotation.project.location}</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Printer className="h-4 w-4" />}
              loading={pdfLoading}
              onClick={() => void handlePdf()}
            >
              {t("printPdf")}
            </Button>

            {quotation.status === "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<Pencil className="h-4 w-4" />}
                onClick={() =>
                  router.push(
                    `/${locale}/projects/${projectId}/quotations/${quotationId}/edit`
                  )
                }
              >
                {tCommon("edit")}
              </Button>
            )}

            {quotation.status === "DRAFT" && (
              <>
                <Button
                  size="sm"
                  leadingIcon={<CheckCircle className="h-4 w-4" />}
                  onClick={() => setPendingAction("approve")}
                >
                  {t("approve")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  leadingIcon={<XCircle className="h-4 w-4" />}
                  onClick={() => setPendingAction("reject")}
                >
                  {t("reject")}
                </Button>
              </>
            )}

            {(quotation.status === "DRAFT" ||
              quotation.status === "REJECTED") && (
              <Button
                variant="destructive"
                size="sm"
                leadingIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setPendingAction("delete")}
              >
                {tCommon("delete")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lines table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {t("linesSection")}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("termLabel")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("pricingModeLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("quantityLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("unitPriceLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("lineTotalLabel")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {line.order}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {line.term.nameAr}
                    </p>
                    {line.term.nameEn && (
                      <p className="text-xs text-muted-foreground">
                        {line.term.nameEn}
                      </p>
                    )}
                    {line.descriptionAr && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {line.descriptionAr}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">
                      {line.pricingMode === "UNIT"
                        ? t("pricingModeUnit")
                        : t("pricingModeLumpSum")}
                    </span>
                    {line.unit && (
                      <span className="ms-1 text-xs text-muted-foreground">
                        ({line.unit})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {line.quantity ? Number(line.quantity).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {line.unitPrice
                      ? formatCurrency(Number(line.unitPrice))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-end font-medium tabular-nums">
                    {formatCurrency(Number(line.lineTotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          {t("liveTotals")}
        </h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("subtotalLabel")}</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(Number(quotation.subtotal))}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("supervisionPercentLabel")} (
              {Number(quotation.supervisionPercent ?? 0)}%)
            </span>
            <span className="font-medium tabular-nums">
              {formatCurrency(Number(quotation.supervisionAmount))}
            </span>
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {t("grandTotalLabel")}
            </span>
            <span className="text-xl font-bold tabular-nums text-primary">
              {formatCurrency(Number(quotation.grandTotal))}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {t("notesLabel")}
          </h2>
          <p className="text-sm text-muted-foreground">{quotation.notes}</p>
        </div>
      )}

      {/* Terms & Conditions */}
      {sortedConditions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            {t("conditionsSection")}
          </h2>
          <div className="space-y-4">
            {sortedConditions.map((cond) => (
              <div key={cond.id}>
                {(cond.titleAr || cond.titleEn) && (
                  <h3 className="mb-1 font-medium text-foreground">
                    {cond.titleAr ?? cond.titleEn}
                  </h3>
                )}
                <p className="text-sm text-muted-foreground">{cond.bodyAr}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {pendingAction && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setPendingAction(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{confirmTitle}</DialogTitle>
              <DialogDescription>{confirmDesc}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setPendingAction(null)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant={pendingAction === "approve" ? "default" : "destructive"}
                onClick={() => void handleConfirm()}
                loading={isPending}
              >
                {tCommon("confirm")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
