import { apiGet, apiPut, apiDelete } from "./http";
import { mapProviderKeysDto } from "./adapters";
import type { ProviderKeyDto } from "./dto";
import type { ProviderKey } from "../types/settings";

export async function getProviderKeys(): Promise<ProviderKey[]> {
  return mapProviderKeysDto(
    await apiGet<ProviderKeyDto[]>("/v1/me/provider-keys")
  );
}

export function setProviderKey(
  provider: string,
  apiKey: string
): Promise<void> {
  return apiPut<void>(`/v1/me/provider-keys/${provider}`, { apiKey });
}

export function deleteProviderKey(provider: string): Promise<void> {
  return apiDelete<void>(`/v1/me/provider-keys/${provider}`);
}
