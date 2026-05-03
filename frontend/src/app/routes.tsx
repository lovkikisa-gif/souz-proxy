import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { AppShell } from "../layouts/AppShell";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireCompletedOnboarding } from "../auth/RequireCompletedOnboarding";
import { RequireOnboarding } from "../auth/RequireOnboarding";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { ChatPage } from "../pages/ChatPage";
import { SettingsPage } from "../pages/SettingsPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { useAuth } from "../auth/useAuth";
import { RouteLoading } from "../components/app/RouteLoading";

function RootRedirect() {
  const {
    user,
    loading,
    onboarding,
    onboardingLoading,
    onboardingError,
    refreshOnboarding,
  } = useAuth();

  if (loading) {
    return <RouteLoading title="Restoring your session" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingLoading || !onboarding) {
    return (
      <RouteLoading
        message={
          onboardingError ??
          "We're checking your account setup before opening the app."
        }
        onRetry={onboardingError ? refreshOnboarding : undefined}
      />
    );
  }

  return <Navigate to={onboarding.required ? "/onboarding" : "/chats"} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<RootRedirect />} />

      {/* Auth pages */}
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
      </Route>

      <Route
        path="onboarding"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <OnboardingPage />
            </RequireOnboarding>
          </RequireAuth>
        }
      />

      {/* Protected app */}
      <Route
        element={
          <RequireAuth>
            <RequireCompletedOnboarding>
              <AppShell />
            </RequireCompletedOnboarding>
          </RequireAuth>
        }
      >
        <Route path="chats" element={<ChatPage />} />
        <Route path="chats/:chatId" element={<ChatPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
