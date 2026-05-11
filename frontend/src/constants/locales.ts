const DEFAULT_LOCALES = [
  "en-US",
  "ru-RU",
  "de-DE",
  "fr-FR",
  "es-ES",
  "pt-BR",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "zh-CN",
] as const;

export function localeOptions(currentLocale?: string | null): string[] {
  const values = [...DEFAULT_LOCALES] as string[];

  if (currentLocale && !values.includes(currentLocale)) {
    values.push(currentLocale);
  }

  return values;
}
