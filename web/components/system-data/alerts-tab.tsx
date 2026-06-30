"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Bell } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAlertThresholds,
  useCreateAlertThreshold,
  useUpdateAlertThreshold,
  useDeleteAlertThreshold,
} from "@/lib/hooks/useSystemData";
import type { AlertThreshold } from "@/lib/api/system-data.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const alertSchema = z.object({
  type: z.string().optional(),
  mode: z.enum(["AMOUNT", "PERCENT"]),
  value: z.number().min(0),
  basis: z.string().optional(),
  isActive: z.boolean().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isPending: boolean;
}) {
  const tCommon = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={isPending}>
            {tCommon("confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Alert Form Dialog ─────────────────────────────────────────────────────────
function AlertDialog({
  open,
  threshold,
  onClose,
}: {
  open: boolean;
  threshold: AlertThreshold | null;
  onClose: () => void;
}) {
  const t = useTranslations("systemData.alerts");
  const tCommon = useTranslations("common");
  const createMutation = useCreateAlertThreshold();
  const updateMutation = useUpdateAlertThreshold();
  const isEdit = !!threshold;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    values: threshold
      ? {
          type: threshold.type ?? "",
          mode: threshold.mode,
          value: Number(threshold.value),
          basis: threshold.basis ?? "",
          isActive: threshold.isActive,
        }
      : {
          type: "REMAINING_OPERATIONAL_LOW",
          mode: "PERCENT",
          value: 20,
          basis: "",
          isActive: true,
        },
  });

  const mode = watch("mode");
  const isActive = watch("isActive");

  const onSubmit = async (data: AlertFormData) => {
    try {
      const body = {
        type: data.type || undefined,
        mode: data.mode,
        value: data.value,
        basis: data.basis || undefined,
        isActive: data.isActive,
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: threshold.id, body });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(body);
        toast.success(t("created"));
      }
      reset();
      onClose();
    } catch {
      toast.error(isEdit ? t("updateError") : t("createError"));
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("helperText")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="alert-type"
            label={t("type")}
            placeholder={t("typePlaceholder")}
            error={errors.type?.message}
            {...register("type")}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("mode")} <span className="ms-0.5 text-error">*</span>
            </label>
            <Select
              value={mode}
              onValueChange={(v) =>
                setValue("mode", v as "AMOUNT" | "PERCENT", { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AMOUNT">{t("modeAmount")}</SelectItem>
                <SelectItem value="PERCENT">{t("modePercent")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.mode && <p className="text-xs text-error">{errors.mode.message}</p>}
          </div>
          <Input
            id="alert-value"
            type="number"
            label={`${t("value")} ${mode === "PERCENT" ? "(%)" : ""}`}
            placeholder={mode === "PERCENT" ? "20" : "5000"}
            error={errors.value?.message}
            required
            {...register("value", { valueAsNumber: true })}
          />
          <Input
            id="alert-basis"
            label={t("basis")}
            placeholder={t("basisPlaceholder")}
            error={errors.basis?.message}
            {...register("basis")}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("status")}
            </label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(v) => setValue("isActive", v === "true", { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("statusActive")}</SelectItem>
                <SelectItem value="false">{t("statusInactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? tCommon("save") : tCommon("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Threshold Card ────────────────────────────────────────────────────────────
function ThresholdCard({
  threshold,
  onEdit,
  onDelete,
}: {
  threshold: AlertThreshold;
  onEdit: (t: AlertThreshold) => void;
  onDelete: (t: AlertThreshold) => void;
}) {
  const t = useTranslations("systemData.alerts");
  const tCommon = useTranslations("common");

  const isGlobal = !threshold.projectId;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {threshold.type ?? t("defaultType")}
            </p>
            <p className="text-xs text-muted-foreground">
              {isGlobal ? t("globalDefault") : t("projectSpecific")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={threshold.isActive ? "active" : "inactive"} dot>
            {threshold.isActive ? t("statusActive") : t("statusInactive")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("mode")}</p>
          <p className="mt-0.5 font-medium">
            {threshold.mode === "AMOUNT" ? t("modeAmount") : t("modePercent")}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("value")}</p>
          <p className="mt-0.5 font-medium text-warning">
            {threshold.value}{threshold.mode === "PERCENT" ? "%" : ""}
          </p>
        </div>
        {threshold.basis && (
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("basis")}</p>
            <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">{threshold.basis}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        {t("helperText")}
      </p>

      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(threshold)}
          aria-label={tCommon("edit")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(threshold)}
          aria-label={tCommon("delete")}
          className="text-error hover:text-error"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Alerts Tab ────────────────────────────────────────────────────────────────
export function AlertsTab() {
  const t = useTranslations("systemData.alerts");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editThreshold, setEditThreshold] = useState<AlertThreshold | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AlertThreshold | null>(null);

  const deleteMutation = useDeleteAlertThreshold();

  const { data, isLoading } = useAlertThresholds({ pageSize: 50 });
  const thresholds = data?.data ?? [];

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete, deleteMutation, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <Button
          leadingIcon={<Plus className="h-4 w-4" />}
          onClick={() => { setEditThreshold(null); setDialogOpen(true); }}
        >
          {t("createTitle")}
        </Button>
      </div>

      {/* Helper banner */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
        {t("helperText")}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : thresholds.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm">{t("noThresholds")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {thresholds.map((threshold) => (
            <ThresholdCard
              key={threshold.id}
              threshold={threshold}
              onEdit={(th) => { setEditThreshold(th); setDialogOpen(true); }}
              onDelete={(th) => setConfirmDelete(th)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog
        open={dialogOpen}
        threshold={editThreshold}
        onClose={() => { setDialogOpen(false); setEditThreshold(null); }}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        title={t("deleteTitle")}
        description={t("deleteWarning")}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
