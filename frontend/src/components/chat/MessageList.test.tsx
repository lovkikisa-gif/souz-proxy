import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageList } from "./MessageList";

describe("MessageList", () => {
  it("renders tool activity under the assistant message that owns the execution", () => {
    render(
      <MessageList
        messages={[
          {
            id: "assistant-1",
            chatId: "chat-1",
            role: "assistant",
            content: "First response",
            createdAt: "2026-05-09T10:00:00Z",
          },
          {
            id: "assistant-2",
            chatId: "chat-1",
            role: "assistant",
            content: "Second response",
            createdAt: "2026-05-09T10:01:00Z",
          },
        ]}
        streamingContent={{}}
        toolCalls={{
          "tool-1": {
            id: "tool-1",
            executionId: "exec-2",
            toolName: "read_file",
            status: "finished",
            argumentsPreview: '{"path":"/tmp/example.ts"}',
            resultPreview: '{"lines":42}',
            error: null,
            durationMs: 120,
            argumentKeys: ["path"],
          },
        }}
        executionAssistantMessageIds={{
          "exec-2": "assistant-2",
        }}
        options={{}}
        onOptionAnswered={() => {}}
      />
    );

    const secondMessage = screen.getByTestId("message-assistant-2");
    expect(within(secondMessage).getByText("Tool activity")).toBeInTheDocument();
    expect(within(secondMessage).getByText("read_file")).toBeInTheDocument();
    expect(within(secondMessage).getByText(/path/i)).toBeInTheDocument();

    const firstMessage = screen.getByTestId("message-assistant-1");
    expect(
      within(firstMessage).queryByText("Tool activity")
    ).not.toBeInTheDocument();
  });
});
