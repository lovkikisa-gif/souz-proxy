import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteChatTelegramBot,
  getChatTelegramBot,
  upsertChatTelegramBot,
  type TelegramBotBindingDto,
} from "../../api/chats";
import { ApiError } from "../../types/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

const POLL_INTERVAL_MS = 4000;
const GENERIC_UPDATE_ERROR =
  "Could not update Telegram bot settings. Try again.";
const GENERIC_CHECK_ERROR =
  "Could not refresh Telegram bot status. Try again.";
const GENERIC_DELETE_ERROR =
  "Could not disconnect Telegram bot. Try again.";
const INVALID_TOKEN_ERROR =
  "Telegram rejected this token. Check that you copied it from @BotFather.";

function containsTelegramToken(value: string): boolean {
  return /\b\d{5,}:[^\s]+\b/.test(value);
}

function getSafeApiMessage(error: ApiError): string | null {
  const message = error.message?.trim();
  if (!message || containsTelegramToken(message)) {
    return null;
  }
  return message;
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "invalid_telegram_bot_token") {
      return INVALID_TOKEN_ERROR;
    }

    return getSafeApiMessage(error) ?? GENERIC_UPDATE_ERROR;
  }

  return GENERIC_UPDATE_ERROR;
}

function getDeleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return getSafeApiMessage(error) ?? GENERIC_DELETE_ERROR;
  }

  return GENERIC_DELETE_ERROR;
}

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return getSafeApiMessage(error) ?? GENERIC_CHECK_ERROR;
  }

  return GENERIC_CHECK_ERROR;
}

function formatBotName(binding: TelegramBotBindingDto): string {
  if (binding.botUsername?.trim()) {
    return ensureHandle(binding.botUsername);
  }

  return binding.botFirstName?.trim() || "Telegram bot";
}

