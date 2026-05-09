import { useState } from "react";
import type { ToolCall } from "../../types/chat";

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = { running: "var(--color-info)", finished: "var(--color-success)", failed: "var(--color-error)" }[toolCall.status];
  const statusIcon = { running: "⏳", finished: "✓", failed: "✗" }[toolCall.status];
  const summary = summarizeToolCall(toolCall);

  return (
    <div style={{ padding: "8px 12px", background: "var(--color-bg-primary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
          <span style={{ color: statusColor, fontSize: "0.75rem", paddingTop: 2 }}>{statusIcon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 500, fontFamily: "var(--font-mono)" }}>{toolCall.toolName}</span>
              {toolCall.durationMs != null && <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>{toolCall.durationMs}ms</span>}
            </div>
            {summary ? (
              <div style={{ marginTop: 2, fontSize: "0.6875rem", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {summary}
              </div>
            ) : null}
          </div>
        </div>
        {toolCall.status === "running" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-info)", animation: "pulse-glow 1.5s infinite" }} />}
      </div>
      {expanded && (
        <div style={{ marginTop: 8, fontSize: "0.75rem" }}>
          {toolCall.argumentsPreview && <pre style={{ background: "var(--color-bg-tertiary)", padding: 8, borderRadius: 4, overflow: "auto", maxHeight: 120, fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>{toolCall.argumentsPreview}</pre>}
          {toolCall.resultPreview && <pre style={{ background: "var(--color-bg-tertiary)", padding: 8, borderRadius: 4, overflow: "auto", maxHeight: 120, fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)", marginTop: 4 }}>{toolCall.resultPreview}</pre>}
          {toolCall.error && <div style={{ padding: 8, background: "rgba(248,113,113,0.1)", borderRadius: 4, color: "var(--color-error)", marginTop: 4 }}>{toolCall.error}</div>}
        </div>
      )}
    </div>
  );
}

function summarizeToolCall(toolCall: ToolCall): string | null {
  if (toolCall.argumentsPreview) {
    try {
      const parsed = JSON.parse(toolCall.argumentsPreview) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed)
          .slice(0, 2)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(", ");
      }
    } catch {
      return toolCall.argumentsPreview.replace(/\s+/g, " ").trim().slice(0, 80);
    }

    return toolCall.argumentsPreview.replace(/\s+/g, " ").trim().slice(0, 80);
  }

  if (toolCall.argumentKeys && toolCall.argumentKeys.length > 0) {
    return toolCall.argumentKeys.join(", ");
  }

  return null;
}
