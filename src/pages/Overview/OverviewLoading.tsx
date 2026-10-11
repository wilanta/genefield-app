import { useTranslation } from "@/components/language-provider";
import { Database, Dna, GitFork, Sprout } from "lucide-react";
import "./overview-loading.css";

const categories = [
  { label: "Pedigree", icon: GitFork },
  { label: "Genotypes", icon: Dna },
  { label: "Phenotypes", icon: Sprout },
];

export default function OverviewLoading() {
  const { t: tr } = useTranslation();
  return (
    <div className="overview-loading mx-auto max-w-[1208px] space-y-6 p-6">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="relative overflow-hidden rounded-2xl border bg-gf-panel-bg px-6 py-10 text-center shadow-[var(--gf-card-shadow)] sm:py-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_70%)]"
        />
        <div className="relative mx-auto flex max-w-sm flex-col items-center">
          <div className="overview-loading-emblem mb-6" aria-hidden="true">
            <div className="overview-loading-orbit" />
            <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/15 bg-card text-primary shadow-[var(--gf-card-shadow)]">
              <Dna className="size-8" strokeWidth={1.5} />
            </div>
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {tr("Loading local data...")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {tr("Preparing your rice breeding research workspace.")}
          </p>

          <div
            className="overview-loading-track mt-6 h-1 w-44 overflow-hidden rounded-full bg-primary/10"
            aria-hidden="true"
          >
            <div className="overview-loading-sweep h-full w-1/2 rounded-full bg-primary/70" />
          </div>

          <div
            className="mt-6 flex flex-wrap justify-center gap-2"
            aria-hidden="true"
          >
            {categories.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <Icon className="size-3.5 text-primary" strokeWidth={1.5} />
                {tr(label)}
              </span>
            ))}
          </div>

          <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="size-3" aria-hidden="true" />
            {tr("Local workspace")}
          </p>
        </div>
      </div>

      <div className="space-y-4" aria-hidden="true">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-xl border bg-card p-5">
              <div className="overview-loading-placeholder h-3 w-24 max-w-full rounded" />
              <div className="overview-loading-placeholder mt-4 h-7 w-16 rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-gf-panel-bg p-5 lg:col-span-2">
            <div className="overview-loading-placeholder h-3 w-32 rounded" />
            {["w-3/4", "w-full", "w-5/6"].map((width) => (
              <div key={width} className="mt-5 flex items-center gap-6">
                <div className="overview-loading-placeholder h-3 w-24 shrink-0 rounded" />
                <div
                  className={`overview-loading-placeholder h-2 rounded-full ${width}`}
                />
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-gf-panel-bg p-5">
            <div className="overview-loading-placeholder h-3 w-24 rounded" />
            <div className="overview-loading-placeholder mt-5 h-9 rounded-lg" />
            <div className="overview-loading-placeholder mt-3 h-9 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
