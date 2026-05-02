import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { LoginForm } from "../components/auth/LoginForm";

export function LoginPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/chats" replace />;
  return <LoginForm />;
}
