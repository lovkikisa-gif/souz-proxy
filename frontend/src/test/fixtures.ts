import type { OnboardingState } from "../types/onboarding";
import type { Settings } from "../types/settings";

export const authUser = {
  id: "user-1",
  username: "duxx",
};

export const baseSettings = {
  defaultModel: "GigaChat-Max",
  contextSize: 32000,
  temperature: 0.7,
  locale: "ru-RU",
  timeZone: "Europe/Moscow",
  systemPrompt: null,
  enabledTools: [],
  showToolEvents: true,
  streamingMessages: true,
} satisfies Settings;

export const onboardingRequiredStateDto = {
  required: true,
  completed: false,
  currentStep: "welcome",
  reasons: ["missing_model_access"],
  hasUsableModelAccess: false,
  availableServerManagedProviders: [],
  availableUserManagedProviders: [
    {
      provider: "openai",
      models: ["gpt-5-nano"],
      configured: false,
      recommended: false,
    },
  ],
  currentSettings: baseSettings,
  recommendedDefaultModel: "gpt-5-nano",
  availableModels: [],
} satisfies OnboardingState;

export const onboardingReadyStateDto = {
  ...onboardingRequiredStateDto,
  currentStep: "provider",
  reasons: [],
  hasUsableModelAccess: true,
  availableServerManagedProviders: [
    {
      provider: "giga",
      models: ["GigaChat-Max"],
      recommended: true,
    },
  ],
  recommendedDefaultModel: "GigaChat-Max",
  availableModels: ["GigaChat-Max"],
} satisfies OnboardingState;

export const onboardingWelcomeStateDto = {
  ...onboardingReadyStateDto,
  currentStep: "welcome",
} satisfies OnboardingState;

export const onboardingCompletedStateDto = {
  ...onboardingReadyStateDto,
  required: false,
  completed: true,
  currentStep: "preferences",
} satisfies OnboardingState;
