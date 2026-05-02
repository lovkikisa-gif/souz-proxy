import { apiGet, apiPut, apiDelete } from "./http";
import type { ProviderKey } from "../types/settings";

export function getProviderKeys(): Promise<ProviderKey[]> {
  return apiGet<ProviderKey[]>("/v1/me/provider-keys");
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
