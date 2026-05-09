import { useState, type CSSProperties } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { archiveChat, unarchiveChat, updateChatTitle } from "../../api/chats";
import { useAuth } from "../../auth/useAuth";
import type { Chat } from "../../types/chat";
import { Button } from "../ui/Button";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  showArchived: boolean;
  pinnedChatIds: string[];
  onTogglePin: (chatId: string) => void;
  onChatsChanged: () => Promise<void> | void;
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
  pinnedChatIds,
  onTogglePin,
  onChatsChanged,
  onToggleArchived,
  onNewChat,
  onSelectChat,
  mobile = false,
  onClose,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingChatId, setSavingChatId] = useState<string | null>(null);

  const filteredChats = chats
    .filter((chat) => (showArchived ? chat.archived : !chat.archived))
    .sort((left, right) => {
      const leftPinned = pinnedChatIds.includes(left.id);
      const rightPinned = pinnedChatIds.includes(right.id);

      if (leftPinned !== rightPinned) {
        return leftPinned ? -1 : 1;
      }

      return (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleRename = async (chat: Chat) => {
    const nextTitle = titleDraft.trim();
    setEditingChatId(null);

    if (!nextTitle || nextTitle === (chat.title ?? "")) {
      return;
    }

    setSavingChatId(chat.id);
    try {
      await updateChatTitle(chat.id, nextTitle);
      await onChatsChanged();
    } catch {
      // ignore
    } finally {
      setSavingChatId(null);
    }
  };

  const handleArchiveToggle = async (chat: Chat) => {
    setMenuChatId(null);
    setSavingChatId(chat.id);
    try {
      if (chat.archived) {
        await unarchiveChat(chat.id);
      } else {
        await archiveChat(chat.id);
      }
      await onChatsChanged();
    } catch {
      // ignore
    } finally {
      setSavingChatId(null);
    }
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
        {mobile && onClose ? (
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
        ) : null}
      </div>

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
            color: !showArchived
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
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
            color: showArchived
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Archived
        </button>
      </div>

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
            <div
              key={chat.id}
              data-testid="chat-row"
              style={{
                width: "100%",
                background:
                  chat.id === activeChatId
                    ? "var(--color-bg-tertiary)"
                    : "transparent",
                borderRadius: "var(--radius-sm)",
                marginBottom: 2,
                position: "relative",
                transition: "background 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  alignItems: "center",
                }}
              >
                {editingChatId === chat.id ? (
                  <div style={{ padding: "10px 12px", minWidth: 0 }}>
                    <input
                      aria-label="Rename chat"
                      autoFocus
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onBlur={() => void handleRename(chat)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleRename(chat);
                        }
                        if (event.key === "Escape") {
                          setEditingChatId(null);
                          setTitleDraft(chat.title ?? "");
                        }
                      }}
                      style={{
                        width: "100%",
                        background: "var(--color-bg-primary)",
                        border: "1px solid var(--color-border-active)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-text-primary)",
                        padding: "6px 8px",
                        fontSize: "0.8125rem",
                        fontFamily: "var(--font-sans)",
                        outline: "none",
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onSelectChat(chat.id);
                      onClose?.();
                    }}
                    disabled={savingChatId === chat.id}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      minWidth: 0,
                    }}
                  >
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          minWidth: 0,
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
                        {pinnedChatIds.includes(chat.id) ? (
                          <span
                            style={{
                              fontSize: "0.625rem",
                              letterSpacing: 0.2,
                              color: "var(--color-text-muted)",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      {chat.lastMessagePreview ? (
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
                      ) : null}
                    </>
                  </button>
                )}

                {editingChatId !== chat.id ? (
                  <button
                    aria-haspopup="menu"
                    aria-expanded={menuChatId === chat.id}
                    aria-label={`Chat actions for ${chat.title || "Untitled chat"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuChatId((current) => current === chat.id ? null : chat.id);
                    }}
                    style={{
                      alignSelf: "stretch",
                      background: "transparent",
                      border: "none",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      padding: "0 12px",
                      fontSize: "1rem",
                    }}
                  >
                    ...
                  </button>
                ) : null}
              </div>

              {menuChatId === chat.id ? (
                <div
                  role="menu"
                  aria-label="Chat actions"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 8,
                    minWidth: 180,
                    padding: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    background: "var(--color-bg-primary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.24)",
                    zIndex: 20,
                  }}
                >
                  <button
                    onClick={() => {
                      setEditingChatId(chat.id);
                      setTitleDraft(chat.title ?? "");
                      setMenuChatId(null);
                    }}
                    style={menuButtonStyle}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      onTogglePin(chat.id);
                      setMenuChatId(null);
                    }}
                    style={menuButtonStyle}
                  >
                    {pinnedChatIds.includes(chat.id) ? "Unpin chat" : "Pin chat"}
                  </button>
                  <button
                    onClick={() => void handleArchiveToggle(chat)}
                    style={menuButtonStyle}
                  >
                    {chat.archived ? "Restore chat" : "Archive chat"}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

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
            color: isActive
              ? "var(--color-text-primary)"
              : "var(--color-text-secondary)",
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

const menuButtonStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  cursor: "pointer",
  fontSize: "0.8125rem",
};
