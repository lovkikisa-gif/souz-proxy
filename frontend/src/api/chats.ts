import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./http";
import type { Chat } from "../types/chat";
import { requireFieldResponse, unwrapItemsResponse } from "./responses";

export type TelegramBotBindingDto = {
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
  lastErrorAt?: string | null;
};

export async function getChats(): Promise<Chat[]> {
  return unwrapItemsResponse(
    await apiGet<{ items?: Chat[] | null } | Chat[]>("/v1/chats")
  );
}

export async function createChat(): Promise<Chat> {
  return requireFieldResponse(
    await apiPost<{ chat?: Chat | null } | Chat>("/v1/chats", {}),
    "chat",
    "/v1/chats"
  );
}

export function updateChatTitle(
  chatId: string,
  title: string
): Promise<Chat> {
  return apiPatch<Chat>(`/v1/chats/${chatId}/title`, { title });
}

export function archiveChat(chatId: string): Promise<Chat> {
  return apiPost<Chat>(`/v1/chats/${chatId}/archive`);
}

export function unarchiveChat(chatId: string): Promise<Chat> {
  return apiPost<Chat>(`/v1/chats/${chatId}/unarchive`);
}

export async function getChatTelegramBot(
  chatId: string
): Promise<TelegramBotBindingDto | null> {
  const response = await apiGet<{ telegramBot: TelegramBotBindingDto | null }>(
    `/v1/chats/${chatId}/telegram-bot`
  );
  return response.telegramBot ?? null;
}

export async function upsertChatTelegramBot(
  chatId: string,
  token: string
): Promise<TelegramBotBindingDto> {
  return requireFieldResponse(
    await apiPut<{ telegramBot?: TelegramBotBindingDto | null }>(
      `/v1/chats/${chatId}/telegram-bot`,
      { token }
    ),
    "telegramBot",
    `/v1/chats/${chatId}/telegram-bot`
  );
}

export async function deleteChatTelegramBot(chatId: string): Promise<void> {
  await apiDelete<{ telegramBot: null }>(`/v1/chats/${chatId}/telegram-bot`);
}
