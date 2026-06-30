import { api } from "@/lib/api/client";
import type { User } from "@/lib/api/auth.api";

export interface UserListParams {
  search?: string;
  role?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role: "SUPER_ADMIN" | "ADMIN";
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
  role?: "SUPER_ADMIN" | "ADMIN";
  isActive?: boolean;
  password?: string;
}

export const usersApi = {
  list: (params: UserListParams = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.role) query.set("role", params.role);
    if (params.isActive !== undefined && params.isActive !== "")
      query.set("isActive", params.isActive);
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.pageSize !== undefined)
      query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return api.get<UserListResponse>(`/users${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => api.get<{ user: User }>(`/users/${id}`),

  create: (body: CreateUserBody) => api.post<{ user: User }>("/users", body),

  update: (id: string, body: UpdateUserBody) =>
    api.patch<{ user: User }>(`/users/${id}`, body),

  deactivate: (id: string) => api.delete<{ user: User }>(`/users/${id}`),
};
