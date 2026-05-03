import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { RouteLoading } from "../components/app/RouteLoading";
import { LoginForm } from "../components/auth/LoginForm";

export function LoginPage() {
  const {
    user,
    loading,
    onboarding,
    onboardingLoading,
    onboardingError,
    refreshOnboarding,
  } = useAuth();

  if (user) {
    if (loading || onboardingLoading || !onboarding) {
      return (
        <RouteLoading
          fullscreen={false}
          message={
            onboardingError ??
            "We signed you in and are preparing the right next step."
          }
          onRetry={onboardingError ? refreshOnboarding : undefined}
        />
      );
    }

    return (
      <Navigate to={onboarding.required ? "/onboarding" : "/chats"} replace />
    );
  }

  return <LoginForm />;
}
