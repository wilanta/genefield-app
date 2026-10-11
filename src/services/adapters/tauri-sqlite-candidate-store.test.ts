import { describe, it, expect } from "vitest";
import { TauriSqliteCandidateStore } from "./tauri-sqlite-candidate-store";
import { CandidateNameConflictError } from "@/types/research";
import type { SavedCandidateInput } from "@/types/research";

/**
 * In-memory fake of @tauri-apps/plugin-sql's `Database`, driving the real
 * adapter's seedDemo() end-to-end. The Tauri SQLite backend cannot be
 * exercised in vitest without the Rust toolchain and app shell; this fake
 * models the exact SQL statements the adapter issues so the adapter's logic
 * (marker claim, status check, insert loop, completion) is tested.
 *
 * LIMITATIONS — what this fake does NOT cover:
 *   - Real SQLite ON CONFLICT semantics under true concurrent writes
 *     (the plugin opens its own connection; two threads cannot issue
 *     interleaved statements on the same connection).
 *   - Real UNIQUE COLLATE NOCASE constraint enforcement.
 *   - Real transaction / rollback behavior (plugin exposes none).
 *
 * What the fake DOES verify:
 *   - The adapter's decision logic (status check, insert loop, completion).
 *   - That repeated calls correctly no-op when status is 'completed'.
 *   - That a simulated crash (marker in_progress, rows partially present)
 *     recovers on the next call without duplicating existing rows.
 *
 * Statements modeled:
 *   seed_state:
 *     INSERT INTO seed_state (...) ON CONFLICT(key) DO NOTHING
 *     SELECT status FROM seed_state WHERE key = $1
 *     UPDATE seed_state SET status = $1 WHERE key = $2
 *   candidates:
 *     INSERT INTO candidates (...)
 *     DELETE FROM candidates WHERE id = $1
 *     SELECT id FROM candidates WHERE name = $1 COLLATE NOCASE
 *     SELECT COUNT(*) AS count FROM candidates
 */

interface FakeDb {
  execute(
    sql: string,
    bind?: unknown[],
  ): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  select<T>(sql: string, bind?: unknown[]): Promise<T>;
}

type SeedStatus = "in_progress" | "completed";

interface FakeDbInternals {
  db: FakeDb;
  /** Returns the current seed_state status, or undefined if no row yet. */
  seedStatus: () => SeedStatus | undefined;
  /** Simulate a crash by forcing the status to in_progress and clearing
   *  some or all candidate rows. Used in the crash-resume test. */
  simulateCrash: (keepNames: string[]) => void;
  /** Current candidate names (lowercase). */
  names: () => string[];
  /** Tags JSON string of the most recent candidate insert. */
  lastTagsJson: () => string | undefined;
}

