import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppPreferencesProvider } from "../preferences/AppPreferencesProvider";
import { SettingsPage } from "./SettingsPage";

const useAuthMock = vi.fn();

vi.mock("../auth/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../api/settings", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("../components/ui/Toast", () => ({
  showToast: vi.fn(),
}));

import * as settingsApi from "../api/settings";

const authState = {
  user: {
    id: "user-1",
    username: "duxx",
  },
  bootstrap: {
    capabilities: {
      models: ["GigaChat-Max"],
      tools: ["shell", "web_search"],
    },
    settings: {
      defaultModel: "GigaChat-Max",
      contextSize: 32000,
      temperature: 0.7,
      locale: "ru-RU",
      timeZone: "Europe/Moscow",
      systemPrompt: null,
      enabledTools: ["shell"],
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
      locale: "ru-RU",
      timeZone: "Europe/Moscow",
      systemPrompt: null,
      enabledTools: ["shell"],
      showToolEvents: true,
      streamingMessages: true,
    },
  },
  refreshBootstrap: vi.fn().mockResolvedValue(undefined),
  refreshOnboarding: vi.fn().mockResolvedValue(null),
};

const localStorageState = new Map<string, string>();

function renderSettingsPage(initialEntry = "/settings") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppPreferencesProvider>
        <Routes>
          <Route
            element={<Outlet context={{ lastVisitedChatId: "chat-42" }} />}
          >
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/chats/:chatId" element={<div>Chat route</div>} />
            <Route path="/chats" element={<div>Chat list</div>} />
          </Route>
        </Routes>
      </AppPreferencesProvider>
    </MemoryRouter>
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorageState.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => localStorageState.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageState.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          localStorageState.delete(key);
        }),
      },
    });
    vi.resetAllMocks();
    useAuthMock.mockReturnValue(authState);
    vi.mocked(settingsApi.getSettings).mockResolvedValue(
      authState.bootstrap.settings
    );
    vi.mocked(settingsApi.updateSettings).mockResolvedValue(
      authState.bootstrap.settings
    );
  });

  it("shows General settings by default and persists the interface language locally", async () => {
    const user = userEvent.setup();

    renderSettingsPage();

    expect(
      screen.getByRole("tab", { name: "General" })
    ).toHaveAttribute("aria-selected", "true");
    expect(
      await screen.findByRole("combobox", { name: "Interface language" })
    ).toHaveValue("en");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Interface language" }),
      "ru"
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(
        JSON.parse(
          window.localStorage.getItem("souz:app-preferences:user-1") ?? "{}"
        )
      ).toMatchObject({
        interfaceLanguage: "ru",
      });
    });

    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();
  });

  it("returns to the last visited chat when settings are closed", async () => {
    const user = userEvent.setup();

    renderSettingsPage();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(await screen.findByText("Chat route")).toBeInTheDocument();
  });

  it("uses numeric inputs for model controls", async () => {
    const user = userEvent.setup();

    renderSettingsPage();

    await user.click(screen.getByRole("tab", { name: "Model" }));

    expect(
      await screen.findByRole("spinbutton", { name: "Context size" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Temperature" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Request timeout (ms)" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
});
