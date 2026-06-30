"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useProjects,
  useProjectSummary,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "@/lib/hooks/useProjects";
import { useClients } from "@/lib/hooks/useClients";
import type { Project } from "@/lib/api/projects.api";
import type { ProjectStatus } from "@/lib/api/clients.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
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
import { KpiCard } from "@/components/ui/kpi-card";
import { useDebounce } from "@/lib/hooks/useDebounce";

const PAGE_SIZE = 10;

// ─── Status helpers ───────────────────────────────────────────────────────────
function statusVariant(status: ProjectStatus): BadgeVariant {
  switch (status) {
    case "ACTIVE": return "active";
    case "COMPLETED": return "success";
    case "CANCELLED": return "error";
    default: return "default";
  }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────
const projectSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  location: z.string().optional(),
  unitType: z.string().optional(),
  description: z.string().optional(),
  supervisionPercent: z.number().min(0).max(100).optional().or(z.nan()),
});

const editProjectSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  unitType: z.string().optional(),
  description: z.string().optional(),
  supervisionPercent: z.number().min(0).max(100).optional().or(z.nan()),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type EditProjectFormData = z.infer<typeof editProjectSchema>;

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

// ─── Create Project Dialog ────────────────────────────────────────────────────
function CreateProjectDialog({
  open,
  onClose,
  defaultClientId,
}: {
  open: boolean;
  onClose: () => void;
  defaultClientId?: string;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const createMutation = useCreateProject();
  const { data: clientsData } = useClients({ pageSize: 200 });
  const allClients = clientsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      clientId: defaultClientId ?? "",
      name: "",
      location: "",
      unitType: "",
      description: "",
    },
  });

  const clientId = watch("clientId");

  const onSubmit = async (data: ProjectFormData) => {
    try {
      await createMutation.mutateAsync({
        clientId: data.clientId,
        name: data.name,
        location: data.location || undefined,
        unitType: data.unitType || undefined,
        description: data.description || undefined,
        supervisionPercent:
          data.supervisionPercent && !isNaN(data.supervisionPercent)
            ? data.supervisionPercent
            : undefined,
      });
      toast.success(t("created"));
      reset();
      onClose();
    } catch {
      toast.error(t("createError"));
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
          <DialogTitle>{t("createProject")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Client */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("clientLabel")} <span className="ms-0.5 text-error">*</span>
            </label>
            <Select
              value={clientId}
              onValueChange={(v) => setValue("clientId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("clientPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {allClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-xs text-error">{errors.clientId.message}</p>
            )}
          </div>

          <Input
            id="proj-name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <Input
            id="proj-location"
            label={t("locationLabel")}
            placeholder={t("locationPlaceholder")}
            {...register("location")}
          />
          <Input
            id="proj-unitType"
            label={t("unitTypeLabel")}
            placeholder={t("unitTypePlaceholder")}
            {...register("unitType")}
          />
          <Input
            id="proj-supervisionPercent"
            type="number"
            label={t("supervisionPercentLabel")}
            placeholder={t("supervisionPercentPlaceholder")}
            error={errors.supervisionPercent?.message}
            {...register("supervisionPercent", { valueAsNumber: true })}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("descriptionLabel")}
            </label>
            <textarea
              placeholder={t("descriptionPlaceholder")}
              className="min-h-[80px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
              {...register("description")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {tCommon("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Project Dialog ──────────────────────────────────────────────────────
function EditProjectDialog({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const updateMutation = useUpdateProject();
  const { data: clientsData } = useClients({ pageSize: 200 });
  const allClients = clientsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProjectFormData>({
    resolver: zodResolver(editProjectSchema),
    values: project
      ? {
          name: project.name,
          location: project.location ?? "",
          unitType: project.unitType ?? "",
          description: project.description ?? "",
          supervisionPercent: project.supervisionPercent != null
            ? Number(project.supervisionPercent)
            : undefined,
        }
      : undefined,
  });

  // client selector for edit
  const [editClientId, setEditClientId] = useState(project?.clientId ?? "");

  const onSubmit = async (data: EditProjectFormData) => {
    if (!project) return;
    try {
      await updateMutation.mutateAsync({
        id: project.id,
        body: {
          name: data.name,
          location: data.location || undefined,
          unitType: data.unitType || undefined,
          description: data.description || undefined,
          supervisionPercent:
            data.supervisionPercent && !isNaN(data.supervisionPercent)
              ? data.supervisionPercent
              : undefined,
          clientId: editClientId || undefined,
        },
      });
      toast.success(t("updated"));
      reset();
      onClose();
    } catch {
      toast.error(t("updateError"));
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={!!project} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editProject")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Client */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("clientLabel")}
            </label>
            <Select
              value={editClientId}
              onValueChange={(v) => setEditClientId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("clientPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {allClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            id="edit-proj-name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <Input
            id="edit-proj-location"
            label={t("locationLabel")}
            placeholder={t("locationPlaceholder")}
            {...register("location")}
          />
          <Input
            id="edit-proj-unitType"
            label={t("unitTypeLabel")}
            placeholder={t("unitTypePlaceholder")}
            {...register("unitType")}
          />
          <Input
            id="edit-proj-supervisionPercent"
            type="number"
            label={t("supervisionPercentLabel")}
            placeholder={t("supervisionPercentPlaceholder")}
            error={errors.supervisionPercent?.message}
            {...register("supervisionPercent", { valueAsNumber: true })}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("descriptionLabel")}
            </label>
            <textarea
              placeholder={t("descriptionPlaceholder")}
              className="min-h-[80px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
              {...register("description")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const tProjectStatus = useTranslations("projectStatus");
  const locale = useLocale();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation = useDeleteProject();

  const { data: summary, isLoading: summaryLoading } = useProjectSummary();
  const { data: clientsData } = useClients({ pageSize: 200 });
  const allClients = clientsData?.data ?? [];

  const { data, isLoading } = useProjects({
    search: debouncedSearch || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    clientId: clientFilter !== "ALL" ? clientFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const projects = data?.data ?? [];
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
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FolderOpen className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t("kpi.totalProjects")}
          value={summary?.projectsCount ?? 0}
          icon={<FolderOpen className="h-4 w-4" />}
          loading={summaryLoading}
          accent="primary"
        />
        <KpiCard
          title={t("kpi.activeProjects")}
          value={summary?.byStatus?.ACTIVE ?? 0}
          loading={summaryLoading}
          accent="success"
        />
        <KpiCard
          title={t("kpi.draftProjects")}
          value={summary?.byStatus?.DRAFT ?? 0}
          loading={summaryLoading}
          accent="info"
        />
        <KpiCard
          title={t("kpi.completedProjects")}
          value={summary?.byStatus?.COMPLETED ?? 0}
          loading={summaryLoading}
          accent="warning"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
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
            <SelectItem value="DRAFT">{tProjectStatus("DRAFT")}</SelectItem>
            <SelectItem value="ACTIVE">{tProjectStatus("ACTIVE")}</SelectItem>
            <SelectItem value="COMPLETED">{tProjectStatus("COMPLETED")}</SelectItem>
            <SelectItem value="CANCELLED">{tProjectStatus("CANCELLED")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={clientFilter}
          onValueChange={(v) => { setClientFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t("allClients")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allClients")}</SelectItem>
            {allClients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          leadingIcon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateOpen(true)}
        >
          {t("createProject")}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("nameLabel")}</TableHead>
              <TableHead>{t("clientName")}</TableHead>
              <TableHead>{t("statusLabel")}</TableHead>
              <TableHead>{t("supervisionPercent")}</TableHead>
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
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                >
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.client?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(project.status)} dot>
                      {tProjectStatus(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.supervisionPercent != null
                      ? `${Number(project.supervisionPercent)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                        aria-label={t("openProject")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditProject(project)}
                        aria-label={tCommon("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(project)}
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
      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <EditProjectDialog
        project={editProject}
        onClose={() => setEditProject(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        title={t("deleteProject")}
        description={t("deleteWarning")}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
