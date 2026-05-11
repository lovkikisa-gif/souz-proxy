import { useState, useEffect } from "react";
import { getSettings, updateSettings } from "../../api/settings";
import { useAuth } from "../../auth/useAuth";
import { useAppPreferences } from "../../preferences/AppPreferencesProvider";
import { Button } from "../ui/Button";
import { showToast } from "../ui/Toast";
import { actionsRowStyle, formStackStyle, sectionTitleStyle } from "./styles";

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
  const { t } = useAppPreferences();
  const seedSettings = bootstrap?.settings ?? onboarding?.currentSettings ?? null;
  const [enabled, setEnabled] = useState<string[]>([]);
  const [showTool, setShowTool] = useState(true);
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
      await updateSettings({ enabledTools: enabled, showToolEvents: showTool });
      await Promise.allSettled([refreshBootstrap(), refreshOnboarding()]);
      setDirty(false);
      showToast(t("settings.saved"), "success");
    } catch { showToast(t("settings.failed")); }
    finally { setSaving(false); }
  };

  if (loading && allTools.length === 0 && enabled.length === 0) {
    return <div className="skeleton" style={{ height: 180, width: "100%" }} />;
  }

  return (
    <div style={formStackStyle}>
      <h3 style={sectionTitleStyle}>{t("settings.tools.title")}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>{t("settings.tools.enabledTools")}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {allTools.map((toolName) => (
            <button key={toolName} onClick={() => toggleTool(toolName)} style={{
              padding: "6px 12px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all 0.15s",
              background: enabled.includes(toolName) ? "rgba(139,92,246,0.2)" : "var(--color-bg-primary)",
              border: `1px solid ${enabled.includes(toolName) ? "var(--color-border-active)" : "var(--color-border)"}`,
              color: enabled.includes(toolName) ? "var(--color-accent)" : "var(--color-text-muted)",
            }}>{toolName}</button>
          ))}
          {allTools.length === 0 && <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{t("settings.tools.none")}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={showTool} onChange={(e) => { setShowTool(e.target.checked); setDirty(true); }} />
          <span style={{ fontSize: "0.8125rem" }}>{t("settings.tools.showToolEvents")}</span>
        </label>
      </div>
      {dirty && (
        <div style={actionsRowStyle}>
          <Button onClick={save} loading={saving} size="sm">
            {t("common.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
