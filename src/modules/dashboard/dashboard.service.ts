import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertMode, AlertType, ProjectStatus, QuotationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Returns 'YYYY-MM' for a given Date */
function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Returns the UTC start-of-month Date for the given year + 1-based month */
function monthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Returns the UTC start-of-next-month Date (exclusive upper bound) */
function monthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1)); // month is already 1-based, so month+0 wraps correctly
}

// ---------------------------------------------------------------------------
// Alert-evaluation types
// ---------------------------------------------------------------------------

export interface AlertEntry {
  type: string;
  mode: string;
  threshold: number;
  value: number;
  severity: string;
  messageAr: string;
  messageEn: string;
}

export interface AlertEntryWithProject extends AlertEntry {
  projectId: string;
  projectName: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Private: shared alert-evaluation logic (REMAINING_OPERATIONAL_LOW)
  // -------------------------------------------------------------------------

  /**
   * Evaluates the REMAINING_OPERATIONAL_LOW alert for a single project.
   * Prefers a project-specific AlertThreshold; falls back to the global default.
   * Returns the alert entry if it fires, otherwise null.
   *
   * @param projectId     - project UUID
   * @param projectName   - project display name
   * @param operationalCollected - Σ payments.operationalAmount for this project
   * @param totalSpent    - Σ dailyLogs.amount for this project
   * @param thresholdMap  - optional pre-loaded map of projectId → threshold (for bulk use)
   * @param globalThreshold - optional pre-loaded global threshold (for bulk use)
   */
  private async evaluateProjectAlerts(
    projectId: string,
    projectName: string,
    operationalCollected: number,
    totalSpent: number,
    thresholdMap?: Map<string, { mode: AlertMode; type: AlertType; value: number }>,
    globalThreshold?: { mode: AlertMode; type: AlertType; value: number } | null,
  ): Promise<AlertEntry | null> {
    const remainingOperational = round2(operationalCollected - totalSpent);

    let thresholdMode: AlertMode | undefined;
    let thresholdType: AlertType | undefined;
    let thresholdValue: number | undefined;

    if (thresholdMap && thresholdMap.has(projectId)) {
      const t = thresholdMap.get(projectId)!;
      thresholdMode = t.mode;
      thresholdType = t.type;
      thresholdValue = t.value;
    } else if (thresholdMap && globalThreshold !== undefined) {
      // global passed in from bulk path
      if (globalThreshold) {
        thresholdMode = globalThreshold.mode;
        thresholdType = globalThreshold.type;
        thresholdValue = globalThreshold.value;
      }
    } else {
      // single-project path: query DB
      let threshold = await this.prisma.alertThreshold.findFirst({
        where: {
          type: AlertType.REMAINING_OPERATIONAL_LOW,
          projectId,
          isActive: true,
        },
      });

      if (!threshold) {
        threshold = await this.prisma.alertThreshold.findFirst({
          where: {
            type: AlertType.REMAINING_OPERATIONAL_LOW,
            projectId: null,
            isActive: true,
          },
        });
      }

      if (threshold) {
        thresholdMode = threshold.mode;
        thresholdType = threshold.type;
        thresholdValue = Number(threshold.value);
      }
    }

    if (thresholdMode === undefined || thresholdValue === undefined || thresholdType === undefined) {
      return null;
    }

    let fires = false;
    if (thresholdMode === AlertMode.AMOUNT) {
      fires = remainingOperational <= thresholdValue;
    } else if (thresholdMode === AlertMode.PERCENT) {
      if (operationalCollected > 0) {
        fires = remainingOperational <= (thresholdValue / 100) * operationalCollected;
      }
    }

    if (!fires) return null;

    return {
      type: thresholdType,
      mode: thresholdMode,
      threshold: thresholdValue,
      value: remainingOperational,
      severity: 'warning',
      messageAr: `الرصيد التشغيلي المتبقي لمشروع ${projectName} منخفض (${remainingOperational} ج). يرجى تحصيل دفعة جديدة من العميل.`,
      messageEn: `Operational funds for ${projectName} are low (${remainingOperational}). Collect another payment from the client.`,
    };
  }

  // -------------------------------------------------------------------------
  // GET /dashboard/project/:projectId
  // -------------------------------------------------------------------------

