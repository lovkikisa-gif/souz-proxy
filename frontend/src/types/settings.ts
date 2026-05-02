export interface Settings {
  defaultModel: string;
  contextSize: number;
  temperature: number;
  locale: string;
  timeZone: string;
  systemPrompt: string | null;
  enabledTools: string[];
  showToolEvents: boolean;
  streamingMessages: boolean;
}

export interface ProviderKey {
  provider: string;
  configured: boolean;
  keyHint?: string | null;
  updatedAt?: string | null;
}

export interface Bootstrap {
  user: {
    id: string;
    username: string;
  };
  features: Record<string, boolean>;
  storageMode: string;
  capabilities: {
    models: string[];
    tools: string[];
  };
  settings: Settings;
}
