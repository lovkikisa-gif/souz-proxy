import { useParams, useOutletContext } from "react-router-dom";
import { useChatMessages } from "../chat/useChatMessages";
import { useActiveChat } from "../chat/useActiveChat";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { Composer } from "../components/chat/Composer";
import type { Chat } from "../types/chat";

interface OutletCtx {
  chats: Chat[];
  loadChats: () => Promise<void>;
  onMenuToggle: () => void;
}

export function ChatPage() {
  const { chatId } = useParams();
  const { chats, loadChats, onMenuToggle } = useOutletContext<OutletCtx>();
  const chat = chats.find((c) => c.id === chatId) ?? null;

  const {
    messages, streamingContent, toolCalls, options,
    activeExecution, loading, connected, reconnecting,
    manualReconnect, addOptimisticMessage,
  } = useChatMessages(chatId ?? null);

  const { send, cancel, sending, cancelling } = useActiveChat({
    chatId: chatId ?? null,
    hasActiveExecution: activeExecution !== null,
    addOptimisticMessage,
    onChatCreated: () => loadChats(),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ChatHeader chat={chat} activeExecution={activeExecution}
        connected={connected} reconnecting={reconnecting}
        onManualReconnect={manualReconnect} onMenuToggle={onMenuToggle}
        onChatUpdated={loadChats} />
      <MessageList messages={messages} streamingContent={streamingContent}
        toolCalls={toolCalls} options={options} onOptionAnswered={() => {}} />
      <Composer onSend={send} onCancel={cancel} sending={sending}
        hasActiveExecution={activeExecution !== null} cancelling={cancelling} />
    </div>
  );
}