function makeFakeDb(preexistingNames: string[] = []): FakeDbInternals {
  // Candidate rows: id → name (lowercase).
  const idToName = new Map<string, string>();
  // Preexisting user rows (not demo).
  for (const n of preexistingNames) {
    const key = `user-${n.toLowerCase()}`;
    idToName.set(key, n.toLowerCase());
  }
  // seed_state: status is undefined until a claim INSERT happens.
  let seedStatus: SeedStatus | undefined;
  let lastTagsJson: string | undefined;

  const db: FakeDb = {
    async execute(sql: string, bind: unknown[] = []) {
      const s = sql.replace(/\s+/g, " ").trim();

      // seed_state claim (INSERT ... ON CONFLICT(key) DO NOTHING)
      if (/^INSERT INTO seed_state/i.test(s)) {
        if (seedStatus === undefined) {
          // First claim: set status from bind[3].
          seedStatus = String(bind[3]) as SeedStatus;
          return { rowsAffected: 1, lastInsertId: 1 };
        }
        // Row already exists: ON CONFLICT DO NOTHING → no change.
        return { rowsAffected: 0 };
      }

      // seed_state status update
      if (/^UPDATE seed_state SET status/i.test(s)) {
        // bind: [statusValue, key]
        seedStatus = String(bind[0]) as SeedStatus;
        return { rowsAffected: 1 };
      }

      // candidates insert
      if (/^INSERT INTO candidates/i.test(s)) {
        // bind: [id, name, a, b, notes, source, status, tagsJson, now, now]
        const id = String(bind[0]);
        const name = String(bind[1]).toLowerCase();
        // Simulate UNIQUE COLLATE NOCASE: throw if name already present.
        for (const existing of idToName.values()) {
          if (existing === name) {
            throw new CandidateNameConflictError(String(bind[1]));
          }
        }
        idToName.set(id, name);
        lastTagsJson = String(bind[7]);
        return { rowsAffected: 1, lastInsertId: 1 };
      }

      // candidates delete by id
      if (/^DELETE FROM candidates/i.test(s)) {
        // bind: [id]
        const id = String(bind[0]);
        idToName.delete(id);
        return { rowsAffected: 1 };
      }

      throw new Error(`FakeDb: unhandled execute: ${s}`);
    },

    async select<T>(sql: string, bind: unknown[] = []) {
      const s = sql.replace(/\s+/g, " ").trim();

      // SELECT status FROM seed_state WHERE key = $1
      if (/^SELECT status FROM seed_state/i.test(s)) {
        return (
          seedStatus !== undefined
            ? [{ status: seedStatus }]
            : []
        ) as unknown as T;
      }

      // SELECT COUNT(*) AS count FROM candidates
      if (/^SELECT COUNT/i.test(s)) {
        return [{ count: idToName.size }] as unknown as T;
      }

      // SELECT id FROM candidates WHERE name = $1 COLLATE NOCASE
      if (/^SELECT id FROM candidates WHERE name/i.test(s)) {
        const q = String(bind[0]).toLowerCase();
        for (const [id, name] of idToName) {
          if (name === q) return [{ id }] as unknown as T;
        }
        return [] as unknown as T;
      }

      throw new Error(`FakeDb: unhandled select: ${s}`);
    },
  };

  return {
    db,
    seedStatus: () => seedStatus,
    names: () => [...new Set(idToName.values())],
    lastTagsJson: () => lastTagsJson,
    simulateCrash(keepNames: string[]) {
      // Keep only the specified names; remove all other candidate rows.
      const kept = new Set(keepNames.map((n) => n.toLowerCase()));
      for (const [id, name] of [...idToName]) {
        if (!kept.has(name)) idToName.delete(id);
      }
      // Mark seeding as in_progress (simulating a crash mid-seed).
      seedStatus = "in_progress";
    },
  };
}

type DbHandle = import("@tauri-apps/plugin-sql").default;

function asStore(handle: FakeDbInternals): TauriSqliteCandidateStore {
  return new TauriSqliteCandidateStore(handle.db as unknown as DbHandle);
}

// Test-only fixture for the retained legacy seeding adapter. Production
// CandidateWorkspace never calls seedDemo; new workspaces start empty.
const DEMO: SavedCandidateInput[] = [
  { name: "Demo One", parentA: "A", parentB: "B", source: "cross-lab" },
  {
    name: "Demo Two",
    parentA: "C",
    parentB: "D",
    source: "breed-designer",
    tags: ["x"],
  },
];

/**
 * All tests in this suite drive the adapter through a fake Database handle.
 * The fake models SQL statement-level semantics (ON CONFLICT, COLLATE NOCASE,
 * SELECT/INSERT/DELETE) but NOT real SQLite concurrency: two seedDemo()
 * calls in Promise.all are serialized on the JS event loop, not on SQLite's
 * write lock. True multi-connection concurrency requires the real plugin
 * and is not covered here.
 */
