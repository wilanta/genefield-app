import { useTranslation } from "@/components/language-provider";
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

export function BreedDesignerSidebar({
  pool,
  filters,
  rules,
  candidates,
}: Props) {
  const { t: tr } = useTranslation();
  return (
    <div className="flex flex-col gap-3.5">
      {/* Parent Pool Summary + Generation Rules */}
      <Card className="gap-0 rounded-xl border border-border py-0 shadow-[var(--gf-card-shadow)] ring-0">
        <CardHeader className="px-3.5 pb-2 pt-3.5">
          <CardTitle className="text-[11px] font-medium uppercase leading-4 tracking-wider text-muted-foreground">
            {tr("Parent Pool Summary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3.5 pb-3.5">
          <dl className="divide-y divide-muted border-t border-muted text-[13px] leading-5">
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-muted-foreground">{tr("Lines in pool")}</dt>
              <dd className="text-right tabular-nums text-foreground">
                {pool.total}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-muted-foreground">{tr("With genotype")}</dt>
              <dd className="text-right text-foreground">
                {pool.total > 0 && pool.withGenotype === pool.total
                  ? tr("All selected")
                  : `${pool.withGenotype} of ${pool.total}`}
              </dd>
            </div>
          </dl>

          {/* Active filters */}
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase leading-4 tracking-wider text-muted-foreground">
              {tr("Active Filters")}
            </p>
            <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium leading-4 text-accent-foreground">
              {tr("Genotype:")}{" "}
              {filters.genotype === "yes"
                ? tr("Available")
                : filters.genotype === "no"
                  ? tr("Unavailable")
                  : tr("Any")}
            </span>
          </div>

          {/* Generation Rules */}
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase leading-4 tracking-wider text-muted-foreground">
              {tr("Generation Rules")}
            </p>
            <dl className="divide-y divide-muted border-t border-muted text-[13px] leading-5">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">{tr("Self-crosses")}</dt>
                <dd className="text-right text-foreground">
                  {rules.excludeSelfCrosses ? tr("Excluded") : tr("Included")}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">
                  {tr("Duplicate pairs")}
                </dt>
                <dd className="text-right text-foreground">
                  {rules.excludeDuplicatePairs
                    ? tr("Excluded")
                    : tr("Included")}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">
                  {tr("Recorded crosses")}
                </dt>
                <dd className="text-right text-foreground">
                  {rules.excludeHistorical ? tr("Excluded") : tr("Included")}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">
                  {tr("Candidate count")}
                </dt>
                <dd className="text-right tabular-nums text-foreground">
                  {candidates.length} {tr("of max")} {rules.maxCandidates}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Scientific Limitations */}
      <div className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/30 px-4 py-3.5 shadow-[var(--gf-card-shadow)]">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-amber-900 dark:text-amber-200">
          {tr("Scientific Limitations")}
        </div>
        <ul className="list-disc space-y-1.5 pl-4 text-[12px] leading-[18px] text-amber-950/80 dark:text-amber-200">
          <li>
            {tr(
              "Breed Designer prioritizes unrecorded crosses using selected trait objectives.",
            )}
          </li>
          <li>
            {tr(
              "final-v1 supports ranking for eligible represented INIA parents.",
            )}
          </li>
          <li>
            {tr(
              "Scores prioritize candidates for review; they are not breeding success probabilities.",
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
