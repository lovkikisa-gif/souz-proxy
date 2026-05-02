import { useState } from "react";
import type { Chat } from "../../types/chat";
import { updateChatTitle, archiveChat, unarchiveChat } from "../../api/chats";
import type { Execution } from "../../types/chat";

interface ChatHeaderProps {
  chat: Chat | null;
  activeExecution: Execution | null;
  connected: boolean;
  reconnecting: boolean;
  onManualReconnect: () => void;
  onMenuToggle: () => void;
  onChatUpdated: () => void;
}

export function ChatHeader({
  chat,
  activeExecution,
  connected,
  reconnecting,
  onManualReconnect,
  onMenuToggle,
  onChatUpdated,
}: ChatHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");

  const handleRename = async () => {
    if (!chat || !title.trim()) {
      setEditing(false);
      return;
    }
    try {
      await updateChatTitle(chat.id, title.trim());
      onChatUpdated();
    } catch {
      // ignore
    }
    setEditing(false);
  };

  const handleArchive = async () => {
    if (!chat) return;
    try {
      if (chat.archived) {
        await unarchiveChat(chat.id);
      } else {
        await archiveChat(chat.id);
      }
      onChatUpdated();
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        height: 56,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onMenuToggle}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "1.25rem",
            display: "none",
          }}
          className="mobile-menu-btn"
        >
          ☰
        </button>

        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            style={{
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border-active)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "4px 8px",
              fontSize: "0.875rem",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: chat ? "pointer" : "default",
            }}
            onClick={() => {
              if (chat) {
                setTitle(chat.title || "");
                setEditing(true);
              }
            }}
          >
            {chat?.title || "New chat"}
          </span>
        )}

        {activeExecution && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 8px",
              background: "rgba(139, 92, 246, 0.15)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.6875rem",
              color: "var(--color-accent)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-accent)",
                animation: "pulse-glow 2s infinite",
              }}
            />
            {activeExecution.status}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Connection status */}
        {!connected && (
          <button
            onClick={onManualReconnect}
            style={{
              padding: "4px 10px",
              fontSize: "0.6875rem",
              background: reconnecting
                ? "rgba(251, 191, 36, 0.15)"
                : "rgba(248, 113, 113, 0.15)",
              color: reconnecting ? "var(--color-warning)" : "var(--color-error)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            {reconnecting ? "Reconnecting…" : "Disconnected — retry"}
          </button>
        )}

        {chat && (
          <button
            onClick={handleArchive}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "4px 8px",
            }}
          >
            {chat.archived ? "Unarchive" : "Archive"}
          </button>
        )}
      </div>
    </div>
  );
}
