import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../../types/chat";

interface MessageBubbleProps {
  message: Message;
  streamingDelta?: string;
}

export function MessageBubble({ message, streamingDelta }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const content = streamingDelta ?? message.content;
  const isStreaming = streamingDelta !== undefined;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: isUser ? "75%" : "100%",
          padding: isUser ? "10px 16px" : "0",
          background: isUser
            ? "linear-gradient(135deg, var(--color-accent), #7c3aed)"
            : "transparent",
          borderRadius: isUser
            ? "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)"
            : "0",
          color: isUser ? "#fff" : "var(--color-text-primary)",
          position: "relative",
        }}
      >
        {isUser ? (
          <div style={{ fontSize: "0.9375rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {content}
          </div>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }) {
                  return (
                    <div style={{ position: "relative" }}>
                      <pre>{children}</pre>
                      <CopyButton
                        getText={() => {
                          const el = document.createElement("div");
                          el.innerHTML =
                            typeof children === "string" ? children : "";
                          return el.textContent || "";
                        }}
                      />
                    </div>
                  );
                },
                code({ className, children, ...props }) {
                  const isInline = !className;
                  if (isInline) {
                    return <code {...props}>{children}</code>;
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 16,
                  background: "var(--color-accent)",
                  borderRadius: 1,
                  animation: "pulse-glow 1s infinite",
                  verticalAlign: "text-bottom",
                  marginLeft: 2,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Try to get text from sibling code element
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may not be available
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        padding: "4px 8px",
        fontSize: "0.6875rem",
        background: "var(--color-bg-tertiary)",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
