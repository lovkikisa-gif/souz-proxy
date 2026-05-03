import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { RouteLoading } from "../components/app/RouteLoading";
import { SignupForm } from "../components/auth/SignupForm";

export function SignupPage() {
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
            "We created your account and are preparing the right next step."
          }
          onRetry={onboardingError ? refreshOnboarding : undefined}
        />
      );
    }

    return (
      <Navigate to={onboarding.required ? "/onboarding" : "/chats"} replace />
    );
  }

  return <SignupForm />;
}
