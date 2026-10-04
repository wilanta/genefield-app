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
