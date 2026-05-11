import React, { useEffect } from "react";
import { useAppPreferences } from "../../preferences/AppPreferencesProvider";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const { t } = useAppPreferences();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          position: "relative",
          width: "min(480px, calc(100vw - 32px))",
          maxHeight: "80vh",
          overflow: "auto",
          padding: "24px",
        }}
      >
        <button
          aria-label={t("common.closeDialog")}
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "1.25rem",
            padding: 4,
          }}
        >
          ✕
        </button>
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 16,
              paddingRight: 32,
            }}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{title}</h3>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
