import { describe, expect, it } from "vitest";
import {
  collectUsableModels,
  mapBootstrapDto,
  mapOnboardingStateDto,
  mapSettingsDto,
} from "./adapters";

describe("API adapters", () => {
  it("maps partially loaded bootstrap payloads to safe frontend defaults", () => {
    const bootstrap = mapBootstrapDto({
      user: {
        id: "user-1",
        username: "duxx",
      },
      settings: {
        defaultModel: "GigaChat-Max",
        locale: "ru-RU",
        timeZone: "Europe/Moscow",
      },
    });

    expect(bootstrap.features).toEqual({});
    expect(bootstrap.storageMode).toBe("unknown");
    expect(bootstrap.capabilities.models).toEqual([]);
    expect(bootstrap.capabilities.tools).toEqual([]);
    expect(bootstrap.settings.enabledTools).toEqual([]);
    expect(bootstrap.settings.showToolEvents).toBe(true);
    expect(bootstrap.settings.streamingMessages).toBe(true);
  });

  it("normalizes object-based bootstrap capabilities to string ids", () => {
    const bootstrap = mapBootstrapDto({
      capabilities: {
        models: [
          { id: "GigaChat-Max", label: "GigaChat Max" },
          { id: "gpt-5-nano", label: "GPT-5 Nano" },
        ],
        tools: [
          { name: "web_search", label: "Web Search" },
          { name: "shell", label: "Shell" },
        ],
      },
    });

    expect(bootstrap.capabilities.models).toEqual([
      "GigaChat-Max",
      "gpt-5-nano",
    ]);
    expect(bootstrap.capabilities.tools).toEqual(["web_search", "shell"]);
  });

  it("normalizes settings payloads centrally", () => {
    const settings = mapSettingsDto({
      defaultModel: "GigaChat-Max",
      locale: "ru-RU",
      timeZone: "Europe/Moscow",
      enabledTools: undefined,
      streamingMessages: undefined,
      showToolEvents: undefined,
    });

    expect(settings.defaultModel).toBe("GigaChat-Max");
    expect(settings.contextSize).toBe(32000);
    expect(settings.temperature).toBe(0.7);
    expect(settings.systemPrompt).toBeNull();
    expect(settings.enabledTools).toEqual([]);
    expect(settings.streamingMessages).toBe(true);
    expect(settings.showToolEvents).toBe(true);
  });

  it("keeps onboarding DTO mapping and usable model derivation in one place", () => {
    const state = mapOnboardingStateDto({
      required: true,
      completed: false,
      currentStep: "provider",
      reasons: ["missing_model_access"],
      hasUsableModelAccess: true,
      availableServerManagedProviders: [
        {
          provider: "giga",
          models: ["GigaChat-Max"],
          recommended: true,
        },
      ],
      availableUserManagedProviders: [
        {
          provider: "openai",
          models: ["gpt-5-nano"],
          configured: true,
          recommended: false,
        },
        {
          provider: "anthropic",
          models: ["claude-sonnet-4"],
          configured: false,
          recommended: false,
        },
      ],
      currentSettings: {
        defaultModel: "GigaChat-Max",
        locale: "ru-RU",
        timeZone: "Europe/Moscow",
      },
      recommendedDefaultModel: "GigaChat-Max",
    });

    expect(state.currentSettings.enabledTools).toEqual([]);
    expect(collectUsableModels(state)).toEqual([
      "GigaChat-Max",
      "gpt-5-nano",
    ]);
  });

  it("preserves the done onboarding step from the backend", () => {
    const state = mapOnboardingStateDto({
      required: false,
      completed: true,
      currentStep: "done",
    });

    expect(state.currentStep).toBe("done");
  });
});
