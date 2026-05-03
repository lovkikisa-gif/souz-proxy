import { afterEach, describe, expect, it, vi } from "vitest";
import { completeOnboarding } from "./onboarding";

describe("completeOnboarding", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a backend onboarding state response when one is returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          required: false,
          completed: true,
          currentStep: "done",
        }),
      })
    );

    await expect(
      completeOnboarding({
        defaultModel: "GigaChat-Max",
        locale: "ru-RU",
        timeZone: "Europe/Moscow",
        streamingMessages: true,
        showToolEvents: true,
        enabledTools: [],
      })
    ).resolves.toMatchObject({
      required: false,
      completed: true,
      currentStep: "done",
    });
  });

  it("returns null when the backend completes onboarding with 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      })
    );

    await expect(
      completeOnboarding({
        defaultModel: "GigaChat-Max",
        locale: "ru-RU",
        timeZone: "Europe/Moscow",
        streamingMessages: true,
        showToolEvents: true,
        enabledTools: [],
      })
    ).resolves.toBeNull();
  });
});
