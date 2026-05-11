import { useState } from "react";
import type { ToolCall } from "../../types/chat";
import { ToolCallCard } from "./ToolCallCard";

interface ToolActivityProps {
  toolCalls: ToolCall[];
}

export function ToolActivity({ toolCalls }: ToolActivityProps) {
  const [expanded, setExpanded] = useState(false);

  if (toolCalls.length === 0) return null;

  const running = toolCalls.filter((t) => t.status === "running");
  const finished = toolCalls.filter((t) => t.status === "finished");
  const failed = toolCalls.filter((t) => t.status === "failed");

  const summary = [
    running.length > 0 && `${running.length} running`,
    finished.length > 0 && `${finished.length} done`,
    failed.length > 0 && `${failed.length} failed`,
  ]
    .filter(Boolean)
    .join(", ");
  const toolSummary = toolCalls.slice(0, 2).map((toolCall) => ({
    toolName: toolCall.toolName,
    summary:
      summarizePreview(toolCall.argumentsPreview) ??
      (toolCall.argumentKeys && toolCall.argumentKeys.length > 0
        ? toolCall.argumentKeys.join(", ")
        : null),
  }));

  return (
    <div
      style={{
        margin: "8px 0 16px 44px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--color-bg-tertiary)",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-secondary)",
          fontSize: "0.8125rem",
          fontFamily: "var(--font-sans)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.875rem" }}>🔧</span>
          <span>Tool activity</span>
          {toolSummary.length > 0 ? (
            <span
              style={{
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              (
              {toolSummary.map(({ toolName, summary }, index) => (
                <span key={`${toolName}-${index}`} style={{ display: "inline-flex", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>
                    {toolName}
                  </span>
                  {summary ? <span>{summary}</span> : null}
                  {index < toolSummary.length - 1 ? <span>•</span> : null}
                </span>
              ))}
              )
            </span>
          ) : summary ? (
            <span style={{ color: "var(--color-text-muted)" }}>({summary})</span>
          ) : null}
        </span>
        <span
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}
    </div>
  );
}

function summarizePreview(preview?: string | null): string | null {
  if (!preview) {
    return null;
  }

  try {
    const parsed = JSON.parse(preview) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .slice(0, 2)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(", ");
    }
  } catch {
    // keep the raw preview when it is not JSON
  }

  return preview.replace(/\s+/g, " ").trim().slice(0, 80);
}
