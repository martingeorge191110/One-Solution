import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/system-data.api";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export interface ClientSummary {
  clientsCount: number;
}

export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { projects: number };
  projects?: ClientProject[];
}

export interface ClientProject {
  id: string;
  name: string;
  status: ProjectStatus;
  supervisionPercent: string | null;
  createdAt: string;
}

export type ProjectStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface ClientListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateClientBody {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export type UpdateClientBody = Partial<CreateClientBody>;

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

export const clientsApi = {
  summary: () => api.get<ClientSummary>("/clients/summary"),

  list: (p: ClientListParams = {}) =>
    api.get<PaginatedResponse<Client>>(`/clients${buildQs(p)}`),

  get: (id: string) => api.get<Client>(`/clients/${id}`),

  create: (body: CreateClientBody) => api.post<Client>("/clients", body),

  update: (id: string, body: UpdateClientBody) =>
    api.patch<Client>(`/clients/${id}`, body),

  delete: (id: string) => api.delete<void>(`/clients/${id}`),
};
