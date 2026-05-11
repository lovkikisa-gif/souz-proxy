import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button";

interface ComposerProps {
  onSend: (content: string) => void;
  onCancel: () => void;
  sending: boolean;
  hasActiveExecution: boolean;
  cancelling: boolean;
  disabled?: boolean;
}

export function Composer({
  onSend,
  onCancel,
  sending,
  hasActiveExecution,
  cancelling,
  disabled = false,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || sending || hasActiveExecution || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border)",
        padding: "16px 20px",
        background: "var(--color-bg-secondary)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          maxWidth: 768,
          margin: "0 auto",
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            transition: "border-color 0.2s ease",
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message…"
            disabled={disabled}
            rows={1}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: "0.9375rem",
              fontFamily: "var(--font-sans)",
              background: "transparent",
              color: "var(--color-text-primary)",
              border: "none",
              outline: "none",
              resize: "none",
              lineHeight: 1.5,
              maxHeight: 200,
            }}
          />
        </div>

        {hasActiveExecution ? (
          <Button
            variant="danger"
            size="md"
            onClick={onCancel}
            loading={cancelling}
            style={{ flexShrink: 0, height: 44 }}
          >
            Stop
          </Button>
        ) : (
          <Button
            size="md"
            onClick={handleSubmit}
            loading={sending}
            disabled={!value.trim() || disabled}
            style={{ flexShrink: 0, height: 44 }}
          >
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
