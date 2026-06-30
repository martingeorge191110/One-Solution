"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { toast } from "sonner";
import {
  ClipboardList,
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  useDailyLogs,
  useDailyLogSummary,
  useCreateDailyLog,
  useUpdateDailyLog,
  useDeleteDailyLog,
} from "@/lib/hooks/useDailyLogs";
import { useTerms, useItems } from "@/lib/hooks/useSystemData";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DailyLog } from "@/lib/api/dailyLogs.api";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  projectId: string;
  isActive: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Zod schema ───────────────────────────────────────────────────────────────
const logSchema = z
  .object({
    isAdditional: z.boolean(),
    logDate: z.string().min(1, "Required"),
    // Term/Item mode
    termId: z.string().optional(),
    itemId: z.string().optional(),
    // Additional mode
    additionalNameAr: z.string().optional(),
    additionalNameEn: z.string().optional(),
    // Shared
    quantity: z
      .number({ error: "Must be a number" })
      .positive()
      .optional()
      .or(z.nan().transform(() => undefined)),
    unit: z.string().optional(),
    unitPrice: z
      .number({ error: "Must be a number" })
      .positive()
      .optional()
      .or(z.nan().transform(() => undefined)),
    amount: z.number({ error: "Required" }).positive("Amount must be positive"),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isAdditional) {
      if (!data.termId) {
        ctx.addIssue({ code: "custom", path: ["termId"], message: "Term is required" });
      }
      if (!data.itemId) {
        ctx.addIssue({ code: "custom", path: ["itemId"], message: "Item is required" });
      }
    } else {
      if (!data.additionalNameAr || data.additionalNameAr.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["additionalNameAr"],
          message: "Arabic name is required",
        });
      }
    }
  });

type LogFormData = z.infer<typeof logSchema>;

