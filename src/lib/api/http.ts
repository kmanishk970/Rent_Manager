import axios from "axios";

/**
 * Shared axios instance for the NestJS backend.
 *
 * Nothing routes through this yet — the mock API in `./index.ts` still answers
 * every call. It lives here so that wiring the real backend is a matter of
 * replacing the mock function bodies with `http.get(...)` calls, with auth
 * headers and error handling already in one place.
 */
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("rentflow.token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
