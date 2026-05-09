import { useState, useCallback, useEffect, useRef } from "react";
import type { Message } from "../types/chat";
import type { BackendEvent } from "../types/events";
import { getMessages } from "../api/messages";
import { getEvents } from "../api/events";
import {
  chatReducer,
  initialChatState,
  mergeMessageFromServer,
  type ChatState,
} from "./eventReducer";
import { useChatSocket } from "./useChatSocket";

export function useChatMessages(chatId: string | null) {
  const [state, setState] = useState<ChatState>(initialChatState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load messages and replay events when chatId changes
  useEffect(() => {
    if (!chatId) {
      setState(initialChatState());
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [msgs, events] = await Promise.all([
          getMessages(chatId),
          getEvents(chatId, 0, 500),
        ]);

        if (cancelled) return;

        let newState = initialChatState();
        newState.messages = msgs;

        // Replay durable events to restore tool calls, options, execution state
        for (const event of events) {
          newState = chatReducer(newState, event);
        }

        // Merge: prefer event-sourced messages over REST-loaded if they exist
        const eventMsgIds = new Set(newState.messages.map((m) => m.id));
        const restOnlyMsgs = msgs.filter((m) => !eventMsgIds.has(m.id));
        newState.messages = [...restOnlyMsgs, ...newState.messages];

        // Deduplicate and sort
        const seen = new Set<string>();
        newState.messages = newState.messages.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        newState.messages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        setState(newState);
      } catch {
        if (!cancelled) setError("Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const handleEvent = useCallback((event: BackendEvent) => {
    setState((prev) => chatReducer(prev, event));
  }, []);

  const { connected, reconnecting, manualReconnect } = useChatSocket({
    chatId,
    lastSeq: state.lastDurableSeq,
    onEvent: handleEvent,
  });

  const addOptimisticMessage = useCallback((msg: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, msg],
    }));
  }, []);

  const applyServerMessage = useCallback((msg: Message) => {
    setState((prev) => ({
      ...prev,
      messages: mergeMessageFromServer(prev.messages, msg),
    }));
  }, []);

  return {
    ...state,
    loading,
    error,
    connected,
    reconnecting,
    manualReconnect,
    addOptimisticMessage,
    applyServerMessage,
  };
}
