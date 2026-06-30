"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { QuotationStatusBadge } from "@/components/quotations/QuotationStatusBadge";
import {
  useQuotations,
  useDeleteQuotation,
  useApproveQuotation,
  useRejectQuotation,
} from "@/lib/hooks/useQuotations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { quotationsApi, type QuotationListRow } from "@/lib/api/quotations.api";
import type { QuotationPdfData } from "@/lib/quotation/quotation-pdf";

interface Props {
  projectId: string;
}

type ActionType = "delete" | "approve" | "reject";

interface PendingAction {
  type: ActionType;
  quotation: QuotationListRow;
}

export function QuotationPanel({ projectId }: Props) {
  const t = useTranslations("quotations");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const { data, isLoading } = useQuotations({ projectId, pageSize: 100 });
  const deleteMutation = useDeleteQuotation();
  const approveMutation = useApproveQuotation();
  const rejectMutation = useRejectQuotation();

  const quotations = data?.data ?? [];

  const handlePdf = useCallback(
    async (id: string) => {
      setPdfLoading(id);
      try {
        const full = await quotationsApi.get(id);
        const { exportQuotationPdf } = await import("@/lib/quotation/quotation-pdf");
        const pdfData: QuotationPdfData = {
          quotationNumber: full.quotationNumber,
          date: full.date,
          supervisionPercent: full.supervisionPercent ?? 0,
          subtotal: full.subtotal,
          supervisionAmount: full.supervisionAmount,
          grandTotal: full.grandTotal,
          subject: full.subject,
          notes: full.notes,
          project: {
            name: full.project.name,
            location: full.project.location,
            unitType: full.project.unitType,
            client: full.project.client,
          },
          lines: full.lines.map((l) => ({
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
          conditions: full.conditions.map((c) => ({
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
        setPdfLoading(null);
      }
    },
    [locale, t]
  );

  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return;
    const { type, quotation } = pendingAction;
    try {
      if (type === "delete") {
        await deleteMutation.mutateAsync(quotation.id);
        toast.success(t("deleted"));
      } else if (type === "approve") {
        await approveMutation.mutateAsync({ id: quotation.id, projectId });
        toast.success(t("approved"));
      } else if (type === "reject") {
        await rejectMutation.mutateAsync({ id: quotation.id });
        toast.success(t("rejected"));
      }
    } catch {
      if (type === "delete") toast.error(t("deleteError"));
      else if (type === "approve") toast.error(t("approveError"));
      else toast.error(t("rejectError"));
    } finally {
      setPendingAction(null);
    }
  }, [pendingAction, deleteMutation, approveMutation, rejectMutation, t, projectId]);

  const isPending =
    deleteMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending;

  const confirmTitle =
    pendingAction?.type === "delete"
      ? t("deleteQuotation")
      : pendingAction?.type === "approve"
        ? t("approve")
        : t("reject");

  const confirmDesc =
    pendingAction?.type === "delete"
      ? t("deleteWarning")
      : pendingAction?.type === "approve"
        ? t("approveWarning")
        : t("rejectWarning");

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {t("title")} ({quotations.length})
        </h3>
        <Button
          size="sm"
          leadingIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() =>
            router.push(`/${locale}/projects/${projectId}/quotations/new`)
          }
        >
          {t("newQuotation")}
        </Button>
      </div>

      {/* Empty state */}
      {quotations.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-surface-elevated">
            <FileText className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            {t("noQuotations")}
          </p>
        </div>
      )}

      {/* Table */}
      {quotations.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("numberLabel")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("dateLabel")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("statusLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("grandTotalLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("linesCountLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {tCommon("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {q.quotationNumber}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(q.date, { dateStyle: "medium" })}
                  </td>
                  <td className="px-4 py-3">
                    <QuotationStatusBadge status={q.status} />
                  </td>
                  <td className="px-4 py-3 text-end font-medium tabular-nums">
                    {formatCurrency(Number(q.grandTotal))}
                  </td>
                  <td className="px-4 py-3 text-end text-muted-foreground">
                    {q._count.lines}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("viewQuotation")}
                        onClick={() =>
                          router.push(
                            `/${locale}/projects/${projectId}/quotations/${q.id}`
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Edit (DRAFT only) */}
                      {q.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={tCommon("edit")}
                          onClick={() =>
                            router.push(
                              `/${locale}/projects/${projectId}/quotations/${q.id}/edit`
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Print PDF */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("printPdf")}
                        loading={pdfLoading === q.id}
                        onClick={() => void handlePdf(q.id)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>

                      {/* Approve / Reject (DRAFT only) */}
                      {q.status === "DRAFT" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-success hover:text-success"
                            aria-label={t("approve")}
                            onClick={() =>
                              setPendingAction({ type: "approve", quotation: q })
                            }
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-error hover:text-error"
                            aria-label={t("reject")}
                            onClick={() =>
                              setPendingAction({ type: "reject", quotation: q })
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {/* Delete (DRAFT or REJECTED) */}
                      {(q.status === "DRAFT" || q.status === "REJECTED") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-error hover:text-error"
                          aria-label={tCommon("delete")}
                          onClick={() =>
                            setPendingAction({ type: "delete", quotation: q })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Dialog */}
      {pendingAction && (
        <Dialog open onOpenChange={(o) => { if (!o) setPendingAction(null); }}>
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
                variant={pendingAction.type === "approve" ? "default" : "destructive"}
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
