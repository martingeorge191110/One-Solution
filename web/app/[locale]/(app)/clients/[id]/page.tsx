"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Plus,
  ExternalLink,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClient, useUpdateClient } from "@/lib/hooks/useClients";
import { useCreateProject } from "@/lib/hooks/useProjects";
import type { Client } from "@/lib/api/clients.api";
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

// ─── Status badge helper ──────────────────────────────────────────────────────
function statusVariant(status: ProjectStatus): BadgeVariant {
  switch (status) {
    case "ACTIVE": return "active";
    case "COMPLETED": return "success";
    case "CANCELLED": return "error";
    default: return "default";
  }
}

// ─── Client Form Schema ───────────────────────────────────────────────────────
const clientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type ClientFormData = z.infer<typeof clientSchema>;

// ─── Project create schema ────────────────────────────────────────────────────
const projectSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  unitType: z.string().optional(),
  description: z.string().optional(),
  supervisionPercent: z.number().min(0).max(100).optional().or(z.nan()),
});
type ProjectFormData = z.infer<typeof projectSchema>;

// ─── Edit Client Dialog ───────────────────────────────────────────────────────
function EditClientDialog({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const updateMutation = useUpdateClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    values: {
      name: client.name,
      phone: client.phone ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: client.id,
        body: {
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          notes: data.notes || undefined,
        },
      });
      toast.success(t("updated"));
      reset();
      onClose();
    } catch {
      toast.error(t("updateError"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editClient")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="edit-client-name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <Input
            id="edit-client-phone"
            label={t("phoneLabel")}
            placeholder={t("phonePlaceholder")}
            {...register("phone")}
          />
          <Input
            id="edit-client-email"
            type="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="edit-client-address"
            label={t("addressLabel")}
            placeholder={t("addressPlaceholder")}
            {...register("address")}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("notesLabel")}
            </label>
            <textarea
              placeholder={t("notesPlaceholder")}
              className="min-h-[80px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
              {...register("notes")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} disabled={isSubmitting}>
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

// ─── New Project Dialog ───────────────────────────────────────────────────────
function NewProjectDialog({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", location: "", unitType: "", description: "" },
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const project = await createProject.mutateAsync({
        clientId,
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
      router.push(`/${locale}/projects/${project.id}`);
    } catch {
      toast.error(t("createError"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createProject")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} disabled={isSubmitting}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations("clients");
  const tProjects = useTranslations("projects");
  const tProjectStatus = useTranslations("projectStatus");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const { data: client, isLoading } = useClient(id);

  const handleBack = useCallback(() => {
    router.push(`/${locale}/clients`);
  }, [router, locale]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{tCommon("noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label={tCommon("back")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
          </div>
          <Button
            variant="outline"
            leadingIcon={<Pencil className="h-4 w-4" />}
            onClick={() => setEditOpen(true)}
          >
            {t("editClient")}
          </Button>
        </div>
      </div>

      {/* Client Info Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {client.phone && (
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">{t("phoneLabel")}</dt>
                <dd className="text-sm font-medium">{client.phone}</dd>
              </div>
            </div>
          )}
          {client.email && (
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">{t("emailLabel")}</dt>
                <dd className="text-sm font-medium">{client.email}</dd>
              </div>
            </div>
          )}
          {client.address && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">{t("addressLabel")}</dt>
                <dd className="text-sm font-medium">{client.address}</dd>
              </div>
            </div>
          )}
          {client.notes && (
            <div className="flex items-start gap-2 sm:col-span-2 lg:col-span-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">{t("notesLabel")}</dt>
                <dd className="text-sm">{client.notes}</dd>
              </div>
            </div>
          )}
        </dl>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("clientProjects")}</h2>
          <Button
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() => setNewProjectOpen(true)}
          >
            {t("newProject")}
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tProjects("nameLabel")}</TableHead>
                <TableHead>{tProjects("statusLabel")}</TableHead>
                <TableHead>{tProjects("supervisionPercent")}</TableHead>
                <TableHead>{tProjects("createdAt")}</TableHead>
                <TableHead className="text-end">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!client.projects || client.projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t("noProjects")}
                  </TableCell>
                </TableRow>
              ) : (
                client.projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
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
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                          aria-label={tProjects("openProject")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogs */}
      {editOpen && (
        <EditClientDialog client={client} onClose={() => setEditOpen(false)} />
      )}
      {newProjectOpen && (
        <NewProjectDialog clientId={id} onClose={() => setNewProjectOpen(false)} />
      )}
    </div>
  );
}
