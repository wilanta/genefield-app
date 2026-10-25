import { useTranslation } from "@/components/language-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  Trash2,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CandidateDetail,
  CandidateList,
  CandidateToolbar,
  REVIEW_STATUSES,
  reviewLabel,
  type CandidateSort,
  type CandidateView,
} from "./CandidateWorkspacePanels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import type {
  CandidateReviewStatus,
  CandidateSource,
  SavedCandidate,
} from "@/types/research";
import { CandidateNameConflictError } from "@/types/research";
import { CandidateCompare } from "./CandidateCompare";

function exportCandidates(candidates: SavedCandidate[]) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          researchOnly: true,
          candidates,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    candidates.length === 1
      ? `candidate-${candidates[0].id.replace(/[^a-zA-Z0-9_-]/g, "")}.json`
      : "genefield-candidates.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CandidateWorkspace() {
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const isMemory = candidateStore.backend === "session-memory";

  const [items, setItems] = useState<SavedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CandidateSource>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | CandidateReviewStatus
  >("all");
  const [sort, setSort] = useState<CandidateSort>("created-newest");
  const [view, setView] = useState<CandidateView>("list");
  const [editingCandidate, setEditingCandidate] =
    useState<SavedCandidate | null>(null);
  const [editedNotes, setEditedNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const compareCandidates = compareIds.flatMap((id) => {
    const candidate = items.find((item) => item.id === id);
    return candidate ? [candidate] : [];
  });
  useEffect(() => {
    setCompareIds((current) =>
      current.filter((id) => items.some((item) => item.id === id)),
    );
  }, [items]);
  const toggleCompare = (id: string) =>
    setCompareIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );

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

  const reload = useCallback(async (_seedIfEmpty: boolean) => {
    setLoadError(null);
    setLoading(true);
    try {
      const list = await candidateStore.list();
      setItems(list);
    } catch (e) {
      setLoadError(
        tr("Failed to load candidates. ") +
          (e instanceof Error ? e.message : tr("Unknown error.")),
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
    return items
      .filter((i) => {
        if (sourceFilter !== "all" && i.source !== sourceFilter) return false;
        if (statusFilter !== "all" && i.reviewStatus !== statusFilter)
          return false;
        if (q) {
          const hay =
            `${i.name} ${i.parentA} ${i.parentB} ${i.tags.join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "created-newest":
            return b.createdAt.localeCompare(a.createdAt);
          case "created-oldest":
            return a.createdAt.localeCompare(b.createdAt);
          case "updated-newest":
            return b.updatedAt.localeCompare(a.updatedAt);
          case "name":
            return a.name.localeCompare(b.name);
        }
      });
  }, [items, search, sourceFilter, statusFilter, sort]);

  useEffect(() => {
    setSelectedId((current) =>
      filtered.some((item) => item.id === current)
        ? current
        : (filtered[0]?.id ?? null),
    );
  }, [filtered]);

  const openInCrossLab = (candidate: SavedCandidate) =>
    navigate(
      `/cross-lab?a=${encodeURIComponent(candidate.parentA)}&b=${encodeURIComponent(candidate.parentB)}`,
    );

  const editNotes = (candidate: SavedCandidate) => {
    setEditingCandidate(candidate);
    setEditedNotes(candidate.notes);
    setNotesError(null);
  };

  const saveNotes = async () => {
    if (!editingCandidate || savingNotes) return;
    setSavingNotes(true);
    setNotesError(null);
    try {
      const updated = await candidateStore.update(editingCandidate.id, {
        notes: editedNotes.trim(),
      });
      if (!updated) throw new Error(tr("This candidate no longer exists."));
      setEditingCandidate(null);
      await reload(false);
    } catch (error) {
      setNotesError(
        tr("Could not save notes. ") +
          (error instanceof Error ? error.message : tr("Unknown error.")),
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    setCreateError(null);
    try {
      const created = await candidateStore.create({
        name: newName,
        parentA: newParentA,
        parentB: newParentB,
        notes: newNotes,
        source: "manual",
        reviewStatus: newStatus,
        tags: newTags,
      });
      setSearch("");
      setSourceFilter("all");
      setStatusFilter("all");
      setCreateOpen(false);
      resetCreateForm();
      await reload(false);
      setSelectedId(created.id);
    } catch (e) {
      if (e instanceof CandidateNameConflictError) {
        setCreateError(
          tr('A candidate named "{name}" already exists.', { name: newName }),
        );
      } else {
        setCreateError(tr("Could not save candidate. ") + (e as Error).message);
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
        tr("Could not delete candidate. ") +
          (e instanceof Error ? e.message : tr("Unknown error.")),
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
        tr("Could not update status. ") +
          (e instanceof Error ? e.message : tr("Unknown error.")),
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
    <div className="flex min-h-full flex-col px-6 pb-5 pt-5 xl:h-full xl:min-h-[680px]">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section
          data-tour="candidate-workspace"
          className="flex min-h-0 min-w-0 flex-col gap-3"
          aria-label={tr("Candidate workspace")}
        >
          <CandidateToolbar
            search={search}
            onSearch={setSearch}
            status={statusFilter}
            onStatus={setStatusFilter}
            source={sourceFilter}
            onSource={setSourceFilter}
            sort={sort}
            onSort={setSort}
            view={view}
            onView={setView}
            onCreate={() => setCreateOpen(true)}
            onExport={() => exportCandidates(filtered)}
            hasCandidates={filtered.length > 0}
          />
          <div
            data-tour="candidate-compare"
            className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={compareCandidates.length < 2 || loading}
              onClick={() => setCompareOpen(true)}
            >
              {tr("Compare candidates")} ({compareCandidates.length}/3)
            </Button>
            <span role="status">
              {tr("Select 2–3 saved candidates to compare.")}
            </span>
            {compareIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompareIds([])}
              >
                {tr("Clear selection")}
              </Button>
            )}
          </div>
          <div
            className="@container min-h-[360px] flex-1 overflow-auto rounded-xl border bg-card shadow-[var(--gf-card-shadow)]"
            aria-busy={loading}
          >
            <CandidateList
              items={filtered}
              selectedId={selectedId}
              view={view}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              actions={{
                onSelect: (candidate) => setSelectedId(candidate.id),
                onOpen: openInCrossLab,
                onEdit: editNotes,
                onExport: (candidate) => exportCandidates([candidate]),
                onDelete: (candidate) => setPendingDeleteId(candidate.id),
                onStatus: (candidate, status) =>
                  handleStatusChange(candidate.id, status),
                updatingStatus,
              }}
            />
            {loading && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {tr("Loading candidates…")}
              </div>
            )}
            {!loading && !loadError && filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {items.length === 0
                  ? tr(
                      "No candidates yet. Create a candidate or save a pair from Cross Lab or Breed Designer.",
                    )
                  : tr("No candidates match the current filters.")}
              </p>
            )}
            {loadError && (
              <div
                role="alert"
                className="flex items-start gap-2 border-t bg-destructive/5 px-4 py-3 text-xs text-destructive"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <div>
                  <p>{tr(loadError)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reload(false)}
                    className="mt-2"
                  >
                    {tr("Retry")}
                  </Button>
                </div>
              </div>
            )}
            {(deleteError || updateError) && (
              <p
                role="alert"
                className="border-t bg-destructive/5 px-4 py-3 text-xs text-destructive"
              >
                {tr(deleteError ?? updateError ?? "")}
              </p>
            )}
          </div>
        </section>
        <aside
          className="flex min-h-0 min-w-0 flex-col gap-3.5 xl:overflow-y-auto"
          aria-label={tr("Selected candidate details")}
        >
          <CandidateDetail
            candidate={selected}
            onEdit={() => selected && editNotes(selected)}
            onOpen={() => selected && openInCrossLab(selected)}
            onPedigree={() => navigate("/pedigree")}
            onExport={() => selected && exportCandidates([selected])}
            onDelete={() => selected && setPendingDeleteId(selected.id)}
            onStatus={(status) =>
              selected && handleStatusChange(selected.id, status)
            }
            updatingStatus={updatingStatus}
          />
        </aside>
      </div>
      <CandidateCompare
        candidates={compareCandidates}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
      <p className="mt-3.5 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <Database className="size-3" />
        {isMemory
          ? tr(
              "Browser preview · candidates are stored in session memory and reset on reload.",
            )
          : tr("Stored locally in a SQLite workspace on this device.")}
      </p>

      <Dialog
        open={editingCandidate !== null}
        onOpenChange={(open) => {
          if (!open && !savingNotes) setEditingCandidate(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => {
            if (savingNotes) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (savingNotes) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{tr("Edit Notes")}</DialogTitle>
            <DialogDescription>{editingCandidate?.name}</DialogDescription>
          </DialogHeader>
          <label
            htmlFor="candidate-research-notes"
            className="text-xs font-medium text-muted-foreground"
          >
            {tr("Research notes")}
          </label>
          <Textarea
            id="candidate-research-notes"
            value={editedNotes}
            onChange={(event) => setEditedNotes(event.target.value)}
            maxLength={2000}
            disabled={savingNotes}
            className="min-h-[140px]"
          />
          {notesError && (
            <p role="alert" className="text-xs text-destructive">
              {tr(notesError)}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingNotes}
              onClick={() => setEditingCandidate(null)}
            >
              {tr("Cancel")}
            </Button>
            <Button onClick={saveNotes} disabled={savingNotes}>
              {savingNotes && <Loader2 className="size-3.5 animate-spin" />}
              {tr("Save Notes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr("Create Candidate")}</DialogTitle>
            <DialogDescription>
              {tr("Add a cross candidate to your workspace.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="candidate-parent-a"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {tr("Parent A")}
                </label>
                <Input
                  id="candidate-parent-a"
                  value={newParentA}
                  onChange={(e) => setNewParentA(e.target.value)}
                  placeholder="GID_1233"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="candidate-parent-b"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {tr("Parent B")}
                </label>
                <Input
                  id="candidate-parent-b"
                  value={newParentB}
                  onChange={(e) => setNewParentB(e.target.value)}
                  placeholder="GID_3494"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="candidate-name"
                className="text-xs font-medium text-muted-foreground"
              >
                {tr("Candidate name")}
              </label>
              <Input
                id="candidate-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={tr("My cross candidate")}
              />
              {createError ? (
                <p className="text-xs text-destructive">{tr(createError)}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {tr("Notes")}
              </label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={tr("Why is this pair worth reviewing?")}
                className="min-h-[60px]"
                maxLength={2000}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tr("Status")}
                </label>
                <Select
                  value={newStatus}
                  onValueChange={(v) =>
                    setNewStatus(v as CandidateReviewStatus)
                  }
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue>{tr(reviewLabel(newStatus))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {tr(reviewLabel(s))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tr("Tags")}
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {newTags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        type="button"
                        onClick={() =>
                          setNewTags((p) => p.filter((x) => x !== t))
                        }
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={tr("Remove {tag}", { tag: t })}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addNewTag();
                      }
                    }}
                    placeholder={tr("tag")}
                    className="h-7 w-24 px-2 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tr("Cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                saving ||
                !newParentA.trim() ||
                !newParentB.trim() ||
                !newName.trim()
              }
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {tr("Save Candidate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Delete candidate?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr(
                "This will permanently remove this candidate from your workspace. This action cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {deleting ? tr("Deleting…") : tr("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
