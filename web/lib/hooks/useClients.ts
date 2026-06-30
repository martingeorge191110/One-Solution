import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clientsApi,
  type ClientListParams,
  type CreateClientBody,
  type UpdateClientBody,
} from "@/lib/api/clients.api";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const CLIENT_KEYS = {
  summary: ["clients", "summary"] as const,
  list: (p?: ClientListParams) => ["clients", "list", p ?? {}] as const,
  listBase: ["clients", "list"] as const,
  detail: (id: string) => ["clients", "detail", id] as const,
  detailBase: ["clients", "detail"] as const,
};

// ─── Summary ─────────────────────────────────────────────────────────────────
export function useClientSummary() {
  return useQuery({
    queryKey: CLIENT_KEYS.summary,
    queryFn: () => clientsApi.summary(),
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────
export function useClients(params: ClientListParams = {}) {
  return useQuery({
    queryKey: CLIENT_KEYS.list(params),
    queryFn: () => clientsApi.list(params),
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────────
export function useClient(id: string) {
  return useQuery({
    queryKey: CLIENT_KEYS.detail(id),
    queryFn: () => clientsApi.get(id),
    enabled: !!id,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClientBody) => clientsApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.summary });
    },
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateClientBody }) =>
      clientsApi.update(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.summary });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────
export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.detailBase });
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.summary });
    },
  });
}
