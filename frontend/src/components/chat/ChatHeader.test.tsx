import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppPreferencesProvider } from "../../preferences/AppPreferencesProvider";
import { ChatHeader } from "./ChatHeader";

const useAuthMock = vi.fn();

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("./TelegramBotSettings", () => ({
  TelegramBotSettings: ({ chatId }: { chatId: string }) => (
    <div data-testid="telegram-settings">Telegram settings for {chatId}</div>
  ),
}));

describe("ChatHeader", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      bootstrap: {
        features: {
          telegramBot: true,
        },
      },
    });
  });

  const baseProps = {
    activeExecution: null,
    connected: true,
    reconnecting: false,
    onManualReconnect: vi.fn(),
    onMenuToggle: vi.fn(),
    onChatUpdated: vi.fn(),
  };

  function renderHeader(chat: Parameters<typeof ChatHeader>[0]["chat"]) {
    return render(
      <AppPreferencesProvider>
        <ChatHeader {...baseProps} chat={chat} />
      </AppPreferencesProvider>
    );
  }

  it("opens Telegram settings for the active chat", async () => {
    const user = userEvent.setup();

    renderHeader({
      id: "chat-1",
      title: "Test chat",
      archived: false,
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:05:00Z",
    });

    await user.click(screen.getByRole("button", { name: "Telegram" }));

    expect(screen.getByTestId("telegram-settings")).toHaveTextContent(
      "Telegram settings for chat-1"
    );
  });

  it("renders a close button for Telegram settings even without a modal title", async () => {
    const user = userEvent.setup();

    renderHeader({
      id: "chat-1",
      title: "Test chat",
      archived: false,
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:05:00Z",
    });

    await user.click(screen.getByRole("button", { name: "Telegram" }));
    expect(screen.getByTestId("telegram-settings")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(screen.queryByTestId("telegram-settings")).not.toBeInTheDocument();
  });

  it("does not show Telegram settings when there is no active chat", () => {
    renderHeader(null);

    expect(
      screen.queryByRole("button", { name: "Telegram" })
    ).not.toBeInTheDocument();
  });

  it("does not render archive actions in the header anymore", () => {
    renderHeader({
      id: "chat-1",
      title: "Test chat",
      archived: false,
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:05:00Z",
    });

    expect(
      screen.queryByRole("button", { name: "Archive" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unarchive" })
    ).not.toBeInTheDocument();
  });

  it("hides Telegram actions when the backend feature is disabled", () => {
    useAuthMock.mockReturnValue({
      bootstrap: {
        features: {
          telegramBot: false,
        },
      },
    });

    renderHeader({
      id: "chat-1",
      title: "Test chat",
      archived: false,
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:05:00Z",
    });

    expect(
      screen.queryByRole("button", { name: "Telegram" })
    ).not.toBeInTheDocument();
  });
});
