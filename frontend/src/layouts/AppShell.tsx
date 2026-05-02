import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../components/app/Sidebar";
import { getChats, createChat } from "../api/chats";
import type { Chat } from "../types/chat";

export function AppShell() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { chatId } = useParams();

  const loadChats = useCallback(async () => {
    try { setChats(await getChats()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

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
          onToggleArchived={() => setShowArchived(!showArchived)} onNewChat={handleNewChat}
          onSelectChat={handleSelectChat} />
      </div>
      {sidebarOpen && (
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 300, zIndex: 50 }}>
          <Sidebar chats={chats} activeChatId={chatId ?? null} showArchived={showArchived}
            onToggleArchived={() => setShowArchived(!showArchived)} onNewChat={handleNewChat}
            onSelectChat={handleSelectChat} mobile onClose={() => setSidebarOpen(false)} />
        </div>
      )}
      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Outlet context={{ chats, loadChats, onMenuToggle: () => setSidebarOpen(true) }} />
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
