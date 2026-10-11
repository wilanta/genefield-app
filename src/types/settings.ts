/**
 * Settings page data model.
 *
 * This describes the local, per-device configuration surface shown on the
 * Settings page. Theme is persisted locally by the theme provider. Other
 * values are display-only in the current UI preview and are not yet wired
 * to a persistent store or the inference engine. Placeholder strings (e.g. `[user]`, `…`,
 * `[placeholder]`) are retained verbatim from the design.
 */

export type ThemePreference = "light" | "dark" | "system";
export type InterfaceDensity = "compact" | "comfortable";
export type LanguagePreference = "english";

/** Bundle integrity check status. Kept as "not-checked" — not simulated. */
export type BundleIntegrityStatus = "not-checked";

export interface SettingsData {
  theme: ThemePreference;
  interfaceDensity: InterfaceDensity;
  language: LanguagePreference;

  /** Data & storage */
  databaseEngine: string;
  storageLocation: string;
  databaseSize: string | null;

  /** Inference engine */
  modelBundleLocation: string;
  modelBundleVersion: string;
  bundleIntegrityStatus: BundleIntegrityStatus;
  /** Whether a local inference runtime is available. */
  localInferenceAvailable: boolean;
  localInferenceLabel: string;
  /** Predictive ranking is disabled by the research bundle and locked. */
  rankingEnabled: boolean;
  rankingLabel: string;

  /** Application */
  applicationVersion: string;
  versionPlaceholderNote: string;
}
