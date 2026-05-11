import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/useAuth";

export type InterfaceLanguage = "en" | "ru";

export interface AppPreferences {
  interfaceLanguage: InterfaceLanguage;
  requestTimeoutMillis: number;
  useFewShotExamples: boolean;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  interfaceLanguage: "en",
  requestTimeoutMillis: 40_000,
  useFewShotExamples: true,
};

export function appPreferencesStorageKey(userId?: string | null): string {
  return `souz:app-preferences:${userId ?? "guest"}`;
}

const translations = {
  en: {
    "common.save": "Save",
    "common.reset": "Reset",
    "common.closeDialog": "Close dialog",
    "settings.title": "Settings",
    "settings.close": "Close settings",
    "settings.tab.general": "General",
    "settings.tab.model": "Model",
    "settings.tab.tools": "Tools",
    "settings.tab.keys": "Provider Keys",
    "settings.saved": "Settings saved",
    "settings.failed": "Failed to save settings",
    "settings.general.title": "General Settings",
    "settings.general.interfaceLanguage": "Interface language",
    "settings.general.language.en": "English",
    "settings.general.language.ru": "Russian",
    "settings.general.streaming": "Stream messages",
    "settings.general.fewShot": "Send few-shot examples",
    "settings.general.localNote":
      "Interface language, few-shot examples, and request timeout stay local in the web client until backend support is added.",
    "settings.model.title": "Model Settings",
    "settings.model.defaultModel": "Default model",
    "settings.model.contextSize": "Context size",
    "settings.model.temperature": "Temperature",
    "settings.model.timeout": "Request timeout (ms)",
    "settings.model.systemPrompt": "System prompt",
    "settings.model.systemPromptPlaceholder": "Custom system prompt (optional)",
    "settings.model.locale": "Locale",
    "settings.model.timeZone": "Time zone",
    "settings.tools.title": "Tools & Interface",
    "settings.tools.enabledTools": "Enabled tools",
    "settings.tools.showToolEvents": "Show tool events in chat",
    "settings.tools.none": "No tools available",
    "sidebar.newChat": "New chat",
    "sidebar.recent": "Recent",
    "sidebar.archived": "Archived",
    "sidebar.noRecent": "No chats yet",
    "sidebar.noArchived": "No archived chats",
    "sidebar.pinned": "Pinned",
    "sidebar.rename": "Rename",
    "sidebar.pin": "Pin chat",
    "sidebar.unpin": "Unpin chat",
    "sidebar.archive": "Archive chat",
    "sidebar.restore": "Restore chat",
    "sidebar.settings": "Settings",
    "sidebar.logout": "Logout",
    "sidebar.close": "Close sidebar",
    "sidebar.chatActions": "Chat actions",
    "chat.telegram": "Telegram",
  },
  ru: {
    "common.save": "Сохранить",
    "common.reset": "Сбросить",
    "common.closeDialog": "Закрыть окно",
    "settings.title": "Настройки",
    "settings.close": "Закрыть настройки",
    "settings.tab.general": "Общие",
    "settings.tab.model": "Модель",
    "settings.tab.tools": "Инструменты",
    "settings.tab.keys": "Ключи провайдеров",
    "settings.saved": "Настройки сохранены",
    "settings.failed": "Не удалось сохранить настройки",
    "settings.general.title": "Общие настройки",
    "settings.general.interfaceLanguage": "Язык интерфейса",
    "settings.general.language.en": "Английский",
    "settings.general.language.ru": "Русский",
    "settings.general.streaming": "Стримить сообщения",
    "settings.general.fewShot": "Отправлять few-shot examples",
    "settings.general.localNote":
      "Язык интерфейса, few-shot examples и тайм-аут пока сохраняются локально в веб-клиенте до появления backend-поддержки.",
    "settings.model.title": "Настройки модели",
    "settings.model.defaultModel": "Модель по умолчанию",
    "settings.model.contextSize": "Размер контекста",
    "settings.model.temperature": "Температура",
    "settings.model.timeout": "Тайм-аут запроса (мс)",
    "settings.model.systemPrompt": "Системный промпт",
    "settings.model.systemPromptPlaceholder": "Пользовательский системный промпт (необязательно)",
    "settings.model.locale": "Локаль",
    "settings.model.timeZone": "Часовой пояс",
    "settings.tools.title": "Инструменты и интерфейс",
    "settings.tools.enabledTools": "Включенные инструменты",
    "settings.tools.showToolEvents": "Показывать события инструментов в чате",
    "settings.tools.none": "Нет доступных инструментов",
    "sidebar.newChat": "Новый чат",
    "sidebar.recent": "Недавние",
    "sidebar.archived": "Архив",
    "sidebar.noRecent": "Чатов пока нет",
    "sidebar.noArchived": "Архивных чатов нет",
    "sidebar.pinned": "Закреплен",
    "sidebar.rename": "Переименовать",
    "sidebar.pin": "Закрепить чат",
    "sidebar.unpin": "Открепить чат",
    "sidebar.archive": "Архивировать чат",
    "sidebar.restore": "Восстановить чат",
    "sidebar.settings": "Настройки",
    "sidebar.logout": "Выйти",
    "sidebar.close": "Закрыть боковую панель",
    "sidebar.chatActions": "Действия с чатом",
    "chat.telegram": "Телеграм",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface AppPreferencesContextValue {
  preferences: AppPreferences;
  language: InterfaceLanguage;
  savePreferences: (patch: Partial<AppPreferences>) => void;
  t: (key: TranslationKey) => string;
}

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

function normalizePreferences(
  value: Partial<AppPreferences> | null | undefined
): AppPreferences {
  const interfaceLanguage =
    value?.interfaceLanguage === "ru" ? "ru" : "en";
  const requestTimeoutMillis =
    typeof value?.requestTimeoutMillis === "number" &&
    Number.isFinite(value.requestTimeoutMillis) &&
    value.requestTimeoutMillis >= 1_000
      ? Math.round(value.requestTimeoutMillis)
      : DEFAULT_APP_PREFERENCES.requestTimeoutMillis;

  return {
    interfaceLanguage,
    requestTimeoutMillis,
    useFewShotExamples:
      typeof value?.useFewShotExamples === "boolean"
        ? value.useFewShotExamples
        : DEFAULT_APP_PREFERENCES.useFewShotExamples,
  };
}

function loadPreferences(userId?: string | null): AppPreferences {
  try {
    const raw = window.localStorage.getItem(appPreferencesStorageKey(userId));
    if (!raw) {
      return DEFAULT_APP_PREFERENCES;
    }

    return normalizePreferences(JSON.parse(raw) as Partial<AppPreferences>);
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

function persistPreferences(userId: string | null | undefined, value: AppPreferences) {
  try {
    window.localStorage.setItem(
      appPreferencesStorageKey(userId),
      JSON.stringify(value)
    );
  } catch {
    // ignore storage failures
  }
}

export function AppPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AppPreferences>(
    DEFAULT_APP_PREFERENCES
  );

  useEffect(() => {
    setPreferences(loadPreferences(user?.id));
  }, [user?.id]);

  useEffect(() => {
    document.documentElement.lang = preferences.interfaceLanguage;
  }, [preferences.interfaceLanguage]);

  const savePreferences = useCallback(
    (patch: Partial<AppPreferences>) => {
      setPreferences((current) => {
        const next = normalizePreferences({ ...current, ...patch });
        persistPreferences(user?.id, next);
        return next;
      });
    },
    [user?.id]
  );

  const t = useCallback(
    (key: TranslationKey) =>
      translations[preferences.interfaceLanguage][key] ?? translations.en[key],
    [preferences.interfaceLanguage]
  );

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      language: preferences.interfaceLanguage,
      savePreferences,
      t,
    }),
    [preferences, savePreferences, t]
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider"
    );
  }
  return context;
}
