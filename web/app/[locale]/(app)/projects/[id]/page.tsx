"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  FolderOpen,
  MapPin,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  BarChart3,
  ChevronDown,
  Hash,
  AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProject, useUpdateProject, useUpdateProjectStatus } from "@/lib/hooks/useProjects";
import { QuotationPanel } from "@/components/quotations/QuotationPanel";
import { PaymentPanel } from "@/components/payments/PaymentPanel";
import { DailyLogPanel } from "@/components/daily-logs/DailyLogPanel";
import { ReportsPanel } from "@/components/reports/ReportsPanel";
import { useProjectDashboard } from "@/lib/hooks/useProjectDashboard";
import { useClients } from "@/lib/hooks/useClients";
import type { Project } from "@/lib/api/projects.api";
import type { ProjectStatus } from "@/lib/api/clients.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

// ─── Status helpers ───────────────────────────────────────────────────────────
function statusVariant(status: ProjectStatus): BadgeVariant {
  switch (status) {
    case "ACTIVE": return "active";
    case "COMPLETED": return "success";
    case "CANCELLED": return "error";
    default: return "default";
  }
}

// Allowed transitions per status
type StatusAction = {
  label: string;
  targetStatus: ProjectStatus;
  confirmKey: string;
};

function allowedTransitions(
  status: ProjectStatus,
  t: (key: string) => string
): StatusAction[] {
  switch (status) {
    case "DRAFT":
      return [{ label: t("statusActions.cancel"), targetStatus: "CANCELLED", confirmKey: "statusActions.confirmCancel" }];
    case "ACTIVE":
      return [
        { label: t("statusActions.complete"), targetStatus: "COMPLETED", confirmKey: "statusActions.confirmComplete" },
        { label: t("statusActions.cancel"), targetStatus: "CANCELLED", confirmKey: "statusActions.confirmCancel" },
      ];
    case "COMPLETED":
      return [{ label: t("statusActions.reopen"), targetStatus: "ACTIVE", confirmKey: "statusActions.confirmReopen" }];
    case "CANCELLED":
      return [{ label: t("statusActions.moveToDraft"), targetStatus: "DRAFT", confirmKey: "statusActions.confirmMoveToDraft" }];
    default:
      return [];
  }
}

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

// ─── Edit Project Dialog ──────────────────────────────────────────────────────
const editSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  unitType: z.string().optional(),
  description: z.string().optional(),
  supervisionPercent: z.number().min(0).max(100).optional().or(z.nan()),
});
type EditFormData = z.infer<typeof editSchema>;

