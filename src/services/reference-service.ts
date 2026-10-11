import { invoke } from "@tauri-apps/api/core";
import type {
  RiceLine,
  LineQuery,
  PedigreeGraphData,
  PedigreeNode,
} from "@/types/research";
export type DatasetSummary = {
  line_count: number;
  phenotype_observation_count: number;
  phenotyped_line_count: number;
  genotyped_line_count: number;
  pedigree_line_count: number;
  source: string;
};
type Snapshot = { lines: RiceLine[]; summary: DatasetSummary };
let snapshot: Promise<Snapshot> | undefined;
async function load() {
  // Share successful/in-flight reads, but allow a real native read to recover
  // on a later attempt. Never substitute mock data after a native failure.
  snapshot ??= invoke<Snapshot>("reference_snapshot").catch((error) => {
    snapshot = undefined;
    throw error;
  });
  return snapshot;
}
export const referenceService = {
  async allLines() {
    return (await load()).lines;
  },
  async getLines(query: LineQuery) {
    const lines = (await load()).lines.filter((l) =>
      `${l.id} ${l.name}`
        .toLowerCase()
        .includes(query.search?.trim().toLowerCase() ?? ""),
    );
    return {
      items: lines.slice(
        (query.page - 1) * query.pageSize,
        query.page * query.pageSize,
      ),
      total: lines.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  },
  async getLineById(id: string) {
    return (await load()).lines.find((l) => l.id === id) ?? null;
  },
  async getDatasetSummary() {
    return (await load()).summary;
  },
  async getPedigreeNeighborhood(id: string): Promise<PedigreeGraphData> {
    const lines = (await load()).lines;
    const index = new Map(lines.map((l) => [l.id, l]));
    const selected = index.get(id);
    if (!selected) throw new Error("Line not found in GeneField data.");
    const nodes = new Map<string, PedigreeNode>();
    const edges = new Map<string, { source: string; target: string }>();
    const add = (
      line: RiceLine,
      column: PedigreeNode["column"],
      depth: number,
    ) => {
      if (!nodes.has(line.id))
        nodes.set(line.id, {
          id: line.id,
          label: line.id,
          column,
          depth,
          kind: column === "selected" ? "selected" : "normal",
          hasGenotype: line.hasGenotype,
          hasPhenotype: line.hasPhenotype,
        });
      else if (column === "parent" && nodes.get(line.id)?.column === "ancestor")
        Object.assign(nodes.get(line.id)!, { column, depth });
    };
    const link = (source: string, target: string) => {
      const pending = [target];
      const visited = new Set<string>();
      while (pending.length) {
        const node = pending.pop()!;
        if (node === source) return;
        if (visited.has(node)) continue;
        visited.add(node);
        for (const edge of edges.values())
          if (edge.source === node) pending.push(edge.target);
      }
      edges.set(`${source}|${target}`, { source, target });
    };
    add(selected, "selected", 0);
    // Fixed-depth expansion plus visited IDs prevents accidental recursion.
    for (const p of selected.knownParents ?? []) {
      const parent = index.get(p);
      if (!parent || p === id) continue;
      add(parent, "parent", -1);
      link(p, id);
      for (const a of parent.knownParents ?? []) {
        const ancestor = index.get(a);
        if (!ancestor || nodes.get(a)?.column === "selected" || a === p)
          continue;
        add(ancestor, "ancestor", -2);
        link(a, p);
      }
    }
    const children = lines.filter(
      (l) => l.id !== id && l.knownParents?.includes(id),
    );
    for (const child of children) {
      if (nodes.has(child.id)) continue;
      add(child, "descendant", 1);
      link(id, child.id);
    }
    return {
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      selectedId: id,
      detail: {
        recordedParents: selected.knownParents ?? [],
        recordedDescendants: children.length,
        genotype: selected.hasGenotype ? "available" : "none",
        phenotype: selected.hasPhenotype ? "available" : "none",
      },
    };
  },
};
