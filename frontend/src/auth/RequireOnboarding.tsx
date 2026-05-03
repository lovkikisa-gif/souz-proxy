import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { RouteLoading } from "../components/app/RouteLoading";

export function RequireOnboarding({
  children,
}: {
  children: React.ReactNode;
}) {
  const { onboarding, onboardingLoading, onboardingError, refreshOnboarding } =
    useAuth();

  if (onboardingLoading || !onboarding) {
    return (
      <RouteLoading
        message={
          onboardingError ??
          "We're checking your account setup before opening onboarding."
        }
        onRetry={onboardingError ? refreshOnboarding : undefined}
      />
    );
  }

  if (!onboarding.required) {
    return <Navigate to="/chats" replace />;
  }

  return <>{children}</>;
}
