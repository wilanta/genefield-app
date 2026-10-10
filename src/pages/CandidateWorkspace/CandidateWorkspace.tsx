import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Database,
  Info,
  Plus,
  Trash2,
  FolderKanban,
  Loader2,
  Check,
  X,
  ExternalLink,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { candidateStore } from "@/services";
import { demoCandidates } from "@/mocks/candidates";
import {
  MemoryCandidateStore,
} from "@/services";
import type {
  CandidateReviewStatus,
  CandidateSource,
  SavedCandidate,
} from "@/types/research";
import { CandidateNameConflictError } from "@/types/research";
import { cn } from "@/lib/utils";

const SOURCES: CandidateSource[] = ["cross-lab", "breed-designer", "manual"];
const REVIEW_STATUSES: CandidateReviewStatus[] = [
  "draft",
  "review",
  "archived",
];

function sourceLabel(s: CandidateSource): string {
  switch (s) {
    case "cross-lab":
      return "Cross Lab";
    case "breed-designer":
      return "Breed Designer";
    case "manual":
      return "Manual";
  }
}

function reviewLabel(s: CandidateReviewStatus): string {
  switch (s) {
    case "draft":
      return "Draft";
    case "review":
      return "For Review";
    case "archived":
      return "Archived";
  }
}

