import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../types/api";

vi.mock("../../api/chats", () => ({
  getChatTelegramBot: vi.fn(),
  upsertChatTelegramBot: vi.fn(),
  deleteChatTelegramBot: vi.fn(),
}));

vi.mock("../ui/Toast", () => ({
  showToast: vi.fn(),
}));

import * as chatsApi from "../../api/chats";
import { TelegramBotSettings } from "./TelegramBotSettings";

const pendingBinding = {
  chatId: "chat-1",
  enabled: true,
  botUsername: "souz_helper_bot",
  botFirstName: "Souz Helper",
  createdAt: "2026-05-04T10:00:00Z",
  updatedAt: "2026-05-04T10:05:00Z",
  linked: false,
};

const linkedBinding = {
  ...pendingBinding,
  linked: true,
  telegramUsername: "telegram_alice",
  telegramFirstName: "Alice",
  telegramLastName: "Walker",
  linkedAt: "2026-05-04T10:10:00Z",
};

describe("TelegramBotSettings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(chatsApi.getChatTelegramBot).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a password token input, show-hide toggle, and connect action when no binding exists", async () => {
    const user = userEvent.setup();

    render(<TelegramBotSettings chatId="chat-1" />);

    const tokenInput = await screen.findByLabelText("Bot token");
    expect(tokenInput).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: "Connect bot" })
    ).toBeDisabled();
    expect(screen.getByText("Token можно получить у @BotFather.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(tokenInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("clears the token input after save, refetches binding, and does not leave the token in the DOM", async () => {
    const user = userEvent.setup();

    vi.mocked(chatsApi.getChatTelegramBot)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingBinding);
    vi.mocked(chatsApi.upsertChatTelegramBot).mockResolvedValue(pendingBinding);

    render(<TelegramBotSettings chatId="chat-1" />);

    const tokenInput = await screen.findByLabelText("Bot token");
    await user.type(tokenInput, " 123456789:AAsecret-token ");
    await user.click(screen.getByRole("button", { name: "Connect bot" }));

    await waitFor(() => {
      expect(chatsApi.upsertChatTelegramBot).toHaveBeenCalledWith(
        "chat-1",
        "123456789:AAsecret-token",
        true
      );
    });
    await waitFor(() => {
      expect(chatsApi.getChatTelegramBot).toHaveBeenNthCalledWith(2, "chat-1");
    });

    expect(await screen.findByText("Waiting for Telegram")).toBeInTheDocument();
    expect(screen.queryByLabelText("Bot token")).not.toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("123456789:AAsecret-token")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("123456789:AAsecret-token")).not.toBeInTheDocument();
  });

  it("shows the pending instruction while waiting for the first Telegram private message", async () => {
    vi.mocked(chatsApi.getChatTelegramBot).mockResolvedValue(pendingBinding);

    render(<TelegramBotSettings chatId="chat-1" />);

    expect(await screen.findByText("Waiting for Telegram")).toBeInTheDocument();
    expect(
      screen.getByText("Напишите любое сообщение вашему боту в Telegram.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Первый Telegram-аккаунт, который напишет этому боту, будет привязан к этому чату Souz. После этого сообщения от других аккаунтов будут игнорироваться."
      )
    ).toBeInTheDocument();
  });

  it("shows a t.me link when the pending binding includes a bot username", async () => {
    vi.mocked(chatsApi.getChatTelegramBot).mockResolvedValue(pendingBinding);

    render(<TelegramBotSettings chatId="chat-1" />);

    const openLink = await screen.findByRole("link", {
      name: "Open Telegram bot",
    });
    expect(openLink).toHaveAttribute(
      "href",
      "https://t.me/souz_helper_bot"
    );
  });

  it("shows the connected status and linked Telegram account details", async () => {
    vi.mocked(chatsApi.getChatTelegramBot).mockResolvedValue(linkedBinding);

    render(<TelegramBotSettings chatId="chat-1" />);

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("@souz_helper_bot")).toBeInTheDocument();
    expect(screen.getByText("@telegram_alice")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Теперь сообщения из этого Telegram-аккаунта будут отправляться агенту в этот Souz chat."
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Linked on/i)).toBeInTheDocument();
  });

  it("disconnects the binding and returns the UI to the empty state", async () => {
    const user = userEvent.setup();

    vi.mocked(chatsApi.getChatTelegramBot).mockResolvedValue(linkedBinding);
    vi.mocked(chatsApi.deleteChatTelegramBot).mockResolvedValue(undefined);

    render(<TelegramBotSettings chatId="chat-1" />);

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    await waitFor(() => {
      expect(chatsApi.deleteChatTelegramBot).toHaveBeenCalledWith("chat-1");
    });

    expect(
      await screen.findByRole("button", { name: "Connect bot" })
    ).toBeInTheDocument();
    expect(screen.queryByText("@telegram_alice")).not.toBeInTheDocument();
  });

  it(
    "polls pending status until the binding becomes linked and then stops polling",
    async () => {
    vi.useFakeTimers();

    vi.mocked(chatsApi.getChatTelegramBot)
      .mockResolvedValueOnce(pendingBinding)
      .mockResolvedValueOnce(pendingBinding)
      .mockResolvedValueOnce(linkedBinding);

    render(<TelegramBotSettings chatId="chat-1" />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Waiting for Telegram")).toBeInTheDocument();
    expect(chatsApi.getChatTelegramBot).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(chatsApi.getChatTelegramBot).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(chatsApi.getChatTelegramBot).toHaveBeenCalledTimes(3);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(chatsApi.getChatTelegramBot).toHaveBeenCalledTimes(3);
    },
    10000
  );

  it("shows a Telegram-specific validation error for invalid tokens", async () => {
    const user = userEvent.setup();

    vi.mocked(chatsApi.upsertChatTelegramBot).mockRejectedValue(
      new ApiError(
        400,
        "invalid_telegram_bot_token",
        "Telegram rejected this token."
      )
    );

    render(<TelegramBotSettings chatId="chat-1" />);

    await screen.findByRole("button", { name: "Connect bot" });
    await user.type(screen.getByLabelText("Bot token"), "123456789:AAsecret");
    await user.click(screen.getByRole("button", { name: "Connect bot" }));

    expect(
      await screen.findByText(
        "Telegram rejected this token. Check that you copied it from @BotFather."
      )
    ).toBeInTheDocument();
  });

  it("falls back to a generic error when an API error message includes the token", async () => {
    const user = userEvent.setup();

    vi.mocked(chatsApi.upsertChatTelegramBot).mockRejectedValue(
      new ApiError(
        400,
        "backend_error",
        "Token 123456789:AAsecret-token was rejected."
      )
    );

    render(<TelegramBotSettings chatId="chat-1" />);

    await screen.findByRole("button", { name: "Connect bot" });
    await user.type(screen.getByLabelText("Bot token"), "123456789:AAsecret-token");
    await user.click(screen.getByRole("button", { name: "Connect bot" }));

    expect(
      await screen.findByText(
        "Could not update Telegram bot settings. Try again."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("123456789:AAsecret-token")).not.toBeInTheDocument();
  });
});
