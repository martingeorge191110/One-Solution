import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  paymentsApi,
  type PaymentListParams,
  type CreatePaymentBody,
  type UpdatePaymentBody,
} from "@/lib/api/payments.api";
import { PROJECT_KEYS } from "@/lib/hooks/useProjects";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const PAYMENT_KEYS = {
  list: (p: PaymentListParams) => ["payments", "list", p] as const,
  listBase: ["payments", "list"] as const,
  detail: (id: string) => ["payments", "detail", id] as const,
  summary: (projectId: string) => ["payments", "summary", projectId] as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: PAYMENT_KEYS.list(params),
    queryFn: () => paymentsApi.list(params),
    enabled: !!params.projectId,
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
export function usePaymentSummary(projectId: string) {
  return useQuery({
    queryKey: PAYMENT_KEYS.summary(projectId),
    queryFn: () => paymentsApi.summary(projectId),
    enabled: !!projectId,
  });
}

// ─── Invalidation helper ─────────────────────────────────────────────────────
function invalidatePayments(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string
) {
  void qc.invalidateQueries({ queryKey: PAYMENT_KEYS.listBase });
  void qc.invalidateQueries({ queryKey: PAYMENT_KEYS.summary(projectId) });
  void qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
}

// ─── Create ──────────────────────────────────────────────────────────────────
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePaymentBody) => paymentsApi.create(body),
    onSuccess: (_data, vars) => {
      invalidatePayments(qc, vars.projectId);
    },
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────
export function useUpdatePayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePaymentBody }) =>
      paymentsApi.update(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: PAYMENT_KEYS.detail(id) });
      invalidatePayments(qc, projectId);
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────
export function useDeletePayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.remove(id),
    onSuccess: () => {
      invalidatePayments(qc, projectId);
    },
  });
}
