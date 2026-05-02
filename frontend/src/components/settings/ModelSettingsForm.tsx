import { useState, useEffect } from "react";
import type { Settings } from "../../types/settings";
import { updateSettings } from "../../api/settings";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
import { showToast } from "../ui/Toast";

export function ModelSettingsForm() {
  const { bootstrap, refreshBootstrap } = useAuth();
  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (bootstrap?.settings) {
      setForm({ ...bootstrap.settings });
      setDirty(false);
    }
  }, [bootstrap?.settings]);

  const update = (key: keyof Settings, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      await refreshBootstrap();
      setDirty(false);
      showToast("Settings saved", "success");
    } catch { showToast("Failed to save settings"); }
    finally { setSaving(false); }
  };

  const reset = () => {
    if (bootstrap?.settings) {
      setForm({ ...bootstrap.settings });
      setDirty(false);
    }
  };

  const models = bootstrap?.capabilities.models ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Model Settings</h3>
      {/* Default Model */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Default Model</label>
        <select value={form.defaultModel ?? ""} onChange={(e) => update("defaultModel", e.target.value)}
          style={{ padding: "10px 14px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", outline: "none" }}>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {/* Context Size */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Context Size: {form.contextSize}</label>
        <input type="range" min={1024} max={128000} step={1024} value={form.contextSize ?? 4096} onChange={(e) => update("contextSize", Number(e.target.value))} />
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
          <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Locale</label>
          <input value={form.locale ?? ""} onChange={(e) => update("locale", e.target.value)} style={{ padding: "10px 14px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", outline: "none" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Timezone</label>
          <input value={form.timeZone ?? ""} onChange={(e) => update("timeZone", e.target.value)} style={{ padding: "10px 14px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", outline: "none" }} />
        </div>
      </div>
      {dirty && (
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={save} loading={saving}>Save</Button>
          <Button onClick={reset} variant="secondary">Reset</Button>
        </div>
      )}
    </div>
  );
}
