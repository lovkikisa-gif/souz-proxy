import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    border: "1px solid transparent",
    borderRadius: "var(--radius-md)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.5 : 1,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  };

  const sizeMap: Record<string, React.CSSProperties> = {
    sm: { padding: "6px 14px", fontSize: "0.8125rem" },
    md: { padding: "10px 20px", fontSize: "0.875rem" },
    lg: { padding: "14px 28px", fontSize: "1rem" },
  };

  const variantMap: Record<string, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(135deg, var(--color-accent), #7c3aed)",
      color: "#fff",
      boxShadow: "0 2px 12px var(--color-accent-glow)",
    },
    secondary: {
      background: "var(--color-bg-tertiary)",
      color: "var(--color-text-primary)",
      borderColor: "var(--color-border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text-secondary)",
    },
    danger: {
      background: "rgba(248, 113, 113, 0.15)",
      color: "var(--color-error)",
      borderColor: "rgba(248, 113, 113, 0.3)",
    },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        ...baseStyles,
        ...sizeMap[size],
        ...variantMap[variant],
        ...style,
      }}
      {...props}
    >
      {loading && <Spinner size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ animation: "spin 1s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeDasharray="31.4 31.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
