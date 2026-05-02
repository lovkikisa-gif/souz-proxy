import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { SignupForm } from "../components/auth/SignupForm";

export function SignupPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/chats" replace />;
  return <SignupForm />;
}
