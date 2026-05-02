import { apiGet, apiPost } from "./http";
import type { Message, CreateMessageRequest } from "../types/chat";

export function getMessages(chatId: string): Promise<Message[]> {
  return apiGet<Message[]>(`/v1/chats/${chatId}/messages`);
}

export function sendMessage(
  chatId: string,
  req: CreateMessageRequest
): Promise<Message> {
  return apiPost<Message>(`/v1/chats/${chatId}/messages`, req);
}
