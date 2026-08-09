'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, type MeResponse } from './api-client';
import { SESSION_COOKIE, TOKEN_STORAGE_KEY } from './session';

export type AuthUser = MeResponse & {
  fullName: string;
  username: string;
  primaryEmailAddress: { emailAddress: string };
  createdAt: string;
};

interface AuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: AuthUser | null;
  getToken: () => Promise<string | null>;
  setSession: (token: string, user: MeResponse) => Promise<void>;
  signOut: (opts?: { redirectUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function buildUser(me: MeResponse & { createdAt?: string; username?: string }): AuthUser {
  const fullName =
    [me.firstName, me.lastName].filter(Boolean).join(' ') ||
    me.username ||
    me.id ||
    'User';
  return {
    ...me,
    username: me.username ?? me.id,
    fullName,
    primaryEmailAddress: { emailAddress: me.email },
    createdAt: me.createdAt ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<{ token: string; user: AuthUser } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const persist = useCallback((token: string, user: AuthUser) => {
    tokenRef.current = token;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage may be unavailable (private mode) — the cookie still works.
    }
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax;`;
    setSessionState({ token, user });
  }, []);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
    document.cookie = `${SESSION_COOKIE}=; max-age=0; path=/`;
    setSessionState(null);
  }, []);

  const getToken = useCallback(async () => {
    if (tokenRef.current) return tokenRef.current;
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {}
    if (token) tokenRef.current = token;
    return token;
  }, []);

  // Restore a stored session on first load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token: string | null = null;
      try {
        token = localStorage.getItem(TOKEN_STORAGE_KEY);
      } catch {}
      if (token) {
        try {
          const res = await apiClient.get<MeResponse & { createdAt?: string }>('/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled) return;
          tokenRef.current = token;
          setSessionState({ token, user: buildUser(res.data) });
        } catch {
          if (!cancelled) {
            tokenRef.current = null;
            try {
              localStorage.removeItem(TOKEN_STORAGE_KEY);
            } catch {}
            document.cookie = `${SESSION_COOKIE}=; max-age=0; path=/`;
          }
        }
      }
      if (!cancelled) setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(
    async (token: string, user: MeResponse & { createdAt?: string }) => {
      persist(token, buildUser(user));
    },
    [persist],
  );

  const signOut = useCallback(
    async (opts?: { redirectUrl?: string }) => {
      const token = tokenRef.current;
      if (token) {
        try {
          await apiClient.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch {
          // Best-effort — the client session is invalidated regardless.
        }
      }
      clearSession();
      window.location.assign(opts?.redirectUrl ?? '/dashboard');
    },
    [clearSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoaded,
      isSignedIn: Boolean(session),
      userId: session?.user.id ?? null,
      user: session?.user ?? null,
      getToken,
      setSession,
      signOut,
    }),
    [isLoaded, session, getToken, setSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Pick<
  AuthContextValue,
  'isLoaded' | 'isSignedIn' | 'getToken' | 'userId' | 'setSession'
> {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    getToken: ctx.getToken,
    userId: ctx.userId,
    setSession: ctx.setSession,
  };
}

export function useUser(): { user: AuthUser | null; isLoaded: boolean } {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return { user: ctx.user, isLoaded: ctx.isLoaded };
}

export function useClerk(): { signOut: AuthContextValue['signOut'] } {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useClerk must be used within an AuthProvider');
  }
  return { signOut: ctx.signOut };
}