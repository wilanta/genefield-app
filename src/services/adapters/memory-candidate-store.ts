import type {
  CandidateStore,
  CandidateStoreBackend,
  SavedCandidate,
  SavedCandidateInput,
  SavedCandidateUpdate,
} from "@/types/research";
import { CandidateNameConflictError } from "@/types/research";

/**
 * In-session CandidateStore for browser / preview mode.
 *
 * This keeps candidates in module-level memory ONLY. Nothing is written to
 * disk and nothing survives a reload. It exists so the Candidate Workspace is
 * fully navigable in a plain vite preview (no Rust, no SQLite). It is
 * explicitly labeled `backend: "session-memory"` so the UI can never present
 * these as persisted data.
 */
export class MemoryCandidateStore implements CandidateStore {
  readonly backend: CandidateStoreBackend = "session-memory";

  private rows = new Map<string, SavedCandidate>();
  private seqBy = new Map<string, number>();
  /**
   * Monotonic creation order. ISO-8601 timestamps have millisecond
   * resolution, so two rapid creates can share an identical `updatedAt`;
   * sorting by `updatedAt` alone would be unstable on ties. We sort by this
   * counter (last-created first) with `updatedAt` as a secondary key, so
   * "most-recently-updated first" is deterministic.
   */
  private seq = 0;

  /**
   * Seed a small, clearly-illustrative set of demo candidates so the
   * workspace isn't empty on first visit. Only applies when the store is
   * empty; every row carries a `[demo]` tag so it is visibly placeholder data.
   * Because this store is session-scoped (a fresh empty Map on each load),
   * the empty-guard makes it naturally idempotent across reloads.
   */
  async seedDemo(items: SavedCandidateInput[]): Promise<void> {
    if (this.rows.size > 0) return;
    for (const item of items) {
      await this.create({ ...item, tags: Array.from(new Set(["demo", ...(item.tags ?? [])])) });
    }
  }

  async list(): Promise<SavedCandidate[]> {
    const all = [...this.rows.values()];
    all.sort((a, b) => {
      const sa = this.seqBy.get(a.id) ?? 0;
      const sb = this.seqBy.get(b.id) ?? 0;
      if (sa !== sb) return sb - sa;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return all;
  }

  async get(id: string): Promise<SavedCandidate | null> {
    return this.rows.get(id) ?? null;
  }

  async create(input: SavedCandidateInput): Promise<SavedCandidate> {
    const name = input.name.trim();
    if (!name) throw new Error("Candidate name must not be empty.");
    for (const existing of this.rows.values()) {
      if (existing.name.toLowerCase() === name.toLowerCase()) {
        throw new CandidateNameConflictError(name);
      }
    }
    const now = new Date().toISOString();
    const row: SavedCandidate = {
      id: uuid(),
      name,
      parentA: input.parentA.trim(),
      parentB: input.parentB.trim(),
      notes: (input.notes ?? "").trim(),
      source: input.source ?? "manual",
      reviewStatus: input.reviewStatus ?? "draft",
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    this.seqBy.set(row.id, ++this.seq);
    return row;
  }

  async update(
    id: string,
    patch: SavedCandidateUpdate,
  ): Promise<SavedCandidate | null> {
    const current = this.rows.get(id);
    if (!current) return null;
    const next: SavedCandidate = {
      ...current,
      name: patch.name?.trim() || current.name,
      notes: patch.notes ?? current.notes,
      reviewStatus: patch.reviewStatus ?? current.reviewStatus,
      tags: patch.tags ? patch.tags.map((t) => t.trim()).filter(Boolean) : current.tags,
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(id, next);
    this.seqBy.set(id, ++this.seq);
    return next;
  }

  async remove(id: string): Promise<boolean> {
    this.seqBy.delete(id);
    return this.rows.delete(id);
  }

  async count(): Promise<number> {
    return this.rows.size;
  }
}

/**
 * Minimal unique-id source. Uses crypto.randomUUID where available and falls
 * back to a timestamp+random string so previews without a secure context
 * (http, non-localhost) still work.
 */
function uuid(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return `c-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
