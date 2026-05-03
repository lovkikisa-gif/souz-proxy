import { afterEach, describe, expect, it, vi } from "vitest";
import { completeOnboarding } from "./onboarding";

describe("completeOnboarding", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the backend completion response when one is returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          completed: true,
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
    ).resolves.toEqual({
      completed: true,
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
