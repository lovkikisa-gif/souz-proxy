import { apiGet, apiPatch } from "./http";
import { mapSettingsDto } from "./adapters";
import type { SettingsDto } from "./dto";
import type { Settings } from "../types/settings";

export async function getSettings(): Promise<Settings> {
  return mapSettingsDto(await apiGet<SettingsDto>("/v1/me/settings"));
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  return mapSettingsDto(
    await apiPatch<SettingsDto>("/v1/me/settings", patch)
  );
}
