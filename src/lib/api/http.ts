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
/** The port the API listens on in development. */
const API_PORT = 4000;

/**
 * Where the API is, from wherever this page was opened.
 *
 * NEXT_PUBLIC_API_URL wins when it is set — that is how a deployed build points
 * at a real host. With nothing configured the host is taken from the current
 * page rather than hardcoded to localhost, because "localhost" means the
 * *browser's* machine: open the app on the LAN address, or from a phone, and a
 * hardcoded localhost would look for an API on that device.
 */
function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${API_PORT}/api/v1`;
  }

  // Server-side render: nothing here calls the API, but a base URL is needed.
  return `http://localhost:${API_PORT}/api/v1`;
}

/**
 * Long enough for a sleeping server to wake.
 *
 * A free host stops the API after a spell of no traffic and starts it again on
 * the next request, which takes the better part of a minute. Fifteen seconds
 * was generous against a server already running and hopeless against one that
 * is starting: the first visit of the morning would fail, and a working deploy
 * would look broken.
 */
const REQUEST_TIMEOUT_MS = 60_000;

export const http = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: REQUEST_TIMEOUT_MS,
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

  if (error.code === "ECONNABORTED") {
    return "The server took too long to respond. It may be waking up — try again.";
  }
  if (!error.response) return "Cannot reach the server. Is the API running?";

  return fallback;
}
