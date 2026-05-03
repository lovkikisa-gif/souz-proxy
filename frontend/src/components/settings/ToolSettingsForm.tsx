import { useState, useEffect } from "react";
import { getSettings, updateSettings } from "../../api/settings";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
import { showToast } from "../ui/Toast";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function ToolSettingsForm() {
  const {
    bootstrap,
    onboarding,
    refreshBootstrap,
    refreshOnboarding,
  } = useAuth();
  const seedSettings = bootstrap?.settings ?? onboarding?.currentSettings ?? null;
  const [enabled, setEnabled] = useState<string[]>([]);
  const [showTool, setShowTool] = useState(true);
  const [streaming, setStreaming] = useState(true);
  const [loading, setLoading] = useState(!seedSettings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const allTools = unique([
    ...(bootstrap?.capabilities.tools ?? []),
    ...enabled,
  ]);

  useEffect(() => {
    if (seedSettings && !dirty) {
      setEnabled(seedSettings.enabledTools);
      setShowTool(seedSettings.showToolEvents);
      setStreaming(seedSettings.streamingMessages);
      setLoading(false);
      setDirty(false);
    }
  }, [dirty, seedSettings]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (!cancelled && !dirty) {
          setEnabled(settings.enabledTools);
          setShowTool(settings.showToolEvents);
          setStreaming(settings.streamingMessages);
        }
      } catch {
        // keep seed settings
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

  const toggleTool = (t: string) => {
    setEnabled((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ enabledTools: enabled, showToolEvents: showTool, streamingMessages: streaming });
      await Promise.allSettled([refreshBootstrap(), refreshOnboarding()]);
      setDirty(false);
      showToast("Settings saved", "success");
    } catch { showToast("Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading && allTools.length === 0 && enabled.length === 0) {
    return <div className="skeleton" style={{ height: 180, width: "100%" }} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Tools & Interface</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Enabled Tools</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {allTools.map((t) => (
            <button key={t} onClick={() => toggleTool(t)} style={{
              padding: "6px 12px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all 0.15s",
              background: enabled.includes(t) ? "rgba(139,92,246,0.2)" : "var(--color-bg-primary)",
              border: `1px solid ${enabled.includes(t) ? "var(--color-border-active)" : "var(--color-border)"}`,
              color: enabled.includes(t) ? "var(--color-accent)" : "var(--color-text-muted)",
            }}>{t}</button>
          ))}
          {allTools.length === 0 && <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>No tools available</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={showTool} onChange={(e) => { setShowTool(e.target.checked); setDirty(true); }} />
          <span style={{ fontSize: "0.8125rem" }}>Show tool events in chat</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={streaming} onChange={(e) => { setStreaming(e.target.checked); setDirty(true); }} />
          <span style={{ fontSize: "0.8125rem" }}>Stream messages</span>
        </label>
      </div>
      {dirty && <Button onClick={save} loading={saving} size="sm">Save</Button>}
    </div>
  );
}
