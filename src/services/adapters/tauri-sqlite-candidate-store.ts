import type {
  CandidateStore,
  CandidateStoreBackend,
  SavedCandidate,
  SavedCandidateInput,
  SavedCandidateUpdate,
} from "@/types/research";
import { CandidateNameConflictError } from "@/types/research";

/**
 * Connection string for the candidate-store SQLite database. The `sqlite:`
 * prefix is required; the path is resolved by the plugin to the app's data
 * directory (BaseDirectory::App), NOT the process CWD — so the file location
 * is stable across runs.
 */
const GENEFIELD_DB = "sqlite:genefield.db";

/** Shape of a raw `candidates` row as returned by @tauri-apps/plugin-sql. */
interface RawCandidateRow {
  id: string;
  name: string;
  parent_a: string;
  parent_b: string;
  notes: string;
  source: string;
  review_status: string;
  tags: string; // stored as a JSON array string
  created_at: string;
  updated_at: string;
}

/** Map a raw SQLite row to the shared SavedCandidate contract. */
function rowToCandidate(r: RawCandidateRow): SavedCandidate {
  return {
    id: r.id,
    name: r.name,
    parentA: r.parent_a,
    parentB: r.parent_b,
    notes: r.notes,
    source: (r.source as SavedCandidate["source"]) ?? "manual",
    reviewStatus: (r.review_status as SavedCandidate["reviewStatus"]) ?? "draft",
    tags: safeTagArray(r.tags),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function safeTagArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Real-SQLite CandidateStore backed by Tauri + @tauri-apps/plugin-sql.
 *
 * All queries are parameterized ($1, $2, ...). The schema is created by a
 * migration registered on the Rust side (see src-tauri/src/lib.rs); this
 * adapter only issues the DML. It is only active under the Tauri runtime.
 *
 * Status: the JS-side API surface was verified against tauri-plugin-sql
 * v2.5.0 source — crate `tauri-plugin-sql` (feature `sqlite`), JS package
 * `@tauri-apps/plugin-sql`; `Database.select/execute` return rows keyed by
 * column name and (rowsAffected, lastInsertId) respectively. The Rust plugin
 * itself has not been compiled in this environment (no toolchain), so run
 * `cargo check` in src-tauri before relying on it end-to-end.
 */
export class TauriSqliteCandidateStore implements CandidateStore {
  readonly backend: CandidateStoreBackend = "sqlite-tauri";

  /** Lazily-loaded plugin Database handle. Injectable for tests. */
  private db: import("@tauri-apps/plugin-sql").default | null = null;

  /**
   * Optional pre-loaded Database handle (test seam). When provided, getDb()
   * returns it verbatim instead of lazy-importing the Tauri plugin. The
   * plugin type is structural, so any object with execute/select works.
   */
  constructor(injectedDb?: import("@tauri-apps/plugin-sql").default) {
    if (injectedDb) this.db = injectedDb;
  }

  /**
   * Load the database pool. Dynamic-imports the plugin so the browser build
   * never references Tauri-only APIs.
   */
  private async getDb(): Promise<
    import("@tauri-apps/plugin-sql").default
  > {
    if (this.db) return this.db;
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    this.db = await Database.load(GENEFIELD_DB);
    return this.db;
  }

  async list(): Promise<SavedCandidate[]> {
    const db = await this.getDb();
    const rows = await db.select<RawCandidateRow[]>(
      "SELECT id, name, parent_a, parent_b, notes, source, review_status, tags, created_at, updated_at FROM candidates ORDER BY updated_at DESC",
      [],
    );
    return (rows ?? []).map(rowToCandidate);
  }

  async get(id: string): Promise<SavedCandidate | null> {
    const db = await this.getDb();
    const rows = await db.select<RawCandidateRow[]>(
      "SELECT id, name, parent_a, parent_b, notes, source, review_status, tags, created_at, updated_at FROM candidates WHERE id = $1",
      [id],
    );
    const row = rows?.[0];
    return row ? rowToCandidate(row) : null;
  }

  async create(input: SavedCandidateInput): Promise<SavedCandidate> {
    const db = await this.getDb();
    const name = input.name.trim();
    if (!name) throw new Error("Candidate name must not be empty.");

    const now = new Date().toISOString();
    const id =
      globalThis.crypto?.randomUUID?.() ??
      `c-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    const source = input.source ?? "manual";
    const reviewStatus = input.reviewStatus ?? "draft";
    const notes = (input.notes ?? "").trim();
    const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);

    // Case-insensitive uniqueness check before insert so we can surface the
    // typed conflict to the caller (the UNIQUE COLLATE NOCASE constraint is
    // the backstop).
    const dup = await db.select<RawCandidateRow[]>(
      "SELECT id FROM candidates WHERE name = $1 COLLATE NOCASE",
      [name],
    );
    if (dup && dup.length > 0) {
      throw new CandidateNameConflictError(name);
    }

    await db.execute(
      "INSERT INTO candidates (id, name, parent_a, parent_b, notes, source, review_status, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        id,
        name,
        input.parentA.trim(),
        input.parentB.trim(),
        notes,
        source,
        reviewStatus,
        JSON.stringify(tags),
        now,
        now,
      ],
    );

    return {
      id,
      name,
      parentA: input.parentA.trim(),
      parentB: input.parentB.trim(),
      notes,
      source,
      reviewStatus,
      tags,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(
    id: string,
    patch: SavedCandidateUpdate,
  ): Promise<SavedCandidate | null> {
    const db = await this.getDb();
    const current = await this.get(id);
    if (!current) return null;

    const next: SavedCandidate = {
      ...current,
      name: patch.name?.trim() || current.name,
      notes: patch.notes ?? current.notes,
      reviewStatus: patch.reviewStatus ?? current.reviewStatus,
      tags:
        patch.tags !== undefined
          ? patch.tags.map((t) => t.trim()).filter(Boolean)
          : current.tags,
      updatedAt: new Date().toISOString(),
    };

    await db.execute(
      "UPDATE candidates SET name = $1, notes = $2, review_status = $3, tags = $4, updated_at = $5 WHERE id = $6",
      [
        next.name,
        next.notes,
        next.reviewStatus,
        JSON.stringify(next.tags),
        next.updatedAt,
        id,
      ],
    );

    return next;
  }

  async remove(id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.execute("DELETE FROM candidates WHERE id = $1", [
      id,
    ]);
    return result.rowsAffected > 0;
  }

  async count(): Promise<number> {
    // Use select (NOT execute) to read COUNT(*). execute returns
    // (rowsAffected, lastInsertId), which would be 0 for a SELECT.
    const db = await this.getDb();
    const rows = await db.select<{ count: number }[]>(
      "SELECT COUNT(*) AS count FROM candidates",
      [],
    );
    return rows?.[0]?.count ?? 0;
  }

  /**
   * Seed the illustrative demo candidates on the very first run of the
   * desktop app. Persistence of that "once" is carried by the `seed_state`
   * marker table (migration v2), NOT by whether `candidates` is empty — so
   * deleting every candidate row does not reset it.
   *
   * Initialization state machine (`seed_state.status`):
   *   in_progress  → seeding started; may be incomplete after a crash.
   *   completed    → seeding fully succeeded. No re-seed, ever.
   *
   * Flow:
   *   1. Claim the marker: `INSERT INTO seed_state ... ON CONFLICT(key)
   *      DO NOTHING` with `status = 'in_progress'`. This is atomic — at
   *      most one concurrent caller can create the row.
   *   2. Read back the current status.
   *      - `completed` → seeding was finished previously. Return.
   *        This invariant preserves "never restore deleted demo
   *        candidates": the skip trigger is `completed`, not whether
   *        candidate rows exist.
   *      - `in_progress` → either a fresh claim (rows not yet inserted)
   *        or a crash-recovery (rows partially inserted). Either way,
   *        retry all missing inserts. `create()`'s `UNIQUE COLLATE
   *        NOCASE` check + `CandidateNameConflictError` catch-skip makes
   *        this safe: already-inserted rows are silently skipped.
   *   3. Insert demo rows (add `demo` tag).
   *   4. `UPDATE seed_state SET status = 'completed'`.
   *
   * Concurrency: two concurrent seedDemo() calls both execute step 1.
   * Exactly one creates the row (ON CONFLICT DO NOTHING makes the other
   * a no-op). Both then read `in_progress` in step 2 and both enter the
   * insert loop. The `UNIQUE COLLATE NOCASE` constraint on `candidates.name`
   * deduplicates, so the second caller's inserts are no-ops. Both may
   * run step 4 (idempotent). No race condition.
   *
   * Partial failure: a crash between steps 2 and 4 leaves `status =
   * 'in_progress'` in the database. The next launch sees `in_progress`
   * in step 2, re-enters the insert loop, completes the missing rows,
   * and marks `completed`. This is recoverable.
   */
  async seedDemo(items: SavedCandidateInput[]): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    // Step 1: atomic marker claim. ON CONFLICT DO NOTHING ensures that if
    // another caller already created the row, this one's insert is a no-op.
    await db.execute(
      "INSERT INTO seed_state (key, seeded_at, demo_count, status) VALUES ($1, $2, $3, $4) ON CONFLICT(key) DO NOTHING",
      ["demo", now, 0, "in_progress"],
    );

    // Step 2: read the marker's current state. The value is the database's
    // ground truth after the INSERT above: 'in_progress' if we just claimed
    // it (or a prior crash left it there), 'completed' if a prior full
    // seeding run finished.
    const rows = await db.select<{ status: string }[]>(
      "SELECT status FROM seed_state WHERE key = $1",
      ["demo"],
    );
    const status = rows?.[0]?.status;

    if (status === "completed") {
      // Seeding fully succeeded previously. Never reinsert demo rows —
      // even after all candidates deleted. This is the "seed-once"
      // guarantee.
      return;
    }

    // Step 3: we are (re)claiming. Insert each demo row. `create()` runs
    // the `UNIQUE COLLATE NOCASE` check and throws
    // CandidateNameConflictError for already-present rows, which we catch
    // and skip. This makes a crash-recovery idempotent: partially-seeded
    // rows are silently skipped, missing rows are inserted.
    for (const item of items) {
      try {
        await this.create({
          ...item,
          tags: Array.from(new Set(["demo", ...(item.tags ?? [])])),
        });
      } catch (e) {
        if (e instanceof CandidateNameConflictError) continue;
        throw e;
      }
    }

    // Step 4: finalize. Only mark completed after every insert succeeded.
    await db.execute(
      "UPDATE seed_state SET status = $1 WHERE key = $2",
      ["completed", "demo"],
    );
  }
}
