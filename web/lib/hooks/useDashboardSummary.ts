import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard.api";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const SUMMARY_KEYS = {
  summary: ["dashboard", "summary"] as const,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDashboardSummary() {
  return useQuery({
    queryKey: SUMMARY_KEYS.summary,
    queryFn: () => dashboardApi.getSummary(),
    staleTime: 60 * 1000, // 1 minute
  });
}
