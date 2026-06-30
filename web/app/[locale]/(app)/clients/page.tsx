"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, ExternalLink, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useClients,
  useClientSummary,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from "@/lib/hooks/useClients";
import type { Client } from "@/lib/api/clients.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/ui/kpi-card";
import { useDebounce } from "@/lib/hooks/useDebounce";

const PAGE_SIZE = 10;

// ─── Schemas ─────────────────────────────────────────────────────────────────
const clientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

// ─── Confirm Dialog ──────────────────────────────────────────────────────────
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

// ─── Client Form Dialog ──────────────────────────────────────────────────────
function ClientDialog({
  open,
  client,
  onClose,
}: {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    values: client
      ? {
          name: client.name,
          phone: client.phone ?? "",
          email: client.email ?? "",
          address: client.address ?? "",
          notes: client.notes ?? "",
        }
      : { name: "", phone: "", email: "", address: "", notes: "" },
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      const body = {
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: client.id, body });
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
          <DialogTitle>{isEdit ? t("editClient") : t("createClient")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="client-name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <Input
            id="client-phone"
            label={t("phoneLabel")}
            placeholder={t("phonePlaceholder")}
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            id="client-email"
            type="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="client-address"
            label={t("addressLabel")}
            placeholder={t("addressPlaceholder")}
            error={errors.address?.message}
            {...register("address")}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("notesLabel")}
            </label>
            <textarea
              id="client-notes"
              placeholder={t("notesPlaceholder")}
              className="min-h-[80px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
              {...register("notes")}
            />
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation = useDeleteClient();

  const { data: summary, isLoading: summaryLoading } = useClientSummary();
  const { data, isLoading } = useClients({
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const clients = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success(t("deleted"));
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.error(t("deleteHasProjects"));
      } else {
        toast.error(t("deleteError"));
      }
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete, deleteMutation, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t("kpi.totalClients")}
          value={summary?.clientsCount ?? 0}
          icon={<Users className="h-4 w-4" />}
          loading={summaryLoading}
          accent="primary"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white ps-9 pe-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button
          leadingIcon={<Plus className="h-4 w-4" />}
          onClick={() => { setEditClient(null); setDialogOpen(true); }}
        >
          {t("createClient")}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("nameLabel")}</TableHead>
              <TableHead>{t("phoneLabel")}</TableHead>
              <TableHead>{t("emailLabel")}</TableHead>
              <TableHead>{t("projectsCount")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
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
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/${locale}/clients/${client.id}`)}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{client._count?.projects ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/${locale}/clients/${client.id}`)}
                        aria-label={t("viewClient")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditClient(client); setDialogOpen(true); }}
                        aria-label={tCommon("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(client)}
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
      <ClientDialog
        open={dialogOpen}
        client={editClient}
        onClose={() => { setDialogOpen(false); setEditClient(null); }}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        title={t("deleteClient")}
        description={t("deleteWarning")}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
