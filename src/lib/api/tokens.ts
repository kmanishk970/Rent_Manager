/**
 * Where the session lives.
 *
 * localStorage rather than a cookie, because the API is a separate origin and
 * the frontend is fully client-rendered — there is no server request to attach
 * a cookie to. The tradeoff is that a script running on this page could read
 * the token, so the access token is deliberately short-lived and the refresh
 * token is only ever sent to /auth/refresh.
 */

const ACCESS_KEY = "rentflow.token";
const REFRESH_KEY = "rentflow.refresh";

/** Every accessor is guarded: private browsing and blocked site data both throw. */
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* non-fatal: the session simply will not survive a reload */
  }
}

export const getAccessToken = () => read(ACCESS_KEY);
export const getRefreshToken = () => read(REFRESH_KEY);

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  write(ACCESS_KEY, tokens.accessToken);
  write(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens() {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
}

/**
 * Lets the auth context react to a 401 that happened inside an interceptor,
 * where React state is out of reach.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  // Wrapped rather than returned directly: Set.delete returns a boolean, and a
  // useEffect cleanup has to return nothing.
  return () => {
    listeners.delete(listener);
  };
}

export function announceSessionExpired() {
  clearTokens();
  for (const listener of listeners) listener();
}
