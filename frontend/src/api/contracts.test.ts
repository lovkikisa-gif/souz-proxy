import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createChat,
  deleteChatTelegramBot,
  getChatTelegramBot,
  getChats,
  upsertChatTelegramBot,
} from "./chats";
import { getSettings, updateSettings } from "./settings";
import { getProviderKeys } from "./providerKeys";
import { getMessages, sendMessage } from "./messages";
import { getEvents } from "./events";
import { completeOnboarding } from "./onboarding";
import { setProviderKey } from "./providerKeys";
import { answerOption } from "./options";
import { cancelActiveExecution } from "./executions";

describe("backend v1 response contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unwraps chat list and chat create envelopes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          items: [
            {
              id: "chat-1",
              title: "First chat",
              archived: false,
              createdAt: "2026-05-03T18:00:00Z",
              updatedAt: "2026-05-03T18:01:00Z",
              lastMessagePreview: "hello",
            },
          ],
          nextCursor: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({
          chat: {
            id: "chat-2",
            title: "Created chat",
            archived: false,
            createdAt: "2026-05-03T18:02:00Z",
            updatedAt: "2026-05-03T18:02:00Z",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getChats()).resolves.toEqual([
      {
        id: "chat-1",
        title: "First chat",
        archived: false,
        createdAt: "2026-05-03T18:00:00Z",
        updatedAt: "2026-05-03T18:01:00Z",
        lastMessagePreview: "hello",
      },
    ]);

    await expect(createChat()).resolves.toEqual({
      id: "chat-2",
      title: "Created chat",
      archived: false,
      createdAt: "2026-05-03T18:02:00Z",
      updatedAt: "2026-05-03T18:02:00Z",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/v1/chats",
      expect.objectContaining({
        method: "POST",
        body: "{}",
      })
    );
  });

  it("includes archived chat query params when requested", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getChats({ includeArchived: true, limit: 50 })).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/chats?includeArchived=true&limit=50",
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("unwraps telegram bot envelopes and hides delete payloads from callers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          telegramBot: {
            chatId: "chat-1",
            enabled: true,
            botUsername: "souz_helper_bot",
            botFirstName: "Souz Helper",
            createdAt: "2026-05-04T10:00:00Z",
            updatedAt: "2026-05-04T10:00:00Z",
            linked: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          telegramBot: {
            chatId: "chat-1",
            enabled: true,
            botUsername: "souz_helper_bot",
            botFirstName: "Souz Helper",
            createdAt: "2026-05-04T10:00:00Z",
            updatedAt: "2026-05-04T10:05:00Z",
            linked: true,
            telegramUsername: "telegram_alice",
            telegramFirstName: "Alice",
            telegramLastName: "Walker",
            linkedAt: "2026-05-04T10:05:00Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          telegramBot: null,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getChatTelegramBot("chat-1")).resolves.toEqual({
      chatId: "chat-1",
      enabled: true,
      botUsername: "souz_helper_bot",
      botFirstName: "Souz Helper",
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:00:00Z",
      linked: false,
    });

    await expect(
      upsertChatTelegramBot("chat-1", "123456:ABCDEF")
    ).resolves.toEqual({
      chatId: "chat-1",
      enabled: true,
      botUsername: "souz_helper_bot",
      botFirstName: "Souz Helper",
      createdAt: "2026-05-04T10:00:00Z",
      updatedAt: "2026-05-04T10:05:00Z",
      linked: true,
      telegramUsername: "telegram_alice",
      telegramFirstName: "Alice",
      telegramLastName: "Walker",
      linkedAt: "2026-05-04T10:05:00Z",
    });

    await expect(deleteChatTelegramBot("chat-1")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/v1/chats/chat-1/telegram-bot",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/v1/chats/chat-1/telegram-bot",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ botToken: "123456:ABCDEF", enabled: true }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/v1/chats/chat-1/telegram-bot",
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("unwraps settings and provider key list envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            settings: {
              defaultModel: "GigaChat-Max",
              contextSize: 32000,
              temperature: 0.7,
              locale: "ru-RU",
              timeZone: "Europe/Moscow",
              systemPrompt: null,
              enabledTools: ["shell"],
              showToolEvents: true,
              streamingMessages: true,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            settings: {
              defaultModel: "gpt-5-nano",
              contextSize: 64000,
              temperature: 0.2,
              locale: "en-US",
              timeZone: "UTC",
              systemPrompt: "be concise",
              enabledTools: [],
              showToolEvents: false,
              streamingMessages: false,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            items: [
              {
                provider: "openai",
                configured: true,
                keyHint: "...1234",
                updatedAt: "2026-05-03T18:03:00Z",
              },
            ],
          }),
        })
    );

    await expect(getSettings()).resolves.toEqual({
      defaultModel: "GigaChat-Max",
      contextSize: 32000,
      temperature: 0.7,
      locale: "ru-RU",
      timeZone: "Europe/Moscow",
      systemPrompt: null,
      enabledTools: ["shell"],
      showToolEvents: true,
      streamingMessages: true,
    });

    await expect(updateSettings({ defaultModel: "gpt-5-nano" })).resolves.toEqual({
      defaultModel: "gpt-5-nano",
      contextSize: 64000,
      temperature: 0.2,
      locale: "en-US",
      timeZone: "UTC",
      systemPrompt: "be concise",
      enabledTools: [],
      showToolEvents: false,
      streamingMessages: false,
    });

    await expect(getProviderKeys()).resolves.toEqual([
      {
        provider: "openai",
        configured: true,
        keyHint: "...1234",
        updatedAt: "2026-05-03T18:03:00Z",
      },
    ]);

    expect((fetch as typeof globalThis.fetch & ReturnType<typeof vi.fn>)).toHaveBeenNthCalledWith(
      2,
      "/v1/me/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ defaultModel: "gpt-5-nano" }),
      })
    );
  });

  it("unwraps messages, events, and send message envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            items: [
              {
                id: "msg-1",
                chatId: "chat-1",
                role: "user",
                content: "hello",
                createdAt: "2026-05-03T18:04:00Z",
              },
            ],
            nextBeforeSeq: null,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            items: [
              {
                seq: 1,
                type: "message.created",
                chatId: "chat-1",
                executionId: null,
                createdAt: "2026-05-03T18:04:01Z",
                durable: true,
                payload: {
                  messageId: "msg-1",
                  role: "user",
                  content: "hello",
                },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: vi.fn().mockResolvedValue({
            message: {
              id: "msg-2",
              chatId: "chat-1",
              role: "user",
              content: "ping",
              clientMessageId: "client-1",
              createdAt: "2026-05-03T18:04:02Z",
            },
            assistantMessage: null,
            execution: {
              id: "exec-1",
              chatId: "chat-1",
              status: "running",
            },
          }),
        })
    );

    await expect(getMessages("chat-1")).resolves.toEqual([
      {
        id: "msg-1",
        chatId: "chat-1",
        role: "user",
        content: "hello",
        createdAt: "2026-05-03T18:04:00Z",
      },
    ]);

    await expect(getEvents("chat-1")).resolves.toEqual([
      {
        seq: 1,
        type: "message.created",
        chatId: "chat-1",
        executionId: null,
        createdAt: "2026-05-03T18:04:01Z",
        durable: true,
        payload: {
          messageId: "msg-1",
          role: "user",
          content: "hello",
        },
      },
    ]);

    await expect(
      sendMessage("chat-1", {
        content: "ping",
        clientMessageId: "client-1",
      })
    ).resolves.toEqual({
      id: "msg-2",
      chatId: "chat-1",
      role: "user",
      content: "ping",
      clientMessageId: "client-1",
      createdAt: "2026-05-03T18:04:02Z",
    });

    expect((fetch as typeof globalThis.fetch & ReturnType<typeof vi.fn>)).toHaveBeenNthCalledWith(
      3,
      "/v1/chats/chat-1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          content: "ping",
          clientMessageId: "client-1",
        }),
      })
    );
  });

  it("sends valid JSON bodies for onboarding, provider keys, option answers, and execution cancels", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          completed: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          providerKey: {
            provider: "openai",
            configured: true,
            keyHint: "...1234",
            updatedAt: "2026-05-03T18:03:00Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          option: {
            id: "opt-1",
            status: "answered",
          },
          execution: {
            id: "exec-1",
            chatId: "chat-1",
            status: "waiting_option",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          execution: {
            id: "exec-1",
            chatId: "chat-1",
            status: "cancelling",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      completeOnboarding({
        defaultModel: "gpt-5",
        locale: "en-US",
        timeZone: "UTC",
        enabledTools: ["shell"],
        showToolEvents: true,
        streamingMessages: true,
      })
    ).resolves.toEqual({ completed: true });

    await expect(setProviderKey("openai", "sk-test")).resolves.toEqual({
      provider: "openai",
      configured: true,
      keyHint: "...1234",
      updatedAt: "2026-05-03T18:03:00Z",
    });

    await expect(
      answerOption("opt-1", {
        selectedOptionIds: ["choice-1"],
        freeText: "extra",
        metadata: { source: "ui" },
      })
    ).resolves.toEqual({
      option: {
        id: "opt-1",
        status: "answered",
      },
      execution: {
        id: "exec-1",
        chatId: "chat-1",
        status: "waiting_option",
        error: null,
        usage: null,
      },
    });

    await expect(cancelActiveExecution("chat-1")).resolves.toEqual({
      id: "exec-1",
      chatId: "chat-1",
      status: "cancelling",
      error: null,
      usage: null,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/v1/onboarding/complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          defaultModel: "gpt-5",
          locale: "en-US",
          timeZone: "UTC",
          enabledTools: ["shell"],
          showToolEvents: true,
          streamingMessages: true,
        }),
      })
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/v1/me/provider-keys/openai",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ apiKey: "sk-test" }),
      })
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/v1/options/opt-1/answer",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          selectedOptionIds: ["choice-1"],
          freeText: "extra",
          metadata: { source: "ui" },
        }),
      })
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/v1/chats/chat-1/cancel-active",
      expect.objectContaining({
        method: "POST",
        body: undefined,
      })
    );
  });
});