// ─── Daily Log Form Dialog ────────────────────────────────────────────────────
function DailyLogFormDialog({
  projectId,
  log,
  onClose,
}: {
  projectId: string;
  log?: DailyLog;
  onClose: () => void;
}) {
  const t = useTranslations("dailyLogs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isEdit = !!log;

  const createMutation = useCreateDailyLog();
  const updateMutation = useUpdateDailyLog(projectId);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogFormData>({
    resolver: zodResolver(logSchema) as Resolver<LogFormData>,
    defaultValues: {
      isAdditional: log?.isAdditional ?? false,
      logDate: log?.logDate ? log.logDate.slice(0, 10) : todayIso(),
      termId: log?.termId ?? undefined,
      itemId: log?.itemId ?? undefined,
      additionalNameAr: log?.additionalNameAr ?? "",
      additionalNameEn: log?.additionalNameEn ?? "",
      quantity: log?.quantity ? Number(log.quantity) : undefined,
      unit: log?.unit ?? "",
      unitPrice: log?.unitPrice ? Number(log.unitPrice) : undefined,
      amount: log?.amount ? Number(log.amount) : undefined,
      notes: log?.notes ?? "",
    },
  });

  const watchedIsAdditional = watch("isAdditional");
  const watchedTermId = watch("termId");

  // Load terms
  const { data: termsData } = useTerms({ isActive: "true", pageSize: 200 });
  const terms = termsData?.data ?? [];

  // Load items for selected term
  const { data: itemsData } = useItems({
    termId: watchedTermId ?? undefined,
    isActive: "true",
    pageSize: 200,
  });
  const items = itemsData?.data ?? [];

  // When term changes, reset item and auto-populate unit from item default
  useEffect(() => {
    if (!watchedIsAdditional) {
      setValue("itemId", undefined);
    }
  }, [watchedTermId, watchedIsAdditional, setValue]);

  const watchedItemId = watch("itemId");

  // Auto-fill unit from item's defaultUnit
  useEffect(() => {
    if (watchedItemId) {
      const item = items.find((i) => i.id === watchedItemId);
      if (item?.defaultUnit) {
        setValue("unit", item.defaultUnit);
      }
    }
  }, [watchedItemId, items, setValue]);

  const onSubmit = async (data: LogFormData) => {
    try {
      if (isEdit && log) {
        await updateMutation.mutateAsync({
          id: log.id,
          body: {
            logDate: new Date(data.logDate).toISOString(),
            isAdditional: data.isAdditional,
            termId: data.isAdditional ? undefined : data.termId,
            itemId: data.isAdditional ? undefined : data.itemId,
            additionalNameAr: data.isAdditional
              ? data.additionalNameAr
              : undefined,
            additionalNameEn: data.isAdditional
              ? data.additionalNameEn || undefined
              : undefined,
            quantity: data.quantity && !isNaN(data.quantity) ? data.quantity : undefined,
            unit: data.unit || undefined,
            unitPrice: data.unitPrice && !isNaN(data.unitPrice) ? data.unitPrice : undefined,
            amount: data.amount,
            notes: data.notes || undefined,
          },
        });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync({
          projectId,
          logDate: new Date(data.logDate).toISOString(),
          isAdditional: data.isAdditional,
          termId: data.isAdditional ? undefined : data.termId,
          itemId: data.isAdditional ? undefined : data.itemId,
          additionalNameAr: data.isAdditional ? data.additionalNameAr : undefined,
          additionalNameEn:
            data.isAdditional && data.additionalNameEn
              ? data.additionalNameEn
              : undefined,
          quantity: data.quantity && !isNaN(data.quantity) ? data.quantity : undefined,
          unit: data.unit || undefined,
          unitPrice: data.unitPrice && !isNaN(data.unitPrice) ? data.unitPrice : undefined,
          amount: data.amount,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editLog") : t("addLog")}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <Controller
              name="isAdditional"
              control={control}
              render={({ field }) => (
                <>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      !field.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground hover:bg-muted/40"
                    }`}
                    onClick={() => field.onChange(false)}
                  >
                    {t("modeToggle.termItem")}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      field.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground hover:bg-muted/40"
                    }`}
                    onClick={() => field.onChange(true)}
                  >
                    {t("modeToggle.additional")}
                  </button>
                </>
              )}
            />
          </div>

          {/* Date */}
          <Input
            id="log-date"
            type="date"
            label={t("dateLabel")}
            error={errors.logDate?.message}
            required
            {...register("logDate")}
          />

          {/* Term / Item mode */}
          {!watchedIsAdditional && (
            <>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t("termLabel")} <span className="text-error">*</span>
                </label>
                <Controller
                  name="termId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v)}
                    >
                      <SelectTrigger
                        state={errors.termId ? "error" : "default"}
                      >
                        <SelectValue placeholder={t("termPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {locale === "ar"
                              ? term.nameAr
                              : term.nameEn || term.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.termId && (
                  <p className="text-xs text-error">{errors.termId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t("itemLabel")} <span className="text-error">*</span>
                </label>
                <Controller
                  name="itemId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v)}
                      disabled={!watchedTermId}
                    >
                      <SelectTrigger
                        state={errors.itemId ? "error" : "default"}
                      >
                        <SelectValue placeholder={t("itemPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {locale === "ar"
                              ? item.nameAr
                              : item.nameEn || item.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.itemId && (
                  <p className="text-xs text-error">{errors.itemId.message}</p>
                )}
              </div>
            </>
          )}

          {/* Additional mode */}
          {watchedIsAdditional && (
            <>
              <Input
                id="log-additionalNameAr"
                type="text"
                label={t("additionalNameArLabel")}
                placeholder={t("additionalNameArPlaceholder")}
                error={errors.additionalNameAr?.message}
                required
                dir="rtl"
                {...register("additionalNameAr")}
              />
              <Input
                id="log-additionalNameEn"
                type="text"
                label={t("additionalNameEnLabel")}
                placeholder={t("additionalNameEnPlaceholder")}
                {...register("additionalNameEn")}
              />
            </>
          )}

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="log-quantity"
              type="number"
              step="0.01"
              min="0.01"
              label={t("quantityLabel")}
              error={errors.quantity?.message}
              {...register("quantity", { valueAsNumber: true })}
            />
            <Input
              id="log-unit"
              type="text"
              label={t("unitLabel")}
              placeholder={t("unitPlaceholder")}
              {...register("unit")}
            />
          </div>

          {/* Unit Price */}
          <Input
            id="log-unitPrice"
            type="number"
            step="0.01"
            min="0.01"
            label={t("unitPriceLabel")}
            error={errors.unitPrice?.message}
            {...register("unitPrice", { valueAsNumber: true })}
          />

          {/* Amount */}
          <Input
            id="log-amount"
            type="number"
            step="0.01"
            min="0.01"
            label={t("amountLabel")}
            error={errors.amount?.message}
            required
            {...register("amount", { valueAsNumber: true })}
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
  log,
  projectId,
  onClose,
}: {
  log: DailyLog;
  projectId: string;
  onClose: () => void;
}) {
  const t = useTranslations("dailyLogs");
  const tCommon = useTranslations("common");
  const deleteMutation = useDeleteDailyLog(projectId);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(log.id);
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
          <DialogTitle>{t("deleteLog")}</DialogTitle>
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

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function DailyLogKpiStrip({ projectId }: { projectId: string }) {
  const t = useTranslations("dailyLogs");
  const { data: summary, isLoading } = useDailyLogSummary(projectId);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        title={t("kpi.totalSpent")}
        value={
          isLoading ? "…" : summary ? formatCurrency(Number(summary.totalSpent)) : "—"
        }
        loading={false}
        accent="warning"
      />
      <KpiCard
        title={t("kpi.termItemSpent")}
        value={
          isLoading ? "…" : summary ? formatCurrency(Number(summary.termItemSpent)) : "—"
        }
        loading={false}
        accent="primary"
      />
      <KpiCard
        title={t("kpi.additionalsSpent")}
        value={
          isLoading ? "…" : summary ? formatCurrency(Number(summary.additionalsSpent)) : "—"
        }
        loading={false}
        accent="info"
      />
      <KpiCard
        title={t("kpi.logsCount")}
        value={isLoading ? "…" : summary ? summary.logsCount : "—"}
        loading={false}
        accent="default"
      />
      <KpiCard
        title={t("kpi.lastLog")}
        value={
          isLoading
            ? "…"
            : summary?.lastLogDate
            ? formatDate(summary.lastLogDate, { dateStyle: "medium" })
            : "—"
        }
        loading={false}
        accent="default"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DailyLogPanel({ projectId, isActive }: Props) {
  const t = useTranslations("dailyLogs");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [addOpen, setAddOpen] = useState(false);
  const [editLog, setEditLog] = useState<DailyLog | null>(null);
  const [deleteLog, setDeleteLog] = useState<DailyLog | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [additionalsOnly, setAdditionalsOnly] = useState(false);

  const { data, isLoading } = useDailyLogs({
    projectId,
    page,
    pageSize,
    from: filterFrom || undefined,
    to: filterTo || undefined,
    termId: filterTermId || undefined,
    isAdditional: additionalsOnly ? true : undefined,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Terms for filter
  const { data: termsData } = useTerms({ isActive: "true", pageSize: 200 });
  const terms = termsData?.data ?? [];

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
      <DailyLogKpiStrip projectId={projectId} />

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
            {t("addLog")}
          </Button>
          {!isActive && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 shrink-0 text-warning" />
              {t("guard.notActive")}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
          placeholder={t("filterFrom")}
          className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
          aria-label={t("filterFrom")}
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
          placeholder={t("filterTo")}
          className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
          aria-label={t("filterTo")}
        />
        <Select
          value={filterTermId}
          onValueChange={(v) => { setFilterTermId(v === "__all" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder={t("filterTerm")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t("allTerms")}</SelectItem>
            {terms.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                {locale === "ar" ? term.nameAr : term.nameEn || term.nameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:bg-surface-elevated dark:border-surface-border">
          <input
            type="checkbox"
            checked={additionalsOnly}
            onChange={(e) => { setAdditionalsOnly(e.target.checked); setPage(1); }}
            className="rounded"
          />
          {t("additionalsOnly")}
        </label>
      </div>

      {/* Empty state */}
      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-surface-elevated">
            <ClipboardList className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            {t("noLogs")}
          </p>
        </div>
      )}

      {/* Table */}
      {logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("dateLabel")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("termLabel")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t("itemLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("quantityLabel")} / {t("unitLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t("amountLabel")}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {tCommon("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const termName = log.term
                  ? locale === "ar"
                    ? log.term.nameAr
                    : log.term.nameEn || log.term.nameAr
                  : null;
                const itemDisplay = log.isAdditional
                  ? locale === "ar"
                    ? log.additionalNameAr
                    : log.additionalNameEn || log.additionalNameAr
                  : log.item
                  ? locale === "ar"
                    ? log.item.nameAr
                    : log.item.nameEn || log.item.nameAr
                  : null;

                return (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(log.logDate, { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.isAdditional ? "—" : termName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {itemDisplay ?? "—"}
                        {log.isAdditional && (
                          <Badge variant="warning" size="sm">
                            {t("additionalBadge")}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                      {log.quantity
                        ? `${Number(log.quantity)} ${log.unit ?? ""}`
                        : log.unit
                        ? log.unit
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-end font-medium tabular-nums">
                      {formatCurrency(Number(log.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={tCommon("edit")}
                          disabled={!isActive}
                          onClick={() => setEditLog(log)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-error hover:text-error"
                          aria-label={tCommon("delete")}
                          onClick={() => setDeleteLog(log)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
        <DailyLogFormDialog
          projectId={projectId}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editLog && (
        <DailyLogFormDialog
          projectId={projectId}
          log={editLog}
          onClose={() => setEditLog(null)}
        />
      )}
      {deleteLog && (
        <DeleteConfirmDialog
          log={deleteLog}
          projectId={projectId}
          onClose={() => setDeleteLog(null)}
        />
      )}
    </div>
  );
}
