"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/hooks/useProjects";
import { useTerms, useConditions } from "@/lib/hooks/useSystemData";
import {
  useCreateQuotation,
  useUpdateQuotation,
  useQuotation,
} from "@/lib/hooks/useQuotations";
import { formatCurrency } from "@/lib/utils";

// ─── Zod schema ──────────────────────────────────────────────────────────────
const lineSchema = z
  .object({
    termId: z.string().min(1, "required"),
    pricingMode: z.enum(["UNIT", "LUMP_SUM"]),
    unit: z.string().optional(),
    quantity: z.coerce.number().optional(),
    unitPrice: z.coerce.number().optional(),
    lineTotal: z.coerce.number().optional(),
    descriptionAr: z.string().optional(),
    descriptionEn: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pricingMode === "UNIT") {
      if (!data.quantity || data.quantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Quantity required",
          path: ["quantity"],
        });
      }
      if (!data.unitPrice || data.unitPrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Unit price required",
          path: ["unitPrice"],
        });
      }
    } else {
      if (!data.lineTotal || data.lineTotal <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Line total required",
          path: ["lineTotal"],
        });
      }
    }
  });

const builderSchema = z.object({
  date: z.string().optional(),
  subject: z.string().optional(),
  notes: z.string().optional(),
  supervisionPercent: z.coerce.number().min(0).max(100).default(0),
  conditionIds: z.array(z.string()).default([]),
  lines: z.array(lineSchema).min(1, "At least one line is required"),
});

type BuilderFormData = z.infer<typeof builderSchema>;

