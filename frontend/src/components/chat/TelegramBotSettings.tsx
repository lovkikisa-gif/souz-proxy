import { useEffect, useState } from "react";
import {
  deleteChatTelegramBot,
  getChatTelegramBot,
  upsertChatTelegramBot,
  type TelegramBotBindingDto,
} from "../../api/chats";
import { ApiError } from "../../types/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { showToast } from "../ui/Toast";

const lastErrorLabels: Record<string, string> = {
  telegram_unauthorized: "Telegram отклонил token. Привязка отключена.",
  telegram_conflict_webhook_enabled:
    "У бота включен webhook. Long polling сейчас недоступен.",
  telegram_rate_limited: "Telegram временно ограничил запросы.",
  telegram_network_error: "Ошибка сети при обращении к Telegram.",
  telegram_unknown_error: "Неизвестная ошибка Telegram-интеграции.",
};

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "invalid_telegram_bot_token":
        return "Неверный token Telegram-бота.";
      case "telegram_bot_already_bound":
        return "Этот Telegram-бот уже привязан к другому чату.";
      case "chat_not_found":
        return "Чат не найден или недоступен.";
      default:
        return "Не удалось сохранить Telegram-бота.";
    }
  }

  return "Не удалось сохранить Telegram-бота.";
}

function getDeleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "chat_not_found") {
    return "Чат не найден или недоступен.";
  }

  return "Не удалось удалить Telegram-бота.";
}

function getBindingStatus(binding: TelegramBotBindingDto | null): {
  label: string;
  tone: string;
} {
  if (!binding) {
    return {
      label: "Not connected",
      tone: "var(--color-text-muted)",
    };
  }

  if (!binding.enabled || binding.lastError) {
    return {
      label: "Telegram bot disabled",
      tone: "var(--color-warning)",
    };
  }

  return {
    label: "Telegram bot connected",
    tone: "var(--color-success)",
  };
}

export function TelegramBotSettings({ chatId }: { chatId: string }) {
  const [binding, setBinding] = useState<TelegramBotBindingDto | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getChatTelegramBot(chatId)
      .then((telegramBot) => {
        if (!cancelled) {
          setBinding(telegramBot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          showToast("Не удалось загрузить Telegram-бота.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const status = getBindingStatus(binding);
  const submitLabel = binding ? "Update bot" : "Save bot";
  const lastErrorText = binding?.lastError
    ? lastErrorLabels[binding.lastError] ?? "Неизвестная ошибка Telegram-интеграции."
    : null;

  const handleSave = async () => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const telegramBot = await upsertChatTelegramBot(chatId, trimmedToken);
      setBinding(telegramBot);
      setToken("");
      showToast("Telegram bot saved", "success");
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError(null);

    try {
      await deleteChatTelegramBot(chatId);
      setBinding(null);
      setToken("");
      showToast("Telegram bot removed", "success");
    } catch (deleteError) {
      setError(getDeleteErrorMessage(deleteError));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Telegram bot</h3>
          <p
            style={{
              marginTop: 8,
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              lineHeight: 1.5,
            }}
          >
            Вставьте token Telegram-бота. Все текстовые сообщения,
            отправленные этому боту, будут попадать в этот Souz-чат как
            сообщения пользователя.
          </p>
        </div>

        <Card
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary)",
            }}
          >
            Status
          </span>
          <strong style={{ color: status.tone }}>
            {loading ? "Loading…" : status.label}
          </strong>
          {!loading && lastErrorText && (
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {lastErrorText}
            </span>
          )}
        </Card>
      </div>

      <Input
        type="password"
        label="Token"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="123456:ABCDEF"
        autoComplete="new-password"
        spellCheck={false}
        disabled={loading || saving || removing}
        error={error ?? undefined}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            onClick={handleSave}
            disabled={!token.trim() || loading || saving || removing}
            loading={saving}
          >
            {saving ? "Saving…" : submitLabel}
          </Button>
          {binding && (
            <Button
              variant="danger"
              onClick={handleRemove}
              disabled={loading || saving || removing}
              loading={removing}
            >
              {removing ? "Removing…" : "Remove bot"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
