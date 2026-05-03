import { apiGet } from "./http";
import type { BackendEvent } from "../types/events";
import { unwrapItemsResponse } from "./responses";

export async function getEvents(
  chatId: string,
  afterSeq: number = 0,
  limit: number = 100
): Promise<BackendEvent[]> {
  return unwrapItemsResponse(
    await apiGet<{ items?: BackendEvent[] | null } | BackendEvent[]>(
      `/v1/chats/${chatId}/events?afterSeq=${afterSeq}&limit=${limit}`
    )
  );
}
