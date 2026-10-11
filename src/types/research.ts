export type TraitCode = "GY" | "DTF" | "NO" | "LB";

export interface RiceLine {
  id: string;
  name: string;
  hasGenotype: boolean;
  hasPhenotype: boolean;
  hasPedigree: boolean;
  /** Optional — number of recorded phenotype observations (e.g. 14). */
  phenotypeObservations?: number;
  /** Optional — historical GY/DTF/NO/LB values shown in the profile. */
  estimates?: TraitEstimate[];
  /** Optional — known parent line IDs (rendered joined with " × "). */
  knownParents?: string[];
}

export interface LineQuery {
  search?: string;
  page: number;
  pageSize: number;
}

/* ---- Line Explorer filters (client-side) ---- */

export type AvailabilityFilter = "any" | "yes" | "no";

export interface LineExplorerFilters {
  search: string;
  genotype: AvailabilityFilter;
  phenotype: AvailabilityFilter;
  pedigree: AvailabilityFilter;
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
  rankingEnabled: boolean;
  modelVersion: string;
  limitations: string[];
}

/* ---- Saved cross candidates (Candidate Workspace) ---- */

/** Where a candidate was produced. */
export type CandidateSource = "cross-lab" | "breed-designer" | "manual";

/** Review lifecycle for a saved candidate. */
export type CandidateReviewStatus =
  "draft" | "review" | "reviewed" | "archived";

/**
 * The shared, backend-facing shape of a saved cross candidate. This is the
 * single contract consumed by the Candidate Workspace and produced by
 * Cross Lab / Breed Designer. Producers map their own richer view-models
 * (e.g. BreedDesignerCandidate) down to this before persisting.
 */
export interface SavedCandidate {
  analysis?: CandidateAnalysis;
  /** Stable unique id. Assigned by the store (uuid) on first save. */
  id: string;
  /** Human name, e.g. "GID_1233 × GID_3494". Uniqueness is enforced by the store. */
  name: string;
  parentA: string;
  parentB: string;
  /** Free-form research notes (<= 2000 chars, trimmed). */
  notes: string;
  source: CandidateSource;
  reviewStatus: CandidateReviewStatus;
  /** Optional free-form tags. */
  tags: string[];
  /** ISO-8601 timestamp of creation. */
  createdAt: string;
  /** ISO-8601 timestamp of last change. */
  updatedAt: string;
}

/** Inputs for creating a new saved candidate. The store fills in ids + timestamps. */
export interface SavedCandidateInput {
  analysis?: CandidateAnalysis;
  name: string;
  parentA: string;
  parentB: string;
  notes?: string;
  source?: CandidateSource;
  reviewStatus?: CandidateReviewStatus;
  tags?: string[];
}

export interface CandidateAnalysis {
  bundleVersion: "final-v1";
  predictions: Partial<Record<TraitCode, { value: number; units: string }>>;
  objectives?: import("@/lib/genefield/types").Objectives;
  weights?: Partial<Record<TraitCode, number>>;
  applicationScore?: number;
  isHistoricalPair: boolean;
}

/** Patchable fields when updating an existing candidate. */
export type SavedCandidateUpdate = Partial<
  Pick<SavedCandidate, "name" | "notes" | "reviewStatus" | "tags">
>;

/** How the active CandidateStore is backed. Exposed for honest UI labelling. */
export type CandidateStoreBackend =
  | "session-memory" // in-session only, preview / browser mode — NOT persisted
  | "sqlite-tauri"; // real SQLite via a Tauri Rust command

/**
 * The persistence boundary for saved cross candidates. Concrete
 * implementations live in src/services/adapters. The app picks one at module
 * init (see src/services/index.ts) based on the runtime, so UI + producers
 * always call this interface and never a concrete adapter directly.
 */
export interface CandidateStore {
  /** Which backend is active — surfaced in the UI so memory-only is never mislabeled as persisted. */
  readonly backend: CandidateStoreBackend;

  /** List all saved candidates, most-recently-updated first. */
  list(): Promise<SavedCandidate[]>;

  /** Fetch a single candidate by id. */
  get(id: string): Promise<SavedCandidate | null>;

  /**
   * Create a candidate. Throws a CandidateNameConflictError when the name
   * already exists (case-insensitive). Returns the created candidate.
   */
  create(input: SavedCandidateInput): Promise<SavedCandidate>;

  /** Update mutable fields on an existing candidate. No-op (returns null) if id not found. */
  update(
    id: string,
    patch: SavedCandidateUpdate,
  ): Promise<SavedCandidate | null>;

  /** Delete by id. Returns true if a row was removed. */
  remove(id: string): Promise<boolean>;

  /**
   * Count of candidates currently in the store. Used to seed demo data only
   * when the store is genuinely empty on first run.
   */
  count(): Promise<number>;

  /**
   * Optional: seed a small, clearly-illustrative demo set so the workspace is
   * not empty on first run. Implementations that back a real database must be
   * idempotent (no-op on re-launch); the in-memory implementation is naturally
   * idempotent because it is empty per session. The app only calls this when it
   * is present (see CandidateWorkspace), so backends without demo seeding keep
   * a plain empty workspace.
   */
  seedDemo?(items: SavedCandidateInput[]): Promise<void>;
}

/** Raised when two candidates would share a name (case-insensitive). */
export class CandidateNameConflictError extends Error {
  constructor(name: string) {
    super(`A candidate named "${name}" already exists.`);
    this.name = "CandidateNameConflictError";
  }
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
