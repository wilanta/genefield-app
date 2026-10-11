import { useTranslation } from "@/components/language-provider";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useInterfaceDensity } from "@/components/interface-density-provider";
import { useLanguage } from "@/components/language-provider";
import { LANGUAGE_OPTIONS, isLanguagePreference } from "@/lib/i18n";
import {
  Lock,
  FolderOpen,
  FileDown,
  Database,
  HardDrive,
  Cpu,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/lib/use-async";
import { inference } from "@/services/inference-service";
import { analysisError } from "@/lib/genefield/errors";
import { appConfigDir, resourceDir, join } from "@tauri-apps/api/path";
import { getVersion } from "@tauri-apps/api/app";
import type { ThemePreference, InterfaceDensity } from "@/types/settings";
import { cn } from "@/lib/utils";

/* ── Segmented button control ──────────────────────────────────────────── */

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const { t: tr } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-border p-1"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 min-w-[58px] rounded-md px-3 text-[13px] transition-colors",
              selected
                ? "bg-gf-nav-active font-medium text-gf-nav-label-active"
                : "text-foreground hover:bg-muted",
            )}
          >
            {tr(opt.label)}
          </button>
        );
      })}
    </div>
  );
}

/* ── Setting row ────────────────────────────────────────────────────────── */

function SettingRow({
  label,
  description,
  children,
  first = false,
  stacked = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  first?: boolean;
  stacked?: boolean;
}) {
  const { t: tr } = useTranslation();
  return (
    <div
      className={cn(
        "grid min-h-(--gf-setting-row-height) min-w-0 gap-2 px-4 py-(--gf-setting-row-padding)",
        !stacked &&
          "@min-[28rem]/settings:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @min-[28rem]/settings:items-center @min-[28rem]/settings:gap-4",
        !first && "border-t border-border",
      )}
    >
      <div className="min-w-0">
        <span className="text-[13px] text-foreground">{tr(label)}</span>
        {description && (
          <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
            {tr(description)}
          </p>
        )}
      </div>
      <div
        className={cn(
          "min-w-0 [overflow-wrap:anywhere]",
          !stacked &&
            "@min-[28rem]/settings:justify-self-end @min-[28rem]/settings:text-right",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────────────── */

function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  const { t: tr } = useTranslation();
  return (
    <CardHeader className="px-4 pt-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tr(title)}
        </h3>
      </div>
    </CardHeader>
  );
}

/* ── Not-connected inline feedback ─────────────────────────────────────── */

function NotConnectedNotice() {
  const { t: tr } = useTranslation();
  return (
    <p role="status" className="px-4 pb-3 text-xs text-muted-foreground">
      {tr("This operation is not connected in this UI preview.")}
    </p>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function Settings() {
  const { t: tr } = useTranslation();
  const [revision, setRevision] = useState(0);
  const { data: runtime, error: runtimeError } = useAsync(async () => {
    const metadata = await inference.start();
    return {
      metadata,
      storage: await appConfigDir(),
      bundle: await join(
        await resourceDir(),
        "_internal",
        "bundles",
        "final-v1",
      ),
      version: await getVersion(),
    };
  }, [revision]);
  const [connection, setConnection] = useState<string>();
  const [checking, setChecking] = useState(false);
  const check = async (restart = false) => {
    if (checking) return;
    setChecking(true);
    try {
      await (restart ? inference.restart() : inference.health());
      setConnection(
        "The final-v1 service is ready. Bundle integrity was verified during loading.",
      );
      setRevision((r) => r + 1);
    } catch (e) {
      setConnection(analysisError(e));
    } finally {
      setChecking(false);
    }
  };
  const data = {
    databaseEngine: tr("SQLite - local"),
    storageLocation: runtime?.storage ?? tr("Unavailable"),
    databaseSize: null,
    modelBundleLocation: runtime?.bundle ?? tr("Unavailable"),
    modelBundleVersion: runtime?.metadata.bundle_version ?? tr("Unavailable"),
    localInferenceAvailable: !!runtime,
    localInferenceLabel: runtime
      ? tr("Available - offline")
      : tr("Unavailable"),
    rankingLabel: runtime
      ? tr("Enabled for eligible represented parents")
      : tr("Unavailable"),
    applicationVersion: runtime?.version ?? tr("Unavailable"),
    versionPlaceholderNote: "",
  };

  const { theme = "light", setTheme } = useTheme();
  const { density, setDensity } = useInterfaceDensity();
  const { language, setLanguage } = useLanguage();

  // Track which action (if any) was attempted, so only the relevant card
  // shows the "not connected" notice. Keys map to card identifiers.
  const [notConnected, setNotConnected] = useState<
    "storage" | "inference" | "application" | null
  >(null);

  const notify = (card: "storage" | "inference" | "application") => {
    setNotConnected(card);
  };

  const themeOptions: SegmentedOption<ThemePreference>[] = [
    { value: "light", label: tr("Light") },
    { value: "dark", label: tr("Dark") },
    { value: "system", label: tr("System") },
  ];

  const densityOptions: SegmentedOption<InterfaceDensity>[] = [
    { value: "compact", label: tr("Compact") },
    { value: "comfortable", label: tr("Comfortable") },
  ];

  const languageOptions = LANGUAGE_OPTIONS;

  // Reset the transient notice when the user interacts with the page again.
  return (
    <div className="mx-auto max-w-[1208px] p-6">
      <div className="grid gap-3.5 xl:grid-cols-2">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Appearance */}
          <Card className="@container/settings shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title={tr("Appearance")}
              icon={<Info className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label={tr("Theme")}>
                <SegmentedControl
                  ariaLabel={tr("Theme")}
                  options={themeOptions}
                  value={theme as ThemePreference}
                  onChange={setTheme}
                />
              </SettingRow>
              <SettingRow
                label={tr("Interface density")}
                description={tr(
                  "Compact fits more content; Comfortable adds space to menus, cards, and table rows.",
                )}
              >
                <SegmentedControl
                  ariaLabel={tr("Interface density")}
                  options={densityOptions}
                  value={density}
                  onChange={setDensity}
                />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Data and Storage */}
          <Card className="@container/settings shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title={tr("Data and Storage")}
              icon={<HardDrive className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label={tr("Database")} first>
                <span className="text-[13px] text-muted-foreground">
                  {tr(data.databaseEngine)}
                </span>
              </SettingRow>
              <SettingRow label={tr("Storage location")}>
                <span className="text-[13px] font-mono text-muted-foreground">
                  {tr(data.storageLocation)}
                </span>
              </SettingRow>
              <SettingRow label={tr("Database size")}>
                <span className="text-[13px] text-muted-foreground">
                  {tr("Not measured")}
                </span>
              </SettingRow>
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notify("storage")}
                >
                  <FileDown className="size-3.5" />
                  {tr("Export workspace data")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notify("storage")}
                >
                  {tr("Backup local workspace")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notify("storage")}
                >
                  {tr("Restore backup")}
                </Button>
              </div>
              {notConnected === "storage" ? <NotConnectedNotice /> : null}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Inference Engine */}
          <Card className="@container/settings shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title={tr("Inference Engine")}
              icon={<Cpu className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label={tr("Model bundle location")} first stacked>
                <div className="flex min-w-0 flex-col items-start gap-3">
                  <span className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-[13px] leading-relaxed font-mono text-muted-foreground [overflow-wrap:anywhere]">
                    {tr(data.modelBundleLocation)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void check()}
                    disabled={checking}
                  >
                    <FolderOpen className="size-3.5" />
                    {tr("Check")}
                  </Button>
                </div>
              </SettingRow>
              <SettingRow label={tr("Model bundle version")}>
                <span className="text-[13px] font-mono text-foreground">
                  {tr(data.modelBundleVersion)}
                </span>
              </SettingRow>
              <SettingRow label={tr("Bundle integrity status")}>
                <Badge
                  variant="outline"
                  className="h-auto max-w-full whitespace-normal"
                >
                  {runtime
                    ? tr("Verified by final-v1 loader")
                    : tr("Not checked")}
                </Badge>
              </SettingRow>
              <SettingRow label={tr("Local inference availability")}>
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      data.localInferenceAvailable
                        ? "bg-[#4D9E5C]"
                        : "bg-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                  <span className="text-[13px] text-foreground">
                    {tr(data.localInferenceLabel)}
                  </span>
                </span>
              </SettingRow>
              <SettingRow label={tr("Predictive ranking")}>
                <div className="flex min-w-0 items-start gap-2">
                  <Lock
                    className="mt-1 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 text-[13px] text-foreground">
                    {tr(data.rankingLabel)}
                  </span>
                  <Badge variant="outline" className="mt-0.5">
                    {tr("Locked")}
                  </Badge>
                </div>
              </SettingRow>
              <div className="border-t border-border px-4 pt-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void check()}
                    disabled={checking}
                  >
                    <Database className="size-3.5" />
                    {checking
                      ? tr("Checking...")
                      : tr("Test inference connection")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={checking}
                    onClick={() => void check(true)}
                  >
                    {tr("Restart local analysis")}
                  </Button>
                </div>
                {connection && (
                  <p
                    className="mt-3 text-xs [overflow-wrap:anywhere]"
                    role="status"
                  >
                    {tr(connection)}
                  </p>
                )}
                {runtimeError && (
                  <p
                    className="mt-3 text-xs text-destructive [overflow-wrap:anywhere]"
                    role="alert"
                  >
                    {tr(runtimeError)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application */}
          <Card className="@container/settings shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title={tr("Application")}
              icon={<Info className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label={tr("Language preference")} first>
                <Select
                  value={language}
                  onValueChange={(v) => {
                    if (isLanguagePreference(v)) setLanguage(v);
                  }}
                >
                  <SelectTrigger
                    aria-label={tr("Language preference")}
                    className="h-7 min-w-[170px] text-[13px]"
                  >
                    <SelectValue>
                      {languageOptions.find((o) => o.value === language)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {tr(o.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label={tr("Application version")}>
                <span className="text-[13px] text-foreground">
                  {tr(data.applicationVersion)}
                </span>
              </SettingRow>
              <SettingRow label={tr("Diagnostic logs")}>
                <div className="flex flex-wrap gap-2 @min-[28rem]/settings:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => notify("application")}
                  >
                    {tr("Open log folder")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => notify("application")}
                  >
                    {tr("Export logs")}
                  </Button>
                </div>
              </SettingRow>
              {notConnected === "application" ? <NotConnectedNotice /> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {tr(
          "Settings are stored locally. No account or network connection is required.",
        )}
      </p>
    </div>
  );
}
