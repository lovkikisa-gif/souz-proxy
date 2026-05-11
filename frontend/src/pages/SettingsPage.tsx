import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { GeneralSettingsForm } from "../components/settings/GeneralSettingsForm";
import { ModelSettingsForm } from "../components/settings/ModelSettingsForm";
import { ToolSettingsForm } from "../components/settings/ToolSettingsForm";
import { ProviderKeysPanel } from "../components/settings/ProviderKeysPanel";
import { useAppPreferences } from "../preferences/AppPreferencesProvider";
import { Button } from "../components/ui/Button";
import {
  settingsCardStyle,
  settingsHeaderStyle,
  settingsPageInnerStyle,
  settingsPageStyle,
  settingsTitleStyle,
  tabButtonStyle,
  tabListStyle,
} from "../components/settings/styles";

type Tab = "general" | "model" | "tools" | "keys";

interface SettingsOutletContext {
  lastVisitedChatId?: string | null;
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const navigate = useNavigate();
  const { lastVisitedChatId } = useOutletContext<SettingsOutletContext>();
  const { t } = useAppPreferences();

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: t("settings.tab.general") },
    { key: "model", label: t("settings.tab.model") },
    { key: "tools", label: t("settings.tab.tools") },
    { key: "keys", label: t("settings.tab.keys") },
  ];

  return (
    <div style={settingsPageStyle}>
      <div style={settingsPageInnerStyle}>
        <div style={settingsHeaderStyle}>
          <h1 style={settingsTitleStyle}>{t("settings.title")}</h1>
          <Button
            aria-label={t("settings.close")}
            variant="secondary"
            size="sm"
            onClick={() => {
              if (lastVisitedChatId) {
                navigate(`/chats/${lastVisitedChatId}`);
                return;
              }

              navigate("/chats");
            }}
          >
            ✕
          </Button>
        </div>

        <div style={tabListStyle}>
          {tabs.map((tabOption) => (
            <button
              key={tabOption.key}
              role="tab"
              aria-selected={tab === tabOption.key}
              onClick={() => setTab(tabOption.key)}
              style={tabButtonStyle(tab === tabOption.key)}
            >
              {tabOption.label}
            </button>
          ))}
        </div>

        <div className="glass-card" style={settingsCardStyle}>
          {tab === "general" && <GeneralSettingsForm />}
          {tab === "model" && <ModelSettingsForm />}
          {tab === "tools" && <ToolSettingsForm />}
          {tab === "keys" && <ProviderKeysPanel />}
        </div>
      </div>
    </div>
  );
}
