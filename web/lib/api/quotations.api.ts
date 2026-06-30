import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/system-data.api";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export type QuotationStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type PricingMode = "UNIT" | "LUMP_SUM";

export interface QuotationLine {
  id: string;
  termId?: string | null;
  order: number;
  pricingMode: PricingMode;
  unit?: string | null;
  quantity?: string | null;
  unitPrice?: string | null;
  lineTotal: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  term: {
    id?: string;
    nameAr: string;
    nameEn?: string | null;
  };
}

export interface QuotationCondition {
  id: string;
  order: number;
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr: string;
  bodyEn?: string | null;
}

/** Returned by list endpoint */
export interface QuotationListRow {
  id: string;
  quotationNumber: string;
  date: string;
  status: QuotationStatus;
  supervisionPercent: string | null;
  subtotal: string;
  supervisionAmount: string;
  grandTotal: string;
  notes?: string | null;
  project: { id: string; name: string };
  _count: { lines: number };
}

/** Returned by GET /quotations/:id */
export interface QuotationFull {
  id: string;
  quotationNumber: string;
  date: string;
  status: QuotationStatus;
  supervisionPercent: string | null;
  subtotal: string;
  supervisionAmount: string;
  grandTotal: string;
  subject?: string | null;
  notes?: string | null;
  lines: QuotationLine[];
  conditions: QuotationCondition[];
  project: {
    id: string;
    name: string;
    location?: string | null;
    unitType?: string | null;
    status: string;
    supervisionPercent?: string | null;
    client: { id: string; name: string };
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Request body types
// ────────────────────────────────────────────────────────────────────────────────

export interface QuotationLineInput {
  termId: string;
  pricingMode: PricingMode;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  descriptionAr?: string;
  descriptionEn?: string;
  order?: number;
}

export interface CreateQuotationBody {
  projectId: string;
  date?: string;
  subject?: string;
  notes?: string;
  supervisionPercent?: number;
  lines: QuotationLineInput[];
  conditionIds?: string[];
}

export interface UpdateQuotationBody {
  date?: string;
  subject?: string;
  notes?: string;
  supervisionPercent?: number;
  lines?: QuotationLineInput[];
  conditionIds?: string[];
}

export interface QuotationListParams {
  projectId?: string;
  status?: QuotationStatus;
  page?: number;
  pageSize?: number;
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
// API wrappers
// ────────────────────────────────────────────────────────────────────────────────

export const quotationsApi = {
  list: (p: QuotationListParams = {}) =>
    api.get<PaginatedResponse<QuotationListRow>>(`/quotations${buildQs(p)}`),

  get: (id: string) => api.get<QuotationFull>(`/quotations/${id}`),

  create: (body: CreateQuotationBody) =>
    api.post<QuotationFull>("/quotations", body),

  update: (id: string, body: UpdateQuotationBody) =>
    api.patch<QuotationFull>(`/quotations/${id}`, body),

  delete: (id: string) => api.delete<void>(`/quotations/${id}`),

  approve: (id: string) => api.post<QuotationFull>(`/quotations/${id}/approve`),

  reject: (id: string) => api.post<QuotationFull>(`/quotations/${id}/reject`),
};
