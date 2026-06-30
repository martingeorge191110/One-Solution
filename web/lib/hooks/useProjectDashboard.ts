import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard.api";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const DASHBOARD_KEYS = {
  projectFinancials: (projectId: string) =>
    ["dashboard", "project", projectId] as const,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useProjectDashboard(projectId: string) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.projectFinancials(projectId),
    queryFn: () => dashboardApi.getProjectFinancials(projectId),
    enabled: !!projectId,
  });
}
