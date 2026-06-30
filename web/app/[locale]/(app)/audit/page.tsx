"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { useAuditLogs } from "@/lib/hooks/useAuditLogs";
import type { AuditLog, AuditAction } from "@/lib/api/audit.api";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 15;

const ACTION_BADGE: Record<AuditAction, BadgeVariant> = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "error",
};

function formatCairo(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------- JSON diff viewer ----------
function JsonBlock({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  if (!data) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre className="overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700 dark:bg-surface-elevated dark:text-neutral-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ---------- Details dialog ----------
function AuditDetailsDialog({
  log,
  onClose,
}: {
  log: AuditLog | null;
  onClose: () => void;
}) {
  const t = useTranslations("audit");
  if (!log) return null;

  const hasBefore = log.before && Object.keys(log.before).length > 0;
  const hasAfter = log.after && Object.keys(log.after).length > 0;

  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("detailsTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t("entityLabel")}: </span>
              <span className="font-medium">{log.entity}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("entityIdLabel")}: </span>
              <span className="font-mono text-xs">{log.entityId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("actorLabel")}: </span>
              <span className="font-medium">
                {log.actor ? log.actor.name : t("unknownActor")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("timeLabel")}: </span>
              <span>{formatCairo(log.createdAt)}</span>
            </div>
          </div>
          {!hasBefore && !hasAfter && (
            <p className="text-sm text-muted-foreground">{t("noChanges")}</p>
          )}
          {hasBefore && <JsonBlock label={t("beforeLabel")} data={log.before} />}
          {hasAfter && <JsonBlock label={t("afterLabel")} data={log.after} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Page ----------
export default function AuditPage() {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common");
  const { user: currentUser } = useAuth();

  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const { data, isLoading } = useAuditLogs({
    entity: entity || undefined,
    action: action !== "ALL" ? action : undefined,
    from: from || undefined,
    to: to || undefined,
    actorId: actorId || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  if (currentUser && currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t("noPermission")}</p>
      </div>
    );
  }

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="h-10 min-w-40 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
          placeholder={t("filterEntity")}
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1); }}
        />
        <Select
          value={action}
          onValueChange={(v) => { setAction(v); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("filterAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filterAction")}</SelectItem>
            <SelectItem value="CREATE">{t("actionCreate")}</SelectItem>
            <SelectItem value="UPDATE">{t("actionUpdate")}</SelectItem>
            <SelectItem value="DELETE">{t("actionDelete")}</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="date"
          className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
          title={t("filterFrom")}
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
        />
        <input
          type="date"
          className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
          title={t("filterTo")}
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
        />
        <input
          className="h-10 w-52 rounded-xl border border-neutral-200 bg-white px-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
          placeholder={t("filterActor")}
          value={actorId}
          onChange={(e) => { setActorId(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("timeLabel")}</TableHead>
              <TableHead>{t("actorLabel")}</TableHead>
              <TableHead>{t("actionLabel")}</TableHead>
              <TableHead>{t("entityLabel")}</TableHead>
              <TableHead>{t("entityIdLabel")}</TableHead>
              <TableHead className="text-end">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatCairo(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    {log.actor ? (
                      <span className="font-medium">{log.actor.name}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("unknownActor")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_BADGE[log.action]}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.entityId}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailLog(log)}
                      >
                        {t("viewDetails")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("page")} {page} {t("of")} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tCommon("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tCommon("next")}
            </Button>
          </div>
        </div>
      )}

      {/* Details dialog */}
      <AuditDetailsDialog log={detailLog} onClose={() => setDetailLog(null)} />
    </div>
  );
}
