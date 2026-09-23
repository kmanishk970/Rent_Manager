"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Placeholder auth.
 *
 * The prototype's `login()` just flipped a boolean in memory, so a refresh
 * dropped you back to the login screen. This keeps the same trivial behaviour
 * but persists the flag, which is what makes real URLs usable. Swap the body of
 * `login` for a call to the NestJS `/auth/login` endpoint and store the JWT
 * under the same key that `lib/api/http.ts` already reads.
 */

const STORAGE_KEY = "rentflow.authenticated";

interface AuthValue {
  isAuthenticated: boolean;
  /** False until the stored flag has been read, so guards don't flash. */
  isReady: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      setIsAuthenticated(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // Private browsing and blocked site data both throw here; staying signed
      // out is the correct fallback.
    }
    setIsReady(true);
  }, []);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* non-fatal: the session simply won't survive a reload */
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem("rentflow.token");
    } catch {
      /* non-fatal */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
