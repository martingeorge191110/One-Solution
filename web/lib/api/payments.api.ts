import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/system-data.api";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  projectId: string;
  amount: string;
  paidAt: string;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  supervisionPercent: string;
  operationalAmount: string;
  supervisionAmount: string;
  createdAt: string;
}

export interface PaymentSummary {
  paymentsCount: number;
  totalCollected: number;
  totalOperationalCollected: number;
  totalSupervisionEarned: number;
  lastPaymentDate: string | null;
}

export interface PaymentListParams {
  projectId: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePaymentBody {
  projectId: string;
  amount: number;
  paidAt: string;
  method?: string;
  reference?: string;
  notes?: string;
}

export interface UpdatePaymentBody {
  amount?: number;
  paidAt?: string;
  method?: string;
  reference?: string;
  notes?: string;
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

export const paymentsApi = {
  list: (p: PaymentListParams) =>
    api.get<PaginatedResponse<Payment>>(`/payments${buildQs(p)}`),

  get: (id: string) => api.get<Payment>(`/payments/${id}`),

  create: (body: CreatePaymentBody) => api.post<Payment>("/payments", body),

  update: (id: string, body: UpdatePaymentBody) =>
    api.patch<Payment>(`/payments/${id}`, body),

  remove: (id: string) => api.delete<void>(`/payments/${id}`),

  summary: (projectId: string) =>
    api.get<PaymentSummary>(`/payments/summary${buildQs({ projectId })}`),
};
