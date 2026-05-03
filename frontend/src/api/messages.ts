import { apiGet, apiPost } from "./http";
import type { Message, CreateMessageRequest } from "../types/chat";
import { requireFieldResponse, unwrapItemsResponse } from "./responses";

export async function getMessages(chatId: string): Promise<Message[]> {
  return unwrapItemsResponse(
    await apiGet<{ items?: Message[] | null } | Message[]>(
      `/v1/chats/${chatId}/messages`
    )
  );
}

export async function sendMessage(
  chatId: string,
  req: CreateMessageRequest
): Promise<Message> {
  return requireFieldResponse(
    await apiPost<{ message?: Message | null } | Message>(
      `/v1/chats/${chatId}/messages`,
      req
    ),
    "message",
    `/v1/chats/${chatId}/messages`
  );
}
