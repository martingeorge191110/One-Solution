"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useConditions,
  useCreateCondition,
  useUpdateCondition,
  useDeleteCondition,
} from "@/lib/hooks/useSystemData";
import type { Condition } from "@/lib/api/system-data.api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/lib/hooks/useDebounce";

const PAGE_SIZE = 10;

const conditionSchema = z.object({
  titleAr: z.string().optional(),
  titleEn: z.string().optional(),
  bodyAr: z.string().min(1),
  bodyEn: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

type ConditionFormData = z.infer<typeof conditionSchema>;

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

// ─── Condition Form Dialog ─────────────────────────────────────────────────────
function ConditionDialog({
  open,
  condition,
  onClose,
}: {
  open: boolean;
  condition: Condition | null;
  onClose: () => void;
}) {
  const t = useTranslations("systemData.conditions");
  const tCommon = useTranslations("common");
  const createMutation = useCreateCondition();
  const updateMutation = useUpdateCondition();
  const isEdit = !!condition;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConditionFormData>({
    resolver: zodResolver(conditionSchema),
    values: condition
      ? {
          titleAr: condition.titleAr ?? "",
          titleEn: condition.titleEn ?? "",
          bodyAr: condition.bodyAr,
          bodyEn: condition.bodyEn ?? "",
          order: condition.order ?? undefined,
          isActive: condition.isActive,
        }
      : { titleAr: "", titleEn: "", bodyAr: "", bodyEn: "", isActive: true },
  });

  const isActive = watch("isActive");

  const onSubmit = async (data: ConditionFormData) => {
    try {
      const body = {
        titleAr: data.titleAr || undefined,
        titleEn: data.titleEn || undefined,
        bodyAr: data.bodyAr,
        bodyEn: data.bodyEn || undefined,
        order: data.order,
        isActive: data.isActive,
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: condition.id, body });
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="cond-titleAr"
              label={t("titleAr")}
              placeholder={t("titleArPlaceholder")}
              error={errors.titleAr?.message}
              {...register("titleAr")}
            />
            <Input
              id="cond-titleEn"
              label={t("titleEn")}
              placeholder={t("titleEnPlaceholder")}
              error={errors.titleEn?.message}
              {...register("titleEn")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("bodyAr")} <span className="ms-0.5 text-error">*</span>
            </label>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:text-neutral-100 dark:border-surface-border resize-y"
              placeholder={t("bodyArPlaceholder")}
              {...register("bodyAr")}
            />
            {errors.bodyAr && (
              <p className="text-xs text-error">{errors.bodyAr.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("bodyEn")}
            </label>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:text-neutral-100 dark:border-surface-border resize-y"
              placeholder={t("bodyEnPlaceholder")}
              {...register("bodyEn")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="cond-order"
              type="number"
              label={t("order")}
              placeholder="0"
              error={errors.order?.message}
              {...register("order", { valueAsNumber: true })}
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

// ─── Conditions Tab ────────────────────────────────────────────────────────────
export function ConditionsTab() {
  const t = useTranslations("systemData.conditions");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCondition, setEditCondition] = useState<Condition | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Condition | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation = useDeleteCondition();

  const { data, isLoading } = useConditions({
    search: debouncedSearch || undefined,
    isActive: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const conditions = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          onClick={() => { setEditCondition(null); setDialogOpen(true); }}
        >
          {t("createTitle")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white ps-9 pe-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("statusPlaceholder")}</SelectItem>
            <SelectItem value="true">{t("statusActive")}</SelectItem>
            <SelectItem value="false">{t("statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("titleAr")}</TableHead>
              <TableHead>{t("bodyPreview")}</TableHead>
              <TableHead>{t("order")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-end">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : conditions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              conditions.map((cond) => (
                <TableRow key={cond.id}>
                  <TableCell className="font-medium">{cond.titleAr ?? "—"}</TableCell>
                  <TableCell className="max-w-xs text-muted-foreground truncate text-sm">
                    {cond.bodyAr.length > 80
                      ? `${cond.bodyAr.slice(0, 80)}…`
                      : cond.bodyAr}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{cond.order ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={cond.isActive ? "active" : "inactive"} dot>
                      {cond.isActive ? t("statusActive") : t("statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditCondition(cond); setDialogOpen(true); }}
                        aria-label={tCommon("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(cond)}
                        aria-label={tCommon("delete")}
                        className="text-error hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("page")} {page} {t("of")} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {tCommon("previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {tCommon("next")}
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConditionDialog
        open={dialogOpen}
        condition={editCondition}
        onClose={() => { setDialogOpen(false); setEditCondition(null); }}
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
