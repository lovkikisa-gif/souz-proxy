import { apiGet } from "./http";
import type { BackendEvent } from "../types/events";

export function getEvents(
  chatId: string,
  afterSeq: number = 0,
  limit: number = 100
): Promise<BackendEvent[]> {
  return apiGet<BackendEvent[]>(
    `/v1/chats/${chatId}/events?afterSeq=${afterSeq}&limit=${limit}`
  );
}
