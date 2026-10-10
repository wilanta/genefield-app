import { cn } from "@/lib/utils";

interface LegendEntry {
  label: string;
  swatch: React.ReactNode;
}

export function PedigreeLegend() {
  const entries: LegendEntry[] = [
    {
      label: "Selected",
      swatch: (
        <span className="block size-2.5 rounded-sm bg-accent ring-1 ring-ring/30" />
      ),
    },
    {
      label: "Genotype available",
      swatch: (
        <span className="block size-2.5 rounded-sm bg-foreground/70" />
      ),
    },
    {
      label: "No genotype",
      swatch: (
        <span className="block size-2.5 rounded-sm border border-foreground/40" />
      ),
    },
    {
      label: "Missing record",
      swatch: (
        <span className="block h-2.5 w-3.5 rounded-sm border border-foreground/40 bg-secondary" />
      ),
    },
  ];

  return (
    <div className="flex items-center gap-5 border-t border-border px-2 py-2 text-sm text-muted-foreground">
      {entries.map((entry) => (
        <span
          key={entry.label}
          className={cn("flex items-center gap-2")}
        >
          {entry.swatch}
          <span>{entry.label}</span>
        </span>
      ))}
      <span className="ml-auto text-xs text-muted-foreground/80">
        Recorded relationships only · no inference from SNP similarity
      </span>
    </div>
  );
}
