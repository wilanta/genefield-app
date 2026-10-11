import type { SettingsData } from "@/types/settings";

/**
 * Mock Settings data. Placeholder strings from the inspected Figma design are
 * retained verbatim — these are NOT real OS paths or verified sizes. The
 * integrity status is kept as "not-checked"; predictive ranking is disabled
 * and locked.
 */
export const mockSettings: SettingsData = {
  theme: "light",
  interfaceDensity: "comfortable",
  language: "english",

  databaseEngine: "SQLite · local",
  storageLocation: "C:\\Users\\[user]\\AppData\\Roaming\\GeneField\\",
  databaseSize: null, // rendered as "[placeholder]"

  modelBundleLocation: "…\\GeneField\\models\\research-v1\\",
  modelBundleVersion: "research-v1",
  bundleIntegrityStatus: "not-checked",
  localInferenceAvailable: true,
  localInferenceLabel: "Available · offline",
  rankingEnabled: false,
  rankingLabel: "Disabled by research bundle",

  applicationVersion: "0.1.0",
  versionPlaceholderNote: "placeholder",
};
