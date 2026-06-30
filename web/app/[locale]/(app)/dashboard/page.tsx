"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  Users,
  FolderOpen,
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MonthlyPoint } from "@/lib/api/dashboard.api";

// ─── Brand colors ─────────────────────────────────────────────────────────────
const GOLD = "#B8924A";
const GOLD_LIGHT = "#D4AE73";
const INK = "#1A1A1A";
const SUCCESS = "#16a34a";
const WARNING = "#d97706";
const ERROR = "#dc2626";
const INFO = "#0891b2";

const STATUS_COLORS: Record<string, string> = {
  active: GOLD,
  draft: INFO,
  completed: SUCCESS,
  cancelled: ERROR,
};

// ─── Month label localization ──────────────────────────────────────────────────
function formatMonthLabel(month: string, locale: string): string {
  const [year, mon] = month.split("-");
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    year: "2-digit",
  });
}

// ─── Custom Tooltip for composed chart ────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  tCharts,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  tCharts: (k: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-surface-border dark:bg-surface-raised">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.name === "collected"
              ? tCharts("collected")
              : entry.name === "supervision"
              ? tCharts("supervision")
              : tCharts("spent")}
            :
          </span>
          <span className="font-semibold text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomeDashboardPage() {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();

  const { data, isLoading, isError, refetch } = useDashboardSummary();

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 text-error">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <p className="text-base font-medium text-foreground">{t("error")}</p>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          leadingIcon={<RefreshCw className="h-4 w-4" />}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  const { counts, financial, thisMonth, monthly, alerts, recentPayments } = data;

  // ─── Prepare chart data ──────────────────────────────────────────────────
  const chartData: Array<{ label: string; collected: number; supervision: number; spent: number }> =
    (monthly ?? []).map((m: MonthlyPoint) => ({
      label: formatMonthLabel(m.month, locale),
      collected: m.collected,
      supervision: m.supervisionEarned,
      spent: m.spent,
    }));

  const pieData = [
    { key: "active", value: counts.activeProjects },
    { key: "draft", value: counts.draftProjects },
    { key: "completed", value: counts.completedProjects },
    { key: "cancelled", value: counts.cancelledProjects },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* ─── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title={t("kpi.clients")}
          value={counts.clients}
          icon={<Users className="h-4 w-4" />}
          accent="primary"
        />
        <KpiCard
          title={t("kpi.activeProjects")}
          value={counts.activeProjects}
          icon={<FolderOpen className="h-4 w-4" />}
          accent="success"
        />
        <KpiCard
          title={t("kpi.totalCollected")}
          value={formatCurrency(financial.totalCollected)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="primary"
        />
        <KpiCard
          title={t("kpi.supervisionEarned")}
          value={formatCurrency(financial.totalSupervisionEarned)}
          icon={<Award className="h-4 w-4" />}
          accent="warning"
        />
        <KpiCard
          title={t("kpi.collectedThisMonth")}
          value={formatCurrency(thisMonth.collected)}
          icon={<Calendar className="h-4 w-4" />}
          accent="info"
        />
        <KpiCard
          title={t("kpi.supervisionThisMonth")}
          value={formatCurrency(thisMonth.supervisionEarned)}
          icon={<Sparkles className="h-4 w-4" />}
          accent="default"
        />
      </div>

      {/* ─── Alerts Section ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {t("alerts.title")}
        </h2>

        {alerts && alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <Link
                key={idx}
                href={`/${locale}/projects/${alert.projectId}`}
                className="group flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 transition-colors hover:bg-warning/10"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {alert.projectName}
                  </p>
                  <p className="mt-0.5 text-xs text-warning">
                    {locale === "ar" ? alert.messageAr : alert.messageEn}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-success/30 bg-success/5 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("alerts.empty")}</p>
              <p className="text-xs text-muted-foreground">{t("alerts.emptySubtitle")}</p>
            </div>
          </div>
        )}
      </section>

      {/* ─── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Composed bar+line chart */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-card dark:border-surface-border dark:bg-surface-raised lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t("charts.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("charts.subtitle")}</p>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  width={48}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      tCharts={(k) => t(`charts.${k}` as Parameters<typeof t>[0])}
                    />
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => {
                    if (value === "collected") return t("charts.collected");
                    if (value === "supervision") return t("charts.supervision");
                    return t("charts.spent");
                  }}
                />
                <Bar
                  dataKey="collected"
                  name="collected"
                  fill={GOLD}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="spent"
                  name="spent"
                  fill={WARNING}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="supervision"
                  name="supervision"
                  stroke={SUCCESS}
                  strokeWidth={2}
                  dot={{ r: 3, fill: SUCCESS }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-56 items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("charts.noData")}</p>
            </div>
          )}
        </div>

        {/* Donut — projects by status */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-card dark:border-surface-border dark:bg-surface-raised">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t("charts.projectsByStatus")}</h3>
            <p className="text-xs text-muted-foreground">
              {counts.projects} {locale === "ar" ? "مشروع" : "projects"}
            </p>
          </div>

          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_COLORS[entry.key] ?? INK}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      String(value),
                      t(`status.${String(name)}` as Parameters<typeof t>[0]),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="mt-2 space-y-1.5">
                {pieData.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: STATUS_COLORS[entry.key] ?? INK }}
                      />
                      <span className="text-muted-foreground">
                        {t(`status.${entry.key}` as Parameters<typeof t>[0])}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-56 items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("charts.noData")}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Recent Payments ─────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            {t("recentPayments.title")}
          </h2>
          <Link
            href={`/${locale}/projects`}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("recentPayments.viewAll")}
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card dark:border-surface-border dark:bg-surface-raised">
          {recentPayments && recentPayments.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-surface-border">
              {recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/${locale}/projects/${payment.projectId}`}
                  className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-surface-elevated"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {payment.projectName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.paidAt, { dateStyle: "medium" })}
                      </p>
                    </div>
                  </div>
                  <span className="ms-4 shrink-0 text-sm font-semibold text-primary">
                    {formatCurrency(payment.amount)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-surface-elevated">
                <CreditCard className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">{t("recentPayments.empty")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
