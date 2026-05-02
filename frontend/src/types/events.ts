export interface BackendEvent {
  seq: number | null;
  durable: boolean;
  chatId: string;
  executionId: string | null;
  type: EventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type EventType =
  | "message.created"
  | "message.delta"
  | "message.completed"
  | "tool.call.started"
  | "tool.call.finished"
  | "tool.call.failed"
  | "option.requested"
  | "option.answered"
  | "execution.started"
  | "execution.finished"
  | "execution.failed"
  | "execution.cancelled";
