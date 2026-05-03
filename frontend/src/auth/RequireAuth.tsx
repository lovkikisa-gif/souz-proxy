import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { RouteLoading } from "../components/app/RouteLoading";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoading title="Restoring your session" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
