import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp, createDeferred } from "../test/utils";
import {
  authUser,
  onboardingCompletedStateDto,
  onboardingRequiredStateDto,
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

vi.mock("../pages/ChatPage", () => ({
  ChatPage: () => <div>Chats stub</div>,
}));

vi.mock("../pages/SettingsPage", () => ({
  SettingsPage: () => <div>Settings stub</div>,
}));

vi.mock("../pages/OnboardingPage", () => ({
  OnboardingPage: () => <div>Onboarding stub</div>,
}));

import * as authApi from "../api/auth";
import * as onboardingApi from "../api/onboarding";
import * as bootstrapApi from "../api/bootstrap";

describe("App onboarding routing", () => {
  beforeEach(() => {
    vi.mocked(authApi.getMe).mockRejectedValue(new Error("unauthorized"));
    vi.mocked(authApi.login).mockResolvedValue({ user: authUser });
    vi.mocked(authApi.signup).mockResolvedValue({ user: authUser });
    vi.mocked(authApi.logout).mockResolvedValue({ ok: true });
    vi.mocked(authApi.verifyWelcomeKey).mockResolvedValue({ valid: true });
    vi.mocked(onboardingApi.getOnboardingState).mockResolvedValue(
      onboardingRequiredStateDto
    );
    vi.mocked(bootstrapApi.getBootstrap).mockRejectedValue(
      new Error("bootstrap unavailable")
    );
  });

  it("restores a session and redirects to onboarding when setup is required", async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({ user: authUser });

    await renderApp("/app/");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/onboarding");
    });
    expect(screen.getByText("Onboarding stub")).toBeInTheDocument();
  });

  it("redirects login to onboarding when onboarding is required", async () => {
    const user = userEvent.setup();

    await renderApp("/app/login");

    await user.type(
      screen.getByPlaceholderText(/enter your username/i),
      "duxx"
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      "password-123"
    );
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/onboarding");
    });
  });

  it("redirects signup to onboarding when onboarding is required", async () => {
    const user = userEvent.setup();

    await renderApp("/app/signup");

    await user.type(
      screen.getByPlaceholderText(/enter your welcome key/i),
      "invite-key"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(
      screen.getByPlaceholderText(/choose a username/i),
      "duxx"
    );
    await user.type(
      screen.getByPlaceholderText(/create a password/i),
      "password-123"
    );
    await user.type(
      screen.getByPlaceholderText(/confirm your password/i),
      "password-123"
    );
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/onboarding");
    });
  });

  it.each(["/app/chats", "/app/settings"])(
    "guards %s and redirects to onboarding while onboarding is required",
    async (path) => {
      vi.mocked(authApi.getMe).mockResolvedValue({ user: authUser });

      await renderApp(path);

      await waitFor(() => {
        expect(window.location.pathname).toBe("/app/onboarding");
      });
    }
  );

  it("sends completed users to chats instead of onboarding after login", async () => {
    const user = userEvent.setup();

    vi.mocked(onboardingApi.getOnboardingState).mockResolvedValue(
      onboardingCompletedStateDto
    );

    await renderApp("/app/login");

    await user.type(
      screen.getByPlaceholderText(/enter your username/i),
      "duxx"
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      "password-123"
    );
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/chats");
    });
    expect(screen.getByText("Chats stub")).toBeInTheDocument();
  });

  it("shows a controlled loading state instead of a black screen when bootstrap is unavailable", async () => {
    const deferred = createDeferred<typeof onboardingRequiredStateDto>();

    vi.mocked(authApi.getMe).mockResolvedValue({ user: authUser });
    vi.mocked(onboardingApi.getOnboardingState).mockReturnValue(
      deferred.promise
    );

    await renderApp("/app/");

    await waitFor(() => {
      expect(screen.getByTestId("route-loading")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/app/");
  });
});
