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

export function BreedDesignerSidebar({ pool, filters, rules, candidates }: Props) {
  return (
    <div className="flex flex-col gap-3.5">
      {/* Parent Pool Summary + Generation Rules */}
      <Card className="gap-0 rounded-xl border border-border py-0 shadow-[var(--gf-card-shadow)] ring-0">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase leading-4 tracking-wider text-muted-foreground">
            Parent Pool Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 pb-4">
          <dl className="divide-y divide-muted border-t border-muted text-sm leading-5">
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-muted-foreground">Lines in pool</dt>
              <dd className="text-right tabular-nums text-foreground">
                {pool.total}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-muted-foreground">With genotype</dt>
              <dd className="text-right text-foreground">All selected</dd>
            </div>
          </dl>

          {/* Active filters */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase leading-4 tracking-wider text-muted-foreground">
              Active Filters
            </p>
            <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium leading-[18px] text-accent-foreground">
              Genotype: {filters.genotype === "yes"
                ? "Available"
                : filters.genotype === "no"
                  ? "Unavailable"
                  : "Any"}
            </span>
          </div>

          {/* Generation Rules */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase leading-4 tracking-wider text-muted-foreground">
              Generation Rules
            </p>
            <dl className="divide-y divide-muted border-t border-muted text-sm leading-5">
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Self-crosses</dt>
                <dd className="text-right text-foreground">
                  {rules.excludeSelfCrosses ? "Excluded" : "Included"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Duplicate pairs</dt>
                <dd className="text-right text-foreground">
                  {rules.excludeDuplicatePairs ? "Excluded" : "Included"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Recorded crosses</dt>
                <dd className="text-right text-foreground">
                  {rules.excludeHistorical ? "Excluded" : "Included"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Candidate count</dt>
                <dd className="text-right tabular-nums text-foreground">
                  {candidates.length} of max {rules.maxCandidates}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Scientific Limitations */}
      <div className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/30 px-4 py-3.5 shadow-[var(--gf-card-shadow)]">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-amber-900 dark:text-amber-200">
          Scientific Limitations
        </div>
        <ul className="list-disc space-y-1.5 pl-4 text-[12px] leading-[18px] text-amber-950/80 dark:text-amber-200">
          <li>
            Breed Designer is a deterministic exploration tool; it does not
            rank or recommend crosses.
          </li>
          <li>Predictive ranking is disabled for GY, DTF, NO, and LB.</li>
          <li>Pairs are illustrative candidates for research review only.</li>
        </ul>
      </div>
    </div>
  );
}
