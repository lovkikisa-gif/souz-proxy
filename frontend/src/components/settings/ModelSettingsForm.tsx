import { useState, useEffect } from "react";
import type { Settings } from "../../types/settings";
import { getSettings, updateSettings } from "../../api/settings";
import { useAuth } from "../../auth/useAuth";
import { localeOptions } from "../../constants/locales";
import { useAppPreferences } from "../../preferences/AppPreferencesProvider";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { showToast } from "../ui/Toast";
import {
  actionsRowStyle,
  fieldStackStyle,
  formStackStyle,
  inputLikeStyle,
  sectionTitleStyle,
  textAreaStyle,
  twoColumnGridStyle,
} from "./styles";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function ModelSettingsForm() {
  const {
    bootstrap,
    onboarding,
    refreshBootstrap,
    refreshOnboarding,
  } = useAuth();
  const { preferences, savePreferences, t } = useAppPreferences();
  const seedSettings = bootstrap?.settings ?? onboarding?.currentSettings ?? null;
  const [form, setForm] = useState<Partial<Settings>>({});
  const [savedForm, setSavedForm] = useState<Partial<Settings>>({});
  const [requestTimeoutMillis, setRequestTimeoutMillis] = useState(
    preferences.requestTimeoutMillis
  );
  const [loading, setLoading] = useState(!seedSettings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (seedSettings && !dirty) {
      setForm({ ...seedSettings });
      setSavedForm({ ...seedSettings });
      setRequestTimeoutMillis(preferences.requestTimeoutMillis);
      setLoading(false);
    }
  }, [dirty, preferences.requestTimeoutMillis, seedSettings]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (!cancelled && !dirty) {
          setForm({ ...settings });
          setSavedForm({ ...settings });
        }
      } catch {
        // keep seed settings when bootstrap exists but settings fetch is unavailable
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [dirty]);

  const update = (key: keyof Settings, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const hasRemoteChanges =
        form.defaultModel !== savedForm.defaultModel ||
        form.contextSize !== savedForm.contextSize ||
        form.temperature !== savedForm.temperature ||
        form.locale !== savedForm.locale ||
        form.timeZone !== savedForm.timeZone ||
        form.systemPrompt !== savedForm.systemPrompt;
      const settings = hasRemoteChanges ? await updateSettings(form) : savedForm;
      savePreferences({ requestTimeoutMillis });
      setForm({ ...settings });
      setSavedForm({ ...settings });
      await Promise.allSettled([refreshBootstrap(), refreshOnboarding()]);
      setDirty(false);
      showToast(t("settings.saved"), "success");
    } catch {
      showToast(t("settings.failed"));
    }
    finally { setSaving(false); }
  };

  const reset = () => {
    if (savedForm) {
      setForm({ ...savedForm });
      setRequestTimeoutMillis(preferences.requestTimeoutMillis);
      setDirty(false);
    }
  };

  const models = unique([
    ...(bootstrap?.capabilities.models ?? []),
    ...(onboarding?.availableModels ?? []),
    form.defaultModel ?? "",
  ]);
  const locales = localeOptions(form.locale);

  if (loading && !form.defaultModel) {
    return <div className="skeleton" style={{ height: 240, width: "100%" }} />;
  }

  return (
    <div style={formStackStyle}>
      <h3 style={sectionTitleStyle}>{t("settings.model.title")}</h3>

      <div style={fieldStackStyle}>
        <label htmlFor="default-model" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
          {t("settings.model.defaultModel")}
        </label>
        <select
          id="default-model"
          value={form.defaultModel ?? ""}
          onChange={(e) => update("defaultModel", e.target.value)}
          style={inputLikeStyle}
        >
          {models.length === 0 ? (
            <option value="">No models available yet</option>
          ) : (
            models.map((m) => <option key={m} value={m}>{m}</option>)
          )}
        </select>
      </div>

      <div style={twoColumnGridStyle}>
        <Input
          label={t("settings.model.contextSize")}
          type="number"
          min={1024}
          step={1024}
          value={form.contextSize ?? 32000}
          onChange={(event) => update("contextSize", Number(event.target.value))}
        />
        <Input
          label={t("settings.model.temperature")}
          type="number"
          min={0}
          max={2}
          step={0.05}
          value={form.temperature ?? 0.7}
          onChange={(event) => update("temperature", Number(event.target.value))}
        />
      </div>

      <Input
        label={t("settings.model.timeout")}
        type="number"
        min={1000}
        step={1000}
        value={requestTimeoutMillis}
        onChange={(event) => {
          setRequestTimeoutMillis(Number(event.target.value));
          setDirty(true);
        }}
      />

      <div style={fieldStackStyle}>
        <label
          htmlFor="system-prompt"
          style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}
        >
          {t("settings.model.systemPrompt")}
        </label>
        <textarea
          id="system-prompt"
          value={form.systemPrompt ?? ""}
          onChange={(e) => update("systemPrompt", e.target.value || null)}
          rows={4}
          style={textAreaStyle}
          placeholder={t("settings.model.systemPromptPlaceholder")}
        />
      </div>

      <div style={twoColumnGridStyle}>
        <div style={fieldStackStyle}>
          <label htmlFor="model-settings-locale" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
            {t("settings.model.locale")}
          </label>
          <select
            id="model-settings-locale"
            aria-label={t("settings.model.locale")}
            value={form.locale ?? ""}
            onChange={(e) => update("locale", e.target.value)}
            style={inputLikeStyle}
          >
            {locales.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
          </select>
        </div>
        <div style={fieldStackStyle}>
          <label htmlFor="model-settings-timezone" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
            {t("settings.model.timeZone")}
          </label>
          <input
            id="model-settings-timezone"
            aria-label={t("settings.model.timeZone")}
            value={form.timeZone ?? ""}
            onChange={(e) => update("timeZone", e.target.value)}
            style={inputLikeStyle}
          />
        </div>
      </div>

      {dirty && (
        <div style={actionsRowStyle}>
          <Button onClick={save} loading={saving}>{t("common.save")}</Button>
          <Button onClick={reset} variant="secondary" disabled={!seedSettings}>{t("common.reset")}</Button>
        </div>
      )}
    </div>
  );
}
