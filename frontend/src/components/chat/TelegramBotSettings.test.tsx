import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import * as toast from "../ui/Toast";
import { TelegramBotSettings } from "./TelegramBotSettings";

describe("TelegramBotSettings", () => {
  beforeEach(() => {
    vi.mocked(chatsApi.getChatTelegramBot).mockResolvedValue(null);
  });

  it("loads the current binding, saves a token, and clears the input after success", async () => {
    const user = userEvent.setup();

    vi.mocked(chatsApi.upsertChatTelegramBot).mockResolvedValue({
      enabled: true,
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:05:00Z",
      lastError: null,
      lastErrorAt: null,
    });

    render(<TelegramBotSettings chatId="chat-1" />);

    expect(await screen.findByText("Not connected")).toBeInTheDocument();

    const tokenInput = screen.getByLabelText("Token");
    const saveButton = screen.getByRole("button", { name: "Save bot" });

    expect(saveButton).toBeDisabled();

    await user.type(tokenInput, " 123456:ABCDEF ");
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(chatsApi.upsertChatTelegramBot).toHaveBeenCalledWith(
        "chat-1",
        "123456:ABCDEF"
      );
    });

    expect(await screen.findByText("Telegram bot connected")).toBeInTheDocument();
    expect(tokenInput).toHaveValue("");
    expect(toast.showToast).toHaveBeenCalledWith("Telegram bot saved", "success");
  });

  it("shows a degraded status and a human-readable Telegram error", async () => {
    vi.mocked(chatsApi.getChatTelegramBot).mockResolvedValue({
      enabled: false,
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:05:00Z",
      lastError: "telegram_conflict_webhook_enabled",
      lastErrorAt: "2026-05-04T10:06:00Z",
    });

    render(<TelegramBotSettings chatId="chat-1" />);

    expect(await screen.findByText("Telegram bot disabled")).toBeInTheDocument();
    expect(
      screen.getByText(
        "У бота включен webhook. Long polling сейчас недоступен."
      )
    ).toBeInTheDocument();
  });

  it("maps backend validation errors to a user-facing message", async () => {
    const user = userEvent.setup();

    vi.mocked(chatsApi.upsertChatTelegramBot).mockRejectedValue(
      new ApiError(
        400,
        "invalid_telegram_bot_token",
        "Telegram bot token is invalid."
      )
    );

    render(<TelegramBotSettings chatId="chat-1" />);

    await screen.findByText("Not connected");
    await user.type(screen.getByLabelText("Token"), "123456:ABCDEF");
    await user.click(screen.getByRole("button", { name: "Save bot" }));

    expect(
      await screen.findByText("Неверный token Telegram-бота.")
    ).toBeInTheDocument();
  });

  it("removes a binding and reloads when chatId changes", async () => {
    const user = userEvent.setup();

    vi.mocked(chatsApi.getChatTelegramBot)
      .mockResolvedValueOnce({
        enabled: true,
        createdAt: "2026-05-04T10:00:00Z",
        updatedAt: "2026-05-04T10:05:00Z",
        lastError: null,
        lastErrorAt: null,
      })
      .mockResolvedValueOnce(null);
    vi.mocked(chatsApi.deleteChatTelegramBot).mockResolvedValue(undefined);

    const { rerender } = render(<TelegramBotSettings chatId="chat-1" />);

    expect(await screen.findByText("Telegram bot connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove bot" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Token"), "to be cleared");
    await user.click(screen.getByRole("button", { name: "Remove bot" }));

    await waitFor(() => {
      expect(chatsApi.deleteChatTelegramBot).toHaveBeenCalledWith("chat-1");
    });

    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByLabelText("Token")).toHaveValue("");
    expect(toast.showToast).toHaveBeenCalledWith(
      "Telegram bot removed",
      "success"
    );

    rerender(<TelegramBotSettings chatId="chat-2" />);

    await waitFor(() => {
      expect(chatsApi.getChatTelegramBot).toHaveBeenLastCalledWith("chat-2");
    });
    expect(await screen.findByText("Not connected")).toBeInTheDocument();
  });
});
