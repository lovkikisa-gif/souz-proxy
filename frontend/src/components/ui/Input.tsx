import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, ...props }, ref) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {label && (
          <label
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={{
            padding: "10px 14px",
            fontSize: "0.875rem",
            fontFamily: "var(--font-sans)",
            background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)",
            border: `1px solid ${error ? "var(--color-error)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-md)",
            outline: "none",
            transition: "border-color 0.2s ease",
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error
              ? "var(--color-error)"
              : "var(--color-border-active)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error
              ? "var(--color-error)"
              : "var(--color-border)";
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-error)",
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
