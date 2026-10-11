import { useTranslation } from "@/components/language-provider";
import { cn } from "@/lib/utils";

interface LegendEntry {
  label: string;
  swatch: React.ReactNode;
}

export function PedigreeLegend() {
  const { t: tr } = useTranslation();
  const entries: LegendEntry[] = [
    {
      label: tr("Selected"),
      swatch: (
        <span className="block size-2.5 rounded-sm bg-accent ring-1 ring-ring/30" />
      ),
    },
    {
      label: tr("Genotype available"),
      swatch: <span className="block size-2.5 rounded-sm bg-foreground/70" />,
    },
    {
      label: tr("No genotype"),
      swatch: (
        <span className="block size-2.5 rounded-sm border border-foreground/40" />
      ),
    },
    {
      label: tr("Missing record"),
      swatch: (
        <span className="block h-2.5 w-3.5 rounded-sm border border-foreground/40 bg-secondary" />
      ),
    },
  ];

  return (
    <div className="flex items-center gap-5 border-t border-border px-2 py-2 text-sm text-muted-foreground">
      {entries.map((entry) => (
        <span key={entry.label} className={cn("flex items-center gap-2")}>
          {entry.swatch}
          <span>{tr(entry.label)}</span>
        </span>
      ))}
      <span className="ml-auto text-xs text-muted-foreground/80">
        {tr("Recorded relationships only · no inference from SNP similarity")}
      </span>
    </div>
  );
}
