"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useTerms,
} from "@/lib/hooks/useSystemData";
import type { Item } from "@/lib/api/system-data.api";
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

const itemSchema = z.object({
  termId: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().optional(),
  defaultUnit: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

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

// ─── Item Form Dialog ──────────────────────────────────────────────────────────
function ItemDialog({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: Item | null;
  onClose: () => void;
}) {
  const t = useTranslations("systemData.items");
  const tCommon = useTranslations("common");
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const isEdit = !!item;

  // Load terms for the selector
  const { data: termsData } = useTerms({ pageSize: 200 });
  const allTerms = termsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    values: item
      ? {
          termId: item.termId,
          nameAr: item.nameAr,
          nameEn: item.nameEn ?? "",
          defaultUnit: item.defaultUnit ?? "",
          order: item.order ?? undefined,
          isActive: item.isActive,
        }
      : { termId: "", nameAr: "", nameEn: "", defaultUnit: "", isActive: true },
  });

  const termId = watch("termId");
  const isActive = watch("isActive");

  const onSubmit = async (data: ItemFormData) => {
    try {
      const body = {
        termId: data.termId,
        nameAr: data.nameAr,
        nameEn: data.nameEn || undefined,
        defaultUnit: data.defaultUnit || undefined,
        order: data.order,
        isActive: data.isActive,
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: item.id, body });
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
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Term Selector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("term")} <span className="ms-0.5 text-error">*</span>
            </label>
            <Select
              value={termId}
              onValueChange={(v) => setValue("termId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("termPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {allTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.nameAr}{term.nameEn ? ` — ${term.nameEn}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.termId && (
              <p className="text-xs text-error">{errors.termId.message}</p>
            )}
          </div>

          <Input
            id="item-nameAr"
            label={t("nameAr")}
            placeholder={t("nameArPlaceholder")}
            error={errors.nameAr?.message}
            required
            {...register("nameAr")}
          />
          <Input
            id="item-nameEn"
            label={t("nameEn")}
            placeholder={t("nameEnPlaceholder")}
            error={errors.nameEn?.message}
            {...register("nameEn")}
          />
          <Input
            id="item-defaultUnit"
            label={t("defaultUnit")}
            placeholder={t("defaultUnitPlaceholder")}
            error={errors.defaultUnit?.message}
            {...register("defaultUnit")}
          />
          <Input
            id="item-order"
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

// ─── Items Tab ─────────────────────────────────────────────────────────────────
export function ItemsTab() {
  const t = useTranslations("systemData.items");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [termFilter, setTermFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation = useDeleteItem();

  // Terms for filter dropdown
  const { data: termsData } = useTerms({ pageSize: 200 });
  const allTerms = termsData?.data ?? [];

  const { data, isLoading } = useItems({
    search: debouncedSearch || undefined,
    termId: termFilter !== "ALL" ? termFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const items = data?.data ?? [];
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
          onClick={() => { setEditItem(null); setDialogOpen(true); }}
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
          value={termFilter}
          onValueChange={(v) => { setTermFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t("termPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allTerms")}</SelectItem>
            {allTerms.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                {term.nameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("nameAr")}</TableHead>
              <TableHead>{t("nameEn")}</TableHead>
              <TableHead>{t("term")}</TableHead>
              <TableHead>{t("defaultUnit")}</TableHead>
              <TableHead>{t("order")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-end">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nameAr}</TableCell>
                  <TableCell className="text-muted-foreground">{item.nameEn ?? "—"}</TableCell>
                  <TableCell>
                    {item.term ? (
                      <Badge variant="primary">{item.term.nameAr}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.defaultUnit ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.order ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "active" : "inactive"} dot>
                      {item.isActive ? t("statusActive") : t("statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditItem(item); setDialogOpen(true); }}
                        aria-label={tCommon("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(item)}
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
      <ItemDialog
        open={dialogOpen}
        item={editItem}
        onClose={() => { setDialogOpen(false); setEditItem(null); }}
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
