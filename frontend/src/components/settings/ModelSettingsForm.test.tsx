import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppPreferencesProvider } from "../../preferences/AppPreferencesProvider";
import { ModelSettingsForm } from "./ModelSettingsForm";

const authState = {
  bootstrap: {
    capabilities: {
      models: ["GigaChat-Max"],
    },
    settings: {
      defaultModel: "GigaChat-Max",
      contextSize: 32000,
      temperature: 0.7,
      locale: "kk-KZ",
      timeZone: "Europe/Moscow",
      systemPrompt: null,
      enabledTools: [],
      showToolEvents: true,
      streamingMessages: true,
    },
  },
  onboarding: {
    availableModels: ["GigaChat-Max"],
    currentSettings: {
      defaultModel: "GigaChat-Max",
      contextSize: 32000,
      temperature: 0.7,
      locale: "kk-KZ",
      timeZone: "Europe/Moscow",
      systemPrompt: null,
      enabledTools: [],
      showToolEvents: true,
      streamingMessages: true,
    },
  },
  refreshBootstrap: vi.fn().mockResolvedValue(undefined),
  refreshOnboarding: vi.fn().mockResolvedValue(null),
};

vi.mock("../../api/settings", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("../ui/Toast", () => ({
  showToast: vi.fn(),
}));

import * as settingsApi from "../../api/settings";

describe("ModelSettingsForm", () => {
  it("renders locale as a select and preserves a saved custom locale", async () => {
    vi.mocked(settingsApi.getSettings).mockResolvedValue({
      defaultModel: "GigaChat-Max",
      contextSize: 32000,
      temperature: 0.7,
      locale: "kk-KZ",
      timeZone: "Europe/Moscow",
      systemPrompt: null,
      enabledTools: [],
      showToolEvents: true,
      streamingMessages: true,
    });

    render(
      <AppPreferencesProvider>
        <ModelSettingsForm />
      </AppPreferencesProvider>
    );

    const localeSelect = await screen.findByLabelText("Locale");
    expect(localeSelect.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "en-US" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "kk-KZ" })).toBeInTheDocument();
  });

  it("renders context size and temperature as numeric inputs", async () => {
    vi.mocked(settingsApi.getSettings).mockResolvedValue({
      defaultModel: "GigaChat-Max",
      contextSize: 32000,
      temperature: 0.7,
      locale: "kk-KZ",
      timeZone: "Europe/Moscow",
      systemPrompt: null,
      enabledTools: [],
      showToolEvents: true,
      streamingMessages: true,
    });

    render(
      <AppPreferencesProvider>
        <ModelSettingsForm />
      </AppPreferencesProvider>
    );

    expect(await screen.findByRole("spinbutton", { name: "Context size" })).toHaveValue(32000);
    expect(screen.getByRole("spinbutton", { name: "Temperature" })).toHaveValue(0.7);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
});
