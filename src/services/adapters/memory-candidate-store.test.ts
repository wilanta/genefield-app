import { describe, it, expect } from "vitest";
import { MemoryCandidateStore } from "./memory-candidate-store";
import { CandidateNameConflictError } from "@/types/research";

describe("MemoryCandidateStore", () => {
  it("seeds demo data only when empty", async () => {
    const s = new MemoryCandidateStore();
    await s.seedDemo([
      { name: "A × B", parentA: "A", parentB: "B", source: "breed-designer" },
    ]);
    expect(await s.count()).toBe(1);
    // Seeding again is a no-op.
    await s.seedDemo([
      { name: "C × D", parentA: "C", parentB: "D", source: "cross-lab" },
    ]);
    expect(await s.count()).toBe(1);
  });

  it("creates, lists (newest first), and dedupes names case-insensitively", async () => {
    const s = new MemoryCandidateStore();
    const c1 = await s.create({ name: "GID_1 × GID_2", parentA: "GID_1", parentB: "GID_2" });
    await s.create({ name: "GID_3 × GID_4", parentA: "GID_3", parentB: "GID_4" });
    const list = await s.list();
    expect(list.length).toBe(2);
    // Newest first: the second-created one is listed first.
    expect(list[0].id).not.toBe(c1.id);
    // Duplicate name (different case) must throw the typed conflict.
    await expect(
      s.create({ name: "gid_1 × gid_2", parentA: "GID_1", parentB: "GID_2" }),
    ).rejects.toThrow(CandidateNameConflictError);
  });

  it("updates mutable fields and bumps updatedAt", async () => {
    const s = new MemoryCandidateStore();
    const c = await s.create({ name: "X × Y", parentA: "X", parentB: "Y", tags: ["a"] });
    const t0 = c.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const updated = await s.update(c.id, { reviewStatus: "review", tags: ["b", "c"] });
    expect(updated).not.toBeNull();
    expect(updated!.reviewStatus).toBe("review");
    expect(updated!.tags).toEqual(["b", "c"]);
    expect(updated!.updatedAt).not.toBe(t0);
  });

  it("removes a row", async () => {
    const s = new MemoryCandidateStore();
    const c = await s.create({ name: "M × N", parentA: "M", parentB: "N" });
    expect(await s.remove(c.id)).toBe(true);
    expect(await s.get(c.id)).toBeNull();
    expect(await s.remove(c.id)).toBe(false);
  });

  it("reports backend as session-memory (never sqlite)", async () => {
    const s = new MemoryCandidateStore();
    expect(s.backend).toBe("session-memory");
  });
});
