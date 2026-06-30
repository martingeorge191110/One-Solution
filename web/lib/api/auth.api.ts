import { api } from "@/lib/api/client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  isActive?: boolean;
}

export interface MeResponse {
  user: User;
}

export interface LoginResponse {
  user: User;
}

export interface LogoutResponse {
  success: boolean;
}

export const authApi = {
  me: () => api.get<MeResponse>("/auth/me"),
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }),
  logout: () => api.post<LogoutResponse>("/auth/logout"),
  refresh: () => api.post<LoginResponse>("/auth/refresh"),
};
