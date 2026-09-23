"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { http, apiErrorMessage } from "@/lib/api/http";
import {
  announceSessionExpired,
  clearTokens,
  getAccessToken,
  onSessionExpired,
  setTokens,
} from "@/lib/api/tokens";

/**
 * Authentication.
 *
 * The session is a JWT pair from the API. The access token is short-lived and
 * refreshed transparently by the HTTP client; this context only cares whether
 * there is a session at all, and tears one down when the API says it is over.
 */

export interface SignedInOwner {
  id: string;
  email: string;
  name: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  owner: SignedInOwner;
}

interface AuthValue {
  isAuthenticated: boolean;
  /** False until the stored token has been read, so guards don't flash. */
  isReady: boolean;
  owner: SignedInOwner | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    company?: string;
  }) => Promise<void>;
  logout: () => void;
}

const OWNER_KEY = "rentflow.owner";

const AuthContext = createContext<AuthValue | null>(null);

function readStoredOwner(): SignedInOwner | null {
  try {
    const raw = window.localStorage.getItem(OWNER_KEY);
    return raw ? (JSON.parse(raw) as SignedInOwner) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<SignedInOwner | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // A token in storage is treated as a session. If it has actually expired
    // the first request refreshes it, and if that fails the listener below
    // signs out — which is a better first paint than blocking on a probe.
    setIsAuthenticated(Boolean(getAccessToken()));
    setOwner(readStoredOwner());
    setIsReady(true);
  }, []);

  const signOut = useCallback(() => {
    clearTokens();
    try {
      window.localStorage.removeItem(OWNER_KEY);
    } catch {
      /* non-fatal */
    }
    setOwner(null);
    setIsAuthenticated(false);
  }, []);

  // The HTTP client cannot reach React state, so it announces instead.
  useEffect(() => onSessionExpired(signOut), [signOut]);

  const accept = useCallback((tokens: AuthTokens) => {
    setTokens(tokens);
    try {
      window.localStorage.setItem(OWNER_KEY, JSON.stringify(tokens.owner));
    } catch {
      /* non-fatal */
    }
    setOwner(tokens.owner);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await http.post<AuthTokens>("/auth/login", {
          email,
          password,
        });
        accept(data);
      } catch (error) {
        throw new Error(apiErrorMessage(error, "Could not sign in"));
      }
    },
    [accept],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      company?: string;
    }) => {
      try {
        const { data } = await http.post<AuthTokens>("/auth/register", input);
        accept(data);
      } catch (error) {
        throw new Error(apiErrorMessage(error, "Could not create the account"));
      }
    },
    [accept],
  );

  const logout = useCallback(() => {
    announceSessionExpired();
    signOut();
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isReady, owner, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
