import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/utils";
import {
  authUser,
  baseSettings,
  onboardingCompletedStateDto,
  onboardingWelcomeStateDto,
} from "../test/fixtures";

vi.mock("../api/auth", () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  verifyWelcomeKey: vi.fn(),
}));

vi.mock("../api/onboarding", () => ({
  getOnboardingState: vi.fn(),
  completeOnboarding: vi.fn(),
}));

vi.mock("../api/bootstrap", () => ({
  getBootstrap: vi.fn(),
}));

vi.mock("../api/settings", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("../api/providerKeys", () => ({
  getProviderKeys: vi.fn(),
  setProviderKey: vi.fn(),
  deleteProviderKey: vi.fn(),
}));

vi.mock("../components/ui/Toast", () => ({
  ToastContainer: () => null,
  showToast: vi.fn(),
}));

vi.mock("../layouts/AppShell", async () => {
  const { Outlet } = await import("react-router-dom");
  return {
    AppShell: () => (
      <div data-testid="app-shell">
        <Outlet />
      </div>
    ),
  };
});

vi.mock("./ChatPage", () => ({
  ChatPage: () => <div>Chats stub</div>,
}));

vi.mock("./SettingsPage", () => ({
  SettingsPage: () => <div>Settings stub</div>,
}));

import * as authApi from "../api/auth";
import * as onboardingApi from "../api/onboarding";
import * as bootstrapApi from "../api/bootstrap";
import * as settingsApi from "../api/settings";
import * as providerKeysApi from "../api/providerKeys";

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.mocked(authApi.getMe).mockResolvedValue({ user: authUser });
    vi.mocked(authApi.logout).mockResolvedValue({ ok: true });
    vi.mocked(onboardingApi.getOnboardingState).mockResolvedValue(
      onboardingWelcomeStateDto
    );
    vi.mocked(onboardingApi.completeOnboarding).mockResolvedValue(null);
    vi.mocked(bootstrapApi.getBootstrap).mockRejectedValue(
      new Error("bootstrap unavailable")
    );
    vi.mocked(settingsApi.getSettings).mockResolvedValue(baseSettings);
    vi.mocked(providerKeysApi.getProviderKeys).mockResolvedValue([
      {
        provider: "openai",
        configured: false,
        keyHint: null,
        updatedAt: null,
      },
    ]);
    vi.mocked(providerKeysApi.setProviderKey).mockResolvedValue(undefined);
    vi.mocked(providerKeysApi.deleteProviderKey).mockResolvedValue(undefined);
  });

  it("renders the onboarding wizard flow and reveals a key form for user-managed providers", async () => {
    const user = userEvent.setup();

    await renderApp("/app/onboarding");

    expect(await screen.findByText(/what this setup does/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(
      await screen.findByRole("heading", { name: /provider access/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/ready on this server/i)).toBeInTheDocument();
    expect(screen.getByText(/api key required/i)).toBeInTheDocument();

    const openAiCard = screen.getByTestId("user-provider-openai");
    await user.click(
      within(openAiCard).getByRole("button", { name: /add key/i })
    );

    expect(
      within(openAiCard).getByPlaceholderText(/paste api key/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(
      await screen.findByRole("heading", { name: /preferences/i })
    ).toBeInTheDocument();
  });

  it("completes onboarding and redirects to chats", async () => {
    const user = userEvent.setup();

    vi.mocked(onboardingApi.getOnboardingState)
      .mockResolvedValueOnce(onboardingWelcomeStateDto)
      .mockResolvedValueOnce(onboardingCompletedStateDto);

    await renderApp("/app/onboarding");

    await user.click(
      await screen.findByRole("button", { name: /^continue$/i })
    );
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    const localeInput = await screen.findByDisplayValue("ru-RU");
    await user.clear(localeInput);
    await user.type(localeInput, "en-US");

    await user.click(screen.getByRole("button", { name: /finish setup/i }));

    await waitFor(() => {
      expect(onboardingApi.completeOnboarding).toHaveBeenCalledWith({
        defaultModel: "GigaChat-Max",
        locale: "en-US",
        timeZone: "Europe/Moscow",
        streamingMessages: true,
        showToolEvents: true,
        enabledTools: [],
      });
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/chats");
    });
    expect(screen.getByText("Chats stub")).toBeInTheDocument();
  });
});
