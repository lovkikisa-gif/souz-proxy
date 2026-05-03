import { apiGet, apiPut, apiDelete } from "./http";
import { mapProviderKeyDto, mapProviderKeysDto } from "./adapters";
import type { ProviderKeyDto, PutProviderKeyResponseDto } from "./dto";
import type { ProviderKey } from "../types/settings";
import { requireFieldResponse, unwrapItemsResponse } from "./responses";

export async function getProviderKeys(): Promise<ProviderKey[]> {
  return mapProviderKeysDto(
    unwrapItemsResponse(
      await apiGet<{ items?: ProviderKeyDto[] | null } | ProviderKeyDto[]>(
        "/v1/me/provider-keys"
      )
    )
  );
}

export function setProviderKey(
  provider: string,
  apiKey: string
): Promise<ProviderKey> {
  return apiPut<PutProviderKeyResponseDto>(`/v1/me/provider-keys/${provider}`, {
    apiKey,
  }).then((response) =>
    mapProviderKeyDto(
      requireFieldResponse(response, "providerKey", `/v1/me/provider-keys/${provider}`)
    )
  );
}

export function deleteProviderKey(provider: string): Promise<void> {
  return apiDelete<void>(`/v1/me/provider-keys/${provider}`);
}
