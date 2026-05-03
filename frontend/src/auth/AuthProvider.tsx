import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { AuthUser } from "../types/auth";
import type { Bootstrap } from "../types/settings";
import type { OnboardingState } from "../types/onboarding";
import * as authApi from "../api/auth";
import { getBootstrap } from "../api/bootstrap";
import { getOnboardingState } from "../api/onboarding";
import { ApiError } from "../types/api";

export interface AuthContextValue {
  user: AuthUser | null;
  bootstrap: Bootstrap | null;
  onboarding: OnboardingState | null;
  loading: boolean;
  onboardingLoading: boolean;
  onboardingError: string | null;
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
  refreshOnboarding: () => Promise<OnboardingState | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await getBootstrap();
      if (mountedRef.current) {
        setBootstrap(data);
      }
    } catch {
      // bootstrap may fail if backend is down — non-fatal
    }
  }, []);

  const loadOnboarding = useCallback(async () => {
    setOnboardingLoading(true);
    setOnboardingError(null);

    try {
      const data = await getOnboardingState();
      if (mountedRef.current) {
        setOnboarding(data);
      }
      return data;
    } catch (e) {
      if (mountedRef.current) {
        setOnboarding(null);
        setOnboardingError(
          e instanceof ApiError
            ? e.message
            : "Failed to load onboarding state."
        );
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setOnboardingLoading(false);
      }
    }
  }, []);

  const hydrateAuthenticatedState = useCallback(
    (nextUser: AuthUser) => {
      setUser(nextUser);
      setBootstrap(null);
      setOnboarding(null);
      setOnboardingError(null);
      setOnboardingLoading(true);
      void loadOnboarding();
      void loadBootstrap();
    },
    [loadBootstrap, loadOnboarding]
  );

  // check session on mount
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.getMe();
        if (!cancelled) {
          hydrateAuthenticatedState(res.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setBootstrap(null);
          setOnboarding(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [hydrateAuthenticatedState]);

  // listen for 401 events
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setBootstrap(null);
      setOnboarding(null);
      setOnboardingLoading(false);
      setOnboardingError(null);
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      try {
        const res = await authApi.login({ username, password });
        hydrateAuthenticatedState(res.user);
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : "Login failed. Please try again.";
        setError(msg);
        throw e;
      }
    },
    [hydrateAuthenticatedState]
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
        hydrateAuthenticatedState(res.user);
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : "Signup failed. Please try again.";
        setError(msg);
        throw e;
      }
    },
    [hydrateAuthenticatedState]
  );

  const logoutFn = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort
    }
    setUser(null);
    setBootstrap(null);
    setOnboarding(null);
    setOnboardingLoading(false);
    setOnboardingError(null);
    setError(null);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    await loadBootstrap();
  }, [loadBootstrap]);

  const refreshOnboarding = useCallback(async () => {
    if (!user) {
      return null;
    }

    return loadOnboarding();
  }, [loadOnboarding, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        bootstrap,
        onboarding,
        loading,
        onboardingLoading,
        onboardingError,
        error,
        login,
        signup,
        verifyWelcomeKey,
        logout: logoutFn,
        refreshBootstrap,
        refreshOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
