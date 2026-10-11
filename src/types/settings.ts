/**
 * Settings page data model.
 *
 * This describes the local, per-device configuration surface shown on the
 * Settings page. Theme and interface density are persisted locally by their providers. Other
 * inference metadata and actual application paths are loaded in the desktop.
 * Backup/log utilities remain outside the current integration scope.
 */

export type ThemePreference = "light" | "dark" | "system";
export type InterfaceDensity = "compact" | "comfortable";
export type LanguagePreference = "english";

/** Verified means the frozen loader successfully checked the bundle. */
export type BundleIntegrityStatus = "not-checked" | "verified";

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
  /** Predictive ranking follows the frozen bundle capabilities. */
  rankingEnabled: boolean;
  rankingLabel: string;

  /** Application */
  applicationVersion: string;
  versionPlaceholderNote: string;
}
