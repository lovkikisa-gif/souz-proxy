export interface Chat {
  id: string;
  title: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  clientMessageId?: string | null;
  createdAt: string;
}

export interface CreateMessageRequest {
  content: string;
  clientMessageId?: string;
  options?: {
    model?: string;
    contextSize?: number;
    temperature?: number;
    locale?: string;
    timeZone?: string;
    systemPrompt?: string;
  };
}

export interface ToolCall {
  id: string;
  executionId: string;
  toolName: string;
  status: "running" | "finished" | "failed";
  argumentsPreview?: string | null;
  resultPreview?: string | null;
  error?: string | null;
  durationMs?: number | null;
}

export interface OptionItem {
  id: string;
  label: string;
  description?: string | null;
}

export interface OptionRequest {
  optionId: string;
  executionId: string;
  title: string;
  content?: string | null;
  selectionMode: "single" | "multiple";
  options: OptionItem[];
  allowFreeText: boolean;
  status: "pending" | "answered" | "failed";
  selectedOptionIds?: string[];
  freeText?: string | null;
}

export interface AnswerOptionRequest {
  selectedOptionIds: string[];
  freeText?: string | null;
  metadata?: Record<string, string>;
}

export interface Execution {
  id: string;
  chatId: string;
  status: "queued" | "running" | "waiting_option" | "cancelling" | "finished" | "failed" | "cancelled";
  error?: string | null;
  usage?: Record<string, unknown> | null;
}
