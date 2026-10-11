import { expect, test, vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: async () => ({
    summary: { line_count: 4 },
    lines: [
      {
        id: "child",
        name: "child",
        hasGenotype: true,
        hasPhenotype: true,
        hasPedigree: true,
        knownParents: ["parent1", "parent2"],
      },
      {
        id: "parent1",
        name: "parent1",
        hasGenotype: true,
        hasPhenotype: false,
        hasPedigree: true,
        knownParents: ["parent2"],
      },
      {
        id: "parent2",
        name: "parent2",
        hasGenotype: true,
        hasPhenotype: false,
        hasPedigree: true,
        knownParents: ["parent1"],
      },
      {
        id: "grandchild",
        name: "grandchild",
        hasGenotype: false,
        hasPhenotype: false,
        hasPedigree: true,
        knownParents: ["child"],
      },
    ],
  }),
}));
import { referenceService } from "./reference-service";
test("reference service search, pagination and absent profile", async () => {
  const result = await referenceService.getLines({
    search: "parent",
    page: 2,
    pageSize: 1,
  });
  expect(result.total).toBe(2);
  expect(result.items[0].id).toBe("parent2");
  expect(await referenceService.getLineById("unknown")).toBeNull();
});
test("pedigree expansion deduplicates nodes and rejects accidental cycles", async () => {
  const graph = await referenceService.getPedigreeNeighborhood("child");
  expect(new Set(graph.nodes.map((n) => n.id)).size).toBe(graph.nodes.length);
  expect(graph.detail.recordedDescendants).toBe(1);
  const visit = (id: string, path: Set<string>) => {
    expect(path.has(id)).toBe(false);
    const next = new Set(path).add(id);
    for (const edge of graph.edges.filter((e) => e.source === id))
      visit(edge.target, next);
  };
  graph.nodes.forEach((n) => visit(n.id, new Set()));
  await expect(
    referenceService.getPedigreeNeighborhood("unknown"),
  ).rejects.toThrow("Line not found in GeneField data.");
});