function formatTelegramAccount(binding: TelegramBotBindingDto): string {
  if (binding.telegramUsername?.trim()) {
    return ensureHandle(binding.telegramUsername);
  }

  const fullName = [binding.telegramFirstName, binding.telegramLastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || "Telegram user";
}

function ensureHandle(value: string): string {
  return value.startsWith("@") ? value : `@${value}`;
}

function getTelegramBotUrl(botUsername?: string): string | null {
  const username = botUsername?.replace(/^@/, "").trim();
  if (!username) {
    return null;
  }

  return `https://t.me/${username}`;
}

function formatLinkedAt(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "pending" | "connected";
}) {
  const palette =
    tone === "connected"
      ? {
          color: "var(--color-success)",
          background: "rgba(74, 222, 128, 0.14)",
          border: "rgba(74, 222, 128, 0.28)",
        }
      : {
          color: "var(--color-warning)",
          background: "rgba(251, 191, 36, 0.14)",
          border: "rgba(251, 191, 36, 0.28)",
        };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        fontSize: "0.8125rem",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function DetailsRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span
        style={{
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        background: "rgba(248, 113, 113, 0.12)",
        color: "var(--color-error)",
        padding: "12px 14px",
        fontSize: "0.875rem",
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}

export function TelegramBotSettings({ chatId }: { chatId: string }) {
  const [binding, setBinding] = useState<TelegramBotBindingDto | null>(null);
  const [token, setToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [removing, setRemoving] = useState(false);

  const refreshBinding = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (background) {
        setCheckingStatus(true);
      }

      try {
        const telegramBot = await getChatTelegramBot(chatId);
        setBinding(telegramBot ? { ...telegramBot } : null);
        setError(null);
        return telegramBot;
      } catch (loadError) {
        setError(getLoadErrorMessage(loadError));
        return null;
      } finally {
        if (background) {
          setCheckingStatus(false);
        }
      }
    },
    [chatId]
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setBinding(null);
    setToken("");
    setTokenVisible(false);
    setError(null);

    getChatTelegramBot(chatId)
      .then((telegramBot) => {
        if (!cancelled) {
          setBinding(telegramBot ? { ...telegramBot } : null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(getLoadErrorMessage(loadError));
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

  useEffect(() => {
    if (!binding || !binding.enabled || binding.linked) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshBinding({ background: true });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [binding, refreshBinding]);

  const activeBinding = binding?.enabled === false ? null : binding;
  const telegramBotUrl = getTelegramBotUrl(activeBinding?.botUsername);
  const linkedAt = formatLinkedAt(activeBinding?.linkedAt);
  const connectDisabled =
    loading || saving || checkingStatus || removing || !token.trim();

  const botLabel = useMemo(
    () => (activeBinding ? formatBotName(activeBinding) : null),
    [activeBinding]
  );
  const telegramAccountLabel = useMemo(
    () =>
      activeBinding?.linked ? formatTelegramAccount(activeBinding) : null,
    [activeBinding]
  );

  const handleConnect = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const telegramBot = await upsertChatTelegramBot(chatId, trimmedToken, true);
      setBinding(telegramBot);
      setToken("");
      setTokenVisible(false);
      await refreshBinding({ background: true });
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCheckStatus = async () => {
    setError(null);
    await refreshBinding({ background: true });
  };

  const handleDisconnect = async () => {
    setRemoving(true);
    setError(null);

    try {
      await deleteChatTelegramBot(chatId);
      setBinding(null);
      setToken("");
      setTokenVisible(false);
    } catch (deleteError) {
      setError(getDeleteErrorMessage(deleteError));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          Подключите Telegram-бота, чтобы писать агенту из Telegram.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <Card
          style={{
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
            Loading…
          </span>
        </Card>
      ) : null}

      {!loading && !activeBinding ? (
        <Card
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="telegram-bot-token"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              Bot token
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 8,
              }}
            >
              <input
                id="telegram-bot-token"
                type={tokenVisible ? "text" : "password"}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                autoComplete="new-password"
                placeholder="123456789:AA..."
                spellCheck={false}
                disabled={loading || saving || checkingStatus || removing}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "10px 14px",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-sans)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  border: `1px solid ${error ? "var(--color-error)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  outline: "none",
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTokenVisible((current) => !current)}
                disabled={loading || saving || checkingStatus || removing}
              >
                {tokenVisible ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-secondary)",
              }}
            >
              Token можно получить у @BotFather.
            </span>
            <Button
              onClick={handleConnect}
              disabled={connectDisabled}
              loading={saving}
            >
              {saving ? "Connecting…" : "Connect bot"}
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && activeBinding ? (
        <Card
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <StatusBadge
              label={activeBinding.linked ? "Connected" : "Waiting for Telegram"}
              tone={activeBinding.linked ? "connected" : "pending"}
            />
            {botLabel ? <DetailsRow label="Bot" value={botLabel} /> : null}
          </div>

          {!activeBinding.linked ? (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                Напишите любое сообщение вашему боту в Telegram.
              </p>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                }}
              >
                Первый Telegram-аккаунт, который напишет этому боту, будет
                привязан к этому чату Souz. После этого сообщения от других
                аккаунтов будут игнорироваться.
              </p>
              {telegramBotUrl ? (
                <a
                  href={telegramBotUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "var(--color-accent)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Open Telegram bot
                </a>
              ) : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCheckStatus}
                  disabled={saving || removing}
                  loading={checkingStatus}
                >
                  {checkingStatus ? "Checking status…" : "Check status"}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDisconnect}
                  disabled={saving || checkingStatus}
                  loading={removing}
                >
                  {removing ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {telegramAccountLabel ? (
                <DetailsRow
                  label="Linked Telegram account"
                  value={telegramAccountLabel}
                />
              ) : null}
              {linkedAt ? (
                <p
                  style={{
                    margin: 0,
                    color: "var(--color-text-secondary)",
                    fontSize: "0.8125rem",
                    lineHeight: 1.5,
                  }}
                >
                  Linked on {linkedAt}
                </p>
              ) : null}
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                }}
              >
                Теперь сообщения из этого Telegram-аккаунта будут отправляться
                агенту в этот Souz chat.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDisconnect}
                  disabled={saving || checkingStatus}
                  loading={removing}
                >
                  {removing ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
