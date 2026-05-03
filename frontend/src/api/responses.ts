type ItemsEnvelope<T> = {
  items?: T[] | null;
};

export function unwrapItemsResponse<T>(
  response: ItemsEnvelope<T> | T[] | null | undefined
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.items ?? [];
}

export function requireFieldResponse<T, K extends string>(
  response: unknown,
  key: K,
  endpoint: string
): T {
  if (
    response &&
    typeof response === "object" &&
    !Array.isArray(response) &&
    key in response
  ) {
    const value = (response as Record<K, T | null | undefined>)[key];
    if (value != null) {
      return value;
    }

    throw new Error(`Response for ${endpoint} is missing ${key}.`);
  }

  if (response != null) {
    return response as T;
  }

  throw new Error(`Response for ${endpoint} is missing ${key}.`);
}
