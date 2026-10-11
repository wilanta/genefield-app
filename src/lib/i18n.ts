import indonesian from "@/locales/id.json";
import type { LanguagePreference } from "@/types/settings";

export const LANGUAGE_STORAGE_KEY = "genefield-language";
export const DEFAULT_LANGUAGE: LanguagePreference = "english";
export const LANGUAGE_OPTIONS: { value: LanguagePreference; label: string }[] =
  [
    { value: "english", label: "English" },
    { value: "indonesian", label: "Bahasa Indonesia" },
  ];

export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return value === "english" || value === "indonesian";
}

export function readLanguage(): LanguagePreference {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguagePreference(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Source text is the English key; identifiers and user data pass through. */
export function translate(
  message: string,
  language: LanguagePreference,
  values: Record<string, string | number> = {},
): string {
  const dictionary: Record<string, string> = indonesian;
  const text =
    language === "indonesian" ? (dictionary[message] ?? message) : message;
  return text.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : placeholder,
  );
}
