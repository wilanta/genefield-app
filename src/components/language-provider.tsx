import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { LanguagePreference } from "@/types/settings";
import {
  isLanguagePreference,
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  translate,
} from "@/lib/i18n";

const LanguageContext = createContext<{
  language: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<LanguagePreference>(readLanguage);
  const setLanguage = useCallback((value: LanguagePreference) => {
    if (isLanguagePreference(value)) updateLanguage(value);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = language === "indonesian" ? "id" : "en";
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Switching remains available for this session when storage is blocked.
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage requires LanguageProvider");
  return context;
}

export function useTranslation() {
  const { language } = useLanguage();
  const t = useCallback(
    (message: string, values?: Record<string, string | number>) =>
      translate(message, language, values),
    [language],
  );
  return { t, locale: language === "indonesian" ? "id-ID" : "en-US" };
}
