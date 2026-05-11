import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProviderKeysPanel } from "./ProviderKeysPanel";

vi.mock("../../api/providerKeys", () => ({
  getProviderKeys: vi.fn(),
  setProviderKey: vi.fn(),
  deleteProviderKey: vi.fn(),
}));

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    onboarding: {
      availableUserManagedProviders: [
        {
          provider: "anthropic",
          models: ["claude-sonnet-4"],
          configured: false,
          recommended: false,
        },
      ],
    },
    refreshOnboarding: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("../ui/Toast", () => ({
  showToast: vi.fn(),
}));

import * as providerKeysApi from "../../api/providerKeys";

describe("ProviderKeysPanel", () => {
  it("lets the user add a key for a provider that is only known from onboarding", async () => {
    const user = userEvent.setup();

    vi.mocked(providerKeysApi.getProviderKeys).mockResolvedValue([]);
    vi.mocked(providerKeysApi.setProviderKey).mockResolvedValue({
      provider: "anthropic",
      configured: true,
      keyHint: "...1234",
      updatedAt: "2026-05-09T10:00:00Z",
    });

    render(<ProviderKeysPanel />);

    expect(await screen.findByText("anthropic")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(screen.getByPlaceholderText("Paste API key"), "sk-ant-test");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(providerKeysApi.setProviderKey).toHaveBeenCalledWith(
        "anthropic",
        "sk-ant-test"
      );
    });
  });
});
