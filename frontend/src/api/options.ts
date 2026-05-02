import { apiPost } from "./http";
import type { AnswerOptionRequest } from "../types/chat";

export function answerOption(
  optionId: string,
  req: AnswerOptionRequest
): Promise<void> {
  return apiPost<void>(`/v1/options/${optionId}/answer`, req);
}
