import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
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
import type { SavedCandidate, TraitCode } from "@/types/research";

/** Display persisted snapshots only. Comparison never starts inference. */
export function CandidateCompare({
  candidates,
  open,
  onOpenChange,
}: {
  candidates: SavedCandidate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t: tr } = useTranslation();
  const missing = tr("Not saved");
  const rows: {
    label: string;
    value: (candidate: SavedCandidate) => string;
  }[] = [
    { label: tr("Parent A"), value: (c) => c.parentA },
    { label: tr("Parent B"), value: (c) => c.parentB },
    ...(["GY", "DTF", "NO", "LB"] as TraitCode[]).map((trait) => ({
      label: `${trait} ${tr("estimate")}`,
      value: (c: SavedCandidate) => {
        const p = c.analysis?.predictions[trait];
        return p && Number.isFinite(p.value)
          ? `${p.value.toFixed(4)} ${tr(p.units)}`
          : missing;
      },
    })),
    {
      label: tr("Trait objectives"),
      value: (c) =>
        c.analysis?.objectives
          ? Object.entries(c.analysis.objectives)
              .map(
                ([trait, direction]) =>
                  `${trait}: ${tr(direction === "maximize" ? "Maximize" : "Minimize")}`,
              )
              .join(", ") || missing
          : missing,
    },
    {
      label: tr("Weights"),
      value: (c) =>
        c.analysis?.weights
          ? Object.entries(c.analysis.weights)
              .map(([trait, weight]) => `${trait}: ${weight}`)
              .join(", ") || missing
          : missing,
    },
    {
      label: tr("Prioritization Score"),
      value: (c) =>
        c.analysis?.applicationScore !== undefined &&
        Number.isFinite(c.analysis.applicationScore)
          ? c.analysis.applicationScore.toFixed(4)
          : missing,
    },
    {
      label: tr("Model bundle"),
      value: (c) => c.analysis?.bundleVersion ?? missing,
    },
    {
      label: tr("Historical status"),
      value: (c) =>
        typeof c.analysis?.isHistoricalPair === "boolean"
          ? tr(c.analysis.isHistoricalPair ? "Recorded" : "Not recorded")
          : missing,
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{tr("Compare saved candidates")}</DialogTitle>
          <DialogDescription>
            {tr("Saved estimates only. Missing values are not recalculated.")}
          </DialogDescription>
        </DialogHeader>
        {candidates.length < 2 ? (
          <p role="status">{tr("Select 2–3 saved candidates to compare.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">{tr("Attribute")}</TableHead>
                  {candidates.map((c) => (
                    <TableHead
                      key={c.id}
                      className="min-w-48 break-words whitespace-normal font-semibold"
                    >
                      {c.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableHead scope="row" className="whitespace-normal">
                      {row.label}
                    </TableHead>
                    {candidates.map((c) => (
                      <TableCell
                        key={c.id}
                        className="align-top break-words whitespace-normal"
                      >
                        {row.value(c)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {tr(
            "Relative application score used to prioritize candidate pairs; not a probability of breeding success.",
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {tr(
            "Scores from different objectives, weights or candidate pools are not directly comparable.",
          )}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr("Back to Workspace")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
