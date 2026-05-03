import type {
  BootstrapDto,
  ModelCapabilityDto,
  OnboardingStateDto,
  ProviderKeyDto,
  ServerManagedProviderDto,
  SettingsDto,
  ToolCapabilityDto,
  UserManagedProviderDto,
} from "./dto";
import type { OnboardingState, OnboardingStep } from "../types/onboarding";
import type { Bootstrap, ProviderKey, Settings } from "../types/settings";

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "",
  contextSize: 32000,
  temperature: 0.7,
  locale: "en-US",
  timeZone: "UTC",
  systemPrompt: null,
  enabledTools: [],
  showToolEvents: true,
  streamingMessages: true,
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeStep(step: string | null | undefined): OnboardingStep {
  if (
    step === "provider" ||
    step === "preferences" ||
    step === "done"
  ) {
    return step;
  }

  return "welcome";
}

function mapModelCapabilities(dtos: ModelCapabilityDto[] | null | undefined) {
  return unique((dtos ?? []).map((dto) => dto.id ?? ""));
}

function mapToolCapabilities(dtos: ToolCapabilityDto[] | null | undefined) {
  return unique((dtos ?? []).map((dto) => dto.name ?? ""));
}

export function mapSettingsDto(dto: SettingsDto | null | undefined): Settings {
  return {
    defaultModel: dto?.defaultModel ?? DEFAULT_SETTINGS.defaultModel,
    contextSize: dto?.contextSize ?? DEFAULT_SETTINGS.contextSize,
    temperature: dto?.temperature ?? DEFAULT_SETTINGS.temperature,
    locale: dto?.locale ?? DEFAULT_SETTINGS.locale,
    timeZone: dto?.timeZone ?? DEFAULT_SETTINGS.timeZone,
    systemPrompt: dto?.systemPrompt ?? DEFAULT_SETTINGS.systemPrompt,
    enabledTools: dto?.enabledTools ?? DEFAULT_SETTINGS.enabledTools,
    showToolEvents: dto?.showToolEvents ?? DEFAULT_SETTINGS.showToolEvents,
    streamingMessages:
      dto?.streamingMessages ?? DEFAULT_SETTINGS.streamingMessages,
  };
}

export function mapProviderKeyDto(dto: ProviderKeyDto): ProviderKey {
  return {
    provider: dto.provider,
    configured: dto.configured ?? false,
    keyHint: dto.keyHint ?? null,
    updatedAt: dto.updatedAt ?? null,
  };
}

export function mapProviderKeysDto(dtos: ProviderKeyDto[]): ProviderKey[] {
  return dtos.map(mapProviderKeyDto);
}

function mapServerManagedProvider(dto: ServerManagedProviderDto) {
  return {
    provider: dto.provider,
    models: dto.models ?? [],
    recommended: dto.recommended ?? false,
  };
}

function mapUserManagedProvider(dto: UserManagedProviderDto) {
  return {
    provider: dto.provider,
    models: dto.models ?? [],
    configured: dto.configured ?? false,
    recommended: dto.recommended ?? false,
  };
}

export function collectUsableModels(state: Pick<
  OnboardingState,
  "availableServerManagedProviders" | "availableUserManagedProviders"
>): string[] {
  const serverManaged = state.availableServerManagedProviders.flatMap(
    (provider) => provider.models
  );
  const userManaged = state.availableUserManagedProviders
    .filter((provider) => provider.configured)
    .flatMap((provider) => provider.models);

  return unique([...serverManaged, ...userManaged]);
}

export function mapOnboardingStateDto(
  dto: OnboardingStateDto | null | undefined
): OnboardingState {
  const availableServerManagedProviders = (
    dto?.availableServerManagedProviders ?? []
  ).map(mapServerManagedProvider);
  const availableUserManagedProviders = (
    dto?.availableUserManagedProviders ?? []
  ).map(mapUserManagedProvider);

  const state: OnboardingState = {
    required: dto?.required ?? false,
    completed: dto?.completed ?? false,
    currentStep: normalizeStep(dto?.currentStep),
    reasons: dto?.reasons ?? [],
    hasUsableModelAccess: dto?.hasUsableModelAccess ?? false,
    availableServerManagedProviders,
    availableUserManagedProviders,
    currentSettings: mapSettingsDto(dto?.currentSettings),
    recommendedDefaultModel: dto?.recommendedDefaultModel ?? null,
    availableModels: [],
  };

  state.availableModels = collectUsableModels(state);

  return state;
}

export function mapBootstrapDto(
  dto: BootstrapDto | null | undefined
): Bootstrap {
  return {
    user: {
      id: dto?.user?.id ?? "",
      username: dto?.user?.username ?? "",
    },
    features: dto?.features ?? {},
    storageMode: dto?.storageMode ?? "unknown",
    capabilities: {
      models: mapModelCapabilities(dto?.capabilities?.models),
      tools: mapToolCapabilities(dto?.capabilities?.tools),
    },
    settings: mapSettingsDto(dto?.settings),
  };
}
