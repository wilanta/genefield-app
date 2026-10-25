import { useTranslation } from "@/components/language-provider";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ArrowLeftRight,
  Info,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { referenceService } from "@/services/reference-service";
import { inference } from "@/services/inference-service";
import { useAsync } from "@/lib/use-async";
import { analysisError } from "@/lib/genefield/errors";
import type { PredictionResult } from "@/lib/genefield/types";
import { candidateStore } from "@/services";
import type { RiceLine, TraitCode } from "@/types/research";
import { CandidateNameConflictError } from "@/types/research";
import { cn } from "@/lib/utils";
import { tourEvents } from "@/onboarding/tourEvents";
import { useCrossLabDraft } from "@/stores/cross-lab-draft";

// CardHeading was removed; headings are now rendered inline.

const TRAITS: { code: TraitCode; name: string; unit: string }[] = [
  { code: "GY", name: "Grain Yield", unit: "kg/ha" },
  { code: "DTF", name: "Days to Flowering", unit: "days" },
  { code: "NO", name: "Stem Rot", unit: "modified SES IRRI rating points" },
  { code: "LB", name: "Leaf Blast", unit: "SES IRRI rating points" },
];

const EMPTY_ESTIMATES: Record<TraitCode, number | null> = {
  GY: null,
  DTF: null,
  NO: null,
  LB: null,
};

/** Resolve a typed id (or query param) to a real reference line. */
function resolveLine(
  lines: RiceLine[],
  id: string | null | undefined,
): RiceLine | undefined {
  if (!id) return undefined;
  const q = id.trim().toUpperCase();
  if (!q) return undefined;
  return lines.find((l) => l.id.toUpperCase() === q);
}

function lineFlags(line: RiceLine, tr: (message: string) => string): string {
  const flags = [
    line.hasGenotype && "Genotype",
    line.hasPhenotype && "Phenotype",
    line.hasPedigree && "Pedigree",
  ].filter(Boolean);
  return flags.length > 0
    ? flags.map((flag) => tr(String(flag))).join(" · ")
    : tr("No data");
}

interface ParentCardProps {
  slot: "A" | "B";
  value: string;
  onChange: (v: string) => void;
  /** Present when this parent's id equals the other parent's id. */
  conflict: boolean;
  line: RiceLine | undefined;
  /** Red helper line shown only when the two parents collide. */
  conflictMessage: string;
}

