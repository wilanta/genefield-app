export type TraitCode = "GY" | "DTF" | "NO" | "LB";

export interface RiceLine {
  id: string;
  name: string;
  hasGenotype: boolean;
  hasPhenotype: boolean;
  hasPedigree: boolean;
}

export interface LineQuery {
  search?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TraitEstimate {
  trait: TraitCode;
  value: number | null;
  unit: string;
}

export interface CrossAnalysis {
  parentA: string;
  parentB: string;
  estimates: TraitEstimate[];
  researchOnly: true;
  rankingEnabled: false;
  modelVersion: string;
  limitations: string[];
}

/* ---- Pedigree Explorer ---- */

export type PedigreeColumn = "ancestor" | "parent" | "selected" | "descendant";

export type PedigreeNodeKind = "normal" | "selected" | "missing";

export interface PedigreeNode {
  id: string;
  label: string;
  column: PedigreeColumn;
  /** Generation offset relative to the selected node: -2, -1, 0, +1. */
  depth: number;
  kind: PedigreeNodeKind;
  hasGenotype: boolean;
  hasPhenotype: boolean;
}

export interface PedigreeEdge {
  /** Parent / ancestor node id. */
  source: string;
  /** Offspring / descendant node id. */
  target: string;
}

export interface PedigreeDetail {
  recordedParents: string[];
  recordedDescendants: number;
  genotype: "available" | "none";
  phenotype: "available" | "none";
}

export interface PedigreeGraphData {
  nodes: PedigreeNode[];
  /** Recorded parent → offspring relationships only (no SNP inference). */
  edges: PedigreeEdge[];
  selectedId: string;
  detail: PedigreeDetail;
}
