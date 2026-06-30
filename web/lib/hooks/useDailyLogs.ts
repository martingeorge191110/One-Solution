import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  dailyLogsApi,
  type DailyLogListParams,
  type CreateDailyLogBody,
  type UpdateDailyLogBody,
} from "@/lib/api/dailyLogs.api";
import { PROJECT_KEYS } from "@/lib/hooks/useProjects";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const DAILY_LOG_KEYS = {
  list: (p: DailyLogListParams) => ["daily-logs", "list", p] as const,
  listBase: ["daily-logs", "list"] as const,
  detail: (id: string) => ["daily-logs", "detail", id] as const,
  summary: (projectId: string) => ["daily-logs", "summary", projectId] as const,
};

// Dashboard financials base key — invalidated on every mutation
export const DASHBOARD_FINANCIALS_BASE = ["dashboard", "project"] as const;

// ─── Invalidation helper ─────────────────────────────────────────────────────
function invalidateDailyLogs(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string
) {
  void qc.invalidateQueries({ queryKey: DAILY_LOG_KEYS.listBase });
  void qc.invalidateQueries({ queryKey: DAILY_LOG_KEYS.summary(projectId) });
  void qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
  // Refresh dashboard KPIs / alerts
  void qc.invalidateQueries({ queryKey: DASHBOARD_FINANCIALS_BASE });
}

// ─── List ─────────────────────────────────────────────────────────────────────
export function useDailyLogs(params: DailyLogListParams) {
  return useQuery({
    queryKey: DAILY_LOG_KEYS.list(params),
    queryFn: () => dailyLogsApi.list(params),
    enabled: !!params.projectId,
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
export function useDailyLogSummary(projectId: string) {
  return useQuery({
    queryKey: DAILY_LOG_KEYS.summary(projectId),
    queryFn: () => dailyLogsApi.summary(projectId),
    enabled: !!projectId,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────
export function useCreateDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDailyLogBody) => dailyLogsApi.create(body),
    onSuccess: (_data, vars) => {
      invalidateDailyLogs(qc, vars.projectId);
    },
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────
export function useUpdateDailyLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDailyLogBody }) =>
      dailyLogsApi.update(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: DAILY_LOG_KEYS.detail(id) });
      invalidateDailyLogs(qc, projectId);
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────
export function useDeleteDailyLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dailyLogsApi.remove(id),
    onSuccess: () => {
      invalidateDailyLogs(qc, projectId);
    },
  });
}
