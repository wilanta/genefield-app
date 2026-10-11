import {
  ChevronDown,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  CandidateReviewStatus,
  CandidateSource,
  SavedCandidate,
} from "@/types/research";

export const REVIEW_STATUSES: CandidateReviewStatus[] = [
  "draft",
  "review",
  "reviewed",
  "archived",
];
const SOURCES: CandidateSource[] = ["cross-lab", "breed-designer", "manual"];
export type CandidateSort =
  "created-newest" | "created-oldest" | "updated-newest" | "name";
export type CandidateView = "list" | "grid";

export function reviewLabel(status: CandidateReviewStatus): string {
  return {
    draft: "Draft",
    review: "For Review",
    reviewed: "Reviewed",
    archived: "Archived",
  }[status];
}

function sourceLabel(source: CandidateSource): string {
  return {
    "cross-lab": "Cross Lab",
    "breed-designer": "Breed Designer",
    manual: "Manual",
  }[source];
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

function StatusBadge({ status }: { status: CandidateReviewStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-5 px-2 text-[11px] font-normal",
        status === "review" &&
          "bg-[#fcf1da] dark:bg-amber-950/50 text-[#815000] dark:text-amber-200",
        status === "reviewed" && "bg-accent text-accent-foreground",
        (status === "draft" || status === "archived") &&
          "bg-muted text-muted-foreground",
      )}
    >
      {reviewLabel(status)}
    </Badge>
  );
}

interface ToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  status: "all" | CandidateReviewStatus;
  onStatus: (value: "all" | CandidateReviewStatus) => void;
  source: "all" | CandidateSource;
  onSource: (value: "all" | CandidateSource) => void;
  sort: CandidateSort;
  onSort: (value: CandidateSort) => void;
  view: CandidateView;
  onView: (value: CandidateView) => void;
  onCreate: () => void;
  onExport: () => void;
  hasCandidates: boolean;
}

