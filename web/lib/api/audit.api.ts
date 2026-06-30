import { api } from "@/lib/api/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditActor {
  id: string;
  name: string;
  email: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actor: AuditActor | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditListParams {
  actorId?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export const auditApi = {
  list: (params: AuditListParams = {}) => {
    const query = new URLSearchParams();
    if (params.actorId) query.set("actorId", params.actorId);
    if (params.entity) query.set("entity", params.entity);
    if (params.action) query.set("action", params.action);
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.pageSize !== undefined)
      query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return api.get<AuditListResponse>(`/audit${qs ? `?${qs}` : ""}`);
  },
};
