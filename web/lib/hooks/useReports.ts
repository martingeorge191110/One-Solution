import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api/reports.api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const REPORT_KEYS = {
  dailyLogs: (projectId: string, from?: string, to?: string) =>
    ["reports", "daily-logs", projectId, from, to] as const,
  finalInvoice: (projectId: string) =>
    ["reports", "final-invoice", projectId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Lazy hook — set `enabled` to true when you want to fire the request.
 */
export function useDailyLogsReport(
  projectId: string,
  from?: string,
  to?: string,
  enabled = false
) {
  return useQuery({
    queryKey: REPORT_KEYS.dailyLogs(projectId, from, to),
    queryFn: () => reportsApi.getDailyLogsReport(projectId, from, to),
    enabled: !!projectId && enabled,
  });
}

export function useFinalInvoice(projectId: string, enabled = false) {
  return useQuery({
    queryKey: REPORT_KEYS.finalInvoice(projectId),
    queryFn: () => reportsApi.getFinalInvoice(projectId),
    enabled: !!projectId && enabled,
  });
}