export default function CandidateWorkspace() {
  const navigate = useNavigate();
  const isMemory = candidateStore instanceof MemoryCandidateStore;

  const [items, setItems] = useState<SavedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CandidateSource>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | CandidateReviewStatus
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load / delete / status-update error states
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParentA, setNewParentA] = useState("");
  const [newParentB, setNewParentB] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newStatus, setNewStatus] = useState<CandidateReviewStatus>("draft");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update guard
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const reload = useCallback(async (seedIfEmpty: boolean) => {
    setLoadError(null);
    setLoading(true);
    try {
      if (seedIfEmpty && candidateStore.seedDemo) {
        await candidateStore.seedDemo(demoCandidates);
      }
      const list = await candidateStore.list();
      setItems(list);
    } catch (e) {
      setLoadError(
        "Failed to load candidates. " +
          (e instanceof Error ? e.message : "Unknown error."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload(true);
  }, [reload]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (sourceFilter !== "all" && i.source !== sourceFilter) return false;
      if (statusFilter !== "all" && i.reviewStatus !== statusFilter)
        return false;
      if (q) {
        const hay = `${i.name} ${i.parentA} ${i.parentB} ${i.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, sourceFilter, statusFilter]);

  const handleCreate = async () => {
    setSaving(true);
    setCreateError(null);
    try {
      await candidateStore.create({
        name: newName,
        parentA: newParentA,
        parentB: newParentB,
        notes: newNotes,
        source: "manual",
        reviewStatus: newStatus,
        tags: newTags,
      });
      setCreateOpen(false);
      resetCreateForm();
      await reload(false);
    } catch (e) {
      if (e instanceof CandidateNameConflictError) {
        setCreateError(e.message);
      } else {
        setCreateError("Could not save candidate. " + (e as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewParentA("");
    setNewParentB("");
    setNewNotes("");
    setNewStatus("draft");
    setNewTags([]);
    setNewTagInput("");
    setCreateError(null);
  };

  const handleDelete = async (id: string) => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const ok = await candidateStore.remove(id);
      if (ok) {
        if (selectedId === id) setSelectedId(null);
        await reload(false);
      }
    } catch (e) {
      setDeleteError(
        "Could not delete candidate. " +
          (e instanceof Error ? e.message : "Unknown error."),
      );
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: CandidateReviewStatus,
  ) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    setUpdateError(null);
    try {
      await candidateStore.update(id, { reviewStatus: status });
      await reload(false);
    } catch (e) {
      setUpdateError(
        "Could not update status. " +
          (e instanceof Error ? e.message : "Unknown error."),
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const addNewTag = () => {
    const t = newTagInput.trim();
    if (t && !newTags.includes(t)) setNewTags((p) => [...p, t]);
    setNewTagInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-auto xl:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="flex min-h-0 flex-col gap-3.5">
          {/* Filter bar */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardHeader className="px-4 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                  Filters
                </CardTitle>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New Candidate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 px-4 pb-3.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, parent, or tag"
                  aria-label="Search candidates"
                  className="w-[240px] pl-9"
                />
              </div>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>{sourceFilter === "all" ? "All sources" : sourceLabel(sourceFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{sourceLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>{statusFilter === "all" ? "All statuses" : reviewLabel(statusFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {REVIEW_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{reviewLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Candidate table */}
          <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Candidate</TableHead>
                    <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Parents</TableHead>
                    <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Source</TableHead>
                    <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tags</TableHead>
                    <TableHead className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "h-[46px] border-b cursor-pointer",
                        selectedId === c.id && "bg-gf-panel-bg",
                      )}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <TableCell className="px-3 text-sm font-medium text-foreground">{c.name}</TableCell>
                      <TableCell className="px-3 font-mono text-sm">
                        {c.parentA} <span className="text-muted-foreground">×</span> {c.parentB}
                      </TableCell>
                      <TableCell className="px-3 text-sm">
                        <Badge variant="outline" className="text-[11px] font-medium">{sourceLabel(c.source)}</Badge>
                      </TableCell>
                      <TableCell className="px-3">
                        <Select
                          value={c.reviewStatus}
                          onValueChange={(v) => handleStatusChange(c.id, v as CandidateReviewStatus)}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-[11px]">
                            <SelectValue>{reviewLabel(c.reviewStatus)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {REVIEW_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{reviewLabel(s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-3">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.length ? c.tags.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[11px] font-medium">
                              <Tag className="size-3" /> {t}
                            </Badge>
                          )) : <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cross-lab?a=${encodeURIComponent(c.parentA)}&b=${encodeURIComponent(c.parentB)}`);
                            }}
                          >
                            <ExternalLink className="size-3.5" />
                            Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(c.id);
                            }}
                            aria-label={`Delete ${c.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filtered.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        {items.length === 0
                          ? "No candidates yet. Use “New Candidate” or save from Cross Lab / Breed Designer."
                          : "No candidates match the current filters."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading candidates…</span>
                </div>
              ) : null}

              {loadError && (
                <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/5 px-4 py-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-destructive">{loadError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-fit text-xs"
                      onClick={() => reload(false)}
                    >
                      <Loader2 className="size-3" />
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {(deleteError || updateError) && (
                <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/5 px-4 py-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">{deleteError ?? updateError}</p>
                </div>
              )}
            </CardContent>
            <div className="border-t border-border px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                {isMemory
                  ? "In-session preview only — candidates are not persisted and will be lost on reload."
                  : "Saved to the local SQLite workspace on this device."}
              </p>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="min-h-0">
          <div className="flex flex-col gap-3.5">
            {/* Detail card */}
            <Card className="rounded-xl shadow-[var(--gf-card-shadow)]">
              <CardHeader className="px-4 pt-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="size-4 text-muted-foreground" />
                  <CardTitle className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                    Candidate Detail
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4 pb-3.5">
                {selected ? (
                  <>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Name</p>
                      <p className="text-sm font-medium text-foreground">{selected.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Parents</p>
                      <p className="font-mono text-sm text-foreground">
                        {selected.parentA} × {selected.parentB}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Source</p>
                      <p className="text-sm text-foreground">{sourceLabel(selected.source)}</p>
                    </div>
                    {selected.notes ? (
                      <div>
                        <p className="text-[11px] text-muted-foreground">Notes</p>
                        <p className="text-sm leading-[18px] text-foreground">{selected.notes}</p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-[11px] text-muted-foreground">Created</p>
                      <p className="text-xs tabular-nums text-foreground">
                        {new Date(selected.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a candidate to view its detail.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Backend indicator */}
            <div
              className={cn(
                "rounded-xl border px-4 py-3.5 shadow-[var(--gf-card-shadow)]",
                isMemory
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-[#4D9E5C]/40 bg-[#4D9E5C]/5",
              )}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                {isMemory ? (
                  <Info className="size-4 text-amber-800" />
                ) : (
                  <Database className="size-4 text-[#4D9E5C]" />
                )}
                <span
                  className={cn(
                    "font-semibold uppercase tracking-wider text-[11px]",
                    isMemory ? "text-amber-900" : "text-[#4D9E5C]",
                  )}
                >
                  {isMemory ? "Preview Mode" : "Local Workspace"}
                </span>
              </div>
              <p className={cn("text-[12.5px] leading-[19px]", isMemory ? "text-amber-950/80" : "text-foreground/80")}>
                {isMemory
                  ? "Running in browser preview. Candidates live in in-session memory only and are not written to disk."
                  : "Candidates are stored in the local SQLite workspace on this device. No cloud sync."}
              </p>
            </div>

            {/* Limitations */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-3.5 shadow-[var(--gf-card-shadow)]">
              <div className="mb-2 flex items-center gap-1.5">
                <Info className="size-4 text-amber-800" />
                <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-900">
                  Research Limitations
                </span>
              </div>
              <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] leading-[19px] text-amber-950/80">
                <li>Candidates are illustrative for research review only.</li>
                <li>No predictive ranking is applied to saved candidates.</li>
                <li>Status changes are local to this device/workspace.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Candidate</DialogTitle>
            <DialogDescription>
              Add a cross candidate to your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Parent A</label>
                <Input
                  value={newParentA}
                  onChange={(e) => setNewParentA(e.target.value)}
                  placeholder="GID_1233"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Parent B</label>
                <Input
                  value={newParentB}
                  onChange={(e) => setNewParentB(e.target.value)}
                  placeholder="GID_3494"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Candidate name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My cross candidate"
              />
              {createError ? <p className="text-xs text-destructive">{createError}</p> : null}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Why is this pair worth reviewing?"
                className="min-h-[60px]"
                maxLength={2000}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as CandidateReviewStatus)}>
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue>{reviewLabel(newStatus)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{reviewLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {newTags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        type="button"
                        onClick={() => setNewTags((p) => p.filter((x) => x !== t))}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${t}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewTag(); } }}
                    placeholder="tag"
                    className="h-7 w-24 px-2 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !newParentA.trim() || !newParentB.trim() || !newName.trim()}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this candidate from your workspace. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