function EditProjectDialog({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const updateMutation = useUpdateProject();
  const { data: clientsData } = useClients({ pageSize: 200 });
  const allClients = clientsData?.data ?? [];
  const [editClientId, setEditClientId] = useState(project.clientId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: project.name,
      location: project.location ?? "",
      unitType: project.unitType ?? "",
      description: project.description ?? "",
      supervisionPercent: project.supervisionPercent != null
        ? Number(project.supervisionPercent)
        : undefined,
    },
  });

  const onSubmit = async (data: EditFormData) => {
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

  return (
    <Dialog open onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editProject")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("clientLabel")}
            </label>
            <Select value={editClientId} onValueChange={setEditClientId}>
              <SelectTrigger>
                <SelectValue placeholder={t("clientPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {allClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            id="dash-edit-name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <Input
            id="dash-edit-location"
            label={t("locationLabel")}
            placeholder={t("locationPlaceholder")}
            {...register("location")}
          />
          <Input
            id="dash-edit-unitType"
            label={t("unitTypeLabel")}
            placeholder={t("unitTypePlaceholder")}
            {...register("unitType")}
          />
          <Input
            id="dash-edit-supervisionPercent"
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
              {tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Placeholder Section ──────────────────────────────────────────────────────
function PlaceholderSection({ icon, label }: { icon: React.ReactNode; label: string }) {
  const t = useTranslations("projects.dashboard");
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-surface-elevated">
        {icon}
      </span>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/70">{t("placeholderPhase")}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectDashboardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations("projects");
  const tDash = useTranslations("projects.dashboard");
  const tDailyLogs = useTranslations("dailyLogs");
  const tProjectStatus = useTranslations("projectStatus");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<StatusAction | null>(null);

  const { data: project, isLoading } = useProject(id);
  const { data: financials } = useProjectDashboard(id);
  const statusMutation = useUpdateProjectStatus();

  const handleStatusChange = useCallback(async () => {
    if (!pendingAction || !project) return;
    try {
      await statusMutation.mutateAsync({ id: project.id, body: { status: pendingAction.targetStatus } });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("statusUpdateError"));
    } finally {
      setPendingAction(null);
    }
  }, [pendingAction, project, statusMutation, t]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{tCommon("noData")}</p>
      </div>
    );
  }

  const transitions = allowedTransitions(project.status, (key) => tDash(key as Parameters<typeof tDash>[0]));

  return (
    <div className="space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/projects`)}
          aria-label={tCommon("back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">{t("title")}</span>
      </div>

      {/* Header Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
                <Badge variant={statusVariant(project.status)} dot>
                  {tProjectStatus(project.status)}
                </Badge>
                {project.supervisionPercent != null && (
                  <Badge variant="info">
                    {Number(project.supervisionPercent)}% {t("supervisionPercent")}
                  </Badge>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {project.client && (
                  <Link
                    href={`/${locale}/clients/${project.client.id}`}
                    className="flex items-center gap-1 hover:text-primary hover:underline"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    {project.client.name}
                  </Link>
                )}
                {project.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.location}
                  </span>
                )}
                {project.unitType && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {project.unitType}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t("createdAt")}: {new Date(project.createdAt).toLocaleDateString()}
                </span>
                {project.activatedAt && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("activatedAt")}: {new Date(project.activatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {project.description && (
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              leadingIcon={<Pencil className="h-4 w-4" />}
              onClick={() => setEditOpen(true)}
            >
              {tDash("editProject")}
            </Button>

            {transitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1">
                    {t("statusLabel")}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transitions.map((action) => (
                    <DropdownMenuItem
                      key={action.targetStatus}
                      onClick={() => setPendingAction(action)}
                      className={action.targetStatus === "CANCELLED" ? "text-error" : ""}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {financials?.alerts && financials.alerts.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          {financials.alerts.map((alert, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <p className="text-sm font-medium text-warning">
                {locale === "ar"
                  ? alert.messageAr || tDailyLogs("alerts.lowBalance")
                  : alert.messageEn || tDailyLogs("alerts.lowBalance")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Financial KPIs */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {tDash("financialKpis")}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            title={tDash("quotationTotal")}
            value={
              financials?.quotation
                ? formatCurrency(Number(financials.quotation.grandTotal))
                : "—"
            }
            subtitle={!financials?.quotation ? tDash("pendingData") : undefined}
            accent="primary"
          />
          <KpiCard
            title={tDash("totalCollected")}
            value={
              financials
                ? formatCurrency(Number(financials.collected))
                : "—"
            }
            subtitle={!financials ? tDash("pendingData") : undefined}
            accent="success"
          />
          <KpiCard
            title={tDash("totalSpent")}
            value={
              financials
                ? formatCurrency(Number(financials.totalSpent))
                : "—"
            }
            subtitle={!financials ? tDash("pendingData") : undefined}
            accent="warning"
          />
          <KpiCard
            title={tDash("remainingOperational")}
            value={
              financials
                ? formatCurrency(Number(financials.remainingOperational))
                : "—"
            }
            subtitle={!financials ? tDash("pendingData") : undefined}
            accent="info"
          />
          <KpiCard
            title={tDash("supervisionEarned")}
            value={
              financials
                ? formatCurrency(Number(financials.supervisionEarned))
                : "—"
            }
            subtitle={!financials ? tDash("pendingData") : undefined}
            accent="default"
          />
        </div>
      </div>

      {/* Activity Counts */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {tDash("countsKpis")}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            title={tDash("quotationsCount")}
            value={project._count?.quotations ?? 0}
            icon={<FileText className="h-4 w-4" />}
            accent="primary"
          />
          <KpiCard
            title={tDash("paymentsCount")}
            value={project._count?.payments ?? 0}
            icon={<CreditCard className="h-4 w-4" />}
            accent="success"
          />
          <KpiCard
            title={tDash("dailyLogsCount")}
            value={project._count?.dailyLogs ?? 0}
            icon={<ClipboardList className="h-4 w-4" />}
            accent="info"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quotation">
        <TabsList>
          <TabsTrigger value="quotation">{tDash("sections.quotation")}</TabsTrigger>
          <TabsTrigger value="payments">{tDash("sections.payments")}</TabsTrigger>
          <TabsTrigger value="dailyLogs">{tDash("sections.dailyLogs")}</TabsTrigger>
          <TabsTrigger value="reports">{tDash("sections.reports")}</TabsTrigger>
        </TabsList>
        <TabsContent value="quotation" className="mt-4">
          <QuotationPanel projectId={id} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentPanel
            projectId={id}
            supervisionPercent={
              project.supervisionPercent != null
                ? Number(project.supervisionPercent)
                : 0
            }
            isActive={project.status === "ACTIVE"}
          />
        </TabsContent>
        <TabsContent value="dailyLogs" className="mt-4">
          <DailyLogPanel
            projectId={id}
            isActive={project.status === "ACTIVE"}
          />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsPanel projectId={id} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {editOpen && (
        <EditProjectDialog project={project} onClose={() => setEditOpen(false)} />
      )}
      {pendingAction && (
        <ConfirmDialog
          open
          onClose={() => setPendingAction(null)}
          onConfirm={() => void handleStatusChange()}
          title={pendingAction.label}
          description={tDash(pendingAction.confirmKey as Parameters<typeof tDash>[0])}
          isPending={statusMutation.isPending}
        />
      )}
    </div>
  );
}
