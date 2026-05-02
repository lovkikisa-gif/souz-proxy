import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { sendMessage } from "../api/messages";
import { createChat } from "../api/chats";
import { cancelActiveExecution } from "../api/executions";
import type { Message, CreateMessageRequest } from "../types/chat";

interface UseActiveChatOptions {
  chatId: string | null;
  hasActiveExecution: boolean;
  addOptimisticMessage: (msg: Message) => void;
  onChatCreated?: (chatId: string) => void;
}

export function useActiveChat({
  chatId,
  hasActiveExecution,
  addOptimisticMessage,
  onChatCreated,
}: UseActiveChatOptions) {
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const send = useCallback(
    async (content: string, options?: CreateMessageRequest["options"]) => {
      if (!content.trim() || sending || hasActiveExecution) return;

      let targetChatId = chatId;

      // Auto-create chat if none selected
      if (!targetChatId) {
        try {
          const chat = await createChat();
          targetChatId = chat.id;
          onChatCreated?.(targetChatId);
        } catch {
          return;
        }
      }

      const clientMessageId = uuidv4();

      // Optimistic message
      const optimistic: Message = {
        id: `optimistic-${clientMessageId}`,
        chatId: targetChatId,
        role: "user",
        content,
        clientMessageId,
        createdAt: new Date().toISOString(),
      };
      addOptimisticMessage(optimistic);

      setSending(true);
      try {
        await sendMessage(targetChatId, {
          content,
          clientMessageId,
          options,
        });
      } catch {
        // error handling — could show toast
      } finally {
        setSending(false);
      }
    },
    [chatId, sending, hasActiveExecution, addOptimisticMessage, onChatCreated]
  );

  const cancel = useCallback(async () => {
    if (!chatId || cancelling) return;
    setCancelling(true);
    try {
      await cancelActiveExecution(chatId);
    } catch {
      // best-effort
    } finally {
      setCancelling(false);
    }
  }, [chatId, cancelling]);

  return { send, cancel, sending, cancelling };
}
