import { apiGet, apiPatch } from "./http";
import { mapSettingsDto } from "./adapters";
import type { SettingsDto } from "./dto";
import type { Settings } from "../types/settings";
import { requireFieldResponse } from "./responses";

export async function getSettings(): Promise<Settings> {
  return mapSettingsDto(
    requireFieldResponse(
      await apiGet<{ settings?: SettingsDto | null } | SettingsDto>(
        "/v1/me/settings"
      ),
      "settings",
      "/v1/me/settings"
    )
  );
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  return mapSettingsDto(
    requireFieldResponse(
      await apiPatch<{ settings?: SettingsDto | null } | SettingsDto>(
        "/v1/me/settings",
        patch
      ),
      "settings",
      "/v1/me/settings"
    )
  );
}
