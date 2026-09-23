import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import {
  announceSessionExpired,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokens";

/**
 * The HTTP client for the NestJS API.
 *
 * Two things live here so no caller has to think about them: the bearer token
 * goes on every request, and an expired access token is exchanged for a fresh
 * one and the request retried — once.
 */
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Marks a request that has already been retried, so it cannot loop. */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * One refresh at a time.
 *
 * A dashboard fires several requests at once; without this, every one of them
 * that meets an expired token would start its own refresh, and all but the
 * first would present a token the server had already rotated past.
 */
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    // A bare axios call, not `http` — going through the instance would attach
    // the dead access token and recurse straight back into this interceptor.
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
    }>(`${http.defaults.baseURL}/auth/refresh`, { refreshToken });

    setTokens(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthCall = config?.url?.includes("/auth/");

    if (error.response?.status !== 401 || !config || config._retried || isAuthCall) {
      return Promise.reject(error);
    }

    config._retried = true;

    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    const token = await refreshing;

    if (!token) {
      // The refresh token is gone or rejected: the session is genuinely over.
      announceSessionExpired();
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${token}`;
    return http.request(config);
  },
);

/** The API's error shape, so callers can show what the server actually said. */
interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * The message worth showing a person.
 *
 * Nest returns an array for validation failures and a string for everything
 * else, and neither is useful raw.
 */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const body = error.response?.data as ApiErrorBody | undefined;
  if (Array.isArray(body?.message)) return body.message.join(". ");
  if (typeof body?.message === "string") return body.message;

  if (error.code === "ECONNABORTED") return "The server took too long to respond";
  if (!error.response) return "Cannot reach the server. Is the API running?";

  return fallback;
}
