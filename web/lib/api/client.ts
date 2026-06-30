/**
 * ONE SOLUTIONS — API fetch wrapper.
 * Points at NEXT_PUBLIC_API_URL (default: http://localhost:5000/api).
 * Uses credentials: 'include' for httpOnly cookie auth (access_token / refresh_token).
 *
 * Transparent refresh: when a request returns 401, we call POST /auth/refresh
 * once (single-flight, shared across concurrent 401s) and retry the original
 * request. If refresh fails, we emit `auth:expired` so the app can redirect to
 * login — this is what keeps the user signed in after the short-lived access
 * token expires or is cleared.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export const AUTH_EXPIRED_EVENT = "auth:expired";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface FetchOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Internal: set on the single retry after a successful refresh. */
  _retried?: boolean;
}

interface ApiError {
  message: string;
  status: number;
  data?: unknown;
}

/** Paths that must never trigger the refresh-and-retry loop. */
function isAuthFlowPath(path: string): boolean {
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout")
  );
}

// Single-flight refresh: concurrent 401s share one /auth/refresh call.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.ok)
      .catch(() => false);
    // Allow a fresh attempt once this one settles.
    void refreshInFlight.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, signal, _retried } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    credentials: "include",
    signal,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Access token missing/expired → try a one-time refresh + retry.
  if (response.status === 401 && !_retried && !isAuthFlowPath(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    // Refresh failed (refresh token expired/cleared) → session is really over.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const error: ApiError = {
      message:
        (errorData as { message?: string })?.message ??
        `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
      data: errorData,
    };
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
