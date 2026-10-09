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
  /** Skip pairs already recorded as historical crosses (illustrative, no real record). OFF by default. */
  excludeHistorical: boolean;
  /** Cap the number of generated candidates. */
  maxCandidates: number;
}

/** A single deterministic candidate cross. */
export interface BreedDesignerCandidate {
  /** Stable display id, e.g. "C-001". */
  candidateId: string;
  parentA: string;
  parentB: string;
  /** "Both" when both parents carry genotype data, "A only" when only Parent A does. */
  genotype: "Both" | "A only";
  /** Only "Recorded" when a local mock confirms it; otherwise "Not recorded". */
  historical: "Recorded" | "Not recorded";
  /** Illustrative: whether the pair is present in the recorded mock history. */
  historicalRecorded: boolean;
  researchStatus: "Unreviewed";
}

/** The full generation input, mirroring UI state, for testable deterministic output. */
export interface GenerationInput {
  filters: BreedDesignerFilters;
  rules: BreedDesignerGenerationRules;
}