export function CandidateToolbar(props: ToolbarProps) {
  const sortLabels: Record<CandidateSort, string> = {
    "created-newest": "Created: newest",
    "created-oldest": "Created: oldest",
    "updated-newest": "Updated: newest",
    name: "Name: A–Z",
  };
  const ViewIcon = props.view === "list" ? List : LayoutGrid;
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2.5"
      aria-label="Candidate filters and actions"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={props.search}
          onChange={(event) => props.onSearch(event.target.value)}
          placeholder="Search candidates"
          aria-label="Search candidates"
          className="h-[35px] w-[180px] bg-card pl-8 text-[13px]"
        />
      </div>
      <Select
        value={props.status}
        onValueChange={(value) =>
          props.onStatus(value as ToolbarProps["status"])
        }
      >
        <SelectTrigger
          aria-label="Filter by review status"
          className="h-[35px] w-auto min-w-[104px] gap-2 bg-card px-2.5 text-[13px]"
        >
          <SelectValue>
            <span className="mr-2 text-muted-foreground">Status</span>
            {props.status === "all" ? "All" : reviewLabel(props.status)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {REVIEW_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {reviewLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={props.sort}
        onValueChange={(value) => props.onSort(value as CandidateSort)}
      >
        <SelectTrigger
          aria-label="Sort candidates"
          className="h-[35px] w-[184px] gap-2 bg-card px-2.5 text-[13px]"
        >
          <SelectValue>
            <span className="mr-2 text-muted-foreground">Sort</span>
            {sortLabels[props.sort]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(sortLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-[35px] gap-2 bg-accent px-2.5 text-[13px] font-semibold text-accent-foreground"
          >
            <ViewIcon className="size-3.5" />
            {props.view === "list" ? "List View" : "Grid View"}
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={props.view}
            onValueChange={(value) => props.onView(value as CandidateView)}
          >
            <DropdownMenuRadioItem value="list">
              List View
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid">
              Grid View
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label="More workspace options"
            className={cn(
              "h-[35px] gap-1.5 bg-secondary px-2.5",
              props.source !== "all" && "border-primary text-primary",
            )}
          >
            <MoreHorizontal className="size-5" />
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuLabel>Candidate source</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={props.source}
            onValueChange={(value) =>
              props.onSource(value as ToolbarProps["source"])
            }
          >
            <DropdownMenuRadioItem value="all">
              All sources
            </DropdownMenuRadioItem>
            {SOURCES.map((source) => (
              <DropdownMenuRadioItem key={source} value={source}>
                {sourceLabel(source)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              props.onSearch("");
              props.onStatus("all");
              props.onSource("all");
            }}
          >
            Clear filters
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={props.onExport}
            disabled={!props.hasCandidates}
          >
            Export visible candidates
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        onClick={props.onCreate}
        className="h-9 gap-2 px-3.5 text-[13px] font-semibold"
      >
        <Plus className="size-4" />
        Create
      </Button>
    </div>
  );
}

interface CandidateActions {
  onSelect: (candidate: SavedCandidate) => void;
  onOpen: (candidate: SavedCandidate) => void;
  onEdit: (candidate: SavedCandidate) => void;
  onExport: (candidate: SavedCandidate) => void;
  onDelete: (candidate: SavedCandidate) => void;
  onStatus: (candidate: SavedCandidate, status: CandidateReviewStatus) => void;
  updatingStatus: boolean;
}

function RowActions({
  candidate,
  actions,
}: {
  candidate: SavedCandidate;
  actions: CandidateActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Actions for ${candidate.name}`}
          onClick={(event) => event.stopPropagation()}
          className="text-muted-foreground"
        >
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onSelect={() => actions.onSelect(candidate)}>
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onEdit(candidate)}>
          Edit notes
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onOpen(candidate)}>
          Open in Cross Lab
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onExport(candidate)}>
          Export candidate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Review status</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={candidate.reviewStatus}
          onValueChange={(value) =>
            actions.onStatus(candidate, value as CandidateReviewStatus)
          }
        >
          {REVIEW_STATUSES.map((status) => (
            <DropdownMenuRadioItem
              key={status}
              value={status}
              disabled={actions.updatingStatus}
            >
              {reviewLabel(status)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => actions.onDelete(candidate)}
        >
          Delete candidate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CandidateList({
  items,
  selectedId,
  actions,
  view,
}: {
  items: SavedCandidate[];
  selectedId: string | null;
  actions: CandidateActions;
  view: CandidateView;
}) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 gap-3 p-3 @min-[600px]:grid-cols-2">
        {items.map((candidate) => (
          <div
            key={candidate.id}
            className={cn(
              "rounded-lg border p-3",
              selectedId === candidate.id &&
                "border-primary/40 bg-gf-tint-positive",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => actions.onSelect(candidate)}
                className="min-w-0 text-left text-[13px] font-medium hover:text-primary focus-visible:outline-ring"
              >
                {candidate.name}
              </button>
              <RowActions candidate={candidate} actions={actions} />
            </div>
            <p className="my-2 font-mono text-xs text-muted-foreground">
              {candidate.parentA} × {candidate.parentB}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <StatusBadge status={candidate.reviewStatus} />
              {candidate.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="font-normal text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Updated {formatDate(candidate.updatedAt)}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <Table className="min-w-[740px] table-fixed text-[13px]">
      <colgroup>
        <col className="w-[22%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
        <col className="w-[16.5%]" />
        <col className="w-[13.5%]" />
        <col className="w-[15.5%]" />
        <col className="w-[8.5%]" />
      </colgroup>
      <TableHeader className="bg-gf-sidebar-bg/70">
        <TableRow className="hover:bg-transparent">
          {[
            "Candidate Name",
            "Parent A",
            "Parent B",
            "Review Status",
            "Tags",
            "Last Updated",
            "Actions",
          ].map((label) => (
            <TableHead
              key={label}
              className="h-[30px] px-3 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
            >
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((candidate) => (
          <TableRow
            key={candidate.id}
            aria-selected={selectedId === candidate.id}
            onClick={() => actions.onSelect(candidate)}
            className={cn(
              "cursor-pointer",
              selectedId === candidate.id &&
                "bg-gf-tint-positive hover:bg-gf-tint-positive",
            )}
          >
            <TableCell className="h-[34px] truncate border-b border-border/60 px-3 py-0 font-medium">
              <button
                className="w-full truncate text-left outline-none focus-visible:underline focus-visible:text-primary"
                title={candidate.name}
                onClick={(event) => {
                  event.stopPropagation();
                  actions.onSelect(candidate);
                }}
              >
                {candidate.name}
              </button>
            </TableCell>
            <TableCell className="border-b border-border/60 px-3 py-0 font-mono text-xs">
              {candidate.parentA}
            </TableCell>
            <TableCell className="border-b border-border/60 px-3 py-0 font-mono text-xs">
              {candidate.parentB}
            </TableCell>
            <TableCell className="border-b border-border/60 px-3 py-0">
              <StatusBadge status={candidate.reviewStatus} />
            </TableCell>
            <TableCell className="border-b border-border/60 px-3 py-0">
              <div
                className="flex gap-1 overflow-hidden"
                title={candidate.tags.join(", ")}
              >
                {[...candidate.tags]
                  .sort((a, b) => Number(a === "demo") - Number(b === "demo"))
                  .slice(0, 1)
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="h-5 max-w-[64px] px-2 text-[11px] font-normal text-muted-foreground"
                    >
                      <span className="truncate">{tag}</span>
                    </Badge>
                  ))}
                {candidate.tags.length > 1 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{candidate.tags.length - 1}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="border-b border-border/60 px-3 py-0 tabular-nums text-muted-foreground">
              {formatDate(candidate.updatedAt)}
            </TableCell>
            <TableCell className="border-b border-border/60 px-3 py-0">
              <RowActions candidate={candidate} actions={actions} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CandidateDetail({
  candidate,
  onEdit,
  onOpen,
  onPedigree,
  onExport,
  onDelete,
  onStatus,
  updatingStatus,
}: {
  candidate: SavedCandidate | null;
  onEdit: () => void;
  onOpen: () => void;
  onPedigree: () => void;
  onExport: () => void;
  onDelete: () => void;
  onStatus: (status: CandidateReviewStatus) => void;
  updatingStatus: boolean;
}) {
  if (!candidate)
    return (
      <Card className="gap-2 p-4 shadow-[var(--gf-card-shadow)]">
        <h2 className="text-sm font-semibold">Candidate details</h2>
        <p className="text-[13px] text-muted-foreground">
          Select a candidate to view its details.
        </p>
      </Card>
    );
  const sectionHeading =
    "mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";
  const detailRow =
    "flex min-h-[34px] items-center justify-between gap-3 border-b border-border/60 py-1.5 text-[13px]";
  return (
    <>
      <Card className="shrink-0 gap-0 p-3.5 shadow-[var(--gf-card-shadow)]">
        <h2 className="mb-1.5 break-words text-[15px] font-semibold leading-6">
          {candidate.name}
        </h2>
        <dl>
          <div className={detailRow}>
            <dt className="shrink-0 text-muted-foreground">Parent pair</dt>
            <dd className="text-right font-mono text-xs">
              {candidate.parentA} × {candidate.parentB}
            </dd>
          </div>
          <div className={detailRow}>
            <dt className="text-muted-foreground">Review status</dt>
            <dd>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Change candidate review status"
                    disabled={updatingStatus}
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <StatusBadge status={candidate.reviewStatus} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={candidate.reviewStatus}
                    onValueChange={(value) =>
                      onStatus(value as CandidateReviewStatus)
                    }
                  >
                    {REVIEW_STATUSES.map((status) => (
                      <DropdownMenuRadioItem key={status} value={status}>
                        {reviewLabel(status)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </dd>
          </div>
          <div className={detailRow}>
            <dt className="text-muted-foreground">Model bundle</dt>
            <dd className="text-xs text-muted-foreground">
              {candidate.analysis?.bundleVersion ?? "Not recorded"}
            </dd>
          </div>
          <div className={detailRow}>
            <dt className="text-muted-foreground">Date created</dt>
            <dd className="tabular-nums">{formatDate(candidate.createdAt)}</dd>
          </div>
          <div className={cn(detailRow, "border-0")}>
            <dt className="text-muted-foreground">Last updated</dt>
            <dd className="tabular-nums">{formatDate(candidate.updatedAt)}</dd>
          </div>
        </dl>
        <section className="mt-4" aria-label="Research notes">
          <h3 className={sectionHeading}>Research Notes</h3>
          <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-gf-panel-bg px-3 py-2.5 text-[12.5px] leading-[18px]">
            {candidate.notes || "No research notes yet."}
          </p>
        </section>
        <section className="mt-3" aria-label="Saved experimental estimates">
          <h3 className={sectionHeading}>Saved Experimental Estimates</h3>
          {candidate.analysis ? (
            <div className="space-y-1 text-xs">
              {Object.entries(candidate.analysis.predictions).map(
                ([trait, p]) => (
                  <p key={trait}>
                    {trait}: {p.value.toFixed(4)} {p.units}
                  </p>
                ),
              )}
              {candidate.analysis.objectives && (
                <p>
                  Objectives:{" "}
                  {Object.entries(candidate.analysis.objectives)
                    .map(([t, d]) => `${t} ${d}`)
                    .join(", ")}
                </p>
              )}
              {candidate.analysis.weights && (
                <p>
                  Weights:{" "}
                  {Object.entries(candidate.analysis.weights)
                    .map(([t, w]) => `${t} ${w}`)
                    .join(", ")}
                </p>
              )}
              {candidate.analysis.applicationScore !== undefined && (
                <p>
                  Application prioritization score:{" "}
                  {candidate.analysis.applicationScore.toFixed(4)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No estimates saved.</p>
          )}
          {candidate.tags.includes("demo") && (
            <Badge
              variant="secondary"
              className="mt-1.5 bg-[#fcf1da] dark:bg-amber-950/50 text-[10px] font-normal text-[#815000] dark:text-amber-200"
            >
              Illustrative
            </Badge>
          )}
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
            For exploratory research review only.
          </p>
        </section>
        <section className="mt-3" aria-label="Review history">
          <h3 className={sectionHeading}>Review History</h3>
          <div className={cn(detailRow, "border-t")}>
            <span className="text-muted-foreground">
              Current status: {reviewLabel(candidate.reviewStatus)}
            </span>
            <span className="tabular-nums">
              {formatDate(candidate.updatedAt)}
            </span>
          </div>
          <div className={cn(detailRow, "border-0")}>
            <span className="text-muted-foreground">Candidate created</span>
            <span className="tabular-nums">
              {formatDate(candidate.createdAt)}
            </span>
          </div>
        </section>
      </Card>
      <Card className="shrink-0 gap-2 p-3.5 shadow-[var(--gf-card-shadow)]">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={onEdit}
            className="h-[27px] bg-card text-xs font-normal"
          >
            Edit Notes
          </Button>
          <Button onClick={onOpen} className="h-[27px] text-xs font-normal">
            Open in Cross Lab
          </Button>
          <Button
            variant="outline"
            onClick={onPedigree}
            className="h-[27px] bg-card text-xs font-normal"
          >
            View Pedigree
          </Button>
          <Button
            variant="outline"
            onClick={onExport}
            className="h-[27px] bg-card text-xs font-normal"
          >
            Export Candidate
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={onDelete}
          className="h-[27px] w-full bg-card text-xs font-normal text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          Delete Candidate
        </Button>
      </Card>
    </>
  );
}
