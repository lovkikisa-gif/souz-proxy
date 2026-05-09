import { describe, expect, it } from "vitest";
import { chatReducer, initialChatState, mergeMessageFromServer } from "./eventReducer";
import type { BackendEvent } from "../types/events";
import type { Message } from "../types/chat";

function createPendingMessage(): Message {
  return {
    id: "optimistic-client-1",
    chatId: "chat-1",
    role: "user",
    content: "hello",
    clientMessageId: "client-1",
    createdAt: "2026-05-09T10:00:00Z",
  };
}

function createServerMessage(): Message {
  return {
    id: "msg-1",
    chatId: "chat-1",
    role: "user",
    content: "hello",
    clientMessageId: "client-1",
    createdAt: "2026-05-09T10:00:01Z",
  };
}

function createMessageCreatedEvent(): BackendEvent {
  return {
    seq: 1,
    durable: true,
    chatId: "chat-1",
    executionId: null,
    type: "message.created",
    createdAt: "2026-05-09T10:00:01Z",
    payload: {
      messageId: "msg-1",
      role: "user",
      content: "hello",
      clientMessageId: "client-1",
    },
  };
}

describe("chat message reconciliation", () => {
  it("replaces a pending message with the HTTP response message", () => {
    const pending = createPendingMessage();

    const messages = mergeMessageFromServer([pending], createServerMessage());

    expect(messages).toEqual([createServerMessage()]);
  });

  it("replaces a pending message when message.created arrives over websocket", () => {
    const state = initialChatState();
    state.messages = [createPendingMessage()];

    const next = chatReducer(state, createMessageCreatedEvent());

    expect(next.messages).toEqual([createServerMessage()]);
  });

  it("does not create a duplicate when websocket wins the race before HTTP", () => {
    const state = initialChatState();
    state.messages = [createPendingMessage()];

    const afterWs = chatReducer(state, createMessageCreatedEvent());
    const afterHttp = mergeMessageFromServer(afterWs.messages, createServerMessage());

    expect(afterHttp).toEqual([createServerMessage()]);
  });

  it("does not create a duplicate when HTTP wins the race before websocket", () => {
    const state = initialChatState();
    state.messages = mergeMessageFromServer([createPendingMessage()], createServerMessage());

    const afterWs = chatReducer(state, createMessageCreatedEvent());

    expect(afterWs.messages).toEqual([createServerMessage()]);
  });
});
