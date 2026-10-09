import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  BreedDesignerCandidate,
  BreedDesignerFilters,
  BreedDesignerGenerationRules,
} from "@/pages/BreedDesigner/types";

interface Props {
  pool: {
    total: number;
    withGenotype: number;
    withPhenotype: number;
    withPedigree: number;
  };
  filters: BreedDesignerFilters;
  rules: BreedDesignerGenerationRules;
  candidates: BreedDesignerCandidate[];
}

function filterLabel(f: BreedDesignerFilters): string {
  const parts = [
    f.search.trim() ? `“${f.search.trim()}”` : null,
    f.genotype !== "any" ? `genotype ${f.genotype}` : null,
    f.phenotype !== "any" ? `phenotype ${f.phenotype}` : null,
    f.pedigree !== "any" ? `pedigree ${f.pedigree}` : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "All lines (no filters)";
}

function RuleRow({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-[5px]">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={
          "text-xs font-medium " +
          (on ? "text-accent-foreground" : "text-muted-foreground")
        }
      >
        {on ? "On" : "Off"}
      </span>
    </div>
  );
}

export function BreedDesignerSidebar({ pool, filters, rules, candidates }: Props) {
  const pct = pool.total ? Math.round((pool.withGenotype / pool.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Parent Pool Summary */}
      <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
        <CardHeader className="px-4 pt-3">
          <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
            Parent Pool Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 pb-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Lines in pool</p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {pool.total}
              </p>
            </div>
            <p className="pb-1 text-right text-[11px] leading-tight text-muted-foreground">
              of {pool.total} local<br /> mock lines
            </p>
          </div>

          {/* Genotype availability bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Genotype available</span>
              <span className="tabular-nums text-foreground">
                {pool.withGenotype}/{pool.total} ({pct}%)
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-gf-panel-bg px-2.5 py-1.5">
              <p className="text-muted-foreground">Phenotype</p>
              <p className="font-mono text-[13px] text-foreground">{pool.withPhenotype}</p>
            </div>
            <div className="rounded-lg bg-gf-panel-bg px-2.5 py-1.5">
              <p className="text-muted-foreground">Pedigree</p>
              <p className="font-mono text-[13px] text-foreground">{pool.withPedigree}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active filters + generation rules */}
      <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
        <CardHeader className="px-4 pt-3">
          <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
            Filters &amp; Generation Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 pb-3">
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">Active filters</p>
            <p className="text-xs leading-[18px] text-foreground">{filterLabel(filters)}</p>
          </div>
          <div className="divide-y divide-border">
            <RuleRow on={rules.excludeSelfCrosses} label="Exclude self-crosses" />
            <RuleRow on={rules.excludeDuplicatePairs} label="Exclude duplicate pairs" />
            <RuleRow on={rules.excludeHistorical} label="Exclude recorded crosses" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Max candidates</span>
            <span className="font-mono text-[13px] text-foreground">
              {rules.maxCandidates}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">Generated candidates</span>
            <span className="font-mono text-[13px] text-foreground">
              {candidates.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Scientific Limitations */}
      <div className="rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-3.5 shadow-[var(--gf-card-shadow)]">
        <div className="mb-2 flex items-center gap-1.5">
          <Info className="size-4 text-amber-800" />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-900">
            Scientific Limitations
          </span>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] leading-[19px] text-amber-950/80">
          <li>
            Breed Designer is a deterministic exploration tool; it does not rank
            or recommend crosses.
          </li>
          <li>Predictive ranking is disabled for GY, DTF, NO, and LB.</li>
          <li>Pairs are illustrative candidates for research review only.</li>
        </ul>
      </div>
    </div>
  );
}
