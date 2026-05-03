import { apiGet, apiPost } from "./http";
import { mapOnboardingStateDto } from "./adapters";
import type {
  CompleteOnboardingResponseDto,
  OnboardingStateDto,
} from "./dto";
import type {
  CompleteOnboardingRequest,
  CompleteOnboardingResponse,
  OnboardingState,
} from "../types/onboarding";

export async function getOnboardingState(): Promise<OnboardingState> {
  return mapOnboardingStateDto(
    await apiGet<OnboardingStateDto>("/v1/onboarding/state")
  );
}

export async function completeOnboarding(
  payload: CompleteOnboardingRequest
): Promise<CompleteOnboardingResponse | null> {
  const response = await apiPost<CompleteOnboardingResponseDto | undefined>(
    "/v1/onboarding/complete",
    payload
  );

  return response
    ? {
        completed: response.completed ?? false,
      }
    : null;
}
