import type { CSSProperties } from "react";

export const settingsPageStyle: CSSProperties = {
  height: "100%",
  overflowY: "auto",
  padding: "32px 24px",
};

export const settingsPageInnerStyle: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

export const settingsHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

export const settingsTitleStyle: CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  margin: 0,
  background: "linear-gradient(135deg, var(--color-accent), #a78bfa)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

export const tabListStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 8,
};

export function tabButtonStyle(active: boolean): CSSProperties {
  return {
    padding: "10px 14px",
    fontSize: "0.875rem",
    fontWeight: 600,
    background: active
      ? "var(--color-bg-tertiary)"
      : "var(--color-bg-secondary)",
    color: active
      ? "var(--color-text-primary)"
      : "var(--color-text-muted)",
    border: `1px solid ${
      active ? "var(--color-border-active)" : "var(--color-border)"
    }`,
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    minHeight: 42,
  };
}

export const settingsCardStyle: CSSProperties = {
  padding: 24,
};

export const formStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

export const sectionTitleStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  margin: 0,
};

export const fieldStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

export const twoColumnGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

export const labelStyle: CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--color-text-secondary)",
};

export const inputLikeStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 42,
  padding: "10px 14px",
  fontSize: "0.875rem",
  fontFamily: "var(--font-sans)",
  background: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  outline: "none",
  boxSizing: "border-box",
};

export const textAreaStyle: CSSProperties = {
  ...inputLikeStyle,
  minHeight: 108,
  resize: "vertical",
};

export const actionsRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

export const helperTextStyle: CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-muted)",
  lineHeight: 1.5,
  margin: 0,
};

export const toggleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  minHeight: 42,
};
