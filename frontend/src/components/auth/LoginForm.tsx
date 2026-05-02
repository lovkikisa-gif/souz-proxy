import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useAuth } from "../../auth/useAuth";

export function LoginForm() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch {
      // error is set in AuthProvider
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, var(--color-accent), #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: 8,
          }}
        >
          Welcome back
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Sign in to your Souz account
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.2)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-error)",
            fontSize: "0.8125rem",
          }}
        >
          {error}
        </div>
      )}

      <Input
        label="Username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        autoComplete="username"
        autoFocus
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        autoComplete="current-password"
      />

      <Button type="submit" loading={loading} style={{ width: "100%", marginTop: 4 }}>
        Log in
      </Button>

      <div style={{ textAlign: "center" }}>
        <Link
          to="/signup"
          style={{
            color: "var(--color-accent)",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          I have a welcome key
        </Link>
      </div>
    </form>
  );
}
