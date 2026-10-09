import { useState } from "react";
import { ExternalLink, BookmarkPlus, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BreedDesignerCandidate } from "@/pages/BreedDesigner/types";

interface Props {
  candidates: BreedDesignerCandidate[];
  onOpenInCrossLab: (parentA: string, parentB: string) => void;
}

/**
 * Save / Add are intentionally minimal: there is no persistence layer or
 * destination defined yet, so each performs a small, honest local interaction
 * (marks the row "staged" in-session) rather than inventing behavior. The
 * "Open in Cross Lab" action is the one with a real destination.
 */
export function CandidateTable({ candidates, onOpenInCrossLab }: Props) {
  const [staged, setStaged] = useState<Set<string>>(new Set());

  const stage = (id: string, kind: "save" | "add") => {
    setStaged((prev) => {
      const next = new Set(prev);
      next.add(id);
      console.debug(`[BreedDesigner] ${kind} staged ${id} (in-session only, no persistence)`);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--gf-card-shadow)]">
      <div className="flex flex-col overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Candidate
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Parent A
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Parent B
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Genotype
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Historical cross
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Research status
              </TableHead>
              <TableHead className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((c) => (
              <TableRow key={c.candidateId} className="h-[42px] border-b">
                <TableCell className="px-3 text-sm font-mono">{c.candidateId}</TableCell>
                <TableCell className="px-3 text-sm">
                  <span className="font-mono">{c.parentA}</span>
                </TableCell>
                <TableCell className="px-3 text-sm">
                  <span className="font-mono">{c.parentB}</span>
                </TableCell>
                <TableCell className="px-3 text-sm">
                  <Badge
                    variant={c.genotype === "Both" ? "secondary" : "outline"}
                    className="text-[11px] font-medium"
                  >
                    {c.genotype}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 text-sm">
                  <span className={c.historicalRecorded ? "text-foreground" : "text-muted-foreground"}>
                    {c.historical}
                  </span>
                </TableCell>
                <TableCell className="px-3 text-sm text-muted-foreground">
                  {c.researchStatus}
                </TableCell>
                <TableCell className="px-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-xs"
                      onClick={() => onOpenInCrossLab(c.parentA, c.parentB)}
                    >
                      <ExternalLink className="size-3.5" />
                      Open in Cross Lab
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        "h-7 gap-1.5 px-2 text-xs" +
                        (staged.has(c.candidateId) ? " text-primary" : "")
                      }
                      onClick={() => stage(c.candidateId, "save")}
                    >
                      <BookmarkPlus className="size-3.5" />
                      {staged.has(c.candidateId) ? "Saved" : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        "h-7 gap-1.5 px-2 text-xs" +
                        (staged.has(c.candidateId) ? " text-primary" : "")
                      }
                      onClick={() => stage(c.candidateId, "add")}
                    >
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {candidates.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  No candidate pairs match the current pool and generation rules.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          Save and Add stage candidates in this session only — there is no
          persistence or destination yet. Illustrative candidates for research
          review.
        </p>
      </div>
    </div>
  );
}
