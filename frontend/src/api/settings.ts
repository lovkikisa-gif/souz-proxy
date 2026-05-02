import { apiGet, apiPatch } from "./http";
import type { Settings } from "../types/settings";

export function getSettings(): Promise<Settings> {
  return apiGet<Settings>("/v1/me/settings");
}

export function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  return apiPatch<Settings>("/v1/me/settings", patch);
}
