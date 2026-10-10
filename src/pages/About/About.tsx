import { Dna } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockModelInsights } from "@/mocks/modelInsights";

const LIMITATIONS = mockModelInsights.limitations;

const DATASET_ATTRIBUTION =
  "Dataset source: INIA Uruguay. Citation and license text: [placeholder — confirm before release].";

const LICENSE_ROW_LABEL = "Third-party license notices";
const LICENSE_ROW_VALUE = "Bundled at release · placeholder";

function SectionHeader({ title }: { title: string }) {
  return (
    <CardHeader className="px-4 pt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
    </CardHeader>
  );
}

function DatasetAttributionCard() {
  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <SectionHeader title="Dataset Attribution" />
      <CardContent className="px-4 pb-4">
        <p className="text-[13px] leading-[19px] text-muted-foreground">
          {DATASET_ATTRIBUTION}
        </p>
      </CardContent>
    </Card>
  );
}

function LimitationsPanel({ items }: { items: string[] }) {
  return (
    <Card className="border-amber-500/30 bg-amber-50/40 shadow-[var(--gf-card-shadow)]">
      <CardHeader className="px-4 pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
          Research and Scientific Limitations
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-amber-500/60"
                aria-hidden
              />
              <p className="text-[13px] leading-[19px] text-amber-900/90">{item}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LicensesCard() {
  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <SectionHeader title="Open-Source Licenses and Acknowledgements" />
      <CardContent className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-foreground">{LICENSE_ROW_LABEL}</span>
          <span className="text-[13px] text-muted-foreground">{LICENSE_ROW_VALUE}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function About() {
  return (
    <div className="mx-auto max-w-[1208px] p-6">
      {/* Top banner */}
      <Card className="mb-3.5 shadow-[var(--gf-card-shadow)]">
        <CardContent className="flex items-center gap-4 px-4 py-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-accent">
            <Dna className="size-7 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-tight text-foreground">
              GeneField
            </h2>
            <p className="mt-1 text-[15px] leading-[21px] text-muted-foreground">
              An offline desktop application for exploring rice breeding data,
              inspecting pedigrees, and analyzing parent pairs with
              experimental, research-only models.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Version 0.1.0 · placeholder
          </Badge>
        </CardContent>
      </Card>

      {/* Two-column grid */}
      <div className="grid gap-3.5 xl:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <DatasetAttributionCard />
        </div>
        <div className="flex flex-col gap-3.5">
          <LimitationsPanel items={LIMITATIONS} />
          <LicensesCard />
        </div>
      </div>
    </div>
  );
}
