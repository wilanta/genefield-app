import { useEffect, useMemo, useRef, useState } from "react";
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
import { referenceService } from "@/services/reference-service";
import { inference, rankPool } from "@/services/inference-service";
import { analysisError } from "@/lib/genefield/errors";
import { useAsync } from "@/lib/use-async";
import type { Trait, Objectives } from "@/lib/genefield/types";
import type { BreedDesignerCandidate } from "./types";
import type {
  BreedDesignerFilters,
  BreedDesignerGenerationRules,
} from "@/pages/BreedDesigner/types";
import type { AvailabilityFilter } from "@/types/research";
import { CandidateTable } from "./CandidateTable";
import { BreedDesignerSidebar } from "./BreedDesignerSidebar";
import "./breed-designer.css";

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
  excludeHistorical: true,
  maxCandidates: 50,
};

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {step}
      </span>
      <div className="flex min-w-0 flex-col">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
      </div>
    </div>
  );
}

export default function BreedDesigner() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BreedDesignerFilters>(DEFAULT_FILTERS);
  const [rules, setRules] =
    useState<BreedDesignerGenerationRules>(DEFAULT_RULES);
  const [generated, setGenerated] = useState(false);

  const { data: loaded, error: loadError } = useAsync(async () => ({
    lines: await referenceService.allLines(),
    metadata: await inference.start(),
  }));
  const [weights, setWeights] = useState<Record<Trait, number>>({
    GY: 1,
    DTF: 0,
    NO: 0,
    LB: 0,
  });
  const [dtf, setDtf] = useState<"" | "minimize" | "maximize">("");
  const [candidates, setCandidates] = useState<BreedDesignerCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [eligibleCount, setEligibleCount] = useState<number>();
  const lock = useRef(false);
  const revision = useRef(0);
  const traits = (["GY", "DTF", "NO", "LB"] as Trait[]).filter(
    (t) => weights[t] > 0,
  );
  const pool = useMemo(
    () =>
      (loaded?.lines ?? []).filter((l) => {
        if (
          !traits.length ||
          !traits.every((t) =>
            loaded?.metadata.traits[t].training_parent_ids.includes(l.id),
          )
        )
          return false;
        if (
          filters.search &&
          !l.id.toLowerCase().includes(filters.search.trim().toLowerCase())
        )
          return false;
        return (["genotype", "phenotype", "pedigree"] as const).every(
          (f) =>
            filters[f] === "any" ||
            l[
              f === "genotype"
                ? "hasGenotype"
                : f === "phenotype"
                  ? "hasPhenotype"
                  : "hasPedigree"
            ] ===
              (filters[f] === "yes"),
        );
      }),
    [loaded, filters, weights],
  );
  useEffect(() => {
    ++revision.current;
    setGenerated(false);
    setCandidates([]);
    setEligibleCount(undefined);
  }, [filters, rules, weights, dtf]);
  const generate = async () => {
    if (lock.current || !loaded) return;
    if (weights.DTF > 0 && !dtf) {
      setError("Pilih prioritas Umur Berbunga: lebih cepat atau lebih lambat.");
      return;
    }
    if (!traits.length) {
      setError("Pilih setidaknya satu trait dengan bobot positif.");
      return;
    }
    if (pool.length < 2) {
      setError("Pilih sedikitnya dua parent yang memenuhi syarat.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(undefined);
    const token = revision.current;
    try {
      const objectives: Objectives = {};
      const selectedWeights: Partial<Record<Trait, number>> = {};
      for (const t of traits) {
        objectives[t] = (
          t === "GY" ? "maximize" : t === "DTF" ? dtf : "minimize"
        ) as never;
        selectedWeights[t] = weights[t];
      }
      const result = await rankPool(
        pool.map((l) => l.id),
        objectives,
        selectedWeights,
        Math.min(500, rules.maxCandidates),
      );
      if (token !== revision.current) return;
      setCandidates(
        result.candidates.map((c, i) => ({
          candidateId: `C-${String(i + 1).padStart(3, "0")}`,
          parentA: c.parent_ids[0],
          parentB: c.parent_ids[1],
          genotype: "Both",
          historical: "Not recorded",
          historicalRecorded: false,
          researchStatus: "Unreviewed",
          analysis: {
            bundleVersion: result.bundle_version,
            predictions: c.predictions,
            objectives: result.objectives,
            weights: result.weights,
            applicationScore: c.application_prioritization_score,
            isHistoricalPair: false,
          },
        })),
      );
      setEligibleCount(result.eligible_candidate_count);
      setGenerated(true);
    } catch (e) {
      setError(analysisError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const poolStats = useMemo(() => {
    const total = pool.length;
    const withGenotype = pool.filter((l) => l.hasGenotype).length;
    const withPhenotype = pool.filter((l) => l.hasPhenotype).length;
    const withPedigree = pool.filter((l) => l.hasPedigree).length;
    return { total, withGenotype, withPhenotype, withPedigree };
  }, [pool]);

  const openInCrossLab = (a: string, b: string) => {
    navigate(
      `/cross-lab?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
    );
  };

  const setPool = (patch: Partial<BreedDesignerFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const setRule = <K extends keyof BreedDesignerGenerationRules>(
    key: K,
    value: BreedDesignerGenerationRules[K],
  ) => setRules((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="breed-designer">
      {(loadError || error) && (
        <p role="alert" className="text-destructive">
          {loadError ?? error}
        </p>
      )}
      {!loaded && !loadError && (
        <p role="status">Memuat layanan analisis dan data lokal?</p>
      )}
      {eligibleCount !== undefined && (
        <p className="text-xs text-muted-foreground">
          {eligibleCount} eligible unrecorded pairs | authoritative ranking
          order
        </p>
      )}
      <div className="breed-designer-layout">
        {/* Left column */}
        <div className="breed-designer-main">
          {/* Step 1 — Select Parent Pool */}
          <Card className="breed-designer-card shrink-0">
            <CardHeader className="px-3.5 pb-2.5 pt-3.5">
              <StepHeading step={1} title="Select Parent Pool" />
            </CardHeader>
            <CardContent className="breed-designer-pool px-3.5 pb-3.5">
              <div className="breed-designer-search relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(e) => setPool({ search: e.target.value })}
                  placeholder="Search parent lines"
                  aria-label="Search parent lines"
                  className="h-[34px] w-full pl-9 text-[13px]"
                />
              </div>

              <div className="flex items-center">
                <Select
                  value={filters.genotype}
                  onValueChange={(v) =>
                    setPool({ genotype: v as PoolFilterValue })
                  }
                >
                  <SelectTrigger
                    aria-label="Genotype availability"
                    className="breed-designer-filter"
                  >
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Genotype</span>
                        <span className="text-foreground">
                          {poolLabel(filters.genotype)}
                        </span>
                      </span>
                    </SelectValue>
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

              <div className="flex items-center">
                <Select
                  value={filters.phenotype}
                  onValueChange={(v) =>
                    setPool({ phenotype: v as PoolFilterValue })
                  }
                >
                  <SelectTrigger
                    aria-label="Phenotype availability"
                    className="breed-designer-filter"
                  >
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Phenotype</span>
                        <span className="text-foreground">
                          {poolLabel(filters.phenotype)}
                        </span>
                      </span>
                    </SelectValue>
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

              <div className="flex items-center">
                <Select
                  value={filters.pedigree}
                  onValueChange={(v) =>
                    setPool({ pedigree: v as PoolFilterValue })
                  }
                >
                  <SelectTrigger
                    aria-label="Pedigree availability"
                    className="breed-designer-filter"
                  >
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Pedigree</span>
                        <span className="text-foreground">
                          {poolLabel(filters.pedigree)}
                        </span>
                      </span>
                    </SelectValue>
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

              <span className="breed-designer-selected text-xs tabular-nums text-muted-foreground">
                Selected:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {poolStats.total} lines
                </span>
              </span>
            </CardContent>
          </Card>

          {/* Step 2 — Configure Cross Generation */}
          <Card className="breed-designer-card shrink-0">
            <CardHeader className="px-3.5 pb-3.5 pt-3.5">
              <StepHeading step={2} title="Configure Cross Generation" />
            </CardHeader>
            <CardContent className="px-3.5 pb-5">
              <div className="mb-4 flex flex-wrap gap-3">
                {(["GY", "DTF", "NO", "LB"] as Trait[]).map((t) => (
                  <label key={t} className="text-xs">
                    {t} weight (0 = omit)
                    <Input
                      aria-label={`${t} weight`}
                      type="number"
                      min={0}
                      step={0.1}
                      value={weights[t]}
                      disabled={busy}
                      className="w-28"
                      onChange={(e) =>
                        setWeights((prev) => ({
                          ...prev,
                          [t]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                    />
                  </label>
                ))}
                <label className="text-xs">
                  DTF priority
                  <Select
                    value={dtf}
                    onValueChange={(v) => setDtf(v as "minimize" | "maximize")}
                    disabled={busy}
                  >
                    <SelectTrigger aria-label="DTF priority">
                      <SelectValue placeholder="Pilih prioritas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimize">
                        Lebih cepat berbunga
                      </SelectItem>
                      <SelectItem value="maximize">
                        Lebih lambat berbunga
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <div className="breed-designer-generation">
                <div className="flex flex-col gap-2.5">
                  <label className="breed-designer-rule">
                    <Switch
                      disabled
                      checked={true}
                      onCheckedChange={(v) => setRule("excludeSelfCrosses", v)}
                      aria-label="Exclude self-crosses"
                    />
                    <span>Exclude self-crosses</span>
                  </label>
                  <label className="breed-designer-rule">
                    <Switch
                      disabled
                      checked={true}
                      onCheckedChange={(v) =>
                        setRule("excludeDuplicatePairs", v)
                      }
                      aria-label="Exclude duplicate parent pairs"
                    />
                    <span>Exclude duplicate parent pairs</span>
                  </label>
                  <label className="breed-designer-rule">
                    <Switch
                      disabled
                      checked={true}
                      onCheckedChange={(v) => setRule("excludeHistorical", v)}
                      aria-label="Exclude historically recorded crosses"
                    />
                    <span>Exclude historically recorded crosses</span>
                  </label>
                </div>

                <div className="breed-designer-limit flex flex-col gap-1">
                  <label
                    htmlFor="max-candidates"
                    className="text-xs text-muted-foreground"
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
                    className="h-[34px] w-[120px] font-mono text-[13px] tabular-nums"
                  />
                </div>
                <Button
                  className="breed-designer-generate h-[34px] px-4 text-[13px]"
                  onClick={generate}
                  disabled={busy || !loaded}
                >
                  {busy ? "Menganalisis..." : "Generate Candidate Pairs"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — Candidate Results */}
          <Card className="breed-designer-card breed-designer-results">
            <CardHeader className="px-3.5 pb-1.5 pt-3.5">
              <StepHeading step={3} title="Candidate Results" />
            </CardHeader>

            {generated ? (
              <CandidateTable
                key={JSON.stringify(
                  candidates.map((c) => [c.parentA, c.parentB, c.analysis]),
                )}
                candidates={candidates}
                onOpenInCrossLab={openInCrossLab}
                onGoToWorkspace={() => navigate("/candidates")}
              />
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Generate candidate pairs to see results.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="breed-designer-sidebar min-w-0">
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
