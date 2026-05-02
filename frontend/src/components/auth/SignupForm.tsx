import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useAuth } from "../../auth/useAuth";

export function SignupForm() {
  const { verifyWelcomeKey, signup, error } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [welcomeKey, setWelcomeKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!welcomeKey.trim()) return;
    setLoading(true);
    setLocalError(null);
    try {
      const valid = await verifyWelcomeKey(welcomeKey.trim());
      if (valid) {
        setStep(2);
      } else {
        setLocalError("Invalid or expired welcome key.");
      }
    } catch {
      setLocalError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password || !confirmPassword) {
      setLocalError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await signup(welcomeKey.trim(), username.trim(), password, confirmPassword);
    } catch {
      // error is set in AuthProvider
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
          Create account
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          {step === 1 ? "Enter your welcome key to get started" : "Set up your credentials"}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {[1, 2].map((s) => (
          <div
            key={s}
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: s <= step ? "var(--color-accent)" : "var(--color-border)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      {displayError && (
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
          {displayError}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Input
            label="Welcome key"
            type="text"
            value={welcomeKey}
            onChange={(e) => setWelcomeKey(e.target.value)}
            placeholder="Enter your welcome key"
            autoFocus
          />
          <Button type="submit" loading={loading} style={{ width: "100%" }}>
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          <Button type="submit" loading={loading} style={{ width: "100%" }}>
            Create account
          </Button>
        </form>
      )}

      <div style={{ textAlign: "center" }}>
        <Link
          to="/login"
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          Already have an account? <span style={{ color: "var(--color-accent)" }}>Log in</span>
        </Link>
      </div>
    </div>
  );
}
