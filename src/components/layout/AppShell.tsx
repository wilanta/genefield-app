import { useTranslation } from "@/components/language-provider";
import * as React from "react";
import {
  LayoutDashboard,
  ScanSearch,
  GitFork,
  FlaskConical,
  Dna,
  FolderKanban,
  BarChart3,
  Settings,
  Info,
} from "lucide-react";
import logoUrl from "@/assets/GeneField_vector.svg";
import { GuidedTourProvider } from "@/onboarding/GuidedTourProvider";
import { DesktopStartup } from "@/components/desktop-startup";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const NAV: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard, enabled: true },
  { label: "Line Explorer", to: "/lines", icon: ScanSearch, enabled: true },
  { label: "Pedigree Explorer", to: "/pedigree", icon: GitFork, enabled: true },
  { label: "Cross Lab", to: "/cross-lab", icon: FlaskConical, enabled: true },
  { label: "Breed Designer", to: "/breed-designer", icon: Dna, enabled: true },
  {
    label: "Candidate Workspace",
    to: "/candidates",
    icon: FolderKanban,
    enabled: true,
  },
  {
    label: "Model Insights",
    to: "/model-insights",
    icon: BarChart3,
    enabled: true,
  },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Settings", to: "/settings", icon: Settings, enabled: true },
  { label: "About GeneField", to: "/about", icon: Info, enabled: true },
];

interface TitleMeta {
  title: string;
  subtitle: string;
}

const TITLES: Record<string, TitleMeta> = {
  "/": {
    title: "Overview",
    subtitle: "Explore rice breeding data and manage your research workspace.",
  },
  "/lines": {
    title: "Line Explorer",
    subtitle: "Search, filter, and inspect historical rice breeding lines.",
  },
  "/pedigree": {
    title: "Pedigree Explorer",
    subtitle: "Investigate recorded parent–offspring relationships.",
  },
  "/cross-lab": {
    title: "Cross Lab",
    subtitle:
      "Explore parent combinations and historical cross-level trait estimates.",
  },
  "/breed-designer": {
    title: "Breed Designer",
    subtitle:
      "Construct and explore candidate crosses using user-defined criteria.",
  },
  "/candidates": {
    title: "Candidate Workspace",
    subtitle: "Organize candidate crosses and document research decisions.",
  },
  "/model-insights": {
    title: "Model Insights",
    subtitle:
      "Understand model performance, validation protocols, and limitations.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Configure appearance, local storage, and the inference engine.",
  },
  "/about": {
    title: "About GeneField",
    subtitle: "Product information, attribution, and scientific limitations.",
  },
};

function NavButton({ item }: { item: NavItem }) {
  const { t: tr } = useTranslation();
  const Icon = item.icon;

  if (item.enabled) {
    return (
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) =>
          cn(
            "group relative flex h-(--gf-nav-height) items-center gap-2.5 rounded-lg px-3 text-sm transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
            isActive
              ? "bg-gf-nav-active text-gf-nav-label-active"
              : "text-gf-nav-label hover:bg-muted/50 hover:text-foreground",
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* 3×22 active accent bar */}
            <span
              className={cn(
                "absolute left-0 h-[22px] w-[3px] rounded-full bg-gf-nav-accent transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            />
            <Icon
              className={cn(
                "size-4 shrink-0",
                isActive && "text-gf-nav-accent",
              )}
            />
            <span className="truncate">{tr(item.label)}</span>
          </>
        )}
      </NavLink>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-disabled
          className="group relative flex h-(--gf-nav-height) items-center gap-2.5 rounded-lg px-3 text-sm text-gf-nav-label opacity-50 transition-opacity cursor-not-allowed"
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{tr(item.label)}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{tr("Coming soon")}</TooltipContent>
    </Tooltip>
  );
}

export default function AppShell() {
  const { t: tr } = useTranslation();
  const location = useLocation();
  const meta = TITLES[location.pathname] ?? TITLES["/"];

  return (
    <TooltipProvider>
      <div className="gf-app-shell flex h-screen w-full overflow-hidden bg-gf-app-bg text-foreground">
        {/* Sidebar */}
        <aside
          data-tour="workspace-nav"
          className="flex h-full w-[232px] shrink-0 flex-col bg-gf-sidebar-bg p-3 pt-4"
        >
          {/* Brand */}
          <div className="mb-5 flex items-center gap-2.5 px-2">
            <img
              src={logoUrl}
              alt="GeneField"
              className="size-10 shrink-0"
              aria-hidden
            />
            <span className="text-lg font-semibold tracking-tight text-gf-wordmark">
              GeneField
            </span>
          </div>

          {/* Primary nav */}
          <nav className="flex flex-col gap-0.5" aria-label={tr("Primary")}>
            {NAV.map((item) => (
              <NavButton key={item.to} item={item} />
            ))}
          </nav>

          <div className="my-3 h-px bg-border" aria-hidden />

          {/* Bottom nav */}
          <nav
            className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3"
            aria-label={tr("Secondary")}
          >
            {BOTTOM_NAV.map((item) => (
              <NavButton key={item.to} item={item} />
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex h-full min-w-0 flex-1 flex-col">
          <header className="flex h-[68px] shrink-0 items-center justify-between gap-6 border-b border-border bg-gf-app-bg px-6">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold leading-tight text-foreground">
                {tr(meta.title)}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {tr(meta.subtitle)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-lg border border-gf-chip-border bg-gf-chip-bg px-2.5 text-sm text-foreground shadow-[var(--gf-card-shadow)]">
                <span className="mr-1.5 text-xs text-muted-foreground">
                  {tr("Dataset")}
                </span>
                INIA Uruguay
              </span>
              <span className="inline-flex h-7 items-center rounded-lg border border-gf-chip-border bg-gf-chip-bg px-2.5 text-sm text-foreground shadow-[var(--gf-card-shadow)]">
                <span className="mr-1.5 text-xs text-muted-foreground">
                  {tr("Model")}
                </span>
                <span className="font-mono text-xs">final-v1</span>
              </span>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto">
            <DesktopStartup>
              <GuidedTourProvider>
                <Outlet />
              </GuidedTourProvider>
            </DesktopStartup>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
