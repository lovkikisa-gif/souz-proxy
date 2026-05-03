import { apiGet, apiPost } from "./http";
import { mapOnboardingStateDto } from "./adapters";
import type { OnboardingStateDto } from "./dto";
import type {
  CompleteOnboardingRequest,
  OnboardingState,
} from "../types/onboarding";

export async function getOnboardingState(): Promise<OnboardingState> {
  return mapOnboardingStateDto(
    await apiGet<OnboardingStateDto>("/v1/onboarding/state")
  );
}

export function completeOnboarding(
  payload: CompleteOnboardingRequest
): Promise<void> {
  return apiPost<void>("/v1/onboarding/complete", payload);
}
