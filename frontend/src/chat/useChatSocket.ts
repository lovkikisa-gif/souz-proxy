import { useEffect, useRef, useCallback, useState } from "react";
import type { BackendEvent } from "../types/events";

interface UseChatSocketOptions {
  chatId: string | null;
  lastSeq: number;
  onEvent: (event: BackendEvent) => void;
}

export function useChatSocket({ chatId, lastSeq, onEvent }: UseChatSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const lastSeqRef = useRef(lastSeq);
  lastSeqRef.current = lastSeq;

  const connect = useCallback(() => {
    if (!chatId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/v1/chats/${chatId}/ws?afterSeq=${lastSeqRef.current}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setReconnecting(false);
      retriesRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const event: BackendEvent = JSON.parse(e.data);
        onEventRef.current(event);
      } catch {
        // ignore unparseable messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      // reconnect with exponential backoff
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current += 1;
      setReconnecting(true);

      setTimeout(() => {
        if (chatId) connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [chatId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on cleanup
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      setReconnecting(false);
      retriesRef.current = 0;
    };
  }, [connect]);

  const manualReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    retriesRef.current = 0;
    connect();
  }, [connect]);

  return { connected, reconnecting, manualReconnect };
}
