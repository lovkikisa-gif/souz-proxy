import type { Message, ToolCall, OptionRequest, Execution } from "../types/chat";
import type { BackendEvent } from "../types/events";

export interface ChatState {
  messages: Message[];
  streamingContent: Record<string, string>; // messageId -> accumulated delta
  toolCalls: Record<string, ToolCall>; // toolCallId -> ToolCall
  options: Record<string, OptionRequest>; // optionId -> OptionRequest
  activeExecution: Execution | null;
  executionAssistantMessageIds: Record<string, string>;
  lastDurableSeq: number;
  processedSeqs: Set<number>;
}

function serializePreview(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function withAssistantMessageId(
  state: ChatState,
  executionId: string | null,
  messageId: string | null
): ChatState {
  if (!executionId || !messageId) {
    return state;
  }

  if (state.executionAssistantMessageIds[executionId] === messageId) {
    return state;
  }

  return {
    ...state,
    executionAssistantMessageIds: {
      ...state.executionAssistantMessageIds,
      [executionId]: messageId,
    },
  };
}

export function initialChatState(): ChatState {
  return {
    messages: [],
    streamingContent: {},
    toolCalls: {},
    options: {},
    activeExecution: null,
    executionAssistantMessageIds: {},
    lastDurableSeq: 0,
    processedSeqs: new Set(),
  };
}

export function mergeMessageFromServer(
  messages: Message[],
  serverMessage: Message
): Message[] {
  let hasServerMessage = false;
  const nextMessages: Message[] = [];

  for (const message of messages) {
    if (message.id === serverMessage.id) {
      if (!hasServerMessage) {
        nextMessages.push({ ...message, ...serverMessage });
        hasServerMessage = true;
      }
      continue;
    }

    const matchesPending =
      serverMessage.clientMessageId != null &&
      message.clientMessageId === serverMessage.clientMessageId;

    if (matchesPending) {
      if (!hasServerMessage) {
        nextMessages.push(serverMessage);
        hasServerMessage = true;
      }
      continue;
    }

    nextMessages.push(message);
  }

  if (!hasServerMessage) {
    nextMessages.push(serverMessage);
  }

  return nextMessages;
}

export function chatReducer(state: ChatState, event: BackendEvent): ChatState {
  // Idempotency: skip already-processed durable events
  if (event.durable && event.seq !== null) {
    if (state.processedSeqs.has(event.seq)) {
      return state;
    }
  }

  const newProcessedSeqs = new Set(state.processedSeqs);
  if (event.durable && event.seq !== null) {
    newProcessedSeqs.add(event.seq);
  }

  const newLastSeq =
    event.durable && event.seq !== null
      ? Math.max(state.lastDurableSeq, event.seq)
      : state.lastDurableSeq;

  const base = {
    ...state,
    lastDurableSeq: newLastSeq,
    processedSeqs: newProcessedSeqs,
  };

  const p = event.payload;

  switch (event.type) {
    case "message.created": {
      const msgId = p.messageId as string;
      const role = p.role as "user" | "assistant" | "system";
      const nextState =
        role === "assistant"
        ? withAssistantMessageId(base, event.executionId, msgId)
        : base;
      const newMsg: Message = {
        id: msgId,
        chatId: event.chatId,
        role,
        content: (p.content as string) ?? "",
        clientMessageId: p.clientMessageId as string | null,
        createdAt: event.createdAt,
      };
      return {
        ...nextState,
        messages: mergeMessageFromServer(nextState.messages, newMsg),
      };
    }

    case "message.delta": {
      const msgId = p.messageId as string;
      const delta = p.delta as string;
      const current = state.streamingContent[msgId] ?? "";
      const nextState = withAssistantMessageId(base, event.executionId, msgId);
      return {
        ...nextState,
        streamingContent: {
          ...nextState.streamingContent,
          [msgId]: current + delta,
        },
      };
    }

    case "message.completed": {
      const msgId = p.messageId as string;
      const nextState = withAssistantMessageId(base, event.executionId, msgId);
      const finalContent =
        (p.content as string) ??
        nextState.streamingContent[msgId] ??
        "";
      const messages = nextState.messages.map((m) =>
        m.id === msgId ? { ...m, content: finalContent } : m
      );
      // If message doesn't exist yet, add it
      if (!messages.find((m) => m.id === msgId)) {
        messages.push({
          id: msgId,
          chatId: event.chatId,
          role: "assistant",
          content: finalContent,
          createdAt: event.createdAt,
        });
      }
      const newStreaming = { ...nextState.streamingContent };
      delete newStreaming[msgId];
      return { ...nextState, messages, streamingContent: newStreaming };
    }

    case "tool.call.started": {
      const tcId = p.toolCallId as string;
      const tc: ToolCall = {
        id: tcId,
        executionId: event.executionId ?? "",
        toolName: (p.toolName as string) ?? (p.name as string) ?? "tool",
        status: "running",
        argumentKeys: (p.argumentKeys as string[]) ?? [],
        argumentsPreview: serializePreview(p.argumentsPreview),
        resultPreview: null,
        error: null,
        durationMs: null,
      };
      return {
        ...base,
        toolCalls: { ...base.toolCalls, [tcId]: tc },
      };
    }

    case "tool.call.finished": {
      const tcId = p.toolCallId as string;
      const existing = base.toolCalls[tcId];
      if (!existing) return base;
      return {
        ...base,
        toolCalls: {
          ...base.toolCalls,
          [tcId]: {
            ...existing,
            status: "finished",
            resultPreview: serializePreview(p.resultPreview),
            durationMs: (p.durationMs as number) ?? null,
          },
        },
      };
    }

    case "tool.call.failed": {
      const tcId = p.toolCallId as string;
      const existing = base.toolCalls[tcId];
      if (!existing) return base;
      return {
        ...base,
        toolCalls: {
          ...base.toolCalls,
          [tcId]: {
            ...existing,
            status: "failed",
            error: (p.error as string) ?? "Unknown error",
            durationMs: (p.durationMs as number) ?? null,
          },
        },
      };
    }

    case "option.requested": {
      const optionId = p.optionId as string;
      const opt: OptionRequest = {
        optionId,
        executionId: event.executionId ?? "",
        title: (p.title as string) ?? "Input needed",
        content: (p.content as string) ?? null,
        selectionMode: (p.selectionMode as "single" | "multiple") ?? "single",
        options: (p.options as OptionRequest["options"]) ?? [],
        allowFreeText: (p.allowFreeText as boolean) ?? false,
        status: "pending",
      };
      return {
        ...base,
        options: { ...base.options, [optionId]: opt },
      };
    }

    case "option.answered": {
      const optionId = p.optionId as string;
      const existing = base.options[optionId];
      if (!existing) return base;
      return {
        ...base,
        options: {
          ...base.options,
          [optionId]: {
            ...existing,
            status: "answered",
            selectedOptionIds: (p.selectedOptionIds as string[]) ?? [],
            freeText: (p.freeText as string) ?? null,
          },
        },
      };
    }

    case "execution.started": {
      const exec: Execution = {
        id: (p.executionId as string) ?? event.executionId ?? "",
        chatId: event.chatId,
        status: "running",
      };
      return { ...base, activeExecution: exec };
    }

    case "execution.finished": {
      return {
        ...withAssistantMessageId(
          base,
          event.executionId,
          (p.assistantMessageId as string) ?? null
        ),
        activeExecution: null,
      };
    }

    case "execution.failed": {
      return {
        ...withAssistantMessageId(
          base,
          event.executionId,
          (p.assistantMessageId as string) ?? null
        ),
        activeExecution: null,
      };
    }

    case "execution.cancelled": {
      return {
        ...withAssistantMessageId(
          base,
          event.executionId,
          (p.assistantMessageId as string) ?? null
        ),
        activeExecution: null,
      };
    }

    default:
      return base;
  }
}
