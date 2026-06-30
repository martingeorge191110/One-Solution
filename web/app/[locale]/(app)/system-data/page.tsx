"use client";

import { useTranslations } from "next-intl";
import {
  Database,
  List,
  Package,
  FileText,
  Bell,
  CheckCircle,
  CheckSquare,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/ui/kpi-card";
import { useSystemDataSummary } from "@/lib/hooks/useSystemData";
import { TermsTab } from "@/components/system-data/terms-tab";
import { ItemsTab } from "@/components/system-data/items-tab";
import { ConditionsTab } from "@/components/system-data/conditions-tab";
import { AlertsTab } from "@/components/system-data/alerts-tab";

export default function SystemDataPage() {
  const t = useTranslations("systemData");
  const { data: summary, isLoading: summaryLoading } = useSystemDataSummary();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title={t("kpi.terms")}
          value={summary?.termsCount ?? 0}
          icon={<List className="h-4 w-4" />}
          loading={summaryLoading}
          accent="primary"
        />
        <KpiCard
          title={t("kpi.activeTerms")}
          value={summary?.activeTermsCount ?? 0}
          icon={<CheckCircle className="h-4 w-4" />}
          loading={summaryLoading}
          accent="success"
        />
        <KpiCard
          title={t("kpi.items")}
          value={summary?.itemsCount ?? 0}
          icon={<Package className="h-4 w-4" />}
          loading={summaryLoading}
          accent="info"
        />
        <KpiCard
          title={t("kpi.activeItems")}
          value={summary?.activeItemsCount ?? 0}
          icon={<CheckSquare className="h-4 w-4" />}
          loading={summaryLoading}
          accent="success"
        />
        <KpiCard
          title={t("kpi.conditions")}
          value={summary?.conditionsCount ?? 0}
          icon={<FileText className="h-4 w-4" />}
          loading={summaryLoading}
          accent="warning"
        />
        <KpiCard
          title={t("kpi.thresholds")}
          value={summary?.thresholdsCount ?? 0}
          icon={<Bell className="h-4 w-4" />}
          loading={summaryLoading}
          accent="error"
        />
      </div>

      {/* Tabbed Workspace */}
      <Tabs defaultValue="terms">
        <TabsList>
          <TabsTrigger value="terms">{t("tabs.terms")}</TabsTrigger>
          <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
          <TabsTrigger value="conditions">{t("tabs.conditions")}</TabsTrigger>
          <TabsTrigger value="alerts">{t("tabs.alerts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <TermsTab />
        </TabsContent>
        <TabsContent value="items">
          <ItemsTab />
        </TabsContent>
        <TabsContent value="conditions">
          <ConditionsTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
