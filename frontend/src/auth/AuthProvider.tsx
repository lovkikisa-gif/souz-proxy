import React, { createContext, useState, useEffect, useCallback } from "react";
import type { AuthUser } from "../types/auth";
import type { Bootstrap } from "../types/settings";
import * as authApi from "../api/auth";
import { getBootstrap } from "../api/bootstrap";
import { ApiError } from "../types/api";

export interface AuthContextValue {
  user: AuthUser | null;
  bootstrap: Bootstrap | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (
    welcomeKey: string,
    username: string,
    password: string,
    confirmPassword: string
  ) => Promise<void>;
  verifyWelcomeKey: (welcomeKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await getBootstrap();
      setBootstrap(data);
    } catch {
      // bootstrap may fail if backend is down — non-fatal
    }
  }, []);

  // check session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.getMe();
        if (!cancelled) {
          setUser(res.user);
          await loadBootstrap();
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBootstrap]);

  // listen for 401 events
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setBootstrap(null);
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      try {
        const res = await authApi.login({ username, password });
        setUser(res.user);
        await loadBootstrap();
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : "Login failed. Please try again.";
        setError(msg);
        throw e;
      }
    },
    [loadBootstrap]
  );

  const verifyWelcomeKey = useCallback(async (welcomeKey: string) => {
    setError(null);
    try {
      const res = await authApi.verifyWelcomeKey({ welcomeKey });
      return res.valid;
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Verification failed.";
      setError(msg);
      return false;
    }
  }, []);

  const signup = useCallback(
    async (
      welcomeKey: string,
      username: string,
      password: string,
      confirmPassword: string
    ) => {
      setError(null);
      try {
        const res = await authApi.signup({
          welcomeKey,
          username,
          password,
          confirmPassword,
        });
        setUser(res.user);
        await loadBootstrap();
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : "Signup failed. Please try again.";
        setError(msg);
        throw e;
      }
    },
    [loadBootstrap]
  );

  const logoutFn = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort
    }
    setUser(null);
    setBootstrap(null);
    setError(null);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    await loadBootstrap();
  }, [loadBootstrap]);

  return (
    <AuthContext.Provider
      value={{
        user,
        bootstrap,
        loading,
        error,
        login,
        signup,
        verifyWelcomeKey,
        logout: logoutFn,
        refreshBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
