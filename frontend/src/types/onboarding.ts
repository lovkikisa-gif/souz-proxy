import type { Settings } from "./settings";

export type OnboardingStep = "welcome" | "provider" | "preferences";

export interface ServerManagedProvider {
  provider: string;
  models: string[];
  recommended: boolean;
}

export interface UserManagedProvider {
  provider: string;
  models: string[];
  configured: boolean;
  recommended: boolean;
}

export interface OnboardingState {
  required: boolean;
  completed: boolean;
  currentStep: OnboardingStep;
  reasons: string[];
  hasUsableModelAccess: boolean;
  availableServerManagedProviders: ServerManagedProvider[];
  availableUserManagedProviders: UserManagedProvider[];
  currentSettings: Settings;
  recommendedDefaultModel: string | null;
  availableModels: string[];
}

export interface CompleteOnboardingRequest {
  defaultModel: string;
  locale: string;
  timeZone: string;
  streamingMessages: boolean;
  showToolEvents: boolean;
  enabledTools: string[];
}
