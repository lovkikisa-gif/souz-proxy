import { apiGet, apiPost, apiPatch } from "./http";
import type { Chat } from "../types/chat";

export function getChats(): Promise<Chat[]> {
  return apiGet<Chat[]>("/v1/chats");
}

export function createChat(): Promise<Chat> {
  return apiPost<Chat>("/v1/chats");
}

export function updateChatTitle(
  chatId: string,
  title: string
): Promise<Chat> {
  return apiPatch<Chat>(`/v1/chats/${chatId}/title`, { title });
}

export function archiveChat(chatId: string): Promise<void> {
  return apiPost<void>(`/v1/chats/${chatId}/archive`);
}

export function unarchiveChat(chatId: string): Promise<void> {
  return apiPost<void>(`/v1/chats/${chatId}/unarchive`);
}