describe("TauriSqliteCandidateStore.seedDemo", () => {
  // ── 1. First initialization ──────────────────────────────────────────────
  it("first call claims the marker and inserts all demo rows, then marks completed", async () => {
    const h = makeFakeDb();
    const store = asStore(h);
    await store.seedDemo(DEMO);

    expect(h.seedStatus()).toBe("completed");
    expect(h.names()).toEqual(["demo one", "demo two"]);
  });

  // ── 2. Repeated initialization (no-op when completed) ────────────────────
  it("second call is a no-op when status is already completed", async () => {
    const h = makeFakeDb();
    const store = asStore(h);
    await store.seedDemo(DEMO);

    // Simulate a second app launch: new store instance, same fake DB.
    const store2 = asStore(h);
    await store2.seedDemo(DEMO);

    // No new rows; status unchanged.
    expect(h.names()).toEqual(["demo one", "demo two"]);
    expect(h.seedStatus()).toBe("completed");
  });

  // ── 3. Delete all, then re-init: does NOT reseed ─────────────────────────
  it("deleting all candidates after completion does not reseed", async () => {
    const h = makeFakeDb();
    const store = asStore(h);
    await store.seedDemo(DEMO);
    expect(h.seedStatus()).toBe("completed");

    // Simulate the post-delete end-state: candidates table empty, marker
    // still completed. Use a fresh fake with the marker manually set.
    const h2 = makeFakeDb([]);
    // Set marker to completed without going through seedDemo.
    await h2.db.execute(
      "INSERT INTO seed_state (key, seeded_at, demo_count, status) VALUES ($1, $2, $3, $4) ON CONFLICT(key) DO NOTHING",
      ["demo", "2026-01-01T00:00:00Z", 0, "completed"],
    );
    expect(h2.seedStatus()).toBe("completed");

    const store2 = asStore(h2);
    await store2.seedDemo(DEMO);

    // No reseed: candidates table still empty, status still completed.
    expect(h2.names()).toEqual([]);
    expect(h2.seedStatus()).toBe("completed");
  });

  // ── 4. Partial failure: crash mid-seed, next call resumes and completes ──
  it("resumes seeding after a simulated crash (marker in_progress, some rows missing)", async () => {
    const h = makeFakeDb();

    // Simulate: the first seedDemo call claimed the marker, inserted
    // "Demo One" successfully, then the app crashed before "Demo Two"
    // and before marking completed.
    // We do this by manually inserting "Demo One" and setting status to
    // in_progress, WITHOUT calling seedDemo at all.
    await h.db.execute(
      "INSERT INTO seed_state (key, seeded_at, demo_count, status) VALUES ($1, $2, $3, $4) ON CONFLICT(key) DO NOTHING",
      ["demo", "2026-01-01T00:00:00Z", 0, "in_progress"],
    );
    // Manually insert Demo One's row (as if create() succeeded before the crash).
    const now = new Date().toISOString();
    await h.db.execute(
      "INSERT INTO candidates (id, name, parent_a, parent_b, notes, source, review_status, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        "crash-existing-id", "Demo One", "A", "B", "",
        "cross-lab", "draft", JSON.stringify(["demo"]),
        now, now,
      ],
    );
    expect(h.names()).toEqual(["demo one"]);
    expect(h.seedStatus()).toBe("in_progress");

    // Now the app restarts and seedDemo is called again.
    const store2 = asStore(h);
    await store2.seedDemo(DEMO);

    // "Demo One" was already present (skipped via CandidateNameConflictError).
    // "Demo Two" was inserted. Status is now completed.
    expect(h.names()).toEqual(["demo one", "demo two"]);
    expect(h.seedStatus()).toBe("completed");
  });

  // ── 5. Preexisting user candidates preserved ─────────────────────────────
  it("preserves preexisting user candidates and inserts only missing demo rows", async () => {
    const h = makeFakeDb(["Existing User"]);
    const store = asStore(h);
    await store.seedDemo(DEMO);
    expect(h.names()).toEqual(["existing user", "demo one", "demo two"]);
    expect(h.seedStatus()).toBe("completed");
  });

  // ── 6. Duplicate name: demo row skipped, others still inserted ───────────
  it("skips a demo row whose name already exists, without failing the seed", async () => {
    const h = makeFakeDb(["Demo One"]); // user already owns "Demo One"
    const store = asStore(h);
    await store.seedDemo(DEMO); // must not throw
    // "Demo Two" inserted; "Demo One" was already there (skipped by
    // CandidateNameConflictError in the insert loop).
    expect(h.names()).toContain("demo two");
    expect(h.names()).toContain("demo one");
    expect(h.seedStatus()).toBe("completed");
  });

  // ── 7. Tags: seeded rows get `demo` tag alongside provided tags ─────────
  it("tags seeded rows with `demo` alongside provided tags", async () => {
    const h = makeFakeDb();
    const store = asStore(h);
    await store.seedDemo(DEMO);
    // The last insert is Demo Two (tags: ["x"]); the store must add "demo".
    const parsed: string[] = JSON.parse(h.lastTagsJson() ?? "[]");
    expect(parsed).toContain("demo");
    expect(parsed).toContain("x");
  });

  // ── 8. Simulated concurrent calls (event-loop, not real SQLite lock) ────
  it("concurrent calls (Promise.all) result in completed status and no duplicates", async () => {
    const h = makeFakeDb();
    const store = asStore(h);
    await Promise.all([store.seedDemo(DEMO), store.seedDemo(DEMO)]);
    // Both calls ran through the JS event loop; the fake serializes them.
    // Status is completed; no duplicate names.
    expect(h.seedStatus()).toBe("completed");
    expect(h.names()).toEqual(["demo one", "demo two"]);
    // Note: this tests the adapter's decision logic under concurrent JS
    // calls. Real SQLite multi-connection concurrency is NOT covered —
    // the Tauri plugin owns its own connection and is not exercised here.
  });
});
