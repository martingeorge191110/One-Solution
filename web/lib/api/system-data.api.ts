import { api } from "@/lib/api/client";

// ────────────────────────────────────────────────────────────────────────────────
// Shared
// ────────────────────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ────────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────────
export interface SystemDataSummary {
  termsCount: number;
  itemsCount: number;
  conditionsCount: number;
  thresholdsCount: number;
  activeTermsCount: number;
  activeItemsCount: number;
}

// ────────────────────────────────────────────────────────────────────────────────
// Terms
// ────────────────────────────────────────────────────────────────────────────────
export interface Term {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  order?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
  items?: Item[];
}

export interface TermListParams {
  search?: string;
  isActive?: string;
  includeItems?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateTermBody {
  nameAr: string;
  nameEn?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export type UpdateTermBody = Partial<CreateTermBody>;

// ────────────────────────────────────────────────────────────────────────────────
// Items
// ────────────────────────────────────────────────────────────────────────────────
export interface Item {
  id: string;
  termId: string;
  nameAr: string;
  nameEn?: string | null;
  defaultUnit?: string | null;
  order?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  term?: { id: string; nameAr: string; nameEn?: string | null };
}

export interface ItemListParams {
  termId?: string;
  search?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateItemBody {
  termId: string;
  nameAr: string;
  nameEn?: string;
  defaultUnit?: string;
  order?: number;
  isActive?: boolean;
}

export type UpdateItemBody = Partial<CreateItemBody>;

// ────────────────────────────────────────────────────────────────────────────────
// Terms & Conditions
// ────────────────────────────────────────────────────────────────────────────────
export interface Condition {
  id: string;
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr: string;
  bodyEn?: string | null;
  order?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConditionListParams {
  search?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateConditionBody {
  titleAr?: string;
  titleEn?: string;
  bodyAr: string;
  bodyEn?: string;
  order?: number;
  isActive?: boolean;
}

export type UpdateConditionBody = Partial<CreateConditionBody>;

// ────────────────────────────────────────────────────────────────────────────────
// Alert Thresholds
// ────────────────────────────────────────────────────────────────────────────────
export interface AlertThreshold {
  id: string;
  type?: string | null;
  mode: "AMOUNT" | "PERCENT";
  value: number;
  basis?: string | null;
  isActive: boolean;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertThresholdListParams {
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateAlertThresholdBody {
  type?: string;
  mode: "AMOUNT" | "PERCENT";
  value: number;
  basis?: string;
  isActive?: boolean;
  projectId?: string;
}

export type UpdateAlertThresholdBody = Partial<CreateAlertThresholdBody>;

// ────────────────────────────────────────────────────────────────────────────────
// API wrappers
// ────────────────────────────────────────────────────────────────────────────────
function buildQs(params: unknown): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const systemDataApi = {
  // Summary
  summary: () => api.get<SystemDataSummary>("/system-data/summary"),

  // Terms
  terms: {
    list: (p: TermListParams = {}) =>
      api.get<PaginatedResponse<Term>>(
        `/system-data/terms${buildQs({ ...p, includeItems: p.includeItems ? "true" : undefined })}`
      ),
    get: (id: string) => api.get<Term>(`/system-data/terms/${id}`),
    create: (body: CreateTermBody) => api.post<Term>("/system-data/terms", body),
    update: (id: string, body: UpdateTermBody) =>
      api.patch<Term>(`/system-data/terms/${id}`, body),
    delete: (id: string) => api.delete<void>(`/system-data/terms/${id}`),
  },

  // Items
  items: {
    list: (p: ItemListParams = {}) =>
      api.get<PaginatedResponse<Item>>(`/system-data/items${buildQs(p)}`),
    get: (id: string) => api.get<Item>(`/system-data/items/${id}`),
    create: (body: CreateItemBody) => api.post<Item>("/system-data/items", body),
    update: (id: string, body: UpdateItemBody) =>
      api.patch<Item>(`/system-data/items/${id}`, body),
    delete: (id: string) => api.delete<void>(`/system-data/items/${id}`),
  },

  // Conditions
  conditions: {
    list: (p: ConditionListParams = {}) =>
      api.get<PaginatedResponse<Condition>>(`/system-data/terms-conditions${buildQs(p)}`),
    get: (id: string) => api.get<Condition>(`/system-data/terms-conditions/${id}`),
    create: (body: CreateConditionBody) =>
      api.post<Condition>("/system-data/terms-conditions", body),
    update: (id: string, body: UpdateConditionBody) =>
      api.patch<Condition>(`/system-data/terms-conditions/${id}`, body),
    delete: (id: string) => api.delete<void>(`/system-data/terms-conditions/${id}`),
  },

  // Alert Thresholds
  alertThresholds: {
    list: (p: AlertThresholdListParams = {}) =>
      api.get<PaginatedResponse<AlertThreshold>>(`/system-data/alert-thresholds${buildQs(p)}`),
    get: (id: string) => api.get<AlertThreshold>(`/system-data/alert-thresholds/${id}`),
    create: (body: CreateAlertThresholdBody) =>
      api.post<AlertThreshold>("/system-data/alert-thresholds", body),
    update: (id: string, body: UpdateAlertThresholdBody) =>
      api.patch<AlertThreshold>(`/system-data/alert-thresholds/${id}`, body),
    delete: (id: string) => api.delete<void>(`/system-data/alert-thresholds/${id}`),
  },
};
