import { useTranslation } from "@/components/language-provider";
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
import { useBreedDesignerDraft } from "@/stores/breed-designer-draft";
import type { AvailabilityFilter } from "@/types/research";
import { CandidateTable } from "./CandidateTable";
import { BreedDesignerSidebar } from "./BreedDesignerSidebar";
import "./breed-designer.css";

type PoolFilterValue = AvailabilityFilter;

const POOL_AVAILABILITY_OPTIONS: PoolFilterValue[] = ["any", "yes"];

function poolLabel(v: PoolFilterValue): string {
  return v === "any" ? "Any" : v === "yes" ? "Available" : "Unavailable";
}

function StepHeading({ step, title }: { step: number; title: string }) {
  const { t: tr } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {step}
      </span>
      <div className="flex min-w-0 flex-col">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
          {tr(title)}
        </CardTitle>
      </div>
    </div>
  );
}

export default function BreedDesigner() {
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const { filters, rules, weights, dtf, setPool, setRule, setWeight, setDtf } =
    useBreedDesignerDraft();
  const [editingWeight, setEditingWeight] = useState<{
    trait: Trait;
    text: string;
  } | null>(null);
  const [generated, setGenerated] = useState(false);

  const { data: loaded, error: loadError } = useAsync(async () => ({
    lines: await referenceService.allLines(),
    metadata: await inference.start(),
  }));
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
      setError(
        tr("Select a flowering time priority: earlier or later flowering."),
      );
      return;
    }
    if (!traits.length) {
      setError(tr("Select at least one trait with a positive weight."));
      return;
    }
    if (pool.length < 2) {
      setError(tr("Select at least two eligible parents."));
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
          researchStatus: "Pending",
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

  return (
    <div className="breed-designer">
      {(loadError || error) && (
        <p role="alert" className="text-destructive">
          {tr(loadError ?? error ?? "")}
        </p>
      )}
      {!loaded && !loadError && (
        <p role="status">{tr("Loading analysis services and local data...")}</p>
      )}
      {eligibleCount !== undefined && (
        <p className="text-xs text-muted-foreground">
          {eligibleCount}{" "}
          {tr("eligible unrecorded pairs | authoritative ranking order")}
        </p>
      )}
      <div className="breed-designer-layout">
        {/* Left column */}
        <div className="breed-designer-main">
          {/* Step 1 — Select Parent Pool */}
          <Card className="breed-designer-card shrink-0">
            <CardHeader className="px-3.5 pb-2.5 pt-3.5">
              <StepHeading step={1} title={tr("Select Parent Pool")} />
            </CardHeader>
            <CardContent className="breed-designer-pool px-3.5 pb-3.5">
              <div className="breed-designer-search relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(e) => setPool({ search: e.target.value })}
                  placeholder={tr("Search parent lines")}
                  aria-label={tr("Search parent lines")}
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
                    aria-label={tr("Genotype availability")}
                    className="breed-designer-filter"
                  >
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">
                          {tr("Genotype")}
                        </span>
                        <span className="text-foreground">
                          {tr(poolLabel(filters.genotype))}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {POOL_AVAILABILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {tr(poolLabel(opt))}
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
                    aria-label={tr("Phenotype availability")}
                    className="breed-designer-filter"
                  >
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">
                          {tr("Phenotype")}
                        </span>
                        <span className="text-foreground">
                          {tr(poolLabel(filters.phenotype))}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {POOL_AVAILABILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {tr(poolLabel(opt))}
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
                    aria-label={tr("Pedigree availability")}
                    className="breed-designer-filter"
                  >
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">
                          {tr("Pedigree")}
                        </span>
                        <span className="text-foreground">
                          {tr(poolLabel(filters.pedigree))}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {POOL_AVAILABILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {tr(poolLabel(opt))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <span className="breed-designer-selected text-xs tabular-nums text-muted-foreground">
                {tr("Selected:")}{" "}
                <span className="font-mono font-semibold text-foreground">
                  {poolStats.total} {tr("lines")}
                </span>
              </span>
            </CardContent>
          </Card>

          {/* Step 2 — Configure Cross Generation */}
          <Card className="breed-designer-card shrink-0">
            <CardHeader className="px-3.5 pb-3.5 pt-3.5">
              <StepHeading step={2} title={tr("Configure Cross Generation")} />
            </CardHeader>
            <CardContent className="breed-designer-configuration px-3.5 pb-5">
              <div className="breed-designer-weights">
                {(["GY", "DTF", "NO", "LB"] as Trait[]).map((t) => (
                  <div key={t} className="breed-designer-field">
                    <label htmlFor={`weight-${t}`}>
                      {t} {tr("weight")}
                    </label>
                    <Input
                      id={`weight-${t}`}
                      aria-label={`${t} weight`}
                      aria-describedby="trait-weight-hint"
                      type="number"
                      min={0}
                      step={0.1}
                      value={
                        editingWeight?.trait === t
                          ? editingWeight.text
                          : weights[t]
                      }
                      disabled={busy}
                      className="font-mono tabular-nums"
                      onFocus={() =>
                        setEditingWeight({
                          trait: t,
                          text: weights[t] === 0 ? "" : String(weights[t]),
                        })
                      }
                      onChange={(e) => {
                        const text = e.target.value.replace(/^0+(?=\d)/, "");
                        setEditingWeight({ trait: t, text });
                        setWeight(t, Math.max(0, Number(text)));
                      }}
                      onBlur={() => setEditingWeight(null)}
                    />
                  </div>
                ))}
              </div>
              <p id="trait-weight-hint" className="breed-designer-weight-hint">
                {tr("Set a weight to 0 to omit a trait.")}
              </p>
              <div className="breed-designer-options">
                <div className="breed-designer-field">
                  <label htmlFor="dtf-priority">{tr("DTF priority")}</label>
                  <Select
                    value={dtf}
                    onValueChange={(v) => setDtf(v as "minimize" | "maximize")}
                    disabled={busy}
                  >
                    <SelectTrigger
                      id="dtf-priority"
                      aria-label={tr("DTF priority")}
                    >
                      <SelectValue placeholder={tr("Select priority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimize">
                        {tr("Earlier flowering")}
                      </SelectItem>
                      <SelectItem value="maximize">
                        {tr("Later flowering")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="breed-designer-field">
                  <label htmlFor="max-candidates">
                    {tr("Maximum candidate count")}
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
                    className="font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="breed-designer-generation">
                <div className="breed-designer-rules">
                  <label className="breed-designer-rule">
                    <Switch
                      disabled
                      checked={true}
                      onCheckedChange={(v) => setRule("excludeSelfCrosses", v)}
                      aria-label={tr("Exclude self-crosses")}
                    />
                    <span>{tr("Exclude self-crosses")}</span>
                  </label>
                  <label className="breed-designer-rule">
                    <Switch
                      disabled
                      checked={true}
                      onCheckedChange={(v) =>
                        setRule("excludeDuplicatePairs", v)
                      }
                      aria-label={tr("Exclude duplicate parent pairs")}
                    />
                    <span>{tr("Exclude duplicate parent pairs")}</span>
                  </label>
                  <label className="breed-designer-rule">
                    <Switch
                      disabled
                      checked={true}
                      onCheckedChange={(v) => setRule("excludeHistorical", v)}
                      aria-label={tr("Exclude historically recorded crosses")}
                    />
                    <span>{tr("Exclude historically recorded crosses")}</span>
                  </label>
                </div>

                <Button
                  className="breed-designer-generate px-4 text-[13px]"
                  onClick={generate}
                  disabled={busy || !loaded}
                >
                  {busy ? tr("Analyzing…") : tr("Generate Candidate Pairs")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — Candidate Results */}
          <Card className="breed-designer-card breed-designer-results">
            <CardHeader className="px-3.5 pb-1.5 pt-3.5">
              <StepHeading step={3} title={tr("Candidate Results")} />
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
                  {tr("Generate candidate pairs to see results.")}
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
