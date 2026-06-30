import { api } from "@/lib/api/client";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export interface ProjectAlert {
  type: string;
  mode: string;
  threshold: number;
  value: number;
  severity: string;
  messageAr: string;
  messageEn: string;
}

export interface ProjectFinancials {
  project: {
    id: string;
    name: string;
    status: string;
    supervisionPercent: number | null;
  };
  quotation: { grandTotal: number } | null;
  collected: number;
  operationalCollected: number;
  supervisionEarned: number;
  totalSpent: number;
  remainingOperational: number;
  alerts: ProjectAlert[];
}

// ─── Global Dashboard Summary ─────────────────────────────────────────────────

export interface DashboardAlert {
  projectId: string;
  projectName: string;
  type: string;
  mode: string;
  threshold: number;
  value: number;
  severity: string;
  messageAr: string;
  messageEn: string;
}

export interface RecentPayment {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  paidAt: string;
}

export interface MonthlyPoint {
  month: string; // "YYYY-MM"
  collected: number;
  supervisionEarned: number;
  spent: number;
}

export interface DashboardSummary {
  counts: {
    clients: number;
    projects: number;
    activeProjects: number;
    draftProjects: number;
    completedProjects: number;
    cancelledProjects: number;
  };
  financial: {
    totalCollected: number;
    totalOperationalCollected: number;
    totalSupervisionEarned: number;
    totalSpent: number;
  };
  thisMonth: {
    collected: number;
    supervisionEarned: number;
    paymentsCount: number;
  };
  monthly: MonthlyPoint[];
  alerts: DashboardAlert[];
  recentPayments: RecentPayment[];
}

// ────────────────────────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getProjectFinancials: (projectId: string) =>
    api.get<ProjectFinancials>(`/dashboard/project/${projectId}`),

  getSummary: () =>
    api.get<DashboardSummary>(`/dashboard/summary`),
};
