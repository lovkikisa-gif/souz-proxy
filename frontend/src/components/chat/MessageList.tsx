import { useRef, useEffect } from "react";
import type { Message, ToolCall, OptionRequest } from "../../types/chat";
import { MessageBubble } from "./MessageBubble";
import { ToolActivity } from "./ToolActivity";
import { OptionCard } from "./OptionCard";

interface MessageListProps {
  messages: Message[];
  streamingContent: Record<string, string>;
  toolCalls: Record<string, ToolCall>;
  options: Record<string, OptionRequest>;
  onOptionAnswered: () => void;
}

export function MessageList({
  messages,
  streamingContent,
  toolCalls,
  options,
  onOptionAnswered,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent, Object.keys(toolCalls).length]);

  if (messages.length === 0 && Object.keys(streamingContent).length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: "var(--color-text-muted)",
          padding: 32,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(167,139,250,0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
          }}
        >
          💬
        </div>
        <p style={{ fontSize: "0.9375rem" }}>Start a conversation</p>
        <p style={{ fontSize: "0.8125rem", maxWidth: 300, textAlign: "center" }}>
          Ask anything — Souz will help you with code, research, and more.
        </p>
      </div>
    );
  }

  // Collect tool calls and options by execution to show them after messages
  const toolCallList = Object.values(toolCalls);
  const optionList = Object.values(options);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 0",
      }}
    >
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "0 20px" }}>
        {messages.map((msg) => {
          const streaming = streamingContent[msg.id];
          // Find tool calls for this message's context
          const isAssistant = msg.role === "assistant";

          return (
            <div key={msg.id} className="animate-fade-in">
              <MessageBubble
                message={msg}
                streamingDelta={streaming}
              />
            </div>
          );
        })}

        {/* Streaming messages not yet in the messages array */}
        {Object.entries(streamingContent)
          .filter(([id]) => !messages.some((m) => m.id === id))
          .map(([id, content]) => (
            <div key={id} className="animate-fade-in">
              <MessageBubble
                message={{
                  id,
                  chatId: "",
                  role: "assistant",
                  content: "",
                  createdAt: new Date().toISOString(),
                }}
                streamingDelta={content}
              />
            </div>
          ))}

        {/* Tool activity */}
        {toolCallList.length > 0 && (
          <ToolActivity toolCalls={toolCallList} />
        )}

        {/* Option cards */}
        {optionList
          .filter((o) => o.status === "pending")
          .map((opt) => (
            <OptionCard
              key={opt.optionId}
              option={opt}
              onAnswered={onOptionAnswered}
            />
          ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