// ─── Main component ───────────────────────────────────────────────────────────
export default function QuotationBuilder() {
  const params = useParams<{ id: string; quotationId?: string }>();
  const projectId = params.id;
  const quotationId = params.quotationId;
  const isEdit = !!quotationId;

  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("quotations");
  const tCommon = useTranslations("common");

  // Data
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: termsData } = useTerms({ isActive: "true", pageSize: 200 });
  const { data: conditionsData } = useConditions({ isActive: "true", pageSize: 200 });
  const { data: existingQuotation, isLoading: quotationLoading } = useQuotation(
    quotationId ?? ""
  );

  const terms = termsData?.data ?? [];
  const conditions = conditionsData?.data ?? [];

  const createMutation = useCreateQuotation();
  const updateMutation = useUpdateQuotation();

  // ─── Form setup ───────────────────────────────────────────────────────────
  const defaultSupervision = project?.supervisionPercent
    ? Number(project.supervisionPercent)
    : 0;

  const form = useForm<BuilderFormData>({
    // zod v4 coerce/default make input≠output; cast the resolver to the form's
    // (output) value type to satisfy RHF's generic.
    resolver: zodResolver(builderSchema) as unknown as Resolver<BuilderFormData>,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      subject: "",
      notes: "",
      supervisionPercent: defaultSupervision,
      conditionIds: [],
      lines: [
        {
          termId: "",
          pricingMode: "UNIT",
          unit: "",
          quantity: undefined,
          unitPrice: undefined,
          lineTotal: undefined,
          descriptionAr: "",
          descriptionEn: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  // Populate form when editing
  useEffect(() => {
    if (isEdit && existingQuotation) {
      form.reset({
        date: existingQuotation.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        subject: existingQuotation.subject ?? "",
        notes: existingQuotation.notes ?? "",
        supervisionPercent: Number(existingQuotation.supervisionPercent ?? 0),
        conditionIds: existingQuotation.conditions.map((c) => c.id),
        lines: existingQuotation.lines
          .sort((a, b) => a.order - b.order)
          .map((l) => ({
            termId: l.termId ?? l.term?.id ?? "",
            pricingMode: l.pricingMode,
            unit: l.unit ?? "",
            quantity: l.quantity ? Number(l.quantity) : undefined,
            unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
            lineTotal: Number(l.lineTotal),
            descriptionAr: l.descriptionAr ?? "",
            descriptionEn: l.descriptionEn ?? "",
          })),
      });
    }
  }, [isEdit, existingQuotation, form]);

  // Update supervision% default when project loads
  useEffect(() => {
    if (project?.supervisionPercent && !isEdit) {
      form.setValue("supervisionPercent", Number(project.supervisionPercent));
    }
  }, [project, form, isEdit]);

  // ─── Live totals ──────────────────────────────────────────────────────────
  const watchedLines = form.watch("lines");
  const watchedSupervision = form.watch("supervisionPercent");

  const { subtotal, supervisionAmount, grandTotal } = useMemo(() => {
    const sub = watchedLines.reduce((acc, line) => {
      if (line.pricingMode === "UNIT") {
        const qty = Number(line.quantity ?? 0);
        const price = Number(line.unitPrice ?? 0);
        return acc + qty * price;
      } else {
        return acc + Number(line.lineTotal ?? 0);
      }
    }, 0);
    const supPct = Number(watchedSupervision ?? 0);
    const supAmt = sub * (supPct / 100);
    return {
      subtotal: sub,
      supervisionAmount: supAmt,
      grandTotal: sub + supAmt,
    };
  }, [watchedLines, watchedSupervision]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (data: BuilderFormData) => {
    const lines = data.lines.map((l, idx) => {
      if (l.pricingMode === "UNIT") {
        return {
          termId: l.termId,
          pricingMode: l.pricingMode as "UNIT",
          unit: l.unit || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          descriptionAr: l.descriptionAr || undefined,
          descriptionEn: l.descriptionEn || undefined,
          order: idx + 1,
        };
      } else {
        return {
          termId: l.termId,
          pricingMode: l.pricingMode as "LUMP_SUM",
          lineTotal: l.lineTotal,
          descriptionAr: l.descriptionAr || undefined,
          descriptionEn: l.descriptionEn || undefined,
          order: idx + 1,
        };
      }
    });

    try {
      if (isEdit && quotationId) {
        await updateMutation.mutateAsync({
          id: quotationId,
          body: {
            date: data.date,
            subject: data.subject || undefined,
            notes: data.notes || undefined,
            supervisionPercent: data.supervisionPercent,
            lines,
            conditionIds: data.conditionIds,
          },
        });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync({
          projectId,
          date: data.date,
          subject: data.subject || undefined,
          notes: data.notes || undefined,
          supervisionPercent: data.supervisionPercent,
          lines,
          conditionIds: data.conditionIds,
        });
        toast.success(t("created"));
      }
      router.push(`/${locale}/projects/${projectId}`);
    } catch {
      toast.error(isEdit ? t("updateError") : t("createError"));
    }
  };

  const isSubmitting =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending;

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (projectLoading || (isEdit && quotationLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/projects/${projectId}`)}
          aria-label={tCommon("back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">{project.name}</p>
          <h1 className="text-lg font-bold text-foreground">
            {isEdit ? t("editQuotation") : t("newQuotation")}
          </h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Header fields */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            {isEdit ? t("editQuotation") : t("newQuotation")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="qb-date"
              type="date"
              label={t("dateLabel")}
              {...form.register("date")}
            />
            <Input
              id="qb-supervision"
              type="number"
              label={t("supervisionPercentLabel")}
              placeholder="0–100"
              error={form.formState.errors.supervisionPercent?.message}
              {...form.register("supervisionPercent")}
            />
          </div>
          <div className="mt-4">
            <Input
              id="qb-subject"
              type="text"
              label={t("subjectLabel")}
              placeholder={t("subjectPlaceholder")}
              {...form.register("subject")}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("notesLabel")}
            </label>
            <textarea
              placeholder={t("notesPlaceholder")}
              className="min-h-[80px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
              {...form.register("notes")}
            />
          </div>
        </div>

        {/* Lines editor */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {t("linesSection")}
            </h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              leadingIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() =>
                append({
                  termId: "",
                  pricingMode: "UNIT",
                  unit: "",
                  quantity: undefined,
                  unitPrice: undefined,
                  lineTotal: undefined,
                  descriptionAr: "",
                  descriptionEn: "",
                })
              }
            >
              {t("addLine")}
            </Button>
          </div>

          {form.formState.errors.lines?.root?.message && (
            <p className="mb-3 text-xs text-error">
              {t("lineError")}
            </p>
          )}
          {typeof form.formState.errors.lines?.message === "string" && (
            <p className="mb-3 text-xs text-error">{t("lineError")}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, idx) => {
              const pricingMode = form.watch(`lines.${idx}.pricingMode`);
              const lineErrors = form.formState.errors.lines?.[idx];
              const computedTotal =
                pricingMode === "UNIT"
                  ? (Number(form.watch(`lines.${idx}.quantity`) ?? 0) *
                      Number(form.watch(`lines.${idx}.unitPrice`) ?? 0))
                  : Number(form.watch(`lines.${idx}.lineTotal`) ?? 0);

              return (
                <div
                  key={field.id}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("linesSection")} #{idx + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="text-error hover:text-error"
                        leadingIcon={<Trash2 className="h-3 w-3" />}
                        onClick={() => remove(idx)}
                      >
                        {t("removeLine")}
                      </Button>
                    )}
                  </div>

                  {/* Row 1: Term + Pricing Mode */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Term selector */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t("termLabel")} <span className="text-error">*</span>
                      </label>
                      <Controller
                        control={form.control}
                        name={`lines.${idx}.termId`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger
                              state={lineErrors?.termId ? "error" : "default"}
                            >
                              <SelectValue placeholder={t("termPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              {terms.map((term) => (
                                <SelectItem key={term.id} value={term.id}>
                                  {term.nameAr}
                                  {term.nameEn ? ` — ${term.nameEn}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {lineErrors?.termId && (
                        <p className="text-xs text-error">{t("termRequired")}</p>
                      )}
                    </div>

                    {/* Pricing mode */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t("pricingModeLabel")}
                      </label>
                      <Controller
                        control={form.control}
                        name={`lines.${idx}.pricingMode`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNIT">
                                {t("pricingModeUnit")}
                              </SelectItem>
                              <SelectItem value="LUMP_SUM">
                                {t("pricingModeLumpSum")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  {/* Row 2: Mode-specific fields */}
                  {pricingMode === "UNIT" ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Input
                        id={`lines-${idx}-unit`}
                        label={t("unitLabel")}
                        placeholder={t("unitPlaceholder")}
                        {...form.register(`lines.${idx}.unit`)}
                      />
                      <Input
                        id={`lines-${idx}-quantity`}
                        type="number"
                        label={t("quantityLabel")}
                        error={lineErrors?.quantity?.message ? t("quantityRequired") : undefined}
                        {...form.register(`lines.${idx}.quantity`)}
                      />
                      <Input
                        id={`lines-${idx}-unitPrice`}
                        type="number"
                        label={t("unitPriceLabel")}
                        error={lineErrors?.unitPrice?.message ? t("unitPriceRequired") : undefined}
                        {...form.register(`lines.${idx}.unitPrice`)}
                      />
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Input
                        id={`lines-${idx}-lineTotal`}
                        type="number"
                        label={t("lineTotalLabel")}
                        error={lineErrors?.lineTotal?.message ? t("lineTotalRequired") : undefined}
                        {...form.register(`lines.${idx}.lineTotal`)}
                      />
                    </div>
                  )}

                  {/* Computed line total */}
                  <div className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <span>{t("lineTotalLabel")}:</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCurrency(computedTotal)}
                    </span>
                  </div>

                  {/* Descriptions (optional) */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {t("descriptionArLabel")}
                      </label>
                      <textarea
                        className="min-h-[56px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
                        {...form.register(`lines.${idx}.descriptionAr`)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {t("descriptionEnLabel")}
                      </label>
                      <textarea
                        className="min-h-[56px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
                        {...form.register(`lines.${idx}.descriptionEn`)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Terms & Conditions selector */}
        {conditions.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              {t("conditionsSection")}
            </h2>
            <div className="space-y-2">
              {conditions.map((cond) => {
                const conditionIds = form.watch("conditionIds");
                const isChecked = conditionIds.includes(cond.id);
                return (
                  <label
                    key={cond.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
                      checked={isChecked}
                      onChange={(e) => {
                        const current = form.getValues("conditionIds");
                        if (e.target.checked) {
                          form.setValue("conditionIds", [...current, cond.id]);
                        } else {
                          form.setValue(
                            "conditionIds",
                            current.filter((id) => id !== cond.id)
                          );
                        }
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {cond.titleAr ?? cond.titleEn ?? "—"}
                      </p>
                      {cond.bodyAr && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {cond.bodyAr}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Totals Panel */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            {t("liveTotals")}
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("subtotalLabel")}</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("supervisionPercentLabel")} ({form.watch("supervisionPercent") ?? 0}%)
              </span>
              <span className="font-medium tabular-nums">
                {formatCurrency(supervisionAmount)}
              </span>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                {t("grandTotalLabel")}
              </span>
              <span className="text-lg font-bold tabular-nums text-primary">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${locale}/projects/${projectId}`)}
            disabled={isSubmitting}
          >
            {tCommon("cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t("saveAsDraft")}
          </Button>
        </div>
      </form>
    </div>
  );
}
