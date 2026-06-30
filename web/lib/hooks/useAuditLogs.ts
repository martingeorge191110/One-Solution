import { useQuery } from "@tanstack/react-query";
import { auditApi, type AuditListParams } from "@/lib/api/audit.api";

export function useAuditLogs(params: AuditListParams = {}) {
  return useQuery({
    queryKey: ["audit", params],
    queryFn: () => auditApi.list(params),
  });
}
