import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatHeader } from "./ChatHeader";

vi.mock("./TelegramBotSettings", () => ({
  TelegramBotSettings: ({ chatId }: { chatId: string }) => (
    <div data-testid="telegram-settings">Telegram settings for {chatId}</div>
  ),
}));

describe("ChatHeader", () => {
  const baseProps = {
    activeExecution: null,
    connected: true,
    reconnecting: false,
    onManualReconnect: vi.fn(),
    onMenuToggle: vi.fn(),
    onChatUpdated: vi.fn(),
  };

  it("opens Telegram settings for the active chat", async () => {
    const user = userEvent.setup();

    render(
      <ChatHeader
        {...baseProps}
        chat={{
          id: "chat-1",
          title: "Test chat",
          archived: false,
          createdAt: "2026-05-04T10:00:00Z",
          updatedAt: "2026-05-04T10:05:00Z",
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Telegram" }));

    expect(screen.getByTestId("telegram-settings")).toHaveTextContent(
      "Telegram settings for chat-1"
    );
  });

  it("does not show Telegram settings when there is no active chat", () => {
    render(<ChatHeader {...baseProps} chat={null} />);

    expect(
      screen.queryByRole("button", { name: "Telegram" })
    ).not.toBeInTheDocument();
  });

  it("does not render archive actions in the header anymore", () => {
    render(
      <ChatHeader
        {...baseProps}
        chat={{
          id: "chat-1",
          title: "Test chat",
          archived: false,
          createdAt: "2026-05-04T10:00:00Z",
          updatedAt: "2026-05-04T10:05:00Z",
        }}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Archive" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unarchive" })
    ).not.toBeInTheDocument();
  });
});
