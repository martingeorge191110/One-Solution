import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemDataApi } from "@/lib/api/system-data.api";
import type {
  TermListParams,
  CreateTermBody,
  UpdateTermBody,
  ItemListParams,
  CreateItemBody,
  UpdateItemBody,
  ConditionListParams,
  CreateConditionBody,
  UpdateConditionBody,
  AlertThresholdListParams,
  CreateAlertThresholdBody,
  UpdateAlertThresholdBody,
} from "@/lib/api/system-data.api";

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const SYSTEM_DATA_KEYS = {
  summary: ["system-data", "summary"] as const,
  terms: (p?: TermListParams) => ["system-data", "terms", p ?? {}] as const,
  items: (p?: ItemListParams) => ["system-data", "items", p ?? {}] as const,
  conditions: (p?: ConditionListParams) =>
    ["system-data", "conditions", p ?? {}] as const,
  alertThresholds: (p?: AlertThresholdListParams) =>
    ["system-data", "alert-thresholds", p ?? {}] as const,
  // base keys for broad invalidation
  termsBase: ["system-data", "terms"] as const,
  itemsBase: ["system-data", "items"] as const,
  conditionsBase: ["system-data", "conditions"] as const,
  alertThresholdsBase: ["system-data", "alert-thresholds"] as const,
};

// ─── Summary ─────────────────────────────────────────────────────────────────
export function useSystemDataSummary() {
  return useQuery({
    queryKey: SYSTEM_DATA_KEYS.summary,
    queryFn: () => systemDataApi.summary(),
  });
}

// ─── Terms ────────────────────────────────────────────────────────────────────
export function useTerms(params: TermListParams = {}) {
  return useQuery({
    queryKey: SYSTEM_DATA_KEYS.terms(params),
    queryFn: () => systemDataApi.terms.list(params),
  });
}

export function useCreateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTermBody) => systemDataApi.terms.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.termsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

export function useUpdateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTermBody }) =>
      systemDataApi.terms.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.termsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

export function useDeleteTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemDataApi.terms.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.termsBase });
      // Items belonging to the term are gone too
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.itemsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

// ─── Items ────────────────────────────────────────────────────────────────────
export function useItems(params: ItemListParams = {}) {
  return useQuery({
    queryKey: SYSTEM_DATA_KEYS.items(params),
    queryFn: () => systemDataApi.items.list(params),
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateItemBody) => systemDataApi.items.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.itemsBase });
      // term _count.items changes
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.termsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateItemBody }) =>
      systemDataApi.items.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.itemsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemDataApi.items.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.itemsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.termsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

// ─── Conditions ───────────────────────────────────────────────────────────────
export function useConditions(params: ConditionListParams = {}) {
  return useQuery({
    queryKey: SYSTEM_DATA_KEYS.conditions(params),
    queryFn: () => systemDataApi.conditions.list(params),
  });
}

export function useCreateCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConditionBody) =>
      systemDataApi.conditions.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.conditionsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

export function useUpdateCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateConditionBody;
    }) => systemDataApi.conditions.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.conditionsBase });
    },
  });
}

export function useDeleteCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemDataApi.conditions.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.conditionsBase });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

// ─── Alert Thresholds ─────────────────────────────────────────────────────────
export function useAlertThresholds(params: AlertThresholdListParams = {}) {
  return useQuery({
    queryKey: SYSTEM_DATA_KEYS.alertThresholds(params),
    queryFn: () => systemDataApi.alertThresholds.list(params),
  });
}

export function useCreateAlertThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAlertThresholdBody) =>
      systemDataApi.alertThresholds.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: SYSTEM_DATA_KEYS.alertThresholdsBase,
      });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}

export function useUpdateAlertThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateAlertThresholdBody;
    }) => systemDataApi.alertThresholds.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: SYSTEM_DATA_KEYS.alertThresholdsBase,
      });
    },
  });
}

export function useDeleteAlertThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemDataApi.alertThresholds.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: SYSTEM_DATA_KEYS.alertThresholdsBase,
      });
      void qc.invalidateQueries({ queryKey: SYSTEM_DATA_KEYS.summary });
    },
  });
}
