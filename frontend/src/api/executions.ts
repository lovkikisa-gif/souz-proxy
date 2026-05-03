import { apiPost } from "./http";
import { mapExecutionDto } from "./adapters";
import type { CancelExecutionResponseDto } from "./dto";
import type { Execution } from "../types/chat";
import { requireFieldResponse } from "./responses";

export function cancelActiveExecution(chatId: string): Promise<Execution> {
  return apiPost<CancelExecutionResponseDto>(
    `/v1/chats/${chatId}/cancel-active`
  ).then((response) =>
    mapExecutionDto(
      requireFieldResponse(
        response,
        "execution",
        `/v1/chats/${chatId}/cancel-active`
      )
    )
  );
}

export function cancelExecution(
  chatId: string,
  executionId: string
): Promise<Execution> {
  return apiPost<CancelExecutionResponseDto>(
    `/v1/chats/${chatId}/executions/${executionId}/cancel`
  ).then((response) =>
    mapExecutionDto(
      requireFieldResponse(
        response,
        "execution",
        `/v1/chats/${chatId}/executions/${executionId}/cancel`
      )
    )
  );
}
