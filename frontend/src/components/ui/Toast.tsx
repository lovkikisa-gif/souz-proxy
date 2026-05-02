import { useEffect, useState, useCallback } from "react";

interface ToastMessage {
  id: string;
  text: string;
  type: "error" | "success" | "info";
}

let addToastGlobal: ((text: string, type?: ToastMessage["type"]) => void) | null = null;

export function showToast(text: string, type: ToastMessage["type"] = "error") {
  addToastGlobal?.(text, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage["type"] = "error") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => {
      addToastGlobal = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const colorMap = {
    error: "var(--color-error)",
    success: "var(--color-success)",
    info: "var(--color-info)",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 400,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass-card animate-fade-in"
          style={{
            padding: "12px 16px",
            borderLeft: `3px solid ${colorMap[t.type]}`,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
