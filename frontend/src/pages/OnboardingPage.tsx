import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeOnboarding } from "../api/onboarding";
import { getProviderKeys, setProviderKey, deleteProviderKey } from "../api/providerKeys";
import { getSettings } from "../api/settings";
import { useAuth } from "../auth/useAuth";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { showToast } from "../components/ui/Toast";
import type { CompleteOnboardingRequest, OnboardingStep } from "../types/onboarding";
import type { ProviderKey, Settings } from "../types/settings";

const STEP_ORDER: OnboardingStep[] = ["welcome", "provider", "preferences"];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function stepToIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

function createCompletionPayload(
  settings: Settings,
  models: string[],
  recommendedDefaultModel: string | null
): CompleteOnboardingRequest {
  const fallbackModel =
    settings.defaultModel || recommendedDefaultModel || models[0] || "";

  return {
    defaultModel: fallbackModel,
    locale: settings.locale,
    timeZone: settings.timeZone,
    streamingMessages: settings.streamingMessages,
    showToolEvents: settings.showToolEvents,
    enabledTools: settings.enabledTools,
  };
}

export function OnboardingPage() {
  const {
    onboarding,
    bootstrap,
    refreshBootstrap,
    refreshOnboarding,
  } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<CompleteOnboardingRequest>(() =>
    createCompletionPayload(
      onboarding?.currentSettings ?? {
        defaultModel: "",
        contextSize: 32000,
        temperature: 0.7,
        locale: "en-US",
        timeZone: "UTC",
        systemPrompt: null,
        enabledTools: [],
        showToolEvents: true,
        streamingMessages: true,
      },
      onboarding?.availableModels ?? [],
      onboarding?.recommendedDefaultModel ?? null
    )
  );
  const [providerKeys, setProviderKeys] = useState<ProviderKey[]>([]);
  const [providerDrafts, setProviderDrafts] = useState<Record<string, string>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [providerKeysLoading, setProviderKeysLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [savingCompletion, setSavingCompletion] = useState(false);

  const availableModels = useMemo(() => {
    return unique([
      ...(onboarding?.availableModels ?? []),
      form.defaultModel,
      onboarding?.recommendedDefaultModel ?? "",
    ]);
  }, [form.defaultModel, onboarding]);

  const availableTools = useMemo(() => {
    return unique([
      ...(bootstrap?.capabilities.tools ?? []),
      ...form.enabledTools,
    ]);
  }, [bootstrap?.capabilities.tools, form.enabledTools]);

  useEffect(() => {
    if (!onboarding) {
      return;
    }

    setStepIndex((current) =>
      Math.max(current, stepToIndex(onboarding.currentStep))
    );

    setForm((current) => {
      const next = current.defaultModel
        ? current
        : createCompletionPayload(
            onboarding.currentSettings,
            onboarding.availableModels,
            onboarding.recommendedDefaultModel
          );

      if (
        next.defaultModel &&
        availableModels.length > 0 &&
        availableModels.includes(next.defaultModel)
      ) {
        return next;
      }

      return {
        ...next,
        defaultModel:
          next.defaultModel ||
          onboarding.recommendedDefaultModel ||
          onboarding.availableModels[0] ||
          "",
      };
    });
  }, [availableModels, onboarding]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (!cancelled) {
          setForm(
            createCompletionPayload(
              settings,
              onboarding?.availableModels ?? [],
              onboarding?.recommendedDefaultModel ?? null
            )
          );
        }
      } catch {
        // keep onboarding-provided defaults
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [onboarding?.availableModels, onboarding?.recommendedDefaultModel]);

  useEffect(() => {
    let cancelled = false;

    const loadProviderKeys = async () => {
      try {
        const keys = await getProviderKeys();
        if (!cancelled) {
          setProviderKeys(keys);
        }
      } catch {
        showToast("Failed to load provider keys");
      } finally {
        if (!cancelled) {
          setProviderKeysLoading(false);
        }
      }
    };

    void loadProviderKeys();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!onboarding) {
    return null;
  }

  const keyMap = new Map(providerKeys.map((key) => [key.provider, key]));
  const hasUsableModelAccess = onboarding.hasUsableModelAccess;
  const canFinish =
    hasUsableModelAccess &&
    Boolean(form.defaultModel) &&
    Boolean(form.locale) &&
    Boolean(form.timeZone);

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, STEP_ORDER.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const updateForm = <K extends keyof CompleteOnboardingRequest>(
    key: K,
    value: CompleteOnboardingRequest[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const loadProviderState = async () => {
    const [keys, state] = await Promise.all([
      getProviderKeys(),
      refreshOnboarding(),
    ]);

    setProviderKeys(keys);

    if (state && state.availableModels.length > 0) {
      setForm((current) => ({
        ...current,
        defaultModel:
          current.defaultModel ||
          state.recommendedDefaultModel ||
          state.availableModels[0] ||
          "",
      }));
    }
  };

  const handleSaveProviderKey = async (provider: string) => {
    const value = providerDrafts[provider]?.trim();

    if (!value) {
      return;
    }

    setSavingProvider(provider);
    try {
      await setProviderKey(provider, value);
      setProviderDrafts((current) => ({ ...current, [provider]: "" }));
      await loadProviderState();
      showToast("Provider key saved", "success");
    } catch {
      showToast("Failed to save provider key");
    } finally {
      setSavingProvider(null);
    }
  };

  const handleDeleteProviderKey = async (provider: string) => {
    setSavingProvider(provider);
    try {
      await deleteProviderKey(provider);
      await loadProviderState();
      showToast("Provider key removed", "success");
    } catch {
      showToast("Failed to remove provider key");
    } finally {
      setSavingProvider(null);
    }
  };

  const handleComplete = async () => {
    if (!canFinish) {
      return;
    }

    setSavingCompletion(true);
    try {
      await completeOnboarding(form);
      const state = await refreshOnboarding();
      await refreshBootstrap();

      if (state && !state.required) {
        navigate("/chats", { replace: true });
      } else {
        showToast("Setup saved, but onboarding is still required.");
      }
    } catch {
      showToast("Failed to finish onboarding");
    } finally {
      setSavingCompletion(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 16px 32px",
        overflowY: "auto",
        background:
          "radial-gradient(circle at top left, rgba(139,92,246,0.14), transparent 28%), radial-gradient(circle at bottom right, rgba(124,58,237,0.1), transparent 32%), var(--color-bg-primary)",
      }}
    >
      <div
        className="onboarding-layout"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
          gap: 20,
        }}
      >
        <Card
          style={{
            alignSelf: "start",
            position: "sticky",
            top: 24,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              First-run setup
            </span>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                background:
                  "linear-gradient(135deg, var(--color-accent), #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Welcome to Souz
            </h1>
            <p
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
              }}
            >
              We&apos;ll connect model access, lock in your defaults, and get
              you into chats without depending on bootstrap as the first gate.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                title: "Welcome",
                description: "Overview of what gets configured on first run.",
              },
              {
                title: "Provider access",
                description: "Choose a ready provider or add your own API key.",
              },
              {
                title: "Preferences",
                description: "Pick the default model and interface defaults.",
              },
            ].map((item, index) => {
              const active = index === stepIndex;
              const complete = index < stepIndex;

              return (
                <div
                  key={item.title}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px minmax(0, 1fr)",
                    gap: 12,
                    alignItems: "start",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    background: active
                      ? "rgba(139,92,246,0.12)"
                      : "transparent",
                    border: `1px solid ${
                      active
                        ? "var(--color-border-active)"
                        : "transparent"
                    }`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: complete
                        ? "rgba(52, 211, 153, 0.16)"
                        : active
                          ? "rgba(139,92,246,0.2)"
                          : "var(--color-bg-tertiary)",
                      color: complete
                        ? "var(--color-success)"
                        : active
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                    }}
                  >
                    {complete ? "✓" : index + 1}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.5,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "28px 28px 20px",
              borderBottom: "1px solid var(--color-border)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Step {stepIndex + 1} of {STEP_ORDER.length}
                </span>
                <h2 style={{ fontSize: "1.375rem", fontWeight: 700 }}>
                  {stepIndex === 0
                    ? "Welcome to Souz"
                    : stepIndex === 1
                      ? "Provider access"
                      : "Preferences"}
                </h2>
              </div>
              {onboarding.reasons.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {onboarding.reasons.map((reason) => (
                    <span
                      key={reason}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(251, 191, 36, 0.14)",
                        color: "var(--color-warning)",
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
            {stepIndex === 0 ? (
              <>
                <div style={{ display: "grid", gap: 16 }}>
                  <Card
                    style={{
                      padding: 18,
                      background: "rgba(139,92,246,0.08)",
                      borderColor: "rgba(139,92,246,0.18)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                        What this setup does
                      </h3>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          lineHeight: 1.7,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Souz separates account access from runtime bootstrap. We
                        only need to verify your onboarding state here, so a
                        temporary bootstrap failure won&apos;t block the first run.
                      </p>
                    </div>
                  </Card>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {[
                      "Pick a provider that is ready now or bring your own API key.",
                      "Choose a sensible default model and local interface settings.",
                      "Finish setup once at least one usable model path is available.",
                    ].map((text) => (
                      <div
                        key={text}
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          background: "var(--color-bg-tertiary)",
                          border: "1px solid var(--color-border)",
                          fontSize: "0.8125rem",
                          lineHeight: 1.6,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button onClick={goNext}>Continue</Button>
                </div>
              </>
            ) : null}

            {stepIndex === 1 ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {onboarding.availableServerManagedProviders.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                          Ready now
                        </h3>
                        <p
                          style={{
                            marginTop: 6,
                            fontSize: "0.875rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          These providers are managed on the server and work immediately.
                        </p>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {onboarding.availableServerManagedProviders.map((provider) => (
                          <Card
                            key={provider.provider}
                            style={{
                              padding: 18,
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              borderColor: provider.recommended
                                ? "var(--color-border-active)"
                                : undefined,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                              }}
                            >
                              <div style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                                {provider.provider}
                              </div>
                              <span
                                style={{
                                  padding: "5px 8px",
                                  borderRadius: 999,
                                  background: "rgba(52, 211, 153, 0.14)",
                                  color: "var(--color-success)",
                                  fontSize: "0.75rem",
                                }}
                              >
                                Ready on this server
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              {provider.models.map((model) => (
                                <span
                                  key={model}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background: "var(--color-bg-tertiary)",
                                    border: "1px solid var(--color-border)",
                                    fontSize: "0.75rem",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  {model}
                                </span>
                              ))}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                        Bring your own key
                      </h3>
                      <p
                        style={{
                          marginTop: 6,
                          fontSize: "0.875rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        These providers require an API key on your account before
                        they become usable.
                      </p>
                    </div>

                    {providerKeysLoading ? (
                      <div
                        className="skeleton"
                        style={{ width: "100%", height: 96, borderRadius: 16 }}
                      />
                    ) : onboarding.availableUserManagedProviders.length === 0 ? (
                      <div
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          background: "var(--color-bg-tertiary)",
                          color: "var(--color-text-secondary)",
                          fontSize: "0.875rem",
                        }}
                      >
                        No user-managed providers are available for this account.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {onboarding.availableUserManagedProviders.map((provider) => {
                          const key = keyMap.get(provider.provider);
                          const configured = key?.configured ?? provider.configured;
                          const expanded = expandedProvider === provider.provider;
                          const draftValue = providerDrafts[provider.provider] ?? "";

                          return (
                            <Card
                              key={provider.provider}
                              style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
                              data-testid={`user-provider-${provider.provider}`}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "center",
                                }}
                              >
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                                    {provider.provider}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 8,
                                      color: "var(--color-text-secondary)",
                                      fontSize: "0.8125rem",
                                    }}
                                  >
                                    <span
                                      style={{
                                        padding: "5px 8px",
                                        borderRadius: 999,
                                        background: configured
                                          ? "rgba(52, 211, 153, 0.14)"
                                          : "rgba(96, 165, 250, 0.14)",
                                        color: configured
                                          ? "var(--color-success)"
                                          : "var(--color-info)",
                                      }}
                                    >
                                      {configured ? "Configured" : "API key required"}
                                    </span>
                                    {key?.keyHint ? <span>{key.keyHint}</span> : null}
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      setExpandedProvider((current) =>
                                        current === provider.provider
                                          ? null
                                          : provider.provider
                                      )
                                    }
                                  >
                                    {configured ? "Replace key" : "Add key"}
                                  </Button>
                                  {configured ? (
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      loading={savingProvider === provider.provider}
                                      onClick={() =>
                                        void handleDeleteProviderKey(provider.provider)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  ) : null}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                }}
                              >
                                {provider.models.map((model) => (
                                  <span
                                    key={model}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: 999,
                                      background: "var(--color-bg-tertiary)",
                                      border: "1px solid var(--color-border)",
                                      fontSize: "0.75rem",
                                      fontFamily: "var(--font-mono)",
                                    }}
                                  >
                                    {model}
                                  </span>
                                ))}
                              </div>

                              {expanded ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "minmax(0, 1fr) auto",
                                    gap: 10,
                                    alignItems: "end",
                                  }}
                                >
                                  <Input
                                    type="password"
                                    placeholder="Paste API key"
                                    value={draftValue}
                                    onChange={(event) =>
                                      setProviderDrafts((current) => ({
                                        ...current,
                                        [provider.provider]: event.target.value,
                                      }))
                                    }
                                  />
                                  <Button
                                    size="sm"
                                    loading={savingProvider === provider.provider}
                                    disabled={!draftValue.trim()}
                                    onClick={() =>
                                      void handleSaveProviderKey(provider.provider)
                                    }
                                  >
                                    Save key
                                  </Button>
                                </div>
                              ) : null}
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!hasUsableModelAccess ? (
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(251, 191, 36, 0.12)",
                        border: "1px solid rgba(251, 191, 36, 0.18)",
                        color: "var(--color-warning)",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                      }}
                    >
                      Finish will stay locked until at least one usable model
                      access path is available.
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Button variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <Button onClick={goNext}>Continue</Button>
                </div>
              </>
            ) : null}

            {stepIndex === 2 ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Default model
                      </label>
                      <select
                        value={form.defaultModel}
                        onChange={(event) =>
                          updateForm("defaultModel", event.target.value)
                        }
                        style={{
                          padding: "10px 14px",
                          fontSize: "0.875rem",
                          fontFamily: "var(--font-sans)",
                          background: "var(--color-bg-primary)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          outline: "none",
                        }}
                      >
                        {availableModels.length === 0 ? (
                          <option value="">No usable models yet</option>
                        ) : (
                          availableModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <Input
                      label="Locale"
                      value={form.locale}
                      onChange={(event) =>
                        updateForm("locale", event.target.value)
                      }
                      placeholder="ru-RU"
                    />

                    <Input
                      label="Time zone"
                      value={form.timeZone}
                      onChange={(event) =>
                        updateForm("timeZone", event.target.value)
                      }
                      placeholder="Europe/Moscow"
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 14,
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-bg-tertiary)",
                        border: "1px solid var(--color-border)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.streamingMessages}
                        onChange={(event) =>
                          updateForm("streamingMessages", event.target.checked)
                        }
                      />
                      <span style={{ fontSize: "0.875rem" }}>Stream messages</span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 14,
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-bg-tertiary)",
                        border: "1px solid var(--color-border)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.showToolEvents}
                        onChange={(event) =>
                          updateForm("showToolEvents", event.target.checked)
                        }
                      />
                      <span style={{ fontSize: "0.875rem" }}>Show tool events</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                        Enabled tools
                      </h3>
                      <p
                        style={{
                          marginTop: 6,
                          fontSize: "0.875rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        This uses your current settings payload and augments it
                        with any tool catalog that bootstrap already exposed.
                      </p>
                    </div>

                    {availableTools.length === 0 ? (
                      <div
                        style={{
                          padding: "14px 16px",
                          borderRadius: "var(--radius-md)",
                          background: "var(--color-bg-tertiary)",
                          color: "var(--color-text-secondary)",
                          fontSize: "0.875rem",
                        }}
                      >
                        No tool catalog is available yet. You can still finish
                        onboarding and update this later in settings.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {availableTools.map((tool) => {
                          const selected = form.enabledTools.includes(tool);

                          return (
                            <button
                              key={tool}
                              type="button"
                              onClick={() =>
                                updateForm(
                                  "enabledTools",
                                  selected
                                    ? form.enabledTools.filter((value) => value !== tool)
                                    : [...form.enabledTools, tool]
                                )
                              }
                              style={{
                                padding: "8px 12px",
                                fontSize: "0.75rem",
                                fontFamily: "var(--font-mono)",
                                borderRadius: "var(--radius-sm)",
                                cursor: "pointer",
                                background: selected
                                  ? "rgba(139,92,246,0.2)"
                                  : "var(--color-bg-primary)",
                                border: `1px solid ${
                                  selected
                                    ? "var(--color-border-active)"
                                    : "var(--color-border)"
                                }`,
                                color: selected
                                  ? "var(--color-accent)"
                                  : "var(--color-text-secondary)",
                              }}
                            >
                              {tool}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!hasUsableModelAccess ? (
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(248, 113, 113, 0.12)",
                        border: "1px solid rgba(248, 113, 113, 0.18)",
                        color: "var(--color-error)",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                      }}
                    >
                      You still need at least one usable model access path
                      before onboarding can be completed.
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Button variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <Button
                    onClick={() => void handleComplete()}
                    loading={savingCompletion}
                    disabled={!canFinish}
                  >
                    Finish setup
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </Card>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .onboarding-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
