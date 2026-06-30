"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useTerms,
  useCreateTerm,
  useUpdateTerm,
  useDeleteTerm,
} from "@/lib/hooks/useSystemData";
import type { Term } from "@/lib/api/system-data.api";
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

const termSchema = z.object({
  nameAr: z.string().min(1),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

type TermFormData = z.infer<typeof termSchema>;

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

// ─── Term Form Dialog ──────────────────────────────────────────────────────────
function TermDialog({
  open,
  term,
  onClose,
}: {
  open: boolean;
  term: Term | null;
  onClose: () => void;
}) {
  const t = useTranslations("systemData.terms");
  const tCommon = useTranslations("common");
  const createMutation = useCreateTerm();
  const updateMutation = useUpdateTerm();
  const isEdit = !!term;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TermFormData>({
    resolver: zodResolver(termSchema),
    values: term
      ? {
          nameAr: term.nameAr,
          nameEn: term.nameEn ?? "",
          description: term.description ?? "",
          order: term.order ?? undefined,
          isActive: term.isActive,
        }
      : { nameAr: "", nameEn: "", description: "", isActive: true },
  });

  const isActive = watch("isActive");

  const onSubmit = async (data: TermFormData) => {
    try {
      const body = {
        nameAr: data.nameAr,
        nameEn: data.nameEn || undefined,
        description: data.description || undefined,
        order: data.order,
        isActive: data.isActive,
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: term.id, body });
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
          <Input
            id="term-nameAr"
            label={t("nameAr")}
            placeholder={t("nameArPlaceholder")}
            error={errors.nameAr?.message}
            required
            {...register("nameAr")}
          />
          <Input
            id="term-nameEn"
            label={t("nameEn")}
            placeholder={t("nameEnPlaceholder")}
            error={errors.nameEn?.message}
            {...register("nameEn")}
          />
          <Input
            id="term-description"
            label={t("description")}
            placeholder={t("descriptionPlaceholder")}
            error={errors.description?.message}
            {...register("description")}
          />
          <Input
            id="term-order"
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
              onValueChange={(v) =>
                setValue("isActive", v === "true", { shouldValidate: true })
              }
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

// ─── Terms Tab ────────────────────────────────────────────────────────────────
export function TermsTab() {
  const t = useTranslations("systemData.terms");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<Term | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Term | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation = useDeleteTerm();

  const { data, isLoading } = useTerms({
    search: debouncedSearch || undefined,
    isActive: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const terms = data?.data ?? [];
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
          onClick={() => { setEditTerm(null); setDialogOpen(true); }}
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
              <TableHead>{t("nameAr")}</TableHead>
              <TableHead>{t("nameEn")}</TableHead>
              <TableHead>{t("itemsCount")}</TableHead>
              <TableHead>{t("order")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-end">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : terms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.nameAr}</TableCell>
                  <TableCell className="text-muted-foreground">{term.nameEn ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="info">{term._count?.items ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{term.order ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={term.isActive ? "active" : "inactive"} dot>
                      {term.isActive ? t("statusActive") : t("statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditTerm(term); setDialogOpen(true); }}
                        aria-label={tCommon("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(term)}
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
      <TermDialog
        open={dialogOpen}
        term={editTerm}
        onClose={() => { setDialogOpen(false); setEditTerm(null); }}
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
