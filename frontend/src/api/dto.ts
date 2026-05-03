export interface SettingsDto {
  defaultModel?: string;
  contextSize?: number;
  temperature?: number;
  locale?: string;
  timeZone?: string;
  systemPrompt?: string | null;
  enabledTools?: string[];
  showToolEvents?: boolean;
  streamingMessages?: boolean;
}

export interface ProviderKeyDto {
  provider: string;
  configured?: boolean;
  keyHint?: string | null;
  updatedAt?: string | null;
}

export interface ModelCapabilityDto {
  provider?: string | null;
  model?: string | null;
  serverManagedKey?: boolean | null;
  userManagedKey?: boolean | null;
  id?: string | null;
  label?: string | null;
}

export interface ToolCapabilityDto {
  name?: string | null;
  label?: string | null;
  enabled?: boolean | null;
}

export interface BootstrapDto {
  user?: {
    id?: string;
    username?: string;
  };
  features?: Record<string, boolean> | null;
  storage?: {
    mode?: string | null;
  } | null;
  storageMode?: string | null;
  capabilities?: {
    models?: ModelCapabilityDto[] | null;
    tools?: ToolCapabilityDto[] | null;
  } | null;
  settings?: SettingsDto | null;
}

export interface CompleteOnboardingResponseDto {
  completed?: boolean;
}

export interface ServerManagedProviderDto {
  provider: string;
  models?: string[] | null;
  recommended?: boolean;
}

export interface UserManagedProviderDto {
  provider: string;
  models?: string[] | null;
  configured?: boolean;
  recommended?: boolean;
}

export interface OnboardingStateDto {
  required?: boolean;
  completed?: boolean;
  currentStep?: string | null;
  reasons?: string[] | null;
  hasUsableModelAccess?: boolean;
  availableServerManagedProviders?: ServerManagedProviderDto[] | null;
  availableUserManagedProviders?: UserManagedProviderDto[] | null;
  currentSettings?: SettingsDto | null;
  recommendedDefaultModel?: string | null;
}
