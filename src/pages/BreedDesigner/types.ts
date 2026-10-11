import type { AvailabilityFilter } from "@/types/research";

/** Parent pool selection filters. `genotype` defaults to "Available". */
export interface BreedDesignerFilters {
  search: string;
  genotype: AvailabilityFilter;
  phenotype: AvailabilityFilter;
  pedigree: AvailabilityFilter;
}

export interface BreedDesignerGenerationRules {
  /** Exclude A × A pairs. ON by default. */
  excludeSelfCrosses: boolean;
  /** Deduplicate unordered pairs so (A,B) and (B,A) are treated the same. ON by default. */
  excludeDuplicatePairs: boolean;
  /** Historical exclusions are mandatory and authoritative in final-v1. */
  excludeHistorical: boolean;
  /** Cap the number of generated candidates. */
  maxCandidates: number;
}

/** A single deterministic candidate cross. */
export interface BreedDesignerCandidate {
  analysis?: import("@/types/research").CandidateAnalysis;
  /** Stable display id, e.g. "C-001". */
  candidateId: string;
  parentA: string;
  parentB: string;
  /** "Both" when both parents carry genotype data, "A only" when only Parent A does. */
  genotype: "Both" | "A only";
  /** final-v1 ranking returns unrecorded pairs only. */
  historical: "Recorded" | "Not recorded";
  /** Ranking excludes every historical pair using the backend registry. */
  historicalRecorded: boolean;
  researchStatus: "Unreviewed";
}

/** The full generation input, mirroring UI state, for testable deterministic output. */
export interface GenerationInput {
  filters: BreedDesignerFilters;
  rules: BreedDesignerGenerationRules;
}
