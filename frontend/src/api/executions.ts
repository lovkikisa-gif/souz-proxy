import { apiPost } from "./http";

export function cancelActiveExecution(chatId: string): Promise<void> {
  return apiPost<void>(`/v1/chats/${chatId}/cancel-active`);
}

export function cancelExecution(
  chatId: string,
  executionId: string
): Promise<void> {
  return apiPost<void>(
    `/v1/chats/${chatId}/executions/${executionId}/cancel`
  );
}
