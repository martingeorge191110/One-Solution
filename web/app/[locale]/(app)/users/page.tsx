"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Search, Pencil, UserX, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
} from "@/lib/hooks/useUsers";
import type { User } from "@/lib/api/auth.api";
import type { UpdateUserBody } from "@/lib/api/users.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useDebounce } from "@/lib/hooks/useDebounce";

// ---------- Zod schemas ----------
const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
});

const editSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

const PAGE_SIZE = 10;

// ---------- Confirm Dialog ----------
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isPending: boolean;
}) {
  const tCommon = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={isPending}>
            {tCommon("confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Create Dialog ----------
function CreateUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const createMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  });

  const role = watch("role");

  const onSubmit = async (data: CreateFormData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(t("userCreated"));
      reset();
      onClose();
    } catch {
      toast.error(t("createError"));
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createUser")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="new-name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <Input
            id="new-email"
            type="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            error={errors.email?.message}
            required
            {...register("email")}
          />
          <Input
            id="new-password"
            type="password"
            label={t("passwordLabel")}
            placeholder={t("passwordPlaceholder")}
            error={errors.password?.message}
            required
            {...register("password")}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("roleLabel")} <span className="ms-0.5 text-error">*</span>
            </label>
            <Select
              value={role}
              onValueChange={(v) =>
                setValue("role", v as "SUPER_ADMIN" | "ADMIN", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("rolePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">{t("roleSuperAdmin")}</SelectItem>
                <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-error">{errors.role.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {tCommon("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit Dialog ----------
function EditUserDialog({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const updateMutation = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: user
      ? { name: user.name, email: user.email, role: user.role, password: "" }
      : undefined,
  });

  const role = watch("role");

  const onSubmit = async (data: EditFormData) => {
    if (!user) return;
    try {
      const body: UpdateUserBody = {
        name: data.name,
        email: data.email,
        role: data.role,
      };
      if (data.password && data.password.length > 0) {
        body.password = data.password;
      }
      await updateMutation.mutateAsync({ id: user.id, body });
      toast.success(t("userUpdated"));
      reset();
      onClose();
    } catch {
      toast.error(t("updateError"));
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editUser")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="edit-name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <Input
            id="edit-email"
            type="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            error={errors.email?.message}
            required
            {...register("email")}
          />
          <Input
            id="edit-password"
            type="password"
            label={t("passwordOptional")}
            placeholder={t("passwordPlaceholder")}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("roleLabel")} <span className="ms-0.5 text-error">*</span>
            </label>
            <Select
              value={role}
              onValueChange={(v) =>
                setValue("role", v as "SUPER_ADMIN" | "ADMIN", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("rolePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">{t("roleSuperAdmin")}</SelectItem>
                <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-error">{errors.role.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Page ----------
export default function UsersPage() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading } = useUsers({
    search: debouncedSearch || undefined,
    role: roleFilter !== "ALL" ? roleFilter : undefined,
    isActive: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const deactivateMutation = useDeactivateUser();
  const updateMutation = useUpdateUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<User | null>(null);

  const handleDeactivate = useCallback(async () => {
    if (!confirmDeactivate) return;
    try {
      await deactivateMutation.mutateAsync(confirmDeactivate.id);
      toast.success(t("userDeactivated"));
    } catch {
      toast.error(t("deactivateError"));
    } finally {
      setConfirmDeactivate(null);
    }
  }, [confirmDeactivate, deactivateMutation, t]);

  const handleActivate = useCallback(async () => {
    if (!confirmActivate) return;
    try {
      await updateMutation.mutateAsync({
        id: confirmActivate.id,
        body: { isActive: true },
      });
      toast.success(t("userActivated"));
    } catch {
      toast.error(t("activateError"));
    } finally {
      setConfirmActivate(null);
    }
  }, [confirmActivate, updateMutation, t]);

  // Non-SUPER_ADMIN sees no-permission state
  if (currentUser && currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t("noPermission")}</p>
      </div>
    );
  }

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <Button
          leadingIcon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateOpen(true)}
        >
          {t("createUser")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white ps-9 pe-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 dark:bg-surface-elevated dark:border-surface-border"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("rolePlaceholderFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("rolePlaceholderFilter")}</SelectItem>
            <SelectItem value="SUPER_ADMIN">{t("roleSuperAdmin")}</SelectItem>
            <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("statusPlaceholder")}</SelectItem>
            <SelectItem value="true">{t("statusActive")}</SelectItem>
            <SelectItem value="false">{t("statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("nameLabel")}</TableHead>
              <TableHead>{t("emailLabel")}</TableHead>
              <TableHead>{t("roleLabel")}</TableHead>
              <TableHead>{t("statusLabel")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead className="text-end">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const createdAt = (u as unknown as { createdAt?: string })
                  .createdAt;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === "SUPER_ADMIN" ? "primary" : "info"
                        }
                      >
                        {u.role === "SUPER_ADMIN"
                          ? t("roleSuperAdmin")
                          : t("roleAdmin")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.isActive !== false ? "active" : "inactive"}
                        dot
                      >
                        {u.isActive !== false
                          ? t("statusActive")
                          : t("statusInactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {createdAt
                        ? new Date(createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditUser(u)}
                          aria-label={t("editUser")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.isActive !== false ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDeactivate(u)}
                            aria-label={t("deactivateUser")}
                            className="text-error hover:text-error"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmActivate(u)}
                            aria-label={t("activateUser")}
                            className="text-success hover:text-success"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* Dialogs */}
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={() => void handleDeactivate()}
        title={t("deactivateUser")}
        description={t("confirmDeactivate")}
        isPending={deactivateMutation.isPending}
      />
      <ConfirmDialog
        open={!!confirmActivate}
        onClose={() => setConfirmActivate(null)}
        onConfirm={() => void handleActivate()}
        title={t("activateUser")}
        description={t("confirmActivate")}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}
