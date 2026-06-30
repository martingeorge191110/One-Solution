import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  projectsApi,
  type ProjectListParams,
  type CreateProjectBody,
  type UpdateProjectBody,
  type UpdateProjectStatusBody,
} from "@/lib/api/projects.api";
import { CLIENT_KEYS } from "@/lib/hooks/useClients";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const PROJECT_KEYS = {
  summary: ["projects", "summary"] as const,
  list: (p?: ProjectListParams) => ["projects", "list", p ?? {}] as const,
  listBase: ["projects", "list"] as const,
  detail: (id: string) => ["projects", "detail", id] as const,
  detailBase: ["projects", "detail"] as const,
};

// ─── Summary ─────────────────────────────────────────────────────────────────
export function useProjectSummary() {
  return useQuery({
    queryKey: PROJECT_KEYS.summary,
    queryFn: () => projectsApi.summary(),
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────
export function useProjects(params: ProjectListParams = {}) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(params),
    queryFn: () => projectsApi.list(params),
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────────
export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectBody) => projectsApi.create(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.summary });
      // client detail has project list
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.detail(vars.clientId) });
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.listBase });
    },
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────
export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProjectBody }) =>
      projectsApi.update(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.summary });
    },
  });
}

// ─── Update Status ───────────────────────────────────────────────────────────
export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateProjectStatusBody;
    }) => projectsApi.updateStatus(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.summary });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.detailBase });
      void qc.invalidateQueries({ queryKey: PROJECT_KEYS.summary });
      // client project count changes
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.listBase });
      void qc.invalidateQueries({ queryKey: CLIENT_KEYS.detailBase });
    },
  });
}