  async getProjectFinancials(projectId: string) {
    // 1. Load project (404 if missing/deleted)
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        supervisionPercent: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // 2. Load the latest APPROVED quotation for this project
    const approvedQuotation = await this.prisma.quotation.findFirst({
      where: {
        projectId,
        status: QuotationStatus.APPROVED,
        deletedAt: null,
      },
      orderBy: { approvedAt: 'desc' },
      select: { grandTotal: true },
    });

    // 3. Aggregate payments (non-deleted)
    const payments = await this.prisma.payment.findMany({
      where: { projectId, deletedAt: null },
      select: {
        amount: true,
        operationalAmount: true,
        supervisionAmount: true,
      },
    });

    const collected = round2(
      payments.reduce((acc, p) => acc + Number(p.amount), 0),
    );
    const operationalCollected = round2(
      payments.reduce((acc, p) => acc + Number(p.operationalAmount), 0),
    );
    const supervisionEarned = round2(
      payments.reduce((acc, p) => acc + Number(p.supervisionAmount), 0),
    );

    // 4. Aggregate daily logs (non-deleted, including additionals)
    const logsAggregate = await this.prisma.dailyLog.aggregate({
      where: { projectId, deletedAt: null },
      _sum: { amount: true },
    });

    const totalSpent = round2(Number(logsAggregate._sum.amount ?? 0));

    // 5. Compute remaining operational
    const remainingOperational = round2(operationalCollected - totalSpent);

    // 6. Alert evaluation — REMAINING_OPERATIONAL_LOW (shared helper)
    const alertEntry = await this.evaluateProjectAlerts(
      project.id,
      project.name,
      operationalCollected,
      totalSpent,
    );

    const alerts: AlertEntry[] = alertEntry ? [alertEntry] : [];

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        supervisionPercent: Number(project.supervisionPercent),
      },
      quotation: approvedQuotation
        ? { grandTotal: Number(approvedQuotation.grandTotal) }
        : null,
      collected,
      operationalCollected,
      supervisionEarned,
      totalSpent,
      remainingOperational,
      alerts,
    };
  }

  // -------------------------------------------------------------------------
  // GET /dashboard/summary
  // -------------------------------------------------------------------------

  async getGlobalSummary() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based

    // ------------------------------------------------------------------
    // 1. Counts
    // ------------------------------------------------------------------
    const [totalClients, projectCounts] = await Promise.all([
      this.prisma.client.count({ where: { deletedAt: null } }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
    ]);

    let projects = 0;
    let activeProjects = 0;
    let draftProjects = 0;
    let completedProjects = 0;
    let cancelledProjects = 0;

    for (const row of projectCounts) {
      projects += row._count.id;
      if (row.status === ProjectStatus.ACTIVE) activeProjects = row._count.id;
      else if (row.status === ProjectStatus.DRAFT) draftProjects = row._count.id;
      else if (row.status === ProjectStatus.COMPLETED) completedProjects = row._count.id;
      else if (row.status === ProjectStatus.CANCELLED) cancelledProjects = row._count.id;
    }

    // ------------------------------------------------------------------
    // 2. Financial totals (all time)
    // ------------------------------------------------------------------
    const [paymentsAll, logsAll] = await Promise.all([
      this.prisma.payment.findMany({
        where: { deletedAt: null },
        select: {
          amount: true,
          operationalAmount: true,
          supervisionAmount: true,
          paidAt: true,
        },
      }),
      this.prisma.dailyLog.findMany({
        where: { deletedAt: null },
        select: { amount: true, logDate: true, projectId: true },
      }),
    ]);

    const totalCollected = round2(
      paymentsAll.reduce((acc, p) => acc + Number(p.amount), 0),
    );
    const totalOperationalCollected = round2(
      paymentsAll.reduce((acc, p) => acc + Number(p.operationalAmount), 0),
    );
    const totalSupervisionEarned = round2(
      paymentsAll.reduce((acc, p) => acc + Number(p.supervisionAmount), 0),
    );
    const totalSpentAll = round2(
      logsAll.reduce((acc, l) => acc + Number(l.amount), 0),
    );

    // ------------------------------------------------------------------
    // 3. This month
    // ------------------------------------------------------------------
    const thisMonthStart = monthStart(currentYear, currentMonth);
    const thisMonthEnd = monthEnd(currentYear, currentMonth);

    const thisMonthPayments = paymentsAll.filter(
      (p) => p.paidAt >= thisMonthStart && p.paidAt < thisMonthEnd,
    );

    const thisMonthCollected = round2(
      thisMonthPayments.reduce((acc, p) => acc + Number(p.amount), 0),
    );
    const thisMonthSupervisionEarned = round2(
      thisMonthPayments.reduce((acc, p) => acc + Number(p.supervisionAmount), 0),
    );
    const thisMonthPaymentsCount = thisMonthPayments.length;

    // ------------------------------------------------------------------
    // 4. Monthly series — last 6 calendar months (oldest → newest)
    // ------------------------------------------------------------------

    // Build the 6-month window
    const months: Array<{ year: number; month: number; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      // Subtract i months from current
      let y = currentYear;
      let m = currentMonth - i;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      months.push({
        year: y,
        month: m,
        label: `${y}-${String(m).padStart(2, '0')}`,
      });
    }

    // Index payments and logs by their YYYY-MM label
    const paymentsByMonth = new Map<string, { collected: number; supervisionEarned: number }>();
    for (const p of paymentsAll) {
      const label = toYearMonth(p.paidAt);
      const existing = paymentsByMonth.get(label) ?? { collected: 0, supervisionEarned: 0 };
      existing.collected += Number(p.amount);
      existing.supervisionEarned += Number(p.supervisionAmount);
      paymentsByMonth.set(label, existing);
    }

    const logsByMonth = new Map<string, number>();
    for (const l of logsAll) {
      const label = toYearMonth(l.logDate);
      logsByMonth.set(label, (logsByMonth.get(label) ?? 0) + Number(l.amount));
    }

    const monthly = months.map(({ label }) => {
      const pData = paymentsByMonth.get(label);
      return {
        month: label,
        collected: round2(pData?.collected ?? 0),
        supervisionEarned: round2(pData?.supervisionEarned ?? 0),
        spent: round2(logsByMonth.get(label) ?? 0),
      };
    });

    // ------------------------------------------------------------------
    // 5. Alerts across all ACTIVE projects
    // ------------------------------------------------------------------

    // Load all ACTIVE projects
    const activeProjectList = await this.prisma.project.findMany({
      where: { deletedAt: null, status: ProjectStatus.ACTIVE },
      select: { id: true, name: true },
    });

    // Load all alert thresholds (project-specific + global) in one query
    const allThresholds = await this.prisma.alertThreshold.findMany({
      where: {
        type: AlertType.REMAINING_OPERATIONAL_LOW,
        isActive: true,
      },
      select: { projectId: true, mode: true, type: true, value: true },
    });

    const projectThresholdMap = new Map<
      string,
      { mode: AlertMode; type: AlertType; value: number }
    >();
    let globalThresholdEntry: { mode: AlertMode; type: AlertType; value: number } | null = null;

    for (const t of allThresholds) {
      if (t.projectId === null) {
        globalThresholdEntry = { mode: t.mode, type: t.type, value: Number(t.value) };
      } else {
        projectThresholdMap.set(t.projectId, {
          mode: t.mode,
          type: t.type,
          value: Number(t.value),
        });
      }
    }

    // Build per-project operational sums from already-loaded payments and logs
    const projectOpCollected = new Map<string, number>();
    const projectSpent = new Map<string, number>();

    // Only consider active project IDs for alert computation
    const activeProjectIds = new Set(activeProjectList.map((p) => p.id));

    // We need all payments (non-deleted) per project — re-use paymentsAll but need projectId
    // paymentsAll doesn't have projectId — fetch payments with projectId for active projects only
    const activePayments = await this.prisma.payment.findMany({
      where: { deletedAt: null, projectId: { in: [...activeProjectIds] } },
      select: { projectId: true, operationalAmount: true },
    });

    for (const p of activePayments) {
      projectOpCollected.set(
        p.projectId,
        (projectOpCollected.get(p.projectId) ?? 0) + Number(p.operationalAmount),
      );
    }

    for (const l of logsAll) {
      if (activeProjectIds.has(l.projectId)) {
        projectSpent.set(
          l.projectId,
          (projectSpent.get(l.projectId) ?? 0) + Number(l.amount),
        );
      }
    }

    const alerts: AlertEntryWithProject[] = [];

    for (const proj of activeProjectList) {
      const opCollected = round2(projectOpCollected.get(proj.id) ?? 0);
      const spent = round2(projectSpent.get(proj.id) ?? 0);

      const entry = await this.evaluateProjectAlerts(
        proj.id,
        proj.name,
        opCollected,
        spent,
        projectThresholdMap,
        globalThresholdEntry,
      );

      if (entry) {
        alerts.push({ projectId: proj.id, projectName: proj.name, ...entry });
      }
    }

    // ------------------------------------------------------------------
    // 6. Recent payments (latest 5, newest first)
    // ------------------------------------------------------------------
    const recentPaymentsRaw = await this.prisma.payment.findMany({
      where: { deletedAt: null },
      orderBy: { paidAt: 'desc' },
      take: 5,
      select: {
        id: true,
        projectId: true,
        project: { select: { name: true } },
        amount: true,
        paidAt: true,
      },
    });

    const recentPayments = recentPaymentsRaw.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      projectName: p.project.name,
      amount: round2(Number(p.amount)),
      paidAt: p.paidAt,
    }));

    // ------------------------------------------------------------------
    // Return
    // ------------------------------------------------------------------
    return {
      counts: {
        clients: totalClients,
        projects,
        activeProjects,
        draftProjects,
        completedProjects,
        cancelledProjects,
      },
      financial: {
        totalCollected,
        totalOperationalCollected,
        totalSupervisionEarned,
        totalSpent: totalSpentAll,
      },
      thisMonth: {
        collected: thisMonthCollected,
        supervisionEarned: thisMonthSupervisionEarned,
        paymentsCount: thisMonthPaymentsCount,
      },
      monthly,
      alerts,
      recentPayments,
    };
  }
}
