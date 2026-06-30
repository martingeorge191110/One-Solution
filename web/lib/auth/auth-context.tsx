"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { authApi, type User } from "@/lib/api/auth.api";
import { AUTH_EXPIRED_EVENT } from "@/lib/api/client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const user = data?.user ?? null;
  const isAuthenticated = user !== null;

  const login = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await refetch();
    },
    [queryClient, refetch],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — still clear client state
    }
    queryClient.setQueryData(["me"], null);
    queryClient.clear();

    // Preserve ?next= so the user can return after re-login
    const next = encodeURIComponent(pathname);
    router.push(`/${locale}/login?next=${next}`);
  }, [queryClient, router, locale, pathname]);

  // The API client emits this only when a 401 could NOT be recovered by a token
  // refresh (refresh token expired/cleared) — i.e. the session is genuinely over.
  useEffect(() => {
    const handler = () => {
      queryClient.setQueryData(["me"], null);
      if (!pathname.includes("/login")) {
        const next = encodeURIComponent(pathname);
        router.push(`/${locale}/login?next=${next}`);
      }
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, [queryClient, router, locale, pathname]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refetch: () => void refetch(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
