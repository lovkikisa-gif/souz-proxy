import { apiPost } from "./http";
import { mapExecutionDto, mapOptionDto } from "./adapters";
import type { AnswerOptionRequest, AnswerOptionResult } from "../types/chat";
import type { AnswerOptionResponseDto } from "./dto";
import { requireFieldResponse } from "./responses";

export function answerOption(
  optionId: string,
  req: AnswerOptionRequest
): Promise<AnswerOptionResult> {
  return apiPost<AnswerOptionResponseDto>(`/v1/options/${optionId}/answer`, req).then(
    (response) => ({
      option: mapOptionDto(
        requireFieldResponse(response, "option", `/v1/options/${optionId}/answer`)
      ),
      execution: mapExecutionDto(
        requireFieldResponse(response, "execution", `/v1/options/${optionId}/answer`)
      ),
    })
  );
}
