import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockLines } from "@/mocks/lines";
import { generateCandidates, selectParentPool } from "@/mocks/breed-designer";
import type {
  BreedDesignerFilters,
  BreedDesignerGenerationRules,
} from "@/pages/BreedDesigner/types";
import type { AvailabilityFilter } from "@/types/research";
import { CandidateTable } from "./CandidateTable";
import { BreedDesignerSidebar } from "./BreedDesignerSidebar";

type PoolFilterValue = AvailabilityFilter;

const POOL_AVAILABILITY_OPTIONS: PoolFilterValue[] = ["any", "yes"];

function poolLabel(v: PoolFilterValue): string {
  return v === "any" ? "Any" : v === "yes" ? "Available" : "Unavailable";
}

const DEFAULT_FILTERS: BreedDesignerFilters = {
  search: "",
  genotype: "yes", // "Available"
  phenotype: "any",
  pedigree: "any",
};

const DEFAULT_RULES: BreedDesignerGenerationRules = {
  excludeSelfCrosses: true,
  excludeDuplicatePairs: true,
  excludeHistorical: false,
  maxCandidates: 50,
};

function StepHeading({
  step,
  title,
  detail,
}: {
  step: number;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
        {step}
      </span>
      <div className="flex min-w-0 flex-col">
        <CardTitle className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export default function BreedDesigner() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BreedDesignerFilters>(DEFAULT_FILTERS);
  const [rules, setRules] = useState<BreedDesignerGenerationRules>(DEFAULT_RULES);
  const [generated, setGenerated] = useState(false);

  const pool = useMemo(() => selectParentPool(filters), [filters]);

  const poolStats = useMemo(() => {
    const total = pool.length;
    const withGenotype = pool.filter((l) => l.hasGenotype).length;
    const withPhenotype = pool.filter((l) => l.hasPhenotype).length;
    const withPedigree = pool.filter((l) => l.hasPedigree).length;
    return { total, withGenotype, withPhenotype, withPedigree };
  }, [pool]);

  // Candidates regenerate deterministically whenever the relevant state changes.
  const candidates = useMemo(
    () =>
      generated
        ? generateCandidates({ filters, rules })
        : [],
    [generated, filters, rules],
  );

  const openInCrossLab = (a: string, b: string) => {
    navigate(`/cross-lab?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  };

  const setPool = (patch: Partial<BreedDesignerFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const setRule = <K extends keyof BreedDesignerGenerationRules>(
    key: K,
    value: BreedDesignerGenerationRules[K],
  ) => setRules((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      {/* Two-column layout: left ~800px, right sidebar ~340px */}
      <div className="mt-0 grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-auto lg:grid-cols-[800px_340px]">
        {/* Left column */}
        <div className="flex min-h-0 flex-col gap-3.5">
          {/* Step 1 — Select Parent Pool */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-4 pt-3">
              <StepHeading
                step={1}
                title="Select Parent Pool"
                detail="Search and filter the available parent lines."
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4 pb-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(e) => setPool({ search: e.target.value })}
                    placeholder="Search parent lines"
                    aria-label="Search parent lines"
                    className="w-[220px] pl-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Genotype</span>
                  <Select
                    value={filters.genotype}
                    onValueChange={(v) => setPool({ genotype: v as PoolFilterValue })}
                  >
                    <SelectTrigger className="w-[92px]">
                      <SelectValue>{poolLabel(filters.genotype)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {POOL_AVAILABILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {poolLabel(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Phenotype</span>
                  <Select
                    value={filters.phenotype}
                    onValueChange={(v) => setPool({ phenotype: v as PoolFilterValue })}
                  >
                    <SelectTrigger className="w-[92px]">
                      <SelectValue>{poolLabel(filters.phenotype)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {POOL_AVAILABILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {poolLabel(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pedigree</span>
                  <Select
                    value={filters.pedigree}
                    onValueChange={(v) => setPool({ pedigree: v as PoolFilterValue })}
                  >
                    <SelectTrigger className="w-[92px]">
                      <SelectValue>{poolLabel(filters.pedigree)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {POOL_AVAILABILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {poolLabel(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={
                    filters.search === "" &&
                    filters.genotype === DEFAULT_FILTERS.genotype &&
                    filters.phenotype === DEFAULT_FILTERS.phenotype &&
                    filters.pedigree === DEFAULT_FILTERS.pedigree
                  }
                >
                  Clear
                </Button>
              </div>

              <p className="text-sm tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">
                  {poolStats.total}
                </span>{" "}
                of {mockLines.length} local mock lines selected
                {poolStats.total !== mockLines.length
                  ? " (filtered pool)"
                  : ""}
              </p>
            </CardContent>
          </Card>

          {/* Step 2 — Configure Cross Generation */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-4 pt-3">
              <StepHeading
                step={2}
                title="Configure Cross Generation"
                detail="Choose which candidate pairs to keep and the maximum result size."
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4 pb-3.5">
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">
                    Exclude self-crosses
                  </span>
                  <Switch
                    checked={rules.excludeSelfCrosses}
                    onCheckedChange={(v) => setRule("excludeSelfCrosses", v)}
                    aria-label="Exclude self-crosses"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">
                    Exclude duplicate parent pairs
                  </span>
                  <Switch
                    checked={rules.excludeDuplicatePairs}
                    onCheckedChange={(v) => setRule("excludeDuplicatePairs", v)}
                    aria-label="Exclude duplicate parent pairs"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">
                    Exclude historically recorded crosses
                  </span>
                  <Switch
                    checked={rules.excludeHistorical}
                    onCheckedChange={(v) => setRule("excludeHistorical", v)}
                    aria-label="Exclude historically recorded crosses"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="max-candidates"
                  className="text-sm text-foreground"
                >
                  Maximum candidate count
                </label>
                <Input
                  id="max-candidates"
                  type="number"
                  min={1}
                  max={500}
                  value={rules.maxCandidates}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = raw === "" ? 0 : Number(raw);
                    setRule(
                      "maxCandidates",
                      Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 50,
                    );
                  }}
                  className="w-24 tabular-nums"
                />
              </div>

              <div className="mt-1">
                <Button
                  className="h-[34px] min-w-[210px]"
                  onClick={() => setGenerated(true)}
                >
                  Generate Candidate Pairs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — Candidate Results */}
          <div className="flex flex-col gap-2">
            <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
              <CardHeader className="px-4 pt-3">
                <StepHeading
                  step={3}
                  title="Candidate Results"
                  detail={`${candidates.length} candidate pair${
                    candidates.length === 1 ? "" : "s"
                  } generated`}
                />
              </CardHeader>
            </Card>

            {generated ? (
              <CandidateTable
                candidates={candidates}
                onOpenInCrossLab={openInCrossLab}
                onGoToWorkspace={() => navigate("/candidates")}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 py-10 text-center shadow-[var(--gf-card-shadow)]">
                <p className="text-sm text-muted-foreground">
                  Generate candidate pairs to see results.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="min-h-0">
          <BreedDesignerSidebar
            pool={poolStats}
            filters={filters}
            rules={rules}
            candidates={candidates}
          />
        </div>
      </div>
    </div>
  );
}
