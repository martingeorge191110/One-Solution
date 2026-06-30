import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/system-data.api";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export interface DailyLog {
  id: string;
  projectId: string;
  logDate: string;
  isAdditional: boolean;
  termId?: string | null;
  itemId?: string | null;
  additionalNameAr?: string | null;
  additionalNameEn?: string | null;
  quantity?: string | null;
  unit?: string | null;
  unitPrice?: string | null;
  amount: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  term?: { nameAr: string; nameEn?: string | null } | null;
  item?: { nameAr: string; nameEn?: string | null } | null;
}

export interface DailyLogSummary {
  logsCount: number;
  totalSpent: number;
  termItemSpent: number;
  additionalsSpent: number;
  lastLogDate: string | null;
}

export interface DailyLogListParams {
  projectId: string;
  from?: string;
  to?: string;
  termId?: string;
  isAdditional?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateDailyLogBody {
  projectId: string;
  logDate: string;
  isAdditional: boolean;
  termId?: string;
  itemId?: string;
  additionalNameAr?: string;
  additionalNameEn?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  amount: number;
  notes?: string;
}

export type UpdateDailyLogBody = Partial<Omit<CreateDailyLogBody, "projectId">>;

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────

function buildQs(params: unknown): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ────────────────────────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────────────────────────

export const dailyLogsApi = {
  list: (p: DailyLogListParams) =>
    api.get<PaginatedResponse<DailyLog>>(`/daily-logs${buildQs(p)}`),

  get: (id: string) => api.get<DailyLog>(`/daily-logs/${id}`),

  create: (body: CreateDailyLogBody) => api.post<DailyLog>("/daily-logs", body),

  update: (id: string, body: UpdateDailyLogBody) =>
    api.patch<DailyLog>(`/daily-logs/${id}`, body),

  remove: (id: string) => api.delete<void>(`/daily-logs/${id}`),

  summary: (projectId: string) =>
    api.get<DailyLogSummary>(`/daily-logs/summary${buildQs({ projectId })}`),
};
