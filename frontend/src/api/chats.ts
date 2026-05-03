import { apiGet, apiPost, apiPatch } from "./http";
import type { Chat } from "../types/chat";
import { requireFieldResponse, unwrapItemsResponse } from "./responses";

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
