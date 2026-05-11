import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../../api/settings";
import { useAuth } from "../../auth/useAuth";
import {
  type InterfaceLanguage,
  useAppPreferences,
} from "../../preferences/AppPreferencesProvider";
import { Button } from "../ui/Button";
import { showToast } from "../ui/Toast";
import {
  actionsRowStyle,
  fieldStackStyle,
  formStackStyle,
  helperTextStyle,
  inputLikeStyle,
  labelStyle,
  sectionTitleStyle,
  toggleRowStyle,
} from "./styles";

export function GeneralSettingsForm() {
  const {
    bootstrap,
    onboarding,
    refreshBootstrap,
    refreshOnboarding,
  } = useAuth();
  const { preferences, savePreferences, t } = useAppPreferences();
  const seedSettings = bootstrap?.settings ?? onboarding?.currentSettings ?? null;
  const [streamingMessages, setStreamingMessages] = useState(
    seedSettings?.streamingMessages ?? true
  );
  const [savedStreamingMessages, setSavedStreamingMessages] = useState(
    seedSettings?.streamingMessages ?? true
  );
  const [interfaceLanguage, setInterfaceLanguage] = useState<InterfaceLanguage>(
    preferences.interfaceLanguage
  );
  const [useFewShotExamples, setUseFewShotExamples] = useState(
    preferences.useFewShotExamples
  );
  const [loading, setLoading] = useState(!seedSettings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (seedSettings && !dirty) {
      setStreamingMessages(seedSettings.streamingMessages);
      setSavedStreamingMessages(seedSettings.streamingMessages);
      setInterfaceLanguage(preferences.interfaceLanguage);
      setUseFewShotExamples(preferences.useFewShotExamples);
      setLoading(false);
    }
  }, [dirty, preferences.interfaceLanguage, preferences.useFewShotExamples, seedSettings]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (!cancelled && !dirty) {
          setStreamingMessages(settings.streamingMessages);
          setSavedStreamingMessages(settings.streamingMessages);
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

  const save = async () => {
    setSaving(true);

    try {
      if (streamingMessages !== savedStreamingMessages) {
        await updateSettings({ streamingMessages });
      }
      savePreferences({
        interfaceLanguage,
        useFewShotExamples,
      });
      await Promise.allSettled([refreshBootstrap(), refreshOnboarding()]);
      setSavedStreamingMessages(streamingMessages);
      setDirty(false);
      showToast(t("settings.saved"), "success");
    } catch {
      showToast(t("settings.failed"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStreamingMessages(savedStreamingMessages);
    setInterfaceLanguage(preferences.interfaceLanguage);
    setUseFewShotExamples(preferences.useFewShotExamples);
    setDirty(false);
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 220, width: "100%" }} />;
  }

  return (
    <div style={formStackStyle}>
      <h3 style={sectionTitleStyle}>{t("settings.general.title")}</h3>

      <div style={fieldStackStyle}>
        <label htmlFor="interface-language" style={labelStyle}>
          {t("settings.general.interfaceLanguage")}
        </label>
        <select
          id="interface-language"
          aria-label={t("settings.general.interfaceLanguage")}
          value={interfaceLanguage}
          onChange={(event) => {
            setInterfaceLanguage(event.target.value as InterfaceLanguage);
            setDirty(true);
          }}
          style={inputLikeStyle}
        >
          <option value="en">{t("settings.general.language.en")}</option>
          <option value="ru">{t("settings.general.language.ru")}</option>
        </select>
      </div>

      <label style={toggleRowStyle}>
        <input
          type="checkbox"
          checked={streamingMessages}
          onChange={(event) => {
            setStreamingMessages(event.target.checked);
            setDirty(true);
          }}
        />
        <span style={{ fontSize: "0.875rem" }}>
          {t("settings.general.streaming")}
        </span>
      </label>

      <label style={toggleRowStyle}>
        <input
          type="checkbox"
          checked={useFewShotExamples}
          onChange={(event) => {
            setUseFewShotExamples(event.target.checked);
            setDirty(true);
          }}
        />
        <span style={{ fontSize: "0.875rem" }}>
          {t("settings.general.fewShot")}
        </span>
      </label>

      <p style={helperTextStyle}>
        {t("settings.general.localNote")}
      </p>

      {dirty ? (
        <div style={actionsRowStyle}>
          <Button onClick={save} loading={saving}>
            {t("common.save")}
          </Button>
          <Button onClick={reset} variant="secondary">
            {t("common.reset")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
