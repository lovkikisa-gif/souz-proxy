import { useState, useEffect } from "react";
import type { Settings } from "../../types/settings";
import { getSettings, updateSettings } from "../../api/settings";
import { useAuth } from "../../auth/useAuth";
import { localeOptions } from "../../constants/locales";
import { Button } from "../ui/Button";
import { showToast } from "../ui/Toast";

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
  const seedSettings = bootstrap?.settings ?? onboarding?.currentSettings ?? null;
  const [form, setForm] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(!seedSettings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (seedSettings && !dirty) {
      setForm({ ...seedSettings });
      setLoading(false);
    }
  }, [dirty, seedSettings]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (!cancelled && !dirty) {
          setForm({ ...settings });
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
      const settings = await updateSettings(form);
      setForm({ ...settings });
      await Promise.allSettled([refreshBootstrap(), refreshOnboarding()]);
      setDirty(false);
      showToast("Settings saved", "success");
    } catch { showToast("Failed to save settings"); }
    finally { setSaving(false); }
  };

  const reset = () => {
    if (seedSettings) {
      setForm({ ...seedSettings });
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Model Settings</h3>
      {/* Default Model */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Default Model</label>
        <select value={form.defaultModel ?? ""} onChange={(e) => update("defaultModel", e.target.value)}
          style={{ padding: "10px 14px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", outline: "none" }}>
          {models.length === 0 ? (
            <option value="">No models available yet</option>
          ) : (
            models.map((m) => <option key={m} value={m}>{m}</option>)
          )}
        </select>
      </div>
      {/* Context Size */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Context Size: {form.contextSize}</label>
        <input type="range" min={1024} max={128000} step={1024} value={form.contextSize ?? 32000} onChange={(e) => update("contextSize", Number(e.target.value))} />
      </div>
      {/* Temperature */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Temperature: {(form.temperature ?? 0.7).toFixed(2)}</label>
        <input type="range" min={0} max={2} step={0.05} value={form.temperature ?? 0.7} onChange={(e) => update("temperature", Number(e.target.value))} />
      </div>
      {/* System Prompt */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>System Prompt</label>
        <textarea value={form.systemPrompt ?? ""} onChange={(e) => update("systemPrompt", e.target.value || null)} rows={4}
          style={{ padding: "10px 14px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", outline: "none", resize: "vertical" }} placeholder="Custom system prompt (optional)" />
      </div>
      {/* Locale & Timezone */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="model-settings-locale" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Locale</label>
          <select id="model-settings-locale" aria-label="Locale" value={form.locale ?? ""} onChange={(e) => update("locale", e.target.value)} style={{ padding: "10px 14px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", outline: "none" }}>
            {locales.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Timezone</label>
          <input value={form.timeZone ?? ""} onChange={(e) => update("timeZone", e.target.value)} style={{ padding: "10px 14px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", outline: "none" }} />
        </div>
      </div>
      {dirty && (
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={save} loading={saving}>Save</Button>
          <Button onClick={reset} variant="secondary" disabled={!seedSettings}>Reset</Button>
        </div>
      )}
    </div>
  );
}
