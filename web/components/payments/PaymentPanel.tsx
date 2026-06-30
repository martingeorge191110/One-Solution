"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  usePayments,
  usePaymentSummary,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
} from "@/lib/hooks/usePayments";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/lib/api/payments.api";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  projectId: string;
  supervisionPercent: number;
  isActive: boolean;
}

// ─── Financial split helper ───────────────────────────────────────────────────
function computeSplit(
  amount: number,
  supervisionPercent: number
): { operational: number; supervision: number } {
  if (!amount || isNaN(amount) || amount <= 0) {
    return { operational: 0, supervision: 0 };
  }
  const operational = amount / (1 + supervisionPercent / 100);
  const supervision = amount - operational;
  return {
    operational: Math.round(operational * 100) / 100,
    supervision: Math.round(supervision * 100) / 100,
  };
}

// ─── Zod schema ───────────────────────────────────────────────────────────────
const paymentSchema = z.object({
  amount: z.number({ error: "Required" }).positive(),
  paidAt: z.string().min(1, "Required"),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type PaymentFormData = z.infer<typeof paymentSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Payment Form Dialog ─────────────────────────────────────────────────────
function PaymentFormDialog({
  projectId,
  supervisionPercent,
  payment,
  onClose,
}: {
  projectId: string;
  supervisionPercent: number;
  payment?: Payment;
  onClose: () => void;
}) {
  const t = useTranslations("payments");
  const tCommon = useTranslations("common");
  const isEdit = !!payment;

  const createMutation = useCreatePayment();
  const updateMutation = useUpdatePayment(projectId);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: payment ? Number(payment.amount) : undefined,
      paidAt: payment ? payment.paidAt.slice(0, 10) : todayIso(),
      method: payment?.method ?? "",
      reference: payment?.reference ?? "",
      notes: payment?.notes ?? "",
    },
  });

  const watchedAmount = watch("amount");
  const split = computeSplit(watchedAmount ?? 0, supervisionPercent);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      if (isEdit && payment) {
        await updateMutation.mutateAsync({
          id: payment.id,
          body: {
            amount: data.amount,
            paidAt: new Date(data.paidAt).toISOString(),
            method: data.method || undefined,
            reference: data.reference || undefined,
            notes: data.notes || undefined,
          },
        });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync({
          projectId,
          amount: data.amount,
          paidAt: new Date(data.paidAt).toISOString(),
          method: data.method || undefined,
          reference: data.reference || undefined,
          notes: data.notes || undefined,
        });
        toast.success(t("created"));
      }
      reset();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ??
        (isEdit ? t("updateError") : t("createError"));
      toast.error(msg);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editPayment") : t("addPayment")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Amount */}
          <Input
            id="pay-amount"
            type="number"
            step="0.01"
            min="0.01"
            label={t("amountLabel")}
            error={errors.amount?.message}
            required
            {...register("amount", { valueAsNumber: true })}
          />

          {/* Live split preview */}
          {watchedAmount > 0 && !isNaN(watchedAmount) && supervisionPercent > 0 && (
            <div className="rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm">
              <p className="mb-2 font-medium text-info">{t("splitPreview")}</p>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t("operationalAmountLabel")}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(split.operational)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t("supervisionAmountLabel")}
                </span>
                <span className="font-semibold tabular-nums text-success">
                  {formatCurrency(split.supervision)}
                </span>
              </div>
            </div>
          )}

          {/* Date */}
          <Input
            id="pay-paidAt"
            type="date"
            label={t("dateLabel")}
            error={errors.paidAt?.message}
            required
            {...register("paidAt")}
          />

          {/* Method */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("methodLabel")}
            </label>
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("methodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("methodCash")}</SelectItem>
                    <SelectItem value="transfer">{t("methodTransfer")}</SelectItem>
                    <SelectItem value="cheque">{t("methodCheque")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Reference */}
          <Input
            id="pay-reference"
            type="text"
            label={t("referenceLabel")}
            placeholder={t("referencePlaceholder")}
            {...register("reference")}
          />

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("notesLabel")}
            </label>
            <textarea
              placeholder={t("notesPlaceholder")}
              className="min-h-[72px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({
  payment,
  projectId,
  onClose,
}: {
  payment: Payment;
  projectId: string;
  onClose: () => void;
}) {
  const t = useTranslations("payments");
  const tCommon = useTranslations("common");
  const deleteMutation = useDeletePayment(projectId);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(payment.id);
      toast.success(t("deleted"));
      onClose();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("deletePayment")}</DialogTitle>
          <DialogDescription>{t("deleteWarning")}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            loading={deleteMutation.isPending}
          >
            {tCommon("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payments KPI Strip ───────────────────────────────────────────────────────
function PaymentKpiStrip({ projectId }: { projectId: string }) {
  const t = useTranslations("payments");
  const { data: summary, isLoading } = usePaymentSummary(projectId);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        title={t("kpi.totalCollected")}
        value={
          isLoading
            ? "…"
            : summary
            ? formatCurrency(Number(summary.totalCollected))
            : "—"
        }
        loading={false}
        accent="success"
      />
      <KpiCard
        title={t("kpi.supervisionEarned")}
        value={
          isLoading
            ? "…"
            : summary
            ? formatCurrency(Number(summary.totalSupervisionEarned))
            : "—"
        }
        loading={false}
        accent="primary"
      />
      <KpiCard
        title={t("kpi.operationalCollected")}
        value={
          isLoading
            ? "…"
            : summary
            ? formatCurrency(Number(summary.totalOperationalCollected))
            : "—"
        }
        loading={false}
        accent="info"
      />
      <KpiCard
        title={t("kpi.paymentsCount")}
        value={isLoading ? "…" : summary ? summary.paymentsCount : "—"}
        loading={false}
        accent="default"
      />
      <KpiCard
        title={t("kpi.lastPayment")}
        value={
          isLoading
            ? "…"
            : summary?.lastPaymentDate
            ? formatDate(summary.lastPaymentDate, { dateStyle: "medium" })
            : "—"
        }
        loading={false}
        accent="default"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PaymentPanel({ projectId, supervisionPercent, isActive }: Props) {
  const t = useTranslations("payments");
  const tCommon = useTranslations("common");

  const [addOpen, setAddOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = usePayments({ projectId, page, pageSize });
  const payments = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const methodLabel = useCallback(
    (method?: string | null) => {
      if (!method) return "—";
      switch (method) {
        case "cash": return t("methodCash");
        case "transfer": return t("methodTransfer");
        case "cheque": return t("methodCheque");
        default: return method;
      }
    },
    [t]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <PaymentKpiStrip projectId={projectId} />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {t("title")} ({total})
        </h3>
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            leadingIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={!isActive}
            onClick={() => setAddOpen(true)}
          >
            {t("addPayment")}
          </Button>
          {!isActive && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 shrink-0 text-warning" />
              {t("guard.notActive")}
            </p>
          )}
        </div>
      </div>

      {/* Empty state */}
      {payments.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-surface-elevated">
            <CreditCard className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            {t("noPayments")}
          </p>
        </div>
      )}

      {/* Table */}
      {payments.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("dateLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("amountLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("operationalAmountLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("supervisionAmountLabel")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("methodLabel")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("referenceLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {tCommon("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(p.paidAt, { dateStyle: "medium" })}
                  </td>
                  <td className="px-4 py-3 text-end font-medium tabular-nums">
                    {formatCurrency(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-info">
                    {formatCurrency(Number(p.operationalAmount))}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-success">
                    {formatCurrency(Number(p.supervisionAmount))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {methodLabel(p.method)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.reference ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tCommon("edit")}
                        disabled={!isActive}
                        onClick={() => setEditPayment(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-error hover:text-error"
                        aria-label={tCommon("delete")}
                        onClick={() => setDeletePayment(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {tCommon("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("page")} {page} {t("of")} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {tCommon("next")}
          </Button>
        </div>
      )}

      {/* Dialogs */}
      {addOpen && (
        <PaymentFormDialog
          projectId={projectId}
          supervisionPercent={supervisionPercent}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editPayment && (
        <PaymentFormDialog
          projectId={projectId}
          supervisionPercent={supervisionPercent}
          payment={editPayment}
          onClose={() => setEditPayment(null)}
        />
      )}
      {deletePayment && (
        <DeleteConfirmDialog
          payment={deletePayment}
          projectId={projectId}
          onClose={() => setDeletePayment(null)}
        />
      )}
    </div>
  );
}
