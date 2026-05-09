import { describe, expect, it } from "vitest";
import { chatReducer, initialChatState } from "./eventReducer";
import type { BackendEvent } from "../types/events";

function event(overrides: Partial<BackendEvent>): BackendEvent {
  return {
    seq: 1,
    durable: true,
    chatId: "chat-1",
    executionId: "exec-1",
    type: "message.delta",
    payload: {},
    createdAt: "2026-05-09T10:00:00Z",
    ...overrides,
  };
}

describe("chatReducer", () => {
  it("normalizes tool payloads and tracks the assistant message for an execution", () => {
    let state = initialChatState();

    state = chatReducer(
      state,
      event({
        type: "message.delta",
        payload: {
          messageId: "assistant-1",
          delta: "Working",
        },
      })
    );

    state = chatReducer(
      state,
      event({
        seq: 2,
        type: "tool.call.started",
        payload: {
          toolCallId: "tool-1",
          name: "read_file",
          argumentKeys: ["path"],
          argumentsPreview: {
            path: "/tmp/example.ts",
          },
        },
      })
    );

    state = chatReducer(
      state,
      event({
        seq: 3,
        type: "tool.call.finished",
        payload: {
          toolCallId: "tool-1",
          resultPreview: {
            lines: 42,
          },
          durationMs: 120,
        },
      })
    );

    expect(state.executionAssistantMessageIds["exec-1"]).toBe("assistant-1");
    expect(state.toolCalls["tool-1"]).toMatchObject({
      toolName: "read_file",
      argumentKeys: ["path"],
      status: "finished",
      durationMs: 120,
    });
    expect(state.toolCalls["tool-1"].argumentsPreview).toContain('"path": "/tmp/example.ts"');
    expect(state.toolCalls["tool-1"].resultPreview).toContain('"lines": 42');
  });
});
