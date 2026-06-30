import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  quotationsApi,
  type QuotationListParams,
  type CreateQuotationBody,
  type UpdateQuotationBody,
} from "@/lib/api/quotations.api";
import { PROJECT_KEYS } from "@/lib/hooks/useProjects";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const QUOTATION_KEYS = {
  list: (p?: QuotationListParams) => ["quotations", "list", p ?? {}] as const,
  listBase: ["quotations", "list"] as const,
  detail: (id: string) => ["quotations", "detail", id] as const,
  detailBase: ["quotations", "detail"] as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function useQuotations(params: QuotationListParams = {}) {
  return useQuery({
    queryKey: QUOTATION_KEYS.list(params),
    queryFn: () => quotationsApi.list(params),
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────────
export function useQuotation(id: string) {
  return useQuery({
    queryKey: QUOTATION_KEYS.detail(id),
    queryFn: () => quotationsApi.get(id),
    enabled: !!id,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────
export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateQuotationBody) => quotationsApi.create(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(vars.projectId) });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.listBase });
    },
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────
export function useUpdateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateQuotationBody }) =>
      quotationsApi.update(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.detail(id) });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────
export function useDeleteQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotationsApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.listBase });
    },
  });
}

// ─── Approve ─────────────────────────────────────────────────────────────────
export function useApproveQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      quotationsApi.approve(id),
    onSuccess: (_data, { id, projectId }) => {
      // Invalidate quotations
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.detail(id) });
      // Approve activates the project → invalidate project queries
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.summary });
    },
  });
}

// ─── Reject ──────────────────────────────────────────────────────────────────
export function useRejectQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId?: string }) =>
      quotationsApi.reject(id),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: QUOTATION_KEYS.detail(id) });
    },
  });
}
