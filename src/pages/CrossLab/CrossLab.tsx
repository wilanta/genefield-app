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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { mockLines } from "@/mocks/lines";
import type { RiceLine, TraitCode } from "@/types/research";
import { cn } from "@/lib/utils";

// CardHeading was removed; headings are now rendered inline.

const TRAITS: { code: TraitCode; name: string; unit: string }[] = [
  { code: "GY", name: "Grain Yield", unit: "kg/ha" },
  { code: "DTF", name: "Days to Flowering", unit: "days" },
  { code: "NO", name: "Stem Rot", unit: "dataset-defined scale" },
  { code: "LB", name: "Leaf Blast", unit: "dataset-defined scale" },
];

const EMPTY_ESTIMATES: Record<TraitCode, number | null> = {
  GY: null,
  DTF: null,
  NO: null,
  LB: null,
};

/** Resolve a typed id (or query param) to a mock line. */
function resolveLine(id: string | null | undefined): RiceLine | undefined {
  if (!id) return undefined;
  const q = id.trim().toUpperCase();
  if (!q) return undefined;
  return mockLines.find((l) => l.id.toUpperCase() === q);
}

function lineFlags(line: RiceLine): string {
  const flags = [
    line.hasGenotype && "Genotype",
    line.hasPhenotype && "Phenotype",
    line.hasPedigree && "Pedigree",
  ].filter(Boolean);
  return flags.length > 0 ? flags.join(" · ") : "No data";
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

  const query = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const source = query
      ? mockLines.filter((l) => l.id.toLowerCase().includes(query))
      : mockLines;
    return source.slice(0, 8);
  }, [query]);

  const notFound = value.trim() !== "" && !line;

  return (
    <Card className="flex-1 rounded-xl shadow-[var(--gf-card-shadow)]">
      <CardHeader className="px-4 pt-3.5">
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
            Parent {slot}
          </CardTitle>
          {/* Genotype availability indicator */}
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-[7px] rounded-full",
                available
                  ? "border-[1.5px] border-[#4D9E5C] bg-transparent"
                  : "border border-foreground/30 bg-transparent",
              )}
            />
            <span
              className={cn(
                "text-xs",
                available ? "text-[#4D9E5C]" : "text-muted-foreground",
              )}
            >
              {available ? "Genotype available" : "No genotype"}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 px-4 pb-3.5">
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
              aria-label={`Parent ${slot}`}
              className="h-auto border-0 bg-transparent px-0 shadow-none ring-0 focus-visible:ring-0"
            />
          </div>
          {open && (
            <ul
              role="listbox"
              aria-label={`Parent ${slot} suggestions`}
              className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
            >
              {suggestions.length === 0 ? (
                <li className="px-2.5 py-2 text-xs text-muted-foreground">
                  No lines match “{value.trim()}”.
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
                          {lineFlags(l)}
                          {selected && <Check className="size-3 text-primary" />}
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
            Line not found in the local dataset.
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
          View line profile
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
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] text-foreground">{value}</span>
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
  return (
    <div className="flex items-center justify-between py-[7px]">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-[13px] text-foreground",
          mono && "font-mono",
        )}
      >
        {value}
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
  const key = side === "B" ? "b" : "a";
  return (
    <div className="rounded-lg border border-border bg-gf-panel-bg px-3 py-2">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
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
              <span className="text-xs text-muted-foreground">{row.label}</span>
              {row.kind === "genotype" ? (
                <span
                  className={cn(
                    "text-xs",
                    value
                      ? "text-accent-foreground"
                      : "text-foreground",
                  )}
                >
                  {value ? "Available" : "Not available"}
                </span>
              ) : (
                <span className="text-xs text-foreground">Not checked</span>
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
  const [params] = useSearchParams();

  const [parentA, setParentA] = useState(params.get("a") ?? "");
  const [parentB, setParentB] = useState(params.get("b") ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [estimates, setEstimates] = useState<Record<TraitCode, number | null>>(
    EMPTY_ESTIMATES,
  );

  /* ---- Research Note modal state (frame 1:3720) ---- */
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(
    "Illustrative note: compare phenotype coverage for both parents before drawing conclusions. Estimates are exploratory only.",
  );

  /* ---- Save Candidate modal state (frame 1:4796) ---- */
  const [saveOpen, setSaveOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("GID_1233 × GID_3494");
  const [candidateNotes, setCandidateNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"draft" | "review">(
    "draft",
  );
  const [tags, setTags] = useState<string[]>(["pilot"]);
  const [tagInput, setTagInput] = useState("");

  const timerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  // Prefill when the page is reached via "Use as Parent A/B".
  useEffect(() => {
    const a = params.get("a");
    const b = params.get("b");
    if (a) setParentA(a);
    if (b) setParentB(b);
  }, [params]);

  const navigate = useNavigate();

  const lineA = resolveLine(parentA);
  const lineB = resolveLine(parentB);

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
  const conflictMessage = "Parent B is the same line as Parent A.";

  /** Permission gates for footer action buttons. */
  const canSave = !!(lineA && lineB && !idsMatch && phase !== "error");
  const canNote = !!(lineA && lineB && !idsMatch && phase !== "error");
  const canPedigree = !!(lineA && lineB);

  /** Default candidate name built from the two selected line ids. */
  const defaultCandidateName =
    lineA && lineB ? `${lineA.id} × ${lineB.id}` : "GID_1233 × GID_3494";

  const compareRows: ComparisonRow[] = useMemo(
    () => [
      { label: "Genotype", a: lineA?.hasGenotype, b: lineB?.hasGenotype, kind: "genotype" },
      { label: "Phenotype", a: lineA?.hasPhenotype, b: lineB?.hasPhenotype, kind: "unchecked" },
      { label: "Pedigree", a: lineA?.hasPedigree, b: lineB?.hasPedigree, kind: "unchecked" },
    ],
    [lineA, lineB],
  );

  /** Editing a parent invalidates the previous analysis. */
  const updateParent = (slot: "A" | "B", v: string) => {
    if (slot === "A") setParentA(v);
    else setParentB(v);
    if (phase !== "idle") {
      setPhase("idle");
      setEstimates(EMPTY_ESTIMATES);
    }
  };

  /* ---- Analyze / Retry handler (frame 1:6728) ---- */
  const handleAnalyze = useCallback(() => {
    if (analysisDisabled) return;
    setPhase("analyzing");
    timerRef.current = window.setTimeout(() => {
      /* Simulate ~33 % inference failure for demo purposes. */
      if (Math.random() < 0.33) {
        setEstimates(EMPTY_ESTIMATES);
        setPhase("error");
        return;
      }
      const next: Record<TraitCode, number | null> = { ...EMPTY_ESTIMATES };
      for (const t of TRAITS) {
        const a = lineA?.estimates?.find((e) => e.trait === t.code)?.value ?? null;
        const b = lineB?.estimates?.find((e) => e.trait === t.code)?.value ?? null;
        if (a != null && b != null) next[t.code] = Math.round((a + b) / 2);
        else next[t.code] = a ?? b;
      }
      setEstimates(next);
      setPhase("done");
    }, 900);
  }, [analysisDisabled, lineA, lineB]);

  const handleReset = () => {
    setParentA("");
    setParentB("");
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
    setSaveOpen(true);
  };

  const handleSaveCandidate = () => {
    /* If the name matches the default, show the duplicate-name error;
       otherwise just close (no real persistence yet). */
    if (candidateName.trim() === defaultCandidateName) {
      return; // leave dialog open — error banner will show
    }
    setSaveOpen(false);
  };

  /* ---- Research Note modal helpers (frame 1:3720) ---- */
  const openNoteModal = () => {
    if (!canNote) return;
    setNoteText(
      "Illustrative note: compare phenotype coverage for both parents before drawing conclusions. Estimates are exploratory only.",
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
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          {/* Parent inputs + swap */}
          <div className="flex items-stretch gap-3">
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
                aria-label="Swap Parent A and Parent B"
                onClick={() => {
                  setParentA(parentB);
                  setParentB(parentA);
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
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <p className="text-xs leading-[18px] text-amber-900">
                {genotypeWarning === "A" &&
                  "No genotype data available for Parent A. Trait estimation is unavailable until genotypes are recorded."}
                {genotypeWarning === "B" &&
                  "No genotype data available for Parent B. Trait estimation is unavailable until genotypes are recorded."}
                {genotypeWarning === "both" &&
                  "No genotype data available for either parent. Trait estimation is unavailable until genotypes are recorded."}
              </p>
            </div>
          )}

          {/* Action row (with error-state retry variant, frame 1:6728) */}
          <div className="flex items-center gap-2.5">
            {phase === "error" ? (
              <>
                <Button
                  className="h-[34px] min-w-[132px]"
                  onClick={handleAnalyze}
                >
                  <Loader2 className="size-4" />
                  Retry Analysis
                </Button>
                <span className="text-xs text-destructive">
                  Analysis failed · no results available.
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
                      Analyzing…
                    </>
                  ) : (
                    "Analyze Cross"
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
              Reset
            </Button>
            {idsMatch && (
              <span className="text-xs text-destructive">
                Choose two distinct lines to continue.
              </span>
            )}
          </div>

          {/* Historical evidence */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-4 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Info className="size-3.5 text-[#4D9E5C]" />
                  <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#4D9E5C]">
                    Historical Evidence
                  </CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {lineA && lineB
                    ? "Observed data only · illustrative values"
                    : "Observed data only"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {lineA && lineB && phase === "done" ? (
                  <>
                    <EvidenceRow
                      label="Historical cross record"
                      value="No recorded cross in dataset"
                    />
                    <EvidenceRow
                      label="Recorded descendant count"
                      value="0"
                    />
                    <EvidenceRow
                      label="Phenotype observations"
                      value="None for this pair"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[13px] text-muted-foreground">
                        Training-parent membership
                      </span>
                      <span className="flex items-center gap-2 text-[13px] text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="size-[7px] rounded-full bg-[#4D9E5C]" />
                          A · Yes
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="size-[7px] rounded-full bg-[#4D9E5C]" />
                          B · Yes
                        </span>
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <EvidenceRow
                      label="Historical cross record"
                      value="Unknown · Not yet checked"
                    />
                    <EvidenceRow
                      label="Recorded descendant count"
                      value="—"
                    />
                    <EvidenceRow label="Phenotype observations" value="—" />
                    <EvidenceRow
                      label="Training-parent membership"
                      value="Pending analysis"
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Experimental trait estimates */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="flex flex-row items-center justify-between px-4 pt-3">
              <CardTitle className="text-[15px] font-semibold tracking-tight">
                Experimental Trait Estimates
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Results badge (frame 1:410) */}
                {phase === "done" && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 rounded-lg border-[#4D9E5C] bg-[#4D9E5C]/10 px-2 py-0.5 text-[11px] font-medium text-[#4D9E5C]"
                  >
                    <Check className="size-3.5" />
                    Analysis complete
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-lg border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                >
                  <AlertTriangle className="size-3.5" />
                  Research-only · Not validated for breeding decisions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Trait
                    </TableHead>
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Estimate
                    </TableHead>
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Unit
                    </TableHead>
                    <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Predictive Ranking
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRAITS.map((t) => (
                    <TableRow key={t.code}>
                      <TableCell className="px-3 py-2.5">
                        <span className="text-sm font-medium">
                          {t.name}{" "}
                          <span className="font-mono font-normal text-muted-foreground">
                            ({t.code})
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-mono text-sm">
                        {estimateCell(t.code)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                        {t.unit}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <span className="rounded-[10px] bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Disabled
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
                    Illustrative placeholder values
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Interface demonstration only — not real model output.
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
                        Unable to complete local inference.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        The research-v1 model bundle did not return a result
                        for this parent pair. No estimates were produced and
                        nothing was saved. Your parent selection is unchanged.
                      </p>
                      {/* Technical details sub-section (illustrative) */}
                      <div className="mt-1.5">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                          Technical details
                        </p>
                        <pre className="overflow-x-auto rounded bg-muted/50 p-2 font-mono text-[11px] leading-[16px] text-foreground/80">
{JSON.stringify(
  {
    stage: "inference",
    bundle: "research-v1",
    parents: [lineA?.id ?? "—", lineB?.id ?? "—"],
    message: "Model bundle did not return a result for this parent pair.",
  },
  null,
  2,
)}
</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bordered footnote (results state, frame 1:410) */}
              {phase === "done" && (
                <div className="mt-3 rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs leading-[18px] text-muted-foreground">
                    Estimates describe modeled historical descendant phenotype
                    summaries, not F1 performance or guaranteed cross
                    outcomes.
                  </p>
                </div>
              )}

              {/* Empty / idle states */}
              {phase === "idle" && !lineA && !lineB ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  No cross selected yet.
                </p>
              ) : phase === "idle" ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Run &ldquo;Analyze Cross&rdquo; to populate estimates for
                  this parent pair.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Footer actions */}
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              className="h-[34px]"
              disabled={!canSave}
              onClick={openSaveModal}
            >
              Save Candidate
            </Button>
            <Button
              variant="outline"
              className="h-[34px]"
              disabled={!canNote}
              onClick={openNoteModal}
            >
              Add Research Note
            </Button>
            <Button
              variant="outline"
              className="h-[34px]"
              disabled={!canPedigree}
              onClick={() => navigate("/pedigree?select=" + lineA!.id)}
            >
              View Parent Pedigree
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Parent comparison */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-4 pt-3">
              <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                Parent Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5 px-4 pb-3">
              <ComparisonPane
                label="Parent A"
                id={lineA?.id ?? parentA}
                rows={compareRows}
              />
              <ComparisonPane
                label="Parent B"
                id={lineB?.id ?? parentB}
                rows={compareRows}
                side="B"
              />
            </CardContent>
          </Card>

          {/* Model information */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-4 pt-3">
              <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                Model Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="divide-y divide-border">
                <ModelRow label="Bundle" value="research-v1" mono />
                <ModelRow label="Scientific review" value="Unreviewed" />
                <ModelRow label="Usage" value="Research-only" />
                <ModelRow label="Predictive ranking" value="Disabled" />
                <ModelRow label="Inference" value="Local / Offline" />
              </div>
            </CardContent>
          </Card>

          {/* Scientific limitations */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-3.5 shadow-[var(--gf-card-shadow)]">
            <div className="mb-2 flex items-center gap-1.5">
              <Info className="size-4 text-amber-800" />
              <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-900">
                Scientific Limitations
              </span>
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] leading-[19px] text-amber-950/80">
              <li>Predictions are experimental.</li>
              <li>Generalization to unseen parents is not established.</li>
              <li>No calibrated uncertainty intervals are available.</li>
              <li>
                Estimates must not be interpreted as validated breeding
                recommendations.
              </li>
            </ul>
          </div>
        </div>

        {/* ---- Research Note modal (frame 1:3720) ---- */}
        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Research Note</DialogTitle>
              <DialogDescription>
                Document your reasoning for this parent pair.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="research-note-textarea"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Note
                </label>
                <Textarea
                  id="research-note-textarea"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="border-l-[3px] border-l-[#4D9E5C] min-h-[80px]"
                  maxLength={2000}
                />
                <span className="text-right text-[11px] text-muted-foreground">
                  {noteText.length} / 2000
                </span>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] leading-[16px] text-muted-foreground">
                  Attached to {lineA?.id ?? "—"} × {lineB?.id ?? "—"} ·
                  research-v1 · not an approved recommendation
                </p>
              </div>
            </div>
            <DialogFooter>
              <div className="mr-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Database className="size-3.5" />
                Local SQLite workspace · no cloud sync
              </div>
              <Button variant="outline" onClick={() => setNoteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setNoteOpen(false)}>Save Note</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Save Candidate modal (frame 1:4796) ---- */}
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save Cross Candidate</DialogTitle>
              <DialogDescription>
                Saved to your local workspace on this device.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {/* Parent A / Parent B read-only inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Parent A
                  </label>
                  <Input value={lineA?.id ?? "—"} readOnly className="bg-[#4D9E5C]/5" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Parent B
                  </label>
                  <Input value={lineB?.id ?? "—"} readOnly className="bg-[#4D9E5C]/5" />
                </div>
              </div>

              {/* Candidate name */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="candidate-name"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Candidate name
                </label>
                <Input
                  id="candidate-name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                />
                {candidateName.trim() === defaultCandidateName && (
                  <p className="text-xs text-destructive">
                    A candidate with this name already exists in this
                    workspace.
                  </p>
                )}
              </div>

              {/* Research notes */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="candidate-notes"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Research notes
                </label>
                <Textarea
                  id="candidate-notes"
                  value={candidateNotes}
                  onChange={(e) => setCandidateNotes(e.target.value)}
                  placeholder="Why this pair is worth reviewing…"
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
                  Review status
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus("draft")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      reviewStatus === "draft"
                        ? "border-[#4D9E5C] bg-[#4D9E5C]/10 text-[#4D9E5C]"
                        : "border-border bg-transparent text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus("review")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      reviewStatus === "review"
                        ? "border-[#4D9E5C] bg-[#4D9E5C]/10 text-[#4D9E5C]"
                        : "border-border bg-transparent text-muted-foreground hover:bg-muted",
                    )}
                  >
                    For Review
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Tags (optional)
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
                        aria-label={`Remove tag ${tag}`}
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
                      placeholder="Add tag"
                      className="h-7 w-24 px-2 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={addTag}
                      className="h-7 px-2 text-xs"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <div className="mr-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Database className="size-3.5" />
                Local SQLite workspace · no cloud sync
              </div>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCandidate}>Save Candidate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
