import { useState } from "react";
import { ModelSettingsForm } from "../components/settings/ModelSettingsForm";
import { ToolSettingsForm } from "../components/settings/ToolSettingsForm";
import { ProviderKeysPanel } from "../components/settings/ProviderKeysPanel";

type Tab = "model" | "tools" | "keys";

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("model");

  const tabs: { key: Tab; label: string }[] = [
    { key: "model", label: "Model" },
    { key: "tools", label: "Tools" },
    { key: "keys", label: "Provider Keys" },
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 24,
          background: "linear-gradient(135deg, var(--color-accent), #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Settings
        </h1>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "8px 16px", fontSize: "0.8125rem", fontWeight: 500,
              background: tab === t.key ? "var(--color-bg-tertiary)" : "transparent",
              color: tab === t.key ? "var(--color-text-primary)" : "var(--color-text-muted)",
              border: "none", borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
              cursor: "pointer", transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>
        {/* Content */}
        <div className="glass-card" style={{ padding: 24 }}>
          {tab === "model" && <ModelSettingsForm />}
          {tab === "tools" && <ToolSettingsForm />}
          {tab === "keys" && <ProviderKeysPanel />}
        </div>
      </div>
    </div>
  );
}