function ParentCard({
  slot,
  value,
  onChange,
  conflict,
  line,
  conflictMessage,
}: ParentCardProps) {
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const available = line?.hasGenotype ?? false;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const { data: lines = [] } = useAsync(() => referenceService.allLines());
  const query = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const source = query
      ? lines.filter((l) => l.id.toLowerCase().includes(query))
      : lines;
    return source.slice(0, 8);
  }, [query, lines]);

  const notFound = value.trim() !== "" && !line;

  return (
    <Card
      className={cn(
        "relative flex-1 overflow-visible rounded-xl shadow-[var(--gf-card-shadow)]",
        open && "z-30",
      )}
    >
      <CardHeader className="px-4 ">
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
            {tr("Parent")} {slot}
          </CardTitle>
          {/* Genotype availability indicator */}
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-[7px] rounded-full",
                available
                  ? "border-[1.5px] border-primary bg-primary"
                  : "border border-foreground/30 bg-transparent",
              )}
            />
            <span
              className={cn(
                "text-xs",
                available ? "text-primary" : "text-muted-foreground",
              )}
            >
              {available ? tr("Genotype available") : tr("No genotype")}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 px-4">
        <div ref={containerRef} className="relative">
          <div
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg border bg-transparent px-2.5",
              conflict
                ? "border-destructive ring-3 ring-destructive/20"
                : "border-input",
            )}
          >
            <Search className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
            <Input
              data-tour={slot === "A" ? "cross-parent-a" : "cross-parent-b"}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="GID_1233"
              aria-label={tr("Parent {slot}", { slot })}
              className="h-auto border-0 bg-transparent px-0 shadow-none ring-0 focus-visible:ring-0"
            />
          </div>
          {open && (
            <ul
              role="listbox"
              aria-label={tr("Parent {slot} suggestions", { slot })}
              className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
            >
              {suggestions.length === 0 ? (
                <li className="px-2.5 py-2 text-xs text-muted-foreground">
                  {tr("No lines match “")}
                  {value.trim()}”.
                </li>
              ) : (
                suggestions.map((l) => {
                  const selected = line?.id === l.id;
                  return (
                    <li key={l.id} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(l.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left hover:bg-muted",
                          selected && "bg-muted",
                        )}
                      >
                        <span className="font-mono text-[13px] text-foreground">
                          {l.id}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {lineFlags(l, tr)}
                          {selected && (
                            <Check className="size-3 text-primary" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
        {conflict ? (
          <p className="text-xs text-destructive">{conflictMessage}</p>
        ) : notFound ? (
          <p className="text-xs text-muted-foreground">
            {tr("Line not found in the local dataset.")}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => navigate(`/lines?select=${line?.id ?? value}`)}
          disabled={!line && value.trim() !== ""}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            line || value.trim() === ""
              ? "text-primary hover:underline"
              : "cursor-not-allowed text-muted-foreground/50",
          )}
        >
          {tr("View line profile")}
          <ExternalLink className="size-3" />
        </button>
      </CardContent>
    </Card>
  );
}

interface ComparisonRow {
  label: string;
  a?: boolean;
  b?: boolean;
  kind: "genotype" | "unchecked";
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  const { t: tr } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted-foreground">{tr(label)}</span>
      <span className="text-[13px] text-foreground">{tr(value)}</span>
    </div>
  );
}

function ModelRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { t: tr } = useTranslation();
  return (
    <div className="flex items-center justify-between py-[7px]">
      <span className="text-[13px] text-muted-foreground">{tr(label)}</span>
      <span className={cn("text-[13px] text-foreground", mono && "font-mono")}>
        {tr(value)}
      </span>
    </div>
  );
}

function ComparisonPane({
  label,
  id,
  rows,
  side,
}: {
  label: string;
  id: string;
  rows: ComparisonRow[];
  side?: "A" | "B";
}) {
  const { t: tr } = useTranslation();
  const key = side === "B" ? "b" : "a";
  return (
    <div className="rounded-lg border border-border bg-gf-panel-bg px-3 py-2">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground">{tr(label)}</span>
        <span className="font-mono text-[13px] font-medium text-foreground">
          {id || "—"}
        </span>
      </div>
      <div className="mt-1.5">
        {rows.map((row) => {
          const value = row[key];
          return (
            <div
              key={row.label}
              className="flex items-center justify-between border-t border-border py-[7px] first:border-t-0"
            >
              <span className="text-xs text-muted-foreground">
                {tr(row.label)}
              </span>
              {row.kind === "genotype" ? (
                <span
                  className={cn(
                    "text-xs",
                    value ? "text-accent-foreground" : "text-foreground",
                  )}
                >
                  {value ? tr("Available") : tr("Not available")}
                </span>
              ) : (
                <span className="text-xs text-foreground">
                  {tr("Not checked")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Phase = "idle" | "analyzing" | "done" | "error";

type GenotypeWarning = "A" | "B" | "both" | null;

export default function CrossLab() {
  const { t: tr } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { data: lines = [], error: referenceError } = useAsync(() =>
    referenceService.allLines(),
  );
  const [result, setResult] = useState<PredictionResult>();
  const [historical, setHistorical] = useState<boolean>();
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const revision = useRef(0);

  const { parentA, parentB, setParents } = useCrossLabDraft();
  const [phase, setPhase] = useState<Phase>("idle");
  const [estimates, setEstimates] =
    useState<Record<TraitCode, number | null>>(EMPTY_ESTIMATES);

  /* ---- Research Note modal state (frame 1:3720) ---- */
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(
    tr(
      "Research note: compare phenotype coverage for both parents before drawing conclusions. Estimates are exploratory only.",
    ),
  );

  /* ---- Save Candidate modal state (frame 1:4796) ---- */
  const [saveOpen, setSaveOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateNotes, setCandidateNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"draft" | "review">("draft");
  const [tags, setTags] = useState<string[]>(["pilot"]);
  const [tagInput, setTagInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSaving, setSaveSaving] = useState(false);

  // Apply incoming slots once, preserving any slot the caller did not supply.
  // Consume the prefill so Back cannot restore old values after edits or Reset.
  useEffect(() => {
    const a = params.get("a");
    const b = params.get("b");
    if (a === null && b === null) return;
    ++revision.current;
    setResult(undefined);
    setHistorical(undefined);
    setError(undefined);
    setEstimates(EMPTY_ESTIMATES);
    setPhase("idle");
    setParents({
      ...(a !== null ? { parentA: a } : {}),
      ...(b !== null ? { parentB: b } : {}),
    });
    const remaining = new URLSearchParams(params);
    remaining.delete("a");
    remaining.delete("b");
    setParams(remaining, { replace: true });
  }, [params, setParams, setParents]);

  const navigate = useNavigate();

  const lineA = resolveLine(lines, parentA);
  const lineB = resolveLine(lines, parentB);

  const idsMatch =
    parentA.trim().toUpperCase() === parentB.trim().toUpperCase() &&
    parentA.trim() !== "";

  /**
   * Computed genotype warning — which parent (if any) is missing genotype
   * data.  Used to show the amber banner and to disable Analyze.
   */
  const genotypeWarning: GenotypeWarning = useMemo(() => {
    if (!lineA && !lineB) return null;
    const aMissing = lineA ? !lineA.hasGenotype : false;
    const bMissing = lineB ? !lineB.hasGenotype : false;
    if (aMissing && bMissing) return "both";
    if (aMissing) return "A";
    if (bMissing) return "B";
    return null;
  }, [lineA, lineB]);

  const analysisDisabled =
    idsMatch ||
    !lineA ||
    !lineB ||
    phase === "analyzing" ||
    genotypeWarning !== null;
  const conflictMessage = tr("Parent B is the same line as Parent A.");

  /** Permission gates for footer action buttons. */
  const canSave = !!(result && phase === "done");
  const canNote = !!(lineA && lineB && !idsMatch && phase !== "error");
  const canPedigree = !!(lineA && lineB);

  /** Default candidate name built from the two selected line ids. */
  const defaultCandidateName =
    lineA && lineB ? `${lineA.id} × ${lineB.id}` : "";

  const compareRows: ComparisonRow[] = useMemo(
    () => [
      {
        label: tr("Genotype"),
        a: lineA?.hasGenotype,
        b: lineB?.hasGenotype,
        kind: "genotype",
      },
      {
        label: tr("Phenotype"),
        a: lineA?.hasPhenotype,
        b: lineB?.hasPhenotype,
        kind: "genotype",
      },
      {
        label: tr("Pedigree"),
        a: lineA?.hasPedigree,
        b: lineB?.hasPedigree,
        kind: "genotype",
      },
    ],
    [lineA, lineB, tr],
  );

  /** Editing a parent invalidates the previous analysis. */
  const updateParent = (slot: "A" | "B", v: string) => {
    ++revision.current;
    setResult(undefined);
    setHistorical(undefined);
    setError(undefined);
    setParents(slot === "A" ? { parentA: v } : { parentB: v });
    if (phase !== "idle") {
      setPhase("idle");
      setEstimates(EMPTY_ESTIMATES);
    }
  };

  /* ---- Analyze / Retry handler (frame 1:6728) ---- */
  const handleAnalyze = useCallback(async () => {
    if (analysisDisabled || pending.current || !lineA || !lineB) return;
    pending.current = true;
    const token = revision.current;
    setPhase("analyzing");
    setError(undefined);
    setResult(undefined);
    try {
      await inference.start();
      const history = await inference.historical(lineA.id, lineB.id);
      if (token !== revision.current) return;
      setHistorical(history.is_historical_pair);
      const prediction = await inference.predict(lineA.id, lineB.id);
      if (token !== revision.current) return;
      setResult(prediction);
      setEstimates(
        Object.fromEntries(
          TRAITS.map((t) => [
            t.code,
            prediction.predictions[t.code]?.value ?? null,
          ]),
        ) as Record<TraitCode, number | null>,
      );
      setPhase("done");
      tourEvents.emit("cross-analysis-complete");
    } catch (e) {
      if (token !== revision.current) return;
      setError(analysisError(e));
      setEstimates(EMPTY_ESTIMATES);
      setPhase("error");
    } finally {
      pending.current = false;
    }
  }, [analysisDisabled, lineA, lineB]);

  const handleReset = () => {
    ++revision.current;
    setResult(undefined);
    setHistorical(undefined);
    setError(undefined);
    setParents({ parentA: "", parentB: "" });
    setEstimates(EMPTY_ESTIMATES);
    setPhase("idle");
    setNoteOpen(false);
    setSaveOpen(false);
  };

  /* ---- Save Candidate modal helpers (frame 1:4796) ---- */
  const openSaveModal = () => {
    if (!canSave) return;
    setCandidateName(defaultCandidateName);
    setCandidateNotes("");
    setReviewStatus("draft");
    setTags(["pilot"]);
    setTagInput("");
    setSaveError(null);
    setSaveOpen(true);
  };

  const handleSaveCandidate = async () => {
    if (saveSaving) return;
    setSaveSaving(true);
    setSaveError(null);
    try {
      await candidateStore.create({
        name: candidateName,
        parentA: result!.parent_ids[0],
        parentB: result!.parent_ids[1],
        analysis: {
          bundleVersion: result!.bundle_version,
          predictions: result!.predictions,
          isHistoricalPair: result!.is_historical_pair,
        },
        notes: candidateNotes,
        source: "cross-lab",
        reviewStatus,
        tags,
      });
      setSaveOpen(false);
    } catch (e) {
      if (e instanceof CandidateNameConflictError) {
        setSaveError(
          tr('A candidate named "{name}" already exists.', {
            name: candidateName,
          }),
        );
      } else {
        setSaveError(tr("Could not save candidate. ") + (e as Error).message);
      }
      // Dialog stays open so the user can correct the name or retry.
    } finally {
      setSaveSaving(false);
    }
  };

  /* ---- Research Note modal helpers (frame 1:3720) ---- */
  const openNoteModal = () => {
    if (!canNote) return;
    setNoteText(
      tr(
        "Research note: compare phenotype coverage for both parents before drawing conclusions. Estimates are exploratory only.",
      ),
    );
    setNoteOpen(true);
  };

  /* ---- Add a tag to the Save Candidate modal ---- */
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const estimateCell = (code: TraitCode) => {
    if (phase === "analyzing") {
      return (
        <span
          aria-hidden
          className="inline-block h-3.5 w-14 animate-pulse rounded bg-muted"
        />
      );
    }
    return estimates[code] == null ? "—" : estimates[code].toLocaleString();
  };

  return (
    <div className="p-6">
      {referenceError && (
        <p role="alert" className="text-destructive">
          {tr(referenceError)}
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {tr(error)}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          {/* Parent inputs + swap */}
          <div data-tour="cross-parents" className="flex items-stretch gap-3">
            <ParentCard
              slot="A"
              value={parentA}
              onChange={(v) => updateParent("A", v)}
              conflict={false}
              line={lineA}
              conflictMessage={conflictMessage}
            />
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label={tr("Swap Parent A and Parent B")}
                onClick={() => {
                  ++revision.current;
                  setResult(undefined);
                  setHistorical(undefined);
                  setError(undefined);
                  setParents({ parentA: parentB, parentB: parentA });
                  if (phase !== "idle") {
                    setPhase("idle");
                    setEstimates(EMPTY_ESTIMATES);
                  }
                }}
              >
                <ArrowLeftRight className="size-4" />
              </Button>
            </div>
            <ParentCard
              slot="B"
              value={parentB}
              onChange={(v) => updateParent("B", v)}
              conflict={idsMatch}
              line={lineB}
              conflictMessage={conflictMessage}
            />
          </div>

          {/* Missing genotype warning banner (frame 1:3387) */}
          {genotypeWarning !== null && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-200" />
              <p className="text-xs leading-[18px] text-amber-900 dark:text-amber-200">
                {genotypeWarning === "A" &&
                  tr(
                    "No genotype data available for Parent A. Trait estimation is unavailable until genotypes are recorded.",
                  )}
                {genotypeWarning === "B" &&
                  tr(
                    "No genotype data available for Parent B. Trait estimation is unavailable until genotypes are recorded.",
                  )}
                {genotypeWarning === "both" &&
                  tr(
                    "No genotype data available for either parent. Trait estimation is unavailable until genotypes are recorded.",
                  )}
              </p>
            </div>
          )}

          {/* Action row (with error-state retry variant, frame 1:6728) */}
          <div data-tour="cross-analyze" className="flex items-center gap-2.5">
            {phase === "error" ? (
              <>
                <Button
                  className="h-[34px] min-w-[132px]"
                  onClick={handleAnalyze}
                >
                  <Loader2 className="size-4" />
                  {tr("Retry Analysis")}
                </Button>
                <span className="text-xs text-destructive">
                  {tr("Analysis failed · no results available.")}
                </span>
              </>
            ) : (
              <>
                <Button
                  className="h-[34px] min-w-[132px]"
                  disabled={analysisDisabled}
                  onClick={handleAnalyze}
                >
                  {phase === "analyzing" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {tr("Analyzing…")}
                    </>
                  ) : (
                    tr("Analyze Cross")
                  )}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="h-[34px]"
              onClick={handleReset}
              disabled={phase === "analyzing"}
            >
              {tr("Reset")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {tr("Two distinct genotyped parent lines are required.")}
            </span>
            {idsMatch && (
              <span className="text-xs text-destructive">
                {tr("Choose two distinct lines to continue.")}
              </span>
            )}
          </div>

          {/* Historical evidence */}
          <Card
            data-tour="historical-status"
            className="rounded-xl shadow-[var(--gf-card-shadow)]"
          >
            <CardHeader className="px-4 border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Info className="size-3.5 text-primary" />
                  <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {tr("Historical Evidence")}
                  </CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {lineA && lineB
                    ? tr("Historical pedigree registry")
                    : tr("Observed data only")}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {lineA && lineB && historical !== undefined ? (
                  <>
                    <EvidenceRow
                      label={tr("Historical cross record")}
                      value={
                        historical
                          ? tr("Recorded in historical registry")
                          : tr("Not recorded in historical registry")
                      }
                    />
                    <EvidenceRow
                      label={tr("Recorded descendant count")}
                      value="Not supplied by pair lookup"
                    />
                    <EvidenceRow
                      label={tr("Phenotype observations")}
                      value="See historical line profiles"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[13px] text-muted-foreground">
                        {tr("Training-parent membership")}
                      </span>
                      <span className="flex items-center gap-2 text-[13px] text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="size-[7px] rounded-full bg-primary" />
                          A ·{" "}
                          {result
                            ? tr("Yes (selected traits)")
                            : tr("Not verified for all traits")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="size-[7px] rounded-full bg-primary" />
                          B ·{" "}
                          {result
                            ? tr("Yes (selected traits)")
                            : tr("Not verified for all traits")}
                        </span>
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <EvidenceRow
                      label={tr("Historical cross record")}
                      value="Unknown · Not yet checked"
                    />
                    <EvidenceRow
                      label={tr("Recorded descendant count")}
                      value="—"
                    />
                    <EvidenceRow
                      label={tr("Phenotype observations")}
                      value="—"
                    />
                    <EvidenceRow
                      label={tr("Training-parent membership")}
                      value="Pending analysis"
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Experimental trait estimates */}
          <Card
            data-tour="cross-results"
            className="rounded-xl shadow-[var(--gf-card-shadow)]"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5">
              <CardTitle className="text-[15px] font-semibold tracking-tight">
                {tr("Modeled Cross-level Estimates")}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Results badge (frame 1:410) */}
                {phase === "done" && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 rounded-lg border-primary bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    <Check className="size-3.5" />
                    {tr("Analysis complete")}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-lg border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"
                >
                  <AlertTriangle className="size-3.5" />
                  {tr("Historical validation passed · Decision-support only")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5">
              <Table>
                <TableHeader>
                  <TableRow className="bg-(--spring-wood)">
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {tr("Trait")}
                    </TableHead>
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {tr("Estimate")}
                    </TableHead>
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {tr("Unit")}
                    </TableHead>
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {tr("Predictive Ranking")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRAITS.map((t) => (
                    <TableRow key={t.code}>
                      <TableCell className="px-3 py-2.5">
                        <span className="text-sm font-medium">
                          {tr(t.name)}{" "}
                          <span className="font-mono font-normal text-muted-foreground">
                            ({t.code})
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-mono text-sm">
                        {estimateCell(t.code)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                        {tr(t.unit)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <span className="rounded-[10px] bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {t.code === "DTF"
                            ? "Earlier / Later"
                            : t.code === "GY"
                              ? tr("Maximize")
                              : tr("Minimize")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Results state (frame 1:410) */}
              {phase === "done" && (
                <div className="mt-2 flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground">
                    {tr("Historical-descendant cross-level modeled estimates")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tr(
                      "Represented INIA germplasm; no guaranteed offspring phenotype.",
                    )}
                  </p>
                </div>
              )}

              {/* Inference error state (frame 1:6728) */}
              {phase === "error" && (
                <div className="mt-3 rounded-lg border border-destructive bg-destructive/5 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-destructive">
                        {tr("Unable to complete local inference.")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tr(
                          "The final-v1 model bundle did not return a result for this parent pair. No estimates were produced and nothing was saved. Your parent selection is unchanged.",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty / idle states */}
              {phase === "idle" && !lineA && !lineB ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  {tr("No cross selected yet.")}
                </p>
              ) : phase === "idle" ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  {tr(
                    "Run “Analyze Cross” to populate estimates for this parent pair.",
                  )}
                </p>
              ) : null}
            </CardContent>
            <div className="border-t border-border px-5 pt-3">
              <p className="text-xs leading-[18px] text-muted-foreground">
                {tr(
                  "Estimates describe modeled historical descendant phenotype summaries, not F1 performance or guaranteed cross outcomes.",
                )}
              </p>
            </div>
          </Card>

          {/* Footer actions */}
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              className="h-[34px]"
              disabled={!canSave}
              onClick={openSaveModal}
            >
              {tr("Save Candidate")}
            </Button>
            <Button
              variant="outline"
              className="h-[34px]"
              disabled={!canNote}
              onClick={openNoteModal}
            >
              {tr("Add Research Note")}
            </Button>
            <Button
              variant="outline"
              className="h-[34px]"
              disabled={!canPedigree}
              onClick={() => navigate("/pedigree?select=" + lineA!.id)}
            >
              {tr("View Parent Pedigree")}
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Parent comparison */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-5">
              <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                {tr("Parent Comparison")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 px-5">
              <ComparisonPane
                label={tr("Parent A")}
                id={lineA?.id ?? parentA}
                rows={compareRows}
              />
              <ComparisonPane
                label={tr("Parent B")}
                id={lineB?.id ?? parentB}
                rows={compareRows}
                side="B"
              />
            </CardContent>
          </Card>

          {/* Model information */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-4">
              <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                {tr("Model Information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="divide-y divide-border">
                <ModelRow label={tr("Bundle")} value="final-v1" mono />
                <ModelRow
                  label={tr("Validation status")}
                  value="Historical validation passed"
                />
                <ModelRow
                  label={tr("External expert review")}
                  value="Pending"
                />
                <ModelRow label={tr("Usage")} value="Decision-support only" />
                <ModelRow
                  label={tr("Predictive ranking")}
                  value="Enabled for represented parents"
                />
                <ModelRow label={tr("Inference")} value="Local / Offline" />
              </div>
            </CardContent>
          </Card>

          {/* Scientific limitations */}
          <div className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/30 px-4 py-3.5 shadow-[var(--gf-card-shadow)]">
            <div className="mb-2 flex items-center gap-1.5">
              <Info className="size-4 text-amber-800 dark:text-amber-200" />
              <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-900 dark:text-amber-200">
                {tr("Scientific Limitations")}
              </span>
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] leading-[19px] text-amber-950/80 dark:text-amber-200">
              <li>
                {tr(
                  "Historical-descendant cross-level modeled estimates for represented INIA germplasm.",
                )}
              </li>
              <li>
                {tr("Generalization to external germplasm is not supported.")}
              </li>
              <li>
                {tr("No calibrated uncertainty intervals are available.")}
              </li>
              <li>
                {tr(
                  "For candidate prioritization; not a substitute for field trials.",
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* ---- Research Note modal (frame 1:3720) ---- */}
        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{tr("Add Research Note")}</DialogTitle>
              <DialogDescription>
                {tr("Document your reasoning for this parent pair.")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="research-note-textarea"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {tr("Note")}
                </label>
                <Textarea
                  id="research-note-textarea"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="border-l-[3px] border-l-primary min-h-[80px]"
                  maxLength={2000}
                />
                <span className="text-right text-[11px] text-muted-foreground">
                  {noteText.length} / 2000
                </span>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] leading-[16px] text-muted-foreground">
                  {tr("Attached to")} {lineA?.id ?? "—"} × {lineB?.id ?? "—"}{" "}
                  {tr("· final-v1 · not an approved recommendation")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <div className="mr-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Database className="size-3.5" />
                {tr("Local SQLite workspace · no cloud sync")}
              </div>
              <Button variant="outline" onClick={() => setNoteOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button onClick={() => setNoteOpen(false)}>
                {tr("Save Note")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Save Candidate modal (frame 1:4796) ---- */}
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{tr("Save Cross Candidate")}</DialogTitle>
              <DialogDescription>
                {tr("Saved to your local workspace on this device.")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {/* Parent A / Parent B read-only inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {tr("Parent A")}
                  </label>
                  <Input
                    value={lineA?.id ?? "—"}
                    readOnly
                    className="bg-primary/5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {tr("Parent B")}
                  </label>
                  <Input
                    value={lineB?.id ?? "—"}
                    readOnly
                    className="bg-primary/5"
                  />
                </div>
              </div>

              {/* Candidate name */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="candidate-name"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {tr("Candidate name")}
                </label>
                <Input
                  id="candidate-name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                />
              </div>

              {/* Research notes */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="candidate-notes"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {tr("Research notes")}
                </label>
                <Textarea
                  id="candidate-notes"
                  value={candidateNotes}
                  onChange={(e) => setCandidateNotes(e.target.value)}
                  placeholder={tr("Why this pair is worth reviewing…")}
                  className="min-h-[60px]"
                  maxLength={2000}
                />
                <span className="text-right text-[11px] text-muted-foreground">
                  {candidateNotes.length} / 2000
                </span>
              </div>

              {/* Review status */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {tr("Review status")}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus("draft")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      reviewStatus === "draft"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {tr("Draft")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus("review")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      reviewStatus === "review"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {tr("For Review")}
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {tr("Tags (optional)")}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        aria-label={tr("Remove tag {tag}", { tag })}
                        onClick={() =>
                          setTags((prev) => prev.filter((t) => t !== tag))
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTag();
                      }}
                      placeholder={tr("Add tag")}
                      className="h-7 w-24 px-2 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={addTag}
                      className="h-7 px-2 text-xs"
                    >
                      {tr("Add")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/5 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-xs leading-[18px] text-destructive">
                  {tr(saveError)}
                </p>
              </div>
            )}

            <DialogFooter>
              <div className="mr-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Database className="size-3.5" />
                {tr("Local SQLite workspace · no cloud sync")}
              </div>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button onClick={handleSaveCandidate} disabled={saveSaving}>
                {saveSaving ? (
                  <>
                    <Loader2 className="animate-spin size-4" />
                    {tr("Saving…")}
                  </>
                ) : (
                  tr("Save Candidate")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
