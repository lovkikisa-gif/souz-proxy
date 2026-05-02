import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import type { Chat } from "../../types/chat";
import { Button } from "../ui/Button";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  showArchived: boolean;
  onToggleArchived: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  showArchived,
  onToggleArchived,
  onNewChat,
  onSelectChat,
  mobile = false,
  onClose,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const filteredChats = chats.filter((c) =>
    showArchived ? c.archived : !c.archived
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside
      style={{
        width: mobile ? "100%" : 280,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg-secondary)",
        borderRight: mobile ? "none" : "1px solid var(--color-border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 16px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, var(--color-accent), #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Souz
        </span>
        {mobile && onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "1.25rem",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* New Chat */}
      <div style={{ padding: "0 12px 12px" }}>
        <Button
          onClick={onNewChat}
          variant="secondary"
          size="sm"
          style={{ width: "100%", gap: 6 }}
        >
          <span style={{ fontSize: "1.1rem" }}>+</span> New chat
        </Button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          padding: "0 12px 8px",
          gap: 4,
        }}
      >
        <button
          onClick={() => showArchived && onToggleArchived()}
          style={{
            flex: 1,
            padding: "6px",
            fontSize: "0.75rem",
            fontWeight: 500,
            background: !showArchived ? "var(--color-bg-tertiary)" : "transparent",
            color: !showArchived ? "var(--color-text-primary)" : "var(--color-text-muted)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Recent
        </button>
        <button
          onClick={() => !showArchived && onToggleArchived()}
          style={{
            flex: 1,
            padding: "6px",
            fontSize: "0.75rem",
            fontWeight: 500,
            background: showArchived ? "var(--color-bg-tertiary)" : "transparent",
            color: showArchived ? "var(--color-text-primary)" : "var(--color-text-muted)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Archived
        </button>
      </div>

      {/* Chat list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 8px",
        }}
      >
        {filteredChats.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--color-text-muted)",
              fontSize: "0.8125rem",
            }}
          >
            {showArchived ? "No archived chats" : "No chats yet"}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                onSelectChat(chat.id);
                onClose?.();
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                textAlign: "left",
                background:
                  chat.id === activeChatId
                    ? "var(--color-bg-tertiary)"
                    : "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                marginBottom: 2,
                transition: "background 0.15s ease",
              }}
            >
              <div
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color:
                    chat.id === activeChatId
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {chat.title || "Untitled chat"}
              </div>
              {chat.lastMessagePreview && (
                <div
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {chat.lastMessagePreview}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <NavLink
          to="/settings"
          onClick={onClose}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            fontSize: "0.8125rem",
            color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            background: isActive ? "var(--color-bg-tertiary)" : "transparent",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            transition: "all 0.15s ease",
          })}
        >
          ⚙ Settings
        </NavLink>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.username}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              transition: "color 0.15s ease",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
