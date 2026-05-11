import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../components/app/Sidebar";
import { getChats, createChat } from "../api/chats";
import { useAuth } from "../auth/useAuth";
import type { Chat } from "../types/chat";

function pinnedChatsStorageKey(userId: string) {
  return `souz:pinned-chats:${userId}`;
}

export function AppShell() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [lastVisitedChatId, setLastVisitedChatId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { chatId } = useParams();

  const loadChats = useCallback(async () => {
    try { setChats(await getChats({ includeArchived: true })); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    if (chatId) {
      setLastVisitedChatId(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    if (!user) {
      setPinnedChatIds([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(pinnedChatsStorageKey(user.id));
      const parsed = raw ? JSON.parse(raw) : [];
      setPinnedChatIds(
        Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === "string")
          : []
      );
    } catch {
      setPinnedChatIds([]);
    }
  }, [user]);

  const handleTogglePin = useCallback((targetChatId: string) => {
    setPinnedChatIds((current) => {
      const next = current.includes(targetChatId)
        ? current.filter((chat) => chat !== targetChatId)
        : [...current, targetChatId];

      if (user) {
        try {
          window.localStorage.setItem(
            pinnedChatsStorageKey(user.id),
            JSON.stringify(next)
          );
        } catch {
          // ignore storage failures
        }
      }

      return next;
    });
  }, [user]);

  const handleNewChat = async () => {
    try {
      const chat = await createChat();
      await loadChats();
      navigate(`/chats/${chat.id}`);
      setSidebarOpen(false);
    } catch { /* ignore */ }
  };

  const handleSelectChat = (id: string) => {
    navigate(`/chats/${id}`);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
      )}
      {/* Sidebar — desktop always visible, mobile as drawer */}
      <div style={{ display: "flex", flexShrink: 0 }} className="sidebar-desktop">
        <Sidebar chats={chats} activeChatId={chatId ?? null} showArchived={showArchived}
          pinnedChatIds={pinnedChatIds} onTogglePin={handleTogglePin} onChatsChanged={loadChats}
          onToggleArchived={() => setShowArchived(!showArchived)} onNewChat={handleNewChat}
          onSelectChat={handleSelectChat} />
      </div>
      {sidebarOpen && (
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 300, zIndex: 50 }}>
          <Sidebar chats={chats} activeChatId={chatId ?? null} showArchived={showArchived}
            pinnedChatIds={pinnedChatIds} onTogglePin={handleTogglePin} onChatsChanged={loadChats}
            onToggleArchived={() => setShowArchived(!showArchived)} onNewChat={handleNewChat}
            onSelectChat={handleSelectChat} mobile onClose={() => setSidebarOpen(false)} />
        </div>
      )}
      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Outlet
          context={{
            chats,
            loadChats,
            onMenuToggle: () => setSidebarOpen(true),
            lastVisitedChatId,
          }}
        />
      </main>
      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
