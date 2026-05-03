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

export async function completeOnboarding(
  payload: CompleteOnboardingRequest
): Promise<OnboardingState | null> {
  const response = await apiPost<OnboardingStateDto | undefined>(
    "/v1/onboarding/complete",
    payload
  );

  return response ? mapOnboardingStateDto(response) : null;
}
