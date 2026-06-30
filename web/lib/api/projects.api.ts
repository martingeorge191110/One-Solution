import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/system-data.api";
import type { ProjectStatus } from "@/lib/api/clients.api";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  projectsCount: number;
  byStatus: {
    DRAFT: number;
    ACTIVE: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  activeCount: number;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  location?: string | null;
  unitType?: string | null;
  description?: string | null;
  supervisionPercent: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string | null;
  client?: { id: string; name: string };
  _count?: {
    quotations: number;
    payments: number;
    dailyLogs: number;
  };
}

export interface ProjectListParams {
  search?: string;
  clientId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateProjectBody {
  clientId: string;
  name: string;
  location?: string;
  unitType?: string;
  description?: string;
  supervisionPercent?: number;
}

export interface UpdateProjectBody {
  name?: string;
  location?: string;
  unitType?: string;
  description?: string;
  supervisionPercent?: number;
  clientId?: string;
}

export interface UpdateProjectStatusBody {
  status: ProjectStatus;
}

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

export const projectsApi = {
  summary: () => api.get<ProjectSummary>("/projects/summary"),

  list: (p: ProjectListParams = {}) =>
    api.get<PaginatedResponse<Project>>(`/projects${buildQs(p)}`),

  get: (id: string) => api.get<Project>(`/projects/${id}`),

  create: (body: CreateProjectBody) => api.post<Project>("/projects", body),

  update: (id: string, body: UpdateProjectBody) =>
    api.patch<Project>(`/projects/${id}`, body),

  updateStatus: (id: string, body: UpdateProjectStatusBody) =>
    api.patch<Project>(`/projects/${id}/status`, body),

  delete: (id: string) => api.delete<void>(`/projects/${id}`),
};
