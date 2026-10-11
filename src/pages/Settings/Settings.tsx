import { useState } from "react";
import { useTheme } from "next-themes";
import { useInterfaceDensity } from "@/components/interface-density-provider";
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
import type {
  ThemePreference,
  InterfaceDensity,
  LanguagePreference,
} from "@/types/settings";
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
            {opt.label}
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
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-(--gf-setting-row-height) flex-col justify-between gap-2 px-4 py-(--gf-setting-row-padding) sm:flex-row sm:items-center sm:justify-between",
        !first && "border-t border-border",
      )}
    >
      <div>
        <span className="text-[13px] text-foreground">{label}</span>
        {description && (
          <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="sm:pl-3">{children}</div>
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
  return (
    <CardHeader className="px-4 pt-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
    </CardHeader>
  );
}

/* ── Not-connected inline feedback ─────────────────────────────────────── */

function NotConnectedNotice() {
  return (
    <p role="status" className="px-4 pb-3 text-xs text-muted-foreground">
      This operation is not connected in this UI preview.
    </p>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function Settings() {
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
        "Layanan final-v1 siap. Integritas bundle diverifikasi saat pemuatan.",
      );
      setRevision((r) => r + 1);
    } catch (e) {
      setConnection(analysisError(e));
    } finally {
      setChecking(false);
    }
  };
  const data = {
    language: "english" as LanguagePreference,
    databaseEngine: "SQLite - local",
    storageLocation: runtime?.storage ?? "Unavailable",
    databaseSize: null,
    modelBundleLocation: runtime?.bundle ?? "Unavailable",
    modelBundleVersion: runtime?.metadata.bundle_version ?? "Unavailable",
    localInferenceAvailable: !!runtime,
    localInferenceLabel: runtime ? "Available - offline" : "Unavailable",
    rankingLabel: runtime
      ? "Enabled for eligible represented parents"
      : "Unavailable",
    applicationVersion: runtime?.version ?? "Unavailable",
    versionPlaceholderNote: "",
  };

  const { theme = "light", setTheme } = useTheme();
  const { density, setDensity } = useInterfaceDensity();
  const [language, setLanguage] = useState<LanguagePreference>(data.language);

  // Track which action (if any) was attempted, so only the relevant card
  // shows the "not connected" notice. Keys map to card identifiers.
  const [notConnected, setNotConnected] = useState<
    "storage" | "inference" | "application" | null
  >(null);

  const notify = (card: "storage" | "inference" | "application") => {
    setNotConnected(card);
  };

  const themeOptions: SegmentedOption<ThemePreference>[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  const densityOptions: SegmentedOption<InterfaceDensity>[] = [
    { value: "compact", label: "Compact" },
    { value: "comfortable", label: "Comfortable" },
  ];

  const languageOptions: SegmentedOption<LanguagePreference>[] = [
    { value: "english", label: "English" },
  ];

  // Reset the transient notice when the user interacts with the page again.
  return (
    <div className="mx-auto max-w-[1208px] p-6">
      <div className="grid gap-3.5 xl:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          {/* Appearance */}
          <Card className="shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title="Appearance"
              icon={<Info className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label="Theme">
                <SegmentedControl
                  ariaLabel="Theme"
                  options={themeOptions}
                  value={theme as ThemePreference}
                  onChange={setTheme}
                />
              </SettingRow>
              <SettingRow
                label="Interface density"
                description="Compact fits more content; Comfortable adds space to menus, cards, and table rows."
              >
                <SegmentedControl
                  ariaLabel="Interface density"
                  options={densityOptions}
                  value={density}
                  onChange={setDensity}
                />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Data and Storage */}
          <Card className="shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title="Data and Storage"
              icon={<HardDrive className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label="Database" first>
                <span className="text-[13px] text-muted-foreground">
                  {data.databaseEngine}
                </span>
              </SettingRow>
              <SettingRow label="Storage location">
                <span className="text-[13px] font-mono text-muted-foreground">
                  {data.storageLocation}
                </span>
              </SettingRow>
              <SettingRow label="Database size">
                <span className="text-[13px] text-muted-foreground">
                  Not measured
                </span>
              </SettingRow>
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notify("storage")}
                >
                  <FileDown className="size-3.5" />
                  Export workspace data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notify("storage")}
                >
                  Backup local workspace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notify("storage")}
                >
                  Restore backup
                </Button>
              </div>
              {notConnected === "storage" ? <NotConnectedNotice /> : null}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Inference Engine */}
          <Card className="shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title="Inference Engine"
              icon={<Cpu className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label="Model bundle location" first>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-mono text-muted-foreground">
                    {data.modelBundleLocation}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void check()}
                    disabled={checking}
                  >
                    <FolderOpen className="size-3.5" />
                    Check
                  </Button>
                </div>
              </SettingRow>
              <SettingRow label="Model bundle version">
                <span className="text-[13px] font-mono text-foreground">
                  {data.modelBundleVersion}
                </span>
              </SettingRow>
              <SettingRow label="Bundle integrity status">
                <Badge variant="outline">
                  {runtime ? "Verified by final-v1 loader" : "Not checked"}
                </Badge>
              </SettingRow>
              <SettingRow label="Local inference availability">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      data.localInferenceAvailable
                        ? "bg-[#4D9E5C]"
                        : "bg-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                  <span className="text-[13px] text-foreground">
                    {data.localInferenceLabel}
                  </span>
                </span>
              </SettingRow>
              <SettingRow label="Predictive ranking">
                <div className="flex items-center gap-2">
                  <Lock
                    className="size-3.5 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="text-[13px] text-foreground">
                    {data.rankingLabel}
                  </span>
                  <Badge variant="outline">Locked</Badge>
                </div>
              </SettingRow>
              <div className="px-4 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void check()}
                  disabled={checking}
                >
                  <Database className="size-3.5" />
                  {checking ? "Memeriksa..." : "Test inference connection"}
                </Button>
              </div>
              {connection && (
                <p className="px-4 text-xs" role="status">
                  {connection}
                </p>
              )}
              {runtimeError && (
                <p className="px-4 text-xs text-destructive" role="alert">
                  {runtimeError}
                </p>
              )}
              <Button
                className="mx-4 mb-3"
                variant="outline"
                disabled={checking}
                onClick={() => void check(true)}
              >
                Restart local analysis
              </Button>
            </CardContent>
          </Card>

          {/* Application */}
          <Card className="shadow-[var(--gf-card-shadow)]">
            <SectionHeader
              title="Application"
              icon={<Info className="size-3.5" />}
            />
            <CardContent className="px-0 pb-2">
              <SettingRow label="Language preference" first>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as LanguagePreference)}
                >
                  <SelectTrigger className="h-7 w-[110px] text-[13px]">
                    <SelectValue>
                      {languageOptions.find((o) => o.value === language)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Application version">
                <span className="text-[13px] text-foreground">
                  {data.applicationVersion}
                </span>
              </SettingRow>
              <SettingRow label="Diagnostic logs">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => notify("application")}
                  >
                    Open log folder
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => notify("application")}
                  >
                    Export logs
                  </Button>
                </div>
              </SettingRow>
              {notConnected === "application" ? <NotConnectedNotice /> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Settings are stored locally. No account or network connection is
        required.
      </p>
    </div>
  );
}
